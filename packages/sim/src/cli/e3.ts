/** `pnpm sim:e3`: a medição do bloco E3 + F2 + F3 (não entra no `pnpm check`). Grava reports/e3.{json,md}. */
import { e3Experiment, renderE3 } from '../experiments/e3.ts';
import { writeReport } from '../report.ts';
import { parseArgs } from './args.ts';

const { values } = parseArgs({ options: { partidas: { type: 'string' } } });
const games = Number(values.partidas ?? 1000);
const started = performance.now();
const report = e3Experiment(games, (line) => console.log(`… ${line}`));
const markdown = renderE3(report);
console.log(`\n${markdown}`);
const paths = writeReport('e3', report, markdown);
console.log(`Tempo: ${((performance.now() - started) / 1000).toFixed(0)} s · ${paths.join(' · ')}`);
