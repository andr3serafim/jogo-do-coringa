import { greedyBot } from './greedy.ts';
import type { Bot } from './types.ts';

/**
 * Chance de, em cada decisão, o Fácil jogar uma ação legal qualquer em vez da escolha do greedy.
 * Calibrada pelo teste de 200 partidas (greedy ≥ 65% contra o Fácil, assentos alternados, semente fixa):
 * 0,35 deu 60% e 0,40 deu 66%. O ruído da amostra é de uns 3 pontos (0,45 deu 62% na mesma semente);
 * em 600 partidas por valor, a média foi de 63% em 0,35, 65% em 0,40 e 70% em 0,50.
 */
export const EASY_BLUNDER = 0.4;

/** O nível Fácil (spec da fatia 1, nível de bot): o greedy distraído. Só joga ações legais, mas às vezes não pensa. */
export const easyBot: Bot = (view, legal, rng) => (rng.next() < EASY_BLUNDER ? rng.pick(legal) : greedyBot(view, legal, rng));
