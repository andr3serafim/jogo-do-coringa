import type { GameEvent } from '@coringa/engine';
import type { GameRecord } from './match.ts';

export type EndReason = 'HP' | 'EXODIA' | 'FORFEIT' | 'UNFINISHED';

/** Eventos cuja média por partida mostra se os bots usam as mecânicas. */
export const MECHANICS: GameEvent['type'][] = [
  'BuffPlayed',
  'GuardPlayed',
  'TrapUsed',
  'Sacrificed',
  'ReflectPlayed',
  'ReflectTriggered',
  'ReflectCanceled',
  'Resurrected',
  'HandLimitPenalty',
  'CardStolen',
  'StealDamage',
  'Healed',
  'DevastationCast',
  'RowDevastated',
  'DevastationCanceled',
  'QuadFormed',
  'AbsoluteAttack',
  'AbsoluteDefenseStarted',
  'GuardBroken',
];

export interface Metrics {
  games: number;
  /** Frações em [0, 1]. */
  terminated: number;
  attackRounds: { median: number; p10: number; p90: number; p95: number; max: number };
  /** Vitórias de quem o motor sorteou com a iniciativa inicial. */
  initiativeWin: number;
  endReasons: Record<EndReason, number>;
  /** Paradas no teto de rodadas do simulador (E1: sem anti-travamento nada garante o fim), e a parte delas com Defesa Absoluta. */
  capped: number;
  cappedWithAbsoluteDefense: number;
  /** Partidas com pelo menos uma quadra (Fallen is Back). */
  quads: number;
  /** Secundária, só informativa: fração de "atacar primeiro" entre as Escolhas da iniciativa; null sem a regra. */
  orderFirst: number | null;
  /** Média por partida de cada evento de MECHANICS. */
  perGame: Partial<Record<GameEvent['type'], number>>;
  /** Ressurreições por partida (informativo: risco do laço quadra → Ressurreição → quadra). */
  resurrections: { mean: number; p90: number; max: number; atLeast3: number };
}

export function endReason(r: GameRecord): EndReason {
  return r.result ? r.result.reason : 'UNFINISHED';
}

/** Percentil por posição (sem interpolação) de uma lista já ordenada. */
const percentile = (sorted: number[], p: number): number => sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))];

export function summarize(records: GameRecord[]): Metrics {
  const n = records.length;
  if (n === 0) throw new Error('summarize sem partidas');
  const frac = (pred: (r: GameRecord) => boolean) => records.filter(pred).length / n;
  const rounds = records.map((r) => r.attackRounds).sort((a, b) => a - b);
  const revived = records.map((r) => r.eventCounts.Resurrected ?? 0).sort((a, b) => a - b);
  const endReasons = { HP: 0, EXODIA: 0, FORFEIT: 0, UNFINISHED: 0 };
  for (const r of records) endReasons[endReason(r)] += 1 / n;
  const first = records.reduce((acc, r) => acc + r.orderChoices.first, 0);
  const second = records.reduce((acc, r) => acc + r.orderChoices.second, 0);
  const perGame: Metrics['perGame'] = {};
  for (const type of MECHANICS) perGame[type] = records.reduce((acc, r) => acc + (r.eventCounts[type] ?? 0), 0) / n;
  return {
    games: n,
    terminated: frac((r) => r.result !== null),
    attackRounds: {
      median: percentile(rounds, 0.5),
      p10: percentile(rounds, 0.1),
      p90: percentile(rounds, 0.9),
      p95: percentile(rounds, 0.95),
      max: rounds[rounds.length - 1],
    },
    initiativeWin: frac((r) => r.result?.kind === 'WIN' && r.result.winner === r.initialInitiative),
    endReasons,
    capped: frac((r) => r.capped),
    cappedWithAbsoluteDefense: frac((r) => r.absoluteDefenseAtCap),
    quads: frac((r) => (r.eventCounts.QuadFormed ?? 0) > 0),
    orderFirst: first + second === 0 ? null : first / (first + second),
    perGame,
    resurrections: {
      mean: revived.reduce((a, b) => a + b, 0) / n,
      p90: percentile(revived, 0.9),
      max: revived[revived.length - 1],
      atLeast3: frac((r) => (r.eventCounts.Resurrected ?? 0) >= 3),
    },
  };
}

export interface TargetCheck {
  metric: string;
  value: number;
  target: string;
  ok: boolean;
}

/** Metas da spec §3 que saem de uma série de partidas. Ordem e turtle têm experimentos próprios. */
export function checkTargets(m: Metrics): TargetCheck[] {
  const within = (x: number, lo: number, hi: number) => x >= lo && x <= hi;
  return [
    { metric: 'Duração (mediana de rodadas de Ataque)', value: m.attackRounds.median, target: '8–14', ok: within(m.attackRounds.median, 8, 14) },
    { metric: 'Vitória de quem começa com a iniciativa', value: m.initiativeWin, target: '45–55%', ok: within(m.initiativeWin, 0.45, 0.55) },
    { metric: 'Exódia', value: m.endReasons.EXODIA, target: '1–3%', ok: within(m.endReasons.EXODIA, 0.01, 0.03) },
    { metric: 'Fallen is Back', value: m.quads, target: '10–25%', ok: within(m.quads, 0.1, 0.25) },
  ];
}
