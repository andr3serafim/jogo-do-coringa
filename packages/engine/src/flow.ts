import { pruneResurrections } from './quads.ts';
import { draw, finishGame, getPlayer, opponentOf, toGraveyard } from './state.ts';
import type { Card, GameEvent, GameResult, GameState, PlayerId, PlayerState, ReactionTrigger } from './types.ts';

/** Ciclo da spec §1.3: Equipar, Equipar, Ataque, Equipar, Ataque, … */
export function startRound(s: GameState, ev: GameEvent[]): void {
  const kind = s.round <= 1 ? 'EQUIP' : s.roundKind === 'EQUIP' ? 'ATTACK' : 'EQUIP';
  s.round += 1;
  s.roundKind = kind;
  ev.push({ type: 'RoundStarted', round: s.round, kind });
  for (const p of s.players) pruneResurrections(s, p);
  if (kind === 'EQUIP') startEquipRound(s, ev);
  else startAttackRound(s, ev);
}

/** Distribui `cardsPerEquip` cartas, uma a uma, alternando a partir de quem tem a iniciativa (spec §1.4). */
function startEquipRound(s: GameState, ev: GameEvent[]): void {
  const order: PlayerState[] = [getPlayer(s, s.initiative), opponentOf(s, s.initiative)];
  const dealt: Card[][] = [[], []];
  for (const p of s.players) {
    p.equipSubmitted = false;
    p.submittedDestinations = null;
  }
  for (let i = 0; i < s.config.cardsPerEquip; i += 1) {
    for (let idx = 0; idx < order.length; idx += 1) dealt[idx].push(draw(s, ev));
  }
  order.forEach((p, idx) => {
    for (const card of dealt[idx]) {
      if (card.kind === 'NUM') p.pending.push(card);
      else p.hand.push(card);
    }
    ev.push({ type: 'CardsDealt', player: p.id, count: dealt[idx].length, cards: dealt[idx] });
  });
  s.phase = { kind: 'EQUIP' };
}

function startAttackRound(s: GameState, ev: GameEvent[]): void {
  const pressure = s.config.tablePressure ? s.noDamageStreak : 0;
  if (pressure !== s.pressure) ev.push({ type: 'PressureChanged', pressure });
  s.pressure = pressure;
  s.hpLostThisRound = false;
  for (const p of s.players) p.damageThisRound = 0;
  if (s.config.initiativeChoice) {
    s.phase = { kind: 'ORDER_CHOICE', player: s.initiative };
  } else {
    setTurnOrder(s, true);
    startTurn(s, 0, ev);
  }
}

export function setTurnOrder(s: GameState, initiativeFirst: boolean): void {
  const other = opponentOf(s, s.initiative).id;
  s.turnOrder = initiativeFirst ? [s.initiative, other] : [other, s.initiative];
}

export function startTurn(s: GameState, index: 0 | 1, ev: GameEvent[]): void {
  s.turnIndex = index;
  const current = s.turnOrder[index];
  s.phase = { kind: 'ATTACK_MAIN', player: current };
  ev.push({ type: 'TurnStarted', player: current });
}

export function openReaction(s: GameState, responder: PlayerId, trigger: ReactionTrigger, ev: GameEvent[]): void {
  s.phase = { kind: 'REACTION', responder, trigger };
  ev.push({ type: 'ReactionWindowOpened', responder, trigger });
}

/** Fim de um turno de ataque: expira os efeitos do OUTRO jogador (spec §1.5 item 4) e avança. */
export function endTurn(s: GameState, ev: GameEvent[]): void {
  const current = s.turnOrder[s.turnIndex];
  expireEffects(s, opponentOf(s, current), ev);
  if (s.turnIndex === 0) startTurn(s, 1, ev);
  else endAttackRound(s, ev);
}

function expireEffects(s: GameState, owner: PlayerState, ev: GameEvent[]): void {
  if (owner.reflect) {
    toGraveyard(s, [owner.reflect.k, owner.reflect.j, owner.reflect.q]);
    owner.reflect = null;
    ev.push({ type: 'ReflectExpired', owner: owner.id });
  }
  if (owner.absoluteDefense) {
    owner.absoluteDefense = false;
    // Um Q sacrificado na proteção contra Reflect já conta como o Q consumido (spec §1.8): sobram 3.
    const consumed = owner.defenseBuffs.length >= s.config.buffLimit ? owner.defenseBuffs.splice(0, 1) : [];
    toGraveyard(s, consumed);
    ev.push({ type: 'AbsoluteDefenseEnded', player: owner.id });
    if (consumed.length > 0) ev.push({ type: 'BuffRemoved', player: owner.id, cards: consumed });
  }
}

/** Iniciativa (spec §1.10), sequência sem dano e anti-travamento (spec §1.11). */
function endAttackRound(s: GameState, ev: GameEvent[]): void {
  const [a, b] = s.players;
  const leader = a.damageThisRound > b.damageThisRound ? a : b.damageThisRound > a.damageThisRound ? b : null;
  if (leader && leader.id !== s.initiative) {
    s.initiative = leader.id;
    ev.push({ type: 'InitiativeChanged', player: leader.id });
  }
  s.noDamageStreak = s.hpLostThisRound ? 0 : s.noDamageStreak + 1;
  if (s.noDamageStreak >= s.config.antiStallRounds) {
    const result: GameResult =
      a.hp === b.hp
        ? { kind: 'DRAW', reason: 'ANTI_STALL' }
        : { kind: 'WIN', winner: a.hp > b.hp ? a.id : b.id, reason: 'ANTI_STALL' };
    finishGame(s, result, ev);
    return;
  }
  startRound(s, ev);
}
