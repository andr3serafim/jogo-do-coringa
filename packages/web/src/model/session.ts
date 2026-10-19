// Sessão da sala (spec §1.5, §3.9, §6.2–§6.4). Puro: sem React nem DOM; relógio e timers entram por
// `SessionDeps`. Guarda o que a mesa precisa de uma conexão: estado, sala, jogada em voo, aviso e fim.
//
// A interface lê `snapshot()` (via `useSyncExternalStore`): um objeto novo a cada mudança e o mesmo
// enquanto nada muda. Toda mudança passa por `#update`, que é o ponto de extensão das automações.
import type { PlayerId } from '@coringa/engine';
import {
  SLOW_RETRY_CODES,
  type AckMessage,
  type ConnectionEvent,
  type PlayerAction,
  type RoomConnection,
  type RoomMessage,
  type StateMessage,
} from '@coringa/protocol';
import { RATE_NOTICE } from './copy.ts';
import { legalFor } from './plays.ts';

export type ConnStatus = 'connecting' | 'open' | 'reconnecting' | 'stopped';
export type StopReason = 'ROOM_GONE' | 'PROTOCOL' | 'AUTH' | 'OTHER_TAB' | 'LEFT';

export interface Notice {
  kind: 'rate' | 'rule' | 'autoPass' | 'storage';
  text: string;
}

export interface SessionSnapshot {
  status: ConnStatus;
  stop: StopReason | null;
  /** Reconectando depois de 1008/4029: o cliente espera ~30 s. */
  slowRetry: boolean;
  me: PlayerId | null;
  room: RoomMessage | null;
  state: StateMessage | null;
  /** `legalActions` da `view` de `state`, sem `TIMEOUT` nem `FORFEIT`. */
  legal: PlayerAction[];
  /** Uma jogada foi enviada e o `ack` ainda não chegou. */
  pending: boolean;
  notice: Notice | null;
  /** Relógio local (`deps.now`) da chegada do último `state`. */
  receivedAt: number;
}

export interface SessionDeps {
  now(): number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(handle: unknown): void;
  /** Chamado a cada `state`, com o `seq` dele (para guardar o `lastSeq`). */
  onSeq?(seq: number): void;
}

/** Quanto tempo um aviso fica na tela. */
export const NOTICE_MS = 4_000;

const STOP_BY_CODE: Record<number, StopReason> = {
  4000: 'ROOM_GONE',
  4001: 'PROTOCOL',
  4003: 'AUTH',
  4009: 'OTHER_TAB',
  1000: 'LEFT',
};

/** O motivo de parada de um fechamento final (spec §6.3); `null` para os que reconectam. */
export function stopReasonFor(code: number): StopReason | null {
  return STOP_BY_CODE[code] ?? null;
}

/** Recusas que só esperam o `state` que as explica (spec §6.4). */
const WAIT_CODES: ReadonlySet<string> = new Set([
  'STALE_EPOCH',
  'DISCONNECTED',
  'ALREADY_PASSED',
  'NOT_PLAYING',
  'NOT_YOUR_TURN',
  'WRONG_PHASE',
  'GAME_OVER',
  'ALREADY_SUBMITTED',
]);

/** O que a interface faz com um `ack` (spec §6.4). */
export function ackOutcome(ack: AckMessage): 'ok' | 'wait' | 'rate' | 'rule' {
  if (ack.ok) return 'ok';
  if (WAIT_CODES.has(ack.code)) return 'wait';
  if (ack.code === 'RATE_LIMITED') return 'rate';
  return 'rule';
}

export class Session {
  readonly #connection: RoomConnection;
  readonly #deps: SessionDeps;
  readonly #listeners = new Set<() => void>();
  readonly #unsubscribe: () => void;
  #snapshot: SessionSnapshot;
  #noticeTimer: unknown = null;
  #disposed = false;

  constructor(connection: RoomConnection, deps: SessionDeps) {
    this.#connection = connection;
    this.#deps = deps;
    const state = connection.state;
    this.#snapshot = {
      status: 'connecting',
      stop: null,
      slowRetry: false,
      me: connection.playerId,
      room: connection.room,
      state,
      legal: state ? legalFor(state.view) : [],
      pending: false,
      notice: null,
      receivedAt: state ? deps.now() : 0,
    };
    this.#unsubscribe = connection.subscribe((event) => this.#onEvent(event));
  }

  subscribe(listener: () => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  snapshot(): SessionSnapshot {
    return this.#snapshot;
  }

  /**
   * Manda uma jogada. Com outra em voo (`pending`), não manda nada: a mesa já desliga os controles,
   * mas dois toques rápidos chegam antes de ela redesenhar.
   */
  play(action: PlayerAction, options?: { auto?: boolean }): Promise<void> {
    return this.#send(() => this.#connection.act(action, options));
  }

  ready(value: boolean): void {
    this.#connection.ready(value);
  }

  leave(): void {
    this.#connection.leave();
  }

  rematch(want: boolean): void {
    this.#connection.rematch(want);
  }

  concede(): Promise<void> {
    return this.#send(() => this.#connection.concede());
  }

  /** A aba voltou: a conexão reconecta já ou sonda o socket. */
  wake(): void {
    this.#connection.wake();
  }

  /** Para de ouvir a conexão e de agendar timers. Não fecha a conexão: quem a criou a fecha. */
  dispose(): void {
    this.#disposed = true;
    this.#unsubscribe();
    this.#listeners.clear();
    this.#clearNoticeTimer();
  }

  async #send(dispatch: () => Promise<AckMessage>): Promise<void> {
    if (this.#disposed || this.#snapshot.pending) return;
    this.#clearNoticeTimer();
    this.#update({ pending: true, notice: null });
    let ack: AckMessage;
    try {
      ack = await dispatch();
    } catch (error) {
      if (!this.#disposed) this.#update({ pending: false });
      throw error;
    }
    if (this.#disposed) return;
    const outcome = ackOutcome(ack);
    if (outcome === 'rate') this.#update({ pending: false, notice: this.#notice({ kind: 'rate', text: RATE_NOTICE }) });
    else if (outcome === 'rule' && !ack.ok) {
      this.#update({ pending: false, notice: this.#notice({ kind: 'rule', text: ack.message }) });
    } else this.#update({ pending: false });
  }

  #onEvent(event: ConnectionEvent): void {
    switch (event.type) {
      case 'open':
        this.#update({ status: 'open', stop: null, slowRetry: false });
        return;
      case 'room':
        this.#update({ room: event.room });
        return;
      case 'state':
        this.#deps.onSeq?.(event.state.seq);
        this.#update({
          state: event.state,
          legal: legalFor(event.state.view),
          receivedAt: this.#deps.now(),
        });
        return;
      case 'error':
        if (event.error.code === 'RATE_LIMITED') {
          this.#update({ notice: this.#notice({ kind: 'rate', text: RATE_NOTICE }) });
        }
        return;
      case 'closed':
        if (event.final) {
          this.#update({ status: 'stopped', stop: stopReasonFor(event.code) ?? 'PROTOCOL', slowRetry: false });
        } else {
          this.#update({ status: 'reconnecting', slowRetry: SLOW_RETRY_CODES.includes(event.code) });
        }
        return;
    }
  }

  /** Mostra o aviso e agenda o sumiço, trocando o prazo do anterior. */
  #notice(notice: Notice): Notice {
    this.#clearNoticeTimer();
    this.#noticeTimer = this.#deps.setTimer(() => {
      this.#noticeTimer = null;
      this.#update({ notice: null });
    }, NOTICE_MS);
    return notice;
  }

  #clearNoticeTimer(): void {
    if (this.#noticeTimer === null) return;
    this.#deps.clearTimer(this.#noticeTimer);
    this.#noticeTimer = null;
  }

  /**
   * O único caminho de mudança: junta o `patch` (e o `me` da conexão) ao snapshot e avisa os ouvintes.
   * Sem diferença, o snapshot continua sendo o mesmo objeto e ninguém é avisado.
   */
  #update(patch: Partial<SessionSnapshot>): void {
    const next: SessionSnapshot = { ...this.#snapshot, ...patch, me: this.#connection.playerId };
    const changed = (Object.keys(next) as (keyof SessionSnapshot)[]).some((k) => next[k] !== this.#snapshot[k]);
    if (!changed) return;
    this.#snapshot = next;
    for (const listener of [...this.#listeners]) listener();
  }
}
