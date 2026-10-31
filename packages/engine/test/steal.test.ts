// Roubo (E3 do sub-projeto 5): o Ás (ou o Selvagem como A) pega uma numérica de qualquer fileira do oponente e a põe no fim da
// fileira que o ladrão escolher; com a fileira cheia, a última dela vai ao cemitério. Sem naipe (autor, 2026-10-31): o oponente
// leva o valor seco da carta (um K na Guarda dele anula e fica; não mata; não conta para a iniciativa) e o ladrão cura o mesmo
// valor, até a vida inicial. A Defesa Absoluta do oponente bloqueia o roubo inteiro.
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action.ts';
import { legalActions } from '../src/legal-actions.ts';
import { noPlayReason } from '../src/no-play.ts';
import type { Action, GameState, NumCard, RowName, Suit } from '../src/types.ts';
import { viewFor } from '../src/view.ts';
import { P1, P2, act, actErr, handId, player, setup, values } from './helpers.ts';

/** Troca o naipe da carta `card` (as cartas do cenário vêm do monte; o naipe não muda o efeito do roubo). */
function withSuit(card: NumCard, suit: Suit): NumCard {
  card.suit = suit;
  return card;
}

function stealOf(s: GameState, card: NumCard, row: RowName, ace: 'A' | 'WILD' = 'A'): Action {
  return { type: 'STEAL', cardId: handId(s, P1, ace), targetId: card.id, row };
}

describe('Roubo (E3)', () => {
  it('a carta vai para o fim da fileira escolhida pelo ladrão; o Ás vai ao cemitério', () => {
    const s = setup({ p1: { hand: ['A'], attack: [2], defense: [3] }, p2: { attack: [7, 8], defense: [9] } });
    const card = withSuit(player(s, P2).attackRow[1]!, 'copas');
    const r = act(s, P1, stealOf(s, card, 'DEF'));
    expect(values(player(r.state, P2).attackRow)).toEqual([7]);
    expect(values(player(r.state, P1).defenseRow)).toEqual([3, 8]);
    expect(player(r.state, P1).hand).toHaveLength(0);
    expect(r.state.graveyard.map((c) => c.kind)).toEqual(['A']);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'CardStolen', player: P1, from: P2, fromRow: 'ATK', toRow: 'DEF' }));
    expect(r.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
  });

  it('com a fileira do ladrão cheia, a última dela vai ao cemitério antes da carta roubada entrar', () => {
    const s = setup({ p1: { hand: ['A'], attack: [2, 3, 4, 5, 6, 7, 8] }, p2: { defense: [9] } });
    const card = withSuit(player(s, P2).defenseRow[0]!, 'copas');
    const r = act(s, P1, stealOf(s, card, 'ATK'));
    expect(values(player(r.state, P1).attackRow)).toEqual([2, 3, 4, 5, 6, 7, 9]);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'CardsRemovedFromRow', player: P1, row: 'ATK' }));
    expect(r.state.graveyard.map((c) => (c.kind === 'NUM' ? c.value : c.kind))).toEqual(expect.arrayContaining([8, 'A']));
  });

  it('qualquer naipe: o oponente leva o valor seco (10, com 3 J na fileira dele) e o ladrão cura o mesmo valor, sem iniciativa', () => {
    for (const suit of ['espadas', 'copas'] as const) {
      const s = setup({ p1: { hand: ['A'], hp: 80 }, p2: { attack: [10, 2], attackBuffs: ['J', 'J', 'J'] } });
      const card = withSuit(player(s, P2).attackRow[0]!, suit);
      const r = act(s, P1, stealOf(s, card, 'ATK'));
      expect(player(r.state, P2).hp).toBe(90);
      expect(player(r.state, P1).hp).toBe(90);
      expect(player(r.state, P1).damageThisRound).toBe(0);
      expect(r.events).toContainEqual({ type: 'StealDamage', player: P1, victim: P2, value: 10, damage: 10, blocked: false });
      expect(r.events).toContainEqual(expect.objectContaining({ type: 'Healed', player: P1, amount: 10, source: 'STEAL' }));
    }
  });

  it('um K na Guarda do oponente anula só o dano (e não quebra); o ladrão cura mesmo assim', () => {
    const s = setup({ p1: { hand: ['A'], hp: 90 }, p2: { attack: [9], guard: 1 } });
    const card = withSuit(player(s, P2).attackRow[0]!, 'paus');
    const r = act(s, P1, stealOf(s, card, 'ATK'));
    expect(player(r.state, P2).hp).toBe(100);
    expect(player(r.state, P2).guard).toHaveLength(1);
    expect(r.events).toContainEqual({ type: 'StealDamage', player: P1, victim: P2, value: 9, damage: 0, blocked: true });
    expect(player(r.state, P1).hp).toBe(99);
  });

  it('o dano do roubo não mata (a vida do oponente fica em no mínimo 1), e a cura é o valor cheio', () => {
    const s = setup({ p1: { hand: ['A'], hp: 50 }, p2: { hp: 4, attack: [9] } });
    const card = withSuit(player(s, P2).attackRow[0]!, 'espadas');
    const r = act(s, P1, stealOf(s, card, 'ATK'));
    expect(player(r.state, P2).hp).toBe(1);
    expect(player(r.state, P1).hp).toBe(59);
    expect(r.state.phase.kind).toBe('ATTACK_MAIN');
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'StealDamage', damage: 3 }));
  });

  it('a cura vai até a vida inicial', () => {
    const s = setup({ p1: { hand: ['A', 'A'], hp: 95 }, p2: { attack: [8, 7] } });
    const [eight, seven] = player(s, P2).attackRow;
    const first = act(s, P1, stealOf(s, eight!, 'ATK'));
    expect(player(first.state, P1).hp).toBe(100);
    expect(first.events).toContainEqual(expect.objectContaining({ type: 'Healed', player: P1, amount: 5, source: 'STEAL' }));
    const second = act(first.state, P1, { type: 'STEAL', cardId: handId(first.state, P1, 'A'), targetId: seven!.id, row: 'ATK' });
    expect(player(second.state, P1).hp).toBe(100);
    expect(second.events).toContainEqual(expect.objectContaining({ type: 'Healed', amount: 0 }));
  });

  it('a quadra do oponente se desfaz e a do ladrão se forma', () => {
    const s = setup({ p1: { hand: ['A'], defense: [6, 6, 6] }, p2: { defense: [6, 6, 6, 6] } });
    const card = withSuit(player(s, P2).defenseRow[0]!, 'copas');
    const r = act(s, P1, stealOf(s, card, 'DEF'));
    expect(r.events).toContainEqual({ type: 'QuadBroken', player: P2, quad: { row: 'DEF', value: 6 } });
    expect(r.events).toContainEqual({ type: 'QuadFormed', player: P1, quad: { row: 'DEF', value: 6 } });
  });

  it('o Selvagem rouba como A', () => {
    const s = setup({ p1: { hand: ['W'] }, p2: { attack: [5] } });
    const card = withSuit(player(s, P2).attackRow[0]!, 'copas');
    const r = act(s, P1, stealOf(s, card, 'ATK', 'WILD'));
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'CardStolen', as: 'A' }));
  });

  it('recusado contra Defesa Absoluta, fora da vez, na reação, com carta da própria fileira e com carta que não é Ás', () => {
    const absolute = setup({ p1: { hand: ['A'] }, p2: { attack: [5], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    expect(actErr(absolute, P1, stealOf(absolute, player(absolute, P2).attackRow[0]!, 'ATK'))).toBe('TARGET_PROTECTED');
    const notMine = setup({ p1: { hand: ['A'] }, p2: { attack: [5] }, turnOrder: [P2, P1], phase: { kind: 'ATTACK_MAIN', player: P2 } });
    expect(actErr(notMine, P1, stealOf(notMine, player(notMine, P2).attackRow[0]!, 'ATK'))).toBe('NOT_YOUR_TURN');
    const reaction = setup({ p1: { hand: ['A'] }, p2: { attack: [5] }, phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' } });
    expect(actErr(reaction, P1, stealOf(reaction, player(reaction, P2).attackRow[0]!, 'ATK'))).toBe('WRONG_PHASE');
    const own = setup({ p1: { hand: ['A'], attack: [5] } });
    expect(actErr(own, P1, stealOf(own, player(own, P1).attackRow[0]!, 'DEF'))).toBe('INVALID_TARGET');
    const jack = setup({ p1: { hand: ['J'] }, p2: { attack: [5] } });
    expect(actErr(jack, P1, { type: 'STEAL', cardId: handId(jack, P1, 'J'), targetId: player(jack, P2).attackRow[0]!.id, row: 'ATK' })).toBe('INVALID_CARD');
  });
});

describe('Roubo nas jogadas legais', () => {
  it('uma fonte (o A antes do Selvagem), um alvo por fileira e valor (o naipe não conta), os dois destinos; tudo aceito', () => {
    const s = setup({ p1: { hand: ['A', 'W'] }, p2: { attack: [5, 5], defense: [5] } });
    const [a, b] = player(s, P2).attackRow;
    withSuit(a!, 'copas');
    withSuit(b!, 'espadas');
    withSuit(player(s, P2).defenseRow[0]!, 'espadas');
    const steals = legalActions(viewFor(s, P1)).filter((x) => x.type === 'STEAL');
    // Os dois 5 do Ataque (um vermelho, um preto) são um alvo só; o 5 da Defesa é outro. Dois destinos cada.
    expect(steals).toHaveLength(4);
    expect(steals.every((x) => x.type === 'STEAL' && x.cardId === handId(s, P1, 'A'))).toBe(true);
    for (const action of steals) expect(applyAction(s, P1, action).ok).toBe(true);
    // O A tem jogada: o Roubo conta como jogada de uma carta só.
    expect(noPlayReason(viewFor(s, P1), player(s, P1).hand[0]!)).toBeNull();
  });

  it('sem Roubo contra Defesa Absoluta', () => {
    const s = setup({ p1: { hand: ['A'] }, p2: { attack: [5], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true } });
    expect(legalActions(viewFor(s, P1)).some((x) => x.type === 'STEAL')).toBe(false);
  });
});
