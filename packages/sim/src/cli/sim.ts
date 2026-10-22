/** `pnpm sim`: uma série de partidas bot × bot com métricas e metas da spec §3. */
import { makeConfig, validateConfig } from '@coringa/engine';
import { resurrectionsText } from '../calibrate.ts';
import { checkTargets, summarize } from '../metrics.ts';
import { pct, textTable, writeReport } from '../report.ts';
import { runSeries } from '../series.ts';
import { botName, configFromArgs, parseArgs, positiveInt, RULE_OPTIONS } from './args.ts';

function main(): void {
  const { values } = parseArgs({
    options: { ...RULE_OPTIONS, bots: { type: 'string', default: 'greedy,greedy' }, partidas: { type: 'string', default: '500' }, semente: { type: 'string', default: 'jogo' } },
  });
  const [a, b = a] = (values.bots ?? '').split(',');
  const bots = [botName(a), botName(b)] as const;
  const overrides = configFromArgs(values);
  const config = makeConfig(overrides);
  const error = validateConfig(config);
  if (error) throw new Error(error.message);
  const games = positiveInt(values.partidas ?? '', '--partidas');

  const started = performance.now();
  const metrics = summarize(runSeries(config, [bots[0], bots[1]], games, values.semente));
  const seconds = ((performance.now() - started) / 1000).toFixed(1);
  const targets = checkTargets(metrics);
  console.log(`${bots[0]} × ${bots[1]} · ${games} partidas · ${seconds} s · regras ${JSON.stringify(overrides)}`);
  console.log(textTable(['Métrica', 'Valor', 'Meta', 'Ok'], targets.map((t) => [t.metric, t.metric.startsWith('Duração') ? t.value : pct(t.value), t.target, t.ok ? 'sim' : 'NÃO'])));
  console.log(`\nRessurreições por partida (méd · p90 · máx · ≥3): ${resurrectionsText(metrics)}`);
  console.log(`\nMotivos de fim: ${Object.entries(metrics.endReasons).map(([k, v]) => `${k} ${pct(v)}`).join(' · ')}`);
  const paths = writeReport(`sim-${Date.now()}`, { bots, games, overrides, metrics, targets });
  console.log(`\nJSON: ${paths[0]}`);
}

// Argumento ruim (`--partidas abc`, bot desconhecido, regra inválida) sai como uma linha de erro, como no `pnpm play` e no `pnpm bot`.
try {
  main();
} catch (e) {
  console.error(`erro: ${e instanceof Error ? e.message : String(e)}`);
  process.exitCode = 1;
}
