import { viewEvents, viewFor } from '@coringa/engine';
import type { GameEvent } from '@coringa/engine';
import type { RoomMessage, SeatInfo, StateMessage } from '@coringa/protocol';
import { TIMERS } from './timers.ts';
import type { RoomRecord, SeatId, SocketInfo } from './types.ts';

/**
 * Mensagem `room` com os dados públicos da sala. `connected` = há socket autenticado naquele assento;
 * `woAt` (só em PLAYING) = quando o W.O. por reconexão vence; `expiresAt` = o menor entre `idleExpiry`
 * e `hardExpiry` da agenda (sem nenhum dos dois, o teto de 24 h contado da criação).
 */
// `now` faz parte da assinatura estável (os chamadores das próximas tarefas já o passam); hoje nada nesta mensagem o usa.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function roomMessage(record: RoomRecord, sockets: SocketInfo[], now: number): RoomMessage {
  const seats: SeatInfo[] = record.seats.map((seat) => {
    const info: SeatInfo = {
      playerId: seat.id,
      nickname: seat.nickname,
      connected: sockets.some((socket) => socket.seat === seat.id),
      ready: seat.ready,
      wantsRematch: seat.wantsRematch,
    };
    if (record.status === 'PLAYING' && seat.offlineSince !== null) {
      info.woAt = seat.offlineSince + TIMERS.reconnectMs;
    }
    return info;
  });

  const expiries = record.agenda
    .filter((item) => item.kind === 'idleExpiry' || item.kind === 'hardExpiry')
    .map((item) => item.at);
  const expiresAt = expiries.length > 0 ? Math.min(...expiries) : record.createdAt + TIMERS.hardExpiryMs;

  const message: RoomMessage = {
    t: 'room',
    code: record.code,
    status: record.status,
    seats,
    score: record.score,
    gameNo: record.gameNo,
    expiresAt,
  };
  if (record.outcome) message.outcome = record.outcome;
  return message;
}

/**
 * Mensagem `state` de um assento: `viewFor` e `viewEvents` são tudo o que sai do jogo (nada de semente, monte
 * ou mão do oponente). Os prazos ficam `null` até a Tarefa 7. `flags` marca a volta à sala (`catchUp`, `resync`).
 */
export function stateFor(
  record: RoomRecord,
  seat: SeatId,
  events: GameEvent[],
  now: number,
  flags?: { catchUp?: true; resync?: true },
): StateMessage {
  const game = record.game;
  if (!game) throw new Error('stateFor chamado sem partida');
  return {
    t: 'state',
    seq: record.seq,
    epoch: record.epoch,
    view: viewFor(game.state, seat),
    events: viewEvents(events, seat),
    deadline: null,
    serverNow: now,
    ...flags,
  };
}
