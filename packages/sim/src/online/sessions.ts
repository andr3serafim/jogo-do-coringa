/**
 * Token guardado por sala (spec §12, item 2): o terminal faz o papel do `localStorage` do navegador.
 * Quem cai e volta em menos de 60 s retoma o assento com o token salvo, sem chamar `joinRoom`.
 */
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRoom, joinRoom, normalizeCode } from '@coringa/protocol';

export interface SavedSession {
  server: string;
  code: string;
  token: string;
  playerId: string;
  nickname: string;
}

/** `packages/sim/sessions/`, fora do git: o arquivo guarda o token, que é a chave do assento. */
export const SESSIONS_DIR = fileURLToPath(new URL('../../sessions/', import.meta.url));

const sameServer = (a: string, b: string): boolean => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

export function saveSession(session: SavedSession, dir: string = SESSIONS_DIR): void {
  const code = normalizeCode(session.code);
  if (!code) throw new Error(`código inválido: ${session.code}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${code}.json`), `${JSON.stringify({ ...session, code }, null, 1)}\n`, { mode: 0o600 });
}

/** A sessão salva para este servidor e código, ou `null` (sem arquivo, arquivo estragado ou de outro servidor). */
export function loadSession(server: string, code: string, dir: string = SESSIONS_DIR): SavedSession | null {
  const normalized = normalizeCode(code);
  if (!normalized) return null;
  let data: Partial<Record<keyof SavedSession, unknown>>;
  try {
    data = JSON.parse(readFileSync(join(dir, `${normalized}.json`), 'utf8'));
  } catch {
    return null;
  }
  const { server: savedServer, code: savedCode, token, playerId, nickname } = data;
  if ([savedServer, savedCode, token, playerId, nickname].some((field) => typeof field !== 'string')) return null;
  if (!sameServer(savedServer as string, server) || savedCode !== normalized) return null;
  return { server: savedServer as string, code: normalized, token: token as string, playerId: playerId as string, nickname: nickname as string };
}

/** Esquece a sessão (sala apagada ou token recusado: o arquivo não serve mais). */
export function forgetSession(server: string, code: string, dir: string = SESSIONS_DIR): void {
  const normalized = normalizeCode(code);
  if (!normalized || !loadSession(server, normalized, dir)) return;
  rmSync(join(dir, `${normalized}.json`), { force: true });
}

export interface EnterOptions {
  server: string;
  /** `null` = criar uma sala. */
  code: string | null;
  /** Só é chamado se a sala for nova para este terminal (quem volta pela sessão salva não digita o apelido de novo). */
  nickname: () => Promise<string>;
  dir?: string;
  fetchImpl?: typeof fetch;
}

export interface Entered {
  session: SavedSession;
  /** Voltou pela sessão salva, sem passar pelo `joinRoom`. */
  resumed: boolean;
  created: boolean;
}

/** Cria a sala, volta pela sessão salva ou entra pelo código; toda sessão nova é salva. */
export async function enterRoom(options: EnterOptions): Promise<Entered> {
  const { server, code, dir, fetchImpl } = options;
  if (code !== null) {
    const saved = loadSession(server, code, dir);
    if (saved) return { session: saved, resumed: true, created: false };
  }
  const nickname = await options.nickname();
  const entry =
    code === null
      ? await createRoom(server, nickname, fetchImpl)
      : { code, ...(await joinRoom(server, code, nickname, fetchImpl)) };
  const session: SavedSession = { server, code: entry.code, token: entry.token, playerId: entry.playerId, nickname };
  saveSession(session, dir);
  return { session, resumed: false, created: code === null };
}
