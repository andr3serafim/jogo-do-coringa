import { describe, expect, it } from 'vitest';
import { makeConfig } from '../src/config';
import { buildDeck, totalCards } from '../src/deck';
import { nextFloat, seedRng, shuffle } from '../src/rng';

describe('rng', () => {
  it('a mesma semente gera a mesma sequência', () => {
    const a = seedRng('coringa');
    const b = seedRng('coringa');
    const seqA = Array.from({ length: 5 }, () => nextFloat(a));
    const seqB = Array.from({ length: 5 }, () => nextFloat(b));
    expect(seqA).toEqual(seqB);
  });

  it('sementes diferentes geram sequências diferentes', () => {
    expect(nextFloat(seedRng('a'))).not.toBe(nextFloat(seedRng('b')));
  });

  it('gera números em [0, 1)', () => {
    const rng = seedRng('faixa');
    for (let i = 0; i < 1000; i += 1) {
      const x = nextFloat(rng);
      expect(x).toBeGreaterThanOrEqual(0);
      expect(x).toBeLessThan(1);
    }
  });

  it('shuffle devolve uma permutação determinística sem mutar a entrada', () => {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];
    const out = shuffle(seedRng('x'), input);
    expect(input).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect([...out].sort((a, b) => a - b)).toEqual(input);
    expect(shuffle(seedRng('x'), input)).toEqual(out);
  });
});

describe('baralho', () => {
  it('padrão: 72 numéricas, 6 de cada figura e 2 Coringas Selvagens', () => {
    const deck = buildDeck(makeConfig());
    expect(deck).toHaveLength(98);
    expect(deck.filter((c) => c.kind === 'NUM')).toHaveLength(72);
    for (const kind of ['J', 'Q', 'K', 'A'] as const) {
      expect(deck.filter((c) => c.kind === kind)).toHaveLength(6);
    }
    expect(deck.filter((c) => c.kind === 'WILD')).toHaveLength(2);
    for (let v = 2; v <= 10; v += 1) {
      expect(deck.filter((c) => c.kind === 'NUM' && c.value === v)).toHaveLength(8);
    }
    expect(new Set(deck.map((c) => c.id)).size).toBe(98);
    expect(totalCards(makeConfig())).toBe(98);
  });

  it('sem Coringas Selvagens tem 96 cartas', () => {
    const config = makeConfig({ wildJokers: false });
    expect(buildDeck(config)).toHaveLength(96);
    expect(totalCards(config)).toBe(96);
  });

  it('as figuras retiradas são as 2 últimas cópias do segundo baralho', () => {
    const ids = buildDeck(makeConfig()).map((c) => c.id);
    expect(ids).toContain('b1-copas-7');
    expect(ids).toContain('b2-ouros-K');
    expect(ids).not.toContain('b2-espadas-K');
    expect(ids).not.toContain('b2-paus-A');
  });
});
