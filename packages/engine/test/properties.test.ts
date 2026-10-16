import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action';
import { totalCards } from '../src/deck';
import { legalActions } from '../src/legal-actions';
import { viewEvents, viewFor } from '../src/view';
import type { GameEvent, GameState } from '../src/types';
import { allCards } from './helpers';
import { actingPlayers, playout } from './playout';

const arbConfig = fc.record({
  initiativeChoice: fc.boolean(),
  tablePressure: fc.boolean(),
  wildJokers: fc.boolean(),
});
const arbChoices = fc.array(fc.nat(), { minLength: 1, maxLength: 64 });

/** Invariantes da spec §5. Usa checagens simples (sem `expect`) porque roda em todo passo. */
function checkInvariants(before: GameState, after: GameState, events: GameEvent[]): void {
  const cards = allCards(after);
  if (cards.length !== totalCards(after.config)) throw new Error(`cartas: ${cards.length}`);
  if (new Set(cards.map((c) => c.id)).size !== cards.length) throw new Error('carta duplicada');
  after.players.forEach((p, i) => {
    if (p.hp > before.players[i].hp) throw new Error('a vida aumentou');
  });
  for (const viewer of after.players) {
    const opponent = after.players.find((p) => p.id !== viewer.id);
    if (!opponent) throw new Error('sem oponente');
    const json = JSON.stringify(viewFor(after, viewer.id));
    if (json.includes('"rng"')) throw new Error('a visão expõe a semente');
    for (const c of [...opponent.hand, ...opponent.pending, ...after.deck]) {
      if (json.includes(`"${c.id}"`)) throw new Error(`vazamento na visão de ${viewer.id}: ${c.id}`);
    }
    for (const e of viewEvents(events, viewer.id)) {
      if (e.type === 'CardsDealt' && e.player !== viewer.id && e.cards) throw new Error('vazamento em CardsDealt');
    }
  }
}

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
