// A aparência das cartas na interface (spec dos decks e raças, §3): um contexto, para a carta não saber de dono nem de regra. Sem provedor,
// a aparência é a padrão e toda carta é a de cordel. Nesta fatia há um provedor só, no alto da mesa; o `LookZone` por lado é da fatia 2.
import type { Card } from '@coringa/engine';
import { DEFAULT_LOOK, type Look } from '@coringa/protocol';
import { createContext, useContext } from 'react';
import { ART_META } from '../../looks/catalog.ts';
import type { PackUrls } from '../../looks/load.ts';
import { artOf, RACE_TIER, tierOf, type PackId, type Tier } from '../../model/looks.ts';

/** O que a face com arte precisa: a imagem, a cor de metal e a faixa (o anel e a aura). */
export interface CardArt {
  url: string;
  metal: string;
  tier: Tier;
}

export interface LooksValue {
  look: Look;
  /** As URLs dos pacotes que já chegaram (`loadPack`). */
  packs: Partial<Record<PackId, PackUrls>>;
}

export const LooksContext = createContext<LooksValue>({ look: DEFAULT_LOOK, packs: {} });

/** A arte desta carta no lugar onde ela está; `null` = a face de cordel (sem provedor, sem pacote, ou carta de cordel). */
export function useCardArt(card: Card): CardArt | null {
  const { look, packs } = useContext(LooksContext);
  const ref = artOf(card, look);
  if (ref === null) return null;
  const url = packs[ref.pack]?.[ref.key];
  const meta = ART_META[ref.pack][ref.key];
  if (url === undefined || meta === undefined) return null;
  return { url, metal: meta.metal, tier: card.kind === 'NUM' ? tierOf(card.value) : RACE_TIER };
}
