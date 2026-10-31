import { validResurrections } from './quads.ts';
import { getPlayer, opponentOf } from './state.ts';
import type { GameEvent, GameState, PlayerId, PlayerState, PlayerView, PublicPlayer } from './types.ts';

function publicPart(s: GameState, p: PlayerState): PublicPlayer {
  return {
    id: p.id,
    hp: p.hp,
    attackRow: p.attackRow,
    defenseRow: p.defenseRow,
    attackBuffs: p.attackBuffs,
    defenseBuffs: p.defenseBuffs,
    guard: p.guard,
    reflect: p.reflect,
    absoluteDefense: p.absoluteDefense,
    quads: p.quads,
    resurrectionCount: validResurrections(s, p).length,
    handCount: p.hand.length,
    pendingCount: p.pending.length,
    equipSubmitted: p.equipSubmitted,
    damageThisRound: p.damageThisRound,
  };
}

/** Visão de um jogador (spec §2.6): nunca inclui semente, monte, mão ou pendentes do oponente. */
export function viewFor(s: GameState, playerId: PlayerId): PlayerView {
  const me = getPlayer(s, playerId);
  const view: PlayerView = {
    me: me.id,
    config: s.config,
    round: s.round,
    roundKind: s.roundKind,
    initiative: s.initiative,
    lastInitiative: s.lastInitiative,
    turnOrder: s.turnOrder,
    turnIndex: s.turnIndex,
    phase: s.phase,
    deckCount: s.deck.length,
    graveyard: s.graveyard,
    self: { ...publicPart(s, me), hand: me.hand, pending: me.pending, resurrections: validResurrections(s, me) },
    opponent: publicPart(s, opponentOf(s, playerId)),
  };
  return structuredClone(view);
}

/** O oponente vê "comprou N cartas", nunca quais. */
export function viewEvents(events: GameEvent[], playerId: PlayerId): GameEvent[] {
  return events.map(
    (e): GameEvent =>
      e.type === 'CardsDealt' && e.player !== playerId ? { type: 'CardsDealt', player: e.player, count: e.count } : e,
  );
}
