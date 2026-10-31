import { describe, expect, it } from 'vitest';
import { SCENE_ALLOWANCE_CAP_MS, SCENE_MS, sceneAllowanceMs } from '../src/index.ts';

describe('folga de cena (sub-projeto 6 §9)', () => {
  it('a cena rara rende a sua duração; evento sem cena não rende nada', () => {
    expect(sceneAllowanceMs([{ type: 'AbsoluteAttack' }])).toBe(3_000);
    expect(sceneAllowanceMs([{ type: 'DamageDealt' }])).toBe(0);
    expect(sceneAllowanceMs([])).toBe(0);
  });

  it('duas cenas no mesmo passo somam', () => {
    expect(sceneAllowanceMs([{ type: 'ReflectTriggered' }, { type: 'DamageDealt' }, { type: 'DevastationCast' }])).toBe(4_500);
  });

  it('a soma para no teto de 8 s', () => {
    expect(SCENE_ALLOWANCE_CAP_MS).toBe(8_000);
    expect(sceneAllowanceMs(Array.from({ length: 6 }, () => ({ type: 'Exodia' })))).toBe(8_000);
  });

  it('a tabela tem as seis cenas, com os tempos de hoje', () => {
    expect(SCENE_MS).toEqual({
      Exodia: 4_200,
      AbsoluteAttack: 3_000,
      AbsoluteDefenseStarted: 3_000,
      DevastationCast: 3_000,
      ReflectPlayed: 1_500,
      ReflectTriggered: 1_500,
    });
  });
});
