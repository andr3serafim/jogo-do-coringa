import { makeConfig, type ConfigOverrides } from '@coringa/engine';
import type { BotName } from './bots/index.ts';
import { orderExperiment, type OrderReport } from './experiments/order.ts';
import { turtleExperiment, type TurtleReport } from './experiments/turtle.ts';
import { checkTargets, summarize, type Metrics, type TargetCheck } from './metrics.ts';
import { markdownTable, pct } from './report.ts';
import { runSeries } from './series.ts';

export const SECTIONS = ['base', 'toggles', 'turtle', 'order', 'sweep'] as const;
export type Section = (typeof SECTIONS)[number];

export interface CalibrationOptions {
  /** Partidas por série (1000 → margem de ~±3 pp numa taxa de 50%). */
  games: number;
  /** Partidas de onde saem os pontos de decisão da métrica contrafactual da ordem. */
  orderGames: number;
  /** Rollouts por opção em cada ponto de decisão. */
  rollouts: number;
  sections: readonly Section[];
}

export const DEFAULT_CALIBRATION: CalibrationOptions = { games: 1000, orderGames: 200, rollouts: 16, sections: SECTIONS };

export interface SeriesResult {
  label: string;
  bots: [BotName, BotName];
  config: ConfigOverrides;
  metrics: Metrics;
  targets: TargetCheck[];
}

export interface CalibrationReport {
  options: CalibrationOptions;
  base: SeriesResult[];
  /** Variantes com uma regra [N] desligada por vez, greedy × greedy, mesmas sementes. */
  toggles: SeriesResult[];
  /** Desenho pareado do turtle (a brecha que a Pressão da mesa fechava, removida no sub-projeto 5). */
  turtle: TurtleReport[];
  order: OrderReport | null;
  sweep: SeriesResult[];
}

const BASE: Array<[string, [BotName, BotName]]> = [
  ['greedy × greedy', ['greedy', 'greedy']],
  ['random × random', ['random', 'random']],
  ['turtle × greedy', ['turtle', 'greedy']],
];

const TOGGLES: Array<[string, ConfigOverrides]> = [
  ['padrão', {}],
  ['sem Escolha da iniciativa', { initiativeChoice: false }],
  ['sem Coringas Selvagens', { wildJokers: false }],
];

/** Varredura da spec §3: vida, tamanho da fileira e composição do baralho. */
export const SWEEP: Array<[string, ConfigOverrides]> = [
  ...[100, 200, 250, 350, 400].map((hp): [string, ConfigOverrides] => [`hp ${hp}`, { hp }]),
  ...[5, 6, 8, 9].map((rowLimit): [string, ConfigOverrides] => [`fileira ${rowLimit}`, { rowLimit }]),
  ...[4, 8].map((faceCopies): [string, ConfigOverrides] => [`${faceCopies} de cada figura`, { deck: { faceCopies } }]),
  ...[6, 7].map((numericCopies): [string, ConfigOverrides] => [`${numericCopies} de cada numérica`, { deck: { numericCopies } }]),
];

function series(label: string, bots: [BotName, BotName], config: ConfigOverrides, games: number): SeriesResult {
  const metrics = summarize(runSeries(makeConfig(config), bots, games));
  return { label, bots, config, metrics, targets: checkTargets(metrics) };
}

export function calibrate(options: CalibrationOptions, log: (line: string) => void = () => {}): CalibrationReport {
  const has = (s: Section) => options.sections.includes(s);
  const report: CalibrationReport = { options, base: [], toggles: [], turtle: [], order: null, sweep: [] };
  if (has('base')) {
    for (const [label, bots] of BASE) {
      log(`série base: ${label}`);
      report.base.push(series(label, bots, {}, options.games));
    }
  }
  if (has('toggles')) {
    for (const [label, config] of TOGGLES) {
      log(`regras: ${label}`);
      report.toggles.push(series(label, ['greedy', 'greedy'], config, options.games));
    }
  }
  if (has('turtle')) {
    for (const lead of [10, 20]) {
      log(`turtle: vantagem ${lead}`);
      report.turtle.push(turtleExperiment({ config: makeConfig(), games: options.games, lead }));
    }
  }
  if (has('order')) {
    log(`ordem: ${options.orderGames} pontos × ${options.rollouts} rollouts`);
    report.order = orderExperiment({ config: makeConfig(), games: options.orderGames, rollouts: options.rollouts });
  }
  if (has('sweep')) {
    for (const [label, config] of SWEEP) {
      log(`varredura: ${label}`);
      report.sweep.push(series(label, ['greedy', 'greedy'], config, options.games));
    }
  }
  return report;
}

const METRIC_HEADERS = ['Série', 'Rodadas ATK (p10–med–p90)', 'Iniciativa vence', 'Exódia', 'Quadra', 'Ressurreições por partida (méd · p90 · máx · ≥3)', 'Anti-trav.', 'Terminam', 'Metas ok'];

/** "0.14 · 1 · 3 · 0.2%": média, p90, máximo e fração de partidas com 3 ou mais Ressurreições. */
export function resurrectionsText(m: Metrics): string {
  const r = m.resurrections;
  return `${r.mean.toFixed(2)} · ${r.p90} · ${r.max} · ${pct(r.atLeast3)}`;
}

function metricRow(s: SeriesResult): Array<string | number> {
  const m = s.metrics;
  return [
    s.label,
    `${m.attackRounds.p10}–${m.attackRounds.median}–${m.attackRounds.p90}`,
    pct(m.initiativeWin),
    pct(m.endReasons.EXODIA),
    pct(m.quads),
    resurrectionsText(m),
    pct(m.endReasons.ANTI_STALL + m.endReasons.DRAW),
    pct(m.terminated),
    `${s.targets.filter((t) => t.ok).length}/${s.targets.length}`,
  ];
}

export function renderMarkdown(r: CalibrationReport): string {
  const out: string[] = [`# Calibração do simulador`, '', `${r.options.games} partidas por série; sementes pareadas entre variantes.`, ''];
  if (r.base.length > 0) {
    out.push('## Séries base (config padrão)', '', markdownTable(METRIC_HEADERS, r.base.map(metricRow)), '');
    for (const s of r.base) {
      out.push(`### Metas — ${s.label}`, '', markdownTable(['Métrica', 'Valor', 'Meta', 'Ok'], s.targets.map((t) => [t.metric, t.metric.startsWith('Duração') ? t.value : pct(t.value), t.target, t.ok ? 'sim' : 'NÃO'])), '');
    }
    const mechanics = Object.keys(r.base[0].metrics.perGame);
    out.push('### Uso das mecânicas (média por partida)', '', markdownTable(['Série', ...mechanics], r.base.map((s) => [s.label, ...mechanics.map((k) => s.metrics.perGame[k as keyof Metrics['perGame']] ?? 0)])), '');
  }
  if (r.toggles.length > 0) {
    out.push('## Regras novas liga/desliga (greedy × greedy)', '', markdownTable([...METRIC_HEADERS, '1º escolhido'], r.toggles.map((s) => [...metricRow(s), s.metrics.orderFirst === null ? 'n/a' : pct(s.metrics.orderFirst)])), '');
  }
  if (r.turtle.length > 0) {
    out.push(
      '## Turtle na mesma situação (desenho pareado)',
      '',
      'O Equipar só permite trocar/descartar com as duas fileiras cheias: com a Defesa cheia, a numérica vai para o Ataque à força. A própria regra já limita a tartaruga.',
      '',
      markdownTable(
        ['Vantagem', 'Ramos', 'Líder turtle', 'Líder greedy', 'Diferença', 'Meta (≤ 0)', 'Fins do turtle'],
        r.turtle.map((t) => [t.lead, t.branches, pct(t.turtle), pct(t.greedy), pct(t.difference), t.difference <= 0 ? 'sim' : 'NÃO', JSON.stringify(t.turtleEnds)]),
      ),
      '',
    );
  }
  if (r.order) {
    const o = r.order;
    out.push(
      '## Escolha da ordem (contrafactual)',
      '',
      markdownTable(
        ['Pontos', 'Decisivos', '1º melhor (entre decisivos)', 'Diferença média', 'Tamanho médio (decisivos)', 'Greedy escolhe 1º (info)', 'Metas ok'],
        [[o.points, pct(o.decisive), pct(o.firstBetter), pct(o.meanDifference), pct(o.meanDecisiveSize), pct(o.greedyFirst), o.firstBetter >= 0.3 && o.firstBetter <= 0.7 && o.decisive >= 0.2 ? 'sim' : 'NÃO']],
      ),
      '',
    );
  }
  if (r.sweep.length > 0) {
    out.push('## Varredura (greedy × greedy)', '', markdownTable(METRIC_HEADERS, r.sweep.map(metricRow)), '');
  }
  return `${out.join('\n')}\n`;
}
