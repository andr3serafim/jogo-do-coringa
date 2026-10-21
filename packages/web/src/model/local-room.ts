// Sala local do treino (spec §2.6): o motor e o bot rodando no próprio navegador, atrás da mesma
// `RoomConnection` do cliente de rede. A sessão e as telas não sabem qual das duas estão usando, por isso
// as mensagens sintéticas têm a forma das do servidor. Sem relógio: `deadline` é sempre `null`.
import {
  DEFAULT_CONFIG,
  actingPlayers,
  applyAction,
  createGame,
  legalActions,
  viewEvents,
  viewFor,
  type Action,
  type GameEvent,
  type GameState,
  type PlayerId,
} from '@coringa/engine';
import type {
  AckMessage,
  ConnectionEvent,
  Deadline,
  Outcome,
  PlayerAction,
  RoomConnection,
  RoomMessage,
  Score,
  SeatInfo,
  StateMessage,
} from '@coringa/protocol';
import { BOTS, type BotName } from '@coringa/sim/bots';
import { createRng, type Rng } from '@coringa/sim/rng';

/** O assento do jogador; o do bot é `p2`. */
export const LOCAL_ME: PlayerId = 'p1';
const BOT_SEAT: PlayerId = 'p2';

const DEFAULT_THINK_MS = 600;
/** A sala local não expira de verdade; o `room` só precisa de um instante à frente. */
const EXPIRES_IN_MS = 24 * 60 * 60 * 1000;

export interface LocalRoomOptions {
  /** Semente da primeira partida; a revanche `n` usa `<semente>-<n>`. */
  seed: string;
  bot?: BotName;
  /** Quanto o bot "pensa" antes de jogar (padrão 600 ms). Na janela de reação ele responde sem esperar. */
  thinkMs?: number;
  setTimer(fn: () => void, ms: number): unknown;
  clearTimer(h: unknown): void;
  now(): number;
}

/** `?semente=<texto>` de um `location.search`; sem ela (ou vazia), uma semente sorteada por `random`. */
export function trainingSeed(search: string, random: () => number): string {
  const fromUrl = new URLSearchParams(search).get('semente');
  if (fromUrl) return fromUrl;
  return Math.floor(random() * 36 ** 8)
    .toString(36)
    .padStart(8, '0');
}

/**
 * Chave da fase em que o jogo espera uma jogada. Espelha a do servidor: a `epoch` sobe quando a chave depois
 * de um passo difere da de antes dele (não é derivada da chave, para voltar ao mesmo `ATTACK_MAIN` também contar).
 */
function phaseKey(state: GameState): string {
  const phase = state.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return JSON.stringify([state.round, 'EQUIP', null, null]);
    case 'ORDER_CHOICE':
    case 'ATTACK_MAIN':
      return JSON.stringify([state.round, phase.kind, phase.player, null]);
    case 'REACTION':
      return JSON.stringify([state.round, 'REACTION', phase.responder, phase.trigger]);
    case 'GAME_OVER':
      return JSON.stringify([state.round, 'GAME_OVER', null, null]);
  }
}

export class LocalRoom implements RoomConnection {
  readonly #options: LocalRoomOptions;
  readonly #think: number;
  readonly #listeners = new Set<(e: ConnectionEvent) => void>();

  #room: RoomMessage | null = null;
  #state: StateMessage | null = null;
  #game: GameState;
  #botRng: Rng;
  #botTimer: unknown = null;
  #connected = false;
  #closed = false;
  #idCounter = 0;
  #seq = 0;
  #epoch = 0;
  #gameNo = 0;
  #score: Score = { p1: 0, p2: 0, draws: 0 };
  #outcome: Outcome | undefined;

  constructor(options: LocalRoomOptions) {
    this.#options = options;
    this.#think = options.thinkMs ?? DEFAULT_THINK_MS;
    const { game, botRng } = this.#newGame();
    this.#game = game;
    this.#botRng = botRng;
  }

  get playerId(): PlayerId {
    return LOCAL_ME;
  }

  get room(): RoomMessage | null {
    return this.#room;
  }

  get state(): StateMessage | null {
    return this.#state;
  }

  subscribe(listener: (e: ConnectionEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /** O primeiro `connect` abre a sala e entrega `room` e `state`; os seguintes não fazem nada. */
  connect(): void {
    if (this.#connected || this.#closed) return;
    this.#connected = true;
    this.#emit({ type: 'open' });
    this.#publishStart();
  }

  /** Não há socket para sondar. */
  wake(): void {}

  /** Não há lobby. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a assinatura é a da RoomConnection
  ready(_value: boolean): void {}

  leave(): void {
    this.close();
  }

  /** Revanche: `true` começa outra partida na hora; `false` só atualiza o `room`. Só vale depois do fim. */
  rematch(want: boolean): void {
    if (this.#closed || !this.#connected || this.#room?.status !== 'FINISHED') return;
    if (!want) {
      this.#publishRoom('FINISHED');
      return;
    }
    const { game, botRng } = this.#newGame();
    this.#game = game;
    this.#botRng = botRng;
    this.#outcome = undefined;
    this.#publishStart();
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#clearBotTimer();
    if (this.#connected) this.#emit({ type: 'closed', code: 1000, final: true });
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a assinatura é a da RoomConnection
  act(action: PlayerAction, _options?: { auto?: boolean }): Promise<AckMessage> {
    const id = this.#nextId();
    const early = this.#earlyAck(id);
    if (early) return Promise.resolve(early);
    const result = applyAction(this.#game, LOCAL_ME, action);
    if (!result.ok) {
      return Promise.resolve({ t: 'ack', id, ok: false, code: result.error.code, message: result.error.message });
    }
    const seq = this.#commit(result.state, result.events);
    return Promise.resolve({ t: 'ack', id, ok: true, seq });
  }

  concede(): Promise<AckMessage> {
    const id = this.#nextId();
    const early = this.#earlyAck(id);
    if (early) return Promise.resolve(early);
    const result = applyAction(this.#game, 'system', { type: 'FORFEIT', loser: LOCAL_ME });
    if (!result.ok) {
      return Promise.resolve({ t: 'ack', id, ok: false, code: result.error.code, message: result.error.message });
    }
    const seq = this.#commit(result.state, result.events, 'CONCEDE');
    return Promise.resolve({ t: 'ack', id, ok: true, seq });
  }

  /** Sem prazos no treino. */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- a assinatura é a da RoomConnection
  remainingMs(_deadline: Deadline): number {
    return 0;
  }

  #nextId(): string {
    return `local-${++this.#idCounter}`;
  }

  #earlyAck(id: string): AckMessage | null {
    if (this.#closed || !this.#connected) {
      return { t: 'ack', id, ok: false, code: 'DISCONNECTED', message: 'Sem conexão com a sala.' };
    }
    if (this.#room?.status !== 'PLAYING') {
      return { t: 'ack', id, ok: false, code: 'NOT_PLAYING', message: 'Não há partida em andamento.' };
    }
    return null;
  }

  /** Estado novo, bot novo: a semente da partida `n` é `<semente>` (a 1ª) ou `<semente>-<n>`. */
  #newGame(): { game: GameState; botRng: Rng } {
    this.#gameNo += 1;
    const seed = this.#gameNo === 1 ? this.#options.seed : `${this.#options.seed}-${this.#gameNo}`;
    const created = createGame(DEFAULT_CONFIG, seed, [LOCAL_ME, BOT_SEAT]);
    if (!created.ok) throw new Error(`configuração inválida: ${created.error.message}`);
    return { game: created.state, botRng: createRng(`${seed}/bot`) };
  }

  /** Começo de partida (a primeira ou a revanche): `seq` e `epoch` só sobem, e o primeiro `state` vem sem eventos. */
  #publishStart(): void {
    this.#seq += 1;
    this.#epoch += 1;
    this.#publishRoom('PLAYING');
    this.#publishState([]);
    this.#autoEquip();
    this.#scheduleBot();
  }

  /** Aplica o estado novo, emite o `state` (e, no fim da partida, o `room`) e devolve o `seq` do passo. */
  #commit(next: GameState, events: GameEvent[], cause: 'CONCEDE' | 'NORMAL' = 'NORMAL'): number {
    const keyBefore = phaseKey(this.#game);
    this.#game = next;
    this.#seq += 1;
    if (phaseKey(next) !== keyBefore) this.#epoch += 1;
    const seq = this.#seq;
    this.#publishState(events);
    if (next.phase.kind === 'GAME_OVER') {
      this.#clearBotTimer();
      const result = next.phase.result;
      if (result.kind === 'WIN') this.#score[result.winner as 'p1' | 'p2'] += 1;
      else this.#score.draws += 1;
      this.#outcome = { gameNo: this.#gameNo, result, cause };
      this.#publishRoom('FINISHED');
    } else {
      this.#autoEquip();
      this.#scheduleBot();
    }
    return seq;
  }

  /**
   * Equipar sem numéricas: quem recebeu zero tem `EQUIP { destinations: [] }` aplicado em seu nome, como passo próprio, igual
   * ao servidor (spec 2 §5). A interface não tem botão para um Equipar vazio, e sem relógio ninguém mais o enviaria: o jogo
   * esperaria para sempre. O bot não precisa: ele escolhe a jogada pela lista legal, que traz o `EQUIP` vazio.
   */
  #autoEquip(): void {
    const player = this.#game.players.find((candidate) => candidate.id === LOCAL_ME);
    if (this.#game.phase.kind !== 'EQUIP' || !player || player.equipSubmitted || player.pending.length > 0) return;
    const result = applyAction(this.#game, LOCAL_ME, { type: 'EQUIP', destinations: [] });
    if (!result.ok) throw new Error(`o Equipar vazio foi recusado: ${result.error.code}`);
    this.#commit(result.state, result.events);
  }

  #publishState(events: GameEvent[]): void {
    const state: StateMessage = {
      t: 'state',
      seq: this.#seq,
      epoch: this.#epoch,
      view: viewFor(this.#game, LOCAL_ME),
      events: viewEvents(events, LOCAL_ME),
      deadline: null,
      serverNow: this.#options.now(),
    };
    this.#state = state;
    this.#emit({ type: 'state', state });
  }

  #publishRoom(status: 'PLAYING' | 'FINISHED'): void {
    const seat = (playerId: PlayerId, nickname: string): SeatInfo => ({
      playerId,
      nickname,
      connected: true,
      ready: false,
      wantsRematch: false,
    });
    const room: RoomMessage = {
      t: 'room',
      code: 'TREINO',
      status,
      seats: [seat(LOCAL_ME, 'Você'), seat(BOT_SEAT, 'Bot')],
      score: { ...this.#score },
      gameNo: this.#gameNo,
      expiresAt: this.#options.now() + EXPIRES_IN_MS,
    };
    if (this.#outcome) room.outcome = { ...this.#outcome };
    this.#room = room;
    this.#emit({ type: 'room', room });
  }

  /** O bot joga quando é a vez dele: depois de `thinkMs`, ou já (0 ms) numa janela de reação. Um timer por vez. */
  #scheduleBot(): void {
    if (this.#closed || this.#botTimer !== null) return;
    if (!actingPlayers(this.#game).includes(BOT_SEAT)) return;
    const delay = this.#game.phase.kind === 'REACTION' ? 0 : this.#think;
    this.#botTimer = this.#options.setTimer(() => {
      this.#botTimer = null;
      this.#botPlay();
    }, delay);
  }

  #botPlay(): void {
    const view = viewFor(this.#game, BOT_SEAT);
    const action: Action = BOTS[this.#options.bot ?? 'greedy'](view, legalActions(view), this.#botRng);
    const result = applyAction(this.#game, BOT_SEAT, action);
    if (!result.ok) throw new Error(`o bot jogou algo ilegal: ${result.error.code}`);
    this.#commit(result.state, result.events);
  }

  #clearBotTimer(): void {
    if (this.#botTimer === null) return;
    this.#options.clearTimer(this.#botTimer);
    this.#botTimer = null;
  }

  /** Cada listener isolado: a exceção de um vai ao `console.error` e não impede os outros. */
  #emit(event: ConnectionEvent): void {
    for (const listener of [...this.#listeners]) {
      try {
        listener(event);
      } catch (error) {
        console.error('LocalRoom: erro num listener', error);
      }
    }
  }
}
