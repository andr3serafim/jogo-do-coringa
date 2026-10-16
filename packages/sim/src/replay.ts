import type { PlayerId, RulesConfig } from '@coringa/engine';
import type { GameRecord, ReplayStep } from './match.ts';

/**
 * Partida gravada: semente + config completa + ações. Mesmo formato das fixtures de
 * `packages/engine/test/fixtures/golden-replays.json` e dos arquivos salvos pelo `pnpm play`.
 */
export interface Replay {
  name: string;
  config: RulesConfig;
  seed: string;
  players: [PlayerId, PlayerId];
  steps: ReplayStep[];
}

export function toReplay(name: string, config: RulesConfig, players: [PlayerId, PlayerId], record: GameRecord): Replay {
  if (!record.replay) throw new Error('a partida não foi gravada (use record: true)');
  return { name, config, seed: record.seed, players, steps: record.replay };
}
