/**
 * `pnpm sim:dificil`: o portão do Difícil (job à parte, nunca entra no `pnpm check`). Grava reports/dificil.{json,md}.
 *
 * Cada semente é jogada duas vezes, com os assentos trocados: o mesmo monte e a mesma iniciativa sorteada, então o bot medido
 * fica com a iniciativa em exatamente uma das duas. Três medidas: (a) hard × greedy, pontuação do hard; (b) greedy × easy,
 * pontuação do greedy; (c) tempo por decisão do hard, tirado das partidas de (a).
 */
import { existsSync, readFileSync } from 'node:fs';
import { arch, cpus, platform } from 'node:os';
import { actingPlayers, legalActions, makeConfig, viewFor, type RulesConfig } from '@coringa/engine';
import { EASY_BLUNDER } from '../bots/easy.ts';
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
/** A rodada inicial e até duas de ajuste (plano da fatia 1, Tarefa 7): depois disso o Difícil, se ainda reprova, não entra. */
const MAX_ROUNDS = 3;

interface Tally {
  games: number;
  /** Pontos do bot medido (vitória 1) sobre as partidas. */
  rate: number;
  /** Erro-padrão da taxa, sqrt(p(1−p)/n). */
  se: number;
  wins: number;
  losses: number;
  unfinished: number;
  withInitiative: { games: number; rate: number };
  withoutInitiative: { games: number; rate: number };
}

interface TimingStats {
  decisions: number;
  p50Ms: number;
  p95Ms: number;
  maxMs: number;
}

interface Timing extends TimingStats {
  /** Só as decisões das fases em que o Difícil busca (as chaves de `HARD_DEFAULTS.horizon`); as outras são do greedy. */
  searching?: TimingStats;
}

/** Os tempos das decisões do hard com 2 ou mais ações legais, em ms: todas e só as das fases com busca. */
interface DecisionTimes {
  all: number[];
  searching: number[];
}

interface Round {
  label: string;
  /** Observações desta rodada (o que foi explorado fora do portão, por exemplo), em Markdown. */
  notes: string[];
  hard: HardOptions;
  /** `EASY_BLUNDER` da rodada. */
  easyBlunder: number;
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
    'nota-rodada': { type: 'string', multiple: true },
    recomecar: { type: 'boolean' },
  },
});
const seeds = values.sementes === undefined ? FULL_SEEDS : positiveInt(values.sementes, '--sementes');
const seedPrefix = values.prefixo ?? 'dificil';
const adjust = values.ajuste;
const partial = seeds !== FULL_SEEDS || seedPrefix !== 'dificil';
const REPORT_PATH = `${REPORTS_DIR}dificil.json`;
if (partial && (adjust !== undefined || values.recomecar || values['nota-rodada'])) {
  throw new Error('--ajuste, --recomecar e --nota-rodada só valem na execução completa (100 sementes, prefixo "dificil")');
}
if (adjust !== undefined && values.recomecar) throw new Error('--ajuste acrescenta uma rodada ao relatório e --recomecar o descarta: use um dos dois');
if (values['nota-rodada'] && adjust === undefined) throw new Error('--nota-rodada anota rodadas do relatório existente e só vale junto com --ajuste');
if (!partial && adjust === undefined && !values.recomecar && existsSync(REPORT_PATH)) {
  throw new Error(
    `${REPORT_PATH} já existe e guarda as rodadas e as notas do portão. Para acrescentar uma rodada: pnpm sim:dificil --ajuste "<o que mudou>". ` +
      'Para jogar fora o histórico e medir do zero: pnpm sim:dificil --recomecar.',
  );
}

/** Fases em que o Difícil busca; as outras decisões dele são do greedy (e não pesam no tempo que o jogador espera). */
const SEARCH_PHASES: ReadonlySet<string> = new Set(Object.keys(HARD_DEFAULTS.horizon));

// Rodadas gravadas antes de os campos existirem: o `HardOptions` não tinha horizonte (o rollout ia até o fim de uma rodada de
// Ataque, em toda fase), o Fácil errava com 0,50 e a rodada inicial se chamava "padrão".
const LEGACY_HORIZON: HardOptions['horizon'] = { EQUIP: 1, ORDER_CHOICE: 1, ATTACK_MAIN: 1, REACTION: 1 };
const LEGACY_EASY_BLUNDER = 0.5;
const LEGACY_LABEL = 'padrão (`HARD_DEFAULTS`)';

const config = makeConfig();

/** Uma semente, uma partida com `subject` no assento `seat`. O tempo entre dois `onStep` é a decisão de quem jogou o passo. */
function playSeat(seed: string, seat: 0 | 1, subject: SeatBot, opponent: SeatBot, times?: DecisionTimes) {
  const me = PLAYERS[seat];
  const bots: [SeatBot, SeatBot] = seat === 0 ? [subject, opponent] : [opponent, subject];
  let last = performance.now();
  const record = runGame({
    config,
    seed,
    bots,
    onStep: times
      ? (before) => {
          const now = performance.now();
          const actor = actingPlayers(before)[0];
          // Decisão de uma ação só é instantânea e puxaria o p95 para baixo sem medir a busca.
          if (actor === me && legalActions(viewFor(before, actor)).length >= 2) {
            times.all.push(now - last);
            if (SEARCH_PHASES.has(before.phase.kind)) times.searching.push(now - last);
          }
          last = performance.now();
        }
      : undefined,
  });
  return { points: score(record.result, me), withInitiative: record.initialInitiative === me, ended: record.result !== null };
}

/** `subject` × `opponent` em `seeds` sementes, cada uma com os dois assentos. */
function measure(subject: SeatBot, opponent: SeatBot, label: string, times?: DecisionTimes): Tally {
  const outcomes: Array<ReturnType<typeof playSeat>> = [];
  for (let i = 0; i < seeds; i += 1) {
    for (const seat of [0, 1] as const) outcomes.push(playSeat(`${seedPrefix}-${i}`, seat, subject, opponent, times));
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

function statsOf(ms: number[]): TimingStats {
  const sorted = ms.toSorted((a, b) => a - b);
  return { decisions: sorted.length, p50Ms: percentile(sorted, 0.5), p95Ms: percentile(sorted, 0.95), maxMs: sorted.at(-1) ?? 0 };
}

function runRound(label: string, notes: string[]): Round {
  const started = performance.now();
  const times: DecisionTimes = { all: [], searching: [] };
  const hardVsGreedy = measure(HARD_BOT, BOTS.greedy, 'hard × greedy', times);
  const greedyVsEasy = measure(BOTS.greedy, BOTS.easy, 'greedy × easy');
  const timing: Timing = { ...statsOf(times.all), searching: statsOf(times.searching) };
  const passes = {
    hardVsGreedy: hardVsGreedy.rate >= THRESHOLDS.hardVsGreedy,
    greedyVsEasy: greedyVsEasy.rate >= THRESHOLDS.greedyVsEasy,
    p95: timing.p95Ms <= THRESHOLDS.p95Ms,
  };
  return {
    label,
    notes,
    hard: { ...HARD_DEFAULTS },
    easyBlunder: EASY_BLUNDER,
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
    .join(', ');

function tallyLine(name: string, t: Tally): string {
  return `${name}: vitórias/derrotas/sem fim ${t.wins}/${t.losses}/${t.unfinished}; com a iniciativa ${pct(t.withInitiative.rate)} (${t.withInitiative.games} partidas), sem ela ${pct(t.withoutInitiative.rate)} (${t.withoutInitiative.games}).`;
}

/** O que a lista de rodadas diz sobre os valores finais: a primeira rodada que aprova, o que veio antes e o que veio depois. */
function reasonText(rounds: Round[], th: GateReport['thresholds']): string {
  const failed = (r: Round): string =>
    [
      !r.passes.hardVsGreedy && `(a) ${pct(r.hardVsGreedy.rate)} < ${pct(th.hardVsGreedy)}`,
      !r.passes.greedyVsEasy && `(b) ${pct(r.greedyVsEasy.rate)} < ${pct(th.greedyVsEasy)}`,
      !r.passes.p95 && `p95 ${ms(r.timing.p95Ms)} > ${th.p95Ms} ms`,
    ]
      .filter(Boolean)
      .join('; ');
  const named = (r: Round, i: number): string => `rodada ${i + 1} (${failed(r)})`;
  const first = rounds.findIndex((r) => r.approved);
  if (first < 0) {
    const all = rounds.map(named).join('; ');
    return rounds.length < MAX_ROUNDS
      ? `Nenhuma rodada aprovou até aqui: ${all}. Restam ${MAX_ROUNDS - rounds.length} rodada(s) de ajuste.`
      : `Nenhuma das ${rounds.length} rodadas aprovou: ${all}. As rodadas de ajuste se esgotaram: o nível Difícil não entra, e a oferta da interface fica só com Fácil e Médio.`;
  }
  const parts =
    first === 0
      ? ['A rodada 1 já aprovou os três limiares; nenhum ajuste foi necessário.']
      : [`A rodada ${first + 1} é a primeira que aprova os três limiares; as anteriores reprovaram: ${rounds.slice(0, first).map(named).join('; ')}. Os valores do Difícil são os dela.`];
  for (const [i, r] of rounds.entries()) {
    if (i <= first) continue;
    const same = JSON.stringify(r.hard) === JSON.stringify(rounds[first].hard);
    const verdict = r.approved ? 'aprovou os três limiares' : `reprovou (${failed(r)})`;
    parts.push(`Rodada ${i + 1} (${r.label}): o Difícil ${same ? 'igual' : 'diferente'} ao da rodada ${first + 1}; ${verdict}.`);
  }
  return parts.join(' ');
}

function timingRows(t: Timing): Array<Array<string | number>> {
  const row = (name: string, x: TimingStats) => [name, x.decisions, ms(x.p50Ms), ms(x.p95Ms), ms(x.maxMs)];
  return [row('todas as fases', t), ...(t.searching ? [row(`só as fases com busca (${[...SEARCH_PHASES].join(', ')})`, t.searching)] : [])];
}

function renderMarkdown(report: GateReport): string {
  const final = report.rounds.at(-1)!;
  const n = report.rounds.length;
  const { hardVsGreedy: a, greedyVsEasy: b, timing: t } = final;
  const th = report.thresholds;
  const lines: string[] = [
    '# Portão do Difícil',
    '',
    `**Veredito${n > 1 ? ` da rodada ${n}, a mais recente` : ''}: ${final.approved ? 'APROVADO' : 'REPROVADO'}.** (a) ${pct(a.rate)} (limiar ${pct(th.hardVsGreedy)}), (b) ${pct(b.rate)} (limiar ${pct(th.greedyVsEasy)}), p95 ${ms(t.p95Ms)} (limiar ${th.p95Ms} ms).`,
    '',
    '## Como foi medido',
    '',
    `- Config: a padrão, \`makeConfig()\`: \`${JSON.stringify(report.config)}\`.`,
    `- Sementes: \`${report.seedPrefix}-0 … ${report.seedPrefix}-${report.seeds - 1}\` (${report.seeds} sementes), cada uma jogada duas vezes com os assentos trocados: ${2 * report.seeds} partidas por medida. O mesmo monte e a mesma iniciativa sorteada em cada par: o bot medido fica com a iniciativa em exatamente uma das duas.`,
    `- Bots da rodada ${n} (os \`HARD_DEFAULTS\` e o \`EASY_BLUNDER\` de então): Difícil \`${JSON.stringify(final.hard)}\`; Fácil erra com probabilidade \`${final.easyBlunder}\`.`,
    `- Máquina: ${report.machine}. O tempo por decisão depende dela.`,
    '- Pontuação: vitória 1, derrota ou partida sem fim 0. Erro-padrão (EP) da taxa: sqrt(p(1−p)/n), com as partidas tratadas como independentes; a margem diz a quantos EP a taxa está do limiar. O veredito usa só os limiares.',
    '- Tempo por decisão: do Difícil, nas partidas de (a), só nas decisões com 2 ou mais ações legais (as de uma ação só são instantâneas e puxariam o p95 para baixo). Mede a ação inteira de um passo (visão, ações legais, busca, motor). Percentil pelo posto mais próximo. O limiar vale para todas as fases; a segunda linha da tabela mostra só as fases em que há busca, que são as que o jogador espera.',
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
    markdownTable(['Decisões com 2 ou mais ações', 'Nº', 'p50', 'p95', 'Máx'], timingRows(t)),
    '',
  ];
  if (n > 1) {
    lines.push(
      '## Rodadas',
      '',
      markdownTable(
        ['Rodada', 'O que mudou', 'Rollouts', 'Candidatas', 'Horizonte', 'Fácil (erro)', '(a)', '(b)', 'p95', 'Veredito'],
        report.rounds.map((r, i) => [
          i + 1,
          r.label,
          r.hard.rolloutsPerCandidate,
          r.hard.maxCandidates,
          horizonText(r.hard.horizon),
          r.easyBlunder,
          `${pct(r.hardVsGreedy.rate)} ± ${pct(r.hardVsGreedy.se)}`,
          `${pct(r.greedyVsEasy.rate)} ± ${pct(r.greedyVsEasy.se)}`,
          ms(r.timing.p95Ms),
          r.approved ? 'aprovado' : 'reprovado',
        ]),
      ),
      '',
      'Horizonte: por fase da decisão, as rodadas de Ataque que terminam no rollout, contando a atual quando a decisão é na fase principal do Ataque; a fase que não consta não busca (vale a escolha do greedy). Fácil (erro): o `EASY_BLUNDER`, a chance de jogar uma ação legal qualquer em vez da escolha do greedy.',
      '',
      ...report.rounds.flatMap((r, i) => r.notes.flatMap((note) => [`**Rodada ${i + 1}.** ${note}`, ''])),
    );
  }
  lines.push(
    '## Por que estes valores',
    '',
    reasonText(report.rounds, th),
    '',
    'Para medir de novo (leva alguns minutos): `pnpm sim:dificil --ajuste "<o que mudou>"` acrescenta uma rodada a este relatório; `pnpm sim:dificil --recomecar` joga o histórico fora e mede do zero. Sem uma das duas, o script se recusa a sobrescrever este relatório.',
    '',
  );
  return lines.join('\n');
}

/** As rodadas do relatório gravado, para `--ajuste` acrescentar a nova; recusa um relatório medido com outra config, sementes ou limiares. */
function previousRounds(): Round[] {
  let previous: GateReport;
  try {
    previous = JSON.parse(readFileSync(REPORT_PATH, 'utf8')) as GateReport;
  } catch (error) {
    throw new Error(`--ajuste continua o relatório anterior, mas ${REPORT_PATH} não pôde ser lido: ${(error as Error).message}`, { cause: error });
  }
  const identity = (r: Pick<GateReport, 'config' | 'seedPrefix' | 'seeds' | 'thresholds'>) => JSON.stringify([r.config, r.seedPrefix, r.seeds, r.thresholds]);
  if (identity(previous) !== identity({ config, seedPrefix, seeds, thresholds: THRESHOLDS })) {
    throw new Error('o relatório anterior foi medido com outra config, outras sementes ou outros limiares: use --recomecar');
  }
  return previous.rounds.map((r) => ({
    ...r,
    label: r.label === LEGACY_LABEL ? 'inicial: os valores da Tarefa 6 (8 rollouts × 4 candidatas, horizonte de uma rodada de Ataque em toda fase)' : r.label,
    notes: r.notes ?? [],
    easyBlunder: r.easyBlunder ?? LEGACY_EASY_BLUNDER,
    hard: { ...r.hard, horizon: r.hard.horizon ?? LEGACY_HORIZON },
  }));
}

/** `--nota-rodada "<n>:<texto>"`: acrescenta o texto às notas da rodada `n` já gravada (a rodada nova é anotada com `--nota`). */
function addRoundNotes(rounds: Round[], specs: string[]): void {
  for (const spec of specs) {
    const match = /^(\d+):([\s\S]+)$/.exec(spec);
    const target = match ? rounds[Number(match[1]) - 1] : undefined;
    if (!match || !target) throw new Error(`--nota-rodada espera "<n>:<texto>" com n entre 1 e ${rounds.length} (recebi "${spec.slice(0, 40)}")`);
    if (!target.notes.includes(match[2])) target.notes.push(match[2]);
  }
}

const started = performance.now();
console.log(`… portão do Difícil: ${seeds} sementes × 2 assentos, rollouts ${HARD_DEFAULTS.rolloutsPerCandidate} × candidatas ${HARD_DEFAULTS.maxCandidates}, Fácil errando com ${EASY_BLUNDER}`);
const earlier = adjust === undefined ? [] : previousRounds();
addRoundNotes(earlier, values['nota-rodada'] ?? []);
if (earlier.length >= MAX_ROUNDS) console.log(`… atenção: já são ${earlier.length} rodadas gravadas; o plano previa a inicial e duas de ajuste.`);
const round = runRound(adjust ?? 'inicial', values.nota ?? []);
const report: GateReport = {
  config,
  seedPrefix,
  seeds,
  thresholds: THRESHOLDS,
  machine: `Node ${process.version}, ${platform()} ${arch()}, ${cpus()[0]?.model.trim() ?? 'CPU desconhecida'} (${cpus().length} núcleos)`,
  rounds: [...earlier, round],
};
const markdown = renderMarkdown(report);
console.log(`\n${markdown}`);
if (partial) {
  console.log('Execução parcial: relatório não gravado (só a de 100 sementes com o prefixo "dificil" grava).');
} else {
  const paths = writeReport('dificil', report, markdown);
  console.log(`Tempo: ${((performance.now() - started) / 1000).toFixed(0)} s · ${paths.join(' · ')}`);
}
