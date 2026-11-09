// A aura de energia do Ataque Absoluto (sub-projeto 6 §7.1, §11) e os raios em volta dela (§1: no máximo 3 por segundo).
import { describe, expect, it } from 'vitest';
import { auraVariants, BOLT_FADE_MS, boltTimes, EXODIA_AURA } from '../../src/ui/anim/aura.ts';

describe('a aura: 3 camadas × 4 formas pré-calculadas, sempre as mesmas', () => {
  it('cada camada tem 4 caminhos fechados, e duas chamadas dão o mesmo desenho', () => {
    const variants = auraVariants();
    expect(variants).toHaveLength(3);
    for (const layer of variants) {
      expect(layer).toHaveLength(4);
      for (const d of layer) expect(d).toMatch(/^M-?\d.*Z$/);
      expect(new Set(layer).size).toBe(4);
    }
    expect(auraVariants()).toEqual(variants);
  });

  it('a da Exódia (sub-projeto 6 §7.3): as camadas e as sementes do protótipo, outras formas que as do Ataque', () => {
    const exodia = auraVariants(EXODIA_AURA, 401);
    expect(exodia).toHaveLength(3);
    for (const layer of exodia) {
      expect(layer).toHaveLength(4);
      for (const d of layer) expect(d).toMatch(/^M-?\d.*Z$/);
      expect(new Set(layer).size).toBe(4);
    }
    const attack = new Set(auraVariants().flat());
    expect(exodia.flat().some((d) => attack.has(d))).toBe(false);
    expect(auraVariants(EXODIA_AURA, 401)).toEqual(exodia);
  });
});

describe('os raios em volta da aura (spec 6 §1)', () => {
  it('nenhuma janela de 1 s tem mais de 3 raios', () => {
    const times = boltTimes(1_430, 4_050);
    expect(times.length).toBeGreaterThan(3);
    for (const start of times) expect(times.filter((t) => t >= start && t < start + 1_000).length).toBeLessThanOrEqual(3);
  });

  it('cada raio entra e sai em pelo menos 100 ms, dentro do intervalo', () => {
    expect(BOLT_FADE_MS).toBeGreaterThanOrEqual(100);
    const times = boltTimes(1_430, 3_130);
    expect(times[0]).toBe(1_430);
    expect(times.every((t) => t < 3_130)).toBe(true);
  });
});
