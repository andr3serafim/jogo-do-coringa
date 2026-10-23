import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { Replay } from '../src/types.ts';
import { summarizeReplay } from './replay.ts';

/**
 * Partidas de referência: replays gravados (semente + ações) reexecutados no motor.
 * Mudança de regra que torna uma ação ilegal falha no passo exato; mudança de resultado
 * quebra o snapshot até ser aceita com `vitest -u` e o diff revisado.
 * Regravar as fixtures: `pnpm --filter @coringa/sim record-golden`.
 */
const replays: Replay[] = JSON.parse(readFileSync(new URL('./fixtures/golden-replays.json', import.meta.url), 'utf8'));

describe('partidas de referência', () => {
  it('há 12 partidas gravadas', () => {
    expect(replays).toHaveLength(12);
  });

  for (const replay of replays) {
    it(`${replay.name} reproduz o mesmo resultado`, async () => {
      const summary = summarizeReplay(replay);
      expect(summary).toMatchObject({ result: expect.objectContaining({ kind: expect.any(String) }) });
      await expect(`${JSON.stringify(summary, null, 2)}\n`).toMatchFileSnapshot(`./__snapshots__/golden/${replay.name}.json`);
    });
  }
});
