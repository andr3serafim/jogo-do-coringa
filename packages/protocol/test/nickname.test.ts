import { describe, expect, it } from 'vitest';
import { normalizeNickname } from '../src/nickname.ts';

describe('apelido', () => {
  it.each([
    ['  Ana  ', 'Ana'],
    ['José', 'José'], // NFC junta o acento combinado
    ['😀', '😀'],
    ['a'.repeat(20), 'a'.repeat(20)],
  ])('aceita %j', (raw, out) => expect(normalizeNickname(raw)).toBe(out));

  it.each([['   '], [''], ['a'.repeat(21)], ['😀'.repeat(21)], ['ana\u0007'], [42], [null]])('recusa %j', (raw) =>
    expect(normalizeNickname(raw)).toBeNull(),
  );
});
