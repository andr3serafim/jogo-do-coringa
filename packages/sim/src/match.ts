import {
  actingPlayers,
  applyAction,
  createGame,
  legalActions,
  viewFor,
  type GameEvent,
  type GameResult,
  type GameState,
  type PlayerId,
  type ReplayStep,
  type RulesConfig,
} from '@coringa/engine';
import { runHard } from './bots/hard.ts';
import { HARD_BOT, type SeatBot } from './bots/types.ts';
import { createRng, type Rng } from './rng.ts';

export const PLAYERS: [PlayerId, PlayerId] = ['p1', 'p2'];

/**
 * Teto de rodadas do simulador (E1 do sub-projeto 5): sem o anti-travamento nada garante o fim, e a partida em que ninguém ataca
 * seguiria para sempre. Conta como partida sem fim nos relatórios e nunca vira regra.
 */
export const SIM_MAX_ROUNDS = 400;

export type { ReplayStep };

export interface GameSetup {
  config: RulesConfig;
  /** Semente da partida (embaralhamento e iniciativa). */
  seed: string;
  /** bots[0] joga como p1, bots[1] como p2. 'hard' (HARD_BOT) é o Difícil, que busca em cima do estado. */
  bots: [SeatBot, SeatBot];
  /** Semente das escolhas dos bots; padrão `${seed}/bots`. Cada assento recebe a sua. */
  botSeed?: string;
  /** Continua deste estado em vez de criar a partida (ramos dos experimentos). */
  initial?: GameState;
  /** Guarda as ações para replay. */
  record?: boolean;
  /** Padrão `SIM_MAX_ROUNDS`. Chegando ao início da rodada seguinte, a simulação para ali, sem resultado (`capped`). */
  maxRounds?: number;
  /** Trava de segurança, padrão 50 000 (bem acima de 400 rodadas). Estourar conta como partida que não terminou. */
  maxSteps?: number;
  /** Chamado a cada ação; devolver 'stop' encerra a simulação ali (resultado null). */
  onStep?: (before: GameState, after: GameState, events: GameEvent[]) => void | 'stop';
}

export interface GameRecord {
  seed: string;
  /** Quem tinha a iniciativa ao criar a partida (sorteio do motor). */
  initialInitiative: PlayerId;
  /** null = não terminou (teto de rodadas, maxSteps ou parada pelo onStep). */
  result: GameResult | null;
  /** Parou no teto de rodadas (`maxRounds`). */
  capped: boolean;
  /** No teto, algum jogador estava sob Defesa Absoluta: o risco da E1 é ninguém atacá-la e ela durar para sempre. */
  absoluteDefenseAtCap: boolean;
  finalState: GameState;
  steps: number;
  /** Rodadas de Ataque iniciadas (spec §1.3). */
  attackRounds: number;
  eventCounts: Partial<Record<GameEvent['type'], number>>;
  orderChoices: { first: number; second: number };
  replay?: ReplayStep[];
}

/** Rodadas de Ataque até a rodada `round`, pelo ciclo E, E, A, E, A, … */
export const attackRoundsUpTo = (round: number): number => (round < 3 ? 0 : Math.floor((round - 1) / 2));

export function newGame(config: RulesConfig, seed: string): GameState {
  const created = createGame(config, seed, PLAYERS);
  if (!created.ok) throw new Error(`${created.error.code}: ${created.error.message}`);
  return created.state;
}

/** Joga uma partida bot × bot até o fim. Ação ilegal de bot é bug: lança exceção. */
export function runGame(setup: GameSetup): GameRecord {
  let s = setup.initial ?? newGame(setup.config, setup.seed);
  const botSeed = setup.botSeed ?? `${setup.seed}/bots`;
  const rngs: [Rng, Rng] = [createRng(`${botSeed}/p1`), createRng(`${botSeed}/p2`)];
  const maxRounds = setup.maxRounds ?? SIM_MAX_ROUNDS;
  const maxSteps = setup.maxSteps ?? 50_000;
  const record: GameRecord = {
    seed: setup.seed,
    initialInitiative: s.initiative,
    result: null,
    capped: false,
    absoluteDefenseAtCap: false,
    finalState: s,
    steps: 0,
    attackRounds: 0,
    eventCounts: {},
    orderChoices: { first: 0, second: 0 },
    replay: setup.record ? [] : undefined,
  };
  while (s.phase.kind !== 'GAME_OVER' && s.round <= maxRounds && record.steps < maxSteps) {
    const actor = actingPlayers(s)[0];
    const seat = actor === PLAYERS[0] ? 0 : 1;
    const view = viewFor(s, actor);
    const legal = legalActions(view);
    const bot = setup.bots[seat];
    const action = bot === HARD_BOT ? runHard(s, actor, legal, rngs[seat]) : bot(view, legal, rngs[seat]);
    const result = applyAction(s, actor, action);
    if (!result.ok) throw new Error(`bot jogou ação ilegal (${result.error.code}): ${JSON.stringify(action)}`);
    record.replay?.push({ player: actor, action });
    for (const e of result.events) {
      record.eventCounts[e.type] = (record.eventCounts[e.type] ?? 0) + 1;
      if (e.type === 'OrderChosen') record.orderChoices[e.first ? 'first' : 'second'] += 1;
    }
    record.steps += 1;
    const stop = setup.onStep?.(s, result.state, result.events);
    s = result.state;
    if (stop === 'stop') break;
  }
  record.finalState = s;
  record.attackRounds = attackRoundsUpTo(s.round);
  record.result = s.phase.kind === 'GAME_OVER' ? s.phase.result : null;
  record.capped = record.result === null && s.round > maxRounds;
  record.absoluteDefenseAtCap = record.capped && s.players.some((p) => p.absoluteDefense);
  return record;
}
