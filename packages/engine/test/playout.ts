import { applyAction } from '../src/apply-action';
import { makeConfig, type ConfigOverrides } from '../src/config';
import { createGame } from '../src/create-game';
import { legalActions } from '../src/legal-actions';
import { viewFor } from '../src/view';
import type { Action, GameEvent, GameState, PlayerId } from '../src/types';
import { P1, P2 } from './helpers';

export interface PlayoutOptions {
  seed: string;
  /** Escolhas pseudo-aleatórias, reutilizadas em ciclo. */
  choices: number[];
  config?: ConfigOverrides;
  maxSteps?: number;
  /** A cada N passos o sistema envia TIMEOUT (0 = nunca). */
  timeoutEvery?: number;
  checkImmutability?: boolean;
  onStep?: (before: GameState, after: GameState, events: GameEvent[]) => void;
}

/** Quem pode agir agora (no Equipar, quem ainda não confirmou). */
export function actingPlayers(s: GameState): PlayerId[] {
  const phase = s.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return s.players.filter((p) => !p.equipSubmitted).map((p) => p.id);
    case 'ORDER_CHOICE':
      return [phase.player];
    case 'ATTACK_MAIN':
      return [phase.player];
    case 'REACTION':
      return [phase.responder];
    case 'GAME_OVER':
      return [];
  }
}

export function playout(options: PlayoutOptions): { state: GameState; steps: number } {
  const created = createGame(makeConfig(options.config), options.seed, [P1, P2]);
  if (!created.ok) throw new Error(created.error.message);
  let s = created.state;
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
      const legal = legalActions(viewFor(s, actor));
      action = legal[Math.floor(choice / actors.length) % legal.length];
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
