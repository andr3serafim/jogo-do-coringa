import { attackPower, defenseBase, defensePower, type AttackSide, type DefenseSide } from './combat.ts';
import type { PlayerView, RulesConfig } from './types.ts';

export type AttackOutcome = 'NO_ATTACK' | 'DAMAGE' | 'GUARD_ABSORBS' | 'ABSOLUTE_DEFENSE' | 'REFLECTED';

/** O que a conta de combate precisa de cada lado: serve para `PlayerState`, `PublicPlayer` e `SelfView`. */
export interface CombatSide extends AttackSide, DefenseSide {
  guard: readonly unknown[];
  reflect: unknown | null;
  absoluteDefense: boolean;
}

export interface AttackPreview {
  outcome: AttackOutcome;
  /** ATK do atacante (com o multiplicador). */
  attack: number;
  /** DEF usada na conta; no Reflect, ⌊DEF_base do atacante / 2⌋. */
  defense: number;
  /** max(0, attack − defense). */
  net: number;
  /** Dano na vida do defensor. */
  damage: number;
  /** Dano na vida do atacante (Reflect). */
  reflected: number;
  /** Ataque Absoluto (nJ ≥ buffLimit). */
  absolute: boolean;
  /** Quantas cartas quebram em cada pilha. */
  breaks: { defenderGuard: number; attackerGuard: number; attackerQueens: number };
}

/**
 * Ataque Absoluto armado (spec 1 §1.6): `buffLimit` J, ou Selvagens no papel de J, nos buffs de ataque. Vale de cada lado e com
 * o Ataque vazio (a marca de estado da mesa); a prévia e a resolução usam a mesma regra.
 */
export function absoluteAttackArmed(side: Pick<CombatSide, 'attackBuffs'>, config: Pick<RulesConfig, 'buffLimit'>): boolean {
  return side.attackBuffs.length >= config.buffLimit;
}

/**
 * A conta de um ataque, sem tocar no estado — spec 1 §1.6, §1.8 e §1.9.
 * `resolveAttack` aplica os efeitos a partir deste resultado: é a mesma conta.
 */
export function previewBetween(
  attacker: CombatSide,
  defender: CombatSide,
  config: Pick<RulesConfig, 'buffLimit'>,
): AttackPreview {
  const breaks = { defenderGuard: 0, attackerGuard: 0, attackerQueens: 0 };
  if (attacker.attackRow.length === 0) {
    return { outcome: 'NO_ATTACK', attack: 0, defense: 0, net: 0, damage: 0, reflected: 0, absolute: false, breaks };
  }
  const absolute = absoluteAttackArmed(attacker, config);
  const attack = attackPower(attacker);

  if (defender.reflect) {
    const defense = Math.floor(defenseBase(attacker) / 2);
    const net = Math.max(0, attack - defense);
    // Contra um atacante sob Defesa Absoluta o Reflect é anulado: segura o golpe (o dono leva 0), mas não devolve dano nem quebra
    // Q e K (autor, 2026-10-30).
    if (attacker.absoluteDefense) return { outcome: 'REFLECTED', attack, defense, net, damage: 0, reflected: 0, absolute, breaks };
    breaks.attackerGuard = attacker.guard.length;
    breaks.attackerQueens = attacker.defenseBuffs.length;
    return { outcome: 'REFLECTED', attack, defense, net, damage: 0, reflected: net, absolute, breaks };
  }

  const defense = defensePower(defender);
  const net = Math.max(0, attack - defense);
  if (absolute) breaks.defenderGuard = defender.guard.length;
  if (defender.absoluteDefense) {
    if (!absolute) return { outcome: 'ABSOLUTE_DEFENSE', attack, defense, net, damage: 0, reflected: 0, absolute, breaks };
    return { outcome: 'DAMAGE', attack, defense, net, damage: net, reflected: 0, absolute, breaks };
  }
  if (net > 0 && defender.guard.length > 0 && !absolute) {
    breaks.defenderGuard = 1;
    return { outcome: 'GUARD_ABSORBS', attack, defense, net, damage: 0, reflected: 0, absolute, breaks };
  }
  return { outcome: 'DAMAGE', attack, defense, net, damage: net, reflected: 0, absolute, breaks };
}

/** Prévia do ataque de `attacker` ('self' = você, 'opponent' = o oponente) a partir da visão pública. */
export function previewAttack(view: PlayerView, attacker: 'self' | 'opponent'): AttackPreview {
  return attacker === 'self'
    ? previewBetween(view.self, view.opponent, view.config)
    : previewBetween(view.opponent, view.self, view.config);
}

/** O efeito de um Roubo na vida (E3, sem naipe desde 2026-10-31): o valor seco, o dano que sai de fato e a cura. */
export interface StealOutcome {
  value: number;
  /** 0 com um K na Guarda da vítima (`blocked`); nunca mata: a vida dela fica em no mínimo 1. */
  damage: number;
  /** A cura de quem rouba, cheia mesmo quando o dano sai menor, até a vida inicial. */
  heal: number;
  blocked: boolean;
}

/** A conta do Roubo, a mesma do motor e da prévia da mesa. */
export function stealOutcome(
  value: number,
  victim: { hp: number; guard: readonly unknown[] },
  thief: { hp: number },
  config: Pick<RulesConfig, 'hp'>,
): StealOutcome {
  const blocked = victim.guard.length > 0;
  return {
    value,
    damage: blocked ? 0 : Math.max(0, Math.min(value, victim.hp - 1)),
    heal: Math.max(0, Math.min(value, config.hp - thief.hp)),
    blocked,
  };
}

/** A prévia de roubar a carta `targetId` das fileiras do oponente; `null` se ela não está lá. */
export function stealPreview(view: PlayerView, targetId: string): StealOutcome | null {
  const card = [...view.opponent.attackRow, ...view.opponent.defenseRow].find((c) => c.id === targetId);
  return card ? stealOutcome(card.value, view.opponent, view.self, view.config) : null;
}
