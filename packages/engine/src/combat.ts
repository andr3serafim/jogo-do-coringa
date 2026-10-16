import { quadBonus, reevaluateQuads } from './quads.ts';
import { finishGame, getPlayer, isGameOver, opponentOf, toGraveyard } from './state.ts';
import type { GameEvent, GameState, NumCard, PlayerId, PlayerState } from './types.ts';

const sum = (cards: NumCard[]): number => cards.reduce((total, c) => total + c.value, 0);

export function attackBase(p: PlayerState): number {
  return sum(p.attackRow) + quadBonus(p.attackRow);
}

export function defenseBase(p: PlayerState): number {
  return sum(p.defenseRow) + quadBonus(p.defenseRow);
}

/** ATK = (soma + bônus) × (1 + nJ + pressão) — spec §1.9. */
export function attackValue(s: GameState, p: PlayerState): number {
  return attackBase(p) * (1 + p.attackBuffs.length + s.pressure);
}

/** DEF = (soma + bônus) × (1 + nQ). */
export function defenseValue(p: PlayerState): number {
  return defenseBase(p) * (1 + p.defenseBuffs.length);
}

export function isAbsoluteAttack(s: GameState, p: PlayerState): boolean {
  return p.attackBuffs.length >= s.config.buffLimit;
}

function loseHp(s: GameState, victim: PlayerState, amount: number, dealer: PlayerState, ev: GameEvent[]): void {
  if (amount <= 0) return;
  victim.hp -= amount;
  dealer.damageThisRound += amount;
  s.hpLostThisRound = true;
  if (victim.hp <= 0) finishGame(s, { kind: 'WIN', winner: dealer.id, reason: 'HP' }, ev);
}

function breakAllGuards(s: GameState, p: PlayerState, ev: GameEvent[]): void {
  if (p.guard.length === 0) return;
  const broken = p.guard.splice(0);
  toGraveyard(s, broken);
  ev.push({ type: 'GuardBroken', player: p.id, cards: broken });
}

/** Passos 2 a 10 da spec §1.9. A janela de reação (passo 1) já aconteceu. */
export function resolveAttack(s: GameState, attackerId: PlayerId, ev: GameEvent[]): void {
  const attacker = getPlayer(s, attackerId);
  const defender = opponentOf(s, attackerId);
  const absolute = isAbsoluteAttack(s, attacker);
  const atk = attackValue(s, attacker);

  if (defender.reflect) {
    const reflect = defender.reflect;
    defender.reflect = null;
    breakAllGuards(s, attacker, ev);
    let damage = 0;
    if (!attacker.absoluteDefense) {
      if (attacker.defenseBuffs.length > 0) {
        const queens = attacker.defenseBuffs.splice(0);
        toGraveyard(s, queens);
        ev.push({ type: 'BuffRemoved', player: attacker.id, cards: queens });
      }
      damage = Math.max(0, atk - Math.floor(defenseBase(attacker) / 2));
    }
    toGraveyard(s, [reflect.k, reflect.j, reflect.q]);
    ev.push({ type: 'ReflectTriggered', owner: defender.id, attacker: attacker.id, damage });
    loseHp(s, attacker, damage, defender, ev);
  } else {
    const def = defenseValue(defender);
    if (absolute) {
      ev.push({ type: 'AbsoluteAttack', player: attacker.id });
      breakAllGuards(s, defender, ev);
    }
    let damage: number;
    if (defender.absoluteDefense) {
      damage = absolute ? Math.max(0, atk - def) : 0;
    } else {
      const net = Math.max(0, atk - def);
      if (net > 0 && defender.guard.length > 0) {
        const absorbed = defender.guard.splice(0, 1);
        toGraveyard(s, absorbed);
        ev.push({ type: 'GuardBroken', player: defender.id, cards: absorbed });
        damage = 0;
      } else {
        damage = net;
      }
    }
    ev.push({ type: 'DamageDealt', attacker: attacker.id, defender: defender.id, attack: atk, defense: def, damage });
    loseHp(s, defender, damage, attacker, ev);
  }
  if (isGameOver(s)) return;

  const removedAtk = attacker.attackRow.splice(0, 1);
  toGraveyard(s, removedAtk);
  ev.push({ type: 'CardsRemovedFromRow', player: attacker.id, row: 'ATK', cards: removedAtk });
  if (!defender.absoluteDefense && defender.defenseRow.length > 0) {
    const removedDef = defender.defenseRow.splice(0, 1);
    toGraveyard(s, removedDef);
    ev.push({ type: 'CardsRemovedFromRow', player: defender.id, row: 'DEF', cards: removedDef });
  }
  if (absolute) {
    const consumed = attacker.attackBuffs.splice(0, 1);
    toGraveyard(s, consumed);
    ev.push({ type: 'BuffRemoved', player: attacker.id, cards: consumed });
  }
  reevaluateQuads(s, attacker, ev);
  reevaluateQuads(s, defender, ev);
}
