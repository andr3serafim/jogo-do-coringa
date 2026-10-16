import { describe, expect, it } from 'vitest';
import { legalActions, makeConfig, viewFor, type Action, type GameState, type PlayerId } from '@coringa/engine';
// Builder de cenários do motor: monta estados reais sem inventar cartas.
// Dívida: trocar por um subpath `@coringa/engine/testing` quando a interface chegar (acopla os pacotes).
import { P1, setup, type PlayerSetup } from '../../engine/test/helpers.ts';
import { BOTS, type BotName } from '../src/bots/index.ts';
import { runGame } from '../src/match.ts';
import { createRng } from '../src/rng.ts';

const decide = (bot: BotName, s: GameState, who: PlayerId = P1): Action => {
  const view = viewFor(s, who);
  return BOTS[bot](view, legalActions(view), createRng('teste'));
};

describe('todos os bots', () => {
  it.each(['random', 'greedy', 'turtle'] as const)('%s só joga ações legais e a partida termina', (name) => {
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

