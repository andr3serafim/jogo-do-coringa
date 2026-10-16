import { CLOSE, LIMITS, PROTOCOL_VERSION, normalizeNickname } from '@coringa/protocol';
import type {
  ClientMessage,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomInfoResponse,
  ServerMessage,
} from '@coringa/protocol';
import { parseClientMessage } from '@coringa/protocol/schemas';
import { nextAlarm } from './agenda.ts';
import { emptyEffects } from './effects.ts';
import { startGame } from './game.ts';
import { TokenBucket } from './limiter.ts';
import { ROOM_LIMITS, STATE_SCHEMA, TIMERS } from './timers.ts';
import { base64url, sha256Hex } from './tokens.ts';
import type { CoreDeps, CoreResult, Effects, RoomRecord, SeatId, SeatRecord, SocketInfo } from './types.ts';
import { roomMessage, stateFor } from './views.ts';

const SEAT_IDS: readonly SeatId[] = ['p1', 'p2'];

/** Estado de uma conexão que só existe em memória: se o objeto hibernar, recomeça cheio (spec §8.2). */
interface Connection {
  bucket: TokenBucket;
  drops: number;
  malformed: number;
}

function ackFail(id: string, code: 'RATE_LIMITED' | 'NOT_PLAYING' | 'BAD_MESSAGE', message: string): ServerMessage {
  return { t: 'ack', id, ok: false, code, message };
}

/** `id` de um `act`/`concede`, lido sem validar o resto, para responder o descarte com `ack` em vez de `error`. */
function peekMessageId(raw: string): string | null {
  try {
    const value: unknown = JSON.parse(raw);
    if (typeof value !== 'object' || value === null) return null;
    const { t, id } = value as { t?: unknown; id?: unknown };
    const hasId = t === 'act' || t === 'concede';
    return hasId && typeof id === 'string' && id.length >= 1 && id.length <= LIMITS.idLength ? id : null;
  } catch {
    return null;
  }
}

/**
 * Núcleo da sala: recebe entradas com `now` e devolve `Effects`. Não lê relógio, não sorteia e não
 * conhece a Cloudflare. As entradas assíncronas (`create`, `join`) gastam o `await` do SHA-256 ANTES de
 * ler o registro; depois disso, leem `seats`, escolhem o assento e gravam sem nenhum `await` no meio.
 * O Durable Object entrega outros eventos enquanto o `crypto.subtle` roda: lendo antes do `await`, dois
 * cliques em "Entrar" ocupariam o mesmo assento.
 */
export class RoomCore {
  #record: RoomRecord | null;
  readonly #deps: CoreDeps;
  readonly #connections = new Map<string, Connection>();

  constructor(record: RoomRecord | null, deps: CoreDeps) {
    this.#record = record;
    this.#deps = deps;
  }

  get record(): RoomRecord | null {
    return this.#record;
  }

  /** Efeitos vazios com o alarme desejado do estado atual. */
  #effects(): Effects {
    const effects = emptyEffects();
    effects.alarm = this.#record ? nextAlarm(this.#record.agenda) : null;
    return effects;
  }

  #fail<E extends string>(error: E): CoreResult<never, E> {
    return { ok: false, error, effects: this.#effects() };
  }

  /** Gera o token e o hash dele. Tudo que é assíncrono acontece aqui, antes de tocar no registro. */
  async #newToken(): Promise<{ token: string; tokenHash: string }> {
    const token = base64url(this.#deps.randomBytes(32));
    return { token, tokenHash: await sha256Hex(token) };
  }

  async create(
    code: string,
    nickname: string,
    now: number,
  ): Promise<CoreResult<CreateRoomResponse, 'EXISTS' | 'BAD_NICKNAME'>> {
    const clean = normalizeNickname(nickname);
    if (clean === null) return this.#fail('BAD_NICKNAME');
    const { token, tokenHash } = await this.#newToken();

    // Sem `await` daqui até o fim: leitura e gravação do registro são atômicas.
    if (this.#record) return this.#fail('EXISTS');
    const seat: SeatRecord = {
      id: 'p1',
      nickname: clean,
      tokenHash,
      ready: false,
      wantsRematch: false,
      offlineSince: now,
    };
    this.#record = {
      schema: STATE_SCHEMA,
      code,
      createdAt: now,
      status: 'LOBBY',
      seats: [seat],
      score: { p1: 0, p2: 0, draws: 0 },
      gameNo: 0,
      outcome: null,
      seq: 0,
      epoch: 0,
      game: null,
      agenda: [
        { kind: 'idleExpiry', at: now + TIMERS.idleExpiryMs },
        { kind: 'hardExpiry', at: now + TIMERS.hardExpiryMs },
      ],
    };
    const effects = this.#effects();
    effects.persist = true;
    effects.logs.push({ evt: 'room.created', code, playerId: 'p1' });
    return { ok: true, value: { code, token, playerId: 'p1' }, effects };
  }

  async join(
    nickname: string,
    sockets: SocketInfo[],
    now: number,
  ): Promise<CoreResult<JoinRoomResponse, 'NOT_FOUND' | 'FULL' | 'BAD_NICKNAME'>> {
    const clean = normalizeNickname(nickname);
    if (clean === null) return this.#fail('BAD_NICKNAME');
    const { token, tokenHash } = await this.#newToken();

    // Sem `await` daqui até o fim: leitura dos assentos e gravação são atômicas.
    const record = this.#record;
    if (!record) return this.#fail('NOT_FOUND');
    const free = SEAT_IDS.find((id) => !record.seats.some((seat) => seat.id === id));
    if (!free) return this.#fail('FULL');
    const seat: SeatRecord = {
      id: free,
      nickname: clean,
      tokenHash,
      ready: false,
      wantsRematch: false,
      offlineSince: now,
    };
    record.seats = [...record.seats, seat].sort((a, b) => a.id.localeCompare(b.id));
    const effects = this.#effects();
    effects.persist = true;
    effects.logs.push({ evt: 'room.joined', code: record.code, playerId: free });
    const message = roomMessage(record, sockets, now);
    for (const socket of sockets) {
      if (socket.seat !== null) effects.send.push({ socketId: socket.socketId, message });
    }
    return { ok: true, value: { token, playerId: free }, effects };
  }

  #connection(socketId: string, now: number): Connection {
    let connection = this.#connections.get(socketId);
    if (!connection) {
      connection = {
        bucket: new TokenBucket(ROOM_LIMITS.bucketCapacity, ROOM_LIMITS.bucketRefillPerSec, now),
        drops: 0,
        malformed: 0,
      };
      this.#connections.set(socketId, connection);
    }
    return connection;
  }

  /** `sockets` traz todos os sockets abertos, com ou sem o novo: ele é contado uma vez só. */
  onOpen(socket: SocketInfo, sockets: SocketInfo[], now: number): Effects {
    const effects = this.#effects();
    const close = (code: number, reason: string): Effects => {
      effects.close.push({ socketId: socket.socketId, code, reason });
      return effects;
    };
    if (!this.#record) return close(CLOSE.ROOM_GONE, 'sala inexistente');
    const others = sockets.filter((other) => other.socketId !== socket.socketId);
    const unauthenticated = others.filter((other) => other.seat === null).length;
    if (others.length + 1 > ROOM_LIMITS.sockets || unauthenticated + 1 > ROOM_LIMITS.unauthSockets) {
      return close(CLOSE.LIMITED, 'conexões demais na sala');
    }
    this.#connection(socket.socketId, now);
    return effects;
  }

  /**
   * `sockets` traz os sockets abertos; o que fechou pode ou não estar nela. A presença sai dos assentos
   * sem socket autenticado, então a aba derrubada com 4009 (o assento já tem a aba nova) não conta como queda.
   * A presença completa em PLAYING vem na Tarefa 8; aqui só marca `offlineSince` e desmarca o pronto no lobby.
   */
  onClose(socketId: string, sockets: SocketInfo[], now: number): Effects {
    this.#connections.delete(socketId);
    const effects = this.#effects();
    const record = this.#record;
    if (!record) return effects;
    const live = sockets.filter((socket) => socket.socketId !== socketId);
    let changed = false;
    for (const seat of record.seats) {
      if (seat.offlineSince !== null || live.some((socket) => socket.seat === seat.id)) continue;
      seat.offlineSince = now;
      if (record.status === 'LOBBY') seat.ready = false;
      changed = true;
    }
    if (changed) {
      effects.persist = true;
      this.#sendRoom(effects, record, live, now);
    }
    return effects;
  }

  /**
   * Ordem: sala, frame (binário, tamanho), limite por conexão, autenticação, esquema, despacho. O único `await`
   * é o SHA-256 do token do `hello`, antes de ler ou mudar o registro (spec §9.1). `sockets` inclui quem enviou.
   */
  async onMessage(socketId: string, raw: string | ArrayBuffer, sockets: SocketInfo[], now: number): Promise<Effects> {
    const effects = emptyEffects();
    await this.#handle(effects, socketId, raw, sockets, now);
    effects.alarm = this.#record ? nextAlarm(this.#record.agenda) : null;
    return effects;
  }

  async #handle(
    effects: Effects,
    socketId: string,
    raw: string | ArrayBuffer,
    sockets: SocketInfo[],
    now: number,
  ): Promise<void> {
    const close = (code: number, reason: string): void => {
      effects.close.push({ socketId, code, reason });
    };
    const violation = (kind: 'MALFORMED' | 'RATE' | 'AUTH', code: number, reason: string): void => {
      effects.logs.push({ evt: 'protocol.violation', code: this.#record?.code ?? '', kind });
      close(code, reason);
    };
    const reply = (message: ServerMessage): void => {
      effects.send.push({ socketId, message });
    };

    if (!this.#record) return close(CLOSE.ROOM_GONE, 'sala inexistente');
    if (typeof raw !== 'string') return close(CLOSE.BINARY, 'só texto');
    if (raw.length > LIMITS.frameBytes || new TextEncoder().encode(raw).length > LIMITS.frameBytes) {
      return close(CLOSE.TOO_BIG, 'mensagem grande demais');
    }

    const connection = this.#connection(socketId, now);
    if (!connection.bucket.take(now)) {
      connection.drops += 1;
      if (connection.drops > ROOM_LIMITS.maxDrops) return violation('RATE', CLOSE.ABUSE, 'mensagens demais');
      const id = peekMessageId(raw);
      return reply(
        id === null
          ? { t: 'error', code: 'RATE_LIMITED', message: 'mensagens demais, devagar' }
          : ackFail(id, 'RATE_LIMITED', 'mensagens demais, devagar'),
      );
    }

    // Quem enviou acabou de dar sinal, qualquer que seja o `lastSeenAt` que o chamador trouxe.
    const view = sockets.map((socket) => (socket.socketId === socketId ? { ...socket, lastSeenAt: now } : socket));
    const seat = view.find((socket) => socket.socketId === socketId)?.seat ?? null;
    const message = parseClientMessage(raw);

    if (seat === null) {
      if (message?.t !== 'hello') return violation('AUTH', CLOSE.AUTH, 'esperava hello');
      if (message.protocol !== PROTOCOL_VERSION) {
        reply({ t: 'error', code: 'PROTOCOL_MISMATCH', message: 'versão do protocolo incompatível' });
        return close(CLOSE.PROTOCOL, 'protocolo incompatível');
      }
      const tokenHash = await sha256Hex(message.token);
      // Sem `await` daqui até o fim: o registro é lido e gravado de uma vez.
      const record = this.#record;
      if (!record) return close(CLOSE.ROOM_GONE, 'sala inexistente');
      const owner = record.seats.find((candidate) => candidate.tokenHash === tokenHash);
      if (!owner) return violation('AUTH', CLOSE.AUTH, 'token inválido');
      return this.#hello(effects, record, owner, socketId, view, now);
    }

    if (message === null) {
      connection.malformed += 1;
      if (connection.malformed > ROOM_LIMITS.maxMalformed) {
        return violation('MALFORMED', CLOSE.ABUSE, 'mensagens malformadas demais');
      }
      return reply({ t: 'error', code: 'BAD_MESSAGE', message: 'mensagem inválida' });
    }
    this.#dispatch(effects, this.#record, seat, socketId, message, view, now);
  }

  /** Autentica o socket no assento: a aba nova vence e a antiga cai com 4009 (spec §2.6). */
  #hello(
    effects: Effects,
    record: RoomRecord,
    owner: SeatRecord,
    socketId: string,
    sockets: SocketInfo[],
    now: number,
  ): void {
    const attached = sockets.map((socket) => (socket.socketId === socketId ? { ...socket, seat: owner.id } : socket));
    const replaced = attached.filter((socket) => socket.socketId !== socketId && socket.seat === owner.id);
    for (const old of replaced) {
      effects.close.push({ socketId: old.socketId, code: CLOSE.OTHER_TAB, reason: 'aberta em outra aba' });
    }
    effects.attach.push({ socketId, seat: owner.id });
    owner.offlineSince = null;
    effects.persist = true;
    effects.send.push({
      socketId,
      message: { t: 'welcome', protocol: PROTOCOL_VERSION, playerId: owner.id, serverNow: now },
    });
    this.#sendRoom(effects, record, attached.filter((socket) => !replaced.includes(socket)), now);
    // A volta com eventos perdidos (catch-up) é da Tarefa 8; aqui o jogador recebe o retrato inteiro.
    if (record.game) {
      effects.send.push({ socketId, message: stateFor(record, owner.id, [], now, { resync: true }) });
    }
  }

  #sendRoom(effects: Effects, record: RoomRecord, live: SocketInfo[], now: number): void {
    const message = roomMessage(record, live, now);
    for (const socket of live) {
      if (socket.seat !== null) effects.send.push({ socketId: socket.socketId, message });
    }
  }

  #dispatch(
    effects: Effects,
    record: RoomRecord,
    seat: SeatId,
    socketId: string,
    message: ClientMessage,
    sockets: SocketInfo[],
    now: number,
  ): void {
    const reply = (response: ServerMessage): void => {
      effects.send.push({ socketId, message: response });
    };
    const wrongStatus = (): void =>
      reply({ t: 'error', code: 'WRONG_STATUS', message: 'isso não vale neste momento da sala' });

    switch (message.t) {
      case 'hello':
        return reply({ t: 'error', code: 'BAD_MESSAGE', message: 'hello repetido' });
      case 'ready':
        if (record.status !== 'LOBBY') return wrongStatus();
        return this.#ready(effects, record, seat, message.ready, sockets, now);
      case 'leave':
        if (record.status !== 'LOBBY') return wrongStatus();
        return this.#leave(effects, record, seat, sockets, now);
      case 'act':
      case 'concede':
        if (record.status !== 'PLAYING') return reply(ackFail(message.id, 'NOT_PLAYING', 'não há partida em andamento'));
        // A jogada e a desistência entram na Tarefa 6.
        return reply(ackFail(message.id, 'BAD_MESSAGE', 'ainda não suportado'));
      case 'rematch':
        if (record.status !== 'FINISHED') return wrongStatus();
        // A revanche entra na Tarefa 6.
        return reply({ t: 'error', code: 'BAD_MESSAGE', message: 'ainda não suportado' });
    }
  }

  /** `leave` libera o assento e fecha o socket com 1000; só no lobby (spec §2.3). */
  #leave(effects: Effects, record: RoomRecord, seat: SeatId, sockets: SocketInfo[], now: number): void {
    record.seats = record.seats.filter((candidate) => candidate.id !== seat);
    for (const socket of sockets.filter((candidate) => candidate.seat === seat)) {
      effects.close.push({ socketId: socket.socketId, code: CLOSE.LEAVE, reason: 'saiu da sala' });
    }
    effects.persist = true;
    this.#sendRoom(effects, record, sockets.filter((socket) => socket.seat !== seat), now);
  }

  /**
   * Marca o pronto e, com os dois prontos, confere a presença antes de largar (spec §7.1): assento sem socket
   * ou com socket sem sinal há mais de 45 s perde o pronto (o socket sem sinal cai com 4008) e a partida não começa.
   */
  #ready(
    effects: Effects,
    record: RoomRecord,
    seat: SeatId,
    ready: boolean,
    sockets: SocketInfo[],
    now: number,
  ): void {
    const mine = record.seats.find((candidate) => candidate.id === seat);
    if (mine) mine.ready = ready;
    effects.persist = true;

    let live = sockets;
    let start = record.seats.length === SEAT_IDS.length && record.seats.every((candidate) => candidate.ready);
    if (start) {
      for (const candidate of record.seats) {
        const owned = live.filter((socket) => socket.seat === candidate.id);
        const silent = owned.filter((socket) => socket.lastSeenAt < now - TIMERS.silentDropMs);
        if (owned.length > 0 && silent.length === 0) continue;
        start = false;
        candidate.ready = false;
        if (silent.length > 0) candidate.offlineSince = now;
        for (const socket of silent) {
          effects.close.push({ socketId: socket.socketId, code: CLOSE.HELLO, reason: 'sem sinal' });
        }
        live = live.filter((socket) => !silent.includes(socket));
      }
    }

    if (!start) return this.#sendRoom(effects, record, live, now);
    const step = startGame(record, this.#deps, now);
    effects.logs.push({ evt: 'game.started', code: record.code, gameNo: record.gameNo });
    // `room` (já PLAYING) antes do `state` inicial de cada um.
    this.#sendRoom(effects, record, live, now);
    for (const socket of live) {
      if (socket.seat !== null) effects.send.push({ socketId: socket.socketId, message: step.messages[socket.seat] });
    }
  }

  /** Dados públicos para a tela de convite; `null` se a sala não existe. */
  info(): RoomInfoResponse | null {
    const record = this.#record;
    if (!record) return null;
    return {
      code: record.code,
      status: record.status,
      nicknames: record.seats.map((seat) => seat.nickname),
      full: record.seats.length >= SEAT_IDS.length,
    };
  }
}
