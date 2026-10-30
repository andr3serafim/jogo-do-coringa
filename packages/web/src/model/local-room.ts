// Sala local do treino (spec §2.6): o motor e o bot rodando no próprio navegador, atrás da mesma
// `RoomConnection` do cliente de rede. A sessão e as telas não sabem qual das duas estão usando, por isso
// as mensagens sintéticas têm a forma das do servidor. Sem relógio: `deadline` é sempre `null`.
import {
  DEFAULT_CONFIG,
  actingPlayers,
  applyAction,
  createGame,
  legalActions,
  makeConfig,
  viewEvents,
  viewFor,
  type Action,
  type GameEvent,
  type GameState,
  type PlayerId,
  type ReplayStep,
} from '@coringa/engine';
import { HP_CHOICES } from '@coringa/protocol';
import type {
  AckMessage,
  ConnectionEvent,
  Deadline,
  Outcome,
  PlayerAction,
  ReplayMessage,
  RoomConnection,
  RoomMessage,
  Score,
  SeatInfo,
  StateMessage,
} from '@coringa/protocol';
import { BOTS, hardSearch } from '@coringa/sim/bots';
import { createRng, type Rng } from '@coringa/sim/rng';

/** O assento do jogador; o do bot é `p2`. */
export const LOCAL_ME: PlayerId = 'p1';
const BOT_SEAT: PlayerId = 'p2';

const DEFAULT_THINK_MS = 600;
/** Quanto de uma tarefa do navegador a busca do Difícil ocupa por vez (medido por `now`): as batidas e os timers não esperam mais que isto. */
const SLICE_MS = 8;
/** A sala local não expira de verdade; o `room` só precisa de um instante à frente. */
const EXPIRES_IN_MS = 24 * 60 * 60 * 1000;

/** Os níveis do bot do treino (spec da fatia 1, §3): o Fácil é o `easy`, o Médio, o `greedy` do simulador, e o Difícil, a busca por rollouts. */
export type TrainingLevel = 'facil' | 'medio' | 'dificil';

/** Do mais fácil ao mais difícil: a ordem dos botões da escolha. */
export const TRAINING_LEVELS: readonly TrainingLevel[] = ['facil', 'medio', 'dificil'];

/** `?nivel=<facil|medio|dificil>` de um `location.search`; sem ele, ou com outro valor, `null` (a tela pergunta). */
export function trainingLevel(search: string): TrainingLevel | null {
  const fromUrl = new URLSearchParams(search).get('nivel');
  return TRAINING_LEVELS.find((level) => level === fromUrl) ?? null;
}

/** `?vida=<n>` de um `location.search`, se for uma das vidas que a sala pode escolher (`HP_CHOICES`); senão, `null`. */
export function trainingHp(search: string): number | null {
  const fromUrl = Number(new URLSearchParams(search).get('vida'));
  return HP_CHOICES.includes(fromUrl) ? fromUrl : null;
}

export interface LocalRoomOptions {
  /** Semente da primeira partida; a revanche `n` usa `<semente>-<n>`. */
  seed: string;
  /** A vida inicial (sub-projeto 5, R3; padrão a do motor); a revanche a mantém. */
  hp?: number;
  /** O nível do bot (padrão `medio`); a revanche o mantém. */
  level?: TrainingLevel;
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

/** A semente da partida `gameNo` da sala: a 1ª usa a semente da sala, e a `n` usa `<semente>-<n>`. Abrir `?semente=<esta>` repete a partida. */
export function gameSeed(seed: string, gameNo: number): string {
  return gameNo === 1 ? seed : `${seed}-${gameNo}`;
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
  readonly #level: TrainingLevel;
  readonly #listeners = new Set<(e: ConnectionEvent) => void>();

  #room: RoomMessage | null = null;
  #state: StateMessage | null = null;
  #game: GameState;
  #botSeed: string;
  #botRng: Rng;
  /** A semente da partida em curso (`gameSeed`): nome e semente do replay. */
  #gameSeed = '';
  /** Toda ação aplicada na partida em curso, na ordem: é o que o replay do fim leva. Zera em `#newGame`. */
  #steps: ReplayStep[] = [];
  /** O timer do bot: o do "pensar" antes da decisão, ou o da próxima fatia da busca do Difícil. Um por vez. */
  #botTimer: unknown = null;
  /** A busca do Difícil em curso (a decisão ainda não saiu). `null` fora dela; quando não é `null`, há uma fatia agendada em `#botTimer`. */
  #search: Generator<void, Action> | null = null;
  #connected = false;
  #closed = false;
  #idCounter = 0;
  #seq = 0;
  /** Quantas jogadas o bot já aplicou na partida em curso (zera em `#newGame`): é a decisão `n` que o sorteio da busca do Difícil usa. */
  #botMoves = 0;
  #epoch = 0;
  #gameNo = 0;
  #score: Score = { p1: 0, p2: 0 };
  #outcome: Outcome | undefined;
  /** Quando a partida em curso começou (pelo `now` injetado): o painel de fim mostra a duração. */
  #startedAt = 0;

  constructor(options: LocalRoomOptions) {
    this.#options = options;
    this.#think = options.thinkMs ?? DEFAULT_THINK_MS;
    this.#level = options.level ?? 'medio';
    const { game, botSeed } = this.#newGame();
    this.#game = game;
    this.#botSeed = botSeed;
    this.#botRng = createRng(botSeed);
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
    this.#cancelBot();
    const { game, botSeed } = this.#newGame();
    this.#game = game;
    this.#botSeed = botSeed;
    this.#botRng = createRng(botSeed);
    this.#outcome = undefined;
    this.#publishStart();
  }

  close(): void {
    if (this.#closed) return;
    this.#closed = true;
    this.#cancelBot();
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
    const seq = this.#commit({ player: LOCAL_ME, action }, result.state, result.events);
    return Promise.resolve({ t: 'ack', id, ok: true, seq });
  }

  concede(): Promise<AckMessage> {
    const id = this.#nextId();
    const early = this.#earlyAck(id);
    if (early) return Promise.resolve(early);
    const action: Action = { type: 'FORFEIT', loser: LOCAL_ME };
    const result = applyAction(this.#game, 'system', action);
    if (!result.ok) {
      return Promise.resolve({ t: 'ack', id, ok: false, code: result.error.code, message: result.error.message });
    }
    const seq = this.#commit({ player: 'system', action }, result.state, result.events, 'CONCEDE');
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

  /** Estado novo, bot novo, replay novo: a semente da partida `n` é `<semente>` (a 1ª) ou `<semente>-<n>`. */
  #newGame(): { game: GameState; botSeed: string } {
    this.#gameNo += 1;
    this.#botMoves = 0;
    const seed = gameSeed(this.#options.seed, this.#gameNo);
    this.#gameSeed = seed;
    // Uma lista nova (e não `length = 0`): o replay já emitido da partida anterior guarda a lista dela.
    this.#steps = [];
    const created = createGame(makeConfig({ hp: this.#options.hp ?? DEFAULT_CONFIG.hp }), seed, [LOCAL_ME, BOT_SEAT]);
    if (!created.ok) throw new Error(`configuração inválida: ${created.error.message}`);
    return { game: created.state, botSeed: `${seed}/bot` };
  }

  /** Começo de partida (a primeira ou a revanche): `seq` e `epoch` só sobem, e o primeiro `state` vem sem eventos. */
  #publishStart(): void {
    this.#startedAt = this.#options.now();
    this.#seq += 1;
    this.#epoch += 1;
    this.#publishRoom('PLAYING');
    this.#publishState([]);
    this.#autoEquip();
    this.#scheduleBot();
  }

  /**
   * Grava o `step` no replay, aplica o estado novo, emite o `state` (e, no fim da partida, o `replay` e depois o `room`) e devolve o
   * `seq` do passo. Todo passo da partida passa por aqui: o do jogador, o do bot, o Equipar vazio automático e a desistência.
   */
  #commit(step: ReplayStep, next: GameState, events: GameEvent[], cause: 'CONCEDE' | 'NORMAL' = 'NORMAL'): number {
    // Um estado novo (a jogada do jogador no Equipar, por exemplo) invalida a busca do Difícil em curso: a jogada que ela
    // devolveria foi pensada sobre o estado velho. O timer do "pensar", que ainda não virou busca, fica como sempre ficou.
    if (this.#search !== null) this.#cancelBot();
    this.#steps.push(step);
    const keyBefore = phaseKey(this.#game);
    this.#game = next;
    this.#seq += 1;
    if (phaseKey(next) !== keyBefore) this.#epoch += 1;
    const seq = this.#seq;
    this.#publishState(events);
    if (next.phase.kind === 'GAME_OVER') {
      this.#cancelBot();
      const result = next.phase.result;
      this.#score[result.winner as 'p1' | 'p2'] += 1;
      this.#outcome = { gameNo: this.#gameNo, result, cause, durationMs: this.#options.now() - this.#startedAt };
      // O replay sai antes do `room` em FINISHED: quem vê a sala terminar já o tem, e o `gameNo` dele ainda é o da partida.
      this.#publishReplay();
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
    const action: Action = { type: 'EQUIP', destinations: [] };
    const result = applyAction(this.#game, LOCAL_ME, action);
    if (!result.ok) throw new Error(`o Equipar vazio foi recusado: ${result.error.code}`);
    this.#commit({ player: LOCAL_ME, action }, result.state, result.events);
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

  /** O replay da partida que acabou de terminar: semente, configuração e os passos na ordem em que o motor os aplicou. */
  #publishReplay(): void {
    const replay: ReplayMessage = {
      t: 'replay',
      gameNo: this.#gameNo,
      replay: {
        name: `treino-${this.#gameSeed}`,
        config: structuredClone(this.#game.config),
        seed: this.#gameSeed,
        players: [LOCAL_ME, BOT_SEAT],
        steps: [...this.#steps],
      },
    };
    this.#emit({ type: 'replay', replay });
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

  /**
   * O bot joga quando é a vez dele: depois de `thinkMs`, ou já (0 ms) numa janela de reação. Um timer por vez. O Difícil começa
   * a busca quando esse timer dispara e a continua em fatias (`#searchSlice`); na reação e na ordem do ataque não há busca, e a
   * decisão sai na primeira fatia.
   */
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
    const legal = legalActions(view);
    if (this.#level === 'dificil') {
      // O sorteio da busca é por DECISÃO do bot (`<semente>/bot/<n>`, `n` = quantas jogadas ele já aplicou na partida), e não do fluxo
      // do bot, do `seq` da sala (a revanche não o zera) nem do estado: no Equipar simultâneo o bot decide antes, no meio ou depois de o
      // jogador confirmar (e `seq` e estado mudam), e a decisão `n` é a mesma. Uma busca descartada por um estado novo recomeça com o
      // mesmo `n`. A partida 2 da revanche joga o mesmo que a sala nova aberta com `<semente>-2`. A busca (`determinize`) não vê se o
      // oponente já confirmou o Equipar, então o resultado só depende da semente e da decisão.
      this.#search = hardSearch(this.#game, BOT_SEAT, legal, createRng(`${this.#botSeed}/${this.#botMoves}`));
      this.#searchSlice();
      return;
    }
    this.#botMove(BOTS[this.#level === 'facil' ? 'easy' : 'greedy'](view, legal, this.#botRng));
  }

  /**
   * Uma fatia da busca do Difícil: avança o gerador até `SLICE_MS` (pelo `now` injetado) e, se não terminou, agenda a próxima
   * em outra tarefa (0 ms), para as batidas, os timers e a `FlashLock` não esperarem a decisão inteira. O gerador pode terminar
   * já no primeiro passo (um só lance legal; ordem e reação, sem busca). Só joga quando ele devolve a ação.
   */
  #searchSlice(): void {
    const search = this.#search;
    if (search === null) return;
    const end = this.#options.now() + SLICE_MS;
    let step: IteratorResult<void, Action>;
    try {
      step = search.next();
      while (!step.done && this.#options.now() < end) step = search.next();
    } catch (error) {
      // Uma busca que lança não fica pendurada na sala: solta-a (o próximo estado agenda o bot de novo) e deixa a exceção subir.
      this.#cancelBot();
      throw error;
    }
    if (step.done) {
      this.#search = null;
      this.#botMove(step.value);
      return;
    }
    this.#botTimer = this.#options.setTimer(() => {
      this.#botTimer = null;
      this.#searchSlice();
    }, 0);
  }

  #botMove(action: Action): void {
    const result = applyAction(this.#game, BOT_SEAT, action);
    if (!result.ok) throw new Error(`o bot jogou algo ilegal: ${result.error.code}`);
    this.#botMoves += 1;
    this.#commit({ player: BOT_SEAT, action }, result.state, result.events);
  }

  /** Solta o que o bot tem em andamento: o timer (do "pensar" ou de uma fatia) e a busca. A jogada velha nunca é aplicada. */
  #cancelBot(): void {
    this.#search = null;
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
