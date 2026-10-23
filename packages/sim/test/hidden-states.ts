import type { Destination, GameState } from '@coringa/engine';
// Builder de cenários do motor: monta estados reais sem inventar cartas.
import { P2, player, setup } from '@coringa/engine/testing';

/** Estado do Equipar: P1 com 1 especial e 3 pendentes; P2 com 2 especiais e 3 pendentes. */
export const equip = (): GameState =>
  setup({
    phase: { kind: 'EQUIP' },
    roundKind: 'EQUIP',
    round: 2,
    p1: { hand: ['J'], pending: [2, 4, 6] },
    p2: { hand: ['K', 'A'], pending: [3, 5, 7] },
  });

/** Troca cartas do oponente com o monte (mesmas quantidades, ids e tipos diferentes) e inverte a ordem do monte. */
export function swapHidden(base: GameState): GameState {
  const s = structuredClone(base);
  const opponent = player(s, P2);
  const specialAt = s.deck.findIndex((c) => c.kind !== 'NUM' && c.kind !== opponent.hand[0].kind);
  const numberAt = s.deck.findIndex((c) => c.kind === 'NUM' && c.value !== opponent.pending[0].value);
  const swappedHand = opponent.hand[0];
  const swappedPending = opponent.pending[0];
  opponent.hand[0] = s.deck[specialAt] as (typeof opponent.hand)[number];
  opponent.pending[0] = s.deck[numberAt] as (typeof opponent.pending)[number];
  s.deck[specialAt] = swappedHand;
  s.deck[numberAt] = swappedPending;
  s.deck.reverse();
  return s;
}

/** O oponente (P2) já confirmou o Equipar, com estes destinos. */
export const submitted = (base: GameState, destinations: Destination[]): GameState => {
  const s = structuredClone(base);
  player(s, P2).equipSubmitted = true;
  player(s, P2).submittedDestinations = destinations;
  return s;
};
