// Fixtures dos testes da web (spec §9). Tudo determinístico: partidas e bots com semente fixa, ids
// por contador; nada de `Math.random`, relógio ou rede.
import {
  actingPlayers,
  applyAction,
  createGame,
  legalActions,
  makeConfig,
  viewEvents,
  viewFor,
  type Card,
  type ConfigOverrides,
  type FaceKind,
  type GameEvent,
  type GameState,
  type Phase,
  type PlayerId,
  type PlayerView,
  type Rank,
  type ReactionTrigger,
  type RowName,
  type SpecialCard,
  type SpecialKind,
  type Suit,
} from '@coringa/engine';
import type {
  AckCode,
  AckMessage,
  ConnectionEvent,
  Deadline,
  PlayerAction,
  RoomConnection,
  RoomMessage,
  StateMessage,
} from '@coringa/protocol';
import { BOTS, type BotName } from '@coringa/sim/bots';
import { createRng } from '@coringa/sim/rng';

const SEATS: [PlayerId, PlayerId] = ['p1', 'p2'];

export interface SeededStep {
  /** Estado da partida antes da jogada. */
  state: GameState;
  /** `view` de quem age, antes da jogada. */
  view: PlayerView;
  /** Eventos da jogada, redigidos para quem age (`viewEvents`). */
  events: GameEvent[];
  actor: PlayerId;
}

/**
 * Uma partida bot × bot (greedy × greedy por padrão) com semente fixa, passo a passo. Pode terminar
 * antes de `steps` jogadas, se a partida acabar.
 */
export function seededSteps(seed: string, steps: number, bots: [BotName, BotName] = ['greedy', 'greedy']): SeededStep[] {
  const created = createGame(makeConfig(), seed, SEATS);
  if (!created.ok) throw new Error(`${created.error.code}: ${created.error.message}`);
  let state = created.state;
  const rngs = [createRng(`${seed}/bots/p1`), createRng(`${seed}/bots/p2`)] as const;
  const out: SeededStep[] = [];
  while (out.length < steps && state.phase.kind !== 'GAME_OVER') {
    const actor = actingPlayers(state)[0]!;
    const seat = actor === SEATS[0] ? 0 : 1;
    const view = viewFor(state, actor);
    const action = BOTS[bots[seat]](view, legalActions(view), rngs[seat]);
    const result = applyAction(state, actor, action);
    if (!result.ok) throw new Error(`bot jogou ação ilegal (${result.error.code}): ${JSON.stringify(action)}`);
    out.push({ state, view, events: viewEvents(result.events, actor), actor });
    state = result.state;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Cenários

/** `'J'` vira uma carta de ids e naipe determinísticos; um objeto entra como está. */
export type CardSpec = SpecialKind | SpecialCard;

export interface SideSpec {
  hp?: number;
  hand?: CardSpec[];
  attackBuffs?: CardSpec[];
  defenseBuffs?: CardSpec[];
  guard?: CardSpec[];
  /** Numéricas pendentes do Equipar (valores, na ordem de compra); com elas o lado ainda não confirmou. */
  pending?: Rank[];
  /** Já confirmou o Equipar (padrão: sim, salvo com `pending`). */
  equipSubmitted?: boolean;
  /** Valores das numéricas, da primeira à última. */
  attackRow?: Rank[];
  defenseRow?: Rank[];
  /** Reflect ativo (K + J + Q). */
  reflect?: boolean;
  absoluteDefense?: boolean;
  resurrections?: Array<{ row: RowName; value: Rank }>;
}

export interface ViewSpec {
  /** Semente do `createGame` (monte e iniciativa). */
  seed?: string;
  /** Quem vê (padrão `p1`); o outro é o oponente. */
  me?: PlayerId;
  config?: ConfigOverrides;
  /** Quem tem a iniciativa (padrão: você). */
  initiative?: 'self' | 'opponent';
  /** Quem ataca primeiro na rodada (padrão: você). */
  firstToAttack?: 'self' | 'opponent';
  /** Rodada (padrão 10). */
  round?: number;
  /** Bônus da Pressão da mesa (padrão 0). */
  pressure?: number;
  /** Rodadas seguidas sem dano (padrão 0). */
  noDamageStreak?: number;
  /** `MAIN` (padrão): fase principal de `me`. `WAITING`: fase principal do oponente. Um gatilho abre a reação de `me`. */
  phase?: 'MAIN' | 'WAITING' | ReactionTrigger | Phase;
  self?: SideSpec;
  opponent?: SideSpec;
  /** Números viram numéricas; objetos entram como estão. */
  graveyard?: Array<Rank | Card>;
}

const SUITS: readonly Suit[] = ['copas', 'ouros', 'espadas', 'paus'];

function resolvePhase(phase: ViewSpec['phase'], me: PlayerId, other: PlayerId): Phase {
  if (phase === undefined || phase === 'MAIN') return { kind: 'ATTACK_MAIN', player: me };
  if (phase === 'WAITING') return { kind: 'ATTACK_MAIN', player: other };
  if (typeof phase === 'string') return { kind: 'REACTION', responder: me, trigger: phase };
  return phase;
}

/**
 * Cenário de mesa: parte de um `createGame` (só a API pública do motor) e sobrescreve o que o
 * `spec` descreve. Devolve o estado, para conferir as jogadas com `applyAction`, e a `view` de `me`.
 */
export function scenarioAt(spec: ViewSpec = {}): { state: GameState; view: PlayerView } {
  const me = spec.me ?? SEATS[0];
  const other = me === SEATS[0] ? SEATS[1] : SEATS[0];
  const created = createGame(makeConfig(spec.config), spec.seed ?? 'view-at', SEATS);
  if (!created.ok) throw new Error(`${created.error.code}: ${created.error.message}`);
  const state = created.state;
  let n = 0;

  const special = (c: CardSpec, owner: PlayerId): SpecialCard => {
    if (typeof c !== 'string') return c;
    n += 1;
    const id = `x-${owner}-${c}-${n}`;
    if (c === 'WILD') return { id, kind: 'WILD' };
    const kind: FaceKind = c;
    return { id, kind, suit: SUITS[n % SUITS.length]! };
  };
  const numbers = (values: Rank[] | undefined, owner: PlayerId, row: RowName | 'PEND') =>
    (values ?? []).map((value, i) => ({
      id: `x-${owner}-${row}-${i}`,
      kind: 'NUM' as const,
      value,
      suit: SUITS[i % SUITS.length]!,
    }));

  const fill = (owner: PlayerId, side: SideSpec = {}): void => {
    const p = state.players.find((candidate) => candidate.id === owner)!;
    p.hand = (side.hand ?? []).map((c) => special(c, owner));
    if (side.hp !== undefined) p.hp = side.hp;
    p.pending = numbers(side.pending, owner, 'PEND');
    p.equipSubmitted = side.equipSubmitted ?? side.pending === undefined;
    p.submittedDestinations = null;
    p.attackRow = numbers(side.attackRow, owner, 'ATK');
    p.defenseRow = numbers(side.defenseRow, owner, 'DEF');
    p.attackBuffs = (side.attackBuffs ?? []).map((c) => special(c, owner));
    p.defenseBuffs = (side.defenseBuffs ?? []).map((c) => special(c, owner));
    p.guard = (side.guard ?? []).map((c) => special(c, owner));
    p.reflect = side.reflect ? { k: special('K', owner), j: special('J', owner), q: special('Q', owner) } : null;
    p.absoluteDefense = side.absoluteDefense ?? false;
    p.quads = [];
    p.resurrections = (side.resurrections ?? []).map((r) => ({ ...r, formedAtRound: state.round }));
  };

  state.round = spec.round ?? 10;
  state.pressure = spec.pressure ?? 0;
  state.noDamageStreak = spec.noDamageStreak ?? 0;
  state.roundKind = 'ATTACK';
  state.initiative = spec.initiative === 'opponent' ? other : me;
  state.turnOrder = spec.firstToAttack === 'opponent' ? [other, me] : [me, other];
  state.turnIndex = 0;
  state.graveyard = (spec.graveyard ?? []).map((c, i): Card =>
    typeof c === 'number' ? { id: `x-grave-${i}`, kind: 'NUM', value: c, suit: SUITS[i % SUITS.length]! } : c,
  );
  fill(me, spec.self);
  fill(other, spec.opponent);
  state.phase = resolvePhase(spec.phase, me, other);
  // A fase de Equipar só existe na rodada de Equipar.
  state.roundKind = state.phase.kind === 'EQUIP' ? 'EQUIP' : 'ATTACK';
  return { state, view: viewFor(state, me) };
}

/** A `view` de um cenário. */
export function viewAt(spec: ViewSpec = {}): PlayerView {
  return scenarioAt(spec).view;
}

// ---------------------------------------------------------------------------------------------
// Conexão de mentira

/** Um `StateMessage` mínimo em volta de uma `view`. */
export function stateMessage(view: PlayerView, extra: Partial<Omit<StateMessage, 't' | 'view'>> = {}): StateMessage {
  return { t: 'state', seq: 1, epoch: 1, view, events: [], deadline: null, serverNow: 0, ...extra };
}

/** Resposta roteirizada: o `id` é o da jogada, preenchido pela conexão. */
export type AckScript = { ok: true; seq?: number; held?: true } | { ok: false; code: AckCode; message: string };

export type SentMessage =
  | { type: 'act'; id: string; action: PlayerAction; options: { auto?: boolean } | undefined }
  | { type: 'concede'; id: string };

/** Uma resposta que o teste resolve quando quiser (para ver o "enviando"). */
export function deferredAck(): { promise: Promise<AckScript>; resolve: (ack: AckScript) => void } {
  let resolve!: (ack: AckScript) => void;
  const promise = new Promise<AckScript>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

export interface FakeConnectionOptions {
  playerId?: PlayerId | null;
  room?: RoomMessage | null;
  state?: StateMessage | null;
  /** Relógio do servidor em ms, para `remainingMs`. */
  now?: number;
}

/**
 * `RoomConnection` para os testes: sem rede e sem tempo. `act` e `concede` guardam o que enviaram em
 * `sent` e respondem com o próximo item de `acks` (vazio: sucesso). Os ids são `fake-1`, `fake-2`, …
 */
export class FakeConnection implements RoomConnection {
  playerId: PlayerId | null;
  room: RoomMessage | null;
  state: StateMessage | null;
  /** Relógio do servidor usado por `remainingMs`. */
  now: number;
  /** Respostas roteirizadas, na ordem dos envios. */
  acks: Array<AckScript | Promise<AckScript>> = [];
  readonly sent: SentMessage[] = [];
  /** Os outros comandos recebidos, em ordem: `connect`, `wake`, `ready:true`, `leave`, `rematch:false`, `close`. */
  readonly calls: string[] = [];

  readonly #listeners = new Set<(e: ConnectionEvent) => void>();
  #counter = 0;

  constructor(options: FakeConnectionOptions = {}) {
    this.playerId = options.playerId === undefined ? SEATS[0] : options.playerId;
    this.room = options.room ?? null;
    this.state = options.state ?? null;
    this.now = options.now ?? 0;
  }

  subscribe(listener: (e: ConnectionEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /** Entrega um evento de conexão aos ouvintes. */
  emit(event: ConnectionEvent): void {
    for (const listener of [...this.#listeners]) listener(event);
  }

  /** Atualiza `state` e avisa os ouvintes (nessa ordem, como o cliente de verdade). */
  emitState(state: StateMessage): void {
    this.state = state;
    this.emit({ type: 'state', state });
  }

  emitRoom(room: RoomMessage): void {
    this.room = room;
    this.emit({ type: 'room', room });
  }

  emitClosed(code: number, final = false): void {
    this.emit({ type: 'closed', code, final });
  }

  connect(): void {
    this.calls.push('connect');
  }

  wake(): void {
    this.calls.push('wake');
  }

  ready(value: boolean): void {
    this.calls.push(`ready:${value}`);
  }

  leave(): void {
    this.calls.push('leave');
  }

  rematch(want: boolean): void {
    this.calls.push(`rematch:${want}`);
  }

  close(): void {
    this.calls.push('close');
    this.emitClosed(1000, true);
  }

  act(action: PlayerAction, options?: { auto?: boolean }): Promise<AckMessage> {
    const id = this.#nextId();
    this.sent.push({ type: 'act', id, action, options });
    return this.#answer(id);
  }

  concede(): Promise<AckMessage> {
    const id = this.#nextId();
    this.sent.push({ type: 'concede', id });
    return this.#answer(id);
  }

  remainingMs(deadline: Deadline): number {
    return Math.max(0, deadline.at - this.now);
  }

  #nextId(): string {
    this.#counter += 1;
    return `fake-${this.#counter}`;
  }

  async #answer(id: string): Promise<AckMessage> {
    const script = await (this.acks.shift() ?? { ok: true });
    return { t: 'ack', id, ...script };
  }
}
