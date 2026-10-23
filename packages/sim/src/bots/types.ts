import type { Action, GameState, PlayerId, PlayerView } from '@coringa/engine';
import type { Rng } from '../rng.ts';

/** Spec §3: um bot só vê a própria visão e a lista de ações legais; devolve uma delas. */
export type Bot = (view: PlayerView, legal: Action[], rng: Rng) => Action;

/**
 * Bot que busca por rollouts (o Difícil): recebe o estado inteiro, mas só pode ler dele o que `seat` vê
 * (a informação oculta do oponente entra apenas por `determinize`). Devolve uma das ações de `legal`.
 */
export type StateBot = (state: GameState, seat: PlayerId, legal: Action[], rng: Rng) => Action;

export const BOT_NAMES = ['random', 'greedy', 'turtle', 'easy'] as const;
export type BotName = (typeof BOT_NAMES)[number];

/** O Difícil não é um `Bot` (precisa do estado) nem entra em `BOT_NAMES` (não serve ao `pnpm bot` online): só o simulador e o treino o usam. */
export const HARD_BOT = 'hard';

/** O que ocupa um assento no simulador: um `Bot` comum ou o Difícil, que roda por `runHard`. */
export type SeatBot = Bot | typeof HARD_BOT;
