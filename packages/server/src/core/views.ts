import { actingPlayers, viewEvents, viewFor } from '@coringa/engine';
import type { GameEvent } from '@coringa/engine';
import type {
  AckCode,
  AckMessage,
  Deadline,
  DeadlineKind,
  ReplayMessage,
  RoomMessage,
  SeatInfo,
  StateMessage,
} from '@coringa/protocol';
import type { StateStep } from './game.ts';
import { TIMERS } from './timers.ts';
import type { Effects, Replay, RoomRecord, SeatId, SocketInfo } from './types.ts';

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
    // Cópias: a mensagem fica nos efeitos até a casca serializar, e o placar muda no lugar (`score.p1 += 1`).
    score: { ...record.score },
    gameNo: record.gameNo,
    expiresAt,
  };
  if (record.outcome) message.outcome = { ...record.outcome };
  return message;
}

const DEADLINE_KINDS: Record<string, DeadlineKind> = {
  EQUIP: 'EQUIP',
  ORDER_CHOICE: 'ORDER',
  ATTACK_MAIN: 'TURN',
  REACTION: 'REACTION',
};

/**
 * Mensagem `state` de um assento: `viewFor` e `viewEvents` são tudo o que sai do jogo (nada de semente, monte
 * ou mão do oponente). O prazo é o `phaseDeadlineAt` (o instante que a interface mostra; o `TIMEOUT` vem 500 ms
 * depois), com quem age; `pausedTurnMs` acompanha a janela de reação aberta no meio do turno do oponente.
 * `flags` marca a volta à sala (`catchUp`, `resync`).
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
  const kind = DEADLINE_KINDS[game.state.phase.kind];
  const deadline: Deadline | null =
    game.phaseDeadlineAt === null || kind === undefined
      ? null
      : { kind, at: game.phaseDeadlineAt, players: actingPlayers(game.state) };
  const message: StateMessage = {
    t: 'state',
    seq: record.seq,
    epoch: record.epoch,
    view: viewFor(game.state, seat),
    events: viewEvents(events, seat),
    deadline,
    serverNow: now,
    ...flags,
  };
  if (game.state.phase.kind === 'REACTION' && game.pausedTurnMs !== null) message.pausedTurnMs = game.pausedTurnMs;
  return message;
}

/** Manda a mesma mensagem `room` a todo socket autenticado da lista. */
export function sendRoom(effects: Effects, record: RoomRecord, live: SocketInfo[], now: number): void {
  const message = roomMessage(record, live, now);
  for (const socket of live) {
    if (socket.seat !== null) effects.send.push({ socketId: socket.socketId, message });
  }
}

/**
 * A partida da sala como `Replay`: o mesmo formato da linha de log `game.replay` e da mensagem `replay`, com o nome
 * `sala-<código>-<gameNo>`. Os passos são copiados: o registro da partida seguinte não toca neles.
 */
export function replayOf(record: RoomRecord): Replay {
  const game = record.game;
  if (!game) throw new Error('replayOf chamado sem partida');
  return {
    name: `sala-${record.code}-${record.gameNo}`,
    config: game.state.config,
    seed: game.seed,
    players: ['p1', 'p2'],
    steps: [...game.steps],
  };
}

/**
 * Manda a mensagem `replay` (a semente e o registro de passos) a todo socket com assento da lista, só com a sala
 * `FINISHED` e o `outcome` da partida atual: depois do fim, que pode ser do motor, W.O., desistência ou abandono (sem
 * `GAME_OVER` no motor, o replay vai até o último passo). Com qualquer outro status a semente não sai (spec 2 §8.4).
 * Quem chama manda o `room` antes: a `Session` só junta o replay à partida do `room`.
 */
export function sendReplay(effects: Effects, record: RoomRecord, live: SocketInfo[]): void {
  if (record.status !== 'FINISHED' || record.outcome?.gameNo !== record.gameNo || record.game?.gameNo !== record.gameNo) return;
  const message: ReplayMessage = { t: 'replay', gameNo: record.gameNo, replay: replayOf(record) };
  for (const socket of live) {
    if (socket.seat !== null) effects.send.push({ socketId: socket.socketId, message });
  }
}

/**
 * Entrega os passos em ordem: cada um vira a mensagem `state` montada na hora (a visão daquele instante)
 * para todo socket autenticado, e as linhas de log do passo (fim de partida) entram nos efeitos. O abandono
 * só traz o log.
 */
export function deliverSteps(effects: Effects, steps: StateStep[], live: SocketInfo[]): void {
  for (const step of steps) {
    effects.logs.push(...step.logs);
    if (step.messages === null) continue; // abandono: não há `state` novo
    for (const socket of live) {
      if (socket.seat !== null) effects.send.push({ socketId: socket.socketId, message: step.messages[socket.seat] });
    }
  }
}

export function ackFail(id: string, code: AckCode, message: string): AckMessage {
  return { t: 'ack', id, ok: false, code, message };
}
