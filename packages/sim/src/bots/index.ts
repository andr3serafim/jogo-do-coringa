import { easyBot } from './easy.ts';
import { greedyBot } from './greedy.ts';
import { randomBot } from './random.ts';
import { turtleBot } from './turtle.ts';
import type { Bot, BotName } from './types.ts';

export const BOTS: Record<BotName, Bot> = { random: randomBot, greedy: greedyBot, turtle: turtleBot, easy: easyBot };
export { BOT_NAMES, type Bot, type BotName } from './types.ts';
