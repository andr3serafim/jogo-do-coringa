import { greedyBot } from './greedy.ts';
import { randomBot } from './random.ts';
import { turtleBot } from './turtle.ts';
import type { Bot, BotName } from './types.ts';

export const BOTS: Record<BotName, Bot> = { random: randomBot, greedy: greedyBot, turtle: turtleBot };
export { BOT_NAMES, type Bot, type BotName } from './types.ts';
