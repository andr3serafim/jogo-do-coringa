import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action.ts';
import { legalActions } from '../src/legal-actions.ts';
import { viewFor } from '../src/view.ts';
import { checkInvariants } from './invariants.ts';
import { actingPlayers, playout } from './playout.ts';

const arbConfig = fc.record({
  initiativeChoice: fc.boolean(),
  tablePressure: fc.boolean(),
  wildJokers: fc.boolean(),
});
const arbChoices = fc.array(fc.nat(), { minLength: 1, maxLength: 64 });

describe('propriedades do motor (spec §5)', () => {
  it('partidas aleatórias terminam e respeitam conservação, vida e sigilo', () => {
    fc.assert(
      fc.property(fc.string(), arbChoices, arbConfig, fc.integer({ min: 0, max: 9 }), (seed, choices, config, timeoutEvery) => {
        const { state } = playout({ seed, choices, config, timeoutEvery, onStep: checkInvariants });
        expect(state.phase.kind).toBe('GAME_OVER');
      }),
      { numRuns: 60 },
    );
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
