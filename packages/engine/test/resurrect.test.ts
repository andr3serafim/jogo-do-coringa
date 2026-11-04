import { describe, expect, it } from 'vitest';
import { legalActions } from '../src/legal-actions.ts';
import { resurrectionRows } from '../src/quads.ts';
import type { GameState, Rank, Resurrection, RowName } from '../src/types.ts';
import { viewFor } from '../src/view.ts';
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

// As fileiras do `setup` têm 7 cartas no máximo.
describe('a troca e a proteção (ponto 16)', () => {
  const resurrect = (s: GameState, row: RowName, nth = 0) =>
    ({ type: 'RESURRECT', cardId: s.graveyard.filter((c) => c.kind === 'NUM')[nth].id, row }) as const;

  it('as duas cheias: a ressuscitada entra no lugar da última da fileira, que vai ao cemitério', () => {
    const s = setup({ p1: { attack: [7, 7, 7, 7, 2, 3, 4], defense: [2, 3, 4, 5, 6, 8, 9] }, graveyard: [10] });
    player(s, P1).resurrections = [token];
    const leaving = player(s, P1).defenseRow[6];
    const r = act(s, P1, resurrect(s, 'DEF'));
    expect(values(player(r.state, P1).defenseRow)).toEqual([2, 3, 4, 5, 6, 8, 10]);
    expect(r.state.graveyard.map((c) => c.id)).toEqual([leaving.id]);
    expect(r.events.map((e) => e.type)).toEqual(['CardsRemovedFromRow', 'Resurrected']);
    expect(r.events[0]).toEqual({ type: 'CardsRemovedFromRow', player: P1, row: 'DEF', cards: [leaving] });
    expect(player(r.state, P1).resurrections).toEqual([]);
  });

  it('a que sai da Defesa cura pela regra geral (2 K e 1 Q: valor × 2); a que sai do Ataque não cura', () => {
    const rows = { attack: [7, 7, 7, 7, 2, 3, 4] as Rank[], defense: [2, 3, 4, 5, 6, 8, 9] as Rank[] };
    const s = setup({ p1: { ...rows, hp: 50, guard: 2, defenseBuffs: ['Q'] }, graveyard: [10, 10] });
    player(s, P1).resurrections = [token, { ...token, value: 2 }];
    const def = act(s, P1, resurrect(s, 'DEF'));
    expect(def.events.map((e) => e.type)).toEqual(['CardsRemovedFromRow', 'Healed', 'Resurrected']);
    expect(def.events[1]).toMatchObject({ type: 'Healed', player: P1, amount: 18, source: 'DEFENSE' });
    expect(player(def.state, P1).hp).toBe(68);
    const atk = act(s, P1, resurrect(s, 'ATK'));
    expect(atk.events.map((e) => e.type)).toEqual(['CardsRemovedFromRow', 'Resurrected']);
    expect(player(atk.state, P1).hp).toBe(50);
  });

  it('a última que é da quadra não sai: aquela fileira recusa, e a outra troca', () => {
    const s = setup({ p1: { attack: [2, 3, 4, 7, 7, 7, 7], defense: [2, 3, 4, 5, 6, 8, 9] }, graveyard: [10] });
    player(s, P1).resurrections = [token];
    expect(actErr(s, P1, resurrect(s, 'ATK'))).toBe('QUAD_PROTECTED');
    expect(values(player(act(s, P1, resurrect(s, 'DEF')).state, P1).defenseRow)).toEqual([2, 3, 4, 5, 6, 8, 10]);
  });

  it('com 5 iguais, a 5ª também é da quadra; uma última de outro valor sai mesmo com a quadra na fileira', () => {
    const five = setup({ p1: { attack: [2, 7, 7, 7, 7, 3, 7], defense: [2, 3, 4, 5, 6, 8, 9] }, graveyard: [10] });
    player(five, P1).resurrections = [token];
    expect(actErr(five, P1, resurrect(five, 'ATK'))).toBe('QUAD_PROTECTED');
    const other = setup({ p1: { attack: [7, 7, 7, 7, 2, 3, 4], defense: [2, 3, 4, 5, 6, 8, 9] }, graveyard: [10] });
    player(other, P1).resurrections = [token];
    const r = act(other, P1, resurrect(other, 'ATK'));
    expect(values(player(r.state, P1).attackRow)).toEqual([7, 7, 7, 7, 2, 3, 10]);
    expect(r.events).not.toContainEqual(expect.objectContaining({ type: 'QuadBroken' }));
  });

  it('as duas últimas da quadra: nenhuma fileira aceita, a Ressurreição fica e a lista legal não a traz', () => {
    const s = setup({ p1: { attack: [2, 3, 4, 7, 7, 7, 7], defense: [2, 3, 9, 9, 9, 6, 9] }, graveyard: [10] });
    player(s, P1).resurrections = [token];
    expect(actErr(s, P1, resurrect(s, 'ATK'))).toBe('QUAD_PROTECTED');
    expect(actErr(s, P1, resurrect(s, 'DEF'))).toBe('QUAD_PROTECTED');
    expect(player(s, P1).resurrections).toEqual([token]);
    expect(legalActions(viewFor(s, P1)).some((a) => a.type === 'RESURRECT')).toBe(false);
  });

  it('a ressuscitada sai do cemitério antes da troca: a que sai não volta na mesma jogada', () => {
    const s = setup({ p1: { attack: [7, 7, 7, 7, 2, 3, 4], defense: [2, 3, 4, 6, 6, 8, 5] }, graveyard: [5] });
    player(s, P1).resurrections = [token];
    const fromGraveyard = s.graveyard[0].id;
    const leaving = player(s, P1).defenseRow[6].id;
    const r = act(s, P1, resurrect(s, 'DEF'));
    expect(player(r.state, P1).defenseRow[6].id).toBe(fromGraveyard);
    expect(r.state.graveyard.map((c) => c.id)).toEqual([leaving]);
  });

  it('uma cheia e a outra com vaga: a cheia recusa (ROW_FULL), como antes', () => {
    const s = setup({ p1: { attack: [7, 7, 7, 7, 2, 3, 4], defense: [2, 3] }, graveyard: [10] });
    player(s, P1).resurrections = [token];
    expect(actErr(s, P1, resurrect(s, 'ATK'))).toBe('ROW_FULL');
  });

  it('sem resurrectOnQuad, as duas cheias recusam (ROW_FULL), como antes', () => {
    const s = setup({
      config: { resurrectOnQuad: undefined },
      p1: { attack: [7, 7, 7, 7, 2, 3, 4], defense: [2, 3, 4, 5, 6, 8, 9] },
      graveyard: [10],
    });
    player(s, P1).resurrections = [token];
    expect(actErr(s, P1, resurrect(s, 'ATK'))).toBe('ROW_FULL');
    expect(actErr(s, P1, resurrect(s, 'DEF'))).toBe('ROW_FULL');
  });

  it('sob Defesa Absoluta, a troca na própria Defesa vale (como a troca do Equipar)', () => {
    const s = setup({
      p1: { attack: [7, 7, 7, 7, 2, 3, 4], defense: [2, 3, 4, 5, 6, 8, 9], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true },
      graveyard: [10],
    });
    player(s, P1).resurrections = [token];
    expect(values(player(act(s, P1, resurrect(s, 'DEF')).state, P1).defenseRow)).toEqual([2, 3, 4, 5, 6, 8, 10]);
  });

  it('resurrectionRows: no fim, trocando, cheia com vaga na outra e protegida pela quadra', () => {
    const config = { rowLimit: 7, resurrectOnQuad: true };
    const s = setup({ p1: { attack: [2, 3, 4, 7, 7, 7, 7], defense: [2, 3, 4, 5, 6, 8, 9] } });
    const p = player(s, P1);
    const both = resurrectionRows(config, p);
    expect(both.ATK).toEqual({ kind: 'BLOCKED', reason: 'QUAD', last: p.attackRow[6] });
    expect(both.DEF).toEqual({ kind: 'REPLACE', leaving: p.defenseRow[6] });
    const open = resurrectionRows(config, { attackRow: p.attackRow, defenseRow: p.defenseRow.slice(0, 3) });
    expect(open).toEqual({ ATK: { kind: 'BLOCKED', reason: 'FULL', last: p.attackRow[6] }, DEF: { kind: 'APPEND' } });
    expect(resurrectionRows({ rowLimit: 7 }, p).DEF).toEqual({ kind: 'BLOCKED', reason: 'FULL', last: p.defenseRow[6] });
  });

  it('legalActions na fase principal: um RESURRECT por valor e por fileira que aceita (as duas cheias, a protegida fora)', () => {
    const s = setup({ p1: { attack: [2, 3, 4, 7, 7, 7, 7], defense: [2, 3, 4, 5, 6, 8, 9] }, graveyard: [10, 10, 5] });
    player(s, P1).resurrections = [token];
    const listed = legalActions(viewFor(s, P1)).filter((a) => a.type === 'RESURRECT');
    expect(listed.map((a) => (a.type === 'RESURRECT' ? a.row : null))).toEqual(['DEF', 'DEF']);
    const open = setup({ p1: { attack: [7, 7, 7, 7], defense: [2, 3, 4, 5, 6, 8, 9] }, graveyard: [10] });
    player(open, P1).resurrections = [token];
    expect(legalActions(viewFor(open, P1)).filter((a) => a.type === 'RESURRECT').map((a) => (a.type === 'RESURRECT' ? a.row : null))).toEqual(['ATK']);
  });
});
