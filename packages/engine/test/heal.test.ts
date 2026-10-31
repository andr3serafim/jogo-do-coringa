// Cura passiva (E3 do sub-projeto 5): com 2 K ou mais na Guarda, cada numérica da própria Fileira de Defesa que vai ao cemitério,
// de qualquer naipe, cura valor × (1 + nº de Q). A vida nunca passa da inicial. As cartas destruídas pela Devastação não curam.
import { describe, expect, it } from 'vitest';
import type { Action, GameEvent, GameState, NumCard, RowName } from '../src/types.ts';
import { P1, P2, act, handId, player, setup, steps, values, type PlayerSetup } from './helpers.ts';

const healed = (events: GameEvent[], who = P2) => events.filter((e) => e.type === 'Healed' && e.player === who);

/** P1 ataca P2 e P2 passa: devolve os eventos e o estado depois do golpe. */
function attack(p1: PlayerSetup, p2: PlayerSetup): { state: GameState; events: GameEvent[] } {
  return steps(setup({ p1, p2 }), [
    [P1, { type: 'DECLARE_ATTACK' }],
    [P2, { type: 'PASS' }],
  ]);
}

describe('cura passiva pela Defesa (E3)', () => {
  it('com 2 K, a carta da frente da Defesa que sai num ataque cura valor × (1 + nº de Q)', () => {
    // ATK 10 contra DEF (6 + 3) × 2 = 18: dano 0, nenhum K quebra. Sai o 6, que cura 6 × 2.
    const r = attack({ attack: [10] }, { hp: 50, defense: [6, 3], defenseBuffs: ['Q'], guard: 2 });
    expect(values(player(r.state, P2).defenseRow)).toEqual([3]);
    expect(player(r.state, P2).hp).toBe(62);
    expect(healed(r.events)).toEqual([expect.objectContaining({ type: 'Healed', player: P2, amount: 12, source: 'DEFENSE' })]);
  });

  it('com 1 K, não cura', () => {
    const r = attack({ attack: [10] }, { hp: 50, defense: [6, 3], defenseBuffs: ['Q'], guard: 1 });
    expect(player(r.state, P2).hp).toBe(50);
    expect(healed(r.events)).toEqual([]);
  });

  it('a vida nunca passa da inicial', () => {
    const r = attack({ attack: [10] }, { hp: 95, defense: [6, 3], defenseBuffs: ['Q'], guard: 2 });
    expect(player(r.state, P2).hp).toBe(100);
    expect(healed(r.events)).toEqual([expect.objectContaining({ amount: 5 })]);
  });

  it('com exatamente 2 K e o ataque absorvido pela Guarda, sobra 1 K e a carta da frente não cura ([I])', () => {
    const r = attack({ attack: [10, 10] }, { hp: 50, defense: [6], guard: 2 });
    expect(player(r.state, P2).guard).toHaveLength(1);
    expect(player(r.state, P2).defenseRow).toEqual([]);
    expect(healed(r.events)).toEqual([]);
  });

  it('o dono do Reflect também cura com a carta da frente que sai', () => {
    const s = setup({ p1: { attack: [10] }, p2: { hp: 50, defense: [6, 3], guard: 2, hand: ['K', 'J', 'Q'] } });
    const r = steps(s, [
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'REFLECT', kId: handId(s, P2, 'K'), jId: handId(s, P2, 'J'), qId: handId(s, P2, 'Q') }],
      [P1, { type: 'PASS' }],
    ]);
    expect(healed(r.events)).toEqual([expect.objectContaining({ amount: 6 })]);
  });

  it('a troca da última da Defesa no Equipar cura a carta trocada ([I])', () => {
    const full = [2, 3, 4, 5, 6, 7, 8] as const;
    const s = setup({
      round: 4,
      roundKind: 'EQUIP',
      phase: { kind: 'EQUIP' },
      p1: { hp: 50, pending: [9], attack: [...full], defense: [...full], defenseBuffs: ['Q'], guard: 2 },
      p2: { equipSubmitted: true },
    });
    const r = act(s, P1, { type: 'EQUIP', destinations: ['REPLACE_LAST_DEF'] });
    expect(values(player(r.state, P1).defenseRow)).toEqual([2, 3, 4, 5, 6, 7, 9]);
    // O 8 trocado cura 8 × 2, depois de as cartas entrarem.
    expect(healed(r.events, P1)).toEqual([expect.objectContaining({ amount: 16, source: 'DEFENSE' })]);
    const types = r.events.map((e) => e.type);
    expect(types.indexOf('Healed')).toBeGreaterThan(types.indexOf('CardsPlaced'));
  });

  it('o ladrão que perde a última da própria Defesa cheia cura com ela ([I])', () => {
    const s = setup({ p1: { hp: 50, hand: ['A'], defense: [2, 3, 4, 5, 6, 7, 8], guard: 2 }, p2: { attack: [9] } });
    const target = player(s, P2).attackRow[0] as NumCard;
    const r = act(s, P1, { type: 'STEAL', cardId: handId(s, P1, 'A'), targetId: target.id, row: 'DEF' });
    // Primeiro a carta que sai da Defesa (8), depois a cura do próprio roubo (9).
    expect(healed(r.events, P1)).toEqual([
      expect.objectContaining({ amount: 8, source: 'DEFENSE' }),
      expect.objectContaining({ amount: 9, source: 'STEAL' }),
    ]);
  });

  it('as cartas destruídas pela Devastação não curam', () => {
    const s = setup({ p1: { hand: ['K', 'A', 'Q'] }, p2: { hp: 50, defense: [6, 7], guard: 2 } });
    const devastate: Action = { type: 'DEVASTATE', kId: handId(s, P1, 'K'), aId: handId(s, P1, 'A'), xId: handId(s, P1, 'Q'), row: 'DEF' as RowName };
    const r = steps(s, [
      [P1, devastate],
      [P2, { type: 'PASS' }],
    ]);
    expect(player(r.state, P2).defenseRow).toEqual([]);
    expect(healed(r.events)).toEqual([]);
  });

  it('sem `defenseHealGuard` na config, nada cura', () => {
    const r = steps(setup({ config: { defenseHealGuard: undefined }, p1: { attack: [10] }, p2: { hp: 50, defense: [6, 3], guard: 2 } }), [
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'PASS' }],
    ]);
    expect(healed(r.events)).toEqual([]);
  });
});
