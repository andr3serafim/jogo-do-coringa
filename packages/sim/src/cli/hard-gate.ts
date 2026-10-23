/**
 * `pnpm sim:dificil`: o portão do Difícil (job à parte, nunca entra no `pnpm check`). Grava reports/dificil.{json,md}.
 *
 * Cada semente é jogada duas vezes, com os assentos trocados: o mesmo monte e a mesma iniciativa sorteada, então o bot medido
 * fica com a iniciativa em exatamente uma das duas. Três medidas: (a) hard × greedy, pontuação do hard; (b) greedy × easy,
 * pontuação do greedy; (c) tempo por decisão do hard, tirado das partidas de (a).
 */
import { readFileSync } from 'node:fs';
import { arch, cpus, platform } from 'node:os';
import { actingPlayers, legalActions, makeConfig, viewFor, type RulesConfig } from '@coringa/engine';
import { HARD_DEFAULTS, type HardOptions } from '../bots/hard.ts';
import { BOTS } from '../bots/index.ts';
import { HARD_BOT, type SeatBot } from '../bots/types.ts';
import { score } from '../experiments/outcome.ts';
import { PLAYERS, runGame } from '../match.ts';
import { markdownTable, pct, REPORTS_DIR, writeReport } from '../report.ts';
import { parseArgs, positiveInt } from './args.ts';

/** Os limiares do portão (plano da fatia 1, Tarefa 7). */
const THRESHOLDS = { hardVsGreedy: 0.58, greedyVsEasy: 0.65, p95Ms: 300 } as const;
/** Sementes do relatório versionado: 100 sementes × 2 assentos = 200 partidas por medida. */
const FULL_SEEDS = 100;

interface Tally {
  games: number;
  /** Pontos do bot medido (vitória 1, empate ½) sobre as partidas. */
  rate: number;
  /** Erro-padrão da taxa, sqrt(p(1−p)/n). */
  se: number;
  wins: number;
  draws: number;
  losses: number;
  unfinished: number;
  withInitiative: { games: number; rate: number };
  withoutInitiative: { games: number; rate: number };
}

interface Timing {
  decisions: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

interface Round {
  label: string;
  /** Observações desta rodada (o que foi explorado fora do portão, por exemplo), em Markdown. */
  notes: string[];
  hard: HardOptions;
  hardVsGreedy: Tally;
  greedyVsEasy: Tally;
  timing: Timing;
  passes: { hardVsGreedy: boolean; greedyVsEasy: boolean; p95: boolean };
  approved: boolean;
  seconds: number;
}

interface GateReport {
  config: RulesConfig;
  seedPrefix: string;
  seeds: number;
  thresholds: typeof THRESHOLDS;
  machine: string;
  /** As rodadas em ordem; a última é a final (as anteriores são as tentativas de ajuste). */
  rounds: Round[];
}

const { values } = parseArgs({
  options: {
    sementes: { type: 'string' },
    prefixo: { type: 'string' },
    ajuste: { type: 'string' },
    nota: { type: 'string', multiple: true },
  },
});
const seeds = values.sementes === undefined ? FULL_SEEDS : positiveInt(values.sementes, '--sementes');
const seedPrefix = values.prefixo ?? 'dificil';
const adjust = values.ajuste;
const partial = seeds !== FULL_SEEDS || seedPrefix !== 'dificil';
if (adjust !== undefined && partial) throw new Error('--ajuste só vale na execução completa (100 sementes, prefixo "dificil")');

const LEGACY_HORIZON: HardOptions['horizon'] = { EQUIP: 1, ORDER_CHOICE: 1, ATTACK_MAIN: 1, REACTION: 1 };

const config = makeConfig();
// O relatório declara que mediu com a Pressão da mesa: se a config padrão mudar, o texto não pode mentir.
if (!config.tablePressure) throw new Error('o portão é medido com a config padrão e a Pressão da mesa ligada (o texto do relatório diz isso)');

/** Uma semente, uma partida com `subject` no assento `seat`. O tempo entre dois `onStep` é a decisão de quem jogou o passo. */
function playSeat(seed: string, seat: 0 | 1, subject: SeatBot, opponent: SeatBot, decisionMs?: number[]) {
  const me = PLAYERS[seat];
  const bots: [SeatBot, SeatBot] = seat === 0 ? [subject, opponent] : [opponent, subject];
  let last = performance.now();
  const record = runGame({
    config,
    seed,
    bots,
    onStep: decisionMs
      ? (before) => {
          const now = performance.now();
          const actor = actingPlayers(before)[0];
          // Decisão de uma ação só é instantânea e puxaria o p95 para baixo sem medir a busca.
          if (actor === me && legalActions(viewFor(before, actor)).length >= 2) decisionMs.push(now - last);
          last = performance.now();
        }
      : undefined,
  });
  return { points: score(record.result, me), withInitiative: record.initialInitiative === me, ended: record.result !== null };
}

/** `subject` × `opponent` em `seeds` sementes, cada uma com os dois assentos. */
function measure(subject: SeatBot, opponent: SeatBot, label: string, decisionMs?: number[]): Tally {
  const outcomes: Array<ReturnType<typeof playSeat>> = [];
  for (let i = 0; i < seeds; i += 1) {
    for (const seat of [0, 1] as const) outcomes.push(playSeat(`${seedPrefix}-${i}`, seat, subject, opponent, decisionMs));
    if ((i + 1) % 20 === 0 || i + 1 === seeds) console.log(`… ${label}: ${i + 1}/${seeds} sementes`);
  }
  const rateOf = (os: typeof outcomes) => (os.length === 0 ? 0 : os.reduce((a, o) => a + o.points, 0) / os.length);
  const withI = outcomes.filter((o) => o.withInitiative);
  const withoutI = outcomes.filter((o) => !o.withInitiative);
  const rate = rateOf(outcomes);
  return {
    games: outcomes.length,
    rate,
    se: Math.sqrt((rate * (1 - rate)) / outcomes.length),
    wins: outcomes.filter((o) => o.ended && o.points === 1).length,
    draws: outcomes.filter((o) => o.ended && o.points === 0.5).length,
    losses: outcomes.filter((o) => o.ended && o.points === 0).length,
    unfinished: outcomes.filter((o) => !o.ended).length,
    withInitiative: { games: withI.length, rate: rateOf(withI) },
    withoutInitiative: { games: withoutI.length, rate: rateOf(withoutI) },
  };
}

/** Percentil pelo posto mais próximo (o menor valor com pelo menos `p` das medidas até ele). */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0;
  return sorted[Math.max(0, Math.ceil(p * sorted.length) - 1)];
}

function runRound(label: string, notes: string[]): Round {
  const started = performance.now();
  const decisionMs: number[] = [];
  const hardVsGreedy = measure(HARD_BOT, BOTS.greedy, 'hard × greedy', decisionMs);
  const greedyVsEasy = measure(BOTS.greedy, BOTS.easy, 'greedy × easy');
  const sorted = decisionMs.toSorted((a, b) => a - b);
  const timing: Timing = {
    decisions: sorted.length,
    p50Ms: percentile(sorted, 0.5),
    p95Ms: percentile(sorted, 0.95),
    maxMs: sorted.at(-1) ?? 0,
  };
  const passes = {
    hardVsGreedy: hardVsGreedy.rate >= THRESHOLDS.hardVsGreedy,
    greedyVsEasy: greedyVsEasy.rate >= THRESHOLDS.greedyVsEasy,
    p95: timing.p95Ms <= THRESHOLDS.p95Ms,
  };
  return {
    label,
    notes,
    hard: { ...HARD_DEFAULTS },
    hardVsGreedy,
    greedyVsEasy,
    timing,
    passes,
    approved: passes.hardVsGreedy && passes.greedyVsEasy && passes.p95,
    seconds: (performance.now() - started) / 1000,
  };
}

const ms = (x: number): string => `${x.toFixed(0)} ms`;
const yesNo = (ok: boolean): string => (ok ? 'sim' : 'NÃO');
const margin = (rate: number, se: number, threshold: number): string => (se === 0 ? 'n/d' : `${((rate - threshold) / se).toFixed(1)} EP`);

const horizonText = (h: HardOptions['horizon']): string =>
  Object.entries(h)
    .map(([phase, rounds]) => `${phase} ${rounds}`)
    .join(', ') + ' (as outras fases: greedy, sem busca)';

function tallyLine(name: string, t: Tally): string {
  return `${name}: vitórias/empates/derrotas/sem fim ${t.wins}/${t.draws}/${t.losses}/${t.unfinished}; com a iniciativa ${pct(t.withInitiative.rate)} (${t.withInitiative.games} partidas), sem ela ${pct(t.withoutInitiative.rate)} (${t.withoutInitiative.games}).`;
}

function reasonText(rounds: Round[]): string {
  const last = rounds.at(-1)!;
  const failed = (r: Round) =>
    [
      !r.passes.hardVsGreedy && `(a) ${pct(r.hardVsGreedy.rate)} < ${pct(THRESHOLDS.hardVsGreedy)}`,
      !r.passes.greedyVsEasy && `(b) ${pct(r.greedyVsEasy.rate)} < ${pct(THRESHOLDS.greedyVsEasy)}`,
      !r.passes.p95 && `p95 ${ms(r.timing.p95Ms)} > ${THRESHOLDS.p95Ms} ms`,
    ]
      .filter(Boolean)
      .join('; ');
  if (rounds.length === 1) {
    return last.approved
      ? 'Os valores padrão (`HARD_DEFAULTS`) aprovaram na primeira rodada; nenhum ajuste foi necessário.'
      : `Os valores padrão reprovaram (${failed(last)}) e não houve rodada de ajuste neste relatório.`;
  }
  if (last.approved) {
    const earlier = rounds
      .slice(0, -1)
      .map((r, i) => `rodada ${i + 1} (${failed(r)})`)
      .join('; ');
    return `A rodada ${rounds.length} é a primeira que aprova os três limiares; as anteriores reprovaram: ${earlier}. Os valores finais são os dela.`;
  }
  const all = rounds.map((r, i) => `rodada ${i + 1} (${failed(r)})`).join('; ');
  return `Nenhuma das ${rounds.length} rodadas aprovou: ${all}. O nível Difícil não entra: a oferta da interface fica só com Fácil e Médio.`;
}

function renderMarkdown(report: GateReport): string {
  const final = report.rounds.at(-1)!;
  const { hardVsGreedy: a, greedyVsEasy: b, timing: t } = final;
  const th = report.thresholds;
  const lines: string[] = [
    '# Portão do Difícil',
    '',
    `**Veredito: ${final.approved ? 'APROVADO' : 'REPROVADO'}.** (a) ${pct(a.rate)} (limiar ${pct(th.hardVsGreedy)}), (b) ${pct(b.rate)} (limiar ${pct(th.greedyVsEasy)}), p95 ${ms(t.p95Ms)} (limiar ${th.p95Ms} ms).`,
    '',
    '> **Os números foram medidos COM a Pressão da mesa (`tablePressure: true`), que será removida no sub-projeto 5; nessa hora o portão tem que ser medido de novo, sem ela.**',
    '',
    '## Como foi medido',
    '',
    `- Config: a padrão, \`makeConfig()\` (Pressão da mesa ligada): \`${JSON.stringify(report.config)}\`.`,
    `- Sementes: \`${report.seedPrefix}-0 … ${report.seedPrefix}-${report.seeds - 1}\` (${report.seeds} sementes), cada uma jogada duas vezes com os assentos trocados: ${2 * report.seeds} partidas por medida. O mesmo monte e a mesma iniciativa sorteada em cada par: o bot medido fica com a iniciativa em exatamente uma das duas.`,
    `- Difícil medido (\`HARD_DEFAULTS\`): \`${JSON.stringify(final.hard)}\`.`,
    `- Máquina: ${report.machine}. O tempo por decisão depende dela.`,
    '- Pontuação: vitória 1, empate ½, derrota ou partida sem fim 0. Erro-padrão (EP) da taxa: sqrt(p(1−p)/n), com as partidas tratadas como independentes; a margem diz a quantos EP a taxa está do limiar. O veredito usa só os limiares.',
    '- Tempo por decisão: do Difícil, nas partidas de (a), só nas decisões com 2 ou mais ações legais (as de uma ação só são instantâneas e puxariam o p95 para baixo). Mede a ação inteira de um passo (visão, ações legais, busca, motor). Percentil pelo posto mais próximo.',
    '',
    '## Resultado',
    '',
    markdownTable(
      ['Medida', 'Valor', 'EP', 'Limiar', 'Margem', 'Passa'],
      [
        ['(a) hard × greedy: pontuação do hard', pct(a.rate), pct(a.se), `≥ ${pct(th.hardVsGreedy)}`, margin(a.rate, a.se, th.hardVsGreedy), yesNo(final.passes.hardVsGreedy)],
        ['(b) greedy × easy: pontuação do greedy', pct(b.rate), pct(b.se), `≥ ${pct(th.greedyVsEasy)}`, margin(b.rate, b.se, th.greedyVsEasy), yesNo(final.passes.greedyVsEasy)],
        ['(c) p95 do tempo por decisão do hard', ms(t.p95Ms), '', `≤ ${th.p95Ms} ms`, '', yesNo(final.passes.p95)],
      ],
    ),
    '',
    `- ${tallyLine('(a) hard', a)}`,
    `- ${tallyLine('(b) greedy', b)}`,
    '',
    '### Tempo por decisão do hard',
    '',
    markdownTable(['Decisões (≥ 2 ações)', 'p50', 'p95', 'Máx'], [[t.decisions, ms(t.p50Ms), ms(t.p95Ms), ms(t.maxMs)]]),
    '',
  ];
  if (report.rounds.length > 1) {
    lines.push(
      '## Rodadas de ajuste',
      '',
      markdownTable(
        ['Rodada', 'O que mudou', 'Rollouts', 'Candidatas', 'Horizonte (rodadas de Ataque)', '(a)', '(b)', 'p95', 'Veredito'],
        report.rounds.map((r, i) => [
          i + 1,
          r.label,
          r.hard.rolloutsPerCandidate,
          r.hard.maxCandidates,
          horizonText(r.hard.horizon),
          `${pct(r.hardVsGreedy.rate)} ± ${pct(r.hardVsGreedy.se)}`,
          `${pct(r.greedyVsEasy.rate)} ± ${pct(r.greedyVsEasy.se)}`,
          ms(r.timing.p95Ms),
          r.approved ? 'aprovado' : 'reprovado',
        ]),
      ),
      '',
      ...report.rounds.flatMap((r, i) => r.notes.flatMap((note) => [`**Rodada ${i + 1}.** ${note}`, ''])),
    );
  }
  lines.push('## Por que estes valores', '', reasonText(report.rounds), '', 'Para repetir: `pnpm sim:dificil` (a execução completa leva alguns minutos).', '');
  return lines.join('\n');
}

function previousRounds(): Round[] {
  const path = `${REPORTS_DIR}dificil.json`;
  let previous: GateReport;
  try {
    previous = JSON.parse(readFileSync(path, 'utf8')) as GateReport;
  } catch (error) {
    throw new Error(`--ajuste continua o relatório anterior, mas ${path} não pôde ser lido: ${(error as Error).message}`, { cause: error });
  }
  // As rodadas gravadas antes de o `HardOptions` ter horizonte jogavam até o fim de uma rodada de Ataque, em toda fase.
  return previous.rounds.map((r) => ({ ...r, notes: r.notes ?? [], hard: { ...r.hard, horizon: r.hard.horizon ?? LEGACY_HORIZON } }));
}

const started = performance.now();
console.log(`… portão do Difícil: ${seeds} sementes × 2 assentos, rollouts ${HARD_DEFAULTS.rolloutsPerCandidate} × candidatas ${HARD_DEFAULTS.maxCandidates}`);
const round = runRound(adjust ?? 'padrão (`HARD_DEFAULTS`)', values.nota ?? []);
const report: GateReport = {
  config,
  seedPrefix,
  seeds,
  thresholds: THRESHOLDS,
  machine: `Node ${process.version}, ${platform()} ${arch()}, ${cpus()[0]?.model.trim() ?? 'CPU desconhecida'} (${cpus().length} núcleos)`,
  rounds: [...(adjust === undefined ? [] : previousRounds()), round],
};
const markdown = renderMarkdown(report);
console.log(`\n${markdown}`);
if (partial) {
  console.log('Execução parcial: relatório não gravado (só a de 100 sementes com o prefixo "dificil" grava).');
} else {
  const paths = writeReport('dificil', report, markdown);
  console.log(`Tempo: ${((performance.now() - started) / 1000).toFixed(0)} s · ${paths.join(' · ')}`);
}
