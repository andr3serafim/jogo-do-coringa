// Medição do bloco E3 + F2 + F3 (plano 1, sub-projeto 5): o que a spec pede para levar ao autor junto com a forma da penalidade do
// limite de especiais. Séries por forma (sem limite, BURN, CHOOSE, FEWER), pareados de bots sem Roubo ou sem Devastação e a cura
// ligada contra desligada. Sementes pareadas entre as variantes (o mesmo prefixo dá as mesmas partidas e os mesmos bots).
import { makeConfig, type Action, type ConfigOverrides, type PlayerId, type RulesConfig } from '@coringa/engine';
import { BOTS, type Bot, type BotName } from '../bots/index.ts';
import { PLAYERS, runGame, type GameRecord } from '../match.ts';
import { summarize, type Metrics } from '../metrics.ts';
import { markdownTable, pct } from '../report.ts';
import { mean, score } from './outcome.ts';

export type LimitLabel = 'sem limite' | 'BURN' | 'CHOOSE' | 'FEWER';

export const LIMITS: Array<[LimitLabel, RulesConfig['specialLimit']]> = [
  ['sem limite', undefined],
  ['BURN', { max: 4, penalty: 'BURN' }],
  ['CHOOSE', { max: 4, penalty: 'CHOOSE' }],
  ['FEWER', { max: 4, penalty: 'FEWER' }],
];

export const SERIES: Array<[string, [BotName, BotName]]> = [
  ['greedy × greedy', ['greedy', 'greedy']],
  ['turtle × greedy', ['turtle', 'greedy']],
  ['random × random', ['random', 'random']],
];

/** As mecânicas novas, por partida (médias) ou por fração de partidas. */
export interface E3Stats {
  steals: number;
  /** Dos roubos de carta ♣ ♠, a fração que um K anulou. */
  blackBlocked: number;
  stealDamage: number;
  stealHeal: number;
  defenseHeal: number;
  /** A parte da cura passiva que veio da troca da última da Defesa no Equipar (leitura [I] 4). */
  equipHeal: number;
  /** Fração de partidas com alguma cura passiva. */
  healGames: number;
  reflects: number;
  clashes: number;
  devastations: number;
  devastationsReflected: number;
  /** Fração de partidas que acabaram em Exódia com os 4 K jogados de uma vez (da mão) ou montada aos poucos. */
  exodiaAtOnce: number;
  exodiaBuilt: number;
  burned: number;
  discarded: number;
  fewer: number;
}

export interface SeriesE3 {
  limit: LimitLabel;
  label: string;
  metrics: Metrics;
  stats: E3Stats;
}

const black = (suit: string): boolean => suit === 'espadas' || suit === 'paus';

/** Joga `games` partidas e junta as métricas de sempre com as das mecânicas novas. */
export function measureSeries(config: RulesConfig, bots: [Bot, Bot], games: number, prefix: string): { metrics: Metrics; stats: E3Stats } {
  const t = { steals: 0, black: 0, blocked: 0, stealDamage: 0, stealHeal: 0, defenseHeal: 0, equipHeal: 0, healGames: 0 };
  const m = { reflects: 0, clashes: 0, devastations: 0, reflectedDev: 0, atOnce: 0, built: 0, burned: 0, discarded: 0, fewer: 0 };
  const records: GameRecord[] = [];
  for (let i = 0; i < games; i += 1) {
    const lastGuard: Record<PlayerId, number> = {};
    let healed = false;
    records.push(
      runGame({
        config,
        seed: `${prefix}-${i}`,
        bots,
        onStep: (_before, _after, events) => {
          // A cura que sai no passo da revelação do Equipar é a da troca da última da Defesa.
          const equipStep = events.some((e) => e.type === 'CardsPlaced');
          for (const e of events) {
            switch (e.type) {
              case 'CardStolen':
                t.steals += 1;
                if (black(e.card.suit)) t.black += 1;
                break;
              case 'StealDamage':
                t.stealDamage += e.damage;
                if (e.blocked) t.blocked += 1;
                break;
              case 'Healed':
                if (e.source === 'STEAL') {
                  t.stealHeal += e.amount;
                } else {
                  t.defenseHeal += e.amount;
                  if (equipStep) t.equipHeal += e.amount;
                  if (e.amount > 0) healed = true;
                }
                break;
              case 'ReflectPlayed':
                m.reflects += 1;
                break;
              case 'ReflectCanceled':
                m.clashes += 1;
                break;
              case 'DevastationCast':
                m.devastations += 1;
                break;
              case 'RowDevastated':
                if (e.reflected) m.reflectedDev += 1;
                break;
              case 'GuardPlayed':
                lastGuard[e.player] = e.cards.length;
                break;
              case 'Exodia':
                if ((lastGuard[e.player] ?? 0) >= config.exodiaGuard) m.atOnce += 1;
                else m.built += 1;
                break;
              case 'HandLimitPenalty':
                if (e.penalty === 'BURN') m.burned += e.cards.length;
                else if (e.penalty === 'CHOOSE') m.discarded += e.cards.length;
                else m.fewer += e.fewer;
                break;
              default:
                break;
            }
          }
        },
      }),
    );
    if (healed) t.healGames += 1;
  }
  const n = games;
  return {
    metrics: summarize(records),
    stats: {
      steals: t.steals / n,
      blackBlocked: t.black === 0 ? 0 : t.blocked / t.black,
      stealDamage: t.stealDamage / n,
      stealHeal: t.stealHeal / n,
      defenseHeal: t.defenseHeal / n,
      equipHeal: t.equipHeal / n,
      healGames: t.healGames / n,
      reflects: m.reflects / n,
      clashes: m.clashes / n,
      devastations: m.devastations / n,
      devastationsReflected: m.reflectedDev / n,
      exodiaAtOnce: m.atOnce / n,
      exodiaBuilt: m.built / n,
      burned: m.burned / n,
      discarded: m.discarded / n,
      fewer: m.fewer / n,
    },
  };
}

/** O bot sem as jogadas `types` (só para a medição pareada; nunca vira nível de bot). */
export function without(bot: Bot, types: Action['type'][]): Bot {
  return (view, legal, rng) => {
    const kept = legal.filter((a) => !types.includes(a.type));
    return bot(view, kept.length > 0 ? kept : legal, rng);
  };
}

/** Pontos de `base` contra `variant`, trocando os assentos a cada partida (mesmas sementes). */
export function paired(config: RulesConfig, base: Bot, variant: Bot, games: number, prefix: string): { score: number; margin: number } {
  const scores: number[] = [];
  for (let i = 0; i < games; i += 1) {
    const baseSeat = i % 2;
    const bots: [Bot, Bot] = baseSeat === 0 ? [base, variant] : [variant, base];
    const record = runGame({ config, seed: `${prefix}-${Math.floor(i / 2)}`, bots, botSeed: `${prefix}-${i}/bots` });
    scores.push(score(record.result, PLAYERS[baseSeat]!));
  }
  const p = mean(scores);
  // Margem de 95% de uma proporção (aproximação normal).
  return { score: p, margin: 1.96 * Math.sqrt((p * (1 - p)) / Math.max(1, games)) };
}

export interface E3Report {
  games: number;
  series: SeriesE3[];
  pairs: Array<{ label: string; score: number; margin: number }>;
  heal: Array<{ label: string; on: Metrics; off: Metrics }>;
}

export function e3Experiment(games: number, log: (line: string) => void = () => {}): E3Report {
  const series: SeriesE3[] = [];
  for (const [limit, specialLimit] of LIMITS) {
    for (const [label, [a, b]] of SERIES) {
      log(`${limit} · ${label}`);
      const config = makeConfig({ specialLimit } satisfies ConfigOverrides);
      series.push({ limit, label, ...measureSeries(config, [BOTS[a], BOTS[b]], games, `e3-${label}`) });
    }
  }
  const config = makeConfig();
  log('pareados');
  const pairs = [
    { label: 'greedy (rouba) × greedy sem Roubo', ...paired(config, BOTS.greedy, without(BOTS.greedy, ['STEAL']), games, 'e3-roubo') },
    { label: 'greedy (devasta) × greedy sem Devastação', ...paired(config, BOTS.greedy, without(BOTS.greedy, ['DEVASTATE']), games, 'e3-devastacao') },
  ];
  log('cura ligada × desligada');
  const heal = SERIES.slice(0, 2).map(([label, [a, b]]) => ({
    label,
    on: measureSeries(makeConfig(), [BOTS[a], BOTS[b]], games, `e3-cura-${label}`).metrics,
    off: measureSeries(makeConfig({ defenseHealGuard: undefined }), [BOTS[a], BOTS[b]], games, `e3-cura-${label}`).metrics,
  }));
  return { games, series, pairs, heal };
}

const rounds = (m: Metrics): string =>
  `${m.attackRounds.p10}–${m.attackRounds.median}–${m.attackRounds.p90} · ${m.attackRounds.p95} · ${m.attackRounds.max}`;
const n2 = (x: number): string => x.toFixed(2);

export function renderE3(report: E3Report): string {
  const lines: string[] = [
    '# Medição do bloco E3 + F2 + F3',
    '',
    `${report.games} partidas por série; sementes pareadas entre as variantes. Gerado por \`pnpm sim:e3\`.`,
    '',
    '## Duração e fim, por forma do limite de especiais',
    '',
    markdownTable(
      ['Limite', 'Série', 'Rodadas ATK (p10–med–p90 · p95 · máx)', 'No teto', 'Iniciativa vence', 'Exódia (de uma vez · aos poucos)'],
      report.series.map((s) => [
        s.limit,
        s.label,
        rounds(s.metrics),
        pct(s.metrics.capped),
        pct(s.metrics.initiativeWin),
        `${pct(s.stats.exodiaAtOnce + s.stats.exodiaBuilt)} (${pct(s.stats.exodiaAtOnce)} · ${pct(s.stats.exodiaBuilt)})`,
      ]),
    ),
    '',
    '## Mecânicas novas (média por partida)',
    '',
    markdownTable(
      ['Limite', 'Série', 'Roubos', '♣♠ anulados por K', 'Dano do roubo', 'Cura (roubo · Defesa · troca)', 'Com cura passiva', 'Reflects · R×R', 'Devastações · refletidas', 'Penalidade (queimadas · descartadas · a menos)'],
      report.series.map((s) => [
        s.limit,
        s.label,
        n2(s.stats.steals),
        pct(s.stats.blackBlocked),
        n2(s.stats.stealDamage),
        `${n2(s.stats.stealHeal)} · ${n2(s.stats.defenseHeal)} · ${n2(s.stats.equipHeal)}`,
        pct(s.stats.healGames),
        `${n2(s.stats.reflects)} · ${n2(s.stats.clashes)}`,
        `${n2(s.stats.devastations)} · ${n2(s.stats.devastationsReflected)}`,
        `${n2(s.stats.burned)} · ${n2(s.stats.discarded)} · ${n2(s.stats.fewer)}`,
      ]),
    ),
    '',
    '## Pareados (assentos trocados a cada partida, sem limite de especiais)',
    '',
    markdownTable(
      ['Confronto', 'Pontos do primeiro', 'Margem (95%)'],
      report.pairs.map((p) => [p.label, pct(p.score), `±${pct(p.margin)}`]),
    ),
    '',
    '## Cura passiva ligada × desligada (sem limite de especiais)',
    '',
    markdownTable(
      ['Série', 'Cura', 'Rodadas ATK (p10–med–p90 · p95 · máx)', 'No teto', 'Exódia', 'Iniciativa vence'],
      report.heal.flatMap((h) => [
        [h.label, 'ligada', rounds(h.on), pct(h.on.capped), pct(h.on.endReasons.EXODIA), pct(h.on.initiativeWin)],
        [h.label, 'desligada', rounds(h.off), pct(h.off.capped), pct(h.off.endReasons.EXODIA), pct(h.off.initiativeWin)],
      ]),
    ),
    '',
    '## Como ler',
    '',
    '- **Política de descarte da CHOOSE (greedy):** sai primeiro o J ou o Q sem lugar (buffs no limite), depois Q, J, A, Selvagem e K.',
    '  O resultado da CHOOSE depende dela; um jogador que guarda K mantém a Exódia da mão possível.',
    '- **Exódia "de uma vez":** os 4 K saíram numa jogada só (estavam juntos na mão); "aos poucos": a Guarda já tinha K.',
    '- **No teto:** a partida passou de 400 rodadas no simulador (sem anti-travamento, nada garante o fim).',
    '',
  ];
  return lines.join('\n');
}
