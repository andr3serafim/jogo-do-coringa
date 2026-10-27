// A prévia do ataque diz quando o golpe derruba (spec do polimento §8.1): "dano 24 · derruba Duda". O "derruba" sai do dano que
// o motor calculou (`damage` na vida de quem defende, `reflected` na de quem atacou, depois da Guarda, da Defesa Absoluta e do
// Reflect), nunca de ATK − DEF. O empate derruba: dano igual à vida zera o Coringa.
import { previewAttack } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { attackDeclaredText, attackPreviewText, brokenEffectText, threatPreviewText } from '../../src/model/copy.ts';
import { livesOf, previewsOf, previewsWithout } from '../../src/model/preview.ts';
import { viewAt, type SideSpec, type ViewSpec } from '../fixtures.ts';

/**
 * A Peleja: ATK 152 contra DEF 42 com um K na Guarda de Duda; do outro lado, 84 contra a minha DEF 46 com um K na minha Guarda.
 * Sem Guarda o dano é 110 (meu) e 38 (dele); com Reflect, 141 volta para mim e 77 para ele. (Sem a Pressão da mesa, que saiu no
 * sub-projeto 5, um J a mais de cada lado mantém as contas: 38 × 4 e 28 × 3.)
 */
const DRAFT: ViewSpec = {
  self: {
    hp: 187,
    hand: ['A'],
    attackRow: [8, 4, 10, 7, 9],
    defenseRow: [3, 6, 9, 5],
    attackBuffs: ['J', 'WILD', 'J'],
    defenseBuffs: ['Q'],
    guard: ['K'],
  },
  opponent: {
    hp: 214,
    attackRow: [6, 9, 3, 10],
    defenseRow: [5, 7, 2],
    attackBuffs: ['J', 'J'],
    defenseBuffs: ['Q', 'Q'],
    guard: ['K'],
  },
};

const mine = (spec: ViewSpec): string => {
  const previews = previewsOf(viewAt(spec));
  return attackPreviewText(previews.mine, 'Duda', previews.lives);
};
const threat = (spec: ViewSpec): string => {
  const previews = previewsOf(viewAt(spec));
  return threatPreviewText(previews.threat, 'Duda', previews.lives);
};
const declared = (spec: ViewSpec): string => {
  const view = viewAt(spec);
  return attackDeclaredText(previewAttack(view, 'opponent'), 'Duda', livesOf(view));
};

/** A Peleja com um lado trocado; `hp` de cada lado em `lives`. */
const draft = (self: SideSpec, opponent: SideSpec): ViewSpec => ({
  ...DRAFT,
  self: { ...DRAFT.self, ...self },
  opponent: { ...DRAFT.opponent, ...opponent },
});

describe('livesOf', () => {
  it('as vidas vêm da view, de cada lado', () => {
    expect(livesOf(viewAt(DRAFT))).toEqual({ self: 187, opponent: 214 });
    expect(previewsOf(viewAt(DRAFT)).lives).toEqual({ self: 187, opponent: 214 });
  });
});

describe('o seu ataque: o botão Atacar', () => {
  it('o dano que zera a vida de Duda derruba; o empate também', () => {
    const noGuard = { guard: [] };
    expect(mine(draft({}, { ...noGuard, hp: 109 }))).toBe('152 × 42 · dano 110 · derruba Duda');
    // Empate: o dano é 110 e a vida é 110.
    expect(mine(draft({}, { ...noGuard, hp: 110 }))).toBe('152 × 42 · dano 110 · derruba Duda');
  });

  it('um dano que deixa vida sobrando não derruba', () => {
    expect(mine(draft({}, { guard: [], hp: 111 }))).toBe('152 × 42 · dano 110');
    expect(mine(draft({}, { guard: [] }))).toBe('152 × 42 · dano 110');
  });

  it('a sua vida baixa não faz o seu golpe derrubar Duda (o lado certo é o dele)', () => {
    expect(mine(draft({ hp: 1 }, { guard: [], hp: 214 }))).toBe('152 × 42 · dano 110');
  });

  it('com a Guarda que absorve, nunca derruba, mesmo com ATK − DEF maior que a vida', () => {
    const view = viewAt(draft({}, { hp: 50 }));
    const { mine: preview } = previewsOf(view);
    expect(preview).toMatchObject({ outcome: 'GUARD_ABSORBS', net: 110, damage: 0 });
    expect(preview.net).toBeGreaterThan(50);
    expect(mine(draft({}, { hp: 50 }))).toBe('152 × 42 · o K de Duda absorve, dano 0');
    // Dano 0 nunca derruba, nem com a vida em 0.
    expect(mine(draft({}, { hp: 0 }))).toBe('152 × 42 · o K de Duda absorve, dano 0');
  });

  it('com a Defesa Absoluta que absorve, nunca derruba', () => {
    const spec = draft({}, { absoluteDefense: true, hp: 50 });
    expect(previewsOf(viewAt(spec)).mine).toMatchObject({ outcome: 'ABSOLUTE_DEFENSE', net: 110, damage: 0 });
    expect(mine(spec)).toBe('152 × 42 · Defesa Absoluta de Duda, dano 0');
  });

  it('o Ataque Absoluto fura a Guarda e derruba quando o dano alcança a vida', () => {
    const attack: SideSpec = { attackBuffs: ['J', 'J', 'J', 'J'] };
    // O dano vem do motor (5×, com a Guarda quebrada): o teste só o lê e o usa como vida.
    const { damage, attack: atk } = previewsOf(viewAt(draft(attack, {}))).mine;
    expect(damage).toBeGreaterThan(0);
    expect(mine(draft(attack, { hp: damage }))).toBe(`${atk} × 42 · Ataque Absoluto, dano ${damage} · derruba Duda`);
    expect(mine(draft(attack, { hp: damage + 1 }))).toBe(`${atk} × 42 · Ataque Absoluto, dano ${damage}`);
  });

  it('o Ataque Absoluto contra a Defesa Absoluta também derruba, e o dano é o do motor', () => {
    const spec = draft({ attackBuffs: ['J', 'J', 'J', 'J'] }, { absoluteDefense: true });
    const { damage, outcome } = previewsOf(viewAt(spec)).mine;
    expect(outcome).toBe('DAMAGE');
    expect(damage).toBeGreaterThan(0);
    expect(mine({ ...spec, opponent: { ...spec.opponent, hp: damage } })).toMatch(/Ataque Absoluto, dano \d+ · derruba Duda$/);
    expect(mine({ ...spec, opponent: { ...spec.opponent, hp: damage + 1 } })).not.toContain('derruba');
  });

  it('contra o Reflect de Duda, o texto de hoje e, se o que volta zera a sua vida, "derruba você"', () => {
    expect(previewsOf(viewAt(draft({}, { reflect: true }))).mine).toMatchObject({ outcome: 'REFLECTED', reflected: 141 });
    expect(mine(draft({ hp: 141 }, { reflect: true }))).toBe('152 × 11 · Reflect de Duda: 141 de dano volta para você · derruba você');
    expect(mine(draft({ hp: 100 }, { reflect: true }))).toBe('152 × 11 · Reflect de Duda: 141 de dano volta para você · derruba você');
  });

  it('contra o Reflect de Duda, o que volta e deixa vida sobrando não derruba', () => {
    expect(mine(draft({ hp: 142 }, { reflect: true }))).toBe('152 × 11 · Reflect de Duda: 141 de dano volta para você');
    expect(mine(draft({}, { reflect: true }))).toBe('152 × 11 · Reflect de Duda: 141 de dano volta para você');
  });

  it('contra o Reflect, a vida baixa de Duda não conta: o dano nele é 0', () => {
    expect(mine(draft({ hp: 187 }, { reflect: true, hp: 1 }))).toBe('152 × 11 · Reflect de Duda: 141 de dano volta para você');
  });

  it('contra o Reflect sem nada que volte (a sua Defesa Absoluta), não derruba', () => {
    const spec = draft({ absoluteDefense: true, hp: 1 }, { reflect: true });
    expect(previewsOf(viewAt(spec)).mine).toMatchObject({ outcome: 'REFLECTED', reflected: 0 });
    expect(mine(spec)).toBe('152 × 11 · Reflect de Duda: nada volta para você');
  });

  it('sem ataque, sem "derruba"', () => {
    expect(mine(draft({ attackRow: [] }, { guard: [], hp: 1 }))).toBe('0 × 0 · sem ataque');
  });
});

describe('o ataque de Duda contra você: a ameaça', () => {
  it('o dano que zera a sua vida derruba; o empate também', () => {
    expect(threat(draft({ guard: [], hp: 37 }, {}))).toBe('84 × sua Defesa 46 · dano 38 · derruba você');
    expect(threat(draft({ guard: [], hp: 38 }, {}))).toBe('84 × sua Defesa 46 · dano 38 · derruba você');
  });

  it('um dano que deixa vida sobrando não derruba', () => {
    expect(threat(draft({ guard: [], hp: 39 }, {}))).toBe('84 × sua Defesa 46 · dano 38');
  });

  it('a vida baixa de Duda não faz o golpe dele derrubar você (o lado certo é o seu)', () => {
    expect(threat(draft({ guard: [], hp: 187 }, { hp: 1 }))).toBe('84 × sua Defesa 46 · dano 38');
  });

  it('o seu K que absorve e a sua Defesa Absoluta nunca derrubam, mesmo com ATK − DEF maior que a vida', () => {
    expect(threat(draft({ hp: 10 }, {}))).toBe('84 × sua Defesa 46 · seu K absorve, dano 0');
    expect(threat(draft({ absoluteDefense: true, hp: 10 }, {}))).toBe('84 × sua Defesa 46 · sua Defesa Absoluta anula, dano 0');
  });

  it('o Ataque Absoluto dele derruba quando o dano alcança a sua vida', () => {
    const attack: SideSpec = { attackBuffs: ['J', 'J', 'J', 'J'] };
    const base = draft({ guard: [] }, attack);
    const { damage } = previewsOf(viewAt(base)).threat;
    expect(damage).toBeGreaterThan(0);
    expect(threat({ ...base, self: { ...base.self, hp: damage } })).toMatch(/Ataque Absoluto, dano \d+ · derruba você$/);
    expect(threat({ ...base, self: { ...base.self, hp: damage + 1 } })).not.toContain('derruba');
  });

  it('o seu Reflect que devolve o bastante derruba Duda; sem o bastante, não', () => {
    expect(previewsOf(viewAt(draft({ reflect: true }, {}))).threat).toMatchObject({ outcome: 'REFLECTED', reflected: 77 });
    expect(threat(draft({ reflect: true }, { hp: 77 }))).toBe('84 × 7 · seu Reflect devolve 77 de dano a Duda · derruba Duda');
    expect(threat(draft({ reflect: true }, { hp: 50 }))).toBe('84 × 7 · seu Reflect devolve 77 de dano a Duda · derruba Duda');
    expect(threat(draft({ reflect: true }, { hp: 78 }))).toBe('84 × 7 · seu Reflect devolve 77 de dano a Duda');
  });

  it('com o seu Reflect, a sua vida baixa não conta: você não leva nada', () => {
    expect(threat(draft({ reflect: true, hp: 1 }, { hp: 214 }))).toBe('84 × 7 · seu Reflect devolve 77 de dano a Duda');
  });

  it('o seu Reflect que anula o ataque (a Defesa Absoluta de Duda) não derruba ninguém', () => {
    const spec = draft({ reflect: true, hp: 1 }, { absoluteDefense: true, hp: 1 });
    expect(previewsOf(viewAt(spec)).threat).toMatchObject({ outcome: 'REFLECTED', reflected: 0 });
    expect(threat(spec)).toBe('84 × 7 · seu Reflect anula o ataque, dano 0');
  });
});

describe('o gatilho da janela de reação (o ataque de Duda declarado)', () => {
  it('diz "derruba você" quando o dano alcança a sua vida, e só então', () => {
    expect(declared(draft({ guard: [], hp: 38 }, {}))).toBe('Duda declarou ataque: 84 contra sua Defesa 46 → dano 38 · derruba você');
    expect(declared(draft({ guard: [], hp: 39 }, {}))).toBe('Duda declarou ataque: 84 contra sua Defesa 46 → dano 38');
  });

  it('com o K ou a Defesa Absoluta que absorvem, nunca derruba', () => {
    expect(declared(draft({ hp: 10 }, {}))).toBe('Duda declarou ataque: 84 contra sua Defesa 46 → seu K absorve');
    expect(declared(draft({ absoluteDefense: true, hp: 10 }, {}))).toBe(
      'Duda declarou ataque: 84 contra sua Defesa 46 → sua Defesa Absoluta anula',
    );
  });

  it('o Ataque Absoluto que derruba', () => {
    const base = draft({ guard: [] }, { attackBuffs: ['J', 'J', 'J', 'J'] });
    const { damage } = previewsOf(viewAt(base)).threat;
    expect(declared({ ...base, self: { ...base.self, hp: damage } })).toMatch(/→ Ataque Absoluto, dano \d+ · derruba você$/);
  });

  it('o seu Reflect que devolve o bastante derruba Duda', () => {
    expect(declared(draft({ reflect: true }, { hp: 77 }))).toBe('Duda declarou ataque: 84 → seu Reflect devolve 77 de dano a Duda · derruba Duda');
    expect(declared(draft({ reflect: true }, { hp: 78 }))).toBe('Duda declarou ataque: 84 → seu Reflect devolve 77 de dano a Duda');
  });
});

describe('o "e se a Armadilha quebrar este alvo": a linha longa', () => {
  it('sem o K, o seu ataque derruba Duda: a linha longa diz, e a frase curta do botão do alvo fica como era', () => {
    const view = viewAt(draft({}, { hp: 110 }));
    const before = previewsOf(view);
    const after = previewsWithout(view, view.opponent.guard[0]!.id);
    expect(brokenEffectText(before, after, 'Duda', 'long')).toBe('152 × 42 · dano 110 · derruba Duda');
    expect(brokenEffectText(before, after, 'Duda', 'short')).toBe('110 de dano');
  });

  it('com vida sobrando, a linha longa não diz "derruba"', () => {
    const view = viewAt(draft({}, { hp: 111 }));
    const after = previewsWithout(view, view.opponent.guard[0]!.id);
    expect(brokenEffectText(previewsOf(view), after, 'Duda', 'long')).toBe('152 × 42 · dano 110');
  });
});
