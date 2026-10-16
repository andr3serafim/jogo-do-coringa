import { describe, expect, it } from 'vitest';
import { P1, P2, act, actErr, handId, player, setup, steps } from './helpers';

describe('K e Exódia', () => {
  it('jogar K abre a janela de reação e depois volta ao turno', () => {
    const s = setup({ p1: { hand: ['K', 'K'] } });
    const a = act(s, P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'K', 0), handId(s, P1, 'K', 1)] });
    expect(player(a.state, P1).guard).toHaveLength(2);
    expect(a.state.phase).toEqual({ kind: 'REACTION', responder: P2, trigger: 'K_PLAYED' });
    const b = act(a.state, P2, { type: 'PASS' });
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('4 K na Guarda depois da janela = Exódia', () => {
    const s = setup({ p1: { guard: 2, hand: ['K', 'K'] } });
    const r = steps(s, [
      [P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'K', 0), handId(s, P1, 'K', 1)] }],
      [P2, { type: 'PASS' }],
    ]);
    expect(r.state.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P1, reason: 'EXODIA' } });
    expect(r.events).toContainEqual({ type: 'Exodia', player: P1 });
  });

  it('o Ás na janela impede a Exódia', () => {
    const s = setup({ p1: { guard: 2, hand: ['K', 'K'] }, p2: { hand: ['A'] } });
    const a = act(s, P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'K', 0), handId(s, P1, 'K', 1)] });
    const target = player(a.state, P1).guard[0].id;
    const r = steps(a.state, [
      [P2, { type: 'TRAP', cardId: handId(s, P2, 'A'), targetId: target }],
      [P2, { type: 'PASS' }],
    ]);
    expect(player(r.state, P1).guard).toHaveLength(3);
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('na janela de K, o Ás só mira K', () => {
    const s = setup({ p1: { hand: ['K'], attackBuffs: ['J'] }, p2: { hand: ['A'] } });
    const a = act(s, P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'K')] });
    const jId = player(s, P1).attackBuffs[0].id;
    expect(actErr(a.state, P2, { type: 'TRAP', cardId: handId(s, P2, 'A'), targetId: jId })).toBe('INVALID_TARGET');
  });

  it('rejeita K repetido, lista vazia e Selvagem como K (review focus 1)', () => {
    const s = setup({ p1: { hand: ['K', 'W'] } });
    const k = handId(s, P1, 'K');
    expect(actErr(s, P1, { type: 'PLAY_K', cardIds: [k, k] })).toBe('DUPLICATE_CARDS');
    expect(actErr(s, P1, { type: 'PLAY_K', cardIds: [] })).toBe('INVALID_CARD');
    expect(actErr(s, P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'WILD')] })).toBe('INVALID_CARD');
  });
});

describe('Armadilha (Ás)', () => {
  it('destrói um especial do oponente no seu turno', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { defenseBuffs: ['Q'] } });
    const r = act(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'A'), targetId: player(s, P2).defenseBuffs[0].id });
    expect(player(r.state, P2).defenseBuffs).toHaveLength(0);
    expect(r.state.graveyard.map((c) => c.kind)).toEqual(['A', 'Q']);
  });

  it('o Coringa Selvagem funciona como Ás', () => {
    const s = setup({ p1: { hand: ['W'] }, p2: { guard: 1 } });
    const r = act(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'WILD'), targetId: player(s, P2).guard[0].id });
    expect(player(r.state, P2).guard).toHaveLength(0);
  });

  it('não atravessa a Defesa Absoluta', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    const target = player(s, P2).defenseBuffs[0].id;
    expect(actErr(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'A'), targetId: target })).toBe('TARGET_PROTECTED');
  });

  it('não mira as cartas de um Reflect ativo', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { reflect: true } });
    const target = player(s, P2).reflect?.k.id ?? '';
    expect(actErr(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'A'), targetId: target })).toBe('INVALID_TARGET');
  });

  it('na janela de ataque, o Ás quebra um J antes do dano', () => {
    const s = setup({ p1: { attack: [10], attackBuffs: ['J', 'J'] }, p2: { hand: ['A'] } });
    const r = steps(s, [
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'TRAP', cardId: handId(s, P2, 'A'), targetId: player(s, P1).attackBuffs[0].id }],
      [P2, { type: 'PASS' }],
    ]);
    expect(player(r.state, P2).hp).toBe(80);
  });
});

describe('Sacrifício', () => {
  it('J da mão abate J do oponente', () => {
    const s = setup({ p1: { hand: ['J'] }, p2: { attackBuffs: ['J'] } });
    const r = act(s, P1, { type: 'SACRIFICE', cardId: handId(s, P1, 'J'), targetId: player(s, P2).attackBuffs[0].id });
    expect(player(r.state, P2).attackBuffs).toHaveLength(0);
    expect(r.state.graveyard).toHaveLength(2);
  });

  it('Q abate Q, e o Selvagem serve como Q', () => {
    const s = setup({ p1: { hand: ['Q', 'W'] }, p2: { defenseBuffs: ['Q', 'Q'] } });
    const [q1, q2] = player(s, P2).defenseBuffs.map((c) => c.id);
    const r = steps(s, [
      [P1, { type: 'SACRIFICE', cardId: handId(s, P1, 'Q'), targetId: q1 }],
      [P1, { type: 'SACRIFICE', cardId: handId(s, P1, 'WILD'), targetId: q2 }],
    ]);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(0);
  });

  it('J não abate Q, e K não é alvo', () => {
    const s = setup({ p1: { hand: ['J'] }, p2: { defenseBuffs: ['Q'], guard: 1 } });
    const jId = handId(s, P1, 'J');
    expect(actErr(s, P1, { type: 'SACRIFICE', cardId: jId, targetId: player(s, P2).defenseBuffs[0].id })).toBe('INVALID_CARD');
    expect(actErr(s, P1, { type: 'SACRIFICE', cardId: jId, targetId: player(s, P2).guard[0].id })).toBe('INVALID_TARGET');
  });

  it('é bloqueado pela Defesa Absoluta', () => {
    const s = setup({ p1: { hand: ['Q'] }, p2: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    const target = player(s, P2).defenseBuffs[0].id;
    expect(actErr(s, P1, { type: 'SACRIFICE', cardId: handId(s, P1, 'Q'), targetId: target })).toBe('TARGET_PROTECTED');
  });

  it('não vale como reação', () => {
    const s = setup({ p1: { attack: [5], attackBuffs: ['J'] }, p2: { hand: ['J'] } });
    const a = act(s, P1, { type: 'DECLARE_ATTACK' });
    const target = player(s, P1).attackBuffs[0].id;
    expect(actErr(a.state, P2, { type: 'SACRIFICE', cardId: handId(s, P2, 'J'), targetId: target })).toBe('WRONG_PHASE');
  });
});
