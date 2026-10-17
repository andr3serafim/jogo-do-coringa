/**
 * Token guardado por sala (spec §12, item 2): o terminal faz o papel do `localStorage` do navegador.
 * Quem cai e volta em menos de 60 s retoma o assento com o token salvo, sem chamar `joinRoom`.
 *
 * Um arquivo por assento (`<CÓDIGO>-<assento>.json`) com o `pid` do processo que o usa (Ruling 23): dois terminais
 * no mesmo PC ocupam os dois assentos, e quem volta só retoma o assento cujo processo já morreu.
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
  /** Processo que usa a sessão: outro terminal só a retoma depois que este morrer. */
  pid: number;
  /** Último `seq` de `state` recebido: quem volta em processo novo o manda no `hello` e recebe os eventos perdidos (spec §4.7). Arquivos antigos não têm. */
  lastSeq?: number;
}

/** `packages/sim/sessions/`, fora do git: o arquivo guarda o token, que é a chave do assento. */
export const SESSIONS_DIR = fileURLToPath(new URL('../../sessions/', import.meta.url));

/** Assentos da sala, na ordem em que a volta os procura. Também protege o nome do arquivo (o `playerId` vem do servidor). */
const SEATS = ['p1', 'p2'] as const;

const sameServer = (a: string, b: string): boolean => a.replace(/\/+$/, '') === b.replace(/\/+$/, '');

const isSeat = (playerId: string): boolean => (SEATS as readonly string[]).includes(playerId);

const fileOf = (dir: string, code: string, playerId: string): string => join(dir, `${code}-${playerId}.json`);

export function saveSession(session: SavedSession, dir: string = SESSIONS_DIR): void {
  const code = normalizeCode(session.code);
  if (!code) throw new Error(`código inválido: ${session.code}`);
  if (!isSeat(session.playerId)) throw new Error(`assento inválido: ${session.playerId}`);
  mkdirSync(dir, { recursive: true });
  writeFileSync(fileOf(dir, code, session.playerId), `${JSON.stringify({ ...session, code }, null, 1)}\n`, { mode: 0o600 });
}

/** A sessão salva daquele assento, ou `null` (sem arquivo, arquivo estragado, de outro servidor ou sem `pid`). */
function loadSeat(server: string, code: string, playerId: string, dir: string): SavedSession | null {
  let data: Partial<Record<keyof SavedSession, unknown>>;
  try {
    data = JSON.parse(readFileSync(fileOf(dir, code, playerId), 'utf8'));
  } catch {
    return null;
  }
  const { server: savedServer, code: savedCode, token, playerId: savedSeat, nickname, pid } = data;
  if ([savedServer, savedCode, token, savedSeat, nickname].some((field) => typeof field !== 'string')) return null;
  // `process.kill(0 | -1, 0)` mira grupos de processos: só um inteiro positivo serve.
  if (typeof pid !== 'number' || !Number.isSafeInteger(pid) || pid <= 0) return null;
  if (!sameServer(savedServer as string, server) || savedCode !== code || savedSeat !== playerId) return null;
  const session: SavedSession = { server: savedServer as string, code, token: token as string, playerId, nickname: nickname as string, pid };
  if (typeof data.lastSeq === 'number') session.lastSeq = data.lastSeq;
  return session;
}

/** As sessões salvas para este servidor e código, p1 antes de p2. Arquivos no formato antigo (`<CÓDIGO>.json`) não entram. */
export function loadSessions(server: string, code: string, dir: string = SESSIONS_DIR): SavedSession[] {
  const normalized = normalizeCode(code);
  if (!normalized) return [];
  return SEATS.map((seat) => loadSeat(server, normalized, seat, dir)).filter((session) => session !== null);
}

/** Esquece a sessão daquele assento (sala apagada ou token recusado: o arquivo não serve mais). */
export function forgetSession(server: string, code: string, playerId: string, dir: string = SESSIONS_DIR): void {
  const normalized = normalizeCode(code);
  if (!normalized || !isSeat(playerId) || !loadSeat(server, normalized, playerId, dir)) return;
  rmSync(fileOf(dir, normalized, playerId), { force: true });
}

/** O processo existe? `ESRCH` = morto; `EPERM` = existe, só não é nosso. */
export function processAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return (error as NodeJS.ErrnoException).code === 'EPERM';
  }
}

export interface EnterOptions {
  server: string;
  /** `null` = criar uma sala. */
  code: string | null;
  /** Só é chamado se a sala for nova para este terminal (quem volta pela sessão salva não digita o apelido de novo). */
  nickname: () => Promise<string>;
  dir?: string;
  fetchImpl?: typeof fetch;
  /** Processo deste terminal (padrão: `process.pid`). */
  pid?: number;
  /** O processo daquele `pid` está vivo? Padrão: `processAlive`. */
  isAlive?: (pid: number) => boolean;
}

export interface Entered {
  session: SavedSession;
  /** Voltou pela sessão salva, sem passar pelo `joinRoom`. */
  resumed: boolean;
  created: boolean;
}

/**
 * Cria a sala, volta pela sessão salva ou entra pelo código; toda sessão nova é salva. Volta pela primeira sessão
 * daquele servidor e código cujo processo não está vivo (um `pid` igual ao deste terminal é de um processo morto que o
 * sistema reaproveitou); com todas vivas ou nenhuma, entra como jogador novo.
 */
export async function enterRoom(options: EnterOptions): Promise<Entered> {
  const { server, code, dir, fetchImpl, pid = process.pid, isAlive = processAlive } = options;
  if (code !== null) {
    const saved = loadSessions(server, code, dir).find((candidate) => candidate.pid === pid || !isAlive(candidate.pid));
    if (saved) {
      const session: SavedSession = { ...saved, pid };
      saveSession(session, dir);
      return { session, resumed: true, created: false };
    }
  }
  const nickname = await options.nickname();
  const entry =
    code === null
      ? await createRoom(server, nickname, fetchImpl)
      : { code, ...(await joinRoom(server, code, nickname, fetchImpl)) };
  const session: SavedSession = { server, code: entry.code, token: entry.token, playerId: entry.playerId, nickname, pid };
  saveSession(session, dir);
  return { session, resumed: false, created: code === null };
}
