/**
 * Smoke do simulador no Node puro (roda no `pnpm check`): carrega todos os módulos sem bundler,
 * roda uma calibração em miniatura e grava as partidas de referência em memória.
 */
import { calibrate, SECTIONS } from './calibrate.ts';
import { recordGolden } from './golden.ts';

const started = performance.now();
const report = calibrate({ games: 3, orderGames: 2, rollouts: 2, sections: SECTIONS });
if (report.base.some((s) => s.metrics.terminated !== 1)) throw new Error('smoke: partida que não terminou');
if (recordGolden().length === 0) throw new Error('smoke: sem partidas de referência');
console.log(`smoke do simulador ok: calibração mínima e partidas de referência em ${((performance.now() - started) / 1000).toFixed(1)} s`);
