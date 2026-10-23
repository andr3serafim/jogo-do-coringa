import { greedyBot } from './greedy.ts';
import type { Bot } from './types.ts';

/**
 * Chance de, em cada decisão, o Fácil jogar uma ação legal qualquer em vez da escolha do greedy. O contrato: o greedy
 * pontua bem acima de 65% contra o Fácil (o portão (b) do `pnpm sim:dificil` e o teste de 200 partidas de
 * `test/bots.test.ts`, os dois com limiar de 65%). Os valores testados e as medidas estão em `reports/dificil.md`.
 */
export const EASY_BLUNDER = 0.7;

/** O nível Fácil (spec da fatia 1, nível de bot): o greedy distraído. Só joga ações legais, mas às vezes não pensa. */
export const easyBot: Bot = (view, legal, rng) => (rng.next() < EASY_BLUNDER ? rng.pick(legal) : greedyBot(view, legal, rng));
