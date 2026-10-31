import { DEFAULT_CONFIG } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { RULES_SECTIONS } from '../../src/model/copy.ts';

// O resumo das regras tem os números fixos no texto (pt-BR, escrito à mão). Estes testes amarram esses números à config
// padrão do motor: se a config mudar, ou alguém mexer num número do texto, o resumo para de dizer a verdade e o teste cai.
// O W.O. (1 minuto fora, três estouros de tempo) é dos timers do servidor, não da config do motor, e fica de fora.

const items = RULES_SECTIONS.flatMap((section) => section.items);
const text = items.join('\n');
const { hp, rowLimit, buffLimit, cardsPerEquip, exodiaGuard, resurrectMinRounds, specialLimit, defenseHealGuard } = DEFAULT_CONFIG;

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
    ['o limite de especiais na mão (specialLimit, BURN)', `A mão guarda no máximo ${specialLimit!.max} especiais: a que passaria disso vai direto para o cemitério.`],
    ['os K que ligam a cura pela Defesa (defenseHealGuard)', `Com ${defenseHealGuard} K ou mais na Guarda`],
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

describe('resumo das regras: o bloco E3 + F2 + F3 (o motor de 2026-10-31)', () => {
  it('a BURN do limite de especiais é a forma padrão', () => {
    expect(specialLimit).toEqual({ max: 4, penalty: 'BURN' });
  });

  it('o Roubo: sem naipe, o dano que o K anula e que nunca mata, e a cura do mesmo valor', () => {
    const steal = items.find((i) => i.startsWith('A (Armadilha ou Roubo)'))!;
    expect(steal).toContain('ele perde o valor dela de vida (um K na Guarda dele anula esse dano; o roubo nunca mata) e você cura o mesmo valor');
    expect(text).not.toMatch(/♣|♠|♥|♦|naipe/);
  });

  it('o Reflect só responde (na janela de reação), e a Devastação tem item próprio', () => {
    const reflect = items.find((i) => i.startsWith('Reflect'))!;
    expect(reflect).toContain('só na janela de reação');
    expect(reflect).not.toMatch(/fica ativo|no seu turno/);
    expect(items.some((i) => i.startsWith('Devastação (K + A + J'))).toBe(true);
  });

  it('a iniciativa: o dano do Roubo não conta, e a faixa do centro mostra o placar', () => {
    const initiative = items.find((i) => i.startsWith('Iniciativa:'))!;
    expect(initiative).toContain('o do Roubo, não');
    expect(initiative).toContain('a faixa do centro mostra o dano de cada um na rodada');
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

  // No motor (`actions/reaction.ts`): a Armadilha (A) deixa a janela aberta, então cabem várias; o Reflect (F2) responde ao ataque
  // e à Devastação, e quem o levou pode responder com outro (`CANCEL_REFLECT`); a Armadilha não responde à Devastação.
  it('o segundo item separa o A (quantas quiser, e depois passa; contra o K, só um K da Guarda) do Reflect (contra o ataque e a Devastação; outro Reflect anula)', () => {
    expect(window[1]).toBe(
      'Quem responde pode usar A quantas vezes quiser e depois passa: contra o ataque, o A destrói um J, Q ou K de quem atacou; contra um K jogado, só um K da Guarda. Contra o ataque, também pode lançar um Reflect; contra a Devastação, o Reflect é a única resposta. Quem levou o Reflect pode responder com outro: os dois se anulam e o golpe não acontece.',
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
