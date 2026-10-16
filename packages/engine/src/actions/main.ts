import { fail } from '../errors';
import { endTurn, openReaction } from '../flow';
import { assertDistinct, getPlayer, opponentOf, removeById, takeFromHand, toGraveyard } from '../state';
import { reevaluateQuads, rowCards, validResurrections } from '../quads';
import type { GameEvent, GameState, PlayerId, PlayerState, ReflectState, RowName, SpecialCard } from '../types';

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

export type TargetZone = 'attackBuffs' | 'defenseBuffs' | 'guard';

export function playK(s: GameState, p: PlayerState, cardIds: string[], ev: GameEvent[]): void {
  if (!Array.isArray(cardIds) || cardIds.length === 0) fail('INVALID_CARD', 'escolha pelo menos um K');
  assertDistinct(cardIds);
  const cards = cardIds.map((id) => takeFromHand(p, id, ['K']));
  p.guard.push(...cards);
  ev.push({ type: 'GuardPlayed', player: p.id, cards });
  openReaction(s, opponentOf(s, p.id).id, 'K_PLAYED', ev);
}

function takeTarget(owner: PlayerState, targetId: string, zones: TargetZone[]): SpecialCard {
  for (const zone of zones) {
    const found = removeById(owner[zone], targetId);
    if (found) return found;
  }
  fail('INVALID_TARGET', 'alvo inválido para esta jogada');
}

/** Armadilha (spec §1.6): destrói 1 J, Q ou K do oponente. Nunca mira cartas de Reflect. */
export function useTrap(
  s: GameState,
  p: PlayerState,
  cardId: string,
  targetId: string,
  zones: TargetZone[],
  ev: GameEvent[],
): void {
  const owner = opponentOf(s, p.id);
  if (owner.absoluteDefense) fail('TARGET_PROTECTED', 'o oponente está sob Defesa Absoluta');
  const card = takeFromHand(p, cardId, ['A', 'WILD']);
  const target = takeTarget(owner, targetId, zones);
  toGraveyard(s, [card, target]);
  ev.push({ type: 'TrapUsed', player: p.id, card, target, targetOwner: owner.id });
}

/** Sacrifício (spec §1.6): J da mão abate J do oponente; Q abate Q. Só na fase principal. */
export function sacrifice(s: GameState, p: PlayerState, cardId: string, targetId: string, ev: GameEvent[]): void {
  const owner = opponentOf(s, p.id);
  if (owner.absoluteDefense) fail('TARGET_PROTECTED', 'o oponente está sob Defesa Absoluta');
  let target = removeById(owner.attackBuffs, targetId);
  let card: SpecialCard;
  if (target) {
    card = takeFromHand(p, cardId, ['J', 'WILD']);
  } else {
    target = removeById(owner.defenseBuffs, targetId);
    if (!target) fail('INVALID_TARGET', 'o Sacrifício só abate J ou Q do oponente');
    card = takeFromHand(p, cardId, ['Q', 'WILD']);
  }
  toGraveyard(s, [card, target]);
  ev.push({ type: 'Sacrificed', player: p.id, card, target, targetOwner: owner.id });
}

export function takeReflectCards(p: PlayerState, kId: string, jId: string, qId: string): ReflectState {
  assertDistinct([kId, jId, qId]);
  return {
    k: takeFromHand(p, kId, ['K']),
    j: takeFromHand(p, jId, ['J', 'WILD']),
    q: takeFromHand(p, qId, ['Q', 'WILD']),
  };
}

/** Reflect (spec §1.6): K+J+Q da mão; ativo até o fim do próximo turno de ataque do oponente. */
export function castReflect(s: GameState, p: PlayerState, kId: string, jId: string, qId: string, ev: GameEvent[]): void {
  if (p.reflect) fail('REFLECT_ALREADY_ACTIVE', 'você já tem um Reflect ativo');
  const reflect = takeReflectCards(p, kId, jId, qId);
  p.reflect = reflect;
  ev.push({ type: 'ReflectPlayed', player: p.id, reflect });
  openReaction(s, opponentOf(s, p.id).id, 'REFLECT_PLAYED', ev);
}

/** Proteção por sacrifício: 1 J, 1 Q e 1 K equipados anulam o Reflect do oponente. */
export function protectFromReflect(
  s: GameState,
  p: PlayerState,
  jId: string,
  qId: string,
  kId: string,
  ev: GameEvent[],
): void {
  const owner = opponentOf(s, p.id);
  const reflect = owner.reflect;
  if (!reflect) fail('NO_REFLECT', 'o oponente não tem Reflect ativo');
  const j = removeById(p.attackBuffs, jId);
  const q = removeById(p.defenseBuffs, qId);
  const k = removeById(p.guard, kId);
  if (!j || !q || !k) fail('INVALID_CARD', 'a proteção exige 1 J, 1 Q e 1 K equipados');
  owner.reflect = null;
  toGraveyard(s, [j, q, k, reflect.k, reflect.j, reflect.q]);
  ev.push({ type: 'ReflectProtected', player: p.id, owner: owner.id });
}

/** Ressurreição (spec §1.8): 1 numérica do cemitério para o fim de uma fileira com espaço. */
export function resurrect(s: GameState, p: PlayerState, cardId: string, row: RowName, ev: GameEvent[]): void {
  const tokens = validResurrections(s, p);
  if (tokens.length === 0) fail('NO_RESURRECTION', 'você não tem Ressurreição disponível');
  if (row !== 'ATK' && row !== 'DEF') fail('INVALID_TARGET', 'fileira inválida');
  const target = rowCards(p, row);
  if (target.length >= s.config.rowLimit) fail('ROW_FULL', 'a fileira escolhida está cheia');
  const index = s.graveyard.findIndex((c) => c.id === cardId);
  if (index < 0) fail('CARD_NOT_IN_GRAVEYARD', `a carta ${cardId} não está no cemitério`);
  const card = s.graveyard[index];
  if (card.kind !== 'NUM') fail('INVALID_CARD', 'só cartas numéricas podem ser revividas');
  s.graveyard.splice(index, 1);
  const used = tokens[0];
  p.resurrections = p.resurrections.filter((r) => r !== used);
  target.push(card);
  ev.push({ type: 'Resurrected', player: p.id, card, row });
  reevaluateQuads(s, p, ev);
}
