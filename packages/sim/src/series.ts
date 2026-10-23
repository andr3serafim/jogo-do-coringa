import type { RulesConfig } from '@coringa/engine';
import { BOTS, type BotName } from './bots/index.ts';
import { HARD_BOT, type SeatBot } from './bots/types.ts';
import { runGame, type GameRecord } from './match.ts';

type SeatName = BotName | typeof HARD_BOT;
const seatBot = (name: SeatName): SeatBot => (name === HARD_BOT ? HARD_BOT : BOTS[name]);

/**
 * N partidas com sementes `${seedPrefix}-0 … -(N−1)`. Usar o mesmo prefixo em variantes diferentes
 * deixa as amostras pareadas (mesmas sementes de partida e de bots).
 */
export function runSeries(config: RulesConfig, bots: [SeatName, SeatName], games: number, seedPrefix = 'jogo'): GameRecord[] {
  return Array.from({ length: games }, (_, i) => runGame({ config, seed: `${seedPrefix}-${i}`, bots: [seatBot(bots[0]), seatBot(bots[1])] }));
}
