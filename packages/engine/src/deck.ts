import type { Card, FaceKind, Rank, RulesConfig, Suit } from './types.ts';

const SUITS: readonly Suit[] = ['copas', 'ouros', 'espadas', 'paus'];
const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const FACES: readonly FaceKind[] = ['J', 'Q', 'K', 'A'];

/** As 8 cópias possíveis de uma carta (2 baralhos × 4 naipes), na ordem em que são mantidas. */
function copies(count: number): Array<{ deckNo: number; suit: Suit }> {
  const all = [1, 2].flatMap((deckNo) => SUITS.map((suit) => ({ deckNo, suit })));
  return all.slice(0, count);
}

/** Baralho da spec §1.1: 2 baralhos sem 2 cópias de cada figura, mais 2 Selvagens com `wildJokers`. */
export function buildDeck(config: RulesConfig): Card[] {
  const cards: Card[] = [];
  for (const value of RANKS) {
    for (const { deckNo, suit } of copies(config.deck.numericCopies)) {
      cards.push({ id: `b${deckNo}-${suit}-${value}`, kind: 'NUM', value, suit });
    }
  }
  for (const kind of FACES) {
    for (const { deckNo, suit } of copies(config.deck.faceCopies)) {
      cards.push({ id: `b${deckNo}-${suit}-${kind}`, kind, suit });
    }
  }
  if (config.wildJokers) {
    cards.push({ id: 'selvagem-1', kind: 'WILD' }, { id: 'selvagem-2', kind: 'WILD' });
  }
  return cards;
}

export function totalCards(config: RulesConfig): number {
  return 9 * config.deck.numericCopies + 4 * config.deck.faceCopies + (config.wildJokers ? 2 : 0);
}
