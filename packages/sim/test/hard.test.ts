import { describe, expect, it } from 'vitest';
import { actingPlayers, applyAction, legalActions, makeConfig, viewFor, type Action, type GameState, type PlayerId } from '@coringa/engine';
// Builder de cenários do motor: monta estados reais sem inventar cartas.
import { P1, setup } from '@coringa/engine/testing';
import { greedyBot } from '../src/bots/greedy.ts';
import { HARD_DEFAULTS, hardSearch, runHard } from '../src/bots/hard.ts';
import { HARD_BOT } from '../src/bots/types.ts';
import { newGame, runGame } from '../src/match.ts';
import { createRng } from '../src/rng.ts';
import { runSeries } from '../src/series.ts';
import { equip, submitted, swapHidden } from './hidden-states.ts';

const config = makeConfig();

const legalOf = (s: GameState, who: PlayerId = P1): Action[] => legalActions(viewFor(s, who));

/** Roda o gerador até o fim: devolve a ação escolhida e quantas vezes ele cedeu. */
function drain(search: Generator<void, Action>): { action: Action; yields: number } {
  let yields = 0;
  let step = search.next();
  while (!step.done) {
    yields += 1;
    step = search.next();
  }
  return { action: step.value, yields };
}

describe('bot Difícil', () => {
  it('sem trapaça: a decisão é a mesma quando só muda a informação oculta', () => {
    const a = equip();
    const b = swapHidden(a);
    // o oponente já confirmou o Equipar: os destinos dele também são informação oculta
    const c = submitted(a, ['ATK', 'DEF', 'DISCARD']);
    const d = swapHidden(submitted(a, ['DEF', 'DEF', 'DEF']));
    const legal = legalOf(a);
    expect(legalOf(b)).toEqual(legal);
    expect(legalOf(c)).toEqual(legal);
    expect(legalOf(d)).toEqual(legal);
    for (const seed of ['x', 'y', 'z']) {
      expect(runHard(b, P1, legal, createRng(seed))).toEqual(runHard(a, P1, legal, createRng(seed)));
      expect(runHard(d, P1, legal, createRng(seed))).toEqual(runHard(c, P1, legal, createRng(seed)));
    }
  });

  it('determinístico para a mesma semente, sem mexer no estado recebido', () => {
    const s = equip();
    const legal = legalOf(s);
    const before = JSON.stringify(s);
    expect(runHard(s, P1, legal, createRng('d'))).toEqual(runHard(s, P1, legal, createRng('d')));
    expect(JSON.stringify(s)).toBe(before);
  });

  it('com uma ação legal, devolve-a sem rollout (o gerador termina sem ceder nem gastar o rng)', () => {
    const s = setup();
    const legal = legalOf(s);
    expect(legal).toEqual([{ type: 'END_TURN' }]);
    const rng = createRng('u');
    expect(hardSearch(s, P1, legal, rng).next()).toEqual({ done: true, value: { type: 'END_TURN' } });
    expect(rng.next()).toBe(createRng('u').next());
  });

  it('sem ação legal, avisa em vez de inventar uma', () => {
    expect(() => runHard(equip(), P1, [], createRng('v'))).toThrow('sem ação legal');
  });

  it('o gerador cede uma vez por rollout: min(candidatas, maxCandidates) × rolloutsPerCandidate', () => {
    const s = equip();
    const legal = legalOf(s);
    expect(legal).toHaveLength(8);
    const yieldsFor = (maxCandidates: number, rolloutsPerCandidate: number): number =>
      drain(hardSearch(s, P1, legal, createRng('c'), { maxCandidates, rolloutsPerCandidate })).yields;
    expect(yieldsFor(2, 3)).toBe(2 * 3);
    expect(yieldsFor(20, 2)).toBe(8 * 2);
    expect(yieldsFor(HARD_DEFAULTS.maxCandidates, 1)).toBe(Math.min(legal.length, HARD_DEFAULTS.maxCandidates));
  });

  it('sempre devolve uma ação da lista legal (20 partidas curtas, hard × greedy)', () => {
    for (let i = 0; i < 20; i += 1) {
      const hardSeat = i % 2 === 0 ? 'p1' : 'p2';
      const hardRng = createRng(`curta-${i}/hard`);
      const greedyRng = createRng(`curta-${i}/greedy`);
      let s = newGame(config, `curta-${i}`);
      for (let step = 0; step < 30 && s.phase.kind !== 'GAME_OVER'; step += 1) {
        const actor = actingPlayers(s)[0];
        const legal = legalOf(s, actor);
        const action =
          actor === hardSeat
            ? drain(hardSearch(s, actor, legal, hardRng, { rolloutsPerCandidate: 2, maxCandidates: HARD_DEFAULTS.maxCandidates })).action
            : greedyBot(viewFor(s, actor), legal, greedyRng);
        expect(legal).toContainEqual(action);
        const result = applyAction(s, actor, action);
        expect(result.ok).toBe(true);
        if (!result.ok) return;
        s = result.state;
      }
    }
  });

  it('o simulador joga com o Difícil num assento (HARD_BOT) e repete a mesma partida', () => {
    const play = () => runGame({ config, seed: 'sim-hard', bots: [HARD_BOT, greedyBot], maxSteps: 16, record: true });
    const first = play();
    expect(first.steps).toBe(16);
    expect(play().replay).toEqual(first.replay);
  });

  it('runSeries aceita o Difícil no lugar do nome do bot e a partida termina', () => {
    const [record] = runSeries(config, ['greedy', HARD_BOT], 1, 'serie-hard');
    expect(record.result).not.toBeNull();
  });
});
