/** `pnpm sim:calibrate`: job de calibração (não entra no `pnpm check`). Grava reports/calibracao.{json,md}. */
import { calibrate, DEFAULT_CALIBRATION, renderMarkdown, SECTIONS, type Section } from '../calibrate.ts';
import { writeReport } from '../report.ts';
import { parseArgs } from './args.ts';

const { values } = parseArgs({
  options: {
    partidas: { type: 'string' },
    'pontos-ordem': { type: 'string' },
    rollouts: { type: 'string' },
    so: { type: 'string' },
  },
});
const sections = values.so ? (values.so.split(',') as Section[]) : SECTIONS;
for (const s of sections) if (!(SECTIONS as readonly string[]).includes(s)) throw new Error(`seção desconhecida: ${s} (use ${SECTIONS.join(', ')})`);

const options = {
  games: Number(values.partidas ?? DEFAULT_CALIBRATION.games),
  orderGames: Number(values['pontos-ordem'] ?? DEFAULT_CALIBRATION.orderGames),
  rollouts: Number(values.rollouts ?? DEFAULT_CALIBRATION.rollouts),
  sections,
};
const started = performance.now();
const report = calibrate(options, (line) => console.log(`… ${line}`));
const markdown = renderMarkdown(report);
console.log(`\n${markdown}`);
const paths = writeReport('calibracao', report, markdown);
console.log(`Tempo: ${((performance.now() - started) / 1000).toFixed(0)} s · ${paths.join(' · ')}`);
