import { describe, expect, it } from 'vitest';
import { makeConfig, totalCards, viewFor, type Card, type GameState } from '@coringa/engine';
// Builder de cenários do motor: monta estados reais sem inventar cartas.
import { P1, P2, player } from '@coringa/engine/testing';
import { BOTS } from '../src/bots/index.ts';
import { determinize } from '../src/experiments/determinize.ts';
import { orderExperiment } from '../src/experiments/order.ts';
import { mean, score, stdev } from '../src/experiments/outcome.ts';
import { findLead, turtleExperiment } from '../src/experiments/turtle.ts';
import { runGame } from '../src/match.ts';
import { equip, submitted, swapHidden } from './hidden-states.ts';

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

  it('não muda nada do que o viewer vê (salvo o oponente deixar de constar como confirmado no Equipar)', () => {
    const view = viewFor(s, viewer);
    expect(viewFor(determinize(s, viewer, 'r1'), viewer)).toEqual({ ...view, opponent: { ...view.opponent, equipSubmitted: false } });
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

/** Estado do Equipar: mesma visão do P1, mas a informação oculta do P2 (mão, pendentes, monte) é a que se pedir. */
describe('determinize não vaza a informação oculta', () => {
  const ids = (cards: Card[]): string[] => cards.map((c) => c.id);
  const hidden = (s: GameState) => ({
    hand: ids(player(s, P2).hand),
    pending: ids(player(s, P2).pending),
    deck: ids(s.deck),
    submittedDestinations: player(s, P2).submittedDestinations,
    equipSubmitted: player(s, P2).equipSubmitted,
  });

  it('só a informação oculta real muda entre os dois estados (a visão do viewer é a mesma)', () => {
    const a = equip();
    const b = swapHidden(a);
    expect(viewFor(b, P1)).toEqual(viewFor(a, P1));
    expect(hidden(b).hand).not.toEqual(hidden(a).hand);
    expect(hidden(b).pending).not.toEqual(hidden(a).pending);
    expect(hidden(b).deck).not.toEqual(hidden(a).deck);
    expect([...hidden(b).deck].sort()).not.toEqual([...hidden(a).deck].sort());
  });

  it('o resultado não depende da mão do oponente, dos pendentes nem da ordem do monte', () => {
    const a = equip();
    const b = swapHidden(a);
    const da = determinize(a, P1, 's');
    const db = determinize(b, P1, 's');
    expect(hidden(db)).toEqual(hidden(da));
    expect(db).toEqual(da);
  });

  it('o Equipar já confirmado pelo oponente é descartado: ele decide de novo nos rollouts', () => {
    const a = equip();
    const c = submitted(a, ['ATK', 'DEF', 'DISCARD']);
    const d = swapHidden(submitted(a, ['DEF', 'DEF', 'ATK']));
    expect(viewFor(d, P1)).toEqual(viewFor(c, P1));
    const dc = determinize(c, P1, 's');
    const dd = determinize(d, P1, 's');
    expect(player(dc, P2).submittedDestinations).toBeNull();
    expect(player(dc, P2).equipSubmitted).toBe(false);
    expect(hidden(dd)).toEqual(hidden(dc));
    expect(dd).toEqual(dc);
    // quem não tinha confirmado dá o mesmo mundo: o rollout não sabe quem confirmou
    expect(determinize(a, P1, 's')).toEqual(dc);
  });

  it('a única diferença na visão do viewer é o oponente deixar de constar como confirmado', () => {
    const c = submitted(equip(), ['ATK', 'DEF', 'DISCARD']);
    const view = viewFor(c, P1);
    expect(viewFor(determinize(c, P1, 's'), P1)).toEqual({ ...view, opponent: { ...view.opponent, equipSubmitted: false } });
  });

  it('o Equipar do próprio viewer é mantido', () => {
    const c = equip();
    player(c, P1).equipSubmitted = true;
    player(c, P1).submittedDestinations = ['ATK', 'DEF', 'ATK'];
    const d = determinize(c, P1, 's');
    expect(player(d, P1).equipSubmitted).toBe(true);
    expect(player(d, P1).submittedDestinations).toEqual(['ATK', 'DEF', 'ATK']);
  });

  it('conserva as cartas, as quantidades e os tipos', () => {
    const b = swapHidden(equip());
    const d = determinize(b, P1, 's');
    const all = ids(allCards(d));
    expect(all).toHaveLength(totalCards(d.config));
    expect(new Set(all).size).toBe(all.length);
    expect(player(d, P2).hand).toHaveLength(2);
    expect(player(d, P2).hand.map((c): string => c.kind)).not.toContain('NUM');
    expect(player(d, P2).pending).toHaveLength(3);
    expect(player(d, P2).pending.every((c) => c.kind === 'NUM')).toBe(true);
    expect(d.deck).toHaveLength(b.deck.length);
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
