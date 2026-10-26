// A lista local das partidas terminadas (spec do polimento §4.1): as últimas 20 deste navegador, do treino e online, da mais
// nova para a mais velha, cada uma com o replay quando houver. Núcleo puro: o `KeyValueStore` e o relógio (`now`) entram por
// parâmetro, e nada aqui lança. O que está guardado pode estar estragado, ser de outra versão ou não caber, e a tela segue.
// `TrainingLevel` entra só como tipo: o módulo da sala local carrega os bots e fica fora do JavaScript inicial, onde este mora.
import type { GameResult, PlayerId, Replay } from '@coringa/engine';
import type { Outcome, OutcomeCause, Score } from '@coringa/protocol';
import type { TrainingLevel } from './local-room.ts';
import type { KeyValueStore } from './storage.ts';

export const PAST_GAMES_KEY = 'coringa:partidas';
export const MAX_PAST_GAMES = 20;
/** Teto do JSON da lista inteira, em caracteres; passando, saem os replays das mais velhas (a linha fica). */
export const MAX_PAST_GAMES_CHARS = 1_000_000;
/** A mesma `key` dentro desta janela é a mesma partida (a volta do `hello` com a sala terminada manda o replay de novo). */
export const DEDUPE_WINDOW_MS = 24 * 60 * 60 * 1000;

export type PastGameMode = { kind: 'training'; level: TrainingLevel } | { kind: 'online'; code: string };

export interface PastGame {
  /** Curto e seguro para a URL (`/partidas/<id>`). */
  id: string;
  /** Identifica a partida de fora (online: `sala:<código>:<gameNo>`); o treino não tem. A mesma `key` em até 24 h é uma só. */
  key?: string;
  /** Quando a partida terminou (ms). */
  date: number;
  mode: PastGameMode;
  /** O assento de quem guardou, de onde o replay é visto. */
  seat: PlayerId;
  names: { me: string; opponent: string };
  outcome: Outcome;
  rounds: number;
  /** O placar da sala depois desta partida. */
  score: Score;
  /** A `RULES_VERSION` de quando foi jogada. Outra versão não invalida a entrada: o aviso é da tela. */
  rulesVersion: number;
  replay?: Replay;
}

// --- Validação à mão (o Zod fica só no servidor) ---

// Cada tabela cobre todos os valores do tipo: se o tipo ganhar um valor novo, o compilador pede a linha aqui.
const LEVELS: Record<TrainingLevel, true> = { facil: true, medio: true, dificil: true };
const CAUSES: Record<OutcomeCause, true> = { NORMAL: true, RECONNECT_TIMEOUT: true, AFK: true, CONCEDE: true, ABANDONED: true };
const WIN_REASONS: Record<Extract<GameResult, { kind: 'WIN' }>['reason'], true> = {
  HP: true,
  EXODIA: true,
  ANTI_STALL: true,
  FORFEIT: true,
};
const DRAW_REASONS: Record<Extract<GameResult, { kind: 'DRAW' }>['reason'], true> = { ANTI_STALL: true };

type Json = Record<string, unknown>;

const isRecord = (value: unknown): value is Json => typeof value === 'object' && value !== null && !Array.isArray(value);
const isText = (value: unknown): value is string => typeof value === 'string' && value !== '';
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isOneOf = (table: Record<string, true>, value: unknown): boolean =>
  typeof value === 'string' && Object.hasOwn(table, value);

function isMode(value: unknown): value is PastGameMode {
  if (!isRecord(value)) return false;
  if (value.kind === 'training') return isOneOf(LEVELS, value.level);
  return value.kind === 'online' && isText(value.code);
}

function isResult(value: unknown): value is GameResult | null {
  if (value === null) return true;
  if (!isRecord(value)) return false;
  if (value.kind === 'WIN') return isText(value.winner) && isOneOf(WIN_REASONS, value.reason);
  return value.kind === 'DRAW' && isOneOf(DRAW_REASONS, value.reason);
}

function isOutcome(value: unknown): value is Outcome {
  return isRecord(value) && isNumber(value.gameNo) && isOneOf(CAUSES, value.cause) && isResult(value.result);
}

function isScore(value: unknown): value is Score {
  return isRecord(value) && isNumber(value.p1) && isNumber(value.p2) && isNumber(value.draws);
}

function isNames(value: unknown): value is PastGame['names'] {
  return isRecord(value) && typeof value.me === 'string' && typeof value.opponent === 'string';
}

/**
 * Confere só a forma, para a tela não quebrar ao ler. O conteúdo (a config, se cada jogada é legal) quem julga é o motor, ao
 * reexecutar: a tela do replay para na jogada que ele recusar.
 */
function isReplay(value: unknown): value is Replay {
  if (!isRecord(value)) return false;
  if (typeof value.name !== 'string' || typeof value.seed !== 'string' || !isRecord(value.config)) return false;
  const { players, steps } = value;
  if (!Array.isArray(players) || players.length !== 2 || !players.every((p) => typeof p === 'string')) return false;
  const isStep = (step: unknown): boolean =>
    isRecord(step) && typeof step.player === 'string' && isRecord(step.action) && typeof step.action.type === 'string';
  return Array.isArray(steps) && steps.every(isStep);
}

/**
 * A entrada validada, montada campo a campo (nada de campo de fora). Forma errada: `null`, e a entrada se perde. Só o replay
 * com forma errada é descartado sozinho: a linha ainda diz quando, contra quem e como foi a partida.
 */
function parsePastGame(value: unknown): PastGame | null {
  if (!isRecord(value)) return null;
  const { id, key, date, mode, seat, names, outcome, rounds, score, rulesVersion, replay } = value;
  if (!isText(id) || !isText(seat) || (key !== undefined && typeof key !== 'string')) return null;
  if (!isNumber(date) || !isNumber(rounds) || !isNumber(rulesVersion)) return null;
  if (!isMode(mode) || !isNames(names) || !isOutcome(outcome) || !isScore(score)) return null;
  const game: PastGame = { id, date, mode, seat, names, outcome, rounds, score, rulesVersion };
  if (key !== undefined) game.key = key;
  if (replay !== undefined && isReplay(replay)) game.replay = replay;
  return game;
}

// --- Leitura ---

/** As partidas guardadas, da mais nova para a mais velha. Armazenamento ou JSON estragado vira `[]`; entrada ruim sai e as boas ficam. */
export function loadPastGames(store: KeyValueStore): PastGame[] {
  let parsed: unknown;
  try {
    const text = store.get(PAST_GAMES_KEY);
    parsed = text === null ? null : JSON.parse(text);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const games: PastGame[] = [];
  for (const item of parsed) {
    const game = parsePastGame(item);
    if (game !== null) games.push(game);
    if (games.length === MAX_PAST_GAMES) break;
  }
  return games;
}

export function findPastGame(store: KeyValueStore, id: string): PastGame | null {
  return loadPastGames(store).find((game) => game.id === id) ?? null;
}

// --- Gravação ---

/** Base 36 do instante; no mesmo milissegundo (ou sobre um id já usado) ganha um contador: `lz3k9a`, `lz3k9a-1`... */
function newId(now: number, taken: readonly PastGame[]): string {
  const base = Math.trunc(now).toString(36);
  const used = new Set(taken.map((game) => game.id));
  let id = base;
  for (let n = 1; used.has(id); n++) id = `${base}-${n.toString(36)}`;
  return id;
}

/**
 * Tira o replay da mais velha que ainda tem um (a linha fica). Com `newerThan`, só olha as linhas mais velhas que a desse
 * índice (a lista vai da mais nova para a mais velha): o anexo nunca tira o replay da linha que o recebe nem o de uma mais nova.
 * `false` quando não sobrou replay nenhum para tirar.
 */
function dropOldestReplay(games: PastGame[], newerThan = -1): boolean {
  for (let i = games.length - 1; i > newerThan; i--) {
    const game = games[i]!;
    if (game.replay === undefined) continue;
    const line = { ...game };
    delete line.replay;
    games[i] = line;
    return true;
  }
  return false;
}

/**
 * Guarda uma partida terminada no topo da lista. Devolve a entrada como ficou guardada (com o `id`; o replay dela é o último
 * a sair se o teto apertar), a que já existia quando é a mesma partida (mesma `key` em até 24 h; não grava nada), ou `null`
 * se a entrada não passa na validação ou se o armazenamento recusou até sem nenhum replay. Nunca lança: guardar é por melhor
 * esforço e o jogo segue sem.
 *
 * O `set` que lança (cota estourada) tira o replay da mais velha e grava de novo. Com o `safeStore` isso depende de ele relançar
 * a exceção do `Storage` (guardando a cópia em memória): quando uma tentativa passa, a cópia em memória sai e o disco fica com a
 * lista completa, menos replays.
 */
export function recordPastGame(store: KeyValueStore, entry: Omit<PastGame, 'id'>, now: number): PastGame | null {
  try {
    const old = loadPastGames(store);
    if (entry.key !== undefined) {
      const same = old.find((game) => game.key === entry.key && now - game.date <= DEDUPE_WINDOW_MS);
      if (same !== undefined) return same;
    }
    // Guarda o que a leitura devolveria: a entrada passa pelo JSON e pela mesma validação do `loadPastGames`. Se ela seria
    // rejeitada (`rounds: NaN`, nível desconhecido...), não grava e não devolve um `id` que o `findPastGame` não acharia;
    // um replay de forma errada sai sozinho, como na leitura.
    const candidate = parsePastGame(JSON.parse(JSON.stringify({ ...entry, id: newId(now, old) })));
    if (candidate === null) return null;
    const games = [candidate, ...old].slice(0, MAX_PAST_GAMES);
    for (;;) {
      const text = JSON.stringify(games);
      if (text.length <= MAX_PAST_GAMES_CHARS) {
        try {
          store.set(PAST_GAMES_KEY, text);
          return games[0]!;
        } catch {
          // Cota estourada ou armazenamento bloqueado: tira um replay e tenta de novo.
        }
      }
      if (!dropOldestReplay(games)) return null;
    }
  } catch {
    return null;
  }
}

/**
 * Acrescenta o replay à linha `id`, que ainda não tem um: online o `replay` chega depois do `room` em `FINISHED`, e a linha já
 * foi gravada. A linha fica onde está (mesmo lugar, mesma `date`, mesma `key`); o replay passa pela mesma validação e pelo
 * mesmo teto de 1 MB do `recordPastGame`: se preciso, saem os replays das linhas mais velhas que esta, e nunca o desta nem o
 * de uma mais nova.
 *
 * Devolve a linha como ficou: com o replay; a que já tinha um (o dela fica, nada é gravado); ou sem ele, quando o replay tem
 * forma errada ou não cabe nem tirando os das mais velhas (nada é gravado e os das outras ficam). `null` se a linha não existe
 * mais, se o armazenamento recusou até depois de tirar os replays das mais velhas (a lista de antes fica) ou se algo lançou.
 * Nunca lança.
 */
export function attachReplay(store: KeyValueStore, id: string, replay: Replay): PastGame | null {
  try {
    const games = loadPastGames(store);
    const index = games.findIndex((game) => game.id === id);
    if (index < 0) return null;
    const current = games[index]!;
    if (current.replay !== undefined) return current;
    // Como na gravação: o que a leitura devolveria. Um replay de forma errada sai sozinho, e a linha fica como estava.
    const candidate = parsePastGame(JSON.parse(JSON.stringify({ ...current, replay })));
    if (candidate === null || candidate.replay === undefined) return current;
    games[index] = candidate;
    for (;;) {
      const text = JSON.stringify(games);
      if (text.length <= MAX_PAST_GAMES_CHARS) {
        try {
          store.set(PAST_GAMES_KEY, text);
          return candidate;
        } catch {
          // Cota estourada ou armazenamento bloqueado: tira o replay de uma mais velha e tenta de novo.
        }
      }
      if (!dropOldestReplay(games, index)) {
        // Não há mais replay de linha mais velha para tirar. Passando do teto ele não cabe; senão foi o armazenamento que recusou.
        return text.length > MAX_PAST_GAMES_CHARS ? current : null;
      }
    }
  } catch {
    return null;
  }
}
