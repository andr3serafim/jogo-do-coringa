import { describe, expect, it } from 'vitest';
import type { Resurrection } from '../src/types.ts';
import { P1, act, actErr, player, setup, values } from './helpers.ts';

const token: Resurrection = { row: 'ATK', value: 7, formedAtRound: 3 };

describe('Ressurreição', () => {
  it('pega uma numérica do cemitério e consome a Ressurreição', () => {
    const s = setup({ p1: { attack: [7, 7, 7, 7] }, graveyard: [5] });
    player(s, P1).resurrections = [token];
    const r = act(s, P1, { type: 'RESURRECT', cardId: s.graveyard[0].id, row: 'DEF' });
    expect(values(player(r.state, P1).defenseRow)).toEqual([5]);
    expect(player(r.state, P1).resurrections).toEqual([]);
    expect(r.state.graveyard).toHaveLength(0);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'Resurrected', player: P1, row: 'DEF' }));
  });

  it('sem Ressurreição válida não dá', () => {
    const s = setup({ graveyard: [5] });
    expect(actErr(s, P1, { type: 'RESURRECT', cardId: s.graveyard[0].id, row: 'ATK' })).toBe('NO_RESURRECTION');
  });

  it('sem a quadra, vale até 3 rodadas após a formação', () => {
    const inTime = setup({ round: 6, graveyard: [5] });
    player(inTime, P1).resurrections = [token];
    act(inTime, P1, { type: 'RESURRECT', cardId: inTime.graveyard[0].id, row: 'ATK' });
    const late = setup({ round: 7, graveyard: [5] });
    player(late, P1).resurrections = [token];
    expect(actErr(late, P1, { type: 'RESURRECT', cardId: late.graveyard[0].id, row: 'ATK' })).toBe('NO_RESURRECTION');
  });

  it('só numéricas, que estejam no cemitério, em fileira com espaço', () => {
    const s = setup({ p1: { attack: [7, 7, 7, 7], defense: [2, 2, 3, 3, 4, 4, 5] }, graveyard: ['K', 6] });
    player(s, P1).resurrections = [token];
    const [kId, sixId] = s.graveyard.map((c) => c.id);
    expect(actErr(s, P1, { type: 'RESURRECT', cardId: kId, row: 'ATK' })).toBe('INVALID_CARD');
    expect(actErr(s, P1, { type: 'RESURRECT', cardId: 'inexistente', row: 'ATK' })).toBe('CARD_NOT_IN_GRAVEYARD');
    expect(actErr(s, P1, { type: 'RESURRECT', cardId: sixId, row: 'DEF' })).toBe('ROW_FULL');
  });

  it('reviver pode formar nova quadra e gerar nova Ressurreição', () => {
    const s = setup({ p1: { attack: [7, 7, 7, 7], defense: [9, 9, 9] }, graveyard: [9] });
    player(s, P1).resurrections = [token];
    const r = act(s, P1, { type: 'RESURRECT', cardId: s.graveyard[0].id, row: 'DEF' });
    expect(r.events).toContainEqual({ type: 'QuadFormed', player: P1, quad: { row: 'DEF', value: 9 } });
    expect(player(r.state, P1).resurrections).toEqual([{ row: 'DEF', value: 9, formedAtRound: 3 }]);
  });
});
