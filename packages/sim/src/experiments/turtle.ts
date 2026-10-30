import type { GameResult, GameState, PlayerId, RulesConfig } from '@coringa/engine';
import { BOTS } from '../bots/index.ts';
import type { Bot } from '../bots/types.ts';
import { PLAYERS, runGame } from '../match.ts';
import { mean, score } from './outcome.ts';

export interface TurtleOptions {
  config: RulesConfig;
  games: number;
  /** Vantagem mínima de vida, ao fim de uma rodada de Ataque, que define "estar na frente". */
  lead: number;
  seedPrefix?: string;
}

export interface TurtleBranchResult {
  /** Pontos do líder (vitória 1) com ele jogando de turtle. */
  turtle: number;
  /** Pontos do líder com ele seguindo greedy. */
  greedy: number;
  /** Como o turtle-líder terminou: HP, EXODIA, FORFEIT, LOSS, UNFINISHED. */
  turtleEnds: Record<string, number>;
}

export interface TurtleReport extends TurtleBranchResult {
  lead: number;
  games: number;
  /** Partidas em que alguém abriu a vantagem (pontos de ramificação). */
  branches: number;
  /** turtle − greedy; meta da spec §3: ≤ 0. */
  difference: number;
}

/** Primeiro estado, no início de uma rodada de Equipar, em que alguém lidera por `lead` ou mais. */
export function findLead(config: RulesConfig, seed: string, lead: number): { state: GameState; leader: PlayerId } | null {
  let found: { state: GameState; leader: PlayerId } | null = null;
  runGame({
    config,
    seed,
    bots: [BOTS.greedy, BOTS.greedy],
    onStep: (_before, after, events) => {
      const equipStarted = events.some((e) => e.type === 'RoundStarted' && e.kind === 'EQUIP');
      if (!equipStarted || after.phase.kind === 'GAME_OVER') return;
      const [a, b] = after.players;
      if (Math.abs(a.hp - b.hp) < lead) return;
      found = { state: after, leader: a.hp > b.hp ? a.id : b.id };
      return 'stop';
    },
  });
  return found;
}

function endOf(result: GameResult | null, leader: PlayerId): string {
  if (!result) return 'UNFINISHED';
  return result.winner === leader ? result.reason : 'LOSS';
}

/** Desenho pareado (spec §3): do mesmo estado e com as mesmas sementes, o líder vira turtle num ramo e segue greedy no outro. */
export function turtleExperiment(options: TurtleOptions): TurtleReport {
  const prefix = options.seedPrefix ?? 'turtle';
  const turtleScores: number[] = [];
  const greedyScores: number[] = [];
  const turtleEnds: Record<string, number> = {};
  for (let i = 0; i < options.games; i += 1) {
    const seed = `${prefix}-${i}`;
    const point = findLead(options.config, seed, options.lead);
    if (!point) continue;
    const leaderSeat = point.leader === PLAYERS[0] ? 0 : 1;
    const branch = (leaderBot: Bot): GameResult | null => {
      const bots: [Bot, Bot] = [BOTS.greedy, BOTS.greedy];
      bots[leaderSeat] = leaderBot;
      return runGame({ config: options.config, seed, initial: point.state, bots, botSeed: `${seed}/ramo` }).result;
    };
    const asTurtle = branch(BOTS.turtle);
    turtleScores.push(score(asTurtle, point.leader));
    greedyScores.push(score(branch(BOTS.greedy), point.leader));
    const end = endOf(asTurtle, point.leader);
    turtleEnds[end] = (turtleEnds[end] ?? 0) + 1;
  }
  const turtle = mean(turtleScores);
  const greedy = mean(greedyScores);
  return { lead: options.lead, games: options.games, branches: turtleScores.length, turtle, greedy, difference: turtle - greedy, turtleEnds };
}
