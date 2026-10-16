import { CLOSE, LIMITS, PROTOCOL_VERSION } from '@coringa/protocol';
import type { ServerMessage } from '@coringa/protocol';
import { startGame } from './game.ts';
import { TokenBucket } from './limiter.ts';
import { ROOM_LIMITS, TIMERS } from './timers.ts';
import type { CoreDeps, Effects, RoomRecord, SeatId, SeatRecord, SocketInfo } from './types.ts';
import { roomMessage, stateFor } from './views.ts';

/**
 * Lobby e conexões: funções sobre `effects` e `record`, sem estado próprio. O `RoomCore` decide a ordem das
 * checagens e guarda o que vive em memória (baldes, assentos recém-autenticados); aqui ficam os passos.
 */

export const SEAT_IDS: readonly SeatId[] = ['p1', 'p2'];

/** Estado de uma conexão que só existe em memória: se o objeto hibernar, recomeça cheio (spec §8.2). */
export interface Connection {
  bucket: TokenBucket;
  drops: number;
  malformed: number;
}

export function newConnection(now: number): Connection {
  return {
    bucket: new TokenBucket(ROOM_LIMITS.bucketCapacity, ROOM_LIMITS.bucketRefillPerSec, now),
    drops: 0,
    malformed: 0,
  };
}

export function ackFail(
  id: string,
  code: 'RATE_LIMITED' | 'NOT_PLAYING' | 'BAD_MESSAGE',
  message: string,
): ServerMessage {
  return { t: 'ack', id, ok: false, code, message };
}

/** `id` de um `act`/`concede`, lido sem validar o resto, para responder o descarte com `ack` em vez de `error`. */
export function peekMessageId(raw: string): string | null {
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

/** Manda a mesma mensagem `room` a todo socket autenticado da lista. */
export function sendRoom(effects: Effects, record: RoomRecord, live: SocketInfo[], now: number): void {
  const message = roomMessage(record, live, now);
  for (const socket of live) {
    if (socket.seat !== null) effects.send.push({ socketId: socket.socketId, message });
  }
}

/**
 * Autentica o socket no assento: a aba nova vence e a antiga cai com 4009 (spec §2.6). `attachedSeats` são os
 * assentos que esta instância já ligou a sockets (guardados sem `await` no meio): o instantâneo `sockets` é
 * anterior ao `await` do hash, então um `hello` concorrente do mesmo assento ainda aparece nele sem assento.
 */
export function hello(
  effects: Effects,
  record: RoomRecord,
  owner: SeatRecord,
  socketId: string,
  sockets: SocketInfo[],
  attachedSeats: Map<string, SeatId>,
  now: number,
): void {
  const seatOf = (socket: SocketInfo): SeatId | null => socket.seat ?? attachedSeats.get(socket.socketId) ?? null;
  const attached = sockets.map((socket) => ({
    ...socket,
    seat: socket.socketId === socketId ? owner.id : seatOf(socket),
  }));
  const replaced = new Set<string>();
  for (const socket of attached) {
    if (socket.socketId !== socketId && socket.seat === owner.id) replaced.add(socket.socketId);
  }
  // Quem entrou durante o `await` e nem aparece no instantâneo também perde o assento.
  for (const [id, seat] of attachedSeats) {
    if (id !== socketId && seat === owner.id) replaced.add(id);
  }
  for (const id of replaced) {
    effects.close.push({ socketId: id, code: CLOSE.OTHER_TAB, reason: 'aberta em outra aba' });
    attachedSeats.delete(id);
  }
  attachedSeats.set(socketId, owner.id);

  effects.attach.push({ socketId, seat: owner.id });
  owner.offlineSince = null;
  effects.persist = true;
  effects.send.push({
    socketId,
    message: { t: 'welcome', protocol: PROTOCOL_VERSION, playerId: owner.id, serverNow: now },
  });
  sendRoom(effects, record, attached.filter((socket) => !replaced.has(socket.socketId)), now);
  // A volta com eventos perdidos (catch-up) é da Tarefa 8; aqui o jogador recebe o retrato inteiro.
  if (record.game) {
    effects.send.push({ socketId, message: stateFor(record, owner.id, [], now, { resync: true }) });
  }
}

/** `leave` libera o assento e fecha o socket com 1000; só no lobby (spec §2.3). */
export function leave(effects: Effects, record: RoomRecord, seat: SeatId, sockets: SocketInfo[], now: number): void {
  record.seats = record.seats.filter((candidate) => candidate.id !== seat);
  for (const socket of sockets.filter((candidate) => candidate.seat === seat)) {
    effects.close.push({ socketId: socket.socketId, code: CLOSE.LEAVE, reason: 'saiu da sala' });
  }
  effects.persist = true;
  sendRoom(effects, record, sockets.filter((socket) => socket.seat !== seat), now);
}

/**
 * Marca o pronto e, com os dois prontos, confere a presença antes de largar (spec §7.1): assento sem socket
 * ou com socket sem sinal há mais de 45 s perde o pronto (o socket sem sinal cai com 4008) e a partida não começa.
 */
export function ready(
  effects: Effects,
  record: RoomRecord,
  seat: SeatId,
  isReady: boolean,
  sockets: SocketInfo[],
  deps: CoreDeps,
  now: number,
): void {
  const mine = record.seats.find((candidate) => candidate.id === seat);
  if (mine) mine.ready = isReady;
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

  if (!start) return sendRoom(effects, record, live, now);
  const step = startGame(record, deps, now);
  effects.logs.push({ evt: 'game.started', code: record.code, gameNo: record.gameNo });
  // `room` (já PLAYING) antes do `state` inicial de cada um.
  sendRoom(effects, record, live, now);
  for (const socket of live) {
    if (socket.seat !== null) effects.send.push({ socketId: socket.socketId, message: step.messages[socket.seat] });
  }
}
