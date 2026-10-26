import { CLOSE, LIMITS, PROTOCOL_VERSION } from '@coringa/protocol';
import { autoSteps, startGame } from './game.ts';
import { TokenBucket } from './limiter.ts';
import { markOffline, markOnline, missedEvents, syncIdle } from './presence.ts';
import { ROOM_LIMITS, TIMERS } from './timers.ts';
import type { CoreDeps, Effects, RoomRecord, SeatId, SeatRecord, SocketInfo } from './types.ts';
import { deliverSteps, sendReplay, sendRoom, stateFor } from './views.ts';

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

/** `id` de um `act`/`concede`, lido sem validar o resto, para responder o descarte ou o erro de esquema com `ack` em vez de `error`. */
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
  deps: CoreDeps,
  now: number,
  lastSeq?: number,
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
  effects.logs.push(...markOnline(record, owner.id, now));
  effects.persist = true;
  effects.send.push({
    socketId,
    message: { t: 'welcome', protocol: PROTOCOL_VERSION, playerId: owner.id, serverNow: now },
  });
  let live = attached.filter((socket) => !replaced.has(socket.socketId));
  // Quem pediu a revanche e voltou: se os dois pedem e estão conectados, a largada sai agora.
  if (record.status === 'FINISHED') {
    const begun = beginGame(effects, record, live, deps, now, 'wantsRematch');
    if (begun.started) return;
    live = begun.live;
  }
  sendRoom(effects, record, live, now);
  // Volta com eventos perdidos (spec §4.7): `catchUp` com os passos que faltam ou, fora do anel, `resync`.
  if (record.game) {
    const missed = missedEvents(record, lastSeq);
    effects.send.push({ socketId, message: stateFor(record, owner.id, missed.events, now, missed.flags) });
  }
  // Sala terminada e sem revanche em curso: o replay da partida vai só a quem acabou de entrar (os outros já o têm).
  sendReplay(effects, record, live.filter((socket) => socket.socketId === socketId));
}

/** `leave` libera o assento e fecha o socket com 1000; só no lobby (spec §2.3). */
export function leave(effects: Effects, record: RoomRecord, seat: SeatId, sockets: SocketInfo[], now: number): void {
  record.seats = record.seats.filter((candidate) => candidate.id !== seat);
  syncIdle(record, now);
  for (const socket of sockets.filter((candidate) => candidate.seat === seat)) {
    effects.close.push({ socketId: socket.socketId, code: CLOSE.LEAVE, reason: 'saiu da sala' });
  }
  effects.persist = true;
  sendRoom(effects, record, sockets.filter((socket) => socket.seat !== seat), now);
}

/**
 * Largada única, da primeira partida e da revanche (spec §7.1). Com os dois assentos pedindo (`flag`), confere a
 * presença: assento sem socket não larga (o `ready` se perde, o `wantsRematch` fica para quando ele voltar) e
 * socket sem sinal há mais de 45 s cai com 4008, perde o pedido e também impede a largada. Com tudo em ordem,
 * começa a partida: `game.started`, o Equipar automático de quem só recebeu figuras, `room` (já PLAYING) e o
 * `state` de cada passo. Sem largar, devolve os sockets que seguem vivos para o chamador mandar o `room`.
 */
export function beginGame(
  effects: Effects,
  record: RoomRecord,
  sockets: SocketInfo[],
  deps: CoreDeps,
  now: number,
  flag: 'ready' | 'wantsRematch',
): { started: boolean; live: SocketInfo[] } {
  let live = sockets;
  let start = record.seats.length === SEAT_IDS.length && record.seats.every((candidate) => candidate[flag]);
  if (start) {
    for (const candidate of record.seats) {
      const owned = live.filter((socket) => socket.seat === candidate.id);
      const silent = owned.filter((socket) => socket.lastSeenAt < now - TIMERS.silentDropMs);
      if (owned.length > 0 && silent.length === 0) continue;
      start = false;
      if (silent.length > 0 || flag === 'ready') candidate[flag] = false;
      if (silent.length > 0) markOffline(record, candidate.id, now, now);
      for (const socket of silent) {
        effects.close.push({ socketId: socket.socketId, code: CLOSE.HELLO, reason: 'sem sinal' });
      }
      live = live.filter((socket) => !silent.includes(socket));
    }
  }
  if (!start) return { started: false, live };

  const steps = [startGame(record, deps, now)];
  effects.logs.push({ evt: 'game.started', code: record.code, gameNo: record.gameNo });
  steps.push(...autoSteps(record, now));
  sendRoom(effects, record, live, now);
  deliverSteps(effects, steps, live);
  return { started: true, live };
}

/** Marca o pronto e tenta largar a partida (os dois prontos, conectados e com sinal). */
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
  const begun = beginGame(effects, record, sockets, deps, now, 'ready');
  if (!begun.started) sendRoom(effects, record, begun.live, now);
}

/** Pede ou retira a revanche (spec §2.3) e tenta largar outra partida na mesma sala. */
export function requestRematch(
  effects: Effects,
  record: RoomRecord,
  seat: SeatId,
  want: boolean,
  sockets: SocketInfo[],
  deps: CoreDeps,
  now: number,
): void {
  const mine = record.seats.find((candidate) => candidate.id === seat);
  if (mine) mine.wantsRematch = want;
  effects.persist = true;
  const begun = beginGame(effects, record, sockets, deps, now, 'wantsRematch');
  if (!begun.started) sendRoom(effects, record, begun.live, now);
}
