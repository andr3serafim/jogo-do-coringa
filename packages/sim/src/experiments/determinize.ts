import { seedRng, shuffle, type Card, type GameState, type NumCard, type PlayerId, type SpecialCard } from '@coringa/engine';

/**
 * Reamostra a informação oculta para `viewer` (rollouts sem espiar o monte real):
 * a mão e as numéricas pendentes do oponente são resorteadas do conjunto que o viewer não vê
 * (mão + pendentes do oponente + monte), respeitando as quantidades e os tipos; o resto vira o
 * monte, embaralhado. O PRNG da partida também é trocado, para os reembaralhamentos futuros
 * do cemitério diferirem entre rollouts. A visão do viewer não muda.
 */
export function determinize(state: GameState, viewer: PlayerId, seed: string): GameState {
  const s = structuredClone(state);
  const rng = seedRng(seed);
  const opponent = s.players[0].id === viewer ? s.players[1] : s.players[0];
  const hidden: Card[] = shuffle(rng, [...opponent.hand, ...opponent.pending, ...s.deck]);
  const specials = hidden.filter((c): c is SpecialCard => c.kind !== 'NUM');
  const numerics = hidden.filter((c): c is NumCard => c.kind === 'NUM');
  const hand = specials.splice(0, opponent.hand.length);
  const pending = numerics.splice(0, opponent.pending.length);
  opponent.hand = hand;
  opponent.pending = pending;
  s.deck = shuffle(rng, [...specials, ...numerics]);
  s.rng = rng;
  return s;
}
