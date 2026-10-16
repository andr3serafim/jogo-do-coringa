import type { GameState, PlayerId } from './types.ts';

/** Quem pode agir agora. No Equipar, quem ainda não confirmou; nas outras fases, um jogador ou ninguém. */
export function actingPlayers(s: GameState): PlayerId[] {
  const phase = s.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return s.players.filter((p) => !p.equipSubmitted).map((p) => p.id);
    case 'ORDER_CHOICE':
    case 'ATTACK_MAIN':
      return [phase.player];
    case 'REACTION':
      return [phase.responder];
    case 'GAME_OVER':
      return [];
  }
}
