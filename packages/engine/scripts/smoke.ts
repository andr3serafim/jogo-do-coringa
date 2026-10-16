/**
 * Smoke do Node puro: carrega o motor sem bundler nem loader (type stripping do Node 24)
 * e joga partidas até o fim com a primeira ação legal. Roda no `pnpm check`.
 */
import { applyAction, createGame, legalActions, makeConfig, viewFor, type GameState } from '../src/index.ts';

const GAMES = 3;
const MAX_STEPS = 5_000;

for (let g = 0; g < GAMES; g += 1) {
  const created = createGame(makeConfig(), `smoke-${g}`, ['p1', 'p2']);
  if (!created.ok) throw new Error(created.error.message);
  let s: GameState = created.state;
  let steps = 0;
  while (s.phase.kind !== 'GAME_OVER') {
    if (steps >= MAX_STEPS) throw new Error(`a partida smoke-${g} não terminou em ${MAX_STEPS} passos`);
    const actor = s.players.map((p) => p.id).find((id) => legalActions(viewFor(s, id)).length > 0);
    if (!actor) throw new Error('ninguém pode agir');
    const result = applyAction(s, actor, legalActions(viewFor(s, actor))[0]);
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
    s = result.state;
    steps += 1;
  }
}
console.log(`smoke do motor ok: ${GAMES} partidas no Node puro`);
