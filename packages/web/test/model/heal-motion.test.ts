// Os instantes da batida da cura (spec `2026-11-23-cura-placas-historico-design.md` §4.2): a animação, a vida que conta e o som leem
// todos daqui, e a batida inteira dura a folga do protocolo.
import { HEAL_MS } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { HEAL_MOTION } from '../../src/model/heal-motion.ts';

describe('HEAL_MOTION', () => {
  it('os tempos da spec', () => {
    expect(HEAL_MOTION).toEqual({
      glowMs: 420,
      dropAt: 120,
      flightMs: 640,
      arriveAt: 760,
      countMs: 520,
      shineMs: 620,
      sparksMs: 520,
      stampHoldMs: 1_200,
      stampOutMs: 300,
      beatMs: HEAL_MS,
    });
  });

  it('a gota chega quando a conta começa, e a conta cabe na batida', () => {
    expect(HEAL_MOTION.dropAt + HEAL_MOTION.flightMs).toBe(HEAL_MOTION.arriveAt);
    expect(HEAL_MOTION.arriveAt + HEAL_MOTION.countMs).toBeLessThanOrEqual(HEAL_MOTION.beatMs);
  });
});
