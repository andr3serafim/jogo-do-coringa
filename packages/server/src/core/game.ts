import { DEFAULT_CONFIG, applyAction, createGame } from '@coringa/engine';
import type { Action, GameEvent, GameResult, GameState } from '@coringa/engine';
import type { AckMessage, OutcomeCause, PlayerAction, StateMessage } from '@coringa/protocol';
import { withoutKinds } from './agenda.ts';
import { phaseKey } from './epoch.ts';
import { ROOM_LIMITS } from './timers.ts';
import { hex } from './tokens.ts';
import type { CoreDeps, GameRecord, LogLine, Replay, RoomRecord, SeatId } from './types.ts';
import { ackFail, stateFor } from './views.ts';

/**
 * Um passo do jogo: o `seq` dele, os eventos sem redação, a mensagem `state` de cada assento (montada na hora) e
 * as linhas de log que ele gerou (o fim da partida).
 */
export interface StateStep {
  seq: number;
  events: GameEvent[];
  messages: Record<SeatId, StateMessage>;
  logs: LogLine[];
}

/**
 * Monta as mensagens `state` de um passo logo que ele acontece. Um estouro seguido de passos automáticos
 * gera vários passos, e cada um leva a visão daquele instante (`viewFor` clona o estado).
 */
export function makeStep(record: RoomRecord, events: GameEvent[], now: number, logs: LogLine[] = []): StateStep {
  return {
    seq: record.seq,
    events,
    messages: {
      p1: stateFor(record, 'p1', events, now),
      p2: stateFor(record, 'p2', events, now),
    },
    logs,
  };
}

function requireGame(record: RoomRecord): GameRecord {
  if (!record.game) throw new Error('operação de partida sem partida');
  return record.game;
}

/**
 * Começa uma partida na sala (primeira ou revanche): semente nova, estado novo, `ready`/`wantsRematch`/`outcome`
 * zerados. `seq` e `epoch` só sobem, nunca voltam (spec §4.5). Muda o registro e devolve o primeiro passo.
 */
export function startGame(record: RoomRecord, deps: CoreDeps, now: number): StateStep {
  const seed = deps.newSeed ? deps.newSeed() : hex(deps.randomBytes(16));
  const created = createGame(DEFAULT_CONFIG, seed, ['p1', 'p2']);
  if (!created.ok) throw new Error(`configuração inválida: ${created.error.message}`);

  record.gameNo += 1;
  record.status = 'PLAYING';
  record.outcome = null;
  for (const seat of record.seats) {
    seat.ready = false;
    seat.wantsRematch = false;
  }
  record.seq += 1;
  record.epoch += 1;
  record.game = {
    gameNo: record.gameNo,
    seed,
    state: created.state,
    startedAt: now,
    steps: [],
    recent: [{ seq: record.seq, events: [] }],
    phaseStartedAt: now,
    phaseDeadlineAt: null,
    pausedTurnMs: null,
    heldPass: null,
    strikes: { p1: 0, p2: 0 },
    acks: { p1: [], p2: [] },
    cause: null,
  };
  return makeStep(record, [], now);
}

/**
 * Passo do jogo (spec §5, itens 1 a 6): `seq` sobe; a `epoch` sobe se a chave da fase mudou; o passo entra no
 * registro da partida e o anel de recentes é cortado em 50. Jogada voluntária de um jogador zera os estouros dele
 * (`automatic` marca o Equipar feito pelo servidor, que não conta como jogada). Em GAME_OVER, fecha a partida com
 * a causa guardada em `game.cause` (`NORMAL` se não houver). A contagem de estouros e os prazos são da Tarefa 7.
 */
export function commitStep(
  record: RoomRecord,
  actor: SeatId | 'system',
  action: Action,
  result: { state: GameState; events: GameEvent[] },
  now: number,
  options: { automatic?: boolean } = {},
): StateStep {
  const game = requireGame(record);
  const keyBefore = phaseKey(game.state);
  record.seq += 1;
  game.state = result.state;
  if (phaseKey(result.state) !== keyBefore) record.epoch += 1;
  game.steps.push({ player: actor, action });
  game.recent.push({ seq: record.seq, events: result.events });
  if (game.recent.length > ROOM_LIMITS.recentSteps) game.recent.splice(0, game.recent.length - ROOM_LIMITS.recentSteps);
  if (actor !== 'system' && !options.automatic) game.strikes[actor] = 0;
  const logs = result.state.phase.kind === 'GAME_OVER' ? finishGame(record, game.cause ?? 'NORMAL', now) : [];
  return makeStep(record, result.events, now, logs);
}

/**
 * Fecha a partida: status `FINISHED`, `outcome`, placar (vitória soma ao vencedor, empate em `draws`,
 * `ABANDONED` não mexe) e as linhas `game.ended` e `game.replay`. Sem `GAME_OVER` só vale `ABANDONED`.
 */
export function finishGame(record: RoomRecord, cause: OutcomeCause, now: number): LogLine[] {
  const game = requireGame(record);
  const phase = game.state.phase;
  let result: GameResult | null = null;
  if (cause !== 'ABANDONED') {
    if (phase.kind !== 'GAME_OVER') throw new Error(`finishGame(${cause}) sem GAME_OVER`);
    result = phase.result;
  }
  record.status = 'FINISHED';
  record.outcome = { gameNo: record.gameNo, result, cause };
  if (result?.kind === 'WIN') record.score[result.winner as SeatId] += 1;
  else if (result?.kind === 'DRAW') record.score.draws += 1;
  game.cause = cause;
  game.phaseDeadlineAt = null;
  game.pausedTurnMs = null;
  game.heldPass = null;
  record.agenda = withoutKinds(record.agenda, ['phase', 'reactionMin', 'reconnect', 'presenceSweep']);

  const replay: Replay = {
    name: `sala-${record.code}-${record.gameNo}`,
    config: game.state.config,
    seed: game.seed,
    players: ['p1', 'p2'],
    steps: game.steps,
  };
  return [
    {
      evt: 'game.ended',
      code: record.code,
      gameNo: record.gameNo,
      result,
      cause,
      rounds: game.state.round,
      durationMs: now - game.startedAt,
      steps: game.steps.length,
    },
    { evt: 'game.replay', code: record.code, gameNo: record.gameNo, replay },
  ];
}

/**
 * Equipar automático (spec §5): no começo de cada rodada de Equipar, quem recebeu zero numéricas tem
 * `EQUIP { destinations: [] }` aplicado em seu nome, cada um como passo próprio. A quantidade de pendentes já é
 * pública, então nada se revela. Não conta como jogada voluntária (os estouros ficam como estão). A Tarefa 7
 * acrescenta o W.O. por estouros.
 */
export function autoSteps(record: RoomRecord, now: number): StateStep[] {
  const game = requireGame(record);
  const steps: StateStep[] = [];
  for (;;) {
    const state = game.state;
    if (state.phase.kind !== 'EQUIP') return steps;
    const idle = state.players.find((player) => !player.equipSubmitted && player.pending.length === 0);
    if (!idle) return steps;
    const action: Action = { type: 'EQUIP', destinations: [] };
    const result = applyAction(state, idle.id, action);
    if (!result.ok) throw new Error(`Equipar automático recusado: ${result.error.code}`);
    steps.push(commitStep(record, idle.id as SeatId, action, result, now, { automatic: true }));
  }
}

/** Guarda o ack de uma jogada aplicada; só os 64 últimos de cada jogador (spec §4.6, item 3). */
function rememberAck(game: GameRecord, seat: SeatId, ack: AckMessage): void {
  const acks = game.acks[seat];
  acks.push(ack);
  if (acks.length > ROOM_LIMITS.ackHistory) acks.splice(0, acks.length - ROOM_LIMITS.ackHistory);
}

/**
 * Etapas 3 e 4 de spec §4.6, comuns a `act` e `concede`: um `id` repetido (entre os acks guardados) devolve o
 * mesmo ack, e fora de `PLAYING` não há o que jogar. Só os acks de jogadas aplicadas ficam guardados: uma recusa
 * não muda nada no registro, e repeti-la reavalia a jogada.
 */
function earlyAck(record: RoomRecord, seat: SeatId, id: string): AckMessage | null {
  const repeated = record.game?.acks[seat].find((ack) => ack.id === id);
  if (repeated) return repeated;
  if (record.status !== 'PLAYING' || !record.game) return ackFail(id, 'NOT_PLAYING', 'não há partida em andamento');
  return null;
}

/**
 * Jogada de um jogador (spec §4.6, etapas 3 a 8; as etapas 1 e 2 são do `RoomCore`). Recusa sem mudar nada:
 * `NOT_PLAYING`, `STALE_EPOCH`, erro do motor (o `ALREADY_PASSED` da janela de reação vem na Tarefa 7). Aplicada,
 * devolve o `ack` com o `seq` do passo do jogador e os passos (o dele e os automáticos que ele provocou).
 */
export function playerAct(
  record: RoomRecord,
  seat: SeatId,
  msg: { id: string; epoch: number; action: PlayerAction },
  now: number,
): { ack: AckMessage; steps: StateStep[] } {
  const early = earlyAck(record, seat, msg.id);
  if (early) return { ack: early, steps: [] };
  const game = requireGame(record);
  if (msg.epoch !== record.epoch) {
    return { ack: ackFail(msg.id, 'STALE_EPOCH', 'a mesa mudou, decida de novo'), steps: [] };
  }
  const result = applyAction(game.state, seat, msg.action);
  if (!result.ok) return { ack: ackFail(msg.id, result.error.code, result.error.message), steps: [] };
  const step = commitStep(record, seat, msg.action, result, now);
  const ack: AckMessage = { t: 'ack', id: msg.id, ok: true, seq: step.seq };
  rememberAck(game, seat, ack);
  return { ack, steps: [step, ...autoSteps(record, now)] };
}

/** Desistência (spec §7.4): o servidor injeta `FORFEIT { loser: quem pediu }`, com causa `CONCEDE`. */
export function concede(
  record: RoomRecord,
  seat: SeatId,
  id: string,
  now: number,
): { ack: AckMessage; steps: StateStep[] } {
  const early = earlyAck(record, seat, id);
  if (early) return { ack: early, steps: [] };
  const game = requireGame(record);
  const action: Action = { type: 'FORFEIT', loser: seat };
  const result = applyAction(game.state, 'system', action);
  if (!result.ok) return { ack: ackFail(id, result.error.code, result.error.message), steps: [] };
  game.cause = 'CONCEDE';
  const step = commitStep(record, 'system', action, result, now);
  const ack: AckMessage = { t: 'ack', id, ok: true, seq: step.seq };
  rememberAck(game, seat, ack);
  return { ack, steps: [step] };
}
