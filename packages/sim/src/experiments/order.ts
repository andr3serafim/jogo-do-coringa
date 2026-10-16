import { applyAction, viewFor, type GameState, type PlayerId, type RulesConfig } from '@coringa/engine';
import { prefersFirst } from '../bots/greedy.ts';
import { BOTS } from '../bots/index.ts';
import { runGame } from '../match.ts';
import { createRng } from '../rng.ts';
import { determinize } from './determinize.ts';
import { mean, score, stdev } from './outcome.ts';

export interface OrderOptions {
  config: RulesConfig;
  /** Partidas greedy × greedy de onde saem os pontos de decisão (1 sorteado por partida). */
  games: number;
  /** Rollouts por opção em cada ponto (os mesmos K para "1º" e "2º"). */
  rollouts: number;
  seedPrefix?: string;
}

export interface OrderPoint {
  seed: string;
  round: number;
  /** Média de (pontos indo 1º − pontos indo 2º) do jogador que escolhe. */
  difference: number;
  /** Erro padrão da diferença pareada. */
  stderr: number;
  verdict: 'FIRST' | 'SECOND' | 'TIE';
}

export interface OrderReport {
  points: number;
  /** Fração dos pontos decisivos (fora do ruído) em que ir 1º é melhor. Meta: 30–70%. */
  firstBetter: number;
  /** Fração dos pontos em que a diferença sai do ruído. Meta: ≥ 20% (senão a escolha não importa). */
  decisive: number;
  /** Diferença média (direção) e média do |diferença| nos pontos decisivos (tamanho). */
  meanDifference: number;
  meanDecisiveSize: number;
  /** Secundária, só informativa: com que frequência o greedy escolhe ir 1º nesses pontos. */
  greedyFirst: number;
  detail: OrderPoint[];
}

/** Estados de Escolha da iniciativa de uma partida greedy × greedy. */
function decisionPoints(config: RulesConfig, seed: string): GameState[] {
  const points: GameState[] = [];
  runGame({
    config,
    seed,
    bots: [BOTS.greedy, BOTS.greedy],
    onStep: (_before, after) => {
      if (after.phase.kind === 'ORDER_CHOICE') points.push(after);
    },
  });
  return points;
}

function rollout(state: GameState, chooser: PlayerId, first: boolean, seed: string, config: RulesConfig): number {
  const chosen = applyAction(state, chooser, { type: 'CHOOSE_ORDER', first });
  if (!chosen.ok) throw new Error(chosen.error.message);
  const result = runGame({ config, seed, initial: chosen.state, bots: [BOTS.greedy, BOTS.greedy], botSeed: `${seed}/bots` }).result;
  return score(result, chooser);
}

/**
 * Métrica contrafactual da Escolha da ordem (spec §3): em cada ponto, K rollouts pareados por opção,
 * cada um com a informação oculta reamostrada pela própria semente (sem espiar o monte real).
 */
export function orderExperiment(options: OrderOptions): OrderReport {
  const prefix = options.seedPrefix ?? 'ordem';
  const detail: OrderPoint[] = [];
  let greedyFirst = 0;
  for (let i = 0; i < options.games; i += 1) {
    const seed = `${prefix}-${i}`;
    const points = decisionPoints(options.config, seed);
    if (points.length === 0) continue;
    const state = createRng(`${seed}/ponto`).pick(points);
    if (state.phase.kind !== 'ORDER_CHOICE') continue;
    const chooser = state.phase.player;
    const diffs: number[] = [];
    for (let k = 0; k < options.rollouts; k += 1) {
      const rolloutSeed = `${seed}/r${k}`;
      const world = determinize(state, chooser, rolloutSeed);
      diffs.push(rollout(world, chooser, true, rolloutSeed, options.config) - rollout(world, chooser, false, rolloutSeed, options.config));
    }
    const difference = mean(diffs);
    const stderr = stdev(diffs) / Math.sqrt(diffs.length);
    const decisive = stderr === 0 ? difference !== 0 : Math.abs(difference) > 2 * stderr;
    const verdict = !decisive ? 'TIE' : difference > 0 ? 'FIRST' : 'SECOND';
    detail.push({ seed, round: state.round, difference, stderr, verdict });
    if (prefersFirst(viewFor(state, chooser))) greedyFirst += 1;
  }
  const decisivePoints = detail.filter((p) => p.verdict !== 'TIE');
  return {
    points: detail.length,
    firstBetter: decisivePoints.length === 0 ? 0 : decisivePoints.filter((p) => p.verdict === 'FIRST').length / decisivePoints.length,
    decisive: detail.length === 0 ? 0 : decisivePoints.length / detail.length,
    meanDifference: mean(detail.map((p) => p.difference)),
    meanDecisiveSize: mean(decisivePoints.map((p) => Math.abs(p.difference))),
    greedyFirst: detail.length === 0 ? 0 : greedyFirst / detail.length,
    detail,
  };
}
