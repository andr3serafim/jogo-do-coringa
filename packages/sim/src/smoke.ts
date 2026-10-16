/** Smoke do simulador no Node puro (roda no `pnpm check`): carrega os módulos sem bundler e joga partidas. */
import { makeConfig } from '@coringa/engine';
import { randomBot } from './bots/random.ts';
import { runGame } from './match.ts';

const started = performance.now();
for (let i = 0; i < 5; i += 1) {
  const r = runGame({ config: makeConfig(), seed: `smoke-${i}`, bots: [randomBot, randomBot] });
  if (!r.result) throw new Error(`smoke: a partida smoke-${i} não terminou`);
}
console.log(`smoke do simulador ok: 5 partidas em ${((performance.now() - started) / 1000).toFixed(1)} s`);
