// Devastação (F3 do sub-projeto 5): K + A + J esvazia a Fileira de Ataque do oponente, e K + A + Q a de Defesa. Os buffs ficam e
// a quadra se desfaz. A única resposta é o Reflect, que a devolve (quem lançou perde a própria fileira do mesmo tipo, sem quebrar
// Q nem K). Não pode ser lançada contra quem está sob Defesa Absoluta. O Selvagem faz A, J ou Q, nunca K.
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action.ts';
import { legalActions } from '../src/legal-actions.ts';
import { noPlayReason } from '../src/no-play.ts';
import type { Action, GameState, RowName } from '../src/types.ts';
import { viewFor } from '../src/view.ts';
import { P1, P2, act, actErr, handId, player, setup, values, type PlayerSetup } from './helpers.ts';

function devastateOf(s: GameState, who: string, row: RowName, a: 'A' | 'WILD' = 'A', x: 'J' | 'Q' | 'WILD' = row === 'ATK' ? 'J' : 'Q'): Action {
  const aId = handId(s, who, a);
  const xId = handId(s, who, x, a === 'WILD' && x === 'WILD' ? 1 : 0);
  return { type: 'DEVASTATE', kId: handId(s, who, 'K'), aId, xId, row };
}

const reflectOf = (s: GameState, who: string, type: 'REFLECT' | 'CANCEL_REFLECT' = 'REFLECT'): Action => ({
  type,
  kId: handId(s, who, 'K'),
  jId: handId(s, who, 'J'),
  qId: handId(s, who, 'Q'),
});

/** P1 lança a Devastação na fileira `row` de P2; P2 está na janela de resposta. */
function cast(p1: PlayerSetup, p2: PlayerSetup, row: RowName = 'ATK'): GameState {
  const s = setup({ p1, p2 });
  return act(s, P1, devastateOf(s, P1, row)).state;
}

describe('Devastação (F3)', () => {
  it('lançar abre a janela do oponente com a Devastação em curso; as 3 cartas saem da mão', () => {
    const s = setup({ p1: { hand: ['K', 'A', 'J'] }, p2: { attack: [5, 6] } });
    const r = act(s, P1, devastateOf(s, P1, 'ATK'));
    expect(r.state.phase).toMatchObject({ kind: 'REACTION', responder: P2, trigger: 'DEVASTATION', devastation: { player: P1, row: 'ATK' } });
    expect(player(r.state, P1).hand).toHaveLength(0);
    expect(r.events.map((e) => e.type)).toContain('DevastationCast');
  });

  it('K + A + J: o oponente passa e perde a Fileira de Ataque inteira; os J ficam, a quadra se desfaz, e o turno segue', () => {
    const s = cast({ hand: ['K', 'A', 'J'] }, { attack: [5, 5, 5, 5, 9], attackBuffs: ['J', 'J'], defense: [3] });
    const r = act(s, P2, { type: 'PASS' });
    expect(player(r.state, P2).attackRow).toEqual([]);
    expect(player(r.state, P2).attackBuffs).toHaveLength(2);
    expect(values(player(r.state, P2).defenseRow)).toEqual([3]);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'RowDevastated', player: P2, row: 'ATK', reflected: false }));
    expect(r.events.map((e) => e.type)).toContain('QuadBroken');
    // As 5 numéricas e as 3 cartas da Devastação vão ao cemitério.
    expect(r.state.graveyard).toHaveLength(8);
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('K + A + Q esvazia a Fileira de Defesa', () => {
    const s = cast({ hand: ['K', 'A', 'Q'] }, { attack: [4], defense: [7, 8], defenseBuffs: ['Q'] }, 'DEF');
    const r = act(s, P2, { type: 'PASS' });
    expect(player(r.state, P2).defenseRow).toEqual([]);
    expect(values(player(r.state, P2).attackRow)).toEqual([4]);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(1);
  });

  it('o tempo esgotado na janela vale como passar', () => {
    const s = cast({ hand: ['K', 'A', 'J'] }, { attack: [5] });
    expect(player(act(s, 'system', { type: 'TIMEOUT' }).state, P2).attackRow).toEqual([]);
  });

  it('o Selvagem faz o A e o J (ou o Q), nunca o K', () => {
    const wild = setup({ p1: { hand: ['K', 'W', 'W'] }, p2: { attack: [5] } });
    expect(act(wild, P1, devastateOf(wild, P1, 'ATK', 'WILD', 'WILD')).state.phase).toMatchObject({ trigger: 'DEVASTATION' });
    const noKing = setup({ p1: { hand: ['W', 'A', 'J'] }, p2: { attack: [5] } });
    const action: Action = { type: 'DEVASTATE', kId: handId(noKing, P1, 'WILD'), aId: handId(noKing, P1, 'A'), xId: handId(noKing, P1, 'J'), row: 'ATK' };
    expect(actErr(noKing, P1, action)).toBe('INVALID_CARD');
  });

  it('o J só esvazia o Ataque, e o Q só a Defesa', () => {
    const s = setup({ p1: { hand: ['K', 'A', 'J'] }, p2: { attack: [5], defense: [5] } });
    const wrong: Action = { type: 'DEVASTATE', kId: handId(s, P1, 'K'), aId: handId(s, P1, 'A'), xId: handId(s, P1, 'J'), row: 'DEF' };
    expect(actErr(s, P1, wrong)).toBe('INVALID_CARD');
  });

  it('recusada contra Defesa Absoluta, contra fileira vazia, fora da fase principal e com cartas repetidas', () => {
    const absolute = setup({ p1: { hand: ['K', 'A', 'J'] }, p2: { attack: [5], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    expect(actErr(absolute, P1, devastateOf(absolute, P1, 'ATK'))).toBe('TARGET_PROTECTED');
    const empty = setup({ p1: { hand: ['K', 'A', 'J'] }, p2: { defense: [5] } });
    expect(actErr(empty, P1, devastateOf(empty, P1, 'ATK'))).toBe('INVALID_TARGET');
    const notMine = setup({ p1: { hand: ['K', 'A', 'J'] }, p2: { attack: [5] }, turnOrder: [P2, P1], phase: { kind: 'ATTACK_MAIN', player: P2 } });
    expect(actErr(notMine, P1, devastateOf(notMine, P1, 'ATK'))).toBe('NOT_YOUR_TURN');
    const s = setup({ p1: { hand: ['K', 'A', 'J'] }, p2: { attack: [5] } });
    const k = handId(s, P1, 'K');
    expect(actErr(s, P1, { type: 'DEVASTATE', kId: k, aId: k, xId: handId(s, P1, 'J'), row: 'ATK' })).toBe('DUPLICATE_CARDS');
  });

  it('na janela, só passar ou o Reflect: a Armadilha não responde', () => {
    const s = cast({ hand: ['K', 'A', 'J'], attackBuffs: ['J'] }, { attack: [5], hand: ['A'] });
    const target = player(s, P1).attackBuffs[0].id;
    expect(actErr(s, P2, { type: 'TRAP', cardId: handId(s, P2, 'A'), targetId: target })).toBe('WRONG_PHASE');
  });
});

describe('Reflect contra a Devastação (F2 + F3)', () => {
  it('o Reflect devolve: quem lançou perde a própria fileira do mesmo tipo, sem quebrar Q nem K, e segue no turno', () => {
    const s = cast(
      { hand: ['K', 'A', 'J'], attack: [9, 9], defense: [4], defenseBuffs: ['Q'], guard: 2 },
      { attack: [5, 6], hand: ['K', 'J', 'Q'] },
    );
    const reflected = act(s, P2, reflectOf(s, P2));
    expect(reflected.state.phase).toMatchObject({ kind: 'REACTION', responder: P1, trigger: 'REFLECT_PLAYED', devastation: { row: 'ATK' } });
    expect(reflected.events).toContainEqual(expect.objectContaining({ type: 'ReflectPlayed', player: P2, against: 'DEVASTATION' }));
    const r = act(reflected.state, P1, { type: 'PASS' });
    expect(player(r.state, P1).attackRow).toEqual([]);
    expect(values(player(r.state, P2).attackRow)).toEqual([5, 6]);
    expect(player(r.state, P1).guard).toHaveLength(2);
    expect(player(r.state, P1).defenseBuffs).toHaveLength(1);
    expect(player(r.state, P2).reflect).toBeNull();
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'RowDevastated', player: P1, row: 'ATK', reflected: true }));
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
    // As 2 numéricas de P1, as 3 da Devastação e as 3 do Reflect.
    expect(r.state.graveyard).toHaveLength(8);
  });

  it('Reflect contra Reflect: nada acontece, as 9 cartas vão ao cemitério e quem lançou segue no turno ([I])', () => {
    const s = cast({ hand: ['K', 'A', 'J', 'K', 'J', 'Q'], attack: [9] }, { attack: [5, 6], hand: ['K', 'J', 'Q'] });
    const reflected = act(s, P2, reflectOf(s, P2)).state;
    const r = act(reflected, P1, reflectOf(reflected, P1, 'CANCEL_REFLECT'));
    expect(values(player(r.state, P1).attackRow)).toEqual([9]);
    expect(values(player(r.state, P2).attackRow)).toEqual([5, 6]);
    expect(r.state.graveyard).toHaveLength(9);
    expect(r.events).toContainEqual({ type: 'ReflectCanceled', player: P1, owner: P2 });
    expect(r.events).toContainEqual({ type: 'DevastationCanceled', player: P1, reason: 'REFLECT_CLASH' });
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('quem lançou está sob Defesa Absoluta: o Reflect é anulado e ninguém perde fileira ([I])', () => {
    const s = cast(
      { hand: ['K', 'A', 'J'], attack: [9], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true },
      { attack: [5], hand: ['K', 'J', 'Q'] },
    );
    const reflected = act(s, P2, reflectOf(s, P2)).state;
    const r = act(reflected, P1, { type: 'PASS' });
    expect(values(player(r.state, P1).attackRow)).toEqual([9]);
    expect(values(player(r.state, P2).attackRow)).toEqual([5]);
    expect(r.events).toContainEqual({ type: 'DevastationCanceled', player: P1, reason: 'ABSOLUTE_DEFENSE' });
  });
});

describe('Devastação nas jogadas legais e no motivo sem jogada', () => {
  it('aparece na fase principal para cada fileira do oponente com carta; some contra Defesa Absoluta', () => {
    const s = setup({ p1: { hand: ['K', 'A', 'J', 'Q'] }, p2: { attack: [5], defense: [6] } });
    const rows = legalActions(viewFor(s, P1)).filter((a) => a.type === 'DEVASTATE').map((a) => (a.type === 'DEVASTATE' ? a.row : ''));
    expect(new Set(rows)).toEqual(new Set(['ATK', 'DEF']));
    const onlyAttack = setup({ p1: { hand: ['K', 'A', 'J', 'Q'] }, p2: { attack: [5] } });
    expect(legalActions(viewFor(onlyAttack, P1)).filter((a) => a.type === 'DEVASTATE').every((a) => a.type === 'DEVASTATE' && a.row === 'ATK')).toBe(true);
    const absolute = setup({ p1: { hand: ['K', 'A', 'J'] }, p2: { attack: [5], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    expect(legalActions(viewFor(absolute, P1)).some((a) => a.type === 'DEVASTATE')).toBe(false);
  });

  it('na janela dela, só passar ou o Reflect; e nenhuma carta sozinha joga', () => {
    const s = cast({ hand: ['K', 'A', 'J'] }, { attack: [5], hand: ['K', 'J', 'Q', 'A'] });
    const legal = legalActions(viewFor(s, P2));
    expect(legal.every((a) => a.type === 'PASS' || a.type === 'REFLECT')).toBe(true);
    expect(legal.some((a) => a.type === 'REFLECT')).toBe(true);
    for (const card of player(s, P2).hand) expect(noPlayReason(viewFor(s, P2), card)).toBe('REACTION_DEVASTATION');
    for (const action of legal) expect(applyAction(s, P2, action).ok).toBe(true);
  });
});
