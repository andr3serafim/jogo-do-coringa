import { DEFAULT_CONFIG, actingPlayers, applyAction, createGame } from '@coringa/engine';
import type { Action, GameEvent, GameResult, GameState } from '@coringa/engine';
import type { AckMessage, OutcomeCause, PlayerAction, StateMessage } from '@coringa/protocol';
import { withItem, withoutKinds } from './agenda.ts';
import { phaseKey } from './epoch.ts';
import { schedulePhase } from './timing.ts';
import { ROOM_LIMITS, TIMERS } from './timers.ts';
import { hex } from './tokens.ts';
import type { CoreDeps, GameRecord, LogLine, Replay, RoomRecord, SeatId } from './types.ts';
import { ackFail, stateFor } from './views.ts';

export { schedulePhase } from './timing.ts';

/**
 * Um passo do jogo: o `seq` dele, os eventos sem redação, a mensagem `state` de cada assento (montada na hora) e
 * as linhas de log que ele gerou (o fim da partida). O abandono (spec §7.2) não é passo do motor: vem como um passo
 * sem `state` (`messages: null`), que só carrega os logs e faz quem entrega mandar o `room` FINISHED.
 */
export interface StateStep {
  seq: number;
  events: GameEvent[];
  messages: Record<SeatId, StateMessage> | null;
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
  // O número da partida que está começando: o `gameNo` só sobe mais abaixo.
  const seed = deps.newSeed ? deps.newSeed(record.gameNo + 1) : hex(deps.randomBytes(16));
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
  schedulePhase(record, { key: '', phase: created.state.phase, deadlineAt: null }, [], now);
  // A varredura de presença existe só em PLAYING (spec §7.1); `finishGame` a tira.
  record.agenda = withItem(record.agenda, {
    kind: 'presenceSweep',
    at: now + TIMERS.presenceSweepMs,
    gameNo: record.gameNo,
  });
  return makeStep(record, [], now);
}

/**
 * Passo do jogo (spec §5, itens 1 a 6): `seq` sobe; a `epoch` sobe se a chave da fase mudou; o passo entra no
 * registro da partida e o anel de recentes é cortado em 50. Jogada voluntária de um jogador zera os estouros dele
 * (`automatic` marca a jogada que não conta como voluntária: o Equipar feito pelo servidor e a jogada `auto` da interface). Em GAME_OVER, fecha a partida com
 * a causa guardada em `game.cause` (`NORMAL` se não houver). Os prazos da fase nova entram pelo `schedulePhase`;
 * a contagem de estouros é de quem injeta o `TIMEOUT` (`applyTimeout`).
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
  const before = { key: keyBefore, phase: game.state.phase, deadlineAt: game.phaseDeadlineAt };
  record.seq += 1;
  game.state = result.state;
  if (phaseKey(result.state) !== keyBefore) record.epoch += 1;
  game.steps.push({ player: actor, action });
  game.recent.push({ seq: record.seq, events: result.events });
  if (game.recent.length > ROOM_LIMITS.recentSteps) game.recent.splice(0, game.recent.length - ROOM_LIMITS.recentSteps);
  if (actor !== 'system' && !options.automatic) game.strikes[actor] = 0;
  schedulePhase(record, before, result.events, now);
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

const SEATS: readonly SeatId[] = ['p1', 'p2'];

export const otherSeat = (seat: SeatId): SeatId => (seat === 'p1' ? 'p2' : 'p1');

/** Conectado = sem saída marcada. A presença sai dos sockets vivos (`onClose`, varredura e `reconcile`), nunca de uma marca antiga. */
export function isConnected(record: RoomRecord, seat: SeatId): boolean {
  return record.seats.find((candidate) => candidate.id === seat)?.offlineSince === null;
}

/**
 * Aplica no motor uma ação que o servidor mesmo injeta (`TIMEOUT`, `FORFEIT`, o `PASS` guardado, o Equipar
 * automático) e registra o passo. O motor nunca deve recusá-la: se recusar, é defeito do servidor e o erro sobe.
 */
function injectStep(
  record: RoomRecord,
  actor: SeatId | 'system',
  action: Action,
  now: number,
  options: { automatic?: boolean } = {},
): StateStep {
  const result = applyAction(requireGame(record).state, actor, action);
  if (!result.ok) throw new Error(`${action.type} recusado pelo motor: ${result.error.code}`);
  return commitStep(record, actor, action, result, now, options);
}

/**
 * Abandono (spec §7.2): status `FINISHED`, `result: null`, placar igual. O estado do motor fica como está (sem
 * `GAME_OVER`, sem passo, `seq` igual), então o passo devolvido não leva `state`: só os logs do fim.
 */
export function abandon(record: RoomRecord, now: number): StateStep {
  return { seq: record.seq, events: [], messages: null, logs: finishGame(record, 'ABANDONED', now) };
}

/**
 * W.O. (spec §7.2): `FORFEIT { loser }` como passo do sistema, com a causa e o log `wo.applied`. Só vale se o OUTRO
 * jogador está conectado neste momento; senão, os dois estão fora e a partida é abandonada.
 */
export function walkover(record: RoomRecord, loser: SeatId, cause: 'AFK' | 'RECONNECT_TIMEOUT', now: number): StateStep {
  if (!isConnected(record, otherSeat(loser))) return abandon(record, now);
  requireGame(record).cause = cause;
  const step = injectStep(record, 'system', { type: 'FORFEIT', loser }, now);
  step.logs.unshift({ evt: 'wo.applied', code: record.code, gameNo: record.gameNo, loser, cause });
  return step;
}

/**
 * Passos automáticos (spec §5), cada um como passo próprio, repetidos até nada mais disparar:
 * - W.O. por estouros (§7.3): quem chegou a 3 perde (`FORFEIT`, causa `AFK`, log `wo.applied`). Com o outro fora,
 *   ou com os dois chegando a 3 no mesmo passo, não há vencedor: a partida é abandonada (§7.2).
 * - Equipar sem numéricas: quem recebeu zero tem `EQUIP { destinations: [] }` aplicado em seu nome. A quantidade
 *   de pendentes já é pública, então nada se revela. Não conta como jogada voluntária (os estouros ficam como estão).
 */
export function autoSteps(record: RoomRecord, now: number): StateStep[] {
  const game = requireGame(record);
  const steps: StateStep[] = [];
  for (;;) {
    const state = game.state;
    if (state.phase.kind === 'GAME_OVER') return steps;
    const afk = SEATS.filter((seat) => game.strikes[seat] >= TIMERS.afkStrikes);
    if (afk.length > 0) {
      steps.push(afk.length === SEATS.length ? abandon(record, now) : walkover(record, afk[0]!, 'AFK', now));
      return steps;
    }
    if (state.phase.kind !== 'EQUIP') return steps;
    const idle = state.players.find((player) => !player.equipSubmitted && player.pending.length === 0);
    if (!idle) return steps;
    steps.push(injectStep(record, idle.id as SeatId, { type: 'EQUIP', destinations: [] }, now, { automatic: true }));
  }
}

/**
 * Estouro da fase (spec §6.2 e §7.3): soma 1 nos estouros de quem deixou o tempo acabar (no Equipar, quem ainda
 * não confirmou e tem pendentes; no turno, o dono dele; a Escolha da ordem e a janela de reação não contam),
 * injeta o `TIMEOUT` como passo do sistema e roda os passos automáticos (que incluem o W.O. por estouros).
 * Quem chama confere antes que o prazo é da época atual (spec §6.4): o `TIMEOUT` do motor não diz a que fase se refere.
 */
export function applyTimeout(record: RoomRecord, now: number): StateStep[] {
  const game = requireGame(record);
  const phase = game.state.phase;
  if (phase.kind === 'EQUIP') {
    for (const id of actingPlayers(game.state)) {
      const player = game.state.players.find((candidate) => candidate.id === id);
      if (player && player.pending.length > 0) game.strikes[id as SeatId] += 1;
    }
  } else if (phase.kind === 'ATTACK_MAIN') {
    game.strikes[phase.player as SeatId] += 1;
  }
  return [injectStep(record, 'system', { type: 'TIMEOUT' }, now), ...autoSteps(record, now)];
}

/**
 * Aplica o PASS guardado quando o piso da janela de reação vence (spec §6.3), em nome do respondente: é jogada
 * dele, então zera os estouros dele, salvo se chegou com `auto` (passe automático da interface, que não zera;
 * um registro antigo sem `auto` vale como manual). Sem PASS guardado na época atual, não faz nada.
 */
export function applyHeldPass(record: RoomRecord, now: number): StateStep[] {
  const game = requireGame(record);
  const phase = game.state.phase;
  const held = game.heldPass;
  if (!held || held.epoch !== record.epoch || phase.kind !== 'REACTION') return [];
  game.heldPass = null;
  const step = injectStep(record, phase.responder as SeatId, { type: 'PASS' }, now, { automatic: held.auto === true });
  return [step, ...autoSteps(record, now)];
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
 * `NOT_PLAYING`, `STALE_EPOCH`, `ALREADY_PASSED`, erro do motor. Um PASS do respondente antes do piso de 2 s da
 * janela fica guardado (`held`, sem passo e sem mudança para o oponente). Aplicada, devolve o `ack` com o `seq` do
 * passo do jogador e os passos (o dele e os automáticos que ele provocou). Jogada com `auto: true` (feita pela
 * interface em nome do jogador: passe e ordem automáticos) não zera os estouros, nem quando o PASS fica guardado.
 */
export function playerAct(
  record: RoomRecord,
  seat: SeatId,
  msg: { id: string; epoch: number; action: PlayerAction; auto?: true },
  now: number,
): { ack: AckMessage; steps: StateStep[]; held?: true } {
  const early = earlyAck(record, seat, msg.id);
  if (early) return { ack: early, steps: [] };
  const game = requireGame(record);
  if (msg.epoch !== record.epoch) {
    return { ack: ackFail(msg.id, 'STALE_EPOCH', 'a mesa mudou, decida de novo'), steps: [] };
  }
  const phase = game.state.phase;
  if (phase.kind === 'REACTION' && phase.responder === seat) {
    if (game.heldPass) return { ack: ackFail(msg.id, 'ALREADY_PASSED', 'você já passou nesta janela'), steps: [] };
    if (msg.action.type === 'PASS' && now < game.phaseStartedAt + TIMERS.reactionMinMs) {
      // Piso da janela (spec §6.3): o PASS espera os 2 s e só então vale; o oponente não vê nada até lá.
      game.heldPass = { epoch: record.epoch, id: msg.id, ...(msg.auto === true ? { auto: true as const } : {}) };
      record.agenda = withItem(record.agenda, {
        kind: 'reactionMin',
        at: game.phaseStartedAt + TIMERS.reactionMinMs,
        epoch: record.epoch,
      });
      const held: AckMessage = { t: 'ack', id: msg.id, ok: true, held: true };
      rememberAck(game, seat, held);
      return { ack: held, steps: [], held: true };
    }
  }
  const result = applyAction(game.state, seat, msg.action);
  if (!result.ok) return { ack: ackFail(msg.id, result.error.code, result.error.message), steps: [] };
  const step = commitStep(record, seat, msg.action, result, now, { automatic: msg.auto === true });
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
