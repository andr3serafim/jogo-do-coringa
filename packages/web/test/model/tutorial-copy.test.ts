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

  it('a dica 1 diz que você escolhe a ordem das numéricas (Equipar livre, E2 do sub-projeto 5)', () => {
    const [equip] = hintParagraphs('equip');
    expect(equip).toContain('na ordem que quiser');
    expect(equip).not.toMatch(/ordem em que saíram/);
  });

  it('a dica da Armadilha diz que, contra um K jogado, o A só destrói um K da Guarda, e que no seu turno ele também rouba', () => {
    expect(hintParagraphs('trap')).toEqual([
      'Janela de reação: quando o oponente ataca, você pode responder com um A, que destrói um J, Q ou K dele; quando ele joga K, o A só destrói um K da Guarda. Ou passar. No seu turno, o A vale como Armadilha ou como Roubo.',
    ]);
  });

  it('a dica do Roubo diz o dano que o K anula e que nunca mata, e a cura do mesmo valor', () => {
    const [steal] = hintParagraphs('steal');
    expect(steal).toContain('um K na Guarda dele anula esse dano, e o roubo nunca mata');
    expect(steal).toContain('você cura o mesmo valor');
  });

  it('a dica do limite diz os 4 especiais e a queimada', () => {
    expect(hintParagraphs('limit')).toEqual([
      'Sua mão guarda no máximo 4 especiais: a que passaria disso vai direto para o cemitério. Jogue as especiais para abrir espaço.',
    ]);
  });

  it('a dica do fim fala da Exódia e do convite para uma sala (o link "Jogar com um amigo" é da tela)', () => {
    const [end] = hintParagraphs('end');
    expect(end).toContain('Exódia: 4 K na Guarda');
    expect(end).toContain('Chame alguém para uma sala.');
  });
});
