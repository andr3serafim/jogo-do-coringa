import { resolveAttack } from '../combat';
import { fail } from '../errors';
import { endTurn } from '../flow';
import { finishGame, getPlayer, isGameOver, opponentOf } from '../state';
import type { GameEvent, GameState, PlayerId, PlayerState, ReactionTrigger } from '../types';
import { useTrap, type TargetZone } from './main';

export function requireReaction(
  s: GameState,
  playerId: PlayerId,
): { responder: PlayerState; actor: PlayerState; trigger: ReactionTrigger } {
  const phase = s.phase;
  if (phase.kind !== 'REACTION') fail('WRONG_PHASE', 'não há janela de reação aberta');
  if (phase.responder !== playerId) fail('NOT_YOUR_TURN', 'a janela de reação é do oponente');
  return { responder: getPlayer(s, playerId), actor: opponentOf(s, playerId), trigger: phase.trigger };
}

export function pass(s: GameState, playerId: PlayerId, ev: GameEvent[]): void {
  requireReaction(s, playerId);
  closeReaction(s, ev);
}

/** Fecha a janela e segue conforme o gatilho (spec §1.7, §1.8 Exódia, §1.9). */
export function closeReaction(s: GameState, ev: GameEvent[]): void {
  const phase = s.phase;
  if (phase.kind !== 'REACTION') throw new Error('closeReaction chamado fora de REACTION');
  const actor = opponentOf(s, phase.responder);
  ev.push({ type: 'ReactionWindowClosed', responder: phase.responder, trigger: phase.trigger });
  if (phase.trigger === 'ATTACK') {
    resolveAttack(s, actor.id, ev);
    if (!isGameOver(s)) endTurn(s, ev);
  } else if (phase.trigger === 'K_PLAYED' && actor.guard.length >= s.config.exodiaGuard) {
    ev.push({ type: 'Exodia', player: actor.id });
    finishGame(s, { kind: 'WIN', winner: actor.id, reason: 'EXODIA' }, ev);
  } else {
    s.phase = { kind: 'ATTACK_MAIN', player: actor.id };
  }
}

/** Ás como reação: contra ataque mira J, Q ou K; contra jogada de K, só K (spec §1.7). */
export function reactTrap(s: GameState, playerId: PlayerId, cardId: string, targetId: string, ev: GameEvent[]): void {
  const { responder, trigger } = requireReaction(s, playerId);
  if (trigger === 'REFLECT_PLAYED') fail('WRONG_PHASE', 'o Ás não responde a um Reflect');
  const zones: TargetZone[] = trigger === 'K_PLAYED' ? ['guard'] : ['attackBuffs', 'defenseBuffs', 'guard'];
  useTrap(s, responder, cardId, targetId, zones, ev);
}
