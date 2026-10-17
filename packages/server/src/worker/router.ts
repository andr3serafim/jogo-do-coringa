import { CLOSE, LIMITS, generateCode, normalizeCode, normalizeNickname } from '@coringa/protocol';
import { NicknameBodySchema } from '@coringa/protocol/schemas';
import { ROOM_LIMITS } from '../core/timers.ts';
import type { LogLine } from '../core/types.ts';

/**
 * Roteador HTTP do Worker (spec §3, §8.2, §8.5): limite por IP, validação do corpo, origem do WebSocket e a
 * conversa com o Durable Object da sala. O objeto é endereçado pelo código da sala (`getByName`).
 */

const json = (body: unknown, status: number, headers?: Record<string, string>): Response =>
  Response.json(body, { status, ...(headers ? { headers } : {}) });

const fail = (status: number, error: string, message: string): Response => json({ error, message }, status);

const notFound = (): Response => fail(404, 'NOT_FOUND', 'não encontrado');

const tooMany = (): Response => json({ error: 'LIMITED', message: 'muitas requisições, espere um pouco' }, 429, { 'retry-after': '60' });

/** Aceita o WebSocket e o fecha na hora: o cliente vê um fechamento com código, nunca só 1006 (spec §3). */
export function acceptAndClose(code: number, reason: string): Response {
  const pair = new WebSocketPair();
  const [client, server] = [pair[0], pair[1]];
  server.accept();
  server.close(code, reason);
  return new Response(null, { status: 101, webSocket: client });
}

/**
 * Origem do upgrade: a própria origem da requisição vale sempre; fora dela, só as entradas de `ALLOWED_ORIGINS`
 * (separadas por vírgula). `http://localhost:*` aceita qualquer porta numérica, e só ela.
 */
export function isOriginAllowed(origin: string, requestOrigin: string, allowed: string): boolean {
  if (origin === requestOrigin) return true;
  for (const raw of allowed.split(',')) {
    const entry = raw.trim();
    if (entry === '') continue;
    if (entry === origin) return true;
    if (entry.endsWith(':*')) {
      const prefix = entry.slice(0, -1);
      if (origin.startsWith(prefix) && /^\d{1,5}$/.test(origin.slice(prefix.length))) return true;
    }
  }
  return false;
}

function log(line: LogLine): void {
  console.log(JSON.stringify(line));
}

/** Lê o corpo até o limite de 1 KiB; `null` se passou dele (sem ler o resto). */
async function readBody(request: Request): Promise<string | null> {
  const declared = Number(request.headers.get('content-length') ?? 0);
  if (declared > LIMITS.httpBodyBytes) return null;
  const reader = request.body?.getReader();
  if (!reader) return '';
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > LIMITS.httpBodyBytes) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/** Apelido normalizado do corpo `{ nickname }`, ou a resposta de erro (413 corpo grande, 400 corpo ou apelido inválido). */
async function readNickname(request: Request): Promise<{ nickname: string } | { error: Response }> {
  const text = await readBody(request);
  if (text === null) return { error: fail(413, 'TOO_BIG', 'corpo grande demais') };
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { error: fail(400, 'BAD_BODY', 'corpo inválido') };
  }
  const body = NicknameBodySchema.safeParse(parsed);
  const nickname = body.success ? normalizeNickname(body.data.nickname) : null;
  if (nickname === null) return { error: fail(400, 'BAD_NICKNAME', 'apelido inválido') };
  return { nickname };
}

async function createRoom(request: Request, env: Env, ip: string): Promise<Response> {
  if (!(await env.CREATE_LIMITER.limit({ key: ip })).success) return tooMany();
  const read = await readNickname(request);
  if ('error' in read) return read.error;
  for (let attempt = 0; attempt < ROOM_LIMITS.createAttempts; attempt += 1) {
    const code = generateCode((n) => crypto.getRandomValues(new Uint8Array(n)));
    const result = await env.ROOMS.getByName(code).create(code, read.nickname);
    if (result.ok) return json(result.value, 201);
    if (result.error === 'BAD_NICKNAME') return fail(400, 'BAD_NICKNAME', 'apelido inválido');
  }
  return fail(503, 'UNAVAILABLE', 'não consegui reservar um código, tente de novo');
}

async function joinRoom(request: Request, env: Env, code: string): Promise<Response> {
  const read = await readNickname(request);
  if ('error' in read) return read.error;
  const result = await env.ROOMS.getByName(code).join(read.nickname);
  if (result.ok) return json(result.value, 200);
  switch (result.error) {
    case 'NOT_FOUND':
      return notFound();
    case 'FULL':
      return fail(409, 'FULL', 'sala cheia');
    case 'BAD_NICKNAME':
      return fail(400, 'BAD_NICKNAME', 'apelido inválido');
  }
}

async function roomInfo(env: Env, code: string): Promise<Response> {
  const info = await env.ROOMS.getByName(code).info();
  return info ? json(info, 200) : notFound();
}

/**
 * Upgrade do WebSocket. Toda recusa depois do `Upgrade` vira fechamento com código (4003 origem, 4000 sala,
 * 4029 limite); só a falta do cabeçalho é um 426 de verdade.
 */
async function openSocket(request: Request, env: Env, url: URL, rawCode: string, ip: string): Promise<Response> {
  if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
    return fail(426, 'UPGRADE_REQUIRED', 'esperava um WebSocket');
  }
  // O limite vem antes das outras recusas: todas criam um WebSocketPair, e a de origem ainda escreve uma linha de log.
  if (!(await env.JOIN_LIMITER.limit({ key: ip })).success) return acceptAndClose(CLOSE.LIMITED, 'limite');
  const code = normalizeCode(rawCode);
  // Sem `Origin` (cliente de terminal) passa: só navegador faz sequestro de WebSocket entre sites.
  const origin = request.headers.get('Origin');
  if (origin !== null && !isOriginAllowed(origin, url.origin, String(env.ALLOWED_ORIGINS ?? ''))) {
    log({ evt: 'protocol.violation', code: code ?? '', kind: 'ORIGIN' });
    return acceptAndClose(CLOSE.AUTH, 'origem');
  }
  if (code === null) return acceptAndClose(CLOSE.ROOM_GONE, 'sala inexistente');
  return env.ROOMS.getByName(code).fetch(request);
}

export async function handle(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const ip = request.headers.get('cf-connecting-ip') ?? 'local';

  if (url.pathname === '/api/health') {
    return request.method === 'GET' ? json({ ok: true, version: env.VERSION }, 200) : notFound();
  }
  if (url.pathname === '/api/rooms') {
    return request.method === 'POST' ? createRoom(request, env, ip) : notFound();
  }
  const match = /^\/api\/rooms\/([^/]+)(?:\/(join|ws))?$/.exec(url.pathname);
  if (!match) return notFound();
  const [, rawCode = '', action] = match;
  const route = action ?? 'info';
  const method = request.method;
  if (!((route === 'join' && method === 'POST') || ((route === 'info' || route === 'ws') && method === 'GET'))) {
    return notFound();
  }

  if (route === 'ws') return openSocket(request, env, url, rawCode, ip);
  if (!(await env.JOIN_LIMITER.limit({ key: ip })).success) return tooMany();
  const code = normalizeCode(rawCode);
  if (code === null) return notFound();
  return route === 'join' ? joinRoom(request, env, code) : roomInfo(env, code);
}
