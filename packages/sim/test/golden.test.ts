import { describe, expect, it } from 'vitest';
import { GOLDEN_GAMES, recordGolden } from '../src/golden.ts';

describe('partidas de referência', () => {
  it('grava 11 partidas com nomes únicos, todas terminadas, de forma reprodutível', () => {
    const replays = recordGolden();
    expect(replays).toHaveLength(GOLDEN_GAMES.length);
    expect(new Set(replays.map((r) => r.name)).size).toBe(11);
    expect(recordGolden()).toEqual(replays);
  });
});
