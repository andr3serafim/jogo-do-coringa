import {
  attackBase,
  attackPower,
  defenseBase,
  defensePower,
  type Action,
  type Destination,
  type NumCard,
  type PlayerView,
  type PublicPlayer,
  type SpecialCard,
} from '@coringa/engine';

/** ATK − DEF sem K, Reflect nem Absolutos (o "líquido" da spec §1.9, passo 6). */
export function net(attacker: PublicPlayer, defender: PublicPlayer): number {
  return Math.max(0, attackPower(attacker) - defensePower(defender));
}

/** Vida que o defensor perderia se o atacante atacasse agora (spec §1.9, passos 3 a 6). */
export function hpDamage(attacker: PublicPlayer, defender: PublicPlayer, buffLimit: number): number {
  if (attacker.attackRow.length === 0 || defender.reflect) return 0;
  const absolute = attacker.attackBuffs.length >= buffLimit;
  if (defender.absoluteDefense && !absolute) return 0;
  if (!absolute && defender.guard.length > 0) return 0;
  return net(attacker, defender);
}

/** Dano que o atacante levaria batendo num Reflect (spec §1.6). */
export function reflectedDamage(attacker: PublicPlayer): number {
  if (attacker.attackRow.length === 0 || attacker.absoluteDefense) return 0;
  return Math.max(0, attackPower(attacker) - Math.floor(defenseBase(attacker) / 2));
}

/** Avaliação de mesa: o quanto eu passo da defesa dele menos o quanto ele passa da minha. */
export function boardScore(self: PublicPlayer, opponent: PublicPlayer): number {
  return net(self, opponent) - net(opponent, self);
}

/** Campo depois de aplicar os destinos do Equipar às numéricas `pending`, na ordem de compra. */
export function placeAll<T extends PublicPlayer>(p: T, pending: NumCard[], destinations: Destination[]): T {
  const attackRow = [...p.attackRow];
  const defenseRow = [...p.defenseRow];
  pending.forEach((card, i) => {
    const d = destinations[i];
    if (d === 'ATK') attackRow.push(card);
    else if (d === 'DEF') defenseRow.push(card);
    else if (d === 'REPLACE_LAST_ATK') attackRow[attackRow.length - 1] = card;
    else if (d === 'REPLACE_LAST_DEF') defenseRow[defenseRow.length - 1] = card;
  });
  return { ...p, attackRow, defenseRow };
}

/**
 * O que um Roubo vale para quem rouba: a mudança na avaliação de mesa (a carta sai da fileira dele e entra no fim da minha, que
 * perde a última se estiver cheia) mais o efeito do naipe (♣ ♠: o dano, que um K dele anula e que nunca mata; ♥ ♦: a cura).
 */
export function stealValue(view: PlayerView, action: Extract<Action, { type: 'STEAL' }>): number {
  const { self, opponent, config } = view;
  const card = [...opponent.attackRow, ...opponent.defenseRow].find((c) => c.id === action.targetId);
  if (!card) return -Infinity;
  const victim = {
    ...opponent,
    attackRow: opponent.attackRow.filter((c) => c.id !== card.id),
    defenseRow: opponent.defenseRow.filter((c) => c.id !== card.id),
  };
  const mine = action.row === 'ATK' ? self.attackRow : self.defenseRow;
  const row = [...(mine.length >= config.rowLimit ? mine.slice(0, -1) : mine), card];
  const thief = action.row === 'ATK' ? { ...self, attackRow: row } : { ...self, defenseRow: row };
  const black = card.suit === 'espadas' || card.suit === 'paus';
  const effect = black ? (opponent.guard.length > 0 ? 0 : Math.max(0, Math.min(card.value, opponent.hp - 1))) : Math.min(card.value, config.hp - self.hp);
  return boardScore(thief, victim) - boardScore(self, opponent) + effect;
}

/** Com a fileira `row` vazia (efeito de uma Devastação). */
export function emptied<T extends PublicPlayer>(p: T, row: 'ATK' | 'DEF'): T {
  return row === 'ATK' ? { ...p, attackRow: [] } : { ...p, defenseRow: [] };
}

/** Sem o card `id` nos buffs e na Guarda (efeito de uma Armadilha ou Sacrifício). */
export function without<T extends PublicPlayer>(p: T, id: string): T {
  const keep = (cards: SpecialCard[]) => cards.filter((c) => c.id !== id);
  return { ...p, attackBuffs: keep(p.attackBuffs), defenseBuffs: keep(p.defenseBuffs), guard: keep(p.guard) };
}

export const count = (hand: SpecialCard[], kind: SpecialCard['kind']): number => hand.filter((c) => c.kind === kind).length;

/** A mão tem um Reflect (K + J + Q, com Selvagens no papel de J/Q) para responder a um ataque? */
export function canHoldReflect(view: PlayerView): boolean {
  const hand = view.self.hand;
  const [k, j, q, w] = [count(hand, 'K'), count(hand, 'J'), count(hand, 'Q'), count(hand, 'WILD')];
  return k > 0 && j + w > 0 && q + w > 0 && j + q + w >= 2;
}

/** Quantos Selvagens a jogada gasta: desempate para guardar o Selvagem, que é mais flexível. */
export function wildsUsed(action: Action, hand: SpecialCard[]): number {
  const ids = Object.values(action).flat().filter((v): v is string => typeof v === 'string');
  return hand.filter((c) => c.kind === 'WILD' && ids.includes(c.id)).length;
}

/** O melhor elemento por `score`; empates resolvidos por `pickTie`. */
export function best<T>(items: readonly T[], score: (item: T) => number, pickTie: (ties: T[]) => T): T {
  let top = -Infinity;
  let ties: T[] = [];
  for (const item of items) {
    const value = score(item);
    if (value > top) {
      top = value;
      ties = [item];
    } else if (value === top) {
      ties.push(item);
    }
  }
  return pickTie(ties);
}

export { attackBase, defenseBase };
