// Os níveis da aura da iniciativa (bloco C dos pontos do playtest, ponto 11): a brasa com 3 rodadas seguidas, a chama com 5, a super aura com 10; o selo
// "×N" a partir de 2 (decisoes.md 2026-11-08 (2), C2).
import { describe, expect, it } from 'vitest';
import { INITIATIVE_TIERS, initiativeTier, streakSealShown } from '../../src/model/initiative-aura.ts';

describe('a aura da iniciativa', () => {
  it('os níveis seguem 3, 5 e 10 rodadas seguidas', () => {
    expect(INITIATIVE_TIERS).toEqual([3, 5, 10]);
    expect([0, 2, 3, 4, 5, 9, 10, 13].map(initiativeTier)).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
  });

  it('o selo aparece a partir de 2 rodadas seguidas', () => {
    expect([0, 1, 2, 3].map(streakSealShown)).toEqual([false, false, true, true]);
  });
});
