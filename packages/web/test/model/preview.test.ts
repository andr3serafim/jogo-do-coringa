import { previewAttack } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { previewChanged, previewsOf, previewsWithout, viewWithout } from '../../src/model/preview.ts';
import { viewAt, type ViewSpec } from '../fixtures.ts';

/** ATK 152 contra DEF 42, com um K na Guarda de Duda: o K absorve. Do lado dele, 84 contra a minha DEF 46. */
const SPEC: ViewSpec = {
  pressure: 1,
  self: {
    hand: ['A'],
    attackRow: [8, 4, 10, 7, 9],
    defenseRow: [3, 6, 9, 5],
    attackBuffs: ['J', 'WILD'],
    defenseBuffs: ['Q'],
    guard: ['K'],
  },
  opponent: {
    attackRow: [6, 9, 3, 10],
    defenseRow: [5, 7, 2],
    attackBuffs: ['J'],
    defenseBuffs: ['Q', 'Q'],
    guard: ['K'],
  },
};

describe('previewsOf', () => {
  it('é a prévia do motor, dos dois lados', () => {
    const view = viewAt(SPEC);
    const { mine, threat } = previewsOf(view);
    expect(mine).toEqual(previewAttack(view, 'self'));
    expect(threat).toEqual(previewAttack(view, 'opponent'));
    expect(mine).toMatchObject({ outcome: 'GUARD_ABSORBS', attack: 152, defense: 42, damage: 0 });
    expect(threat).toMatchObject({ outcome: 'GUARD_ABSORBS', attack: 84, defense: 46, damage: 0 });
  });
});

describe('viewWithout', () => {
  it('tira o alvo da Guarda, dos buffs de ataque ou dos de defesa do oponente, sem mexer na view original', () => {
    const view = viewAt(SPEC);
    const guardId = view.opponent.guard[0]!.id;
    const jId = view.opponent.attackBuffs[0]!.id;
    const qId = view.opponent.defenseBuffs[1]!.id;

    expect(viewWithout(view, guardId).opponent.guard).toEqual([]);
    expect(viewWithout(view, jId).opponent.attackBuffs).toEqual([]);
    expect(viewWithout(view, qId).opponent.defenseBuffs.map((c) => c.id)).toEqual([view.opponent.defenseBuffs[0]!.id]);
    // O resto fica como está.
    expect(viewWithout(view, guardId).opponent.attackBuffs).toEqual(view.opponent.attackBuffs);
    expect(viewWithout(view, guardId).self).toBe(view.self);
    expect(view.opponent.guard).toHaveLength(1);
  });

  it('um id que não é do oponente não muda nada', () => {
    const view = viewAt(SPEC);
    expect(viewWithout(view, 'nao-existe').opponent).toEqual(view.opponent);
  });
});

describe('previewsWithout: o efeito de quebrar o alvo', () => {
  it('sem o único K de Duda, o ataque causa dano (152 contra 42 = 110)', () => {
    const view = viewAt(SPEC);
    const { mine } = previewsWithout(view, view.opponent.guard[0]!.id);
    expect(mine).toMatchObject({ outcome: 'DAMAGE', attack: 152, defense: 42, damage: 110 });
  });

  it('sem o J de Duda, a ameaça dele cai e o meu ataque fica igual', () => {
    const view = viewAt(SPEC);
    const before = previewsOf(view);
    const after = previewsWithout(view, view.opponent.attackBuffs[0]!.id);
    expect(after.threat.attack).toBeLessThan(before.threat.attack);
    expect(previewChanged(before.mine, after.mine)).toBe(false);
    expect(previewChanged(before.threat, after.threat)).toBe(true);
  });

  it('sem uma Q de Duda, a defesa dele cai e o meu ataque muda', () => {
    const view = viewAt(SPEC);
    const before = previewsOf(view);
    const after = previewsWithout(view, view.opponent.defenseBuffs[0]!.id);
    expect(after.mine.defense).toBeLessThan(before.mine.defense);
    expect(previewChanged(before.mine, after.mine)).toBe(true);
  });
});

describe('previewChanged', () => {
  it('compara o desfecho e os números da conta', () => {
    const view = viewAt(SPEC);
    const { mine } = previewsOf(view);
    expect(previewChanged(mine, { ...mine })).toBe(false);
    expect(previewChanged(mine, { ...mine, outcome: 'DAMAGE' })).toBe(true);
    expect(previewChanged(mine, { ...mine, attack: mine.attack + 1 })).toBe(true);
    expect(previewChanged(mine, { ...mine, defense: mine.defense + 1 })).toBe(true);
    expect(previewChanged(mine, { ...mine, damage: 1 })).toBe(true);
    expect(previewChanged(mine, { ...mine, reflected: 1 })).toBe(true);
    expect(previewChanged(mine, { ...mine, absolute: true })).toBe(true);
  });
});
