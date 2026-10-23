import { describe, expect, it } from 'vitest';
import { legalActions, makeConfig, viewFor, type Action, type GameState, type PlayerId } from '@coringa/engine';
// Builder de cenários do motor: monta estados reais sem inventar cartas.
import { P1, setup, type PlayerSetup } from '@coringa/engine/testing';
import { BOTS, type BotName } from '../src/bots/index.ts';
import { easyBot, EASY_BLUNDER } from '../src/bots/easy.ts';
import { greedyBot } from '../src/bots/greedy.ts';
import { runGame } from '../src/match.ts';
import { createRng, type Rng } from '../src/rng.ts';
import { runSeries } from '../src/series.ts';

const decide = (bot: BotName, s: GameState, who: PlayerId = P1): Action => {
  const view = viewFor(s, who);
  return BOTS[bot](view, legalActions(view), createRng('teste'));
};

describe('todos os bots', () => {
  it.each(['random', 'greedy', 'turtle', 'easy'] as const)('%s só joga ações legais e a partida termina', (name) => {
    for (let i = 0; i < 20; i += 1) {
      const record = runGame({
        config: makeConfig(),
        seed: `legal-${name}-${i}`,
        bots: [
          (view, legal, rng) => {
            const action = BOTS[name](view, legal, rng);
            expect(legal).toContainEqual(action);
            return action;
          },
          BOTS.greedy,
        ],
      });
      expect(record.result).not.toBeNull();
    }
  });
});

describe('turtle', () => {
  const ahead = { p1: { hp: 90 }, p2: { hp: 60 } };
  const equip = { phase: { kind: 'EQUIP' } as const, roundKind: 'EQUIP' as const };

  it('na frente, manda tudo para a Defesa', () => {
    const s = setup({ ...equip, p1: { ...ahead.p1, pending: [9, 3, 7] }, p2: ahead.p2 });
    expect(decide('turtle', s)).toEqual({ type: 'EQUIP', destinations: ['DEF', 'DEF', 'DEF'] });
  });

  it('com a Defesa cheia e espaço no Ataque, a numérica vai para o Ataque à força (spec §1.4)', () => {
    const s = setup({ ...equip, p1: { ...ahead.p1, pending: [9], defense: [2, 2, 3, 3, 4, 4, 5] }, p2: ahead.p2 });
    expect(decide('turtle', s)).toEqual({ type: 'EQUIP', destinations: ['ATK'] });
  });

  it('com as duas cheias, troca a última da Defesa se a nova for maior; senão descarta', () => {
    const full: PlayerSetup = { attack: [2, 2, 3, 3, 4, 4, 5], defense: [6, 6, 7, 7, 8, 8, 5] };
    const maior = setup({ ...equip, p1: { ...ahead.p1, ...full, pending: [9] }, p2: ahead.p2 });
    expect(decide('turtle', maior)).toEqual({ type: 'EQUIP', destinations: ['REPLACE_LAST_DEF'] });
    const menor = setup({ ...equip, p1: { ...ahead.p1, ...full, pending: [2] }, p2: ahead.p2 });
    expect(decide('turtle', menor)).toEqual({ type: 'EQUIP', destinations: ['DISCARD'] });
  });

  it('na frente, joga todos os K de uma vez', () => {
    const s = setup({ p1: { ...ahead.p1, hand: ['K', 'K', 'K'] }, p2: ahead.p2 });
    const action = decide('turtle', s);
    expect(action.type === 'PLAY_K' && action.cardIds).toHaveLength(3);
  });

  it('atrás ou empatado em vida, joga exatamente como o greedy', () => {
    const s = setup({ p1: { hp: 50, hand: ['J', 'K'], attack: [5, 6] }, p2: { hp: 70, attack: [4] } });
    expect(decide('turtle', s)).toEqual(decide('greedy', s));
  });
});

describe('random', () => {
  it('escolhe entre as legais usando só o RNG recebido', () => {
    const s = setup({ p1: { hand: ['J', 'Q', 'K'], attack: [5] }, p2: { attack: [4] } });
    expect(decide('random', s)).toEqual(decide('random', s));
    expect(legalActions(viewFor(s, P1))).toContainEqual(decide('random', s));
  });
});


describe('easy', () => {
  const config = makeConfig();
  /** Rng de mentira: `next` fixo (decide se o bot se distrai) e `pick` sempre o último item. */
  const fixedRng = (next: number): Rng => ({ next: () => next, int: (max) => max - 1, pick: (items) => items[items.length - 1] });
  const busy = () => setup({ p1: { hand: ['J', 'Q', 'K'], attack: [5], defense: [4] }, p2: { attack: [4] } });

  it('abaixo do limiar de distração, sorteia entre as legais com o RNG recebido', () => {
    const view = viewFor(busy(), P1);
    const legal = legalActions(view);
    expect(legal.length).toBeGreaterThan(1);
    expect(easyBot(view, legal, fixedRng(EASY_BLUNDER - 0.01))).toEqual(legal[legal.length - 1]);
  });

  it('no limiar ou acima, joga exatamente como o greedy', () => {
    const view = viewFor(busy(), P1);
    const legal = legalActions(view);
    for (const next of [EASY_BLUNDER, 0.99]) {
      expect(easyBot(view, legal, fixedRng(next))).toEqual(greedyBot(view, legal, fixedRng(next)));
    }
  });

  it('contra o greedy, 100 partidas terminam sem ação ilegal (runGame lança se o bot erra)', () => {
    const records = runSeries(config, ['easy', 'greedy'], 100, 'easy-legal');
    expect(records).toHaveLength(100);
    expect(records.every((r) => r.result !== null)).toBe(true);
  });

  it('é determinístico para a mesma semente', () => {
    const a = runSeries(config, ['easy', 'greedy'], 10, 'easy-det');
    const b = runSeries(config, ['easy', 'greedy'], 10, 'easy-det');
    expect(b.map((r) => [r.result, r.steps])).toEqual(a.map((r) => [r.result, r.steps]));
    expect(b.map((r) => r.finalState)).toEqual(a.map((r) => r.finalState));
  });

  it('o greedy pontua pelo menos 65% contra ele em 200 partidas, alternando assentos', () => {
    // Vitória vale 1, empate ½. Metade das partidas com o greedy de p1, metade de p2; mesma semente fixa.
    const asP1 = runSeries(config, ['greedy', 'easy'], 100, 'easy-nivel-a');
    const asP2 = runSeries(config, ['easy', 'greedy'], 100, 'easy-nivel-b');
    const points = (records: typeof asP1, greedySeat: PlayerId): number =>
      records.reduce((sum, r) => {
        if (r.result === null) throw new Error(`partida sem fim: ${r.seed}`);
        if (r.result.kind === 'DRAW') return sum + 0.5;
        return sum + (r.result.winner === greedySeat ? 1 : 0);
      }, 0);
    const score = (points(asP1, 'p1') + points(asP2, 'p2')) / (asP1.length + asP2.length);
    expect(score).toBeGreaterThanOrEqual(0.65);
  });
});
