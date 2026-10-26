// Persistência no navegador (spec §6.1 e §6.5). Núcleo puro: o `Storage` entra por parâmetro e toda
// operação fica num try/catch. O token é segredo e nunca sai daqui para o diagnóstico.
import type { PlayerId } from '@coringa/engine';
import type { TrainingLevel } from './local-room.ts';

export interface KeyValueStore {
  get(key: string): string | null;
  /** Pode lançar (cota estourada, bloqueio): o `safeStore` guarda a cópia em memória e relança. Quem grava por melhor esforço engole. */
  set(key: string, value: string): void;
  remove(key: string): void;
}

const PROBE_KEY = 'coringa:sonda';

function memoryStore(): KeyValueStore {
  const data = new Map<string, string>();
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}

function probe(raw: Storage): boolean {
  try {
    raw.setItem(PROBE_KEY, '1');
    const ok = raw.getItem(PROBE_KEY) === '1';
    raw.removeItem(PROBE_KEY);
    return ok;
  } catch {
    return false;
  }
}

/**
 * Embrulha o `Storage` do navegador. Sem `Storage` (aba privada, bloqueio) ou com um que lança, vira
 * memória com `available: false`: o jogo funciona, mas recarregar a página perde o assento.
 * Se um `Storage` que passou na sonda falhar depois (cota cheia), a leitura cai em memória e o `set` guarda o valor lá
 * (a sessão segue com o mais novo) e **relança** a exceção: quem grava sabe que não foi para o disco. `writeValue`
 * engole (persistir é por melhor esforço); a lista de partidas corta replays e grava de novo.
 */
export function safeStore(raw: Storage | undefined): { store: KeyValueStore; available: boolean } {
  const memory = memoryStore();
  if (raw === undefined || !probe(raw)) return { store: memory, available: false };
  const store: KeyValueStore = {
    get(key) {
      // O que caiu em memória por falha de escrita é o valor mais novo.
      const pending = memory.get(key);
      if (pending !== null) return pending;
      try {
        return raw.getItem(key);
      } catch {
        return null;
      }
    },
    set(key, value) {
      try {
        raw.setItem(key, value);
        memory.remove(key);
      } catch (error) {
        memory.set(key, value);
        throw error;
      }
    },
    remove(key) {
      memory.remove(key);
      try {
        raw.removeItem(key);
      } catch {
        // Sem como apagar do Storage; a cópia em memória já saiu.
      }
    },
  };
  return { store, available: true };
}

function readJson(store: KeyValueStore, key: string): unknown {
  try {
    const text = store.get(key);
    return text === null ? null : (JSON.parse(text) as unknown);
  } catch {
    return null;
  }
}

function writeValue(store: KeyValueStore, key: string, value: string): void {
  try {
    store.set(key, value);
  } catch {
    // Persistir é por melhor esforço: o jogo segue sem.
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// --- Assento por sala ---

export interface SeatSession {
  token: string;
  playerId: PlayerId;
  nickname: string;
  lastSeq?: number;
}

const seatKey = (code: string): string => `coringa:sala:${code}`;

export function loadSeat(store: KeyValueStore, code: string): SeatSession | null {
  const value = readJson(store, seatKey(code));
  if (!isRecord(value)) return null;
  const { token, playerId, nickname, lastSeq } = value;
  if (typeof token !== 'string' || token === '') return null;
  if (typeof playerId !== 'string' || typeof nickname !== 'string') return null;
  const seat: SeatSession = { token, playerId, nickname };
  if (typeof lastSeq === 'number' && Number.isInteger(lastSeq) && lastSeq >= 0) seat.lastSeq = lastSeq;
  return seat;
}

export function saveSeat(store: KeyValueStore, code: string, seat: SeatSession): void {
  writeValue(store, seatKey(code), JSON.stringify(seat));
}

/** Atualiza só o `lastSeq`, mantendo o token. Sem assento salvo, não cria nada. */
export function saveLastSeq(store: KeyValueStore, code: string, seq: number): void {
  const seat = loadSeat(store, code);
  if (seat === null) return;
  saveSeat(store, code, { ...seat, lastSeq: seq });
}

export function forgetSeat(store: KeyValueStore, code: string): void {
  try {
    store.remove(seatKey(code));
  } catch {
    // Nada a fazer.
  }
}

// --- Preferências e apelido ---

export interface Prefs {
  autoPass: boolean;
  reduceMotion: boolean;
  /** Os sons da mesa (Fase C): ligados por padrão; a pessoa desliga no menu da partida ou na tela inicial. */
  sound: boolean;
}

export const DEFAULT_PREFS: Prefs = { autoPass: true, reduceMotion: false, sound: true };

const PREFS_KEY = 'coringa:prefs';
const NICKNAME_KEY = 'coringa:apelido';

export function loadPrefs(store: KeyValueStore): Prefs {
  const value = readJson(store, PREFS_KEY);
  const prefs: Prefs = { ...DEFAULT_PREFS };
  if (!isRecord(value)) return prefs;
  if (typeof value.autoPass === 'boolean') prefs.autoPass = value.autoPass;
  if (typeof value.reduceMotion === 'boolean') prefs.reduceMotion = value.reduceMotion;
  if (typeof value.sound === 'boolean') prefs.sound = value.sound;
  return prefs;
}

export function savePrefs(store: KeyValueStore, prefs: Prefs): void {
  writeValue(store, PREFS_KEY, JSON.stringify(prefs));
}

export function loadNickname(store: KeyValueStore): string {
  try {
    return store.get(NICKNAME_KEY) ?? '';
  } catch {
    return '';
  }
}

export function saveNickname(store: KeyValueStore, nickname: string): void {
  writeValue(store, NICKNAME_KEY, nickname);
}

// --- Nível do treino ---

const LEVEL_KEY = 'coringa:nivel';

/**
 * O último nível escolhido no treino, como foi guardado (ou `null`). Quem lê confere se ainda é um nível: a lista dos níveis mora
 * no módulo da sala local (com o bot), que o armazenamento, no JavaScript inicial, não importa.
 */
export function loadLevel(store: KeyValueStore): string | null {
  try {
    return store.get(LEVEL_KEY);
  } catch {
    return null;
  }
}

export function saveLevel(store: KeyValueStore, level: TrainingLevel): void {
  writeValue(store, LEVEL_KEY, level);
}

// --- Diagnóstico copiável (spec §6.5) ---

// O token do servidor é base64url de 32 bytes (43 caracteres). Mascara qualquer corrida desse tamanho ou maior.
const TOKEN_RUN = /[A-Za-z0-9_-]{43,}/g;
const MASK = '[token oculto]';

function mask(text: string): string {
  return text.replace(TOKEN_RUN, MASK);
}

export function diagnostic(info: {
  code: string | null;
  seq: number | null;
  epoch: number | null;
  version: string;
  message: string;
}): string {
  const show = (value: string | number | null): string => (value === null ? '—' : mask(String(value)));
  return [
    `Sala: ${show(info.code)}`,
    `seq: ${show(info.seq)}`,
    `Época: ${show(info.epoch)}`,
    `Versão: ${show(info.version)}`,
    `Mensagem: ${show(info.message)}`,
  ].join('\n');
}
