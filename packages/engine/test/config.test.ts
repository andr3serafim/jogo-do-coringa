import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, makeConfig, validateConfig } from '../src/config.ts';
import type { RulesConfig } from '../src/types.ts';

describe('config', () => {
  it('makeConfig sem argumentos devolve o padrão da spec', () => {
    expect(makeConfig()).toEqual(DEFAULT_CONFIG);
    expect(DEFAULT_CONFIG).toEqual({
      hp: 300,
      rowLimit: 7,
      buffLimit: 4,
      cardsPerEquip: 4,
      antiStallRounds: 5,
      exodiaGuard: 4,
      resurrectMinRounds: 3,
      deck: { numericCopies: 8, faceCopies: 6 },
      initiativeChoice: true,
      tablePressure: true,
      wildJokers: true,
    });
  });

  it('sem Pressão da mesa, o anti-travamento padrão cai para 3', () => {
    expect(makeConfig({ tablePressure: false }).antiStallRounds).toBe(3);
    expect(makeConfig({ tablePressure: false, antiStallRounds: 4 }).antiStallRounds).toBe(4);
  });

  it('mescla o baralho parcialmente', () => {
    expect(makeConfig({ deck: { faceCopies: 4 } }).deck).toEqual({ numericCopies: 8, faceCopies: 4 });
  });

  it('aceita o padrão e limites válidos', () => {
    expect(validateConfig(DEFAULT_CONFIG)).toBeNull();
    expect(validateConfig(makeConfig({ rowLimit: 16 }))).toBeNull();
    expect(validateConfig(makeConfig({ resurrectMinRounds: 0 }))).toBeNull();
  });

  it('rejeita limite de fileira que quebra a garantia de compra', () => {
    expect(validateConfig(makeConfig({ rowLimit: 17 }))?.code).toBe('INVALID_CONFIG');
  });

  it('rejeita valores fora do domínio', () => {
    expect(validateConfig(makeConfig({ hp: 0 }))?.code).toBe('INVALID_CONFIG');
    expect(validateConfig(makeConfig({ buffLimit: 1.5 }))?.code).toBe('INVALID_CONFIG');
    expect(validateConfig(makeConfig({ deck: { numericCopies: 9 } }))?.code).toBe('INVALID_CONFIG');
    expect(validateConfig(makeConfig({ deck: { faceCopies: -1 } }))?.code).toBe('INVALID_CONFIG');
  });

  it('uma config sem baralho (de JSON ou de outro pacote) volta como INVALID_CONFIG, sem lançar', () => {
    const withoutDeck: Partial<typeof DEFAULT_CONFIG> = { ...DEFAULT_CONFIG };
    delete withoutDeck.deck;
    for (const config of [withoutDeck, { ...DEFAULT_CONFIG, deck: null }, { ...DEFAULT_CONFIG, deck: 'oito' }, null, 'config']) {
      expect(validateConfig(config as unknown as RulesConfig)?.code).toBe('INVALID_CONFIG');
    }
    expect(validateConfig(withoutDeck as unknown as RulesConfig)?.message).toContain('deck');
  });
});
