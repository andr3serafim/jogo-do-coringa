import { describe, expect, it } from 'vitest';
import { autoDestinations } from '../src/actions/equip.ts';
import type { Action, Destination } from '../src/types.ts';
import { P1, P2, act, actErr, player, setup, steps, values, type PlayerSetup } from './helpers.ts';

const equipSetup = (p1: PlayerSetup, p2: PlayerSetup, round = 1) =>
  setup({ round, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1, p2 });

describe('Equipar', () => {
  it('guarda a escolha em segredo e revela quando os dois confirmam', () => {
    const s = equipSetup({ pending: [3, 7, 9] }, { pending: [5] });
    const a = act(s, P1, { type: 'EQUIP', destinations: ['ATK', 'DEF', 'ATK'] });
    expect(a.events).toEqual([{ type: 'EquipSubmitted', player: P1 }]);
    expect(player(a.state, P1).attackRow).toHaveLength(0);

    const b = act(a.state, P2, { type: 'EQUIP', destinations: ['DEF'] });
    expect(values(player(b.state, P1).attackRow)).toEqual([3, 9]);
    expect(values(player(b.state, P1).defenseRow)).toEqual([7]);
    expect(values(player(b.state, P2).defenseRow)).toEqual([5]);
    expect(b.events.filter((e) => e.type === 'CardsPlaced')).toHaveLength(2);
    expect(b.state.round).toBe(2);
    expect(b.state.phase).toEqual({ kind: 'EQUIP' });
  });

  it('rejeita destinos inválidos e confirmação repetida', () => {
    const s = equipSetup({ pending: [3, 4] }, {});
    expect(actErr(s, P1, { type: 'EQUIP', destinations: ['ATK'] })).toBe('INVALID_DESTINATIONS');
    expect(actErr(s, P1, { type: 'EQUIP', destinations: ['ATK', 'DISCARD'] })).toBe('INVALID_DESTINATIONS');
    expect(actErr(s, P1, { type: 'EQUIP', destinations: ['ATK', 'XYZ' as Destination] })).toBe('INVALID_DESTINATIONS');
    const a = act(s, P1, { type: 'EQUIP', destinations: ['ATK', 'ATK'] });
    expect(actErr(a.state, P1, { type: 'EQUIP', destinations: ['ATK', 'ATK'] })).toBe('ALREADY_SUBMITTED');
  });

  it('com uma fileira cheia, só aceita a outra', () => {
    const s = equipSetup({ attack: [2, 2, 3, 3, 4, 4, 5], pending: [6] }, {});
    expect(actErr(s, P1, { type: 'EQUIP', destinations: ['ATK'] })).toBe('INVALID_DESTINATIONS');
    act(s, P1, { type: 'EQUIP', destinations: ['DEF'] });
  });

  it('com as duas cheias, substitui a última carta ou descarta a nova', () => {
    const s = equipSetup(
      { attack: [2, 2, 3, 3, 4, 4, 5], defense: [6, 6, 7, 7, 8, 8, 9], pending: [10, 10] },
      {},
    );
    const r = steps(s, [
      [P1, { type: 'EQUIP', destinations: ['REPLACE_LAST_ATK', 'DISCARD'] }],
      [P2, { type: 'EQUIP', destinations: [] }],
    ]);
    expect(values(player(r.state, P1).attackRow)).toEqual([2, 2, 3, 3, 4, 4, 10]);
    const grave = r.state.graveyard.map((c) => (c.kind === 'NUM' ? c.value : c.kind));
    expect(grave).toContain(5);
    expect(grave).toContain(10);
  });

  it('TIMEOUT completa quem não confirmou: fileira com menos cartas, empate → Defesa', () => {
    const s = equipSetup({ pending: [3] }, { attack: [2], pending: [3, 4, 5] });
    const a = act(s, P1, { type: 'EQUIP', destinations: ['ATK'] });
    const b = act(a.state, 'system', { type: 'TIMEOUT' });
    expect(values(player(b.state, P2).defenseRow)).toEqual([3, 4]);
    expect(values(player(b.state, P2).attackRow)).toEqual([2, 5]);
  });

  it('avalia quadras na revelação', () => {
    const s = equipSetup({ attack: [7, 7, 7], pending: [7] }, {});
    const r = steps(s, [
      [P1, { type: 'EQUIP', destinations: ['ATK'] }],
      [P2, { type: 'EQUIP', destinations: [] }],
    ]);
    expect(r.events).toContainEqual({ type: 'QuadFormed', player: P1, quad: { row: 'ATK', value: 7 } });
    expect(player(r.state, P1).resurrections).toEqual([{ row: 'ATK', value: 7, formedAtRound: 1 }]);
  });

  it('a 2ª rodada de Equipar leva à rodada de Ataque', () => {
    const s = equipSetup({}, {}, 2);
    const r = steps(s, [
      [P1, { type: 'EQUIP', destinations: [] }],
      [P2, { type: 'EQUIP', destinations: [] }],
    ]);
    expect(r.state.round).toBe(3);
    expect(r.state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P1 });
  });
});

describe('Escolha da iniciativa', () => {
  const orderSetup = () => setup({ phase: { kind: 'ORDER_CHOICE', player: P1 }, initiative: P1 });

  it('quem tem a iniciativa pode atacar em segundo', () => {
    const r = act(orderSetup(), P1, { type: 'CHOOSE_ORDER', first: false });
    expect(r.state.turnOrder).toEqual([P2, P1]);
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
    expect(r.events).toContainEqual({ type: 'OrderChosen', player: P1, first: false, turnOrder: [P2, P1] });
  });

  it('só quem tem a iniciativa escolhe, e só nessa fase', () => {
    expect(actErr(orderSetup(), P2, { type: 'CHOOSE_ORDER', first: true })).toBe('NOT_YOUR_TURN');
    expect(actErr(setup(), P1, { type: 'CHOOSE_ORDER', first: true })).toBe('WRONG_PHASE');
  });

  it('TIMEOUT escolhe atacar primeiro', () => {
    const r = act(orderSetup(), 'system', { type: 'TIMEOUT' });
    expect(r.state.turnOrder).toEqual([P1, P2]);
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });
});

describe('entradas inválidas (review focus 1, 2 e 5)', () => {
  it('não muta o estado de entrada, nem em erro nem em sucesso', () => {
    const s = setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: { pending: [3] } });
    const snapshot = structuredClone(s);
    actErr(s, P1, { type: 'EQUIP', destinations: [] });
    act(s, P1, { type: 'EQUIP', destinations: ['ATK'] });
    expect(s).toEqual(snapshot);
  });

  it('rejeita jogador desconhecido, ação de sistema vinda de jogador e ação desconhecida', () => {
    const s = setup();
    expect(actErr(s, 'p3', { type: 'END_TURN' })).toBe('UNKNOWN_PLAYER');
    expect(actErr(s, P1, { type: 'TIMEOUT' })).toBe('SYSTEM_ONLY');
    expect(actErr(s, 'system', { type: 'END_TURN' })).toBe('PLAYER_ONLY');
    expect(actErr(s, P1, { type: 'HACK' } as unknown as Action)).toBe('INVALID_ACTION');
  });

  it('ação nula, indefinida ou sem type vira INVALID_ACTION, sem exceção (revisão final I1)', () => {
    const s = setup();
    expect(actErr(s, P1, null as unknown as Action)).toBe('INVALID_ACTION');
    expect(actErr(s, 'system', undefined as unknown as Action)).toBe('INVALID_ACTION');
    expect(actErr(s, P1, { type: 5 } as unknown as Action)).toBe('INVALID_ACTION');
  });

  it('CHOOSE_ORDER exige first booleano (revisão final M1)', () => {
    const s = setup({ phase: { kind: 'ORDER_CHOICE', player: P1 }, initiative: P1 });
    expect(actErr(s, P1, { type: 'CHOOSE_ORDER', first: 'true' } as unknown as Action)).toBe('INVALID_ACTION');
    expect(actErr(s, P1, { type: 'CHOOSE_ORDER' } as unknown as Action)).toBe('INVALID_ACTION');
  });

  it('FORFEIT encerra a partida e nada mais é aceito', () => {
    const r = act(setup(), 'system', { type: 'FORFEIT', loser: P1 });
    expect(r.state.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P2, reason: 'FORFEIT' } });
    expect(actErr(r.state, P2, { type: 'END_TURN' })).toBe('GAME_OVER');
    expect(actErr(r.state, 'system', { type: 'TIMEOUT' })).toBe('GAME_OVER');
  });
});

describe('autoDestinations', () => {
  const config = { rowLimit: 7 };
  const casos: Array<[number, number, number, Destination[]]> = [
    [3, 5, 4, ['ATK', 'ATK', 'DEF', 'ATK']],
    [2, 2, 1, ['DEF']],
    [7, 3, 2, ['DEF', 'DEF']],
    [3, 7, 1, ['ATK']],
    [6, 7, 3, ['ATK', 'DISCARD', 'DISCARD']],
    [7, 7, 2, ['DISCARD', 'DISCARD']],
  ];
  for (const [attack, defense, count, esperado] of casos) {
    it(`{ATK ${attack}, DEF ${defense}} com ${count} carta(s) → ${esperado.join(', ')}`, () => {
      expect(autoDestinations(config, { attack, defense }, count)).toEqual(esperado);
    });
  }
});
