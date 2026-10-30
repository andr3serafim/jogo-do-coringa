import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action.ts';
import { legalActions } from '../src/legal-actions.ts';
import { viewFor } from '../src/view.ts';
import { checkInvariants } from './invariants.ts';
import { actingPlayers, playout } from './playout.ts';

const arbConfig = fc.record({
  initiativeChoice: fc.boolean(),
  wildJokers: fc.boolean(),
});
const arbChoices = fc.array(fc.nat(), { minLength: 1, maxLength: 64 });

describe('propriedades do motor (spec §5)', () => {
  // Sem o anti-travamento (E1 do sub-projeto 5) nada garante o fim: a partida em que ninguém ataca segue para sempre. A
  // invariante "toda partida termina" virou "toda partida que para no teto é contada" (spec §5).
  it('partidas aleatórias respeitam conservação, vida e sigilo; as que não acabam param no teto e são contadas', () => {
    const cap = 5_000;
    let ended = 0;
    let capped = 0;
    fc.assert(
      fc.property(fc.string(), arbChoices, arbConfig, fc.integer({ min: 0, max: 9 }), (seed, choices, config, timeoutEvery) => {
        const { state, steps } = playout({ seed, choices, config, timeoutEvery, maxSteps: cap, onStep: checkInvariants });
        if (state.phase.kind === 'GAME_OVER') ended += 1;
        else {
          expect(steps).toBe(cap);
          capped += 1;
        }
      }),
      { numRuns: 60 },
    );
    expect(ended + capped).toBe(60);
    expect(ended, `${capped} de 60 pararam no teto`).toBeGreaterThan(0);
  });

  it('determinismo: mesma semente e mesmas escolhas → mesmo estado final', () => {
    fc.assert(
      fc.property(fc.string(), arbChoices, arbConfig, (seed, choices, config) => {
        expect(playout({ seed, choices, config }).state).toEqual(playout({ seed, choices, config }).state);
      }),
      { numRuns: 20 },
    );
  });

  it('applyAction nunca muta o estado de entrada (review focus 5)', () => {
    fc.assert(
      fc.property(fc.string(), arbChoices, (seed, choices) => {
        playout({ seed, choices, checkImmutability: true, maxSteps: 600 });
      }),
      { numRuns: 15 },
    );
  });

  it('os eventos não compartilham objetos com o estado devolvido: quem guarda um não altera o outro', () => {
    /** Todos os objetos (e listas) alcançáveis a partir de `root`. */
    const objectsOf = (root: unknown, into = new Set<object>()): Set<object> => {
      if (typeof root !== 'object' || root === null || into.has(root)) return into;
      into.add(root);
      for (const value of Object.values(root)) objectsOf(value, into);
      return into;
    };
    let checked = 0;
    fc.assert(
      fc.property(fc.string(), arbChoices, arbConfig, (seed, choices, config) => {
        playout({
          seed,
          choices,
          config,
          maxSteps: 400,
          onStep: (_before, after, events) => {
            const inState = objectsOf(after);
            const shared = [...objectsOf(events)].filter((object) => inState.has(object));
            checked += events.length;
            expect(shared, 'objetos do evento que são do estado').toEqual([]);
          },
        });
      }),
      { numRuns: 15 },
    );
    expect(checked, 'a propriedade viu eventos').toBeGreaterThan(100);
  });

  it('toda ação listada por legalActions é aceita', () => {
    fc.assert(
      fc.property(fc.string(), arbChoices, arbConfig, (seed, choices, config) => {
        playout({
          seed,
          choices,
          config,
          maxSteps: 400,
          onStep: (_before, after) => {
            for (const who of actingPlayers(after)) {
              for (const action of legalActions(viewFor(after, who))) {
                const result = applyAction(after, who, action);
                if (!result.ok) throw new Error(`${result.error.code} em ${JSON.stringify(action)}`);
              }
            }
          },
        });
      }),
      { numRuns: 10 },
    );
  });
});
