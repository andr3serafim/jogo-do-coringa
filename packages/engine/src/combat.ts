import { previewBetween } from './preview.ts';
import { quadBonus, reevaluateQuads } from './quads.ts';
import { finishGame, getPlayer, isGameOver, opponentOf, toGraveyard } from './state.ts';
import type { GameEvent, GameState, NumCard, PlayerId, PlayerState, RulesConfig, SpecialCard } from './types.ts';

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

/** ATK = (soma + bônus) × (1 + nJ) — spec §1.9. */
export function attackPower(p: AttackSide): number {
  return attackBase(p) * (1 + p.attackBuffs.length);
}

/** DEF = (soma + bônus) × (1 + nQ). */
export function defensePower(p: DefenseSide): number {
  return defenseBase(p) * (1 + p.defenseBuffs.length);
}

export function attackValue(p: PlayerState): number {
  return attackPower(p);
}

export function defenseValue(p: PlayerState): number {
  return defensePower(p);
}

/** Cura `amount` até a vida inicial (E3): o evento diz quanto entrou de fato. */
export function heal(s: GameState, p: PlayerState, amount: number, source: 'STEAL' | 'DEFENSE', card: NumCard, ev: GameEvent[]): void {
  const healed = Math.max(0, Math.min(amount, s.config.hp - p.hp));
  p.hp += healed;
  ev.push({ type: 'Healed', player: p.id, amount: healed, source, card });
}

/**
 * A cura passiva está ligada (E3): `defenseHealGuard` K ou mais na Guarda. Vale de cada lado (a marca de estado da mesa); a cura
 * usa a mesma regra. Sem o campo (replays de antes da E3), nunca.
 */
export function defenseHealActive(side: { guard: SpecialCard[] }, config: Pick<RulesConfig, 'defenseHealGuard'>): boolean {
  const guard = config.defenseHealGuard;
  return guard !== undefined && side.guard.length >= guard;
}

/**
 * Cura passiva (E3): com `defenseHealGuard` K ou mais na Guarda, cada numérica da própria Fileira de Defesa que vai ao cemitério
 * cura valor × (1 + nº de Q). Conferida quando a carta chega ao cemitério, depois dos K que o mesmo golpe quebrou ([I]). A
 * Devastação não chama: as cartas destruídas por ela não curam.
 */
export function healFromDefense(s: GameState, p: PlayerState, cards: NumCard[], ev: GameEvent[]): void {
  if (!defenseHealActive(p, s.config)) return;
  for (const card of cards) heal(s, p, card.value * (1 + p.defenseBuffs.length), 'DEFENSE', card, ev);
}

function loseHp(s: GameState, victim: PlayerState, amount: number, dealer: PlayerState, ev: GameEvent[]): void {
  if (amount <= 0) return;
  victim.hp -= amount;
  dealer.damageThisRound += amount;
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
  const result = previewBetween(attacker, defender, s.config);
  const { absolute } = result;
  // O Ataque Absoluto é anunciado antes de tudo, também contra um Reflect (que o intercepta: os K do dono ficam). O J que ele
  // gasta sai no fim, depois da carta da frente do Ataque.
  if (absolute) ev.push({ type: 'AbsoluteAttack', player: attacker.id });

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
    healFromDefense(s, defender, removedDef, ev);
  }
  if (absolute) {
    const consumed = attacker.attackBuffs.splice(0, 1);
    toGraveyard(s, consumed);
    ev.push({ type: 'BuffRemoved', player: attacker.id, cards: consumed });
  }
  reevaluateQuads(s, attacker, ev);
  reevaluateQuads(s, defender, ev);
}
