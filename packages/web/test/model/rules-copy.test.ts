import { DEFAULT_CONFIG } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { RULES_SECTIONS } from '../../src/model/copy.ts';

// O resumo das regras tem os números fixos no texto (pt-BR, escrito à mão). Estes testes amarram esses números à config
// padrão do motor: se a config mudar, ou alguém mexer num número do texto, o resumo para de dizer a verdade e o teste cai.
// O W.O. (1 minuto fora, três estouros de tempo) é dos timers do servidor, não da config do motor, e fica de fora.

const items = RULES_SECTIONS.flatMap((section) => section.items);
const text = items.join('\n');
const { hp, rowLimit, buffLimit, cardsPerEquip, exodiaGuard, resurrectMinRounds } = DEFAULT_CONFIG;

describe('resumo das regras: os números do texto seguem a config padrão do motor', () => {
  it.each([
    ['a vida inicial (hp)', `cada um começa com ${hp}, ou com a vida que a sala escolheu)`],
    ['o limite de cada fileira (rowLimit)', `(${rowLimit} cartas no máximo em cada)`],
    ['as cartas por Equipar (cardsPerEquip)', `cada jogador recebe ${cardsPerEquip} cartas`],
    ['os buffs que cabem (buffLimit)', `Cabem ${buffLimit} de cada`],
    ['a Defesa Absoluta pede buffLimit Q', `Defesa Absoluta (${buffLimit} Q)`],
    ['o Ataque Absoluto pede buffLimit J', `Ataque Absoluto (${buffLimit} J)`],
    ['os K da Guarda da Exódia (exodiaGuard)', `Exódia (${exodiaGuard} K na Guarda)`],
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

describe('resumo das regras: o fim da partida (o anti-travamento saiu na E1 do sub-projeto 5)', () => {
  const end = RULES_SECTIONS.find((section) => section.title === 'Fim da partida')!.items;

  it('diz que não há limite de rodadas e como a partida acaba', () => {
    expect(end).toContain('Não há limite de rodadas: a partida só acaba pela vida, pela Exódia ou por W.O.');
  });

  it('não fala mais em anti-travamento nem em empate', () => {
    expect(text).not.toMatch(/travamento|empata/);
  });
});

describe('resumo das regras: a Defesa Absoluta dura até o ataque (motor: `endTurn` com `attacked`)', () => {
  const item = items.find((i) => i.startsWith('Defesa Absoluta'))!;

  it('diz que dura até o oponente atacar e que o Q sai depois desse ataque', () => {
    expect(item).toContain('até o oponente atacar');
    expect(item).toContain('Depois do primeiro ataque do oponente, ela acaba e 1 Q vai para o cemitério.');
  });

  it('não promete mais o fim no próximo turno', () => {
    expect(item).not.toContain('próximo turno');
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


describe('resumo das regras: o Equipar livre (E2 do sub-projeto 5; motor: `order` da ação EQUIP)', () => {
  it('diz que você vê as numéricas e escolhe a fileira e a ordem, e não fala mais da ordem do monte', () => {
    const equip = items.find((item) => item.startsWith('Equipar:'))!;
    expect(equip).toContain('você escolhe a fileira e a ordem de cada uma');
    expect(equip).toContain('a primeira que você põe numa fileira fica na frente da fila');
    expect(equip).not.toMatch(/ordem em que saíram/);
  });
});
