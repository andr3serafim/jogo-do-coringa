import { ROOM_LIMITS } from './timers.ts';
import type { GameRecord, ReplayStep, RoomRecord, StepRecord } from './types.ts';

/**
 * O registro da sala é gravado em quatro chaves, cada uma limitada, para um passo regravar só o que mudou:
 * `room` (sala, assentos, placar, agenda), `game` (estado e controle da partida), `recent` (anel de
 * até 50 passos) e `log` (passos da partida, que cresce até o fim dela; o anti-travamento a limita).
 */
export const STORAGE_KEYS = ['room', 'game', 'recent', 'log'] as const;

export type RoomPart = Omit<RoomRecord, 'game'> & { hasGame: boolean };
export type GamePart = Omit<GameRecord, 'steps' | 'recent'>;

export interface RecordParts {
  room: RoomPart;
  game: GamePart | null;
  recent: StepRecord[];
  log: ReplayStep[];
}

export function splitRecord(record: RoomRecord): RecordParts {
  const { game, ...room } = record;
  if (!game) return { room: { ...room, hasGame: false }, game: null, recent: [], log: [] };
  const { steps, recent, ...rest } = game;
  return {
    room: { ...room, hasGame: true },
    game: rest,
    recent: recent.slice(-ROOM_LIMITS.recentSteps),
    log: steps,
  };
}

/** Remonta o registro; `null` sem a chave `room`. Peças que faltam viram vazias. */
export function joinRecord(parts: Partial<RecordParts>): RoomRecord | null {
  if (!parts.room) return null;
  const { hasGame, ...room } = parts.room;
  const game: GameRecord | null =
    hasGame && parts.game ? { ...parts.game, steps: parts.log ?? [], recent: parts.recent ?? [] } : null;
  return { ...room, game };
}
