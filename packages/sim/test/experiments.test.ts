import { describe, expect, it } from 'vitest';
import { makeConfig, totalCards, viewFor, type Card, type GameState } from '@coringa/engine';
import { BOTS } from '../src/bots/index.ts';
import { determinize } from '../src/experiments/determinize.ts';
import { orderExperiment } from '../src/experiments/order.ts';
import { mean, score, stdev } from '../src/experiments/outcome.ts';
import { findLead, turtleExperiment } from '../src/experiments/turtle.ts';
import { runGame } from '../src/match.ts';

const config = makeConfig();

function allCards(s: GameState): Card[] {
  const cards: Card[] = [...s.deck, ...s.graveyard];
  for (const p of s.players) {
    cards.push(...p.hand, ...p.pending, ...p.attackRow, ...p.defenseRow, ...p.attackBuffs, ...p.defenseBuffs, ...p.guard);
    if (p.reflect) cards.push(p.reflect.k, p.reflect.j, p.reflect.q);
  }
  return cards;
}

/** Um estado de meio de partida com mão no oponente. */
function middle(): GameState {
  return runGame({ config, seed: 'meio', bots: [BOTS.greedy, BOTS.greedy], maxSteps: 12 }).finalState;
}

describe('determinize', () => {
  const s = middle();
  const viewer = s.players[0].id;

  it('não muda nada do que o viewer vê', () => {
    expect(viewFor(determinize(s, viewer, 'r1'), viewer)).toEqual(viewFor(s, viewer));
  });

  it('conserva as cartas e mantém só especiais na mão do oponente', () => {
    const d = determinize(s, viewer, 'r1');
    const ids = allCards(d).map((c) => c.id);
    expect(ids).toHaveLength(totalCards(config));
    expect(new Set(ids).size).toBe(ids.length);
    expect(d.players[1].hand.map((c): string => c.kind)).not.toContain('NUM');
    expect(d.players[1].hand).toHaveLength(s.players[1].hand.length);
  });

  it('sementes diferentes dão mundos diferentes; a mesma semente, o mesmo mundo', () => {
    expect(determinize(s, viewer, 'r1')).toEqual(determinize(s, viewer, 'r1'));
    expect(determinize(s, viewer, 'r1').deck).not.toEqual(determinize(s, viewer, 'r2').deck);
  });

  it('não muta o estado recebido', () => {
    const before = JSON.stringify(s);
    determinize(s, viewer, 'r3');
    expect(JSON.stringify(s)).toBe(before);
  });
});

describe('outcome', () => {
  it('score: vitória 1, empate 0,5, derrota ou sem fim 0', () => {
    expect(score({ kind: 'WIN', winner: 'p1', reason: 'HP' }, 'p1')).toBe(1);
    expect(score({ kind: 'WIN', winner: 'p2', reason: 'HP' }, 'p1')).toBe(0);
    expect(score({ kind: 'DRAW', reason: 'ANTI_STALL' }, 'p1')).toBe(0.5);
    expect(score(null, 'p1')).toBe(0);
  });

  it('mean e stdev', () => {
    expect(mean([1, 2, 3])).toBe(2);
    expect(mean([])).toBe(0);
    expect(stdev([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3);
    expect(stdev([1])).toBe(0);
  });
});

describe('experimento do turtle (desenho pareado)', () => {
  it('findLead para no início de um Equipar com a vantagem pedida', () => {
    const point = findLead(config, 'turtle-0', 10);
    expect(point).not.toBeNull();
    const [a, b] = point!.state.players;
    expect(Math.abs(a.hp - b.hp)).toBeGreaterThanOrEqual(10);
    expect(point!.state.phase.kind).toBe('EQUIP');
    expect(point!.leader).toBe(a.hp > b.hp ? a.id : b.id);
  });

  it('devolve pontuações em [0, 1], ramos ≤ partidas e é reprodutível', () => {
    const r = turtleExperiment({ config, games: 12, lead: 10 });
    expect(r.branches).toBeGreaterThan(0);
    expect(r.branches).toBeLessThanOrEqual(12);
    for (const x of [r.turtle, r.greedy]) expect(x).toBeGreaterThanOrEqual(0);
    for (const x of [r.turtle, r.greedy]) expect(x).toBeLessThanOrEqual(1);
    expect(r.difference).toBeCloseTo(r.turtle - r.greedy);
    expect(Object.values(r.turtleEnds).reduce((a, b) => a + b, 0)).toBe(r.branches);
    expect(turtleExperiment({ config, games: 12, lead: 10 })).toEqual(r);
  });
});

describe('experimento contrafactual da ordem', () => {
  it('classifica cada ponto e resume direção e tamanho', () => {
    const r = orderExperiment({ config, games: 6, rollouts: 4 });
    expect(r.points).toBeGreaterThan(0);
    for (const p of r.detail) {
      expect(['FIRST', 'SECOND', 'TIE']).toContain(p.verdict);
      if (p.verdict === 'FIRST') expect(p.difference).toBeGreaterThan(0);
      if (p.verdict === 'SECOND') expect(p.difference).toBeLessThan(0);
    }
    expect(r.decisive).toBeGreaterThanOrEqual(0);
    expect(r.decisive).toBeLessThanOrEqual(1);
    expect(orderExperiment({ config, games: 6, rollouts: 4 })).toEqual(r);
  });

  it('sem Escolha da iniciativa não há pontos de decisão', () => {
    expect(orderExperiment({ config: makeConfig({ initiativeChoice: false }), games: 3, rollouts: 2 }).points).toBe(0);
  });
});
