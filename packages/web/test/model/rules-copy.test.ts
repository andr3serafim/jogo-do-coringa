import { DEFAULT_CONFIG } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { RULES_SECTIONS } from '../../src/model/copy.ts';

// O resumo das regras tem os números fixos no texto (pt-BR, escrito à mão). Estes testes amarram esses números à config
// padrão do motor: se a config mudar, ou alguém mexer num número do texto, o resumo para de dizer a verdade e o teste cai.
// O W.O. (1 minuto fora, três estouros de tempo) é dos timers do servidor, não da config do motor, e fica de fora.

const items = RULES_SECTIONS.flatMap((section) => section.items);
const text = items.join('\n');
const { hp, rowLimit, buffLimit, cardsPerEquip, antiStallRounds, exodiaGuard, resurrectMinRounds } = DEFAULT_CONFIG;

describe('resumo das regras: os números do texto seguem a config padrão do motor', () => {
  it.each([
    ['a vida inicial (hp)', `cada um começa com ${hp}, ou com a vida que a sala escolheu)`],
    ['o limite de cada fileira (rowLimit)', `(${rowLimit} cartas no máximo em cada)`],
    ['as cartas por Equipar (cardsPerEquip)', `cada jogador recebe ${cardsPerEquip} cartas`],
    ['os buffs que cabem (buffLimit)', `Cabem ${buffLimit} de cada`],
    ['a Defesa Absoluta pede buffLimit Q', `Defesa Absoluta (${buffLimit} Q)`],
    ['o Ataque Absoluto pede buffLimit J', `Ataque Absoluto (${buffLimit} J)`],
    ['os K da Guarda da Exódia (exodiaGuard)', `Exódia (${exodiaGuard} K na Guarda)`],
    ['as rodadas do anti-travamento (antiStallRounds)', `Anti-travamento: ${antiStallRounds} rodadas de Ataque seguidas`],
    ['a garantia da Ressurreição (resurrectMinRounds)', `garantia de ${resurrectMinRounds} rodadas depois de formada`],
  ])('%s', (_label, phrase) => {
    expect(text).toContain(phrase);
  });

  it('a config padrão tem os valores que o texto assume (4 buffs, 4 K na Guarda), e o texto os diz em algarismos', () => {
    expect(buffLimit).toBe(4);
    expect(exodiaGuard).toBe(4);
    expect(text).toContain('Cabem 4 de cada');
    expect(text).toContain('Exódia (4 K na Guarda)');
  });
});

describe('resumo das regras: a Iniciativa', () => {
  it('tem um item próprio na seção Rodadas, logo depois do Ataque', () => {
    const rounds = RULES_SECTIONS.find((section) => section.title === 'Rodadas')!.items;
    const attack = rounds.findIndex((item) => item.startsWith('Ataque:'));
    expect(attack).toBeGreaterThanOrEqual(0);
    expect(rounds[attack + 1]).toMatch(/^Iniciativa: começa sorteada\./);
    expect(rounds[attack + 1]).toContain('No empate, inclusive 0 a 0, não muda.');
  });
});

describe('resumo das regras: a janela de reação diz o que o motor faz', () => {
  const window = RULES_SECTIONS.find((section) => section.title === 'Janela de reação')!.items;

  // No motor (`actions/reaction.ts`): a Armadilha (A) deixa a janela aberta, então cabem várias; anular o Reflect ou se
  // proteger dele fecha a janela na hora (`closeReaction`); e o A é recusado na janela do Reflect.
  it('o segundo item separa o A (quantas quiser, e depois passa; contra o K, só um K da Guarda) do Reflect (anular ou proteger fecha na hora)', () => {
    expect(window[1]).toBe(
      'Quem responde pode usar A quantas vezes quiser e depois passa: contra o ataque, o A destrói um J, Q ou K de quem atacou; contra um K jogado, só um K da Guarda. Contra um Reflect, pode anulá-lo ou se proteger, e isso fecha a janela na hora. Não há resposta a uma resposta.',
    );
  });

  it('não promete "quantas respostas quiser" também contra o Reflect', () => {
    expect(text).not.toContain('Pode dar quantas respostas quiser');
  });
});

