import { describe, expect, it } from 'vitest';
import { viewEvents, viewFor } from '../src/view.ts';
import { P1, P2, player, setup, steps, values } from './helpers.ts';

describe('viewFor (review focus 3)', () => {
  it('mostra a própria mão e só a quantidade da mão do oponente', () => {
    const s = setup({ p1: { hand: ['J', 'K'] }, p2: { hand: ['A', 'Q', 'W'] } });
    const v = viewFor(s, P1);
    expect(v.self.hand.map((c) => c.kind)).toEqual(['J', 'K']);
    expect(v.opponent.handCount).toBe(3);
    expect('hand' in v.opponent).toBe(false);
    const json = JSON.stringify(v);
    for (const c of player(s, P2).hand) expect(json).not.toContain(`"${c.id}"`);
    for (const c of s.deck) expect(json).not.toContain(`"${c.id}"`);
    expect(json).not.toContain('"rng"');
    expect(v.deckCount).toBe(s.deck.length);
  });

  it('no Equipar, esconde as numéricas recebidas pelo oponente', () => {
    const s = setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: { pending: [3] }, p2: { pending: [8, 9] } });
    const v = viewFor(s, P1);
    expect(values(v.self.pending)).toEqual([3]);
    expect(v.opponent.pendingCount).toBe(2);
    expect(JSON.stringify(v)).not.toContain(`"${player(s, P2).pending[0].id}"`);
  });

  it('é uma cópia: mexer na visão não muda o estado', () => {
    const s = setup({ p1: { hand: ['J'] } });
    viewFor(s, P1).self.hand.pop();
    expect(player(s, P1).hand).toHaveLength(1);
  });

  it('lista só Ressurreições válidas', () => {
    const s = setup({ round: 9 });
    player(s, P1).resurrections = [{ row: 'ATK', value: 7, formedAtRound: 3 }];
    expect(viewFor(s, P1).self.resurrections).toEqual([]);
    expect(viewFor(s, P2).opponent.resurrectionCount).toBe(0);
  });
});

describe('viewEvents (review focus 3)', () => {
  it('esconde as cartas distribuídas ao oponente', () => {
    const s = setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' } });
    const r = steps(s, [
      [P1, { type: 'EQUIP', destinations: [] }],
      [P2, { type: 'EQUIP', destinations: [] }],
    ]);
    const forP1 = viewEvents(r.events, P1);
    expect(forP1.find((e) => e.type === 'CardsDealt' && e.player === P2)).toEqual({ type: 'CardsDealt', player: P2, count: 4 });
    const own = forP1.find((e) => e.type === 'CardsDealt' && e.player === P1) as { cards?: unknown[] } | undefined;
    expect(own?.cards).toHaveLength(4);
  });
});
