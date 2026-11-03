// O texto da placa do momento (bloco A dos pontos do playtest, ponto 1): o que a especial do oponente fez, com os números do motor (os
// totais de `attackPower` e `defensePower` da `view` de depois do passo; decisoes.md 2026-11-03 (5), A5).
import type { GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import { namesFor } from '@coringa/sim/text';
import { describe, expect, it } from 'vitest';
import { healRibbon, momentPlate } from '../../src/model/copy.ts';
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
      consequence: 'o K absorve o próximo golpe inteiro',
    });
    const two: GameEvent = { type: 'GuardPlayed', player: 'p2', cards: [face('k1', 'K'), face('k2', 'K')] };
    expect(momentPlate(two, scenarioAt({ opponent: { guard: ['K', 'K'] } }).view, NAMES)).toEqual({
      title: 'Bot pôs 2 K na Guarda',
      consequence: 'com 2 K, a Defesa dele que cai o cura',
    });
    const three = momentPlate(one, scenarioAt({ opponent: { guard: ['K', 'K', 'K'] } }).view, NAMES)!;
    expect(three.consequence).toBe('com 3 K, a Defesa dele que cai o cura');
    expect(`${three.title} ${three.consequence}`).not.toMatch(/Exódia/);
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
