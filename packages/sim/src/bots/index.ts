import { easyBot } from './easy.ts';
import { greedyBot } from './greedy.ts';
import { randomBot } from './random.ts';
import { turtleBot } from './turtle.ts';
import type { Bot, BotName } from './types.ts';

export const BOTS: Record<BotName, Bot> = { random: randomBot, greedy: greedyBot, turtle: turtleBot, easy: easyBot };
export { BOT_NAMES, HARD_BOT, type Bot, type BotName, type StateBot } from './types.ts';
export { HARD_DEFAULTS, hardSearch, runHard, type HardOptions } from './hard.ts';
