import { nextInt, seedRng } from '@coringa/engine';
import { PROTOCOL_VERSION } from '@coringa/protocol';
import type { ClientMessage, CreateRoomResponse, JoinRoomResponse, ServerMessage } from '@coringa/protocol';
import { RoomCore } from '../../src/core/room-core.ts';
import type { CoreDeps, Effects, LogLine, SeatId, SocketInfo } from '../../src/core/types.ts';

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
  sent: Effects['send'] = [];
  closed: Effects['close'] = [];
  attached: Effects['attach'] = [];
  readonly fakes: FakeSocket[] = [];
  #nextSocket = 1;

  constructor(seed?: string) {
    this.core = new RoomCore(null, Harness.deps(seed));
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
    this.alarm = e.alarm;
    if (e.deleteAll) this.deleted = true;
    if (e.persist) this.persisted += 1;
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
  static async lobby(seed?: string): Promise<Room> {
    const h = new Harness(seed);
    const ana = await h.create('Ana');
    const bia = await h.join('Bia');
    const p1 = h.open();
    await h.send(p1, h.hello(ana.token));
    const p2 = h.open();
    await h.send(p2, h.hello(bia.token));
    return { h, p1, p2, tokens: { p1: ana.token, p2: bia.token } };
  }

  /** O lobby com os dois prontos: a partida já começou. */
  static async playing(seed?: string): Promise<Room> {
    const room = await Harness.lobby(seed);
    await room.h.send(room.p1, { t: 'ready', ready: true });
    await room.h.send(room.p2, { t: 'ready', ready: true });
    return room;
  }
}
