// Zonas de soltura do arrasto (spec do polimento, fatia 5). Puro: sem React nem DOM.
//
// Nenhuma regra do jogo mora aqui. Cada zona da mesa leva um `data-soltar="<DropKey>"`; este módulo só diz
// em qual zona cai cada jogada que a mesa já oferece (`tablePlays`) e cada destino que o motor já deixa no
// Equipar (`nextDestinations`). O gesto (ponteiro, alvo sob o dedo) é de outro módulo.
import type { Destination, PlayerView, RowName } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { nextDestinations } from './equip.ts';
import type { CardPlay, TablePlays } from './plays.ts';

/**
 * O valor do atributo `data-soltar` de uma zona: `buffs:ATK`, `buffs:DEF`, `guarda`, `carta:<id>` (uma carta
 * do oponente que é alvo), `fileira:ATK`, `fileira:DEF`, `ultima:ATK`, `ultima:DEF` e `cemiterio`.
 */
export type DropKey = string;

/**
 * As chaves fixas, num lugar só: este módulo e a mesa (todo `data-soltar`) leem daqui, então um erro de digitação não cria uma zona
 * morta. `carta:<id>` tem o id de uma carta e sai de `cardDropKey`.
 */
export const DROP = {
  attackBuffs: 'buffs:ATK',
  defenseBuffs: 'buffs:DEF',
  guard: 'guarda',
  attackRow: 'fileira:ATK',
  defenseRow: 'fileira:DEF',
  lastAttack: 'ultima:ATK',
  lastDefense: 'ultima:DEF',
  graveyard: 'cemiterio',
} as const;

/** A zona de uma carta do oponente que é alvo de uma jogada. */
export function cardDropKey(id: string): DropKey {
  return `carta:${id}`;
}

/** As duas zonas de uma fileira sua: ela inteira (um lugar vago) e a última carta dela (a troca). */
export const ROW_DROP: Record<RowName, { row: DropKey; last: DropKey }> = {
  ATK: { row: DROP.attackRow, last: DROP.lastAttack },
  DEF: { row: DROP.defenseRow, last: DROP.lastDefense },
};

/** Uma jogada que a zona aceita; `targetId` só nas jogadas com alvo (zona `carta:<id>`). */
export interface PlayDrop {
  play: CardPlay;
  targetId?: string;
}

/** A zona de uma jogada sem alvo, pela chave dela (`PLAY_J`, `PLAY_Q`, `PLAY_K:<n>`). */
function untargetedZone(key: string): DropKey | null {
  if (key === 'PLAY_J') return DROP.attackBuffs;
  if (key === 'PLAY_Q') return DROP.defenseBuffs;
  if (key.startsWith('PLAY_K')) return DROP.guard;
  return null;
}

/**
 * As zonas onde a carta `cardId` da mão pode ser solta, com as jogadas de cada uma: sem alvo, `PLAY_J` cai
 * em `buffs:ATK`, `PLAY_Q` em `buffs:DEF` e `PLAY_K…` em `guarda`; com alvo, cada alvo é a zona
 * `carta:<id>`. Carta sem jogada (ou que não é da mão) não tem zona.
 */
export function playDropZones(cardId: string, plays: TablePlays): Map<DropKey, PlayDrop[]> {
  const zones = new Map<DropKey, PlayDrop[]>();
  const add = (key: DropKey, drop: PlayDrop): void => {
    const list = zones.get(key);
    if (list) list.push(drop);
    else zones.set(key, [drop]);
  };
  for (const play of plays.byCard.get(cardId) ?? []) {
    if (play.targets === null) {
      const key = untargetedZone(play.key);
      if (key !== null) add(key, { play });
    } else {
      for (const target of play.targets) add(cardDropKey(target.id), { play, targetId: target.id });
    }
  }
  return zones;
}

/**
 * O que fazer ao soltar a carta numa zona: uma jogada só, manda (`play.make(targetId)`); mais de uma
 * (dois K na mão, o Selvagem sobre um J que é alvo de Armadilha e de Sacrifício), abre a escolha; nenhuma, nada.
 */
export function resolvePlayDrop(
  drops: PlayDrop[] | undefined,
): { kind: 'send'; action: PlayerAction } | { kind: 'choose' } | null {
  if (!drops || drops.length === 0) return null;
  if (drops.length > 1) return { kind: 'choose' };
  const [{ play, targetId }] = drops as [PlayDrop];
  return { kind: 'send', action: play.make(targetId) };
}

const EQUIP_ZONE: Record<Destination, DropKey> = {
  ATK: DROP.attackRow,
  DEF: DROP.defenseRow,
  REPLACE_LAST_ATK: DROP.lastAttack,
  REPLACE_LAST_DEF: DROP.lastDefense,
  DISCARD: DROP.graveyard,
};

/**
 * As zonas do Equipar para a próxima carta pendente, dado o que já foi escolhido: uma por destino que o
 * motor deixa (`nextDestinations`), na ordem dele. Sem carta restante, ou fora da vez de montar, não há zona.
 */
export function equipDropZones(view: PlayerView, legal: PlayerAction[], chosen: Destination[]): Map<DropKey, Destination> {
  return new Map(nextDestinations(view, legal, chosen).map((destination): [DropKey, Destination] => [EQUIP_ZONE[destination], destination]));
}
