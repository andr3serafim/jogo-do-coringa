import type { Card, Rank } from '@coringa/engine';
import { DEFAULT_LOOK, type Look } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { artOf, AURA, botLook, packsOf, RACE_TIER, recordedLooks, roomLooks, sentLook, tierOf } from '../../src/model/looks.ts';

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

describe('a aparência que vai pelo fio (fatia 3, H1)', () => {
  it('o padrão não vai: undefined, para o pedido ficar o de hoje', () => {
    expect(sentLook(DEFAULT_LOOK)).toBeUndefined();
    expect(sentLook({ deck: 'cordel', race: 'bufao' })).toBeUndefined();
  });

  it.each<Look>([BESTIARIO_EGIPCIO, { deck: 'celestial', race: 'bufao' }, BESTIARIO_BUFAO, CELESTIAL_EGIPCIO])(
    '%o vai igual, num objeto novo',
    (look) => {
      const sent = sentLook(look);
      expect(sent).toEqual(look);
      expect(sent).not.toBe(look);
    },
  );
});

describe('as aparências da sala online (fatia 3, §8.3 e H2)', () => {
  const CELESTIAL_BUFAO: Look = { deck: 'celestial', race: 'bufao' };

  it('cada lado com a do seu assento, vista de cada cadeira', () => {
    const seats = [
      { playerId: 'p1' as const, look: BESTIARIO_EGIPCIO },
      { playerId: 'p2' as const, look: CELESTIAL_BUFAO },
    ];
    expect(roomLooks(seats, 'p1', 'p2')).toEqual({ mine: BESTIARIO_EGIPCIO, theirs: CELESTIAL_BUFAO });
    expect(roomLooks(seats, 'p2', 'p1')).toEqual({ mine: CELESTIAL_BUFAO, theirs: BESTIARIO_EGIPCIO });
  });

  it('o assento sem look, ou ainda ausente (o lobby antes de alguém entrar), é o padrão', () => {
    expect(roomLooks([{ playerId: 'p1', look: BESTIARIO_EGIPCIO }, { playerId: 'p2' }], 'p1', 'p2')).toEqual({
      mine: BESTIARIO_EGIPCIO,
      theirs: DEFAULT_LOOK,
    });
    expect(roomLooks([{ playerId: 'p1', look: BESTIARIO_EGIPCIO }], 'p1', 'p2').theirs).toEqual(DEFAULT_LOOK);
    expect(roomLooks([], 'p1', 'p2')).toEqual({ mine: DEFAULT_LOOK, theirs: DEFAULT_LOOK });
  });

  it('o look fora da lista no assento sai normalizado', () => {
    const odd = { deck: 'xyz', race: 'egipcio' } as unknown as Look;
    expect(roomLooks([{ playerId: 'p2', look: odd }], 'p1', 'p2').theirs).toEqual(DEFAULT_LOOK);
    const locked = { deck: 'cordel', race: 'egipcio' } as unknown as Look;
    expect(roomLooks([{ playerId: 'p1', look: locked }], 'p1', 'p2').mine).toEqual(DEFAULT_LOOK);
  });

  it('nunca devolve o objeto do assento (a mensagem fica na sessão)', () => {
    const seats = [{ playerId: 'p1' as const, look: BESTIARIO_EGIPCIO }];
    expect(roomLooks(seats, 'p1', 'p2').mine).not.toBe(BESTIARIO_EGIPCIO);
  });
});

describe('as aparências que a partida guardada leva (G3 e H5)', () => {
  it('as duas no padrão: nenhuma, para a linha ficar a de hoje', () => {
    expect(recordedLooks(DEFAULT_LOOK, { deck: 'cordel', race: 'bufao' })).toBeUndefined();
  });

  it('uma só fora do padrão: as duas, em objetos novos', () => {
    const recorded = recordedLooks(DEFAULT_LOOK, CELESTIAL_EGIPCIO);
    expect(recorded).toEqual({ me: DEFAULT_LOOK, opponent: CELESTIAL_EGIPCIO });
    expect(recorded!.opponent).not.toBe(CELESTIAL_EGIPCIO);
    expect(recordedLooks(BESTIARIO_BUFAO, DEFAULT_LOOK)).toEqual({ me: BESTIARIO_BUFAO, opponent: DEFAULT_LOOK });
  });
});
