// Os bônus em escala (bloco C dos pontos do playtest, ponto 10): o nível de cada zona sai da config e das marcas do motor (decisoes.md 2026-11-08 (2),
// C6), nunca de números fixos.
import { describe, expect, it } from 'vitest';
import { zoneLevel } from '../../src/model/zone-level.ts';
import { scenarioAt, type CardSpec } from '../fixtures.ts';

const levelOf = (kind: 'J' | 'Q' | 'K', spec: Parameters<typeof scenarioAt>[0], config?: object) => {
  const view = scenarioAt(spec).view;
  return zoneLevel(kind, view.self, { ...view.config, ...config });
};

describe('o nível das zonas', () => {
  it('os J: 1, 2, 3 e 4 → nada, aceso, faíscas e o Ataque Absoluto', () => {
    expect(([['J'], ['J', 'J'], ['J', 'J', 'J'], ['J', 'J', 'J', 'J']] as CardSpec[][]).map((attackBuffs) => levelOf('J', { self: { attackBuffs } }))).toEqual([0, 1, 2, 3]);
  });

  it('os Q: a Defesa Absoluta é o nível 3; sem ela (acabou e saiu 1 Q), conta o que restou', () => {
    expect(levelOf('Q', { self: { defenseBuffs: ['Q', 'Q'] } })).toBe(1);
    expect(levelOf('Q', { self: { defenseBuffs: ['Q', 'Q', 'Q'] } })).toBe(2);
    expect(levelOf('Q', { self: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } })).toBe(3);
    expect(levelOf('Q', { self: { defenseBuffs: ['Q', 'Q', 'Q'], absoluteDefense: false } })).toBe(2);
  });

  it('os K: 1, 2 e 3 → nada, a cura passiva e a brasa da ameaça', () => {
    expect(([['K'], ['K', 'K'], ['K', 'K', 'K']] as CardSpec[][]).map((guard) => levelOf('K', { self: { guard } }))).toEqual([0, 1, 2]);
  });

  it('os Selvagens contam como J e Q nos bônus', () => {
    expect(levelOf('J', { self: { attackBuffs: ['J', 'WILD', 'WILD'] } })).toBe(2);
    expect(levelOf('Q', { self: { defenseBuffs: ['WILD', 'Q'] } })).toBe(1);
  });

  it('com outra config, a escada acompanha: com 3 de limite, 2 J já soltam faíscas; com a Exódia em 5 K, a brasa vem com 4', () => {
    expect(levelOf('J', { self: { attackBuffs: ['J', 'J'] } }, { buffLimit: 3 })).toBe(2);
    expect(levelOf('J', { self: { attackBuffs: ['J', 'J', 'J'] } }, { buffLimit: 3 })).toBe(3);
    expect(levelOf('K', { self: { guard: ['K', 'K', 'K'] } }, { exodiaGuard: 5 })).toBe(1);
    expect(levelOf('K', { self: { guard: ['K', 'K', 'K', 'K'] } }, { exodiaGuard: 5 })).toBe(2);
  });

  it('uma carta só nunca acende, nem com o limite em 2', () => {
    expect(levelOf('J', { self: { attackBuffs: ['J'] } }, { buffLimit: 2 })).toBe(0);
  });
});
