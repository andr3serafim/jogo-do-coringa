import { CLOSE } from '@coringa/protocol';
import type { GameEvent } from '@coringa/engine';
import { withItem, withoutKinds } from './agenda.ts';
import { finishGame, walkover } from './game.ts';
import type { StateStep } from './game.ts';
import { TIMERS } from './timers.ts';
import type { AgendaItem, Effects, LogLine, RoomRecord, SeatId, SocketInfo } from './types.ts';
import { sendRoom } from './views.ts';

/**
 * Presença, reconexão, varredura e expiração (spec §2.5, §4.7, §7.1, §7.2). Funções sobre o registro: o `RoomCore`
 * decide a ordem e entrega os efeitos. A presença vem dos sockets vivos: `offlineSince` é só o reflexo disso,
 * refeito por `onClose`, pela varredura e por `reconcile` ao acordar.
 */

type Closes = Effects['close'];

/** Põe o `idleExpiry` quando ninguém está conectado (sem mexer no que já existe) e o tira quando alguém está. */
export function syncIdle(record: RoomRecord, now: number): boolean {
  const anyone = record.seats.some((seat) => seat.offlineSince === null);
  const has = record.agenda.some((item) => item.kind === 'idleExpiry');
  if (anyone && has) {
    record.agenda = withoutKinds(record.agenda, ['idleExpiry']);
    return true;
  }
  if (!anyone && !has) {
    record.agenda = withItem(record.agenda, { kind: 'idleExpiry', at: now + TIMERS.idleExpiryMs });
    return true;
  }
  return false;
}

/**
 * Marca a saída do assento em `since` (o último sinal, na queda silenciosa; `now`, na queda limpa). No lobby tira o
 * pronto; em PLAYING agenda o `reconnect` em `since + 60 s` (o W.O. conta da saída). Já fora: não muda nada.
 */
export function markOffline(record: RoomRecord, seat: SeatId, since: number, now: number): LogLine[] {
  const mine = record.seats.find((candidate) => candidate.id === seat);
  if (!mine || mine.offlineSince !== null) return [];
  mine.offlineSince = since;
  if (record.status === 'LOBBY') mine.ready = false;
  syncIdle(record, now);
  if (record.status !== 'PLAYING') return [];
  record.agenda = withItem(record.agenda, { kind: 'reconnect', at: since + TIMERS.reconnectMs, seat, gameNo: record.gameNo });
  return [{ evt: 'player.disconnected', code: record.code, playerId: seat, gameNo: record.gameNo }];
}

/** Volta do assento (`hello` válido): cancela o `reconnect` dele e o `idleExpiry`. */
export function markOnline(record: RoomRecord, seat: SeatId, now: number): LogLine[] {
  const mine = record.seats.find((candidate) => candidate.id === seat);
  if (!mine) return [];
  const wasOut = mine.offlineSince !== null;
  mine.offlineSince = null;
  record.agenda = withoutKinds(record.agenda, ['reconnect'], seat);
  syncIdle(record, now);
  if (!wasOut || record.status !== 'PLAYING') return [];
  return [{ evt: 'player.reconnected', code: record.code, playerId: seat, gameNo: record.gameNo }];
}

/** Sockets sem `hello` há mais de 10 s (spec §4.2): caem com 4008 na varredura e na chegada de um socket novo. */
export function staleUnauthenticated(sockets: SocketInfo[], now: number): Closes {
  return sockets
    .filter((socket) => socket.seat === null && socket.connectedAt < now - TIMERS.helloTimeoutMs)
    .map((socket) => ({ socketId: socket.socketId, code: CLOSE.HELLO, reason: 'sem hello' }));
}

/**
 * Varredura de presença (spec §7.1): fecha com 4008 os autenticados sem sinal há mais de 45 s e os sem `hello` há mais
 * de 10 s. O assento que ficou sem nenhum socket saudável sai desde o último sinal dele. Não manda nada: quem chama
 * entrega os fechamentos, os logs e o `room`.
 */
export function sweep(record: RoomRecord, sockets: SocketInfo[], now: number): { close: Closes; logs: LogLine[] } {
  const silent = sockets.filter((socket) => socket.seat !== null && socket.lastSeenAt < now - TIMERS.silentDropMs);
  const close: Closes = silent.map((socket) => ({ socketId: socket.socketId, code: CLOSE.HELLO, reason: 'sem sinal' }));
  const logs: LogLine[] = [];
  for (const seat of record.seats) {
    const gone = silent.filter((socket) => socket.seat === seat.id);
    if (gone.length === 0 || gone.length < sockets.filter((socket) => socket.seat === seat.id).length) continue;
    const since = Math.max(...gone.map((socket) => socket.lastSeenAt));
    logs.push(...markOffline(record, seat.id, since, now));
  }
  close.push(...staleUnauthenticated(sockets, now));
  return { close, logs };
}

/** Item `presenceSweep` vencido: varre, reagenda a próxima e avisa a sala se alguém saiu. Obsoleto: só some. */
export function sweepDue(
  record: RoomRecord,
  item: Extract<AgendaItem, { kind: 'presenceSweep' }>,
  sockets: SocketInfo[],
  now: number,
  effects: Effects,
): void {
  if (record.status !== 'PLAYING' || item.gameNo !== record.gameNo) return;
  const swept = sweep(record, sockets, now);
  effects.close.push(...swept.close);
  effects.logs.push(...swept.logs);
  record.agenda = withItem(record.agenda, { kind: 'presenceSweep', at: now + TIMERS.presenceSweepMs, gameNo: record.gameNo });
  if (swept.logs.length > 0) {
    const closing = new Set(swept.close.map((entry) => entry.socketId));
    sendRoom(effects, record, sockets.filter((socket) => !closing.has(socket.socketId)), now);
  }
}

/**
 * Item `reconnect` vencido (spec §7.2): com o assento ainda fora, na mesma partida e em PLAYING, W.O. se o outro está
 * conectado; senão abandono. Qualquer outro caso é obsoleto e não faz nada.
 */
export function reconnectDue(
  record: RoomRecord,
  item: Extract<AgendaItem, { kind: 'reconnect' }>,
  now: number,
): StateStep[] {
  const seat = record.seats.find((candidate) => candidate.id === item.seat);
  if (record.status !== 'PLAYING' || item.gameNo !== record.gameNo || !seat || seat.offlineSince === null) return [];
  return [walkover(record, item.seat, 'RECONNECT_TIMEOUT', now)];
}

/**
 * Ao acordar (spec §7.1): assento sem socket vivo passa a estar fora desde agora, com o prazo de W.O. correndo em
 * PLAYING; ninguém conectado → `idleExpiry`; em PLAYING sempre existe uma varredura. Avisa os conectados se a presença mudou.
 */
export function reconcile(record: RoomRecord, sockets: SocketInfo[], now: number, effects: Effects): void {
  let presenceChanged = false;
  for (const seat of record.seats) {
    if (seat.offlineSince !== null || sockets.some((socket) => socket.seat === seat.id)) continue;
    effects.logs.push(...markOffline(record, seat.id, now, now));
    presenceChanged = true;
  }
  let changed = presenceChanged;
  if (record.status === 'PLAYING' && !record.agenda.some((item) => item.kind === 'presenceSweep')) {
    record.agenda = withItem(record.agenda, { kind: 'presenceSweep', at: now + TIMERS.presenceSweepMs, gameNo: record.gameNo });
    changed = true;
  }
  if (syncIdle(record, now)) changed = true;
  if (changed) effects.persist = true;
  if (presenceChanged) sendRoom(effects, record, sockets, now);
}

/**
 * Eventos que o jogador perdeu enquanto esteve fora (spec §4.7). Do `lastSeq + 1` até o `seq` atual, todos no anel de
 * passos recentes: `catchUp` com os eventos em ordem (a redação é do `stateFor`, que age evento a evento). Qualquer
 * outro caso (`lastSeq` ausente, maior que o `seq` ou fora do anel de 50): `resync`, só o retrato.
 */
export function missedEvents(
  record: RoomRecord,
  lastSeq: number | undefined,
): { events: GameEvent[]; flags: { catchUp: true } | { resync: true } } {
  const recent = record.game?.recent ?? [];
  if (lastSeq !== undefined && lastSeq <= record.seq) {
    const lost = recent.filter((step) => step.seq > lastSeq);
    if (lost.length === record.seq - lastSeq && lost.every((step, i) => step.seq === lastSeq + 1 + i)) {
      return { events: lost.flatMap((step) => step.events), flags: { catchUp: true } };
    }
  }
  return { events: [], flags: { resync: true } };
}

/**
 * Apagar a sala (spec §2.5): fecha todos os sockets com 4000. No meio de uma partida, o registro dela termina como
 * abandonada (`game.ended` e `game.replay`) antes do `room.expired`, que leva o status de antes.
 */
export function expire(
  record: RoomRecord,
  reason: 'IDLE' | 'HARD',
  sockets: SocketInfo[],
  now: number,
): { close: Closes; logs: LogLine[] } {
  const status = record.status;
  const logs = status === 'PLAYING' ? finishGame(record, 'ABANDONED', now) : [];
  logs.push({ evt: 'room.expired', code: record.code, status, reason });
  return { close: closeAll(sockets, 'sala encerrada'), logs };
}

/** Fechamento 4000 de todos os sockets (sala apagada ou reiniciada). */
export function closeAll(sockets: SocketInfo[], reason: string): Closes {
  return sockets.map((socket) => ({ socketId: socket.socketId, code: CLOSE.ROOM_GONE, reason }));
}
