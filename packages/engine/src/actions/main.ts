import { fail } from '../errors.ts';
import { endTurn, openReaction } from '../flow.ts';
import { assertDistinct, getPlayer, opponentOf, removeById, takeFromHand, toGraveyard } from '../state.ts';
import { reevaluateQuads, rowCards, validResurrections } from '../quads.ts';
import { heal, healFromDefense } from '../combat.ts';
import type { GameEvent, GameState, NumCard, PlayerId, PlayerState, ReflectState, RowName, SpecialCard } from '../types.ts';

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
  endTurn(s, ev, false);
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
  ev.push({ type: 'TrapUsed', player: p.id, card, ...(card.kind === 'WILD' ? { as: 'A' as const } : {}), target, targetOwner: owner.id });
}

/** Sacrifício (spec §1.6): J da mão abate J do oponente; Q abate Q. Só na fase principal. */
export function sacrifice(s: GameState, p: PlayerState, cardId: string, targetId: string, ev: GameEvent[]): void {
  const owner = opponentOf(s, p.id);
  if (owner.absoluteDefense) fail('TARGET_PROTECTED', 'o oponente está sob Defesa Absoluta');
  let target = removeById(owner.attackBuffs, targetId);
  let card: SpecialCard;
  let role: 'J' | 'Q';
  if (target) {
    card = takeFromHand(p, cardId, ['J', 'WILD']);
    role = 'J';
  } else {
    target = removeById(owner.defenseBuffs, targetId);
    if (!target) fail('INVALID_TARGET', 'o Sacrifício só abate J ou Q do oponente');
    card = takeFromHand(p, cardId, ['Q', 'WILD']);
    role = 'Q';
  }
  toGraveyard(s, [card, target]);
  ev.push({ type: 'Sacrificed', player: p.id, card, ...(card.kind === 'WILD' ? { as: role } : {}), target, targetOwner: owner.id });
}

export function takeReflectCards(p: PlayerState, kId: string, jId: string, qId: string): ReflectState {
  assertDistinct([kId, jId, qId]);
  return {
    k: takeFromHand(p, kId, ['K']),
    j: takeFromHand(p, jId, ['J', 'WILD']),
    q: takeFromHand(p, qId, ['Q', 'WILD']),
  };
}

/**
 * Devastação (F3 do sub-projeto 5): K + A + J da mão esvazia a Fileira de Ataque do oponente, K + A + Q a de Defesa. Abre a janela
 * dele, onde só o Reflect responde. Não vale contra Defesa Absoluta nem contra fileira vazia ([I]).
 */
export function devastate(s: GameState, p: PlayerState, kId: string, aId: string, xId: string, row: RowName, ev: GameEvent[]): void {
  if (row !== 'ATK' && row !== 'DEF') fail('INVALID_TARGET', 'fileira inválida');
  const owner = opponentOf(s, p.id);
  if (owner.absoluteDefense) fail('TARGET_PROTECTED', 'o oponente está sob Defesa Absoluta');
  if (rowCards(owner, row).length === 0) fail('INVALID_TARGET', 'a fileira do oponente está vazia');
  assertDistinct([kId, aId, xId]);
  const k = takeFromHand(p, kId, ['K']);
  const a = takeFromHand(p, aId, ['A', 'WILD']);
  const x = takeFromHand(p, xId, row === 'ATK' ? ['J', 'WILD'] : ['Q', 'WILD']);
  ev.push({ type: 'DevastationCast', player: p.id, target: owner.id, row, k, a, x });
  openReaction(s, owner.id, 'DEVASTATION', ev, { player: p.id, row, k, a, x });
}

/** A fileira inteira vai ao cemitério; os buffs ficam e a quadra se desfaz. As cartas destruídas pela Devastação não curam. */
export function devastateRow(s: GameState, victim: PlayerState, row: RowName, reflected: boolean, ev: GameEvent[]): void {
  const cards = rowCards(victim, row).splice(0);
  toGraveyard(s, cards);
  ev.push({ type: 'RowDevastated', player: victim.id, row, cards, reflected });
  reevaluateQuads(s, victim, ev);
}

/**
 * O dano do roubo (E3): o valor seco da carta, sem buffs nem quadra. Um K na Guarda da vítima anula e fica; o dano nunca
 * mata (a vida fica em no mínimo 1) e não entra em `damageThisRound`, porque não conta para a iniciativa. Por isso não usa o
 * `loseHp` do combate.
 */
function stealDamage(thief: PlayerState, victim: PlayerState, card: NumCard, ev: GameEvent[]): void {
  const blocked = victim.guard.length > 0;
  const damage = blocked ? 0 : Math.max(0, Math.min(card.value, victim.hp - 1));
  victim.hp -= damage;
  ev.push({ type: 'StealDamage', player: thief.id, victim: victim.id, value: card.value, damage, blocked });
}

/**
 * Roubo (E3 do sub-projeto 5), só na fase principal: o Ás (ou o Selvagem como A) leva uma numérica de qualquer fileira do oponente
 * para o fim da fileira que o ladrão escolher; com ela cheia, a última dela vai ao cemitério. Sem naipe (autor, 2026-10-31): o
 * oponente leva o valor seco e o ladrão cura o mesmo valor, cheio, mesmo quando um K anula o dano ou o "não mata" o corta ([I]). A
 * Defesa Absoluta do oponente bloqueia o roubo inteiro. Não abre janela de reação ([I]).
 */
export function steal(s: GameState, p: PlayerState, cardId: string, targetId: string, row: RowName, ev: GameEvent[]): void {
  if (row !== 'ATK' && row !== 'DEF') fail('INVALID_TARGET', 'fileira inválida');
  const victim = opponentOf(s, p.id);
  if (victim.absoluteDefense) fail('TARGET_PROTECTED', 'o oponente está sob Defesa Absoluta');
  const fromRow: RowName | null = victim.attackRow.some((c) => c.id === targetId)
    ? 'ATK'
    : victim.defenseRow.some((c) => c.id === targetId)
      ? 'DEF'
      : null;
  if (fromRow === null) fail('INVALID_TARGET', 'o Roubo só leva numéricas das fileiras do oponente');
  const ace = takeFromHand(p, cardId, ['A', 'WILD']);
  const card = removeById(rowCards(victim, fromRow), targetId) as NumCard;
  toGraveyard(s, [ace]);
  ev.push({ type: 'CardStolen', player: p.id, from: victim.id, card, fromRow, toRow: row, ace, ...(ace.kind === 'WILD' ? { as: 'A' as const } : {}) });
  const target = rowCards(p, row);
  if (target.length >= s.config.rowLimit) {
    const displaced = target.splice(target.length - 1, 1);
    toGraveyard(s, displaced);
    ev.push({ type: 'CardsRemovedFromRow', player: p.id, row, cards: displaced });
    // A carta que o ladrão perde na própria Defesa cura, se ele cumprir a cura passiva.
    if (row === 'DEF') healFromDefense(s, p, displaced, ev);
  }
  target.push(card);
  reevaluateQuads(s, victim, ev);
  reevaluateQuads(s, p, ev);
  stealDamage(p, victim, card, ev);
  heal(s, p, card.value, 'STEAL', card, ev);
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
