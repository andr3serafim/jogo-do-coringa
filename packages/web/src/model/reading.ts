// Quanto tempo um texto curto fica à vista para dar tempo de ler (sub-projeto 5): o autor achou que os textos sumiam rápido
// demais. Puro: sem React nem DOM.

/** Um piso que vale para qualquer texto, e o teto que um texto longo não passa. */
export const READING_MIN_MS = 2_500;
export const READING_MAX_MS = 8_000;

/** O tempo de leitura de `text`: 1,2 s mais 55 ms por caractere (~18 caracteres por segundo), entre o piso e o teto. */
export function readingMs(text: string): number {
  return Math.min(READING_MAX_MS, Math.max(READING_MIN_MS, 1_200 + 55 * text.length));
}

/** O piso e o teto da faixa de transição ("Sua vez", "Rodada 7 · Ataque"): texto curto, lido de relance. */
export const BANNER_READ_MIN_MS = 1_000;
export const BANNER_READ_MAX_MS = 2_000;

/** Quanto a faixa fica no ar, no mínimo (U1): 600 ms mais 30 ms por caractere, entre 1 s e 2 s. */
export function bannerReadMs(text: string): number {
  return Math.min(BANNER_READ_MAX_MS, Math.max(BANNER_READ_MIN_MS, 600 + 30 * text.length));
}
