import { resolveAttack } from '../combat.ts';
import { fail } from '../errors.ts';
import { endTurn, openReaction } from '../flow.ts';
import { finishGame, getPlayer, isGameOver, opponentOf, toGraveyard } from '../state.ts';
import type { GameEvent, GameState, PlayerId, PlayerState, ReactionTrigger } from '../types.ts';
import { devastateRow, takeReflectCards, useTrap, type TargetZone } from './main.ts';

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
  } else if (phase.trigger === 'DEVASTATION') {
    // Ninguém respondeu à Devastação: a fileira do oponente vai ao cemitério, e quem lançou segue no turno.
    const devastation = phase.devastation;
    if (!devastation) throw new Error('janela da Devastação sem a Devastação');
    devastateRow(s, getPlayer(s, phase.responder), devastation.row, false, ev);
    toGraveyard(s, [devastation.k, devastation.a, devastation.x]);
    s.phase = { kind: 'ATTACK_MAIN', player: actor.id };
  } else if (phase.trigger === 'REFLECT_PLAYED' && phase.devastation) {
    // A Devastação refletida volta para quem a lançou: perde a própria fileira do mesmo tipo, sem quebrar Q nem K. Sob Defesa
    // Absoluta o Reflect é anulado e ninguém perde nada ([I]).
    const { devastation } = phase;
    const caster = getPlayer(s, phase.responder);
    const reflect = actor.reflect;
    if (!reflect) throw new Error('resposta ao Reflect sem Reflect na mesa');
    actor.reflect = null;
    if (caster.absoluteDefense) ev.push({ type: 'DevastationCanceled', player: caster.id, reason: 'ABSOLUTE_DEFENSE' });
    else devastateRow(s, caster, devastation.row, true, ev);
    toGraveyard(s, [devastation.k, devastation.a, devastation.x, reflect.k, reflect.j, reflect.q]);
    s.phase = { kind: 'ATTACK_MAIN', player: caster.id };
  } else if (phase.trigger === 'REFLECT_PLAYED') {
    // Quem foi refletido não respondeu com outro Reflect: o golpe dele volta (o Reflect está na mesa do outro).
    resolveAttack(s, phase.responder, ev);
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
  if (trigger === 'DEVASTATION') fail('WRONG_PHASE', 'contra a Devastação, só o Reflect responde');
  const zones: TargetZone[] = trigger === 'K_PLAYED' ? ['guard'] : ['attackBuffs', 'defenseBuffs', 'guard'];
  useTrap(s, responder, cardId, targetId, zones, ev);
}

/**
 * Reflect (F2 do sub-projeto 5): K + J + Q da mão, só na reação a um ataque ou a uma Devastação. Fica na mesa do dono e abre a
 * resposta de quem foi refletido, que passa (o golpe volta) ou responde com outro Reflect. A Armadilha jogada antes, na janela do
 * ataque, vale.
 */
export function reactReflect(s: GameState, playerId: PlayerId, kId: string, jId: string, qId: string, ev: GameEvent[]): void {
  const { responder, actor, trigger } = requireReaction(s, playerId);
  if (trigger !== 'ATTACK' && trigger !== 'DEVASTATION') fail('WRONG_PHASE', 'o Reflect só responde a um ataque ou a uma Devastação');
  const devastation = s.phase.kind === 'REACTION' ? s.phase.devastation : undefined;
  const reflect = takeReflectCards(responder, kId, jId, qId);
  responder.reflect = reflect;
  ev.push({ type: 'ReflectPlayed', player: responder.id, reflect, against: trigger });
  ev.push({ type: 'ReactionWindowClosed', responder: responder.id, trigger });
  openReaction(s, actor.id, 'REFLECT_PLAYED', ev, devastation);
}

/**
 * Reflect contra Reflect (F2): quem foi refletido responde com K + J + Q da mão. Os dois se anulam, as 6 cartas vão ao cemitério
 * e o golpe não acontece: o atacante passa o turno sem ataque (a Defesa Absoluta do outro continua).
 */
export function cancelReflect(s: GameState, playerId: PlayerId, kId: string, jId: string, qId: string, ev: GameEvent[]): void {
  const { responder, actor, trigger } = requireReaction(s, playerId);
  if (trigger !== 'REFLECT_PLAYED') fail('WRONG_PHASE', 'só dá para responder com Reflect a um Reflect');
  const reflect = actor.reflect;
  if (!reflect) fail('NO_REFLECT', 'o oponente não tem Reflect na mesa');
  const devastation = s.phase.kind === 'REACTION' ? s.phase.devastation : undefined;
  const mine = takeReflectCards(responder, kId, jId, qId);
  actor.reflect = null;
  toGraveyard(s, [mine.k, mine.j, mine.q, reflect.k, reflect.j, reflect.q]);
  ev.push({ type: 'ReflectCanceled', player: responder.id, owner: actor.id });
  ev.push({ type: 'ReactionWindowClosed', responder: responder.id, trigger });
  if (devastation) {
    // Contra a Devastação, os dois Reflects se anulam e ela não acontece; quem a lançou segue no turno ([I]).
    toGraveyard(s, [devastation.k, devastation.a, devastation.x]);
    ev.push({ type: 'DevastationCanceled', player: responder.id, reason: 'REFLECT_CLASH' });
    s.phase = { kind: 'ATTACK_MAIN', player: responder.id };
    return;
  }
  endTurn(s, ev, false);
}
