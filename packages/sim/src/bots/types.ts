import type { Action, PlayerView } from '@coringa/engine';
import type { Rng } from '../rng.ts';

/** Spec §3: um bot só vê a própria visão e a lista de ações legais; devolve uma delas. */
export type Bot = (view: PlayerView, legal: Action[], rng: Rng) => Action;

export const BOT_NAMES = ['random', 'greedy', 'turtle'] as const;
export type BotName = (typeof BOT_NAMES)[number];
