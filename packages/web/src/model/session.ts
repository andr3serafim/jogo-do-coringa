// Sessão da sala (spec §1.5, §3.9, §6.2–§6.4). Puro: sem React nem DOM; relógio e timers entram por
// `SessionDeps`. Guarda o que a mesa precisa de uma conexão: estado, sala, jogada em voo, aviso e fim.
//
// A interface lê `snapshot()` (via `useSyncExternalStore`): um objeto novo a cada mudança e o mesmo
// enquanto nada muda. Toda mudança passa por `#update`, que também recalcula o que a sessão deriva do
// que guarda por dentro (rascunho do Equipar, confirmação, prazo da ordem automática e marcas).
//
// Automações (spec §3.5, §3.6, §3.7): o passe automático, a ordem automática e o envio antecipado do
// Equipar saem daqui, sempre por `deps.setTimer`/`deps.clearTimer`. Só o passe e a ordem levam `auto`.
import type { Destination, PlayerId, PlayerView } from '@coringa/engine';
import {
  SLOW_RETRY_CODES,
  type AckMessage,
  type ConnectionEvent,
  type Deadline,
  type PlayerAction,
  type RoomConnection,
  type RoomMessage,
  type StateMessage,
} from '@coringa/protocol';
import { ORDER_AUTO_MS, shouldAutoPass } from './automation.ts';
import { AUTO_PASS_NOTICE, RATE_NOTICE } from './copy.ts';
import { completeDraft, EQUIP_AUTO_SEND_MS, nextDestinations, shouldAutoSendEquip } from './equip.ts';
import { appendHistory, appendNote, EMPTY_HISTORY, forGame, returnNote, roomNames, type HistoryState } from './history.ts';
import { computeMarks, NO_MARKS, type Marks } from './marks.ts';
import { legalFor } from './plays.ts';
import { DEFAULT_PREFS, type Prefs } from './storage.ts';
import { buildTimeline, timelineMs } from './timeline.ts';

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
  /** Destinos escolhidos no Equipar, na ordem das cartas pendentes. Zera quando a época muda. */
  equipDraft: Destination[];
  /** `thisPage`: esta página confirmou; `earlier`: a `view` já diz que sim (página recarregada). */
  equipConfirmed: 'none' | 'thisPage' | 'earlier';
  /** Relógio local (`deps.now`) em que a ordem sai sozinha; `null` sem confirmação agendada. */
  orderAutoAt: number | null;
  /** O que mudou na mesa desde a sua última jogada voluntária e ainda não foi visto. */
  marks: Marks;
  /**
   * `seq` do último passo que é seu: as linhas do histórico com `seq` maior são "novas" (spec §10.5). Na jogada voluntária
   * é o `seq` do `state` da base das marcas; o `ack` com `seq` o leva até o passo da jogada (o que ela mesma causou não é
   * novo). `null` sem base: nenhuma jogada voluntária nesta partida.
   */
  marksBaseSeq: number | null;
  /** As linhas da partida em curso, em ordem (spec §3.1). */
  history: HistoryState;
  /** As preferências do jogador (a mesa lê "reduzir animações" daqui; o menu as troca por `setPrefs`). */
  prefs: Prefs;
}

/** Campos que a sessão deriva do que guarda por dentro: nunca entram num `patch`. */
type Derived = 'equipDraft' | 'equipConfirmed' | 'orderAutoAt' | 'marks' | 'marksBaseSeq' | 'history' | 'prefs';

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

type Outcome = ReturnType<typeof ackOutcome> | 'skipped';

const noop = (): void => undefined;

function sameSet(a: ReadonlySet<string>, b: ReadonlySet<string>): boolean {
  return a.size === b.size && [...a].every((x) => b.has(x));
}

function sameMarks(a: Marks, b: Marks): boolean {
  return a === b || (sameSet(a.cards, b.cards) && sameSet(a.zones, b.zones));
}

export class Session {
  readonly #connection: RoomConnection;
  readonly #deps: SessionDeps;
  readonly #listeners = new Set<() => void>();
  readonly #unsubscribe: () => void;
  #snapshot: SessionSnapshot;
  #prefs: Prefs;
  #noticeTimer: unknown = null;
  #disposed = false;

  /** Época do último `state`: o rascunho e os agendamentos valem para uma época só. */
  #epoch: number | null = null;

  // Equipar
  #draft: Destination[] = [];
  #equipSentEpoch: number | null = null;
  /** Época em que o envio antecipado (ou a confirmação) já foi tentado: não se tenta sozinho de novo. */
  #equipAutoEpoch: number | null = null;
  #equipTimer: unknown = null;

  // Ordem automática
  #orderEpoch: number | null = null;
  #orderAt: number | null = null;
  #orderTimer: unknown = null;

  // Passe automático
  #autoPassEpoch: number | null = null;

  // Marcas: `base` é a `view` da última jogada voluntária; `seen`, o que o jogador já viu desde então.
  #base: PlayerView | null = null;
  #baseSeq: number | null = null;
  #seen: ReadonlySet<string> = new Set();
  // Histórico: as linhas de todo `state` que chegou (a sessão vê todos, ao contrário de um componente).
  #history: HistoryState = EMPTY_HISTORY;
  #marksCache: { view: PlayerView | null; base: PlayerView | null; seen: ReadonlySet<string>; value: Marks } = {
    view: null,
    base: null,
    seen: this.#seen,
    value: NO_MARKS,
  };

  constructor(connection: RoomConnection, deps: SessionDeps, prefs: Prefs = DEFAULT_PREFS) {
    this.#connection = connection;
    this.#deps = deps;
    this.#prefs = prefs;
    const state = connection.state;
    this.#epoch = state?.epoch ?? null;
    if (connection.room) this.#history = forGame(this.#history, connection.room.gameNo);
    if (state) this.#history = appendHistory(this.#history, state, this.#names(state, connection.room));
    this.#snapshot = this.#derive({
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
    });
    this.#unsubscribe = connection.subscribe((event) => this.#onEvent(event));
    if (state) this.#reconcile();
  }

  /** O relógio local da sessão (`deps.now`): é o dos instantes `orderAutoAt` e `receivedAt` do snapshot. */
  now(): number {
    return this.#deps.now();
  }

  /** Tempo que falta para o prazo, pelo relógio do servidor (a conexão conhece o deslocamento). */
  remainingMs(deadline: Deadline): number {
    return this.#connection.remainingMs(deadline);
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

  /** Troca as preferências (a chave do passe automático vale já na janela aberta). */
  setPrefs(prefs: Prefs): void {
    this.#prefs = prefs;
    this.#reconcile();
  }

  /**
   * Manda uma jogada. Com outra em voo (`pending`), não manda nada: a mesa já desliga os controles,
   * mas dois toques rápidos chegam antes de ela redesenhar. Sem `auto`, a jogada é voluntária: troca a
   * base das marcas e cancela a ordem automática.
   */
  async play(action: PlayerAction, options?: { auto?: boolean }): Promise<void> {
    await this.#send(() => this.#connection.act(action, options), { voluntary: options?.auto !== true });
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

  async concede(): Promise<void> {
    await this.#send(() => this.#connection.concede(), { voluntary: true });
  }

  /** A aba voltou: a conexão reconecta já ou sonda o socket. Depois do `dispose()`, não faz nada. */
  wake(): void {
    if (this.#disposed) return;
    this.#connection.wake();
  }

  /** O jogador mexeu no painel da ordem (toque, foco, mouse): a confirmação automática não sai mais. */
  interact(): void {
    this.#cancelOrder();
    this.#update({});
  }

  /** Escolhe o destino da próxima carta pendente, se ele leva a uma montagem legal. */
  equipChoose(destination: Destination): void {
    const { state, legal } = this.#snapshot;
    if (!state || !this.#canEquip()) return;
    if (!nextDestinations(state.view, legal, this.#draft).includes(destination)) return;
    this.#draft = [...this.#draft, destination];
    this.#update({});
    this.#reconcileEquip();
  }

  equipUndo(): void {
    if (this.#draft.length === 0 || !this.#canEquip()) return;
    this.#draft = this.#draft.slice(0, -1);
    this.#update({});
    this.#reconcileEquip();
  }

  equipReset(): void {
    if (this.#draft.length === 0 || !this.#canEquip()) return;
    this.#draft = [];
    this.#update({});
    this.#reconcileEquip();
  }

  /** Confirma o rascunho (o que faltar sai da regra de estouro do motor). */
  async equipConfirm(): Promise<void> {
    if (!this.#canEquip()) return;
    await this.#sendEquip();
  }

  /** O jogador viu a carta ou a zona (`zone:<nome>`): a marca apaga. */
  markSeen(key: string): void {
    if (this.#seen.has(key)) return;
    this.#seen = new Set([...this.#seen, key]);
    this.#update({});
  }

  /** Para de ouvir a conexão e de agendar timers. Não fecha a conexão: quem a criou a fecha. */
  dispose(): void {
    this.#disposed = true;
    this.#unsubscribe();
    this.#listeners.clear();
    this.#clearNoticeTimer();
    this.#cancelOrder();
    this.#clearEquipTimer();
  }

  async #send(
    dispatch: () => Promise<AckMessage>,
    { voluntary, notice }: { voluntary: boolean; notice?: Notice },
  ): Promise<Outcome> {
    if (this.#disposed || this.#snapshot.pending) return 'skipped';
    const current = this.#snapshot.notice;
    const transient = current?.kind === 'rate' || current?.kind === 'rule';
    if (transient) this.#clearNoticeTimer();
    if (voluntary) {
      this.#cancelOrder();
      this.#base = this.#snapshot.state?.view ?? null;
      this.#baseSeq = this.#snapshot.state?.seq ?? null;
      this.#seen = new Set();
    }
    this.#update({ pending: true, notice: notice ?? (transient ? null : current) });
    let ack: AckMessage;
    try {
      ack = await dispatch();
    } catch (error) {
      if (!this.#disposed) this.#update({ pending: false });
      throw error;
    }
    if (this.#disposed) return 'skipped';
    const outcome = ackOutcome(ack);
    if (voluntary && ack.ok && ack.seq !== undefined && ack.seq > (this.#baseSeq ?? -1)) this.#baseSeq = ack.seq;
    if (outcome === 'rate') this.#update({ pending: false, notice: this.#notice({ kind: 'rate', text: RATE_NOTICE }) });
    else if (outcome === 'rule' && !ack.ok) {
      this.#update({ pending: false, notice: this.#notice({ kind: 'rule', text: ack.message }) });
    } else this.#update({ pending: false });
    this.#reconcileAutoPass();
    return outcome;
  }

  #onEvent(event: ConnectionEvent): void {
    switch (event.type) {
      case 'open':
        this.#update({ status: 'open', stop: null, slowRetry: false });
        return;
      case 'room': {
        this.#syncGame(event.room.gameNo);
        const me = this.#connection.playerId;
        const note = me === null ? null : returnNote(this.#snapshot.room, event.room, me);
        if (note !== null) this.#history = appendNote(this.#history, note);
        this.#update({ room: event.room });
        return;
      }
      case 'state': {
        const { state } = event;
        this.#deps.onSeq?.(state.seq);
        this.#history = appendHistory(this.#history, state, this.#names(state, this.#snapshot.room));
        const newEpoch = state.epoch !== this.#epoch;
        if (newEpoch) this.#startEpoch(state.epoch);
        const notice = this.#snapshot.notice;
        this.#update({
          state,
          legal: legalFor(state.view),
          receivedAt: this.#deps.now(),
          ...(newEpoch && notice?.kind === 'autoPass' ? { notice: null } : {}),
        });
        this.#reconcile();
        return;
      }
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

  /** Partida nova (outro `gameNo`): o histórico e a base das marcas da anterior não valem mais. */
  #syncGame(gameNo: number): void {
    const before = this.#history.gameNo;
    this.#history = forGame(this.#history, gameNo);
    if (before === null || before === gameNo) return;
    this.#base = null;
    this.#baseSeq = null;
    this.#seen = new Set();
  }

  #names(state: StateMessage, room: RoomMessage | null) {
    return roomNames(state.view.me, room?.seats ?? []);
  }

  /** Época nova: o rascunho e os agendamentos da anterior não valem mais. */
  #startEpoch(epoch: number): void {
    this.#epoch = epoch;
    if (this.#draft.length > 0) this.#draft = [];
    this.#clearEquipTimer();
    this.#cancelOrder();
  }

  // -------------------------------------------------------------------------------------------
  // Automações

  /** Reavalia as três automações contra o `state` atual. Idempotente. */
  #reconcile(): void {
    if (this.#disposed) return;
    this.#reconcileOrder();
    this.#update({});
    this.#reconcileEquip();
    this.#reconcileAutoPass();
  }

  /** Passe automático: sai assim que a janela abre, uma vez por época (spec §3.7). */
  #reconcileAutoPass(): void {
    const { state, legal, pending } = this.#snapshot;
    if (this.#disposed || !state || pending) return;
    if (!shouldAutoPass(state.view, legal, this.#prefs, this.#autoPassEpoch === state.epoch)) return;
    this.#autoPassEpoch = state.epoch;
    void this.#send(() => this.#connection.act({ type: 'PASS' }, { auto: true }), {
      voluntary: false,
      notice: { kind: 'autoPass', text: AUTO_PASS_NOTICE },
    }).catch(noop);
  }

  /** Ordem automática: `receivedAt` + batidas da revelação + 3 s, só para quem escolhe (spec §3.6). */
  #reconcileOrder(): void {
    const { state, legal, receivedAt } = this.#snapshot;
    if (!state || !legal.some((a) => a.type === 'CHOOSE_ORDER')) {
      this.#cancelOrder();
      return;
    }
    if (this.#orderEpoch === state.epoch) return;
    this.#orderEpoch = state.epoch;
    const mode = state.resync ? 'resync' : state.catchUp ? 'catchUp' : 'live';
    const beats = buildTimeline(state.events, {
      mode,
      reducedMotion: this.#prefs.reduceMotion,
      decisionPending: true,
    });
    const at = receivedAt + timelineMs(beats) + ORDER_AUTO_MS;
    this.#orderAt = at;
    this.#orderTimer = this.#deps.setTimer(() => {
      this.#orderTimer = null;
      this.#orderAt = null;
      this.#update({});
      void this.play({ type: 'CHOOSE_ORDER', first: true }, { auto: true }).catch(noop);
    }, Math.max(0, at - this.#deps.now()));
  }

  /** Cancela a ordem automática desta época (e só dela: uma época nova agenda de novo). */
  #cancelOrder(): void {
    if (this.#orderTimer !== null) {
      this.#deps.clearTimer(this.#orderTimer);
      this.#orderTimer = null;
    }
    this.#orderAt = null;
  }

  /** Envio antecipado do Equipar: com ≥ 1 escolha, quando faltam 1500 ms, sem `auto` (spec §3.5). */
  #reconcileEquip(): void {
    this.#clearEquipTimer();
    const { state, legal, equipConfirmed } = this.#snapshot;
    if (this.#disposed || !state?.deadline || state.deadline.kind !== 'EQUIP') return;
    if (!legal.some((a) => a.type === 'EQUIP')) return;
    const gates = {
      chosen: this.#draft.length,
      submitted: equipConfirmed !== 'none',
      sent: this.#equipAutoEpoch === state.epoch,
    };
    // Com tempo de sobra, `shouldAutoSendEquip` só diz se as outras condições valem.
    if (!shouldAutoSendEquip({ ...gates, remainingMs: 0 })) return;
    const remainingMs = this.#connection.remainingMs(state.deadline);
    if (shouldAutoSendEquip({ ...gates, remainingMs })) {
      void this.#sendEquip().catch(noop);
      return;
    }
    this.#equipTimer = this.#deps.setTimer(() => {
      this.#equipTimer = null;
      void this.#sendEquip().catch(noop);
    }, remainingMs - EQUIP_AUTO_SEND_MS);
  }

  #clearEquipTimer(): void {
    if (this.#equipTimer === null) return;
    this.#deps.clearTimer(this.#equipTimer);
    this.#equipTimer = null;
  }

  /** Dá para montar agora: há `EQUIP` legal e esta página ainda não confirmou. */
  #canEquip(): boolean {
    const { legal, equipConfirmed } = this.#snapshot;
    return equipConfirmed === 'none' && legal.some((a) => a.type === 'EQUIP');
  }

  /**
   * Manda o rascunho completado pela regra do motor. É jogada voluntária (sem `auto`). Depois de uma
   * tentativa, o envio antecipado não se repete sozinho nesta época; o `Confirmar` continua valendo.
   */
  async #sendEquip(): Promise<void> {
    const { state, pending } = this.#snapshot;
    if (this.#disposed || !state || pending) return;
    const epoch = state.epoch;
    const destinations = completeDraft(state.view, this.#draft);
    this.#clearEquipTimer();
    this.#equipAutoEpoch = epoch;
    this.#equipSentEpoch = epoch;
    let outcome: Outcome = 'skipped';
    try {
      outcome = await this.#send(() => this.#connection.act({ type: 'EQUIP', destinations }), { voluntary: true });
    } finally {
      // Sem `ok`, a `view` diz o que vale (`equipSubmitted`), e o rascunho volta a poder ser confirmado.
      if (outcome !== 'ok' && this.#equipSentEpoch === epoch) {
        this.#equipSentEpoch = null;
        if (!this.#disposed) this.#update({});
      }
    }
  }

  // -------------------------------------------------------------------------------------------

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

  #confirmedFor(state: StateMessage | null): SessionSnapshot['equipConfirmed'] {
    if (state === null) return 'none';
    if (this.#equipSentEpoch === state.epoch) return 'thisPage';
    return state.view.self.equipSubmitted ? 'earlier' : 'none';
  }

  /** As marcas, no mesmo objeto enquanto a conta der o mesmo conjunto. */
  #marksFor(state: StateMessage | null): Marks {
    const view = state?.view ?? null;
    const cache = this.#marksCache;
    if (cache.view === view && cache.base === this.#base && cache.seen === this.#seen) return cache.value;
    const computed = view === null ? NO_MARKS : computeMarks(this.#base, view, this.#seen);
    const value = sameMarks(cache.value, computed) ? cache.value : computed;
    this.#marksCache = { view, base: this.#base, seen: this.#seen, value };
    return value;
  }

  /** Acrescenta ao snapshot o que a sessão guarda por dentro. */
  #derive(snapshot: Omit<SessionSnapshot, Derived>): SessionSnapshot {
    return {
      ...snapshot,
      equipDraft: this.#draft,
      equipConfirmed: this.#confirmedFor(snapshot.state),
      orderAutoAt: this.#orderAt,
      marks: this.#marksFor(snapshot.state),
      marksBaseSeq: this.#baseSeq,
      history: this.#history,
      prefs: this.#prefs,
    };
  }

  /**
   * O único caminho de mudança: junta o `patch` (e o `me` da conexão) ao snapshot, recalcula os campos
   * derivados e avisa os ouvintes. Sem diferença, o snapshot continua sendo o mesmo objeto e ninguém é
   * avisado.
   */
  #update(patch: Partial<Omit<SessionSnapshot, Derived>>): void {
    const next = this.#derive({ ...this.#snapshot, ...patch, me: this.#connection.playerId });
    const changed = (Object.keys(next) as (keyof SessionSnapshot)[]).some((k) => next[k] !== this.#snapshot[k]);
    if (!changed) return;
    this.#snapshot = next;
    for (const listener of [...this.#listeners]) listener();
  }
}
