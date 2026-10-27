import { describe, expect, it } from 'vitest';
import { READING_MAX_MS, READING_MIN_MS, readingMs } from '../../src/model/reading.ts';

describe('readingMs: o tempo de leitura de um texto curto', () => {
  it('cresce com o texto, entre o piso e o teto', () => {
    expect(readingMs('')).toBe(READING_MIN_MS);
    expect(readingMs('Sua vez')).toBe(READING_MIN_MS);
    const medium = 'J♥: na janela de reação só o A (ou o Selvagem como A) responde';
    expect(readingMs(medium)).toBe(1_200 + 55 * medium.length);
    expect(readingMs(medium)).toBeGreaterThan(READING_MIN_MS);
    expect(readingMs('x'.repeat(500))).toBe(READING_MAX_MS);
  });
});
