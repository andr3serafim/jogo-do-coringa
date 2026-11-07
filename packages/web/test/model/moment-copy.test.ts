// O texto da placa do momento (bloco A dos pontos do playtest, ponto 1): o que a especial do oponente fez, com os números do motor (os
// totais de `attackPower` e `defensePower` da `view` de depois do passo; decisoes.md 2026-11-03 (5), A5).
import { defenseHealActive, previewAttack, type GameEvent, type NumCard, type PlayerView, type SpecialCard } from '@coringa/engine';
import { namesFor } from '@coringa/sim/text';
import { describe, expect, it } from 'vitest';
import { healRibbon, momentPlate, plateLine } from '../../src/model/copy.ts';
import { scenarioAt } from '../fixtures.ts';

const NAMES = namesFor('p1', 'Bot');
const face = (id: string, kind: SpecialCard['kind']): SpecialCard =>
  kind === 'WILD' ? { id, kind: 'WILD' } : { id, kind, suit: 'ouros' };
const num = (id: string, value: NumCard['value']): NumCard => ({ id, kind: 'NUM', value, suit: 'copas' });

describe('a placa do momento', () => {
  it('o J do Bot: o Ataque dele, ou o Absoluto armado com 4', () => {
    const { view } = scenarioAt({ opponent: { attackRow: [10, 9], attackBuffs: ['J'] } });
    const played: GameEvent = { type: 'BuffPlayed', player: 'p2', card: face('j1', 'J'), as: 'J' };
    expect(momentPlate(played, view, NAMES)).toEqual({ title: 'Bot pôs 1 J nos Bônus de ataque', consequence: 'o Ataque dele vai a 38' });
    const armed = scenarioAt({ opponent: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] } }).view;
    expect(momentPlate(played, armed, NAMES)?.consequence).toBe('4 J: o próximo ataque dele é Absoluto');
    // O limite dos Bônus é do motor (`config.buffLimit`), não da interface.
    const three = scenarioAt({ opponent: { attackRow: [10], attackBuffs: ['J', 'J', 'J'] } }).view;
    expect(momentPlate(played, { ...three, config: { ...three.config, buffLimit: 3 } }, NAMES)?.consequence).toBe('3 J: o próximo ataque dele é Absoluto');
  });

  it('o Selvagem como Q: a Defesa dele, ou a Defesa Absoluta', () => {
    const { view } = scenarioAt({ opponent: { defenseRow: [8, 7], defenseBuffs: ['WILD'] } });
    const played: GameEvent = { type: 'BuffPlayed', player: 'p2', card: face('w1', 'WILD'), as: 'Q' };
    expect(momentPlate(played, view, NAMES)).toEqual({
      title: 'Bot pôs o Selvagem como Q nos Bônus de defesa',
      consequence: 'a Defesa dele vai a 30',
    });
    const absolute = scenarioAt({ opponent: { defenseRow: [8], absoluteDefense: true } }).view;
    expect(momentPlate(played, absolute, NAMES)?.consequence).toBe('4 Q: a Defesa Absoluta começa');
  });

  it('a Guarda: a cura passiva com 2 K, e nenhuma palavra da Exódia com 3', () => {
    const one: GameEvent = { type: 'GuardPlayed', player: 'p2', cards: [face('k1', 'K')] };
    expect(momentPlate(one, scenarioAt({ opponent: { guard: ['K'] } }).view, NAMES)).toEqual({
      title: 'Bot pôs 1 K na Guarda',
      consequence: 'o K absorve um golpe inteiro',
    });
    // Com o mínimo da cura, o golpe comum que um K absorve deixa 1 K, e aquele golpe não cura: a linha da placa de estado
    // (decisoes.md 2026-11-07 (1)).
    const two: GameEvent = { type: 'GuardPlayed', player: 'p2', cards: [face('k1', 'K'), face('k2', 'K')] };
    const twoK = scenarioAt({ self: { attackRow: [10, 9] }, opponent: { guard: ['K', 'K'], defenseRow: [3] } }).view;
    const absorbed = previewAttack(twoK, 'self');
    expect(absorbed.outcome).toBe('GUARD_ABSORBS');
    expect(defenseHealActive({ guard: twoK.opponent.guard.slice(absorbed.breaks.defenderGuard) }, twoK.config)).toBe(false);
    expect(momentPlate(two, twoK, NAMES)).toEqual({
      title: 'Bot pôs 2 K na Guarda',
      consequence: 'com 2 K depois do golpe, a Defesa dele que cai vira vida',
    });
    expect(momentPlate(two, twoK, NAMES)?.consequence).toBe(plateLine('cura', false, twoK));
    // Com 3 K, o golpe que um K absorve deixa 2, e a cura vale: a frase de antes é verdadeira.
    const threeK = scenarioAt({ self: { attackRow: [10, 9] }, opponent: { guard: ['K', 'K', 'K'], defenseRow: [3] } }).view;
    expect(defenseHealActive({ guard: threeK.opponent.guard.slice(previewAttack(threeK, 'self').breaks.defenderGuard) }, threeK.config)).toBe(true);
    const three = momentPlate(one, threeK, NAMES)!;
    expect(three.consequence).toBe('com 3 K, a Defesa dele que cai o cura');
    expect(`${three.title} ${three.consequence}`).not.toMatch(/Exódia/);
  });

  it('a Guarda contra o seu Ataque Absoluto armado: os K quebram todos, antes da cura, como no motor; o Reflect dele o seguraria', () => {
    const two: GameEvent = { type: 'GuardPlayed', player: 'p2', cards: [face('k1', 'K'), face('k2', 'K')] };
    const armed = scenarioAt({ self: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { guard: ['K', 'K'], defenseRow: [7] } }).view;
    expect(previewAttack(armed, 'self').breaks.defenderGuard).toBe(2);
    expect(momentPlate(two, armed, NAMES)?.consequence).toBe('o seu Ataque Absoluto quebra todos os K');
    const mirror = scenarioAt({ self: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { guard: ['K', 'K'], reflect: true } }).view;
    expect(previewAttack(mirror, 'self').breaks.defenderGuard).toBe(0);
    expect(momentPlate(two, mirror, NAMES)?.consequence).toBe('com 2 K depois do golpe, a Defesa dele que cai vira vida');
  });

  it('a Armadilha num J, num Q e num K seus', () => {
    const trap = (target: SpecialCard): GameEvent => ({ type: 'TrapUsed', player: 'p2', card: face('a1', 'A'), target, targetOwner: 'p1' });
    const { view } = scenarioAt({ self: { attackRow: [10, 9], attackBuffs: ['J'], defenseRow: [6], guard: ['K'] } });
    expect(momentPlate(trap(face('j9', 'J')), view, NAMES)).toEqual({ title: 'Bot quebra 1 J seu', consequence: 'o seu Ataque cai para 38' });
    expect(momentPlate(trap(face('q9', 'Q')), view, NAMES)).toEqual({ title: 'Bot quebra 1 Q seu', consequence: 'a sua Defesa cai para 6' });
    expect(momentPlate(trap(face('k9', 'K')), view, NAMES)).toEqual({ title: 'Bot quebra 1 K seu', consequence: 'a sua Guarda fica com 1 K' });
    const empty = scenarioAt({ self: { guard: [] } }).view;
    expect(momentPlate(trap(face('k9', 'K')), empty, NAMES)?.consequence).toBe('a sua Guarda ficou vazia');
  });

  it('o Selvagem como alvo: só o título (o evento não diz de que zona ele saiu)', () => {
    const trap: GameEvent = { type: 'TrapUsed', player: 'p2', card: face('a1', 'A'), target: face('w9', 'WILD'), targetOwner: 'p1' };
    expect(momentPlate(trap, scenarioAt().view, NAMES)).toEqual({ title: 'Bot quebra o seu Selvagem', consequence: null });
  });

  it('o Sacrifício: a carta dele e a sua', () => {
    const { view } = scenarioAt({ self: { attackRow: [10] } });
    const sacrificed: GameEvent = { type: 'Sacrificed', player: 'p2', card: face('j1', 'J'), target: face('j9', 'J'), targetOwner: 'p1' };
    expect(momentPlate(sacrificed, view, NAMES)).toEqual({ title: 'Bot sacrifica 1 J e quebra 1 J seu', consequence: 'o seu Ataque cai para 10' });
  });

  it('o Roubo: a numérica que saiu e a fileira sua que caiu', () => {
    const { view } = scenarioAt({ self: { defenseRow: [6, 4] } });
    const stolen: GameEvent = { type: 'CardStolen', player: 'p2', from: 'p1', card: num('n7', 7), fromRow: 'DEF', toRow: 'ATK', ace: face('a1', 'A') };
    expect(momentPlate(stolen, view, NAMES)).toEqual({ title: 'Bot rouba o seu 7 da Defesa', consequence: 'a sua Defesa cai para 10' });
  });

  it('fora das cinco especiais, nenhuma placa', () => {
    expect(momentPlate({ type: 'TurnStarted', player: 'p2' }, scenarioAt().view, NAMES)).toBeNull();
  });
});

describe('a faixa da primeira cura passiva (bloco A do playtest, ponto 9)', () => {
  const six = num('n6', 6);

  it('a regra e a conta do motor, numa linha', () => {
    const { view } = scenarioAt({ self: { guard: ['K', 'K'], defenseBuffs: ['Q', 'Q'] } });
    const healed: GameEvent = { type: 'Healed', player: 'p1', amount: 18, source: 'DEFENSE', card: six };
    expect(healRibbon(healed, view)).toEqual({ title: 'Cura passiva', reason: '2 K na Guarda: a Defesa que cai vira vida · 6 × (1 + 2 Q) = 18' });
  });

  it('a cura que bate na vida cheia diz que parou nela; a do oponente, a Guarda dele', () => {
    const { view } = scenarioAt({ opponent: { guard: ['K', 'K', 'K'], defenseBuffs: [] } });
    const healed: GameEvent = { type: 'Healed', player: 'p2', amount: 2, source: 'DEFENSE', card: six };
    expect(healRibbon(healed, view).reason).toBe('3 K na Guarda: a Defesa que cai vira vida · 6 × (1 + 0 Q) = 6 · até a vida cheia');
  });
});

describe('as placas de estado no caso de borda (decisoes.md 2026-11-04 (1)): a linha segue o golpe que o motor dá', () => {
  it('a Defesa Absoluta: só o Ataque Absoluto do outro fura, e o Reflect de quem a tem vem antes', () => {
    const pierced = scenarioAt({ self: { absoluteDefense: true, defenseRow: [8] }, opponent: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] } }).view;
    expect(previewAttack(pierced, 'opponent').outcome).toBe('DAMAGE');
    expect(plateLine('defesa', true, pierced)).toBe('o Ataque Absoluto dele fura a imunidade');
    const mine = scenarioAt({ self: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { absoluteDefense: true } }).view;
    expect(previewAttack(mine, 'self').outcome).toBe('DAMAGE');
    expect(plateLine('defesa', false, mine)).toBe('o seu Ataque Absoluto fura a imunidade');
    const reflected = scenarioAt({ self: { absoluteDefense: true, reflect: true }, opponent: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] } }).view;
    expect(previewAttack(reflected, 'opponent').outcome).toBe('REFLECTED');
    expect(plateLine('defesa', true, reflected)).toBe('imune até o golpe dele');
    const calm = scenarioAt({ self: { absoluteDefense: true }, opponent: { attackRow: [10], attackBuffs: ['J'] } }).view;
    expect(previewAttack(calm, 'opponent').outcome).toBe('ABSOLUTE_DEFENSE');
    expect(plateLine('defesa', true, calm)).toBe('imune até o golpe dele');
  });

  it('o Ataque Absoluto armado: contra o Reflect do alvo, os K ficam', () => {
    const mirror = scenarioAt({ self: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { guard: ['K'], reflect: true } }).view;
    expect(previewAttack(mirror, 'self')).toMatchObject({ outcome: 'REFLECTED', breaks: { defenderGuard: 0 } });
    expect(plateLine('ataque', true, mirror)).toBe('o Reflect dele segura o seu golpe');
    const theirs = scenarioAt({ self: { guard: ['K'], reflect: true }, opponent: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] } }).view;
    expect(previewAttack(theirs, 'opponent').outcome).toBe('REFLECTED');
    expect(plateLine('ataque', false, theirs)).toBe('o seu Reflect segura o golpe dele');
    const open = scenarioAt({ self: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { guard: ['K', 'K'] } }).view;
    expect(previewAttack(open, 'self').breaks.defenderGuard).toBe(2);
    expect(plateLine('ataque', true, open)).toBe('o seu próximo ataque quebra todos os K');
  });

  it('o Reflect: contra quem ataca sob Defesa Absoluta, segura o golpe e não devolve nada', () => {
    const held = scenarioAt({ self: { reflect: true }, opponent: { attackRow: [10, 9], absoluteDefense: true } }).view;
    const preview = previewAttack(held, 'opponent');
    expect(preview).toMatchObject({ outcome: 'REFLECTED', damage: 0, reflected: 0 });
    expect(preview.net).toBeGreaterThan(0);
    expect(plateLine('reflect', true, held)).toBe('segura o próximo golpe dele, sem devolver');
    const mine = scenarioAt({ self: { attackRow: [10, 9], absoluteDefense: true }, opponent: { reflect: true } }).view;
    expect(plateLine('reflect', false, mine)).toBe('segura o seu próximo golpe, sem devolver');
    const back = scenarioAt({ self: { reflect: true }, opponent: { attackRow: [10, 9] } }).view;
    expect(previewAttack(back, 'opponent').reflected).toBeGreaterThan(0);
    expect(plateLine('reflect', true, back)).toBe('o próximo golpe volta para ele');
  });
});

describe('a placa da cura passiva no caso de borda (decisoes.md 2026-11-06 (1)): a cura conta os K que sobram do golpe', () => {
  /** Quantos K sobram na Guarda de quem leva o golpe de `attacker`, na conta do motor. */
  const guardLeft = (view: PlayerView, attacker: 'self' | 'opponent'): number =>
    (attacker === 'self' ? view.opponent : view.self).guard.length - previewAttack(view, attacker).breaks.defenderGuard;

  it('contra o Ataque Absoluto armado do outro, os K quebram todos antes da cura', () => {
    const mine = scenarioAt({ self: { guard: ['K', 'K', 'K'], defenseRow: [7] }, opponent: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] } }).view;
    expect(guardLeft(mine, 'opponent')).toBe(0);
    expect(plateLine('cura', true, mine)).toBe('o Ataque Absoluto dele quebra os K antes da cura');
    const theirs = scenarioAt({ self: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { guard: ['K', 'K'], defenseRow: [7] } }).view;
    expect(guardLeft(theirs, 'self')).toBe(0);
    expect(plateLine('cura', false, theirs)).toBe('o seu Ataque Absoluto quebra os K antes da cura');
  });

  it('o Reflect de quem tem a Guarda segura o Absoluto com os K inteiros: a linha de sempre', () => {
    const mirror = scenarioAt({ self: { guard: ['K', 'K', 'K'], reflect: true }, opponent: { attackRow: [10], attackBuffs: ['J', 'J', 'J', 'J'] } }).view;
    expect(previewAttack(mirror, 'opponent').outcome).toBe('REFLECTED');
    expect(guardLeft(mirror, 'opponent')).toBe(3);
    expect(plateLine('cura', true, mirror)).toBe('a sua Defesa que cai vira vida');
  });

  it('com 2 K, o golpe que um K absorve deixa 1 e não cura; com 3 K, deixa 2 e cura', () => {
    const two = scenarioAt({ self: { guard: ['K', 'K'], defenseRow: [3] }, opponent: { attackRow: [10, 9] } }).view;
    expect(previewAttack(two, 'opponent').outcome).toBe('GUARD_ABSORBS');
    expect(defenseHealActive({ guard: two.self.guard.slice(0, guardLeft(two, 'opponent')) }, two.config)).toBe(false);
    expect(plateLine('cura', true, two)).toBe('com 2 K depois do golpe, a sua Defesa que cai vira vida');
    const theirs = scenarioAt({ self: { attackRow: [10, 9] }, opponent: { guard: ['K', 'K'], defenseRow: [3] } }).view;
    expect(plateLine('cura', false, theirs)).toBe('com 2 K depois do golpe, a Defesa dele que cai vira vida');
    const three = scenarioAt({ self: { guard: ['K', 'K', 'K'], defenseRow: [3] }, opponent: { attackRow: [10, 9] } }).view;
    expect(defenseHealActive({ guard: three.self.guard.slice(0, guardLeft(three, 'opponent')) }, three.config)).toBe(true);
    expect(plateLine('cura', true, three)).toBe('a sua Defesa que cai vira vida');
  });

  it('o mínimo da cura é do motor (`config.defenseHealGuard`), não da interface', () => {
    const { view } = scenarioAt({ self: { guard: ['K', 'K', 'K'] } });
    expect(plateLine('cura', true, { ...view, config: { ...view.config, defenseHealGuard: 3 } })).toBe(
      'com 3 K depois do golpe, a sua Defesa que cai vira vida',
    );
  });
});
