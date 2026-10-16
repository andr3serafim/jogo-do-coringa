import { totalCards } from '../src/deck.ts';
import { viewEvents, viewFor } from '../src/view.ts';
import type { GameEvent, GameState } from '../src/types.ts';
import { allCards } from './helpers.ts';

/** Invariantes da spec §5. Usa checagens simples (sem `expect`) porque roda em todo passo. */
export function checkInvariants(before: GameState, after: GameState, events: GameEvent[]): void {
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
