import { actingPlayers, applyAction, createGame, legalActions, nextInt, seedRng, viewFor } from '@coringa/engine';
import type { GameEvent, GameState } from '@coringa/engine';
import { PROTOCOL_VERSION } from '@coringa/protocol';
import type {
  AckCode,
  AckMessage,
  ClientMessage,
  CreateRoomResponse,
  JoinRoomResponse,
  PlayerAction,
  ServerMessage,
  StateMessage,
} from '@coringa/protocol';
import { BOTS } from '../../../sim/src/bots/index.ts';
import type { BotName } from '../../../sim/src/bots/index.ts';
import { createRng } from '../../../sim/src/rng.ts';
import { RoomCore } from '../../src/core/room-core.ts';
import { nextAlarm } from '../../src/core/agenda.ts';
import { splitRecord } from '../../src/core/storage-layout.ts';
import { schedulePhase } from '../../src/core/timing.ts';
import { TIMERS } from '../../src/core/timers.ts';
import type {
  CoreDeps,
  Effects,
  GameRecord,
  LogLine,
  RoomRecord,
  SeatId,
  SocketInfo,
} from '../../src/core/types.ts';

export const CODE = 'K7M2QX';

/** Socket de mentira: guarda o que o servidor mandou e como fechou. */
export interface FakeSocket {
  id: string;
  seat: SeatId | null;
  open: boolean;
  inbox: ServerMessage[];
  closed: { code: number; reason: string } | null;
  connectedAt: number;
  lastSeenAt: number;
  /** `silent()` congela o `lastSeenAt`: o socket segue aberto, mas sem sinal. */
  muted: boolean;
}

export interface Room {
  h: Harness;
  p1: FakeSocket;
  p2: FakeSocket;
  tokens: Record<SeatId, string>;
}

/** Núcleo + relógio falso + sockets falsos + efeitos acumulados. As próximas tarefas estendem esta classe. */
export class Harness {
  now = 1_000_000;
  core: RoomCore;
  logs: LogLine[] = [];
  alarm: number | null = null;
  deleted = false;
  persisted = 0;
  /** Quantas vezes o alarme desejado mudou: é o que a casca regrava com `setAlarm` (uma linha cada). */
  alarmChanges = 0;
  /** Liga a medição de `maxPartBytes` (custa um `JSON.stringify` do registro a cada gravação). */
  trackParts = false;
  /** Maior `JSON.stringify` entre as quatro partes gravadas, medido depois de cada entrada que grava. */
  maxPartBytes = 0;
  sent: Effects['send'] = [];
  closed: Effects['close'] = [];
  attached: Effects['attach'] = [];
  readonly fakes: FakeSocket[] = [];
  #nextSocket = 1;

  /** `gameSeed` fixa a semente de toda partida (padrão: `semente-1`, `semente-2`, …). */
  constructor(seed?: string, gameSeed?: string) {
    const deps = Harness.deps(seed);
    if (gameSeed !== undefined) deps.newSeed = () => gameSeed;
    this.core = new RoomCore(null, deps);
  }

  /** Dependências determinísticas: bytes do PRNG do motor e sementes `semente-1`, `semente-2`, … */
  static deps(seed = 'harness'): CoreDeps {
    const rng = seedRng(seed);
    let counter = 0;
    return {
      randomBytes: (n) => Uint8Array.from({ length: n }, () => nextInt(rng, 256)),
      newSeed: () => {
        counter += 1;
        return `semente-${counter}`;
      },
    };
  }

  /** Os sockets abertos, como o Durable Object os entregaria ao núcleo. */
  get sockets(): SocketInfo[] {
    return this.fakes
      .filter((fake) => fake.open)
      .map((fake) => ({ socketId: fake.id, seat: fake.seat, connectedAt: fake.connectedAt, lastSeenAt: fake.lastSeenAt }));
  }

  /** Entrega os efeitos como a casca faria: mensagens, attach e, por último, os fechamentos (com o `onClose` que o runtime dispara depois). */
  apply(e: Effects): void {
    this.logs.push(...e.logs);
    if (e.alarm !== this.alarm) this.alarmChanges += 1;
    this.alarm = e.alarm;
    if (e.deleteAll) this.deleted = true;
    if (e.persist) {
      this.persisted += 1;
      // Só uma entrada que grava pode aumentar uma parte: sem `persist` a casca não escreve nada.
      if (this.trackParts) this.#measureParts();
    }
    this.sent.push(...e.send);
    this.closed.push(...e.close);
    this.attached.push(...e.attach);
    for (const { socketId, message } of e.send) {
      const fake = this.fakes.find((candidate) => candidate.id === socketId);
      if (fake?.open) fake.inbox.push(message);
    }
    for (const { socketId, seat } of e.attach) {
      const fake = this.fakes.find((candidate) => candidate.id === socketId);
      if (fake) fake.seat = seat;
    }
    for (const { socketId, code, reason } of e.close) {
      const fake = this.fakes.find((candidate) => candidate.id === socketId);
      if (!fake?.open) continue;
      fake.open = false;
      fake.closed = { code, reason };
      this.apply(this.core.onClose(socketId, this.sockets, this.now));
    }
  }

  async create(nickname = 'Ana'): Promise<CreateRoomResponse> {
    const r = await this.core.create(CODE, nickname, this.now);
    this.apply(r.effects);
    if (!r.ok) throw new Error(`create falhou: ${r.error}`);
    return r.value;
  }

  async join(nickname = 'Bia'): Promise<JoinRoomResponse> {
    const r = await this.core.join(nickname, this.sockets, this.now);
    this.apply(r.effects);
    if (!r.ok) throw new Error(`join falhou: ${r.error}`);
    return r.value;
  }

  /** Abre um socket novo (ainda sem `hello`). */
  open(): FakeSocket {
    const fake: FakeSocket = {
      id: `socket-${this.#nextSocket++}`,
      seat: null,
      open: true,
      inbox: [],
      closed: null,
      connectedAt: this.now,
      lastSeenAt: this.now,
      muted: false,
    };
    this.fakes.push(fake);
    const info: SocketInfo = { socketId: fake.id, seat: null, connectedAt: fake.connectedAt, lastSeenAt: fake.lastSeenAt };
    this.apply(this.core.onOpen(info, this.sockets, this.now));
    return fake;
  }

  /** Manda uma mensagem do socket; objetos viram JSON. Um socket mudo não renova o sinal. */
  async send(sock: FakeSocket, msg: ClientMessage | string | ArrayBuffer): Promise<void> {
    const raw = typeof msg === 'string' || msg instanceof ArrayBuffer ? msg : JSON.stringify(msg);
    if (!sock.muted) sock.lastSeenAt = this.now;
    this.apply(await this.core.onMessage(sock.id, raw, this.sockets, this.now));
  }

  /** O cliente fecha a conexão. */
  close(sock: FakeSocket): void {
    sock.open = false;
    this.apply(this.core.onClose(sock.id, this.sockets, this.now));
  }

  /** O socket segue aberto, mas o sinal dele para de ser renovado. */
  silent(sock: FakeSocket): void {
    sock.muted = true;
  }

  /** Mensagens recebidas pelo socket, de um tipo ou de todos. */
  messages<T extends ServerMessage['t']>(sock: FakeSocket, t: T): Extract<ServerMessage, { t: T }>[];
  messages(sock: FakeSocket): ServerMessage[];
  messages(sock: FakeSocket, t?: ServerMessage['t']): ServerMessage[] {
    return t === undefined ? sock.inbox : sock.inbox.filter((message) => message.t === t);
  }

  hello(token: string): ClientMessage {
    return { t: 'hello', protocol: PROTOCOL_VERSION, token };
  }

  /** Sala com os dois assentos ocupados e os dois sockets autenticados. */
  static async lobby(seed?: string, gameSeed?: string): Promise<Room> {
    const h = new Harness(seed, gameSeed);
    const ana = await h.create('Ana');
    const bia = await h.join('Bia');
    const p1 = h.open();
    await h.send(p1, h.hello(ana.token));
    const p2 = h.open();
    await h.send(p2, h.hello(bia.token));
    return { h, p1, p2, tokens: { p1: ana.token, p2: bia.token } };
  }

  /** O lobby com os dois prontos: a partida já começou. */
  static async playing(seed?: string, gameSeed?: string): Promise<Room> {
    const room = await Harness.lobby(seed, gameSeed);
    await room.h.send(room.p1, { t: 'ready', ready: true });
    await room.h.send(room.p2, { t: 'ready', ready: true });
    return room;
  }

  /**
   * Sala já em PLAYING com o estado dado, os dois sockets autenticados e o registro coerente
   * (`seq: 1`, `epoch: 1`, `recent: [{ seq: 1, events: [] }]`). Parte do lobby real para ter tokens e hashes de verdade.
   */
  static async fromState(state: GameState, seed?: string): Promise<Room> {
    const room = await Harness.lobby(seed);
    const record = room.h.core.record!;
    record.status = 'PLAYING';
    record.gameNo = 1;
    record.seq = 1;
    record.epoch = 1;
    record.game = {
      gameNo: 1,
      seed: 'semente-fixa',
      state,
      startedAt: room.h.now,
      steps: [],
      recent: [{ seq: 1, events: [] }],
      phaseStartedAt: room.h.now,
      phaseDeadlineAt: null,
      pausedTurnMs: null,
      heldPass: null,
      strikes: { p1: 0, p2: 0 },
      acks: { p1: [], p2: [] },
      cause: null,
    };
    return room;
  }

  /**
   * Arma o prazo da fase do estado montado por `fromState` (que nasce sem prazo): como se a fase tivesse
   * acabado de começar agora. Atualiza `h.alarm` com o da agenda.
   */
  arm(): void {
    const record = this.core.record!;
    const game = record.game!;
    schedulePhase(record, { key: '', phase: game.state.phase, deadlineAt: null }, [], this.now);
    this.alarm = nextAlarm(record.agenda);
  }

  /**
   * Avança o relógio em `ms`. Enquanto o alarme está vencido (`alarm <= alvo`), o relógio vai até o instante dele
   * e chama `onAlarm` ali, para que prazos encadeados disparem na ordem certa. Os sockets abertos e não mudos
   * seguem dando sinal. Um alarme que não anda depois de tratado (item de outra tarefa, ainda sem tratamento) falha alto.
   */
  advance(ms: number): void {
    const target = this.now + ms;
    for (let guard = 0; this.alarm !== null && this.alarm <= target; guard += 1) {
      if (guard > 10_000) throw new Error('o alarme não anda: item vencido que ninguém trata');
      const at = this.alarm;
      this.now = Math.max(this.now, at);
      for (const fake of this.fakes) if (fake.open && !fake.muted) fake.lastSeenAt = this.now;
      const before = JSON.stringify(this.core.record?.agenda);
      this.apply(this.core.onAlarm(this.sockets, this.now));
      if (this.alarm !== null && this.alarm <= at && JSON.stringify(this.core.record?.agenda) === before) {
        throw new Error(`o alarme em ${at} não foi tratado`);
      }
    }
    this.now = target;
    for (const fake of this.fakes) if (fake.open && !fake.muted) fake.lastSeenAt = this.now;
  }

  #measureParts(): void {
    const record = this.core.record;
    if (!record) return;
    for (const part of Object.values(splitRecord(record))) {
      this.maxPartBytes = Math.max(this.maxPartBytes, Buffer.byteLength(JSON.stringify(part)));
    }
  }

  /** Uma partida completa entre dois clientes simulados (bots do simulador) pelo núcleo, com JSON de verdade. */
  static simulateMatch(options: SimulateOptions): Promise<MatchTrace> {
    return simulate(options);
  }

  /** Eventos (sem redação) do último passo guardado no anel. */
  lastStepEvents(): GameEvent[] {
    return this.core.record!.game!.recent.at(-1)!.events;
  }

  /**
   * Manda a primeira ação legal de quem age até a sala chegar a FINISHED (no máximo 5 000 passos).
   * O relógio anda 200 ms por jogada (o balde da conexão repõe 10 fichas por segundo) e os dois
   * sockets seguem com sinal.
   */
  async playToEnd(): Promise<void> {
    for (let i = 0; i < 5_000; i += 1) {
      const record = this.core.record!;
      if (record.status === 'FINISHED') return;
      const state = record.game!.state;
      const seat = actingPlayers(state)[0] as SeatId;
      const action = legalActions(viewFor(state, seat))[0];
      if (!action) throw new Error(`sem ação legal para ${seat}`);
      const sock = this.fakes.find((fake) => fake.open && fake.seat === seat)!;
      this.now += state.phase.kind === 'REACTION' ? 200 + TIMERS.reactionMinMs : 200; // o PASS só vale depois do piso da janela
      for (const fake of this.fakes) if (fake.open && !fake.muted) fake.lastSeenAt = this.now;
      const before = record.seq;
      await this.send(sock, { t: 'act', id: `auto-${i}`, epoch: record.epoch, action: action as PlayerAction });
      if (record.seq === before && record.status === 'PLAYING') throw new Error(`jogada recusada: ${JSON.stringify(sock.inbox.at(-1))}`);
    }
    throw new Error('a partida não terminou em 5 000 passos');
  }
}

/** Uma jogada de teste que cita um id escondido de quem joga e a mesma jogada com um id inexistente. */
export interface OracleProbe {
  action: PlayerAction['type'];
  /** Onde o id escondido foi posto: `cardId`, `targetId`, `kId`... */
  slot: string;
  hiddenIn: 'hand' | 'pending' | 'deck';
  hiddenCode: AckCode | 'OK';
  missingCode: AckCode | 'OK';
}

export interface SimulateOptions {
  /** Fixa a semente da partida e as escolhas dos bots. */
  seed: string;
  bots: [BotName, BotName];
  chaos?: {
    /** A cada N passos do jogo, um dos sockets cai e volta com `lastSeq` 5 s depois. */
    dropEvery?: number;
    /** A cada N jogadas, reenvia uma jogada com época velha (tem que dar `STALE_EPOCH`). */
    staleEvery?: number;
    /** A cada N jogadas, reenvia a última com o mesmo `id` (tem que dar o mesmo `ack`). */
    duplicateEvery?: number;
    /** A cada N decisões o cliente não joga e o prazo da fase estoura (`TIMEOUT` do servidor). */
    idleEvery?: number;
  };
  /** Teto de passos do jogo; passar dele é falha da simulação. */
  maxSteps?: number;
  /** Quanto o relógio anda antes de cada jogada (o balde da conexão repõe 10 fichas por segundo). */
  thinkMs?: number;
  /** A cada N decisões, antes de jogar, manda jogadas que citam ids escondidos e compara os códigos de erro. */
  probeEvery?: number;
}

export interface MatchTrace {
  /** O que cada assento recebeu, depois de `JSON.parse(JSON.stringify(...))`. */
  outbox: Map<SeatId, ServerMessage[]>;
  /** O `seq` da largada (o estado inicial, sem eventos). */
  startSeq: number;
  finalRecord: RoomRecord;
  ended: 'GAME_OVER' | 'ABANDONED';
  maxPartBytes: number;
  persists: number;
  alarmChanges: number;
  logs: LogLine[];
  /** Quantas vezes cada perturbação aconteceu (para o teste conferir que ela rodou). */
  chaos: { drops: number; stale: number; duplicates: number; idles: number };
  oracle: OracleProbe[];
  /** Tudo o que o núcleo mandou a qualquer socket, inclusive os que já tinham fechado (`h.sent`). */
  wire: ServerMessage[];
}

/**
 * Reexecuta no motor, do zero, o registro da partida: `createGame(config, semente)` e um `applyAction` por passo. O
 * estado da largada fica em `startSeq`; o passo `startSeq + k` (k >= 1) é o `k`-ésimo `applyAction`. Não usa nada do
 * que o núcleo calculou além da semente e da lista de passos, e um passo recusado pelo motor lança.
 */
export function replaySteps(game: GameRecord, startSeq: number): Map<number, { state: GameState; events: GameEvent[] }> {
  const created = createGame(game.state.config, game.seed, ['p1', 'p2']);
  if (!created.ok) throw new Error(`createGame recusou o registro: ${created.error.message}`);
  const steps = new Map<number, { state: GameState; events: GameEvent[] }>();
  let state = created.state;
  steps.set(startSeq, { state, events: [] });
  game.steps.forEach((step, i) => {
    const result = applyAction(state, step.player, step.action);
    if (!result.ok) throw new Error(`o motor recusou o passo ${i + 1} do registro: ${step.action.type} (${result.error.code})`);
    state = result.state;
    steps.set(startSeq + i + 1, { state, events: result.events });
  });
  return steps;
}

interface SimClient {
  seat: SeatId;
  bot: BotName;
  rng: ReturnType<typeof createRng>;
  token: string;
  sock: FakeSocket;
  outbox: ServerMessage[];
  latest: StateMessage | null;
  /** O `seq` do último `state` sobre o qual o cliente já decidiu (jogou ou deixou passar). */
  decidedSeq: number;
  /** Instante em que o socket volta, enquanto estiver caído. */
  reconnectAt: number | null;
  acks: Map<string, AckMessage>;
  nextId: number;
}

const MISSING = 'nao-existe';
const DROP_MS = 5_000;

async function simulate(options: SimulateOptions): Promise<MatchTrace> {
  const { seed, bots, chaos = {}, maxSteps = 2_000, thinkMs = 300, probeEvery } = options;
  const room = await Harness.lobby(seed, seed);
  const h = room.h;
  h.trackParts = true;
  const counts = { drops: 0, stale: 0, duplicates: 0, idles: 0 };
  const oracle: OracleProbe[] = [];
  const probeRng = createRng(`${seed}-sonda`);

  const clients: SimClient[] = (['p1', 'p2'] as const).map((seat, i) => ({
    seat,
    bot: bots[i]!,
    rng: createRng(`${seed}-${seat}`),
    token: room.tokens[seat],
    sock: seat === 'p1' ? room.p1 : room.p2,
    outbox: [],
    latest: null,
    decidedSeq: -1,
    reconnectAt: null,
    acks: new Map(),
    nextId: 1,
  }));

  const fail = (why: string): never => {
    throw new Error(`simulação ${seed}: ${why}`);
  };
  const record = (): RoomRecord => h.core.record ?? fail('a sala sumiu');

  /** O que sai do núcleo passa por JSON de verdade antes de chegar ao cliente. */
  const drainAll = (): void => {
    for (const c of clients) {
      for (const raw of c.sock.inbox.splice(0)) {
        const message = JSON.parse(JSON.stringify(raw)) as ServerMessage;
        c.outbox.push(message);
        if (message.t === 'state') c.latest = message;
        if (message.t === 'ack') c.acks.set(message.id, message);
      }
    }
  };
  const send = async (c: SimClient, message: ClientMessage): Promise<void> => {
    await h.send(c.sock, message);
    drainAll();
  };
  const ackOf = (c: SimClient, id: string): AckMessage => c.acks.get(id) ?? fail(`sem ack para ${id}`);
  const codeOf = (ack: AckMessage): AckCode | 'OK' => (ack.ok ? 'OK' : ack.code);

  await h.send(room.p1, { t: 'ready', ready: true });
  await h.send(room.p2, { t: 'ready', ready: true });
  drainAll();
  const startSeq = record().seq - (record().game?.steps.length ?? fail('a partida não começou'));
  const stepsDone = (): number => record().seq - startSeq;

  /**
   * Jogadas com id escondido de X contra o mesmo formato com um id inexistente (spec §8.4). Os modelos dependem da
   * fase e das cartas de X, para a jogada chegar à checagem do id e não morrer antes (fase errada, carta própria
   * de tipo errado, limite de J/Q, Defesa Absoluta): só entram os que a precondição permite neste momento.
   */
  const probe = async (c: SimClient): Promise<void> => {
    const state = record().game!.state;
    const phase = state.phase;
    const me = state.players.find((player) => player.id === c.seat)!;
    const opponent = state.players.find((player) => player.id !== c.seat)!;
    const hidden: Array<{ in: OracleProbe['hiddenIn']; id: string }> = [];
    if (opponent.hand[0]) hidden.push({ in: 'hand', id: opponent.hand[0].id });
    if (opponent.pending[0]) hidden.push({ in: 'pending', id: opponent.pending[0].id });
    if (state.deck.length > 0) hidden.push({ in: 'deck', id: state.deck[probeRng.int(state.deck.length)]!.id });
    if (hidden.length === 0) return;

    const main = phase.kind === 'ATTACK_MAIN' && phase.player === c.seat;
    const reaction = phase.kind === 'REACTION' && phase.responder === c.seat;
    const own = (...kinds: string[]): string | undefined => me.hand.find((card) => kinds.includes(card.kind))?.id;
    const limit = state.config.buffLimit;
    const open = !opponent.absoluteDefense;
    const opponentBuff = opponent.attackBuffs[0] ?? opponent.defenseBuffs[0];
    const trapTarget = opponent.attackBuffs[0] ?? opponent.defenseBuffs[0] ?? opponent.guard[0];
    const ace = own('A', 'WILD');
    const buff = own('J', 'Q', 'WILD');
    const row = me.attackRow.length < state.config.rowLimit ? 'ATK' : 'DEF';

    type Template = { slot: string; build: (id: string) => PlayerAction };
    const templates: Template[] = [];
    if (main && me.attackBuffs.length < limit) templates.push({ slot: 'cardId', build: (id) => ({ type: 'PLAY_J', cardId: id }) });
    if (main && me.defenseBuffs.length < limit) templates.push({ slot: 'cardId', build: (id) => ({ type: 'PLAY_Q', cardId: id }) });
    if (main) templates.push({ slot: 'cardIds', build: (id) => ({ type: 'PLAY_K', cardIds: [id] }) });
    // O Ás da reação não responde a um Reflect; contra K só mira K (o alvo escondido continua inválido).
    const trapPhase = (main || (reaction && phase.kind === 'REACTION' && phase.trigger !== 'REFLECT_PLAYED')) && open;
    if (trapPhase && trapTarget) templates.push({ slot: 'cardId', build: (id) => ({ type: 'TRAP', cardId: id, targetId: trapTarget.id }) });
    if (trapPhase && ace) templates.push({ slot: 'targetId', build: (id) => ({ type: 'TRAP', cardId: ace, targetId: id }) });
    if (main && open && opponentBuff && buff) {
      templates.push({ slot: 'cardId', build: (id) => ({ type: 'SACRIFICE', cardId: id, targetId: opponentBuff.id }) });
    }
    if (main && open && buff) templates.push({ slot: 'targetId', build: (id) => ({ type: 'SACRIFICE', cardId: buff, targetId: id }) });
    if (main && c.latest!.view.self.resurrections.length > 0 && me[row === 'ATK' ? 'attackRow' : 'defenseRow'].length < state.config.rowLimit) {
      templates.push({ slot: 'cardId', build: (id) => ({ type: 'RESURRECT', cardId: id, row }) });
    }
    if (main && !me.reflect) {
      templates.push({ slot: 'kId', build: (id) => ({ type: 'REFLECT', kId: id, jId: 'nao-existe-j', qId: 'nao-existe-q' }) });
    }
    const king = own('K');
    if (main && !me.reflect && king) {
      templates.push({ slot: 'jId', build: (id) => ({ type: 'REFLECT', kId: king, jId: id, qId: 'nao-existe-q' }) });
    }
    if (!main && !reaction) {
      // Fora da vez de X (Equipar, por exemplo) toda jogada de cartas é fora de fase: é o único lugar onde existem
      // pendentes do oponente, e a resposta tem que ser a mesma para o id escondido e o inexistente.
      templates.push(
        { slot: 'cardId', build: (id) => ({ type: 'PLAY_J', cardId: id }) },
        { slot: 'cardId', build: (id) => ({ type: 'TRAP', cardId: id, targetId: MISSING }) },
        { slot: 'targetId', build: (id) => ({ type: 'SACRIFICE', cardId: MISSING, targetId: id }) },
        { slot: 'cardId', build: (id) => ({ type: 'RESURRECT', cardId: id, row: 'ATK' }) },
      );
    }
    if (templates.length === 0) return;

    const seqBefore = record().seq;
    for (let round = 0; round < 4; round += 1) {
      const template = probeRng.pick(templates);
      const target = probeRng.pick(hidden);
      const epoch = c.latest!.epoch;
      const hiddenId = `${c.seat}-sonda-${c.nextId++}`;
      const missingId = `${c.seat}-sonda-${c.nextId++}`;
      await send(c, { t: 'act', id: hiddenId, epoch, action: template.build(target.id) });
      await send(c, { t: 'act', id: missingId, epoch, action: template.build(MISSING) });
      oracle.push({
        action: template.build(MISSING).type,
        slot: template.slot,
        hiddenIn: target.in,
        hiddenCode: codeOf(ackOf(c, hiddenId)),
        missingCode: codeOf(ackOf(c, missingId)),
      });
    }
    if (record().seq !== seqBefore) fail('uma jogada com id escondido ou inexistente mudou o jogo');
  };

  const reconnect = async (c: SimClient): Promise<void> => {
    c.reconnectAt = null;
    c.sock = h.open();
    const message: ClientMessage = { t: 'hello', protocol: PROTOCOL_VERSION, token: c.token };
    if (c.latest) message.lastSeq = c.latest.seq;
    await send(c, message);
  };

  let decisions = 0;
  let acts = 0;
  let nextDrop = chaos.dropEvery ?? Infinity;
  for (let turn = 0; ; turn += 1) {
    if (turn > maxSteps * 20) fail('a partida não terminou: o laço girou demais');
    if (stepsDone() > maxSteps) fail(`a partida passou de ${maxSteps} passos`);
    drainAll();
    if (record().status !== 'PLAYING') break;

    for (const c of clients) if (c.reconnectAt !== null && c.reconnectAt <= h.now) await reconnect(c);
    if (stepsDone() >= nextDrop && clients.every((c) => c.reconnectAt === null)) {
      const dropped = clients[counts.drops % clients.length]!;
      nextDrop += chaos.dropEvery!;
      counts.drops += 1;
      drainAll();
      h.close(dropped.sock);
      dropped.reconnectAt = h.now + DROP_MS;
      continue;
    }

    const able = clients.filter(
      (c) =>
        c.reconnectAt === null &&
        c.latest !== null &&
        c.latest.seq > c.decidedSeq &&
        legalActions(c.latest.view).length > 0,
    );
    const c = able[0];
    if (!c) {
      // Ninguém age: o relógio vai até o próximo alarme ou até a volta de quem caiu.
      const wake = [h.alarm, ...clients.map((other) => other.reconnectAt)].filter((at): at is number => at !== null);
      if (wake.length === 0) fail('ninguém age e não há alarme');
      h.advance(Math.max(0, Math.min(...wake) - h.now));
      continue;
    }

    // O bot pensa um pouco; se o jogo andou nesse tempo (um prazo estourou), reavalia.
    const seqBefore = record().seq;
    h.advance(thinkMs);
    drainAll();
    if (record().seq !== seqBefore || record().status !== 'PLAYING') continue;

    decisions += 1;
    const view = c.latest!.view;
    c.decidedSeq = c.latest!.seq;
    if (chaos.idleEvery && decisions % chaos.idleEvery === 0) {
      counts.idles += 1;
      continue;
    }
    if (probeEvery && decisions % probeEvery === 0) await probe(c);

    const action = BOTS[c.bot](view, legalActions(view), c.rng) as PlayerAction;
    const act: ClientMessage = { t: 'act', id: `${c.seat}-${c.nextId++}`, epoch: c.latest!.epoch, action };
    await send(c, act);
    const ack = ackOf(c, act.id);
    if (!ack.ok) fail(`o núcleo recusou ${action.type} de ${c.seat}: ${ack.code} (${ack.message})`);
    acts += 1;

    if (chaos.duplicateEvery && acts % chaos.duplicateEvery === 0) {
      const seq = record().seq;
      await send(c, act);
      const again = ackOf(c, act.id);
      if (JSON.stringify(again) !== JSON.stringify(ack)) fail(`id repetido deu outro ack: ${JSON.stringify(again)}`);
      if (record().seq !== seq) fail('id repetido mudou o jogo');
      counts.duplicates += 1;
    }
    if (chaos.staleEvery && acts % chaos.staleEvery === 0 && record().status === 'PLAYING') {
      const seq = record().seq;
      const id = `${c.seat}-${c.nextId++}`;
      await send(c, { t: 'act', id, epoch: record().epoch - 1, action });
      const late = ackOf(c, id);
      if (late.ok || late.code !== 'STALE_EPOCH') fail(`época velha não deu STALE_EPOCH: ${JSON.stringify(late)}`);
      if (record().seq !== seq) fail('época velha mudou o jogo');
      counts.stale += 1;
    }
  }
  drainAll();

  const final = structuredClone(record());
  return {
    outbox: new Map(clients.map((c) => [c.seat, c.outbox])),
    startSeq,
    finalRecord: final,
    ended: final.outcome?.cause === 'ABANDONED' ? 'ABANDONED' : 'GAME_OVER',
    maxPartBytes: h.maxPartBytes,
    persists: h.persisted,
    alarmChanges: h.alarmChanges,
    logs: h.logs,
    chaos: counts,
    oracle,
    wire: h.sent.map((entry) => entry.message),
  };
}
