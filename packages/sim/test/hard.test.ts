import { describe, expect, it } from 'vitest';
import { actingPlayers, applyAction, legalActions, makeConfig, viewFor, type Action, type GameState, type PlayerId } from '@coringa/engine';
// Builder de cenários do motor: monta estados reais sem inventar cartas.
import { P1, setup } from '@coringa/engine/testing';
import { greedyBot } from '../src/bots/greedy.ts';
import { HARD_DEFAULTS, hardSearch, hardSearchTotals, runHard } from '../src/bots/hard.ts';
import { HARD_BOT } from '../src/bots/types.ts';
import { newGame, runGame } from '../src/match.ts';
import { createRng } from '../src/rng.ts';
import { runSeries } from '../src/series.ts';
import { equip, submitted, swapHidden } from './hidden-states.ts';

const config = makeConfig();

const legalOf = (s: GameState, who: PlayerId = P1): Action[] => legalActions(viewFor(s, who));

/** Roda o gerador até o fim: devolve o valor de retorno e quantas vezes ele cedeu. */
function drain<T>(search: Generator<void, T>): { value: T; yields: number } {
  let yields = 0;
  let step = search.next();
  while (!step.done) {
    yields += 1;
    step = search.next();
  }
  return { value: step.value, yields };
}

describe('bot Difícil', () => {
  it('sem trapaça: as candidatas, os totais e a decisão são os mesmos quando só muda a informação oculta', () => {
    const a = equip();
    const b = swapHidden(a);
    // o oponente já confirmou o Equipar: os destinos dele também são informação oculta
    const c = submitted(a, ['ATK', 'DEF', 'DISCARD']);
    const d = swapHidden(submitted(a, ['DEF', 'DEF', 'DEF']));
    const legal = legalOf(a);
    expect(legalOf(b)).toEqual(legal);
    expect(legalOf(c)).toEqual(legal);
    expect(legalOf(d)).toEqual(legal);
    const options = { ...HARD_DEFAULTS, rolloutsPerCandidate: 3 };
    const search = (s: GameState, seed: string) => drain(hardSearchTotals(s, P1, legal, createRng(seed), options)).value;
    // a premissa da comparação: as candidatas rendem totais diferentes entre si
    const { candidates, totals } = search(a, 'x');
    expect(candidates).toHaveLength(4);
    expect(new Set(totals).size).toBeGreaterThan(1);
    for (const seed of ['x', 'y', 'z', 'w']) {
      expect(search(b, seed)).toEqual(search(a, seed));
      expect(search(d, seed)).toEqual(search(c, seed));
    }
    expect(runHard(b, P1, legal, createRng('x'))).toEqual(runHard(a, P1, legal, createRng('x')));
    expect(runHard(d, P1, legal, createRng('x'))).toEqual(runHard(c, P1, legal, createRng('x')));
  });

  it('a primeira candidata é a escolha do greedy (um elemento da lista), em posições reais de uma partida', () => {
    const positions: Array<{ state: GameState; actor: PlayerId }> = [];
    runGame({
      config,
      seed: 'candidatas',
      bots: [greedyBot, greedyBot],
      maxSteps: 60,
      onStep: (before) => {
        const actor = actingPlayers(before)[0];
        const kind = before.phase.kind;
        if (legalOf(before, actor).length >= 2 && positions.filter((p) => p.state.phase.kind === kind).length < 3) positions.push({ state: before, actor });
      },
    });
    const kinds = new Set(positions.map((p) => p.state.phase.kind));
    for (const kind of ['EQUIP', 'ORDER_CHOICE', 'ATTACK_MAIN'] as const) expect(kinds).toContain(kind);
    for (const { state, actor } of positions) {
      const legal = legalOf(state, actor);
      for (const seed of ['g', 'h']) {
        const { candidates } = drain(hardSearchTotals(state, actor, legal, createRng(seed), { ...HARD_DEFAULTS, rolloutsPerCandidate: 1 })).value;
        // a semente do greedy sai da semente-base que a busca sorteia do rng
        const greedy = greedyBot(viewFor(state, actor), legal, createRng(`hard-${createRng(seed).int(2 ** 31)}/greedy`));
        expect(candidates[0]).toEqual(greedy);
        for (const candidate of candidates) expect(legal).toContain(candidate);
      }
    }
  });

  it('numa fase fora de horizon não há busca: a única candidata é a escolha do greedy e o gerador não cede', () => {
    let found: { state: GameState; actor: PlayerId } | null = null;
    runGame({
      config,
      seed: 'candidatas',
      bots: [greedyBot, greedyBot],
      maxSteps: 60,
      onStep: (before) => {
        const actor = actingPlayers(before)[0];
        if (!found && before.phase.kind === 'ORDER_CHOICE') found = { state: before, actor };
      },
    });
    if (!found) throw new Error('a partida de referência não passou pela escolha da ordem');
    const { state, actor } = found as { state: GameState; actor: PlayerId };
    const legal = legalOf(state, actor);
    expect(legal.length).toBeGreaterThanOrEqual(2);
    expect(HARD_DEFAULTS.horizon.ORDER_CHOICE).toBeUndefined();
    const greedy = greedyBot(viewFor(state, actor), legal, createRng(`hard-${createRng('o').int(2 ** 31)}/greedy`));
    const off = drain(hardSearchTotals(state, actor, legal, createRng('o'), HARD_DEFAULTS));
    expect(off.yields).toBe(0);
    expect(off.value).toEqual({ candidates: [greedy], totals: [0] });
    expect(runHard(state, actor, legal, createRng('o'))).toEqual(greedy);
    // com o horizonte da fase ligado, a busca roda: uma cessão por rollout das duas candidatas
    const on = drain(hardSearchTotals(state, actor, legal, createRng('o'), { ...HARD_DEFAULTS, rolloutsPerCandidate: 1, horizon: { ORDER_CHOICE: 1 } }));
    expect(on.yields).toBe(Math.min(legal.length, HARD_DEFAULTS.maxCandidates));
    expect(on.value.candidates[0]).toEqual(greedy);
  });

  it('o horizonte conta rodadas de Ataque: um maior muda os totais, e um enorme termina sem lançar', () => {
    const s = equip();
    const legal = legalOf(s);
    const totalsFor = (equipRounds: number) =>
      drain(hardSearchTotals(s, P1, legal, createRng('h'), { ...HARD_DEFAULTS, rolloutsPerCandidate: 2, horizon: { EQUIP: equipRounds } })).value;
    const short = totalsFor(1);
    const long = totalsFor(3);
    expect(long.candidates).toEqual(short.candidates);
    expect(long.totals).not.toEqual(short.totals);
    expect(() => totalsFor(1_000)).not.toThrow();
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
      drain(hardSearch(s, P1, legal, createRng('c'), { ...HARD_DEFAULTS, maxCandidates, rolloutsPerCandidate })).yields;
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
            ? drain(hardSearch(s, actor, legal, hardRng, { ...HARD_DEFAULTS, rolloutsPerCandidate: 2 })).value
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
