import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { GameResult } from '@coringa/engine';
import type { GameRecord } from '../src/match.ts';
import { checkTargets, endReason, summarize } from '../src/metrics.ts';
import { markdownTable, pct, textTable, writeReport } from '../src/report.ts';

function rec(result: GameResult | null, attackRounds: number, extra: Partial<GameRecord> = {}): GameRecord {
  return {
    seed: 'x',
    initialInitiative: 'p1',
    result,
    finalState: {} as GameRecord['finalState'],
    steps: 1,
    attackRounds,
    eventCounts: {},
    orderChoices: { first: 0, second: 0 },
    ...extra,
  };
}

const win = (winner: string, reason: 'HP' | 'EXODIA' | 'ANTI_STALL' = 'HP'): GameResult => ({ kind: 'WIN', winner, reason });

describe('summarize', () => {
  const records = [
    rec(win('p1'), 8, { eventCounts: { QuadFormed: 2, TrapUsed: 3 }, orderChoices: { first: 1, second: 3 } }),
    rec(win('p2'), 10),
    rec(win('p1', 'EXODIA'), 12),
    rec({ kind: 'DRAW', reason: 'ANTI_STALL' }, 14),
    rec(null, 20),
  ];
  const m = summarize(records);

  it('duração por percentis das rodadas de Ataque', () => {
    expect(m.attackRounds).toEqual({ median: 12, p10: 8, p90: 20 });
  });

  it('vitória da iniciativa inicial, motivos de fim e partidas que terminam', () => {
    expect(m.initiativeWin).toBeCloseTo(2 / 5);
    expect(m.endReasons).toMatchObject({ HP: 2 / 5, EXODIA: 1 / 5, DRAW: 1 / 5, UNFINISHED: 1 / 5 });
    expect(m.terminated).toBeCloseTo(4 / 5);
    expect(endReason(records[3])).toBe('DRAW');
  });

  it('quadras, escolha da ordem (secundária) e uso de mecânicas por partida', () => {
    expect(m.quads).toBeCloseTo(1 / 5);
    expect(m.orderFirst).toBeCloseTo(1 / 4);
    expect(m.perGame.TrapUsed).toBeCloseTo(3 / 5);
    expect(summarize([rec(win('p1'), 3)]).orderFirst).toBeNull();
  });

  it('recusa lista vazia', () => {
    expect(() => summarize([])).toThrow();
  });
});

describe('checkTargets (metas da spec §3)', () => {
  it('marca dentro e fora de cada meta', () => {
    const inside = summarize(Array.from({ length: 100 }, (_, i) => rec(i < 50 ? win('p1') : win('p2', i < 52 ? 'EXODIA' : 'HP'), 10, { eventCounts: i < 15 ? { QuadFormed: 1 } : {} })));
    expect(checkTargets(inside).every((t) => t.ok)).toBe(true);
    const outside = summarize([rec(win('p2', 'ANTI_STALL'), 3), rec(null, 30)]);
    expect(checkTargets(outside).filter((t) => !t.ok).map((t) => t.metric)).toEqual([
      'Duração (mediana de rodadas de Ataque)',
      'Vitória de quem começa com a iniciativa',
      'Exódia',
      'Fallen is Back',
      'Fim por anti-travamento',
      'Partidas que terminam',
    ]);
  });
});

describe('relatórios', () => {
  it('tabela de texto alinhada e tabela Markdown', () => {
    expect(textTable(['a', 'bb'], [[1, 'x'], [2.5, 'yyy']])).toBe('a     bb\n----  ---\n1     x\n2.50  yyy');
    expect(markdownTable(['a', 'b'], [[1, 'x']])).toBe('| a | b |\n| --- | --- |\n| 1 | x |');
    expect(pct(0.1234)).toBe('12.3%');
  });

  it('grava JSON e Markdown na pasta pedida', () => {
    const dir = mkdtempSync(join(tmpdir(), 'coringa-'));
    const [json, md] = writeReport('teste', { ok: true }, '# oi\n', dir);
    expect(JSON.parse(readFileSync(json, 'utf8'))).toEqual({ ok: true });
    expect(readFileSync(md, 'utf8')).toBe('# oi\n');
  });
});
