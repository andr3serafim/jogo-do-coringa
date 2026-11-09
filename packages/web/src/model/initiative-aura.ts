// A aura da iniciativa (bloco C dos pontos do playtest, ponto 11; spec `2026-11-03-playtest-design.md` §5.2): o Coringa de quem segura a iniciativa
// por várias rodadas de Ataque seguidas (o `streak` do motor) ganha uma aura em volta do retrato. Puro: sem React nem DOM.

/** As rodadas seguidas de cada nível: a brasa, a chama e a super aura. */
export const INITIATIVE_TIERS = [3, 5, 10] as const;

/** O nível da aura com `streak` rodadas seguidas: 0 sem aura, 1 a brasa, 2 a chama, 3 a super aura. */
export function initiativeTier(streak: number): 0 | 1 | 2 | 3 {
  const [ember, flame, blaze] = INITIATIVE_TIERS;
  return streak >= blaze ? 3 : streak >= flame ? 2 : streak >= ember ? 1 : 0;
}

/** O selo "×N" ao lado do retrato: a partir de 2 rodadas seguidas, como no protótipo (decisoes.md 2026-11-08 (2), C2). */
export const streakSealShown = (streak: number): boolean => streak >= 2;

/** O que o leitor de tela ouve do selo (a aura é decorativa; C8). */
export const streakText = (streak: number): string => `${streak} rodadas seguidas com a iniciativa`;
