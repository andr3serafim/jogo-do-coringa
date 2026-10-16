import type { RulesConfig } from '@coringa/engine';
import { BOTS, type BotName } from './bots/index.ts';
import { runGame, type GameRecord } from './match.ts';

/**
 * N partidas com sementes `${seedPrefix}-0 … -(N−1)`. Usar o mesmo prefixo em variantes diferentes
 * deixa as amostras pareadas (mesmas sementes de partida e de bots).
 */
export function runSeries(config: RulesConfig, bots: [BotName, BotName], games: number, seedPrefix = 'jogo'): GameRecord[] {
  return Array.from({ length: games }, (_, i) => runGame({ config, seed: `${seedPrefix}-${i}`, bots: [BOTS[bots[0]], BOTS[bots[1]]] }));
}
