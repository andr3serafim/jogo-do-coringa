import { greedyBot } from './greedy.ts';
import type { Bot } from './types.ts';

/**
 * Chance de, em cada decisão, o Fácil jogar uma ação legal qualquer em vez da escolha do greedy.
 * Calibrada pelo teste de 200 partidas (greedy ≥ 65% contra o Fácil, assentos alternados, semente fixa).
 * O ruído da amostra é de uns 3 pontos, então o valor precisa de folga: em 600 partidas por valor, a média do
 * greedy foi de 63% com 0,35, 65% com 0,40 e 70% com 0,50 (na semente fixa: 60%, 66% e 66,5%). Com 0,40 o teste
 * passava por sorte da semente; 0,50 deixa uns 5 pontos de margem na média.
 */
export const EASY_BLUNDER = 0.5;

/** O nível Fácil (spec da fatia 1, nível de bot): o greedy distraído. Só joga ações legais, mas às vezes não pensa. */
export const easyBot: Bot = (view, legal, rng) => (rng.next() < EASY_BLUNDER ? rng.pick(legal) : greedyBot(view, legal, rng));
