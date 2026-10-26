// Os textos do tutorial: uma dica por id, a 9 em duas frases independentes e o número do anti-travamento vindo da config.
import { DEFAULT_CONFIG } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { hintParagraphs, PRESSURE_HINT, stallHint } from '../../src/model/tutorial-copy.ts';
import type { HintId } from '../../src/model/tutorial.ts';

const IDS: readonly HintId[] = ['equip', 'quad', 'order', 'firstAttack', 'buffs', 'trap', 'wild', 'reflect', 'pressure', 'end'];

describe('hintParagraphs', () => {
  it('toda dica tem texto, e as dicas são todas diferentes', () => {
    const texts = IDS.map((id) => hintParagraphs(id, DEFAULT_CONFIG.antiStallRounds).join(' '));
    for (const text of texts) expect(text.trim()).not.toBe('');
    expect(new Set(texts).size).toBe(IDS.length);
  });

  it('as dicas que não são a 9 têm um parágrafo só', () => {
    for (const id of IDS.filter((candidate) => candidate !== 'pressure')) {
      expect(hintParagraphs(id, DEFAULT_CONFIG.antiStallRounds)).toHaveLength(1);
    }
  });

  it('a dica 9 tem a frase da Pressão isolada, e a do anti-travamento com o número da partida', () => {
    const [pressure, stall, ...rest] = hintParagraphs('pressure', 7);
    expect(rest).toEqual([]);
    expect(pressure).toBe(PRESSURE_HINT);
    expect(pressure).toMatch(/^Pressão da mesa:/);
    // A frase da Pressão não carrega o número do anti-travamento (a que sai inteira no sub-projeto 5 é só ela).
    expect(pressure).not.toMatch(/7|Anti-travamento/);
    expect(stall).toBe(stallHint(7));
    expect(stall).toMatch(/^Anti-travamento: 7 rodadas de Ataque seguidas sem ninguém perder vida encerram a partida\./);
    expect(hintParagraphs('pressure', DEFAULT_CONFIG.antiStallRounds)[1]).toContain(`${DEFAULT_CONFIG.antiStallRounds} rodadas`);
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
