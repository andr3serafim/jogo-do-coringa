import { actingPlayers, applyAction, legalActions, viewFor, type Action, type GameState, type Phase, type PlayerId } from '@coringa/engine';
import { determinize } from '../experiments/determinize.ts';
import { createRng, type Rng } from '../rng.ts';
import { boardScore, placeAll, upcomingPressure } from './eval.ts';
import { greedyBot } from './greedy.ts';
import type { StateBot } from './types.ts';

type EquipAction = Extract<Action, { type: 'EQUIP' }>;
const isEquip = (a: Action): a is EquipAction => a.type === 'EQUIP';

/** Limites da busca do Difícil. Mais rollouts e candidatas deixam o bot mais forte e a decisão mais lenta. */
export interface HardOptions {
  /** Rollouts por candidata. Cada um joga num mundo sorteado (`determinize`), o mesmo para todas as candidatas. */
  rolloutsPerCandidate: number;
  /** Quantas ações a busca avalia, na ordem do greedy (a escolha dele primeiro). */
  maxCandidates: number;
  /**
   * Onde a busca roda e até onde cada rollout joga: por fase da decisão, quantas rodadas de Ataque terminam no rollout (a atual,
   * se a decisão já está nela). Fase que não consta não busca: vale a escolha do greedy, sem rollout.
   */
  horizon: Partial<Record<Phase['kind'], number>>;
}

/**
 * Valores do portão (reports/dificil.md). O Equipar olha 2 rodadas de Ataque e a fase principal do Ataque, 3; a ordem do
 * ataque e a reação ficam com o greedy, porque a busca não melhorou nenhuma das duas na medição e só gastava tempo.
 */
export const HARD_DEFAULTS: HardOptions = { rolloutsPerCandidate: 8, maxCandidates: 4, horizon: { EQUIP: 2, ATTACK_MAIN: 3 } };

/** Valor de ganhar ou perder a partida no rollout; empate vale 0. Ordens de grandeza acima de qualquer avaliação de mesa. */
const GAME_VALUE = 1000;

/** Trava de segurança: nenhuma rodada de Ataque chega perto disso; se acontecer, o rollout é avaliado onde parou. */
const ROLLOUT_STEP_CAP = 400;

/** Valor, do ponto de vista de `seat`, de um estado no fim do rollout: o resultado da partida, ou vida e mesa. */
function evaluate(final: GameState, seat: PlayerId): number {
  const phase = final.phase;
  if (phase.kind === 'GAME_OVER') {
    if (phase.result.kind === 'DRAW') return 0;
    return phase.result.winner === seat ? GAME_VALUE : -GAME_VALUE;
  }
  const view = viewFor(final, seat);
  return view.self.hp - view.opponent.hp + boardScore(view.self, view.opponent, upcomingPressure(view));
}

/** Uma rodada de Ataque acabou neste passo (a rodada seguinte já começou). */
const attackRoundEnded = (before: GameState, after: GameState): boolean => before.roundKind === 'ATTACK' && after.round > before.round;

/**
 * Joga `action` por `seat` no mundo sorteado e segue com greedy × greedy até o horizonte. `world` nunca é alterado
 * (`applyAction` copia), então todas as candidatas partem do mesmo mundo. Os dois greedy recebem sempre as mesmas
 * sementes derivadas de `seed`: as candidatas só diferem no que fazem de diferente. Para no fim da partida ou quando `horizon`
 * rodadas de Ataque terminaram.
 */
function rollout(world: GameState, seat: PlayerId, action: Action, seed: string, horizon: number): number {
  const rngs: Record<string, Rng> = Object.fromEntries(world.players.map((p) => [p.id, createRng(`${seed}/${p.id}`)]));
  let before = world;
  let actor = seat;
  let next = action;
  let attackRounds = 0;
  for (let steps = 0; steps < ROLLOUT_STEP_CAP; steps += 1) {
    const result = applyAction(before, actor, next);
    if (!result.ok) throw new Error(`ação ilegal no rollout (${result.error.code}): ${JSON.stringify(next)}`);
    if (result.state.phase.kind === 'GAME_OVER') return evaluate(result.state, seat);
    if (attackRoundEnded(before, result.state)) attackRounds += 1;
    if (attackRounds >= horizon) return evaluate(result.state, seat);
    before = result.state;
    actor = actingPlayers(before)[0];
    const view = viewFor(before, actor);
    next = greedyBot(view, legalActions(view), rngs[actor]);
  }
  return evaluate(before, seat);
}

/**
 * As candidatas em ordem de prioridade: a escolha do greedy primeiro; no Equipar, as outras pela avaliação de mesa
 * que a montagem deixa (maior primeiro, empate na ordem da lista); nas demais fases, as outras na ordem da lista.
 */
function orderCandidates(state: GameState, seat: PlayerId, legal: Action[], seed: string): Action[] {
  const view = viewFor(state, seat);
  const chosen = greedyBot(view, legal, createRng(`${seed}/greedy`));
  // O greedy devolve um elemento da lista, salvo CHOOSE_ORDER e PASS, que ele monta de novo: aí vale a ação equivalente.
  let at = legal.indexOf(chosen);
  if (at < 0) {
    const key = JSON.stringify(chosen);
    at = legal.findIndex((a) => JSON.stringify(a) === key);
  }
  const rest = legal.filter((_, i) => i !== at);
  const head = at < 0 ? [] : [legal[at]];
  if (view.phase.kind !== 'EQUIP') return [...head, ...rest];
  const pressure = upcomingPressure(view);
  const scored = rest
    .filter(isEquip)
    .map((action) => ({ action, value: boardScore(placeAll(view.self, view.self.pending, action.destinations), view.opponent, pressure) }));
  return [...head, ...scored.sort((a, b) => b.value - a.value).map((s) => s.action)];
}

/**
 * O trabalho da busca do Difícil (spec da fatia 1): as candidatas (ver `orderCandidates`, cortadas em `maxCandidates`) e,
 * para cada uma, a soma dos valores de `rolloutsPerCandidate` rollouts em mundos sorteados com a informação oculta
 * reamostrada (`determinize`), cada um até o horizonte da fase (`options.horizon`). Numa fase sem horizonte, a única
 * candidata é a escolha do greedy, sem rollouts. Separada de `hardSearch` para os testes compararem os totais, e não só
 * a ação escolhida. O gerador cede depois de cada rollout.
 *
 * Sem trapaça: do `state`, só se lê o que `seat` vê (a visão) e o que `determinize` reamostra.
 * Mundos compartilhados: o rollout `j` de todas as candidatas usa o mesmo mundo e as mesmas sementes dos greedy,
 * então a comparação entre elas não depende da sorte do sorteio. Gasta uma única chamada do `rng`, e nenhuma
 * quando há uma só ação legal (a única candidata, sem rollouts).
 */
export function* hardSearchTotals(
  state: GameState,
  seat: PlayerId,
  legal: Action[],
  rng: Rng,
  options: HardOptions = HARD_DEFAULTS,
): Generator<void, { candidates: Action[]; totals: number[] }> {
  if (legal.length === 0) throw new Error('hardSearch sem ação legal');
  if (legal.length === 1) return { candidates: legal, totals: [0] };
  const base = `hard-${rng.int(2 ** 31)}`;
  const candidates = orderCandidates(state, seat, legal, base).slice(0, Math.max(1, options.maxCandidates));
  const horizon = options.horizon[state.phase.kind];
  if (horizon === undefined) return { candidates: candidates.slice(0, 1), totals: [0] };
  const totals = candidates.map(() => 0);
  for (let j = 0; j < options.rolloutsPerCandidate; j += 1) {
    const world = determinize(state, seat, `${base}/mundo/${j}`);
    for (const [c, action] of candidates.entries()) {
      totals[c] += rollout(world, seat, action, `${base}/jogo/${j}`, horizon);
      yield;
    }
  }
  return { candidates, totals };
}

/**
 * Busca do Difícil: escolhe a candidata de maior soma (`hardSearchTotals`); empate, a primeira na ordem das candidatas.
 * O gerador cede depois de cada rollout, para a interface fatiar a busca em quadros; o retorno é a ação escolhida.
 */
export function* hardSearch(
  state: GameState,
  seat: PlayerId,
  legal: Action[],
  rng: Rng,
  options: HardOptions = HARD_DEFAULTS,
): Generator<void, Action> {
  const { candidates, totals } = yield* hardSearchTotals(state, seat, legal, rng, options);
  let best = 0;
  for (let c = 1; c < candidates.length; c += 1) {
    if (totals[c] > totals[best]) best = c;
  }
  return candidates[best];
}

/** A busca inteira de uma vez (o simulador e os testes). */
export const runHard: StateBot = (state, seat, legal, rng) => {
  const search = hardSearch(state, seat, legal, rng);
  let step = search.next();
  while (!step.done) step = search.next();
  return step.value;
};
