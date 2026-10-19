// "Fica aceso até você ver" (spec §10.5). Puro: compara a `view` da sua última jogada voluntária
// (`base`) com a atual e diz o que mudou na mesa. Quem apaga uma marca é a sessão, pondo o id (ou
// `zone:<nome>`) em `seen` quando o jogador toca, foca ou passa o mouse; as jogadas automáticas não
// trocam a `base`.
import type { Card, PlayerView, PublicPlayer } from '@coringa/engine';

export type MarkZone = 'selfHp' | 'opponentHp' | 'pressure';

export interface Marks {
  /** Ids de carta: novas no campo do oponente, ou suas que foram para o cemitério. */
  cards: ReadonlySet<string>;
  zones: ReadonlySet<MarkZone>;
}

export const NO_MARKS: Marks = { cards: new Set(), zones: new Set() };

/** Chave de `seen` para uma zona. */
export function zoneKey(zone: MarkZone): string {
  return `zone:${zone}`;
}

/** Todas as cartas em jogo no campo de um lado: fileiras, buffs, Guarda e as três do Reflect. */
function fieldCards(player: PublicPlayer): Card[] {
  const { attackRow, defenseRow, attackBuffs, defenseBuffs, guard, reflect } = player;
  const cards: Card[] = [...attackRow, ...defenseRow, ...attackBuffs, ...defenseBuffs, ...guard];
  if (reflect) cards.push(reflect.k, reflect.j, reflect.q);
  return cards;
}

/**
 * O que mudou desde `base`, sem o que já está em `seen`. `base === null` (ainda não houve jogada
 * voluntária) não marca nada.
 */
export function computeMarks(base: PlayerView | null, current: PlayerView, seen: ReadonlySet<string>): Marks {
  if (base === null) return NO_MARKS;

  const cards = new Set<string>();
  const before = new Set(fieldCards(base.opponent).map((c) => c.id));
  for (const card of fieldCards(current.opponent)) {
    if (!before.has(card.id)) cards.add(card.id);
  }
  const mine = new Set(fieldCards(base.self).map((c) => c.id));
  for (const card of current.graveyard) {
    if (mine.has(card.id)) cards.add(card.id);
  }
  for (const id of seen) cards.delete(id);

  const zones = new Set<MarkZone>();
  if (current.self.hp !== base.self.hp) zones.add('selfHp');
  if (current.opponent.hp !== base.opponent.hp) zones.add('opponentHp');
  if (current.pressure !== base.pressure) zones.add('pressure');
  for (const zone of [...zones]) {
    if (seen.has(zoneKey(zone))) zones.delete(zone);
  }

  return cards.size === 0 && zones.size === 0 ? NO_MARKS : { cards, zones };
}
