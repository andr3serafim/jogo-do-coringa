// Os textos do tutorial: uma dica por id, um parágrafo cada, e o número do anti-travamento (dica 9) vindo da config.
import { DEFAULT_CONFIG } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { hintParagraphs, stallHint } from '../../src/model/tutorial-copy.ts';
import type { HintId } from '../../src/model/tutorial.ts';

const IDS: readonly HintId[] = ['equip', 'quad', 'order', 'firstAttack', 'buffs', 'trap', 'wild', 'reflect', 'stall', 'end'];

describe('hintParagraphs', () => {
  it('toda dica tem texto, e as dicas são todas diferentes', () => {
    const texts = IDS.map((id) => hintParagraphs(id, DEFAULT_CONFIG.antiStallRounds).join(' '));
    for (const text of texts) expect(text.trim()).not.toBe('');
    expect(new Set(texts).size).toBe(IDS.length);
  });

  it('toda dica tem um parágrafo só', () => {
    for (const id of IDS) expect(hintParagraphs(id, DEFAULT_CONFIG.antiStallRounds)).toHaveLength(1);
  });

  it('a dica 9 é o anti-travamento, com o número de rodadas da partida (a Pressão da mesa saiu no sub-projeto 5)', () => {
    expect(hintParagraphs('stall', 7)).toEqual([stallHint(7)]);
    expect(stallHint(7)).toMatch(/^Anti-travamento: 7 rodadas de Ataque seguidas sem ninguém perder vida encerram a partida\./);
    expect(hintParagraphs('stall', DEFAULT_CONFIG.antiStallRounds)[0]).toContain(`${DEFAULT_CONFIG.antiStallRounds} rodadas`);
    for (const id of IDS) expect(hintParagraphs(id, 3).join(' ')).not.toMatch(/Pressão/);
  });

  it('a dica 6 diz que, contra um K jogado, o A só destrói um K da Guarda', () => {
    expect(hintParagraphs('trap', DEFAULT_CONFIG.antiStallRounds)).toEqual([
      'Janela de reação: quando o oponente ataca, você pode responder com um A, que destrói um J, Q ou K dele; quando ele joga K, o A só destrói um K da Guarda. Ou passar. O A também vale no seu turno.',
    ]);
  });

  it('a dica do fim fala da Exódia e do convite para uma sala (o link "Jogar com um amigo" é da tela)', () => {
    const [end] = hintParagraphs('end', DEFAULT_CONFIG.antiStallRounds);
    expect(end).toContain('Exódia: 4 K na Guarda');
    expect(end).toContain('Chame alguém para uma sala.');
  });
});
