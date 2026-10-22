// "Fica aceso até você ver" (spec §10.5). Puro: compara a `view` da sua última jogada voluntária
// (`base`) com a atual e diz o que mudou na mesa. Quem apaga uma marca é a sessão, pondo o id (ou
// `zone:<nome>`) em `seen` quando o jogador toca, foca ou passa o mouse; as jogadas automáticas não
// trocam a `base`.
import type { Card, GameEvent, PlayerId, PlayerView, PublicPlayer } from '@coringa/engine';

export type MarkZone = 'selfHp' | 'opponentHp' | 'pressure';

export interface Marks {
  /** Ids de carta: novas no campo do oponente, ou suas que foram para o cemitério. */
  cards: ReadonlySet<string>;
  zones: ReadonlySet<MarkZone>;
}

export const NO_MARKS: Marks = { cards: new Set(), zones: new Set() };

const NO_IDS: ReadonlySet<string> = new Set();

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
 * Os ids das cartas que saíram do SEU campo por um ataque seu, nos `events` de um `state`: a carta da frente do seu Ataque
 * (`CardsRemovedFromRow` com `row: 'ATK'`) e o J que o Ataque Absoluto gasta (o primeiro `BuffRemoved` seu depois daquela
 * carta, num ataque com `AbsoluteAttack` seu; o motor anuncia o Absoluto antes de tudo, e contra um Reflect as Q que o dano
 * devolvido quebra saem antes da carta da frente, e seguem marcadas). A §10.5 só marca no cemitério o que o oponente destruiu;
 * essas vão para lá por jogada sua, e o passe do oponente (que não move a base) as deixaria marcadas até a sua próxima jogada
 * voluntária.
 */
export function ownSpentIds(events: readonly GameEvent[], me: PlayerId): string[] {
  const ids: string[] = [];
  let absolute = false;
  let frontGone = false;
  for (const event of events) {
    if (event.type === 'CardsRemovedFromRow' && event.player === me && event.row === 'ATK') {
      ids.push(...event.cards.map((card) => card.id));
      frontGone = absolute;
    } else if (event.type === 'AbsoluteAttack' && event.player === me) {
      absolute = true;
    } else if (event.type === 'BuffRemoved' && event.player === me && frontGone) {
      absolute = false;
      frontGone = false;
      ids.push(...event.cards.map((card) => card.id));
    }
  }
  return ids;
}

/**
 * O que mudou desde `base`, sem o que já está em `seen`. `base === null` (ainda não houve jogada
 * voluntária) não marca nada. `spent` são as cartas suas que saíram do campo por um ataque seu desde a base
 * (`ownSpentIds`): não contam como destruídas pelo oponente.
 */
export function computeMarks(
  base: PlayerView | null,
  current: PlayerView,
  seen: ReadonlySet<string>,
  spent: ReadonlySet<string> = NO_IDS,
): Marks {
  if (base === null) return NO_MARKS;

  const cards = new Set<string>();
  const before = new Set(fieldCards(base.opponent).map((c) => c.id));
  for (const card of fieldCards(current.opponent)) {
    if (!before.has(card.id)) cards.add(card.id);
  }
  const mine = new Set(fieldCards(base.self).map((c) => c.id));
  for (const card of current.graveyard) {
    if (mine.has(card.id) && !spent.has(card.id)) cards.add(card.id);
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
