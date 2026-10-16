import { fail } from '../errors';
import { endTurn, openReaction } from '../flow';
import { getPlayer, opponentOf, takeFromHand } from '../state';
import type { GameEvent, GameState, PlayerId, PlayerState } from '../types';

export function requireMain(s: GameState, playerId: PlayerId): PlayerState {
  const phase = s.phase;
  if (phase.kind !== 'ATTACK_MAIN') fail('WRONG_PHASE', 'não é a fase principal de um turno de ataque');
  if (phase.player !== playerId) fail('NOT_YOUR_TURN', 'não é o seu turno');
  return getPlayer(s, playerId);
}

export function playJ(s: GameState, p: PlayerState, cardId: string, ev: GameEvent[]): void {
  if (p.attackBuffs.length >= s.config.buffLimit) fail('BUFF_LIMIT', 'limite de J atingido');
  const card = takeFromHand(p, cardId, ['J', 'WILD']);
  p.attackBuffs.push(card);
  ev.push({ type: 'BuffPlayed', player: p.id, card, as: 'J' });
}

export function playQ(s: GameState, p: PlayerState, cardId: string, ev: GameEvent[]): void {
  if (p.defenseBuffs.length >= s.config.buffLimit) fail('BUFF_LIMIT', 'limite de Q atingido');
  const card = takeFromHand(p, cardId, ['Q', 'WILD']);
  p.defenseBuffs.push(card);
  ev.push({ type: 'BuffPlayed', player: p.id, card, as: 'Q' });
  if (p.defenseBuffs.length >= s.config.buffLimit && !p.absoluteDefense) {
    p.absoluteDefense = true;
    ev.push({ type: 'AbsoluteDefenseStarted', player: p.id });
  }
}

export function declareAttack(s: GameState, p: PlayerState, ev: GameEvent[]): void {
  if (p.attackRow.length === 0) fail('ATTACK_ROW_EMPTY', 'sua fileira de Ataque está vazia');
  ev.push({ type: 'AttackDeclared', player: p.id });
  openReaction(s, opponentOf(s, p.id).id, 'ATTACK', ev);
}

export function endTurnAction(s: GameState, p: PlayerState, ev: GameEvent[]): void {
  if (p.attackRow.length > 0) fail('ATTACK_ROW_NOT_EMPTY', 'com cartas no Ataque, o turno termina declarando o ataque');
  endTurn(s, ev);
}
