import { describe, expect, it } from 'vitest';
import { attackValue, defenseValue, resolveAttack } from '../src/combat.ts';
import type { GameEvent, GameState } from '../src/types.ts';
import { P1, P2, player, setup, values } from './helpers.ts';

function attackP1(s: GameState): GameEvent[] {
  const ev: GameEvent[] = [];
  resolveAttack(s, P1, ev);
  return ev;
}

const graveSummary = (s: GameState) => s.graveyard.map((c) => (c.kind === 'NUM' ? c.value : c.kind));

describe('valores de ATK e DEF', () => {
  it('Q multiplica a defesa de forma linear', () => {
    const s = setup({ p2: { defense: [5, 5], defenseBuffs: ['Q', 'Q'] } });
    expect(defenseValue(player(s, P2))).toBe(30);
  });

  it('J multiplica o ataque de forma linear, e nada mais entra no multiplicador (a Pressão da mesa saiu no sub-projeto 5)', () => {
    const s = setup({ p1: { attack: [4, 6], attackBuffs: ['J'] } });
    expect(attackValue(player(s, P1))).toBe(20);
  });

  it('quadra soma o valor da carta antes do multiplicador (exemplo 4)', () => {
    const s = setup({ p1: { attack: [5, 5, 5, 5] }, p2: { defense: [10, 3, 10, 10, 10], defenseBuffs: ['Q'] } });
    expect(defenseValue(player(s, P2))).toBe(106);
    expect(attackValue(player(s, P1))).toBe(25);
  });
});

describe('resolveAttack', () => {
  it('dano simples e remoção das primeiras cartas (exemplo 1)', () => {
    const s = setup({ p1: { attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { defense: [5, 8] } });
    const ev = attackP1(s);
    expect(ev).toContainEqual({ type: 'DamageDealt', attacker: P1, defender: P2, attack: 38, defense: 13, damage: 25 });
    expect(player(s, P2).hp).toBe(75);
    expect(values(player(s, P1).attackRow)).toEqual([7, 9]);
    expect(values(player(s, P2).defenseRow)).toEqual([8]);
    expect(graveSummary(s)).toEqual([3, 5]);
    expect(player(s, P1).damageThisRound).toBe(25);
  });

  it('defesa maior que o ataque: dano 0, mas as cartas saem', () => {
    const s = setup({ p1: { attack: [4] }, p2: { defense: [9] } });
    attackP1(s);
    expect(player(s, P2).hp).toBe(100);
    expect(player(s, P1).attackRow).toHaveLength(0);
    expect(player(s, P2).defenseRow).toHaveLength(0);
  });

  it('K absorve todo o dano de um ataque e quebra (exemplo 2)', () => {
    const s = setup({ p1: { attack: [10, 10, 10] }, p2: { defense: [10, 10], guard: 2 } });
    const ev = attackP1(s);
    expect(player(s, P2).hp).toBe(100);
    expect(player(s, P2).guard).toHaveLength(1);
    expect(ev).toContainEqual(expect.objectContaining({ type: 'GuardBroken', player: P2 }));
    expect(ev).toContainEqual(expect.objectContaining({ type: 'DamageDealt', damage: 0 }));
    expect(graveSummary(s)).toEqual(['K', 10, 10]);
  });

  it('com a Defesa vazia o dano entra cheio e nada sai dela', () => {
    const s = setup({ p1: { attack: [6] } });
    const ev = attackP1(s);
    expect(player(s, P2).hp).toBe(94);
    expect(ev.filter((e) => e.type === 'CardsRemovedFromRow')).toHaveLength(1);
  });

  it('Ataque Absoluto quebra todos os K e consome 1 J', () => {
    const s = setup({ p1: { attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J', 'J'] }, p2: { defense: [8, 9], guard: 2 } });
    const ev = attackP1(s);
    expect(ev).toContainEqual({ type: 'AbsoluteAttack', player: P1 });
    expect(ev).toContainEqual(expect.objectContaining({ type: 'DamageDealt', attack: 90, defense: 17, damage: 73 }));
    expect(player(s, P2).hp).toBe(27);
    expect(player(s, P2).guard).toHaveLength(0);
    expect(player(s, P1).attackBuffs).toHaveLength(3);
  });

  it('Defesa Absoluta zera o dano e protege a fileira de Defesa', () => {
    const s = setup({
      p1: { attack: [10, 10] },
      p2: { defense: [2], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true },
    });
    attackP1(s);
    expect(player(s, P2).hp).toBe(100);
    expect(values(player(s, P2).defenseRow)).toEqual([2]);
    expect(values(player(s, P1).attackRow)).toEqual([10]);
  });

  it('Absoluto contra Absoluto: conta normal (exemplo 5)', () => {
    const s = setup({
      p1: { attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J', 'J'] },
      p2: { defense: [8, 9], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true, guard: 1 },
    });
    attackP1(s);
    expect(player(s, P2).hp).toBe(95);
    expect(player(s, P2).guard).toHaveLength(0);
    expect(values(player(s, P2).defenseRow)).toEqual([8, 9]);
    expect(values(player(s, P1).attackRow)).toEqual([6, 7]);
    expect(player(s, P1).attackBuffs).toHaveLength(3);
  });

  it('Reflect: quebra K e Q do atacante e devolve o dano (exemplo 3)', () => {
    const s = setup({
      p1: { attack: [6, 8, 9], attackBuffs: ['J'], defense: [4, 10], defenseBuffs: ['Q'], guard: 2 },
      p2: { reflect: true, defense: [2, 3] },
    });
    const ev = attackP1(s);
    expect(ev).toContainEqual({ type: 'ReflectTriggered', owner: P2, attacker: P1, damage: 39 });
    expect(player(s, P1).hp).toBe(61);
    expect(player(s, P1).guard).toHaveLength(0);
    expect(player(s, P1).defenseBuffs).toHaveLength(0);
    expect(values(player(s, P1).defenseRow)).toEqual([4, 10]);
    expect(player(s, P2).hp).toBe(100);
    expect(player(s, P2).reflect).toBeNull();
    expect(values(player(s, P1).attackRow)).toEqual([8, 9]);
    expect(values(player(s, P2).defenseRow)).toEqual([3]);
    expect(player(s, P2).damageThisRound).toBe(39);
  });

  it('Reflect contra atacante sob Defesa Absoluta: K quebram, dano 0, Q intactos', () => {
    const s = setup({
      p1: { attack: [10], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true, guard: 1 },
      p2: { reflect: true },
    });
    const ev = attackP1(s);
    expect(player(s, P1).hp).toBe(100);
    expect(player(s, P1).guard).toHaveLength(0);
    expect(player(s, P1).defenseBuffs).toHaveLength(4);
    expect(ev).toContainEqual({ type: 'ReflectTriggered', owner: P2, attacker: P1, damage: 0 });
  });

  it('Reflect intercepta o Ataque Absoluto: o ×5 volta e os K do dono ficam', () => {
    const s = setup({
      p1: { attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J', 'J'] },
      p2: { reflect: true, guard: 1 },
    });
    attackP1(s);
    expect(player(s, P1).hp).toBe(10);
    expect(player(s, P2).guard).toHaveLength(1);
    expect(player(s, P1).attackBuffs).toHaveLength(3);
  });

  it('o Ataque Absoluto contra um Reflect também é anunciado, antes de tudo, e os K do dono do Reflect não quebram', () => {
    const s = setup({
      p1: { attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J', 'J'], defenseBuffs: ['Q'], guard: 1 },
      p2: { reflect: true, guard: 1 },
    });
    const spentJ = player(s, P1).attackBuffs[0]!.id;
    const ev = attackP1(s);
    const tags = ev.map((event) => ('player' in event ? `${event.type}:${event.player}` : event.type));
    expect(tags[0]).toBe(`AbsoluteAttack:${P1}`);
    expect(tags.indexOf(`AbsoluteAttack:${P1}`)).toBeLessThan(tags.indexOf('ReflectTriggered'));
    // O Reflect intercepta tudo: quem perde K é o atacante; a Guarda do dono fica.
    expect(tags).not.toContain(`GuardBroken:${P2}`);
    expect(player(s, P2).guard).toHaveLength(1);
    // O J que o Absoluto gasta sai no último `BuffRemoved` do atacante, depois da carta da frente do Ataque.
    const lastRemoved = ev.findLast((event) => event.type === 'BuffRemoved');
    expect(lastRemoved).toMatchObject({ player: P1, cards: [{ id: spentJ }] });
    expect(tags.lastIndexOf(`BuffRemoved:${P1}`)).toBeGreaterThan(tags.indexOf(`CardsRemovedFromRow:${P1}`));
  });

  it('dano letal encerra a partida na hora', () => {
    const s = setup({ p1: { attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { hp: 10, defense: [5, 8] } });
    const ev = attackP1(s);
    expect(s.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P1, reason: 'HP' } });
    expect(ev).toContainEqual({ type: 'GameOver', result: { kind: 'WIN', winner: P1, reason: 'HP' } });
    expect(values(player(s, P1).attackRow)).toEqual([3, 7, 9]);
  });

  it('dano refletido letal também encerra a partida', () => {
    const s = setup({ p1: { hp: 5, attack: [10] }, p2: { reflect: true } });
    attackP1(s);
    expect(s.phase).toEqual({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: P2, reason: 'HP' } });
  });

  it('reavalia as quadras após a remoção', () => {
    const s = setup({ p1: { attack: [2] }, p2: { defense: [5, 5, 5, 5, 9] } });
    const ev = attackP1(s);
    expect(ev).toContainEqual({ type: 'QuadBroken', player: P2, quad: { row: 'DEF', value: 5 } });
  });
});
