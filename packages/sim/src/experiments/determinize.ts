import { seedRng, shuffle, type Card, type GameState, type NumCard, type PlayerId, type SpecialCard } from '@coringa/engine';

/** Ordem canônica por id (comparação simples, sem locale), para o resultado não depender da ordem real. */
const byId = (a: Card, b: Card): number => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Reamostra a informação oculta para `viewer` (rollouts sem espiar o monte real):
 * a mão e as numéricas pendentes do oponente são resorteadas do conjunto que o viewer não vê
 * (mão + pendentes do oponente + monte), respeitando as quantidades e os tipos; o resto vira o
 * monte, embaralhado. O PRNG da partida também é trocado, para os reembaralhamentos futuros
 * do cemitério diferirem entre rollouts.
 *
 * Sem vazamento: o resultado só depende da visão do viewer e da semente. O conjunto oculto é
 * ordenado por id antes de embaralhar (a ordem real da mão, dos pendentes e do monte não pode
 * decidir quem fica com o quê), e o Equipar que o oponente já confirmou é descartado
 * (`equipSubmitted` volta a `false` e `submittedDestinations` a `null`): os destinos ficam
 * escondidos até as duas montagens saírem, e nos rollouts ele decide de novo. A visão do viewer
 * não muda, salvo o oponente deixar de constar como "confirmado".
 */
export function determinize(state: GameState, viewer: PlayerId, seed: string): GameState {
  const s = structuredClone(state);
  const rng = seedRng(seed);
  const opponent = s.players[0].id === viewer ? s.players[1] : s.players[0];
  const hidden: Card[] = shuffle(rng, [...opponent.hand, ...opponent.pending, ...s.deck].sort(byId));
  const specials = hidden.filter((c): c is SpecialCard => c.kind !== 'NUM');
  const numerics = hidden.filter((c): c is NumCard => c.kind === 'NUM');
  const hand = specials.splice(0, opponent.hand.length);
  const pending = numerics.splice(0, opponent.pending.length);
  opponent.hand = hand;
  opponent.pending = pending;
  opponent.equipSubmitted = false;
  opponent.submittedDestinations = null;
  s.deck = shuffle(rng, [...specials, ...numerics]);
  s.rng = rng;
  return s;
}
