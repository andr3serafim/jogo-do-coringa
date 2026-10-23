import { applyAction } from '../src/apply-action.ts';
import { createGame } from '../src/create-game.ts';
import type { GameEvent, GameState, Replay } from '../src/types.ts';

/** Reexecuta a partida no motor. Uma ação recusada falha no passo exato. */
export function runReplay(replay: Replay): { state: GameState; events: GameEvent[] } {
  const created = createGame(replay.config, replay.seed, replay.players);
  if (!created.ok) throw new Error(`${replay.name}: ${created.error.message}`);
  let state = created.state;
  const events: GameEvent[] = [];
  replay.steps.forEach(({ player, action }, i) => {
    const result = applyAction(state, player, action);
    if (!result.ok) {
      throw new Error(`${replay.name}, passo ${i}: ${result.error.code} em ${JSON.stringify(action)}`);
    }
    state = result.state;
    events.push(...result.events);
  });
  return { state, events };
}

/** Resumo comparado no snapshot: resultado, rodadas, vida final e contagem de eventos por tipo. */
export function summarizeReplay(replay: Replay): object {
  const { state, events } = runReplay(replay);
  const counts: Record<string, number> = {};
  for (const e of events) counts[e.type] = (counts[e.type] ?? 0) + 1;
  return {
    name: replay.name,
    result: state.phase.kind === 'GAME_OVER' ? state.phase.result : null,
    rounds: state.round,
    finalHp: Object.fromEntries(state.players.map((p) => [p.id, p.hp])),
    events: Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b))),
  };
}
