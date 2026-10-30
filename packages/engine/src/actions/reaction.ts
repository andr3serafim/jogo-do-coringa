import { resolveAttack } from '../combat.ts';
import { fail } from '../errors.ts';
import { endTurn } from '../flow.ts';
import { finishGame, getPlayer, isGameOver, opponentOf, toGraveyard } from '../state.ts';
import type { GameEvent, GameState, PlayerId, PlayerState, ReactionTrigger } from '../types.ts';
import { protectFromReflect, takeReflectCards, useTrap, type TargetZone } from './main.ts';

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
    if (!isGameOver(s)) endTurn(s, ev, true);
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

/** Anular (spec §1.6): K+J+Q da mão, só na janela aberta pelo lançamento do Reflect. */
export function cancelReflect(s: GameState, playerId: PlayerId, kId: string, jId: string, qId: string, ev: GameEvent[]): void {
  const { responder, actor, trigger } = requireReaction(s, playerId);
  if (trigger !== 'REFLECT_PLAYED') fail('WRONG_PHASE', 'só dá para anular um Reflect logo após ele ser lançado');
  const reflect = actor.reflect;
  if (!reflect) fail('NO_REFLECT', 'o oponente não tem Reflect ativo');
  const mine = takeReflectCards(responder, kId, jId, qId);
  actor.reflect = null;
  toGraveyard(s, [mine.k, mine.j, mine.q, reflect.k, reflect.j, reflect.q]);
  ev.push({ type: 'ReflectCanceled', player: responder.id, owner: actor.id });
  closeReaction(s, ev);
}

export function reactProtect(s: GameState, playerId: PlayerId, jId: string, qId: string, kId: string, ev: GameEvent[]): void {
  const { responder, trigger } = requireReaction(s, playerId);
  if (trigger !== 'REFLECT_PLAYED') fail('WRONG_PHASE', 'não há Reflect sendo lançado');
  protectFromReflect(s, responder, jId, qId, kId, ev);
  closeReaction(s, ev);
}
