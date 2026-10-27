import { describe, expect, it } from 'vitest';
import { durationText } from '../../src/model/copy.ts';

describe('durationText: o tempo de partida do painel de fim (U5)', () => {
  it('minutos e segundos, e horas só passando de uma hora', () => {
    expect(durationText(0)).toBe('0:00');
    expect(durationText(9_400)).toBe('0:09');
    expect(durationText(754_000)).toBe('12:34');
    expect(durationText(3_723_000)).toBe('1:02:03');
    expect(durationText(-5)).toBe('0:00');
  });
});
