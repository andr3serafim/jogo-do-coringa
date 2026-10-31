// A medição do bloco E3 + F2 + F3 em escala pequena: roda de ponta a ponta, as frações ficam em [0, 1] e o relatório traz cada seção.
import { BOTS } from '../src/bots/index.ts';
import { makeConfig } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { e3Experiment, measureSeries, paired, renderE3, without } from '../src/experiments/e3.ts';

describe('medição E3', () => {
  it('roda pequena, com as séries das quatro formas e as seções do relatório', () => {
    const report = e3Experiment(4);
    expect(report.series).toHaveLength(12);
    for (const s of report.series) {
      expect(s.metrics.games).toBe(4);
      for (const fraction of [s.stats.blackBlocked, s.stats.healGames, s.stats.exodiaAtOnce, s.stats.exodiaBuilt]) {
        expect(fraction).toBeGreaterThanOrEqual(0);
        expect(fraction).toBeLessThanOrEqual(1);
      }
    }
    const markdown = renderE3(report);
    for (const section of ['## Duração e fim', '## Mecânicas novas', '## Pareados', '## Cura passiva ligada × desligada', '## Como ler']) {
      expect(markdown).toContain(section);
    }
  });

  it('o bot sem uma jogada nunca a escolhe; os pareados dão pontos entre 0 e 1', () => {
    const noSteal = without(BOTS.greedy, ['STEAL']);
    const { stats } = measureSeries(makeConfig(), [noSteal, noSteal], 6, 'e3-teste-sem-roubo');
    expect(stats.steals).toBe(0);
    const pair = paired(makeConfig(), BOTS.greedy, noSteal, 6, 'e3-teste-par');
    expect(pair.score).toBeGreaterThanOrEqual(0);
    expect(pair.score).toBeLessThanOrEqual(1);
  });

  it('as penalidades aparecem quando o limite está ligado', () => {
    const burn = measureSeries(makeConfig({ specialLimit: { max: 4, penalty: 'BURN' } }), [BOTS.turtle, BOTS.greedy], 20, 'e3-teste-burn');
    expect(burn.stats.burned).toBeGreaterThan(0);
    const choose = measureSeries(makeConfig({ specialLimit: { max: 4, penalty: 'CHOOSE' } }), [BOTS.turtle, BOTS.greedy], 20, 'e3-teste-choose');
    expect(choose.stats.discarded).toBeGreaterThan(0);
  });
});
