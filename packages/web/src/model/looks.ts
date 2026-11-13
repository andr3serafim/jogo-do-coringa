// A aparência das cartas (spec dos decks e raças, §2 e §4): que arte veste cada carta numa aparência, a faixa de raridade da numérica e a
// aura de cada faixa. Puro: sem React nem DOM. O modelo (`Look`, os ids, `normalizeLook`) é do `@coringa/protocol`; aqui só o que a web usa.
import type { Card, Rank } from '@coringa/engine';
import { DEFAULT_LOOK, type DeckId, type Look, type RaceId } from '@coringa/protocol';

/** A faixa de raridade (§2.2): só um número, sem nome em lugar nenhum. */
export type Tier = 1 | 2 | 3 | 4 | 5;

/** 2–3 → 1, 4–5 → 2, 6–7 → 3, 8–9 → 4, 10 → 5. */
export function tierOf(value: Rank): Tier {
  return Math.min(5, Math.floor(value / 2)) as Tier;
}

/** Os pacotes de arte: um por deck e por raça fantasy (o Cordel e o Bufão são o desenho de hoje, sem pacote). */
export type PackId = Exclude<DeckId, 'cordel'> | Exclude<RaceId, 'bufao'>;

/** A chave da arte dentro do pacote: o valor em dois dígitos na numérica, a letra (ou `WILD`) na especial. */
export type ArtKey = '02' | '03' | '04' | '05' | '06' | '07' | '08' | '09' | '10' | 'K' | 'J' | 'Q' | 'A' | 'WILD';

/** De que pacote e com que chave sai a arte desta carta nesta aparência; `null` = a carta de cordel. */
export function artOf(card: Card, look: Look): { pack: PackId; key: ArtKey } | null {
  if (card.kind === 'NUM') {
    return look.deck === 'cordel' ? null : { pack: look.deck, key: String(card.value).padStart(2, '0') as ArtKey };
  }
  return look.race === 'bufao' ? null : { pack: look.race, key: card.kind };
}

/**
 * A aparência do bot no treino (fatia 2, G1, que substitui a §7.1 da spec): com o Cordel, o Cordel com o Bufão (o treino padrão fica
 * idêntico ao de hoje); com um deck de arte, o outro deck de arte, com a raça Egípcia. Sempre um objeto novo. Calculada da sua a cada
 * desenho (G2): trocar o seu deck troca o dele.
 */
export function botLook(mine: Look): Look {
  if (mine.deck === 'cordel') return { deck: 'cordel', race: 'bufao' };
  return { deck: mine.deck === 'bestiario' ? 'celestial' : 'bestiario', race: 'egipcio' };
}

/** A aparência é o padrão (o Cordel com o Bufão). */
export function isDefaultLook(look: Look): boolean {
  return look.deck === DEFAULT_LOOK.deck && look.race === DEFAULT_LOOK.race;
}

/**
 * A aparência que vai pelo fio ao criar ou entrar na sala (fatia 3, H1): `undefined` no padrão, para o pedido ficar o de hoje; fora
 * dele, uma cópia.
 */
export function sentLook(look: Look): Look | undefined {
  return isDefaultLook(look) ? undefined : { deck: look.deck, race: look.race };
}

/** Os pacotes que uma aparência pede, sem repetir (nenhum para o padrão). */
export function packsOf(look: Look): PackId[] {
  const packs: PackId[] = [];
  if (look.deck !== 'cordel') packs.push(look.deck);
  if (look.race !== 'bufao') packs.push(look.race);
  return packs;
}

/** A aura por faixa (§4.1), na cor de metal da carta: o desfoque e o alcance em px e a opacidade; `null` na faixa 1. */
export const AURA: Record<Tier, { blur: number; spread: number; alpha: number } | null> = {
  1: null,
  2: { blur: 5, spread: 1, alpha: 0.35 },
  3: { blur: 8, spread: 1, alpha: 0.5 },
  4: { blur: 10, spread: 2, alpha: 0.6 },
  5: { blur: 14, spread: 3, alpha: 0.8 },
};

/** A faixa que a aura e o anel das especiais de raça usam. */
export const RACE_TIER: Tier = 3;
