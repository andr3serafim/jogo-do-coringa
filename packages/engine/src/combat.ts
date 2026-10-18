import { previewBetween } from './preview.ts';
import { quadBonus, reevaluateQuads } from './quads.ts';
import { finishGame, getPlayer, isGameOver, opponentOf, toGraveyard } from './state.ts';
import type { GameEvent, GameState, NumCard, PlayerId, PlayerState, SpecialCard } from './types.ts';

const sum = (cards: NumCard[]): number => cards.reduce((total, c) => total + c.value, 0);

/** Lado que ataca: basta a fileira e os buffs (serve para `PlayerState`, `PublicPlayer` e `SelfView`). */
export interface AttackSide {
  attackRow: NumCard[];
  attackBuffs: SpecialCard[];
}

/** Lado que defende: basta a fileira e os buffs. */
export interface DefenseSide {
  defenseRow: NumCard[];
  defenseBuffs: SpecialCard[];
}

export function attackBase(p: AttackSide): number {
  return sum(p.attackRow) + quadBonus(p.attackRow);
}

export function defenseBase(p: DefenseSide): number {
  return sum(p.defenseRow) + quadBonus(p.defenseRow);
}

/** ATK = (soma + bônus) × (1 + nJ + pressão) — spec §1.9. */
export function attackPower(p: AttackSide, pressure: number): number {
  return attackBase(p) * (1 + p.attackBuffs.length + pressure);
}

/** DEF = (soma + bônus) × (1 + nQ). */
export function defensePower(p: DefenseSide): number {
  return defenseBase(p) * (1 + p.defenseBuffs.length);
}

export function attackValue(s: GameState, p: PlayerState): number {
  return attackPower(p, s.pressure);
}

export function defenseValue(p: PlayerState): number {
  return defensePower(p);
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

function breakGuards(s: GameState, p: PlayerState, count: number, ev: GameEvent[]): void {
  if (count <= 0) return;
  const broken = p.guard.splice(0, count);
  toGraveyard(s, broken);
  ev.push({ type: 'GuardBroken', player: p.id, cards: broken });
}

/**
 * Passos 2 a 10 da spec §1.9. A janela de reação (passo 1) já aconteceu.
 * A conta vem de `previewBetween`, a mesma que a interface mostra; aqui só se aplicam os efeitos.
 */
export function resolveAttack(s: GameState, attackerId: PlayerId, ev: GameEvent[]): void {
  const attacker = getPlayer(s, attackerId);
  const defender = opponentOf(s, attackerId);
  const result = previewBetween(attacker, defender, s.pressure, s.config);
  const { absolute } = result;

  if (result.outcome === 'REFLECTED') {
    const reflect = defender.reflect;
    if (!reflect) throw new Error('prévia de Reflect sem Reflect ativo');
    defender.reflect = null;
    breakGuards(s, attacker, result.breaks.attackerGuard, ev);
    if (result.breaks.attackerQueens > 0) {
      const queens = attacker.defenseBuffs.splice(0, result.breaks.attackerQueens);
      toGraveyard(s, queens);
      ev.push({ type: 'BuffRemoved', player: attacker.id, cards: queens });
    }
    toGraveyard(s, [reflect.k, reflect.j, reflect.q]);
    ev.push({ type: 'ReflectTriggered', owner: defender.id, attacker: attacker.id, damage: result.reflected });
    loseHp(s, attacker, result.reflected, defender, ev);
  } else {
    if (absolute) ev.push({ type: 'AbsoluteAttack', player: attacker.id });
    breakGuards(s, defender, result.breaks.defenderGuard, ev);
    ev.push({
      type: 'DamageDealt',
      attacker: attacker.id,
      defender: defender.id,
      attack: result.attack,
      defense: result.defense,
      damage: result.damage,
    });
    loseHp(s, defender, result.damage, attacker, ev);
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
