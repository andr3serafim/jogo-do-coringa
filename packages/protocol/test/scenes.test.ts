import { describe, expect, it } from 'vitest';
import { SCENE_ALLOWANCE_CAP_MS, SCENE_MS, sceneAllowanceMs } from '../src/index.ts';

describe('folga de cena (sub-projeto 6 §9)', () => {
  it('a cena rara rende a sua duração; evento sem cena não rende nada', () => {
    expect(sceneAllowanceMs([{ type: 'AbsoluteAttack' }])).toBe(4_500);
    expect(sceneAllowanceMs([{ type: 'AbsoluteDefenseStarted' }])).toBe(4_800);
    expect(sceneAllowanceMs([{ type: 'DamageDealt' }])).toBe(0);
    expect(sceneAllowanceMs([])).toBe(0);
  });

  it('a Devastação rende quando a fileira cai, ou a cena curta da cancelada; o lançamento não rende (fatia 3)', () => {
    expect(sceneAllowanceMs([{ type: 'RowDevastated' }])).toBe(3_100);
    expect(sceneAllowanceMs([{ type: 'DevastationCanceled' }])).toBe(1_400);
    expect(sceneAllowanceMs([{ type: 'Exodia' }])).toBe(5_800);
    expect(sceneAllowanceMs([{ type: 'DevastationCast' }])).toBe(0);
  });

  it('duas cenas no mesmo passo somam', () => {
    expect(sceneAllowanceMs([{ type: 'ReflectCanceled' }, { type: 'DamageDealt' }, { type: 'DevastationCanceled' }])).toBe(2_800);
  });

  it('a soma para no teto de 8 s', () => {
    expect(SCENE_ALLOWANCE_CAP_MS).toBe(8_000);
    expect(sceneAllowanceMs(Array.from({ length: 6 }, () => ({ type: 'Exodia' })))).toBe(8_000);
    // O Ataque Absoluto que bate num Reflect: 8,3 s de cena, e o relógio volta 0,3 s antes do fim.
    expect(sceneAllowanceMs([{ type: 'AbsoluteAttack' }, { type: 'ReflectTriggered' }])).toBe(8_000);
  });

  it('a tabela tem as cenas com os tempos do protótipo (fatia 2: os Absolutos; fatia 3: a Exódia e a Devastação; fatia 4: o Reflect)', () => {
    expect(SCENE_MS).toEqual({
      Exodia: 5_800,
      AbsoluteAttack: 4_500,
      AbsoluteDefenseStarted: 4_800,
      RowDevastated: 3_100,
      DevastationCanceled: 1_400,
      ReflectPlayed: 1_500,
      ReflectTriggered: 3_800,
      ReflectCanceled: 1_400,
    });
  });
});
