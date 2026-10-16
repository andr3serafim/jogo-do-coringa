import type { GameResult, PlayerId } from '@coringa/engine';

/** Pontos de `player` numa partida: vitória 1, empate 0,5, derrota ou não terminou 0. */
export function score(result: GameResult | null, player: PlayerId): number {
  if (!result) return 0;
  if (result.kind === 'DRAW') return 0.5;
  return result.winner === player ? 1 : 0;
}

export const mean = (xs: number[]): number => (xs.length === 0 ? 0 : xs.reduce((a, b) => a + b, 0) / xs.length);

/** Desvio padrão amostral (0 com menos de 2 valores). */
export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((acc, x) => acc + (x - m) ** 2, 0) / (xs.length - 1));
}
