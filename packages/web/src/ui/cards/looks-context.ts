// A aparência das cartas na interface (spec dos decks e raças, §3): um contexto, para a carta não saber de dono nem de regra. Sem provedor,
// a aparência é a padrão e toda carta é a de cordel. Há um provedor só, no alto da mesa (`LooksProvider`), que conhece a aparência de quem
// olha e a de cada dono; o `LookZone` troca, para os filhos, a aparência do lugar (fatia 2), sem pôr nó no DOM.
import type { Card, PlayerId } from '@coringa/engine';
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
  /** A aparência deste lugar: a do `LookZone` mais próximo; fora de zona, a de quem olha. */
  look: Look;
  /** A de quem olha: a que vale fora de zona e numa zona cujo dono não está em `owners`. */
  viewer: Look;
  /** A aparência de cada dono (os lados da mesa, os retratos). */
  owners: Partial<Record<PlayerId, Look>>;
  /** As URLs dos pacotes que já chegaram (`loadPack`). */
  packs: Partial<Record<PackId, PackUrls>>;
  /** Os retratos do placar que já chegaram, por pacote de raça. */
  portraits: Partial<Record<PackId, string>>;
}

export const LooksContext = createContext<LooksValue>({ look: DEFAULT_LOOK, viewer: DEFAULT_LOOK, owners: {}, packs: {}, portraits: {} });

/** A aparência do lugar: a do `LookZone` mais próximo; fora de zona, a de quem olha; sem provedor, `DEFAULT_LOOK`. */
export function useLook(): Look {
  return useContext(LooksContext).look;
}

/** O retrato do placar na raça do lugar; `null` = o Coringa de cordel (o Bufão, ou o pacote por chegar ou falho). */
export function usePortrait(): string | null {
  const { look, portraits } = useContext(LooksContext);
  return look.race === 'bufao' ? null : (portraits[look.race] ?? null);
}

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
