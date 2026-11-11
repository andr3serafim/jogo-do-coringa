import { describe, expect, it } from 'vitest';
import { DECK_IDS, DEFAULT_LOOK, normalizeLook, RACE_IDS } from '../src/looks.ts';

describe('aparência (decks e raças, spec §2)', () => {
  it('as listas de ids e o padrão', () => {
    expect(DECK_IDS).toEqual(['cordel', 'bestiario', 'celestial']);
    expect(RACE_IDS).toEqual(['bufao', 'egipcio']);
    expect(DEFAULT_LOOK).toEqual({ deck: 'cordel', race: 'bufao' });
    expect(Object.isFrozen(DEFAULT_LOOK)).toBe(true);
  });

  it.each([[undefined], [null], ['bestiario'], [42], [[]], [['bestiario', 'egipcio']]])('o que não é objeto (%j) vira o padrão', (input) =>
    expect(normalizeLook(input)).toEqual(DEFAULT_LOOK),
  );

  it.each([
    { deck: 'cordel', race: 'bufao' },
    { deck: 'bestiario', race: 'bufao' },
    { deck: 'bestiario', race: 'egipcio' },
    { deck: 'celestial', race: 'bufao' },
    { deck: 'celestial', race: 'egipcio' },
  ] as const)('a combinação válida $deck + $race passa igual', (look) => expect(normalizeLook(look)).toEqual(look));

  it('a raça desconhecida vira o padrão só da raça', () => {
    expect(normalizeLook({ deck: 'bestiario', race: 'x' })).toEqual({ deck: 'bestiario', race: 'bufao' });
  });

  it('o deck desconhecido vira o Cordel, e a trava vem depois do padrão', () => {
    expect(normalizeLook({ deck: 'x', race: 'egipcio' })).toEqual({ deck: 'cordel', race: 'bufao' });
  });

  it('a trava (§2.1): o Cordel só anda com o Bufão', () => {
    expect(normalizeLook({ deck: 'cordel', race: 'egipcio' })).toEqual({ deck: 'cordel', race: 'bufao' });
  });

  it('um campo a mais não aparece na saída', () => {
    expect(normalizeLook({ deck: 'celestial', race: 'egipcio', extra: 1 })).toEqual({ deck: 'celestial', race: 'egipcio' });
  });

  it('um id que só existe no protótipo do objeto não vale', () => {
    expect(normalizeLook({ deck: 'toString', race: 'constructor' })).toEqual(DEFAULT_LOOK);
  });

  it('a saída é sempre um objeto novo: mudá-la não muda o padrão', () => {
    const out = normalizeLook(undefined);
    expect(out).not.toBe(DEFAULT_LOOK);
    out.deck = 'bestiario';
    expect(DEFAULT_LOOK.deck).toBe('cordel');
    const look = { deck: 'bestiario', race: 'egipcio' } as const;
    expect(normalizeLook(look)).not.toBe(look);
  });
});
