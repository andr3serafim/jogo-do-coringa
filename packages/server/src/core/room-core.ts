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
import * as lobby from './lobby.ts';
import { ackFail, peekMessageId, SEAT_IDS } from './lobby.ts';
import type { Connection } from './lobby.ts';
import { ROOM_LIMITS, STATE_SCHEMA, TIMERS } from './timers.ts';
import { base64url, sha256Hex } from './tokens.ts';
import type { CoreDeps, CoreResult, Effects, RoomRecord, SeatId, SeatRecord, SocketInfo } from './types.ts';

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
  /** Assentos que esta instância ligou a sockets; vazio depois de hibernar (a casca traz o instantâneo novo). */
  readonly #attachedSeats = new Map<string, SeatId>();

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
    lobby.sendRoom(effects, record, sockets, now);
    return { ok: true, value: { token, playerId: free }, effects };
  }

  #connection(socketId: string, now: number): Connection {
    let connection = this.#connections.get(socketId);
    if (!connection) {
      connection = lobby.newConnection(now);
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
    this.#attachedSeats.delete(socketId);
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
      lobby.sendRoom(effects, record, live, now);
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
    return effects;
  }

  async #handle(
    effects: Effects,
    socketId: string,
    raw: string | ArrayBuffer,
    sockets: SocketInfo[],
    now: number,
  ): Promise<void> {
    try {
      await this.#process(effects, socketId, raw, sockets, now);
    } finally {
      // O alarme sai no fim do trecho síncrono, no mesmo trecho que mexeu na agenda: nenhuma outra continuação
      // (outro `hello` esperando o hash) pode mudar a agenda entre o trabalho e esta leitura.
      effects.alarm = this.#record ? nextAlarm(this.#record.agenda) : null;
    }
  }

  async #process(
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
      return lobby.hello(effects, record, owner, socketId, view, this.#attachedSeats, now);
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
        return lobby.ready(effects, record, seat, message.ready, sockets, this.#deps, now);
      case 'leave':
        if (record.status !== 'LOBBY') return wrongStatus();
        return lobby.leave(effects, record, seat, sockets, now);
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
