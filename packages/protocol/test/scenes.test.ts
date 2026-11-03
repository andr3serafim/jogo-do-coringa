import type { GameEvent, SpecialCard } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import {
  MOMENT_PLAYS,
  SCENE_ALLOWANCE_CAP_MS,
  SCENE_MS,
  SPECIAL_MOMENT_MS,
  isMomentFor,
  momentsMs,
  sceneAllowanceMs,
  stepAllowanceMs,
} from '../src/index.ts';

const face = (id: string, kind: 'J' | 'Q' | 'K' = 'J'): SpecialCard => ({ id, kind, suit: 'ouros' });
const buff = (player: 'p1' | 'p2', id = 'j1'): GameEvent => ({ type: 'BuffPlayed', player, card: face(id), as: 'J' });

describe('o momento da especial do oponente (bloco A do playtest, ponto 1)', () => {
  it('as cinco jogadas especiais, e os tempos do primeiro e dos seguintes', () => {
    expect([...MOMENT_PLAYS].sort()).toEqual(['BuffPlayed', 'CardStolen', 'GuardPlayed', 'Sacrificed', 'TrapUsed']);
    expect(SPECIAL_MOMENT_MS).toEqual({ first: 1_600, next: 1_100 });
  });

  it('o primeiro do turno dura o momento inteiro; o seguinte, no mesmo turno, o curto', () => {
    expect(momentsMs([buff('p2')], 'p1')).toEqual({ ms: 1_600, count: 1 });
    expect(momentsMs([buff('p2')], 'p1', 1)).toEqual({ ms: 1_100, count: 2 });
    expect(momentsMs([buff('p2'), buff('p2', 'j2')], 'p1')).toEqual({ ms: 2_700, count: 2 });
  });

  it('quem jogou não vê o próprio momento', () => {
    expect(momentsMs([buff('p1')], 'p1')).toEqual({ ms: 0, count: 0 });
    expect(isMomentFor(buff('p1'), 'p1')).toBe(false);
    expect(isMomentFor(buff('p2'), 'p1')).toBe(true);
    expect(isMomentFor({ type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 9, defense: 4, damage: 5 }, 'p1')).toBe(false);
  });

  it('o TurnStarted zera a conta', () => {
    const events: GameEvent[] = [{ type: 'GuardPlayed', player: 'p2', cards: [face('k1', 'K')] }, { type: 'TurnStarted', player: 'p2' }, buff('p2')];
    expect(momentsMs(events, 'p1')).toEqual({ ms: 3_200, count: 1 });
    expect(momentsMs([{ type: 'TurnStarted', player: 'p1' }], 'p1', 3)).toEqual({ ms: 0, count: 0 });
  });

  it('sem lado (`null`), as especiais dos dois contam', () => {
    expect(momentsMs([buff('p1'), buff('p2', 'j2')], null)).toEqual({ ms: 2_700, count: 2 });
  });

  it('uma Guarda de 3 K jogada de uma vez é um momento só', () => {
    const guard: GameEvent = { type: 'GuardPlayed', player: 'p2', cards: [face('k1', 'K'), face('k2', 'K'), face('k3', 'K')] };
    expect(momentsMs([guard], 'p1')).toEqual({ ms: 1_600, count: 1 });
  });

  it('a folga do passo soma as cenas e os momentos, até o teto', () => {
    const resurrected: GameEvent = { type: 'Resurrected', player: 'p2', card: { id: 'n1', kind: 'NUM', value: 5, suit: 'copas' }, row: 'ATK' };
    expect(stepAllowanceMs([resurrected, buff('p2'), buff('p2', 'j2')], 'p1')).toBe(7_300);
    expect(stepAllowanceMs([buff('p1')], 'p1')).toBe(0);
    expect(stepAllowanceMs([{ type: 'Exodia', player: 'p2' }, { type: 'AbsoluteAttack', player: 'p2' }, buff('p2')], 'p1')).toBe(SCENE_ALLOWANCE_CAP_MS);
  });
});

describe('folga de cena (sub-projeto 6 §9)', () => {
  it('a cena rara rende a sua duração; evento sem cena não rende nada', () => {
    expect(sceneAllowanceMs([{ type: 'AbsoluteAttack' }])).toBe(4_500);
    expect(sceneAllowanceMs([{ type: 'AbsoluteDefenseStarted' }])).toBe(4_800);
    expect(sceneAllowanceMs([{ type: 'DamageDealt' }])).toBe(0);
    expect(sceneAllowanceMs([])).toBe(0);
  });

  it('a Devastação rende quando a fileira cai, ou a cena curta da cancelada; o lançamento não rende (fatia 3)', () => {
    expect(sceneAllowanceMs([{ type: 'RowDevastated' }])).toBe(3_100);
    expect(sceneAllowanceMs([{ type: 'DevastationCanceled' }])).toBe(1_400);
    expect(sceneAllowanceMs([{ type: 'Exodia' }])).toBe(5_800);
    expect(sceneAllowanceMs([{ type: 'DevastationCast' }])).toBe(0);
  });

  it('duas cenas no mesmo passo somam', () => {
    expect(sceneAllowanceMs([{ type: 'ReflectCanceled' }, { type: 'DamageDealt' }, { type: 'DevastationCanceled' }])).toBe(2_800);
  });

  it('a soma para no teto de 8 s', () => {
    expect(SCENE_ALLOWANCE_CAP_MS).toBe(8_000);
    expect(sceneAllowanceMs(Array.from({ length: 6 }, () => ({ type: 'Exodia' })))).toBe(8_000);
    // O Ataque Absoluto que bate num Reflect: 8,3 s de cena, e o relógio volta 0,3 s antes do fim.
    expect(sceneAllowanceMs([{ type: 'AbsoluteAttack' }, { type: 'ReflectTriggered' }])).toBe(8_000);
  });

  it('a tabela tem as cenas com os tempos do protótipo (fatia 2: os Absolutos; fatia 3: a Exódia e a Devastação; fatia 4: o Reflect; fatia 4b: a Ressurreição)', () => {
    expect(SCENE_MS).toEqual({
      Exodia: 5_800,
      AbsoluteAttack: 4_500,
      AbsoluteDefenseStarted: 4_800,
      RowDevastated: 3_100,
      DevastationCanceled: 1_400,
      ReflectPlayed: 1_500,
      ReflectTriggered: 3_800,
      ReflectCanceled: 1_400,
      Resurrected: 4_600,
    });
  });
});
