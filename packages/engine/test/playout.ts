import { actingPlayers } from '../src/acting.ts';
import { applyAction } from '../src/apply-action.ts';
import { makeConfig, type ConfigOverrides } from '../src/config.ts';
import { createGame } from '../src/create-game.ts';
import { legalActions } from '../src/legal-actions.ts';
import { viewFor } from '../src/view.ts';
import type { Action, GameEvent, GameState, PlayerId, PlayerView } from '../src/types.ts';
import { P1, P2 } from './helpers.ts';

export { actingPlayers };

/** Escolhe a jogada do ator entre as legais. `step` é o número do passo, útil para variar desempates. */
export type Chooser = (legal: Action[], view: PlayerView, step: number) => Action;

export interface PlayoutOptions {
  seed: string;
  /** Escolhas pseudo-aleatórias, reutilizadas em ciclo. */
  choices: number[];
  config?: ConfigOverrides;
  /** Estado inicial (ex.: cenário de `setup`). Sem ele, cria uma partida com `seed` e `config`. */
  initial?: GameState;
  /** Política de jogo. Sem ela, a ação vem de `choices`. */
  chooser?: Chooser;
  maxSteps?: number;
  /** A cada N passos o sistema envia TIMEOUT (0 = nunca). */
  timeoutEvery?: number;
  checkImmutability?: boolean;
  onStep?: (before: GameState, after: GameState, events: GameEvent[]) => void;
}

export function playout(options: PlayoutOptions): { state: GameState; steps: number } {
  let s: GameState;
  if (options.initial) {
    s = options.initial;
  } else {
    const created = createGame(makeConfig(options.config), options.seed, [P1, P2]);
    if (!created.ok) throw new Error(created.error.message);
    s = created.state;
  }
  const maxSteps = options.maxSteps ?? 20_000;
  const every = options.timeoutEvery ?? 0;
  let step = 0;
  while (s.phase.kind !== 'GAME_OVER' && step < maxSteps) {
    const choice = options.choices.length > 0 ? options.choices[step % options.choices.length] : step;
    let actor: PlayerId | 'system';
    let action: Action;
    if (every > 0 && step % every === every - 1) {
      actor = 'system';
      action = { type: 'TIMEOUT' };
    } else {
      const actors = actingPlayers(s);
      actor = actors[choice % actors.length];
      const view = viewFor(s, actor);
      const legal = legalActions(view);
      action = options.chooser ? options.chooser(legal, view, step) : legal[Math.floor(choice / actors.length) % legal.length];
    }
    const snapshot = options.checkImmutability ? JSON.stringify(s) : '';
    const result = applyAction(s, actor, action);
    if (options.checkImmutability && JSON.stringify(s) !== snapshot) {
      throw new Error('applyAction mutou o estado de entrada');
    }
    if (!result.ok) throw new Error(`ação legal rejeitada (${result.error.code}): ${JSON.stringify(action)}`);
    options.onStep?.(s, result.state, result.events);
    s = result.state;
    step += 1;
  }
  return { state: s, steps: step };
}
