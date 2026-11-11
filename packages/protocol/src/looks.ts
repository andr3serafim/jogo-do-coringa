/**
 * A aparência do jogador (spec dos decks e raças, §2): o deck veste as numéricas, a raça do Coringa veste J, Q, K, A, o Selvagem e o
 * retrato. Mora no protocolo porque a web e o servidor usam os dois (o servidor só a partir da fatia 3). Sem Zod: qualquer entrada vira uma
 * aparência válida, e id desconhecido não é erro, vira o padrão daquele campo.
 */

export const DECK_IDS = ['cordel', 'bestiario', 'celestial'] as const;
export const RACE_IDS = ['bufao', 'egipcio'] as const;
export type DeckId = (typeof DECK_IDS)[number];
export type RaceId = (typeof RACE_IDS)[number];

export interface Look {
  deck: DeckId;
  race: RaceId;
}

/** O baralho de hoje: o deck Cordel com o Coringa Bufão. */
export const DEFAULT_LOOK: Readonly<Look> = Object.freeze({ deck: 'cordel', race: 'bufao' });

function pick<T extends string>(ids: readonly T[], value: unknown, fallback: T): T {
  return ids.find((id) => id === value) ?? fallback;
}

/**
 * Qualquer coisa → uma aparência válida, sempre num objeto novo: o que não é objeto vira o padrão; `deck` ou `race` fora da lista, o
 * padrão daquele campo; campos a mais somem. Depois, a trava (§2.1): o deck `cordel` só anda com a raça `bufao`.
 */
export function normalizeLook(input: unknown): Look {
  const value = typeof input === 'object' && input !== null && !Array.isArray(input) ? (input as Record<string, unknown>) : {};
  const deck = pick(DECK_IDS, value.deck, DEFAULT_LOOK.deck);
  const race = deck === 'cordel' ? 'bufao' : pick(RACE_IDS, value.race, DEFAULT_LOOK.race);
  return { deck, race };
}
