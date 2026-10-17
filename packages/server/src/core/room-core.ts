import { CLOSE, LIMITS, PROTOCOL_VERSION, normalizeNickname } from '@coringa/protocol';
import type {
  AckMessage,
  ClientMessage,
  CreateRoomResponse,
  JoinRoomResponse,
  RoomInfoResponse,
  ServerMessage,
} from '@coringa/protocol';
import { parseClientMessage } from '@coringa/protocol/schemas';
import { dueItems, nextAlarm } from './agenda.ts';
import { emptyEffects } from './effects.ts';
import * as game from './game.ts';
import type { StateStep } from './game.ts';
import * as lobby from './lobby.ts';
import * as presence from './presence.ts';
import { peekMessageId, SEAT_IDS } from './lobby.ts';
import type { Connection } from './lobby.ts';
import { ROOM_LIMITS, STATE_SCHEMA, TIMERS } from './timers.ts';
import { base64url, sha256Hex } from './tokens.ts';
import { ackFail, deliverSteps, sendRoom } from './views.ts';
import type { CoreDeps, CoreResult, Effects, RoomRecord, SeatId, SeatRecord, SocketInfo } from './types.ts';

/** Função à parte para o TypeScript não fixar o `status` depois de um `continue` no laço do alarme. */
const isFinished = (record: RoomRecord): boolean => record.status === 'FINISHED';

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
    sendRoom(effects, record, sockets, now);
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
    // Quem não mandou `hello` em 10 s cai agora (spec §7.1) e deixa de contar para o limite.
    const stale = presence.staleUnauthenticated(
      sockets.filter((other) => other.socketId !== socket.socketId),
      now,
    );
    effects.close.push(...stale);
    const others = sockets.filter(
      (other) => other.socketId !== socket.socketId && !stale.some((entry) => entry.socketId === other.socketId),
    );
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
   * Queda limpa (spec §7.1): marca a saída na hora, agenda o W.O. em PLAYING e a expiração ociosa de quem sai por último.
   */
  onClose(socketId: string, sockets: SocketInfo[], now: number): Effects {
    this.#connections.delete(socketId);
    this.#attachedSeats.delete(socketId);
    const effects = emptyEffects();
    try {
      const record = this.#record;
      if (!record) return effects;
      const live = sockets.filter((socket) => socket.socketId !== socketId);
      let changed = false;
      for (const seat of record.seats) {
        if (seat.offlineSince !== null || live.some((socket) => socket.seat === seat.id)) continue;
        effects.logs.push(...presence.markOffline(record, seat.id, now, now));
        changed = true;
      }
      if (changed) {
        effects.persist = true;
        sendRoom(effects, record, live, now);
      }
      return effects;
    } finally {
      this.#setAlarm(effects);
    }
  }

  /**
   * Ordem: sala, frame (binário, tamanho), limite por conexão, autenticação, esquema, despacho. O único `await`
   * é o SHA-256 do token do `hello`, antes de ler ou mudar o registro (spec §9.1). `sockets` inclui quem enviou.
   * Todo o resto é síncrono: `#receive` termina antes do hash e `#authenticate` roda depois dele.
   */
  async onMessage(socketId: string, raw: string | ArrayBuffer, sockets: SocketInfo[], now: number): Promise<Effects> {
    const effects = emptyEffects();
    const pending = this.#receive(effects, socketId, raw, sockets, now);
    if (pending !== null) {
      const tokenHash = await sha256Hex(pending.token);
      this.#authenticate(effects, socketId, pending.view, tokenHash, now, pending.lastSeq);
    }
    return effects;
  }

  /** Fecha o socket, sem tocar em mais nada. */
  #close(effects: Effects, socketId: string, code: number, reason: string): void {
    effects.close.push({ socketId, code, reason });
  }

  #violation(effects: Effects, socketId: string, kind: 'MALFORMED' | 'RATE' | 'AUTH', code: number, reason: string): void {
    effects.logs.push({ evt: 'protocol.violation', code: this.#record?.code ?? '', kind });
    this.#close(effects, socketId, code, reason);
  }

  /**
   * Alarme desejado, lido no fim de cada trecho síncrono (`#receive` e `#authenticate`): sem `await` entre o
   * trabalho que pode mexer na agenda e esta leitura. Num `finally`, vale também se o trecho lançar. O trecho do
   * hello que espera o hash lê de novo ao terminar, e a leitura dele é a que vale.
   */
  #setAlarm(effects: Effects): void {
    effects.alarm = this.#record ? nextAlarm(this.#record.agenda) : null;
  }

  /**
   * Trecho síncrono até o hash. Devolve o `hello` válido que falta autenticar (token e instantâneo com o sinal
   * de quem enviou) ou `null` quando a mensagem já foi toda tratada.
   */
  #receive(
    effects: Effects,
    socketId: string,
    raw: string | ArrayBuffer,
    sockets: SocketInfo[],
    now: number,
  ): { token: string; lastSeq?: number; view: SocketInfo[] } | null {
    try {
      const close = (code: number, reason: string): null => {
        this.#close(effects, socketId, code, reason);
        return null;
      };
      const violation = (kind: 'MALFORMED' | 'RATE' | 'AUTH', code: number, reason: string): null => {
        this.#violation(effects, socketId, kind, code, reason);
        return null;
      };
      const reply = (message: ServerMessage): null => {
        effects.send.push({ socketId, message });
        return null;
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
        return message.lastSeq === undefined
          ? { token: message.token, view }
          : { token: message.token, lastSeq: message.lastSeq, view };
      }

      if (message === null) {
        connection.malformed += 1;
        if (connection.malformed > ROOM_LIMITS.maxMalformed) {
          return violation('MALFORMED', CLOSE.ABUSE, 'mensagens malformadas demais');
        }
        // `act`/`concede` com `id` legível: `ack` com esse id (spec §4.6 item 2), para a promessa do cliente resolver.
        const id = peekMessageId(raw);
        return reply(
          id === null
            ? { t: 'error', code: 'BAD_MESSAGE', message: 'mensagem inválida' }
            : ackFail(id, 'BAD_MESSAGE', 'mensagem inválida'),
        );
      }
      this.#dispatch(effects, this.#record, seat, socketId, message, view, now);
      return null;
    } finally {
      this.#setAlarm(effects);
    }
  }

  /** Trecho síncrono depois do hash: relê o registro, acha o dono do token e autentica. */
  #authenticate(
    effects: Effects,
    socketId: string,
    view: SocketInfo[],
    tokenHash: string,
    now: number,
    lastSeq?: number,
  ): void {
    try {
      const record = this.#record;
      if (!record) return this.#close(effects, socketId, CLOSE.ROOM_GONE, 'sala inexistente');
      const owner = record.seats.find((candidate) => candidate.tokenHash === tokenHash);
      if (!owner) return this.#violation(effects, socketId, 'AUTH', CLOSE.AUTH, 'token inválido');
      lobby.hello(effects, record, owner, socketId, view, this.#attachedSeats, this.#deps, now, lastSeq);
    } finally {
      this.#setAlarm(effects);
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
        return lobby.ready(effects, record, seat, message.ready, sockets, this.#deps, now);
      case 'leave':
        if (record.status !== 'LOBBY') return wrongStatus();
        return lobby.leave(effects, record, seat, sockets, now);
      case 'act':
        return this.#play(effects, record, socketId, sockets, now, game.playerAct(record, seat, message, now));
      case 'concede':
        return this.#play(effects, record, socketId, sockets, now, game.concede(record, seat, message.id, now));
      case 'rematch':
        if (record.status !== 'FINISHED') return wrongStatus();
        return lobby.requestRematch(effects, record, seat, message.want, sockets, this.#deps, now);
    }
  }

  /**
   * Resposta a `act` e `concede`: os `state` de cada passo para os dois, depois o `ack` a quem enviou e, se a
   * partida acabou, o `room` com o desfecho. Uma recusa ou um `id` repetido não traz passo e não grava nada;
   * um PASS guardado (`held`) não traz passo, mas grava o que ficou guardado.
   */
  #play(
    effects: Effects,
    record: RoomRecord,
    socketId: string,
    sockets: SocketInfo[],
    now: number,
    outcome: { ack: AckMessage; steps: StateStep[]; held?: true },
  ): void {
    if (outcome.steps.length > 0 || outcome.held) effects.persist = true;
    deliverSteps(effects, outcome.steps, sockets);
    effects.send.push({ socketId, message: outcome.ack });
    if (outcome.steps.length > 0 && record.status === 'FINISHED') sendRoom(effects, record, sockets, now);
  }

  /**
   * Alarme da plataforma (spec §6.5). Processa, em ordem de instante, os itens vencidos da agenda: consome cada um,
   * confere a chave dele, descarta os obsoletos sem efeito e devolve o alarme do próximo. O item mais cedo é
   * escolhido de novo a cada volta, porque um item pode criar outro já vencido (a varredura que acha uma queda antiga
   * cria o `reconnect` que já venceu: o W.O. sai no mesmo alarme). Todo tipo sai da agenda ao ser tratado, senão o
   * alarme ficaria no passado. Síncrono de ponta a ponta: o alarme pode ser repetido, e o consumido não vale de novo.
   * `sockets` serve para entregar os passos, varrer a presença e fechar a sala que expira.
   */
  onAlarm(sockets: SocketInfo[], now: number): Effects {
    const effects = this.#effects();
    try {
      const record = this.#record;
      if (!record) return effects;
      // Antes de decidir qualquer prazo, quem passou de 45 s sem sinal já está fora (o W.O. confere o outro jogador).
      if (record.status === 'PLAYING' && dueItems(record.agenda, now).length > 0) {
        presence.applySweep(record, sockets, now, effects);
      }
      for (;;) {
        const item = dueItems(record.agenda, now)[0];
        if (!item) return effects;
        record.agenda = record.agenda.filter((other) => other !== item);
        effects.persist = true;
        switch (item.kind) {
          case 'idleExpiry':
          case 'hardExpiry':
            // O `idleExpiry` vale só se ninguém voltou; o teto vale sempre.
            if (item.kind === 'idleExpiry' && record.seats.some((seat) => seat.offlineSince === null)) break;
            this.#expire(effects, record, item.kind === 'idleExpiry' ? 'IDLE' : 'HARD', sockets, now);
            return effects;
          case 'presenceSweep':
            presence.sweepDue(record, item, sockets, now, effects);
            break;
          case 'reconnect':
            this.#deliver(effects, record, presence.reconnectDue(record, item, now), sockets, now);
            break;
          case 'phase':
          case 'reactionMin':
            // Só valem na época em que nasceram (spec §6.4): o `TIMEOUT` do motor não diz a que fase se refere.
            if (record.status !== 'PLAYING' || item.epoch !== record.epoch) break;
            this.#deliver(
              effects,
              record,
              item.kind === 'phase' ? game.applyTimeout(record, now) : game.applyHeldPass(record, now),
              sockets,
              now,
            );
            break;
        }
      }
    } finally {
      this.#setAlarm(effects);
    }
  }

  /** Entrega os passos do alarme a quem segue aberto (os fechados nesta rodada não recebem) e avisa a sala se a partida acabou. */
  #deliver(effects: Effects, record: RoomRecord, steps: StateStep[], sockets: SocketInfo[], now: number): void {
    const closing = new Set(effects.close.map((entry) => entry.socketId));
    const live = sockets.filter((socket) => !closing.has(socket.socketId));
    deliverSteps(effects, steps, live);
    if (steps.length > 0 && isFinished(record)) sendRoom(effects, record, live, now);
  }

  /** Apaga a sala por expiração (spec §2.5). */
  #expire(effects: Effects, record: RoomRecord, reason: 'IDLE' | 'HARD', sockets: SocketInfo[], now: number): void {
    const expired = presence.expire(record, reason, sockets, now);
    effects.close.push(...expired.close);
    effects.logs.push(...expired.logs);
    this.#drop(effects);
  }

  /** Esquece a sala: `deleteAll` na casca, nada a gravar, sem alarme e sem estado de conexão em memória. */
  #drop(effects: Effects): void {
    this.#record = null;
    this.#connections.clear();
    this.#attachedSeats.clear();
    effects.deleteAll = true;
    effects.persist = false;
    effects.send = [];
  }

  /**
   * Chamado pela casca ao acordar, antes da primeira entrada (spec §7.1, §9.2, §9.3). Esquema diferente do atual:
   * a sala é encerrada (4000, `room.reset`). Senão, confere os assentos contra os sockets que existem de fato.
   */
  reconcile(sockets: SocketInfo[], now: number): Effects {
    const effects = emptyEffects();
    try {
      const record = this.#record;
      if (!record) return effects;
      if (record.schema !== STATE_SCHEMA) {
        effects.close.push(...presence.closeAll(sockets, 'sala reiniciada'));
        effects.logs.push({
          evt: 'room.reset',
          code: record.code,
          status: record.status,
          reason: `esquema ${record.schema} no storage, ${STATE_SCHEMA} no código`,
        });
        this.#drop(effects);
        return effects;
      }
      presence.reconcile(record, sockets, now, effects);
      return effects;
    } finally {
      this.#setAlarm(effects);
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
