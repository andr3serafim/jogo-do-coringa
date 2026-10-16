import { fail } from './errors.ts';
import { shuffle } from './rng.ts';
import type {
  Card,
  GameEvent,
  GameResult,
  GameState,
  PlayerId,
  PlayerState,
  SpecialCard,
  SpecialKind,
} from './types.ts';

export function getPlayer(s: GameState, id: PlayerId): PlayerState {
  const found = s.players.find((p) => p.id === id);
  if (!found) fail('UNKNOWN_PLAYER', `jogador desconhecido: ${id}`);
  return found;
}

export function opponentOf(s: GameState, id: PlayerId): PlayerState {
  return s.players[0].id === id ? s.players[1] : s.players[0];
}

export function removeById<T extends { id: string }>(cards: T[], id: string): T | undefined {
  const index = cards.findIndex((c) => c.id === id);
  return index < 0 ? undefined : cards.splice(index, 1)[0];
}

/** Tira uma carta da mão conferindo o tipo. Só usar dentro de `applyAction` (rascunho clonado). */
export function takeFromHand(p: PlayerState, cardId: string, kinds: readonly SpecialKind[]): SpecialCard {
  const card = removeById(p.hand, cardId);
  if (!card) fail('CARD_NOT_IN_HAND', `a carta ${cardId} não está na sua mão`);
  if (!kinds.includes(card.kind)) fail('INVALID_CARD', `a carta ${cardId} não serve para esta jogada`);
  return card;
}

export function assertDistinct(ids: string[]): void {
  if (new Set(ids).size !== ids.length) fail('DUPLICATE_CARDS', 'a mesma carta foi indicada mais de uma vez');
}

export function toGraveyard(s: GameState, cards: Card[]): void {
  s.graveyard.push(...cards);
}

/** Compra do topo; com o monte vazio, o cemitério inteiro é embaralhado e vira o novo monte (spec §1.4). */
export function draw(s: GameState, ev: GameEvent[]): Card {
  if (s.deck.length === 0) {
    if (s.graveyard.length === 0) throw new Error('invariante violada: monte e cemitério vazios');
    s.deck = shuffle(s.rng, s.graveyard);
    s.graveyard = [];
    ev.push({ type: 'DeckReshuffled', count: s.deck.length });
  }
  return s.deck.shift() as Card;
}

export function finishGame(s: GameState, result: GameResult, ev: GameEvent[]): void {
  s.phase = { kind: 'GAME_OVER', result };
  ev.push({ type: 'GameOver', result });
}

/** Use esta função depois de chamadas que mudam `s.phase`: o TS não desfaz o estreitamento de `s.phase.kind`. */
export function isGameOver(s: GameState): boolean {
  return s.phase.kind === 'GAME_OVER';
}
