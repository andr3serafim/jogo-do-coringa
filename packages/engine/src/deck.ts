import type { Card, FaceKind, Rank, RulesConfig, Suit } from './types.ts';

const SUITS: readonly Suit[] = ['copas', 'ouros', 'espadas', 'paus'];
const RANKS: readonly Rank[] = [2, 3, 4, 5, 6, 7, 8, 9, 10];
const FACES: readonly FaceKind[] = ['J', 'Q', 'K', 'A'];

/** As 8 cópias possíveis de uma carta (2 baralhos × 4 naipes), na ordem em que são mantidas. */
function copies(count: number): Array<{ deckNo: number; suit: Suit }> {
  const all = [1, 2].flatMap((deckNo) => SUITS.map((suit) => ({ deckNo, suit })));
  return all.slice(0, count);
}

/** Quantas cópias de uma figura entram: os Ás têm a conta deles (os 8 dos dois baralhos, sub-projeto 5); J, Q e K, `faceCopies`. */
const faceCount = (config: RulesConfig, kind: FaceKind): number =>
  kind === 'A' ? (config.deck.aceCopies ?? config.deck.faceCopies) : config.deck.faceCopies;

/** Baralho da spec §1.1: 2 baralhos sem 2 cópias de J, Q e K (os 8 Ás ficam), mais 2 Selvagens com `wildJokers`. */
export function buildDeck(config: RulesConfig): Card[] {
  const cards: Card[] = [];
  for (const value of RANKS) {
    for (const { deckNo, suit } of copies(config.deck.numericCopies)) {
      cards.push({ id: `b${deckNo}-${suit}-${value}`, kind: 'NUM', value, suit });
    }
  }
  for (const kind of FACES) {
    for (const { deckNo, suit } of copies(faceCount(config, kind))) {
      cards.push({ id: `b${deckNo}-${suit}-${kind}`, kind, suit });
    }
  }
  if (config.wildJokers) {
    cards.push({ id: 'selvagem-1', kind: 'WILD' }, { id: 'selvagem-2', kind: 'WILD' });
  }
  return cards;
}

export function totalCards(config: RulesConfig): number {
  const faces = FACES.reduce((sum, kind) => sum + faceCount(config, kind), 0);
  return 9 * config.deck.numericCopies + faces + (config.wildJokers ? 2 : 0);
}
