// Reflect reativo (F2 do sub-projeto 5): K + J + Q da mão, só em resposta a um golpe. Atacado → lança → o dano volta na hora →
// acabou. Quem é refletido pode responder com outro Reflect: os dois se anulam e o golpe não acontece. A Proteção por sacrifício
// (J + Q + K do campo) saiu do jogo.
import { describe, expect, it } from 'vitest';
import type { Action, GameState } from '../src/types.ts';
import { P1, P2, act, actErr, handId, player, setup, values, type PlayerSetup } from './helpers.ts';

const reflectOf = (s: GameState, id: string, j: 'J' | 'WILD' = 'J'): Action => ({
  type: 'REFLECT',
  kId: handId(s, id, 'K'),
  jId: handId(s, id, j),
  qId: handId(s, id, 'Q'),
});

const cancelOf = (s: GameState, id: string, j: 'J' | 'WILD' = 'J'): Action => ({ ...reflectOf(s, id, j), type: 'CANCEL_REFLECT' } as Action);

/** P2 declara o ataque no turno dele: P1 está na janela de reação ao ataque. */
function attacked(p1: PlayerSetup, p2: PlayerSetup): GameState {
  const s = setup({ p1, p2, turnOrder: [P2, P1], phase: { kind: 'ATTACK_MAIN', player: P2 } });
  return act(s, P2, { type: 'DECLARE_ATTACK' }).state;
}

/** O exemplo 3 da spec 1: o ataque de P2 vale 46, e a DEF base dele é 14 (⌊14/2⌋ = 7): o Reflect devolve 39. */
const EXAMPLE_3: PlayerSetup = { attack: [6, 8, 9], attackBuffs: ['J'], defense: [4, 10], defenseBuffs: ['Q'], guard: 2 };

describe('Reflect reativo (F2)', () => {
  it('na fase principal, o Reflect é recusado: ele só responde a um golpe', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'] } });
    expect(actErr(s, P1, reflectOf(s, P1))).toBe('WRONG_PHASE');
  });

  it('contra K jogado, o Reflect não responde', () => {
    const s = setup({ p1: { hand: ['K'] }, p2: { hand: ['K', 'J', 'Q'] } });
    const k = act(s, P1, { type: 'PLAY_K', cardIds: [handId(s, P1, 'K')] }).state;
    expect(actErr(k, P2, reflectOf(s, P2))).toBe('WRONG_PHASE');
  });

  it('na janela do ataque, lançar abre a resposta do atacante, com o Reflect na mesa do dono', () => {
    const s = attacked({ hand: ['K', 'J', 'Q'] }, { attack: [5] });
    const r = act(s, P1, reflectOf(s, P1));
    expect(r.state.phase).toEqual({ kind: 'REACTION', responder: P2, trigger: 'REFLECT_PLAYED' });
    expect(player(r.state, P1).reflect).not.toBeNull();
    expect(player(r.state, P1).hand).toHaveLength(0);
    expect(r.events).toContainEqual({ type: 'ReflectPlayed', player: P1, reflect: player(r.state, P1).reflect, against: 'ATTACK' });
  });

  it('passar aplica o golpe refletido (exemplo 3) e passa o turno', () => {
    const s = attacked({ hand: ['K', 'J', 'Q'], defense: [3, 5] }, EXAMPLE_3);
    const cast = act(s, P1, reflectOf(s, P1)).state;
    const r = act(cast, P2, { type: 'PASS' });
    expect(r.events).toContainEqual({ type: 'ReflectTriggered', owner: P1, attacker: P2, damage: 39 });
    expect(player(r.state, P2).hp).toBe(61);
    expect(player(r.state, P1).hp).toBe(100);
    // Todos os Q e K do atacante quebram.
    expect(player(r.state, P2).guard).toHaveLength(0);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(0);
    // Saem a 1ª carta do Ataque do atacante e a 1ª da Defesa do dono.
    expect(values(player(r.state, P2).attackRow)).toEqual([8, 9]);
    expect(values(player(r.state, P1).defenseRow)).toEqual([5]);
    expect(player(r.state, P1).reflect).toBeNull();
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('o tempo esgotado na resposta ao Reflect vale como passar', () => {
    const s = attacked({ hand: ['K', 'J', 'Q'] }, EXAMPLE_3);
    const cast = act(s, P1, reflectOf(s, P1)).state;
    expect(act(cast, 'system', { type: 'TIMEOUT' }).events.map((e) => e.type)).toContain('ReflectTriggered');
  });

  it('atacante sob Defesa Absoluta: o Reflect segura o golpe, mas não devolve dano nem quebra Q e K', () => {
    const s = attacked(
      { hand: ['K', 'J', 'Q'], defense: [3, 5] },
      { attack: [10, 10], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true, guard: 2 },
    );
    const r = act(act(s, P1, reflectOf(s, P1)).state, P2, { type: 'PASS' });
    expect(r.events).toContainEqual({ type: 'ReflectTriggered', owner: P1, attacker: P2, damage: 0 });
    expect(player(r.state, P1).hp).toBe(100);
    expect(player(r.state, P2).hp).toBe(100);
    expect(player(r.state, P2).guard).toHaveLength(2);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(4);
    expect(values(player(r.state, P2).attackRow)).toEqual([10]);
    expect(values(player(r.state, P1).defenseRow)).toEqual([5]);
  });

  it('o Selvagem serve como J ou Q do Reflect, mas nunca como K', () => {
    const s = attacked({ hand: ['K', 'W', 'Q'] }, { attack: [5] });
    expect(act(s, P1, reflectOf(s, P1, 'WILD')).state.phase).toMatchObject({ trigger: 'REFLECT_PLAYED' });
    const bad = attacked({ hand: ['W', 'J', 'Q'] }, { attack: [5] });
    const action: Action = { type: 'REFLECT', kId: handId(bad, P1, 'WILD'), jId: handId(bad, P1, 'J'), qId: handId(bad, P1, 'Q') };
    expect(actErr(bad, P1, action)).toBe('INVALID_CARD');
  });

  it('a Armadilha ainda responde ao ataque antes do Reflect, na mesma janela', () => {
    const s = attacked({ hand: ['A', 'K', 'J', 'Q'] }, { attack: [5], attackBuffs: ['J'] });
    const trap = act(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'A'), targetId: player(s, P2).attackBuffs[0].id }).state;
    expect(trap.phase).toEqual({ kind: 'REACTION', responder: P1, trigger: 'ATTACK' });
    expect(act(trap, P1, reflectOf(trap, P1)).state.phase).toMatchObject({ trigger: 'REFLECT_PLAYED' });
  });

  it('a Proteção por sacrifício saiu do jogo', () => {
    const s = setup({ p1: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: 1 } });
    const mine = player(s, P1);
    const protect = { type: 'PROTECT_FROM_REFLECT', jId: mine.attackBuffs[0].id, qId: mine.defenseBuffs[0].id, kId: mine.guard[0].id };
    expect(actErr(s, P1, protect as unknown as Action)).toBe('INVALID_ACTION');
  });
});

describe('Reflect contra Reflect (F2)', () => {
  it('as 6 cartas vão ao cemitério, ninguém perde vida nem carta das fileiras, e o turno passa', () => {
    const s = attacked({ hand: ['K', 'J', 'Q'], defense: [3, 5] }, { ...EXAMPLE_3, hand: ['K', 'W', 'Q'] });
    const cast = act(s, P1, reflectOf(s, P1)).state;
    const r = act(cast, P2, cancelOf(cast, P2, 'WILD'));
    expect(r.events).toContainEqual({ type: 'ReflectCanceled', player: P2, owner: P1 });
    expect(r.events.map((e) => e.type)).not.toContain('ReflectTriggered');
    expect(r.events.map((e) => e.type)).not.toContain('DamageDealt');
    expect(r.state.graveyard).toHaveLength(6);
    expect(player(r.state, P1).reflect).toBeNull();
    expect([player(r.state, P1).hp, player(r.state, P2).hp]).toEqual([100, 100]);
    expect(values(player(r.state, P2).attackRow)).toEqual([6, 8, 9]);
    expect(values(player(r.state, P1).defenseRow)).toEqual([3, 5]);
    expect(player(r.state, P2).guard).toHaveLength(2);
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('sem golpe, a Defesa Absoluta do dono do Reflect continua', () => {
    const s = attacked(
      { hand: ['K', 'J', 'Q'], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true },
      { attack: [5], hand: ['K', 'J', 'Q'] },
    );
    const cast = act(s, P1, reflectOf(s, P1)).state;
    const r = act(cast, P2, cancelOf(cast, P2));
    expect(player(r.state, P1).absoluteDefense).toBe(true);
    expect(r.events.map((e) => e.type)).not.toContain('AbsoluteDefenseEnded');
  });

  it('só vale na resposta a um Reflect, e a Armadilha não responde ao Reflect', () => {
    const s = attacked({ hand: ['K', 'J', 'Q'] }, { attack: [5], hand: ['K', 'J', 'Q', 'A'] });
    expect(actErr(s, P1, cancelOf(s, P1))).toBe('WRONG_PHASE');
    const cast = act(s, P1, reflectOf(s, P1)).state;
    const target = player(cast, P1).reflect?.k.id ?? '';
    expect(actErr(cast, P2, { type: 'TRAP', cardId: handId(cast, P2, 'A'), targetId: target })).toBe('WRONG_PHASE');
  });
});
