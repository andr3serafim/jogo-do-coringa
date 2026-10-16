import { describe, expect, it } from 'vitest';
import { makeConfig } from '@coringa/engine';
import { randomBot } from '../src/bots/random.ts';
import { attackRoundsUpTo, PLAYERS, runGame } from '../src/match.ts';
import { createRng } from '../src/rng.ts';

describe('createRng', () => {
  it('a mesma semente dá a mesma sequência; sementes diferentes, sequências diferentes', () => {
    const seq = (seed: string) => {
      const rng = createRng(seed);
      return Array.from({ length: 5 }, () => rng.int(1000));
    };
    expect(seq('a')).toEqual(seq('a'));
    expect(seq('a')).not.toEqual(seq('b'));
  });

  it('pick escolhe um elemento da lista e recusa lista vazia', () => {
    const rng = createRng('pick');
    for (let i = 0; i < 50; i += 1) expect(['x', 'y', 'z']).toContain(rng.pick(['x', 'y', 'z']));
    expect(() => rng.pick([])).toThrow();
  });
});

describe('runGame', () => {
  const config = makeConfig();

  it('joga até o fim e registra resultado, rodadas e eventos', () => {
    const r = runGame({ config, seed: 's1', bots: [randomBot, randomBot] });
    expect(r.result).not.toBeNull();
    expect(r.finalState.phase.kind).toBe('GAME_OVER');
    expect(r.attackRounds).toBe(attackRoundsUpTo(r.finalState.round));
    expect(r.eventCounts.GameOver).toBe(1);
    expect(PLAYERS).toContain(r.initialInitiative);
  });

  it('é reprodutível: mesma semente de partida e de bots → mesma partida', () => {
    const a = runGame({ config, seed: 's2', bots: [randomBot, randomBot] });
    const b = runGame({ config, seed: 's2', bots: [randomBot, randomBot] });
    expect(b.finalState).toEqual(a.finalState);
    const c = runGame({ config, seed: 's2', bots: [randomBot, randomBot], botSeed: 'outra' });
    expect(c.finalState).not.toEqual(a.finalState);
  });

  it('com record, guarda uma ação por passo', () => {
    const r = runGame({ config, seed: 's3', bots: [randomBot, randomBot], record: true });
    expect(r.replay).toHaveLength(r.steps);
  });

  it("onStep pode parar a simulação ('stop') e o resultado fica null", () => {
    const r = runGame({ config, seed: 's4', bots: [randomBot, randomBot], onStep: () => 'stop' });
    expect(r.steps).toBe(1);
    expect(r.result).toBeNull();
  });

  it('estourar maxSteps conta como partida que não terminou', () => {
    expect(runGame({ config, seed: 's5', bots: [randomBot, randomBot], maxSteps: 3 }).result).toBeNull();
  });

  it('continua de um estado inicial (ramos dos experimentos)', () => {
    const middle = runGame({ config, seed: 's6', bots: [randomBot, randomBot], maxSteps: 10 }).finalState;
    const r = runGame({ config, seed: 's6', bots: [randomBot, randomBot], initial: middle });
    expect(r.finalState.phase.kind).toBe('GAME_OVER');
    expect(r.initialInitiative).toBe(middle.initiative);
  });

  it('ação ilegal de bot é bug e lança exceção', () => {
    expect(() => runGame({ config, seed: 's7', bots: [() => ({ type: 'PASS' }), randomBot] })).toThrow(/ação ilegal/);
  });

  it('attackRoundsUpTo segue o ciclo E, E, A, E, A', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(attackRoundsUpTo)).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });
});
