import { describe, expect, it } from 'vitest';
import { makeConfig, type Action } from '@coringa/engine';
import type { Bot } from '../src/bots/types.ts';
import { randomBot } from '../src/bots/random.ts';
import { attackRoundsUpTo, PLAYERS, runGame, SIM_MAX_ROUNDS } from '../src/match.ts';
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

  // Sem o anti-travamento (E1 do sub-projeto 5) nada garante o fim: o simulador tem um teto de rodadas só dele, que conta como
  // partida sem fim e nunca vira regra.
  describe('teto de rodadas', () => {
    /** Nunca ataca: tudo na Defesa (1 carta por Equipar, então cabe), passa na reação, atacar em segundo. */
    const pacifist: Bot = (_view, legal) =>
      legal.find((a): a is Extract<Action, { type: 'EQUIP' }> => a.type === 'EQUIP' && a.destinations.every((d) => d === 'DEF')) ??
      legal.find((a) => a.type === 'END_TURN' || a.type === 'PASS' || (a.type === 'CHOOSE_ORDER' && !a.first)) ??
      legal[0]!;
    const quiet = makeConfig({ cardsPerEquip: 1 });

    it('o teto padrão é de 400 rodadas', () => {
      expect(SIM_MAX_ROUNDS).toBe(400);
    });

    it('ninguém ataca: a partida para no teto, sem resultado, e o registro diz que foi o teto', () => {
      const r = runGame({ config: quiet, seed: 'teto', bots: [pacifist, pacifist], maxRounds: 12 });
      expect(r.result).toBeNull();
      expect(r.capped).toBe(true);
      expect(r.finalState.round).toBe(13);
      expect(r.absoluteDefenseAtCap).toBe(false);
    });

    it('a partida que acaba antes do teto não é parada no teto', () => {
      const r = runGame({ config, seed: 's1', bots: [randomBot, randomBot] });
      expect(r.capped).toBe(false);
      expect(r.absoluteDefenseAtCap).toBe(false);
    });

    it('o maxSteps e o onStep param sem ser o teto', () => {
      expect(runGame({ config, seed: 's5', bots: [randomBot, randomBot], maxSteps: 3 }).capped).toBe(false);
    });
  });

  it('attackRoundsUpTo segue o ciclo E, E, A, E, A', () => {
    expect([1, 2, 3, 4, 5, 6, 7].map(attackRoundsUpTo)).toEqual([0, 0, 1, 1, 2, 2, 3]);
  });
});
