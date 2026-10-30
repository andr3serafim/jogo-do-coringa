// Os textos do tutorial: uma dica por id, um parágrafo cada. A dica do anti-travamento saiu com a regra (E1 do sub-projeto 5).
import { describe, expect, it } from 'vitest';
import { hintParagraphs } from '../../src/model/tutorial-copy.ts';
import type { HintId } from '../../src/model/tutorial.ts';

const IDS: readonly HintId[] = ['equip', 'quad', 'order', 'firstAttack', 'buffs', 'trap', 'wild', 'reflect', 'end'];

describe('hintParagraphs', () => {
  it('toda dica tem texto, e as dicas são todas diferentes', () => {
    const texts = IDS.map((id) => hintParagraphs(id).join(' '));
    for (const text of texts) expect(text.trim()).not.toBe('');
    expect(new Set(texts).size).toBe(IDS.length);
  });

  it('toda dica tem um parágrafo só', () => {
    for (const id of IDS) expect(hintParagraphs(id)).toHaveLength(1);
  });

  it('nenhuma dica fala do anti-travamento nem da Pressão da mesa (as duas regras saíram no sub-projeto 5)', () => {
    for (const id of IDS) expect(hintParagraphs(id).join(' ')).not.toMatch(/travamento|Pressão|sem ninguém perder vida/);
  });

  it('a dica 6 diz que, contra um K jogado, o A só destrói um K da Guarda', () => {
    expect(hintParagraphs('trap')).toEqual([
      'Janela de reação: quando o oponente ataca, você pode responder com um A, que destrói um J, Q ou K dele; quando ele joga K, o A só destrói um K da Guarda. Ou passar. O A também vale no seu turno.',
    ]);
  });

  it('a dica do fim fala da Exódia e do convite para uma sala (o link "Jogar com um amigo" é da tela)', () => {
    const [end] = hintParagraphs('end');
    expect(end).toContain('Exódia: 4 K na Guarda');
    expect(end).toContain('Chame alguém para uma sala.');
  });
});
