import { nextFloat, nextInt, seedRng } from '@coringa/engine';

/** Gerador com semente própria dos bots e experimentos. Nunca o da partida, nunca `Math.random`. */
export interface Rng {
  /** Número em [0, 1). */
  next(): number;
  /** Inteiro em [0, max). */
  int(max: number): number;
  pick<T>(items: readonly T[]): T;
}

export function createRng(seed: string): Rng {
  const state = seedRng(seed);
  return {
    next: () => nextFloat(state),
    int: (max) => nextInt(state, max),
    pick: (items) => {
      if (items.length === 0) throw new Error('pick em lista vazia');
      return items[nextInt(state, items.length)];
    },
  };
}
