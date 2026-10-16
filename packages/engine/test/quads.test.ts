import { describe, expect, it } from 'vitest';
import { makeConfig } from '../src/config.ts';
import {
  currentQuads,
  isResurrectionValid,
  pruneResurrections,
  quadBonus,
  quadValues,
  reevaluateQuads,
} from '../src/quads.ts';
import type { GameEvent, GameState, NumCard, PlayerState, Rank } from '../src/types.ts';

let counter = 0;
const n = (value: Rank): NumCard => ({ id: `n-${value}-${counter++}`, kind: 'NUM', value, suit: 'copas' });
const row = (...vals: Rank[]): NumCard[] => vals.map(n);

function makePlayer(attack: Rank[], defense: Rank[]): PlayerState {
  return {
    id: 'p',
    hp: 100,
    hand: [],
    pending: [],
    equipSubmitted: false,
    submittedDestinations: null,
    attackRow: row(...attack),
    defenseRow: row(...defense),
    attackBuffs: [],
    defenseBuffs: [],
    guard: [],
    reflect: null,
    absoluteDefense: false,
    quads: [],
    resurrections: [],
    damageThisRound: 0,
  };
}

const stateAt = (round: number): GameState => ({ round, config: makeConfig() }) as unknown as GameState;

describe('quadras', () => {
  it('4 ou mais iguais na mesma fileira formam quadra, sem precisar estar seguidas', () => {
    expect(quadValues(row(7, 7, 3, 7, 7))).toEqual([7]);
    expect(quadValues(row(7, 7, 7))).toEqual([]);
    expect(quadValues(row(5, 5, 5, 5, 5))).toEqual([5]);
  });

  it('bônus = valor da carta, uma vez por quadra (exemplo 4 da spec)', () => {
    expect(quadBonus(row(10, 3, 10, 10, 10))).toBe(10);
    expect(quadBonus(row(5, 5, 5, 5, 5))).toBe(5);
  });

  it('currentQuads lista Ataque e Defesa', () => {
    expect(currentQuads(makePlayer([2, 2, 2, 2], [9, 9, 9, 9]))).toEqual([
      { row: 'ATK', value: 2 },
      { row: 'DEF', value: 9 },
    ]);
  });

  it('formar, manter, desfazer e refazer quadra', () => {
    const p = makePlayer([7, 7, 7, 7], []);
    const ev: GameEvent[] = [];
    reevaluateQuads(stateAt(5), p, ev);
    expect(ev).toEqual([{ type: 'QuadFormed', player: 'p', quad: { row: 'ATK', value: 7 } }]);
    expect(p.resurrections).toEqual([{ row: 'ATK', value: 7, formedAtRound: 5 }]);

    const again: GameEvent[] = [];
    reevaluateQuads(stateAt(6), p, again);
    expect(again).toEqual([]);

    p.attackRow.shift();
    const broken: GameEvent[] = [];
    reevaluateQuads(stateAt(6), p, broken);
    expect(broken).toEqual([{ type: 'QuadBroken', player: 'p', quad: { row: 'ATK', value: 7 } }]);
    expect(p.quads).toEqual([]);

    p.attackRow.push(n(7));
    const reformed: GameEvent[] = [];
    reevaluateQuads(stateAt(7), p, reformed);
    expect(reformed).toEqual([{ type: 'QuadFormed', player: 'p', quad: { row: 'ATK', value: 7 } }]);
    expect(p.resurrections).toHaveLength(2);
  });
});

describe('Ressurreição', () => {
  const token = { row: 'ATK' as const, value: 7 as const, formedAtRound: 5 };

  it('vale enquanto a quadra existir', () => {
    const p = makePlayer([7, 7, 7, 7], []);
    p.quads = currentQuads(p);
    expect(isResurrectionValid(stateAt(20), p, token)).toBe(true);
  });

  it('sem a quadra, vale por 3 rodadas após a formação', () => {
    const p = makePlayer([], []);
    expect(isResurrectionValid(stateAt(8), p, token)).toBe(true);
    expect(isResurrectionValid(stateAt(9), p, token)).toBe(false);
  });

  it('pruneResurrections remove as vencidas', () => {
    const p = makePlayer([], []);
    p.resurrections = [token, { row: 'DEF', value: 4, formedAtRound: 8 }];
    pruneResurrections(stateAt(9), p);
    expect(p.resurrections).toEqual([{ row: 'DEF', value: 4, formedAtRound: 8 }]);
  });
});
