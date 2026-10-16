import { describe, expect, it } from 'vitest';
import { makeConfig, validateConfig } from '@coringa/engine';
import { calibrate, renderMarkdown, SECTIONS, SWEEP } from '../src/calibrate.ts';

describe('calibração (miniatura)', () => {
  const report = calibrate({ games: 3, orderGames: 2, rollouts: 2, sections: SECTIONS });

  it('roda todas as seções', () => {
    expect(report.base.map((s) => s.label)).toEqual(['greedy × greedy', 'random × random', 'turtle × greedy']);
    expect(report.toggles.map((s) => s.label)).toEqual(['padrão', 'sem Escolha da iniciativa', 'sem Pressão da mesa', 'sem Coringas Selvagens']);
    expect(report.turtle.map((t) => [t.tablePressure, t.lead])).toEqual([[true, 10], [true, 20], [false, 10], [false, 20]]);
    expect(report.order).not.toBeNull();
    expect(report.sweep).toHaveLength(SWEEP.length);
  });

  it('o Markdown traz todas as seções', () => {
    const md = renderMarkdown(report);
    for (const title of ['Séries base', 'Regras novas liga/desliga', 'Turtle na mesma situação', 'Escolha da ordem', 'Varredura']) expect(md).toContain(title);
  });

  it('só roda as seções pedidas', () => {
    const only = calibrate({ games: 2, orderGames: 1, rollouts: 1, sections: ['base'] });
    expect(only.toggles).toEqual([]);
    expect(only.order).toBeNull();
  });

  it('toda config da varredura é válida', () => {
    for (const [, overrides] of SWEEP) expect(validateConfig(makeConfig(overrides))).toBeNull();
  });
});
