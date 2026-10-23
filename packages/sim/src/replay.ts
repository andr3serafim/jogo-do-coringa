import type { PlayerId, Replay, RulesConfig } from '@coringa/engine';
import type { GameRecord } from './match.ts';

/** Partida gravada: o tipo vem do motor (`@coringa/engine`), o mesmo das fixtures e dos arquivos salvos pelo `pnpm play`. */
export type { Replay };

export function toReplay(name: string, config: RulesConfig, players: [PlayerId, PlayerId], record: GameRecord): Replay {
  if (!record.replay) throw new Error('a partida não foi gravada (use record: true)');
  return { name, config, seed: record.seed, players, steps: record.replay };
}
