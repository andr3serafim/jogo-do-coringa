import { makeConfig, type ConfigOverrides } from '@coringa/engine';
import { BOTS, type BotName } from './bots/index.ts';
import { PLAYERS, runGame } from './match.ts';
import { toReplay, type Replay } from './replay.ts';

/** As partidas de referência: nome, bots, regras e semente. Mudar esta lista exige regravar as fixtures. */
export const GOLDEN_GAMES: Array<{ name: string; bots: [BotName, BotName]; config: ConfigOverrides; seed: string }> = [
  ...[0, 1, 2, 3].map((i) => ({ name: `greedy-${i}`, bots: ['greedy', 'greedy'] as [BotName, BotName], config: {}, seed: `ouro-g${i}` })),
  ...[0, 1].map((i) => ({ name: `turtle-${i}`, bots: ['turtle', 'greedy'] as [BotName, BotName], config: {}, seed: `ouro-t${i}` })),
  ...[0, 1].map((i) => ({ name: `random-${i}`, bots: ['random', 'random'] as [BotName, BotName], config: {}, seed: `ouro-r${i}` })),
  { name: 'sem-escolha', bots: ['greedy', 'greedy'], config: { initiativeChoice: false }, seed: 'ouro-e' },
  { name: 'sem-selvagens', bots: ['greedy', 'greedy'], config: { wildJokers: false }, seed: 'ouro-s' },
  { name: 'random-tudo-desligado', bots: ['random', 'random'], config: { initiativeChoice: false, wildJokers: false }, seed: 'ouro-x' },
];

/** Grava as partidas de referência com a config completa (mudanças no DEFAULT_CONFIG não as afetam). */
export function recordGolden(): Replay[] {
  return GOLDEN_GAMES.map((g) => {
    const config = makeConfig(g.config);
    const record = runGame({ config, seed: g.seed, bots: [BOTS[g.bots[0]], BOTS[g.bots[1]]], record: true });
    if (!record.result) throw new Error(`a partida de referência ${g.name} não terminou`);
    return toReplay(g.name, config, PLAYERS, record);
  });
}
