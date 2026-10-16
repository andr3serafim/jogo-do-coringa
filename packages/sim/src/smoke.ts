/**
 * Smoke do simulador no Node puro (roda no `pnpm check`): carrega todos os módulos sem bundler,
 * joga poucas partidas de cada bot, uma calibração em miniatura e uma partida de terminal roteirizada.
 */
import { makeConfig } from '@coringa/engine';
import { calibrate, SECTIONS } from './calibrate.ts';
import { scriptedIo } from './play/io.ts';
import { playGame } from './play/game.ts';
import { recordGolden } from './golden.ts';

const started = performance.now();
const report = calibrate({ games: 3, orderGames: 2, rollouts: 2, sections: SECTIONS });
if (report.base.some((s) => s.metrics.terminated !== 1)) throw new Error('smoke: partida que não terminou');
if (recordGolden().length === 0) throw new Error('smoke: sem partidas de referência');
const { result } = await playGame({ io: scriptedIo(() => '1'), seed: 'smoke', bot: 'greedy', config: makeConfig(), saveDir: null });
console.log(`smoke do simulador ok: calibração mínima, partidas de referência e jogo no terminal (${result?.kind ?? 'interrompida'}) em ${((performance.now() - started) / 1000).toFixed(1)} s`);
