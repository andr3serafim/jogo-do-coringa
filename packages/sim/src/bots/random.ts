import type { Bot } from './types.ts';

export const randomBot: Bot = (_view, legal, rng) => rng.pick(legal);
