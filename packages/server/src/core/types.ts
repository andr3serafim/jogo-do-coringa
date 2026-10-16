import type { Action, GameEvent, GameResult, GameState, PlayerId, RulesConfig } from '@coringa/engine';
import type { AckMessage, Outcome, OutcomeCause, RoomStatus, Score, ServerMessage } from '@coringa/protocol';

export type SeatId = 'p1' | 'p2';

export interface SeatRecord {
  id: SeatId;
  nickname: string;
  /** SHA-256 hex do token; o token em si nunca é gravado. */
  tokenHash: string;
  ready: boolean;
  wantsRematch: boolean;
  /** Instante em que o jogador ficou sem socket autenticado, ou `null` se está conectado. */
  offlineSince: number | null;
}

export interface ReplayStep {
  player: PlayerId | 'system';
  action: Action;
}

/** Mesmo formato de `packages/sim/src/replay.ts`. */
export interface Replay {
  name: string;
  config: RulesConfig;
  seed: string;
  players: [PlayerId, PlayerId];
  steps: ReplayStep[];
}

/** Eventos sem redação de um passo, com o `seq` dele (anel de passos recentes, spec §4.7). */
export interface StepRecord {
  seq: number;
  events: GameEvent[];
}

export interface GameRecord {
  gameNo: number;
  seed: string;
  state: GameState;
  startedAt: number;
  steps: ReplayStep[];
  recent: StepRecord[];
  phaseStartedAt: number;
  phaseDeadlineAt: number | null;
  /** Tempo de turno que sobrou quando o dono do turno caiu (turno pausado). */
  pausedTurnMs: number | null;
  /** PASS guardado durante a janela de reação mínima. */
  heldPass: { epoch: number; id: string } | null;
  strikes: Record<SeatId, number>;
  acks: Record<SeatId, AckMessage[]>;
  cause: OutcomeCause | null;
}

export type AgendaItem =
  | { kind: 'phase'; at: number; epoch: number }
  | { kind: 'reactionMin'; at: number; epoch: number }
  | { kind: 'reconnect'; at: number; seat: SeatId; gameNo: number }
  | { kind: 'presenceSweep'; at: number; gameNo: number }
  | { kind: 'idleExpiry'; at: number }
  | { kind: 'hardExpiry'; at: number };

export interface RoomRecord {
  schema: number;
  code: string;
  createdAt: number;
  status: RoomStatus;
  seats: SeatRecord[];
  score: Score;
  gameNo: number;
  outcome: Outcome | null;
  seq: number;
  epoch: number;
  game: GameRecord | null;
  agenda: AgendaItem[];
}

export interface SocketInfo {
  socketId: string;
  seat: SeatId | null;
  connectedAt: number;
  lastSeenAt: number;
}

/** Uma linha JSON por fato, sem dado sensível (spec §10.4). */
export type LogLine =
  | { evt: 'room.created'; code: string; playerId: PlayerId }
  | { evt: 'room.joined'; code: string; playerId: PlayerId }
  | { evt: 'game.started'; code: string; gameNo: number }
  | {
      evt: 'game.ended';
      code: string;
      gameNo: number;
      result: GameResult | null;
      cause: OutcomeCause;
      rounds: number;
      durationMs: number;
      steps: number;
    }
  | { evt: 'game.replay'; code: string; gameNo: number; replay: Replay }
  | { evt: 'player.disconnected'; code: string; playerId: PlayerId; gameNo: number }
  | { evt: 'player.reconnected'; code: string; playerId: PlayerId; gameNo: number }
  | { evt: 'wo.applied'; code: string; gameNo: number; loser: PlayerId; cause: OutcomeCause }
  | { evt: 'room.expired'; code: string; status: RoomStatus; reason: string }
  | { evt: 'room.reset'; code: string; status: RoomStatus; reason: string }
  | { evt: 'protocol.violation'; code: string; kind: 'MALFORMED' | 'RATE' | 'ORIGIN' | 'AUTH' }
  | { evt: 'error'; code: string; message: string; stack?: string };

/** O que o núcleo pede para a casca executar depois de cada entrada. */
export interface Effects {
  send: { socketId: string; message: ServerMessage }[];
  close: { socketId: string; code: number; reason: string }[];
  attach: { socketId: string; seat: SeatId }[];
  persist: boolean;
  /** Alarme desejado (`nextAlarm(agenda)`); a casca só chama `setAlarm` quando ele muda. */
  alarm: number | null;
  deleteAll: boolean;
  logs: LogLine[];
}

export interface CoreDeps {
  randomBytes(n: number): Uint8Array;
  newSeed?(): string;
}

export type CoreResult<T, E extends string> =
  | { ok: true; value: T; effects: Effects }
  | { ok: false; error: E; effects: Effects };
