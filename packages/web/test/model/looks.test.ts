import type { Card, Rank } from '@coringa/engine';
import { DEFAULT_LOOK, type Look } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { artOf, AURA, botLook, packsOf, RACE_TIER, tierOf } from '../../src/model/looks.ts';

const num = (value: Rank): Card => ({ id: `n${value}`, kind: 'NUM', value, suit: 'copas' });
const K: Card = { id: 'k', kind: 'K', suit: 'paus' };
const J: Card = { id: 'j', kind: 'J', suit: 'ouros' };
const Q: Card = { id: 'q', kind: 'Q', suit: 'espadas' };
const A: Card = { id: 'a', kind: 'A', suit: 'copas' };
const WILD: Card = { id: 'w', kind: 'WILD' };

const BESTIARIO_BUFAO: Look = { deck: 'bestiario', race: 'bufao' };
const BESTIARIO_EGIPCIO: Look = { deck: 'bestiario', race: 'egipcio' };
const CELESTIAL_EGIPCIO: Look = { deck: 'celestial', race: 'egipcio' };

describe('a faixa da numérica (spec dos decks §2.2)', () => {
  it.each([
    [2, 1],
    [3, 1],
    [4, 2],
    [5, 2],
    [6, 3],
    [7, 3],
    [8, 4],
    [9, 4],
    [10, 5],
  ] as const)('o %i fica na faixa %i', (value, tier) => expect(tierOf(value)).toBe(tier));
});

describe('a arte de cada carta numa aparência', () => {
  it('a aparência padrão é toda de cordel', () => {
    for (const card of [num(2), num(7), num(10), K, J, Q, A, WILD]) expect(artOf(card, DEFAULT_LOOK)).toBeNull();
  });

  it('o deck veste só as numéricas, com o valor em dois dígitos', () => {
    expect(artOf(num(7), BESTIARIO_BUFAO)).toEqual({ pack: 'bestiario', key: '07' });
    expect(artOf(num(10), BESTIARIO_BUFAO)).toEqual({ pack: 'bestiario', key: '10' });
    expect(artOf(num(2), CELESTIAL_EGIPCIO)).toEqual({ pack: 'celestial', key: '02' });
  });

  it('com o Bufão, as especiais ficam de cordel', () => {
    for (const card of [K, J, Q, A, WILD]) expect(artOf(card, BESTIARIO_BUFAO)).toBeNull();
  });

  it('a raça Egípcia veste K, J, Q, A e o Selvagem', () => {
    expect(artOf(K, BESTIARIO_EGIPCIO)).toEqual({ pack: 'egipcio', key: 'K' });
    expect(artOf(J, BESTIARIO_EGIPCIO)).toEqual({ pack: 'egipcio', key: 'J' });
    expect(artOf(Q, BESTIARIO_EGIPCIO)).toEqual({ pack: 'egipcio', key: 'Q' });
    expect(artOf(A, BESTIARIO_EGIPCIO)).toEqual({ pack: 'egipcio', key: 'A' });
    expect(artOf(WILD, CELESTIAL_EGIPCIO)).toEqual({ pack: 'egipcio', key: 'WILD' });
    expect(artOf(num(9), BESTIARIO_EGIPCIO)).toEqual({ pack: 'bestiario', key: '09' });
  });
});

describe('os pacotes de uma aparência', () => {
  it('nenhum no padrão; o deck e a raça fantasy, sem repetir', () => {
    expect(packsOf(DEFAULT_LOOK)).toEqual([]);
    expect(packsOf(BESTIARIO_BUFAO)).toEqual(['bestiario']);
    expect(packsOf(BESTIARIO_EGIPCIO)).toEqual(['bestiario', 'egipcio']);
    expect(packsOf(CELESTIAL_EGIPCIO)).toEqual(['celestial', 'egipcio']);
  });
});

describe('a aura por faixa (spec dos decks §4.1)', () => {
  it('nenhuma na faixa 1, e cresce até a 5', () => {
    expect(AURA).toEqual({
      1: null,
      2: { blur: 5, spread: 1, alpha: 0.35 },
      3: { blur: 8, spread: 1, alpha: 0.5 },
      4: { blur: 10, spread: 2, alpha: 0.6 },
      5: { blur: 14, spread: 3, alpha: 0.8 },
    });
  });

  it('as especiais de raça usam a faixa 3', () => {
    expect(RACE_TIER).toBe(3);
  });
});

describe('a aparência do bot no treino (fatia 2, G1)', () => {
  it.each([
    [{ deck: 'cordel', race: 'bufao' }, { deck: 'cordel', race: 'bufao' }],
    [{ deck: 'cordel', race: 'egipcio' }, { deck: 'cordel', race: 'bufao' }],
    [{ deck: 'bestiario', race: 'bufao' }, { deck: 'celestial', race: 'egipcio' }],
    [{ deck: 'bestiario', race: 'egipcio' }, { deck: 'celestial', race: 'egipcio' }],
    [{ deck: 'celestial', race: 'bufao' }, { deck: 'bestiario', race: 'egipcio' }],
    [{ deck: 'celestial', race: 'egipcio' }, { deck: 'bestiario', race: 'egipcio' }],
  ] as const)('com %o, o bot joga com %o', (mine, bot) => {
    expect(botLook(mine)).toEqual(bot);
  });

  it('a saída nunca é o objeto congelado do padrão, nem o de entrada', () => {
    expect(botLook(DEFAULT_LOOK)).not.toBe(DEFAULT_LOOK);
    expect(Object.isFrozen(botLook(DEFAULT_LOOK))).toBe(false);
    const mine: Look = { deck: 'cordel', race: 'bufao' };
    expect(botLook(mine)).not.toBe(mine);
  });
});
