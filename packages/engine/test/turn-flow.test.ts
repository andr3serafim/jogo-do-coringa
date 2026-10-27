import { describe, expect, it } from 'vitest';
import { P1, P2, act, actErr, handId, player, setup, steps, values } from './helpers.ts';

describe('buffs na fase principal', () => {
  it('J vai para os Buffs de Ataque; Selvagem também serve como J', () => {
    const s = setup({ p1: { hand: ['J', 'W'] } });
    const a = act(s, P1, { type: 'PLAY_J', cardId: handId(s, P1, 'J') });
    expect(a.events).toContainEqual(expect.objectContaining({ type: 'BuffPlayed', player: P1, as: 'J' }));
    const b = act(a.state, P1, { type: 'PLAY_J', cardId: handId(s, P1, 'WILD') });
    expect(player(b.state, P1).attackBuffs).toHaveLength(2);
    expect(player(b.state, P1).hand).toHaveLength(0);
  });

  it('respeita o limite de 4 J', () => {
    const s = setup({ p1: { hand: ['J'], attackBuffs: ['J', 'J', 'J', 'J'] } });
    expect(actErr(s, P1, { type: 'PLAY_J', cardId: handId(s, P1, 'J') })).toBe('BUFF_LIMIT');
  });

  it('rejeita carta da mão do oponente e carta do tipo errado (review focus 1)', () => {
    const s = setup({ p1: { hand: ['K'] }, p2: { hand: ['J'] } });
    expect(actErr(s, P1, { type: 'PLAY_J', cardId: handId(s, P2, 'J') })).toBe('CARD_NOT_IN_HAND');
    expect(actErr(s, P1, { type: 'PLAY_J', cardId: handId(s, P1, 'K') })).toBe('INVALID_CARD');
  });

  it('o 4º Q ativa a Defesa Absoluta', () => {
    const s = setup({ p1: { hand: ['Q'], defenseBuffs: ['Q', 'Q', 'Q'] } });
    const r = act(s, P1, { type: 'PLAY_Q', cardId: handId(s, P1, 'Q') });
    expect(r.events).toContainEqual({ type: 'AbsoluteDefenseStarted', player: P1 });
    expect(player(r.state, P1).absoluteDefense).toBe(true);
  });

  it('o Selvagem como 4º J torna o ataque Absoluto (exemplo 7)', () => {
    const s = setup({ p1: { hand: ['W'], attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J'] }, p2: { guard: 1 } });
    const r = steps(s, [
      [P1, { type: 'PLAY_J', cardId: handId(s, P1, 'WILD') }],
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'PASS' }],
    ]);
    expect(r.events).toContainEqual({ type: 'AbsoluteAttack', player: P1 });
    expect(player(r.state, P2).guard).toHaveLength(0);
    expect(player(r.state, P2).hp).toBe(10);
  });

  it('o oponente não age no turno alheio (review focus 2)', () => {
    const s = setup({ p2: { hand: ['J'] } });
    expect(actErr(s, P2, { type: 'PLAY_J', cardId: handId(s, P2, 'J') })).toBe('NOT_YOUR_TURN');
    expect(actErr(s, P2, { type: 'PASS' })).toBe('WRONG_PHASE');
  });
});

describe('ataque e janela de reação', () => {
  it('declarar abre a janela do oponente; passar resolve e passa o turno', () => {
    const s = setup({ p1: { attack: [6] }, p2: { attack: [2] } });
    const a = act(s, P1, { type: 'DECLARE_ATTACK' });
    expect(a.state.phase).toEqual({ kind: 'REACTION', responder: P2, trigger: 'ATTACK' });
    expect(actErr(a.state, P1, { type: 'END_TURN' })).toBe('WRONG_PHASE');
    expect(actErr(a.state, P1, { type: 'PASS' })).toBe('NOT_YOUR_TURN');
    const b = act(a.state, P2, { type: 'PASS' });
    expect(player(b.state, P2).hp).toBe(94);
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
  });

  it('com Ataque vazio o turno termina sem atacar; com cartas, é obrigatório atacar', () => {
    const empty = setup();
    expect(actErr(empty, P1, { type: 'DECLARE_ATTACK' })).toBe('ATTACK_ROW_EMPTY');
    expect(act(empty, P1, { type: 'END_TURN' }).state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
    expect(actErr(setup({ p1: { attack: [3] } }), P1, { type: 'END_TURN' })).toBe('ATTACK_ROW_NOT_EMPTY');
  });

  it('com Ataque vazio não há ataque e nenhuma carta sai da Defesa do oponente (spec §1.5, item 3; a "tartaruga" do autor)', () => {
    const s = setup({ p1: { defense: [9, 9, 9] }, p2: { attack: [4], defense: [5, 8] } });
    const r = act(s, P1, { type: 'END_TURN' });
    expect(r.events.map((e) => e.type)).not.toContain('AttackDeclared');
    expect(r.events.map((e) => e.type)).not.toContain('DamageDealt');
    expect(r.events.map((e) => e.type)).not.toContain('CardsRemovedFromRow');
    expect(values(player(r.state, P2).defenseRow)).toEqual([5, 8]);
    expect(values(player(r.state, P1).defenseRow)).toEqual([9, 9, 9]);
    expect(player(r.state, P2).hp).toBe(player(s, P2).hp);
  });
});

describe('fim da rodada de Ataque', () => {
  it('quem causou mais dano fica com a iniciativa e a rodada de Equipar começa', () => {
    const s = setup({ initiative: P2, p1: { attack: [10] }, p2: { attack: [2] } });
    const r = steps(s, [
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'PASS' }],
      [P2, { type: 'DECLARE_ATTACK' }],
      [P1, { type: 'PASS' }],
    ]);
    expect(player(r.state, P2).hp).toBe(90);
    expect(player(r.state, P1).hp).toBe(98);
    expect(r.events).toContainEqual({ type: 'InitiativeChanged', player: P1 });
    expect(r.state.initiative).toBe(P1);
    expect(r.state.noDamageStreak).toBe(0);
    expect(r.state.round).toBe(4);
    expect(r.state.phase).toEqual({ kind: 'EQUIP' });
  });

  it('empate de dano mantém a iniciativa', () => {
    const s = setup({ initiative: P2 });
    const r = steps(s, [
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.state.initiative).toBe(P2);
  });

  it('anti-travamento: 3 rodadas sem dano → vence quem tem mais vida', () => {
    const s = setup({ noDamageStreak: 2, p2: { hp: 90 } });
    const r = steps(s, [
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.state.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P1, reason: 'ANTI_STALL' } });
  });

  it('anti-travamento com vida igual é empate', () => {
    const r = steps(setup({ noDamageStreak: 2 }), [
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.state.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'DRAW', reason: 'ANTI_STALL' } });
  });

  it('uma rodada sem dano soma 1 à sequência, e a rodada seguinte começa sem nenhum bônus de ataque', () => {
    const r1 = steps(setup({ noDamageStreak: 1 }), [
      [P1, { type: 'END_TURN' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r1.state.noDamageStreak).toBe(2);
    const r2 = act(r1.state, 'system', { type: 'TIMEOUT' });
    expect(r2.state.round).toBe(5);
    expect(r2.events.map((e) => e.type)).not.toContain('PressureChanged');
  });

  it('qualquer perda de vida zera a sequência sem dano', () => {
    const r = steps(setup({ noDamageStreak: 3, p1: { attack: [5] } }), [
      [P1, { type: 'DECLARE_ATTACK' }],
      [P2, { type: 'PASS' }],
      [P2, { type: 'END_TURN' }],
    ]);
    expect(r.state.noDamageStreak).toBe(0);
  });
});

describe('expiração de efeitos', () => {
  it('a Defesa Absoluta termina no fim do turno do oponente e consome 1 Q', () => {
    const s = setup({ p2: { defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    const r = act(s, P1, { type: 'END_TURN' });
    expect(r.events).toContainEqual({ type: 'AbsoluteDefenseEnded', player: P2 });
    expect(player(r.state, P2).absoluteDefense).toBe(false);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(3);
  });
});

describe('TIMEOUT no turno de ataque', () => {
  it('declara o ataque e, na janela, passa', () => {
    const s = setup({ p1: { attack: [4] } });
    const a = act(s, 'system', { type: 'TIMEOUT' });
    expect(a.state.phase).toEqual({ kind: 'REACTION', responder: P2, trigger: 'ATTACK' });
    const b = act(a.state, 'system', { type: 'TIMEOUT' });
    expect(player(b.state, P2).hp).toBe(96);
    expect(b.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
  });

  it('com Ataque vazio, encerra o turno', () => {
    const r = act(setup(), 'system', { type: 'TIMEOUT' });
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
  });
});
