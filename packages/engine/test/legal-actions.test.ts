import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action';
import { legalActions } from '../src/legal-actions';
import { viewFor } from '../src/view';
import type { GameState, PlayerId } from '../src/types';
import { P1, P2, act, handId, player, setup } from './helpers';

const equipPhase = { round: 1, roundKind: 'EQUIP' as const, phase: { kind: 'EQUIP' as const } };

function reflectState(): GameState {
  const s = setup({
    p1: { hand: ['K', 'J', 'Q'] },
    p2: { hand: ['K', 'J', 'Q'], attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 },
  });
  return act(s, P1, { type: 'REFLECT', kId: handId(s, P1, 'K'), jId: handId(s, P1, 'J'), qId: handId(s, P1, 'Q') }).state;
}

describe('legalActions', () => {
  it('Equipar: todas as combinações de fileira', () => {
    const s = setup({ ...equipPhase, p1: { pending: [3, 4] } });
    const legal = legalActions(viewFor(s, P1));
    expect(legal).toHaveLength(4);
    expect(legal).toContainEqual({ type: 'EQUIP', destinations: ['ATK', 'DEF'] });
  });

  it('Equipar com as duas fileiras cheias: substituir ou descartar', () => {
    const s = setup({ ...equipPhase, p1: { attack: [2, 2, 3, 3, 4, 4, 5], defense: [6, 6, 7, 7, 8, 8, 9], pending: [10] } });
    expect(legalActions(viewFor(s, P1))).toEqual([
      { type: 'EQUIP', destinations: ['REPLACE_LAST_ATK'] },
      { type: 'EQUIP', destinations: ['REPLACE_LAST_DEF'] },
      { type: 'EQUIP', destinations: ['DISCARD'] },
    ]);
  });

  it('fora da vez não há ações', () => {
    expect(legalActions(viewFor(setup(), P2))).toEqual([]);
  });

  it('turno: K em prefixos, Ás por alvo e o ataque por último', () => {
    const s = setup({ p1: { hand: ['K', 'K', 'A'], attack: [5] }, p2: { defenseBuffs: ['Q'], guard: 1 } });
    const legal = legalActions(viewFor(s, P1));
    expect(legal.filter((a) => a.type === 'PLAY_K')).toHaveLength(2);
    expect(legal.filter((a) => a.type === 'TRAP')).toHaveLength(2);
    expect(legal[legal.length - 1]).toEqual({ type: 'DECLARE_ATTACK' });
  });

  it('sem Ás contra Defesa Absoluta; END_TURN com Ataque vazio', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    const legal = legalActions(viewFor(s, P1));
    expect(legal.some((a) => a.type === 'TRAP')).toBe(false);
    expect(legal).toContainEqual({ type: 'END_TURN' });
  });

  it('janela de Reflect: passar, anular ou proteger', () => {
    const legal = legalActions(viewFor(reflectState(), P2));
    expect(legal[0]).toEqual({ type: 'PASS' });
    expect(legal.some((a) => a.type === 'CANCEL_REFLECT')).toBe(true);
    expect(legal.some((a) => a.type === 'PROTECT_FROM_REFLECT')).toBe(true);
  });

  it('toda ação listada é aceita pelo motor', () => {
    const resurrection = setup({ p1: { attack: [7, 7, 7, 7], hand: ['W', 'J', 'Q', 'K'] }, graveyard: [5, 5, 6] });
    player(resurrection, P1).resurrections = [{ row: 'ATK', value: 7, formedAtRound: 3 }];
    const attackWindow = act(setup({ p1: { attack: [9], attackBuffs: ['J'], guard: 1 }, p2: { hand: ['A', 'W'] } }), P1, {
      type: 'DECLARE_ATTACK',
    }).state;
    const cases: Array<[GameState, PlayerId]> = [
      [setup({ ...equipPhase, p1: { pending: [3, 4, 5] } }), P1],
      [setup({ phase: { kind: 'ORDER_CHOICE', player: P1 } }), P1],
      [setup({ p1: { hand: ['K', 'K', 'A', 'J', 'Q', 'W'], attack: [5] }, p2: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 } }), P1],
      [resurrection, P1],
      [attackWindow, P2],
      [reflectState(), P2],
    ];
    for (const [s, who] of cases) {
      const legal = legalActions(viewFor(s, who));
      expect(legal.length).toBeGreaterThan(0);
      for (const action of legal) {
        const result = applyAction(s, who, action);
        expect(result.ok, JSON.stringify(action)).toBe(true);
      }
    }
  });
});
