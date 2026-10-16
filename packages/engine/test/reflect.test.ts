import { describe, expect, it } from 'vitest';
import type { Action, GameState } from '../src/types.ts';
import { P1, P2, act, actErr, handId, player, setup, steps } from './helpers.ts';

const reflectOf = (s: GameState, id: string, j: 'J' | 'WILD' = 'J'): Action => ({
  type: 'REFLECT',
  kId: handId(s, id, 'K'),
  jId: handId(s, id, j),
  qId: handId(s, id, 'Q'),
});

describe('Reflect', () => {
  it('lançar abre a janela; passar volta ao turno de quem lançou', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] } });
    const a = act(s, P1, reflectOf(s, P1));
    expect(player(a.state, P1).reflect).not.toBeNull();
    expect(a.state.phase).toEqual({ kind: 'REACTION', responder: P2, trigger: 'REFLECT_PLAYED' });
    expect(act(a.state, P2, { type: 'PASS' }).state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('só um Reflect ativo por jogador', () => {
    const s = setup({ p1: { reflect: true, hand: ['K', 'J', 'Q'] } });
    expect(actErr(s, P1, reflectOf(s, P1))).toBe('REFLECT_ALREADY_ACTIVE');
  });

  it('o Selvagem serve como J do Reflect, mas nunca como K', () => {
    const s = setup({ p1: { hand: ['K', 'W', 'Q'] } });
    act(s, P1, reflectOf(s, P1, 'WILD'));
    const bad = setup({ p1: { hand: ['W', 'J', 'Q'] } });
    const action: Action = { type: 'REFLECT', kId: handId(bad, P1, 'WILD'), jId: handId(bad, P1, 'J'), qId: handId(bad, P1, 'Q') };
    expect(actErr(bad, P1, action)).toBe('INVALID_CARD');
  });

  it('dispara quando o oponente ataca: quebra K e Q dele e devolve o dano (exemplo 3)', () => {
    const s = setup({
      p1: { hand: ['K', 'J', 'Q'] },
      p2: { attack: [6, 8, 9], attackBuffs: ['J'], defense: [4, 10], defenseBuffs: ['Q'], guard: 2 },
    });
    const r = steps(s, [
      [P1, reflectOf(s, P1)],
      [P2, { type: 'PASS' }],
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'DECLARE_ATTACK' }],
      [P1, { type: 'PASS' }],
    ]);
    expect(player(r.state, P2).hp).toBe(61);
    expect(player(r.state, P1).hp).toBe(100);
    expect(player(r.state, P2).guard).toHaveLength(0);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(0);
    expect(player(r.state, P1).reflect).toBeNull();
    expect(r.events).toContainEqual({ type: 'ReflectTriggered', owner: P1, attacker: P2, damage: 39 });
  });

  it('expira no fim do turno do oponente se ele não atacar', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] } });
    const r = steps(s, [
      [P1, reflectOf(s, P1)],
      [P2, { type: 'PASS' }],
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.events).toContainEqual({ type: 'ReflectExpired', owner: P1 });
    expect(player(r.state, P1).reflect).toBeNull();
    expect(r.state.graveyard).toHaveLength(3);
  });
});

describe('contra-jogadas', () => {
  it('anular com K+J+Q da mão na janela: os dois conjuntos vão para o cemitério', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] }, p2: { hand: ['K', 'W', 'Q'] } });
    const a = act(s, P1, reflectOf(s, P1));
    const b = act(a.state, P2, { type: 'CANCEL_REFLECT', kId: handId(s, P2, 'K'), jId: handId(s, P2, 'WILD'), qId: handId(s, P2, 'Q') });
    expect(player(b.state, P1).reflect).toBeNull();
    expect(b.state.graveyard).toHaveLength(6);
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
    expect(b.events).toContainEqual({ type: 'ReflectCanceled', player: P2, owner: P1 });
  });

  it('anular só vale na janela do lançamento', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] }, p2: { reflect: true } });
    const cancel: Action = { type: 'CANCEL_REFLECT', kId: handId(s, P1, 'K'), jId: handId(s, P1, 'J'), qId: handId(s, P1, 'Q') };
    expect(actErr(s, P1, cancel)).toBe('WRONG_PHASE');
  });

  it('proteger sacrificando J+Q+K do campo, na janela', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] }, p2: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 } });
    const p2 = player(s, P2);
    const a = act(s, P1, reflectOf(s, P1));
    const b = act(a.state, P2, {
      type: 'PROTECT_FROM_REFLECT',
      jId: p2.attackBuffs[0].id,
      qId: p2.defenseBuffs[0].id,
      kId: p2.guard[0].id,
    });
    expect(player(b.state, P1).reflect).toBeNull();
    expect(player(b.state, P2).attackBuffs).toHaveLength(0);
    expect(player(b.state, P2).defenseBuffs).toHaveLength(0);
    expect(player(b.state, P2).guard).toHaveLength(0);
    expect(b.state.graveyard).toHaveLength(6);
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('proteger também no próprio turno, antes de atacar', () => {
    const s = setup({
      p1: { hand: ['K', 'J', 'Q'] },
      p2: { attack: [5], attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 },
    });
    const p2 = player(s, P2);
    const r = steps(s, [
      [P1, reflectOf(s, P1)],
      [P2, { type: 'PASS' }],
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'PROTECT_FROM_REFLECT', jId: p2.attackBuffs[0].id, qId: p2.defenseBuffs[0].id, kId: p2.guard[0].id }],
      [P2, { type: 'DECLARE_ATTACK' }],
      [P1, { type: 'PASS' }],
    ]);
    expect(player(r.state, P1).hp).toBe(95);
  });

  it('proteger exige Reflect do oponente e as três cartas equipadas', () => {
    const noReflect = setup({ p1: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 } });
    const mine = player(noReflect, P1);
    const protect: Action = { type: 'PROTECT_FROM_REFLECT', jId: mine.attackBuffs[0].id, qId: mine.defenseBuffs[0].id, kId: mine.guard[0].id };
    expect(actErr(noReflect, P1, protect)).toBe('NO_REFLECT');
    const missing = setup({ p1: { attackBuffs: ['J'], defenseBuffs: ['Q'] }, p2: { reflect: true } });
    const m = player(missing, P1);
    expect(actErr(missing, P1, { type: 'PROTECT_FROM_REFLECT', jId: m.attackBuffs[0].id, qId: m.defenseBuffs[0].id, kId: 'nada' })).toBe('INVALID_CARD');
  });

  it('o Ás não responde a um Reflect', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'], attackBuffs: ['J'] }, p2: { hand: ['A'] } });
    const a = act(s, P1, reflectOf(s, P1));
    const target = player(s, P1).attackBuffs[0].id;
    expect(actErr(a.state, P2, { type: 'TRAP', cardId: handId(s, P2, 'A'), targetId: target })).toBe('WRONG_PHASE');
  });
});

describe('Defesa Absoluta × proteção contra Reflect (decisão do autor, 2026-10-16)', () => {
  it('a imunidade da rodada continua e o Q sacrificado conta como o Q consumido', () => {
    const s = setup({
      p1: { hand: ['K', 'J', 'Q'], attack: [10, 10] },
      p2: { attackBuffs: ['J'], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true, guard: 1 },
    });
    const p2 = player(s, P2);
    const r = steps(s, [
      [P1, reflectOf(s, P1)],
      [P2, { type: 'PROTECT_FROM_REFLECT', jId: p2.attackBuffs[0].id, qId: p2.defenseBuffs[0].id, kId: p2.guard[0].id }],
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'PASS' }],
    ]);
    expect(player(r.state, P2).hp).toBe(100);
    expect(r.events).toContainEqual({ type: 'AbsoluteDefenseEnded', player: P2 });
    expect(player(r.state, P2).absoluteDefense).toBe(false);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(3);
    expect(r.events.filter((e) => e.type === 'BuffRemoved' && e.player === P2)).toHaveLength(0);
  });

  it('se o Q for reposto depois da proteção, o fim da Defesa Absoluta consome 1 e sobram 3', () => {
    const s = setup({
      p1: { reflect: true },
      p2: { hand: ['Q', 'Q'], attackBuffs: ['J'], defenseBuffs: ['Q', 'Q', 'Q'], guard: 1 },
      turnOrder: [P2, P1],
      phase: { kind: 'ATTACK_MAIN', player: P2 },
    });
    const p2 = player(s, P2);
    const r = steps(s, [
      [P2, { type: 'PLAY_Q', cardId: handId(s, P2, 'Q', 0) }],
      [P2, { type: 'PROTECT_FROM_REFLECT', jId: p2.attackBuffs[0].id, qId: p2.defenseBuffs[0].id, kId: p2.guard[0].id }],
      [P2, { type: 'PLAY_Q', cardId: handId(s, P2, 'Q', 1) }],
      [P2, { type: 'END_TURN' }],
      [P1, { type: 'END_TURN' }],
    ]);
    expect(player(r.state, P2).absoluteDefense).toBe(false);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(3);
  });
});
