/** Tipos das mensagens do WebSocket e das respostas HTTP (spec §3, §4.3, §4.4). Só tipos. */
import type { Action, GameEvent, GameResult, PlayerId, PlayerView, Replay, RuleErrorCode } from '@coringa/engine';

/** Ação que o jogador pode enviar: o servidor injeta `TIMEOUT` e `FORFEIT`. */
export type PlayerAction = Exclude<Action, { type: 'TIMEOUT' } | { type: 'FORFEIT' }>;

export type RoomStatus = 'LOBBY' | 'PLAYING' | 'FINISHED';

export type OutcomeCause = 'NORMAL' | 'RECONNECT_TIMEOUT' | 'AFK' | 'CONCEDE' | 'ABANDONED';

export interface Outcome {
  gameNo: number;
  /** `null` quando a partida acabou sem resultado (`ABANDONED`). */
  result: GameResult | null;
  cause: OutcomeCause;
  /** Quanto a partida durou, em ms, do começo ao fim (o painel de fim mostra, U5 do sub-projeto 5). Sem ele, o painel não diz. */
  durationMs?: number;
}

export interface SeatInfo {
  playerId: PlayerId;
  nickname: string;
  connected: boolean;
  ready: boolean;
  wantsRematch: boolean;
  /** Instante em que o W.O. por reconexão vence, para a interface mostrar a contagem. */
  woAt?: number;
}

export interface Score {
  p1: number;
  p2: number;
  draws: number;
}

export type DeadlineKind = 'EQUIP' | 'ORDER' | 'TURN' | 'REACTION';

export interface Deadline {
  kind: DeadlineKind;
  /** Instante (relógio do servidor, em ms) do prazo. */
  at: number;
  players: PlayerId[];
}

/** Cliente → servidor (§4.3). */
export type ClientMessage =
  | { t: 'hello'; protocol: number; token: string; lastSeq?: number }
  | { t: 'ready'; ready: boolean }
  | { t: 'leave' }
  | { t: 'act'; id: string; epoch: number; action: PlayerAction; auto?: true }
  | { t: 'concede'; id: string }
  | { t: 'rematch'; want: boolean };

/** Servidor → cliente (§4.4). */
export interface WelcomeMessage {
  t: 'welcome';
  protocol: number;
  playerId: PlayerId;
  serverNow: number;
}

export interface RoomMessage {
  t: 'room';
  code: string;
  status: RoomStatus;
  seats: SeatInfo[];
  score: Score;
  gameNo: number;
  outcome?: Outcome;
  expiresAt: number;
  /** A vida inicial que a sala escolheu na criação (sub-projeto 5); sem ela, a padrão do motor. */
  hp?: number;
}

export interface StateMessage {
  t: 'state';
  seq: number;
  epoch: number;
  view: PlayerView;
  events: GameEvent[];
  deadline: Deadline | null;
  pausedTurnMs?: number;
  serverNow: number;
  catchUp?: true;
  resync?: true;
}

/**
 * A partida `gameNo` gravada, do primeiro ao último passo. A ordem em relação ao `room` varia: o treino a publica antes do
 * `room` em `FINISHED`, o servidor depois. A `Session` aceita as duas, desde que o `room` da partida (o mesmo `gameNo`) já exista.
 */
export interface ReplayMessage {
  t: 'replay';
  gameNo: number;
  replay: Replay;
}

export type AckCode =
  | RuleErrorCode
  | 'RATE_LIMITED'
  | 'BAD_MESSAGE'
  | 'NOT_PLAYING'
  | 'STALE_EPOCH'
  | 'ALREADY_PASSED'
  | 'DISCONNECTED';

export type AckMessage =
  | { t: 'ack'; id: string; ok: true; seq?: number; held?: true }
  | { t: 'ack'; id: string; ok: false; code: AckCode; message: string };

export type ErrorCode = 'BAD_MESSAGE' | 'PROTOCOL_MISMATCH' | 'RATE_LIMITED' | 'WRONG_STATUS';

export interface ErrorMessage {
  t: 'error';
  code: ErrorCode;
  message: string;
}

export type ServerMessage = WelcomeMessage | RoomMessage | StateMessage | ReplayMessage | AckMessage | ErrorMessage;

/** Respostas HTTP (§3). */
export interface CreateRoomResponse {
  code: string;
  token: string;
  playerId: PlayerId;
}

export interface JoinRoomResponse {
  token: string;
  playerId: PlayerId;
}

export interface RoomInfoResponse {
  code: string;
  status: RoomStatus;
  nicknames: string[];
  full: boolean;
}
