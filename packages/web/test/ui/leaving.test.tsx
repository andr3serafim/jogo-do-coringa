// As cartas que saem na batida delas, e as que quebram estouram em cacos (sub-projeto 6 §8, fatia 5, E2 e E5). O `animate` falso mora em
// `HTMLElement` (no `Element.prototype` ele faria o Motion trocar de modo).
import type { GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { shardsPerCard, TABLE_MOTION } from '../../src/model/table-motion.ts';
import { advance, cleanup, emit, mount, stage, THEIRS, TURN } from './anim-harness.tsx';
import type { ViewSpec } from '../fixtures.ts';

interface Call {
  el: HTMLElement;
  frames: Keyframe[];
  options: KeyframeAnimationOptions;
}
let calls: Call[] = [];

beforeEach(() => {
  calls = [];
  HTMLElement.prototype.animate = function (this: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
    calls.push({ el: this, frames, options });
    return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
  } as HTMLElement['animate'];
});
afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  cleanup();
});

const layer = (container: HTMLElement) => container.querySelector('[data-camada-fx]')!;
const copyOf = (container: HTMLElement, id: string) => layer(container).querySelector(`[data-saindo-id="${id}"]`);
const shardCount = (container: HTMLElement) => layer(container).querySelectorAll('[data-caco]').length;
const particles = (container: HTMLElement) => layer(container).querySelectorAll('[data-particula]').length;

const k = (id: string): SpecialCard => ({ id, kind: 'K', suit: 'copas' });
const KS = ['k5', 'k6', 'k7', 'k8'].map(k);
/** A Guarda do Bot com 4 K; depois do golpe, os 4 no cemitério, com uma numérica por cima (nenhum K é o topo). */
const BEFORE: ViewSpec = { ...THEIRS, opponent: { ...THEIRS.opponent, guard: KS } };
const broken = (cards: SpecialCard[]): GameEvent => ({ type: 'GuardBroken', player: 'p2', cards });
const after = (graveyard: ViewSpec['graveyard']): ViewSpec => ({ ...BEFORE, opponent: { ...BEFORE.opponent, guard: KS.filter((card) => !graveyard!.includes(card)) }, graveyard });

describe('a carta que quebra estoura em cacos (E5)', () => {
  it('um K que não é o topo: a cópia fica no lugar desde a chegada até a batida, e 120 ms depois estoura em 10 cacos', () => {
    const m = mount(BEFORE);
    emit(m, after([KS[3]!, 5]), [TURN, broken([KS[3]!])]);
    expect(copyOf(m.container, 'k8')).not.toBeNull();
    advance(400 + TABLE_MOTION.crackShakeMs - 1);
    expect(copyOf(m.container, 'k8')!.querySelector('[data-rachadura]')).not.toBeNull();
    expect(shardCount(m.container)).toBe(0);
    advance(1);
    expect(shardCount(m.container)).toBe(shardsPerCard(1));
    expect(copyOf(m.container, 'k8')).toBeNull();
  });

  it('4 K juntos: 4 cópias, 40 cacos, e nunca mais de 60 partículas', () => {
    const m = mount(BEFORE);
    emit(m, after([...KS, 5]), [TURN, broken(KS)]);
    expect(layer(m.container).querySelectorAll('[data-saindo]')).toHaveLength(4);
    advance(400 + TABLE_MOTION.crackShakeMs);
    expect(shardCount(m.container)).toBe(4 * shardsPerCard(4));
    expect(particles(m.container)).toBeLessThanOrEqual(60);
  });

  it('o topo do cemitério que estoura fica escondido até o estouro; o pulo o devolve na hora', () => {
    const m = mount(BEFORE);
    emit(m, after([5, KS[3]!]), [TURN, broken([KS[3]!])]);
    const real = () => m.container.querySelector<HTMLElement>('[data-card-id="k8"]')!;
    expect(real().style.visibility).toBe('hidden');
    advance(400 + TABLE_MOTION.crackShakeMs);
    expect(real().style.visibility).toBe('');

    emit(m, after([5, KS[2]!]), [TURN, broken([KS[2]!])]);
    expect(m.container.querySelector<HTMLElement>('[data-card-id="k7"]')!.style.visibility).toBe('hidden');
    act(() => stage(m.container).click());
    expect(m.container.querySelector<HTMLElement>('[data-card-id="k7"]')!.style.visibility).toBe('');
    expect(layer(m.container).querySelectorAll('[data-saindo]')).toHaveLength(0);
  });

  it('nenhuma cópia tem o id da carta de verdade', () => {
    const m = mount(BEFORE);
    emit(m, after([...KS, 5]), [TURN, broken(KS)]);
    expect(layer(m.container).querySelectorAll('[data-card-id]')).toHaveLength(0);
  });

  it('a cópia de uma carta que é botão (a da sua mão) não recebe foco: o Tab nunca cai numa carta escondida do leitor de tela', () => {
    const trap: SpecialCard = { id: 'a-usada', kind: 'A', suit: 'paus' };
    const j: SpecialCard = { id: 'j-alvo', kind: 'J', suit: 'copas' };
    const mine: ViewSpec = { ...THEIRS, phase: 'MAIN', self: { ...THEIRS.self, hand: ['K', trap] }, opponent: { ...THEIRS.opponent, attackBuffs: [j] } };
    const m = mount(mine);
    emit(m, { ...mine, self: { ...mine.self, hand: ['K'] }, opponent: { ...mine.opponent, attackBuffs: [] }, graveyard: [3, trap, j, 5] }, [
      TURN,
      { type: 'TrapUsed', player: 'p1', card: trap, target: j, targetOwner: 'p2' },
    ]);
    const copy = copyOf(m.container, 'a-usada')!;
    expect(copy.tagName).toBe('BUTTON');
    expect(copy).toHaveAttribute('inert');
  });
});

describe('a carta que sai sem quebrar voa ao cemitério na batida dela (E2)', () => {
  const row = (id: string, value: NumCard['value']): NumCard => ({ id, kind: 'NUM', value, suit: 'copas' });
  it('a fileira gasta: a cópia fica até a batida e então voa e apaga, sem cacos', () => {
    // A fixture dá às numéricas os ids pela posição: a fileira inteira sai, para nenhum id sobrar na `view` de depois.
    const spent = [6, 9, 3, 10].map((value, i) => row(`x-p2-ATK-${i}`, value as NumCard['value']));
    const m = mount(BEFORE);
    emit(m, { ...BEFORE, opponent: { ...BEFORE.opponent, attackRow: [] } }, [
      TURN,
      { type: 'CardsRemovedFromRow', player: 'p2', row: 'ATK', cards: spent },
    ]);
    const copy = copyOf(m.container, 'x-p2-ATK-0')!;
    expect(copy).not.toBeNull();
    const flight = calls.find((call) => call.el === copy && call.frames.some((frame) => frame.opacity === 0));
    expect(flight!.options).toMatchObject({ delay: 400, duration: TABLE_MOTION.exitMs });
    advance(400 + TABLE_MOTION.exitMs);
    expect(copyOf(m.container, 'x-p2-ATK-0')).toBeNull();
    expect(shardCount(m.container)).toBe(0);
  });
});

describe('quando não há cópia', () => {
  it('as cenas desenham as delas: a Devastação não deixa cópia', () => {
    const fallen = [6, 9, 3, 10].map((value, i) => ({ id: `x-p2-ATK-${i}`, kind: 'NUM', value, suit: 'copas' }) as NumCard);
    const m = mount(BEFORE);
    emit(m, { ...BEFORE, opponent: { ...BEFORE.opponent, attackRow: [] } }, [{ type: 'RowDevastated', player: 'p2', row: 'ATK', cards: fallen, reflected: false }]);
    expect(layer(m.container).querySelectorAll('[data-saindo]')).toHaveLength(0);
  });

  it('no catchUp, nenhuma cópia', () => {
    const m = mount(BEFORE);
    emit(m, after([...KS, 5]), [TURN, broken(KS)], { catchUp: true });
    expect(layer(m.container).querySelectorAll('[data-saindo]')).toHaveLength(0);
  });

  it('um state novo no meio tira as cópias da linha velha', () => {
    const m = mount(BEFORE);
    emit(m, after([...KS, 5]), [TURN, broken(KS)]);
    advance(100);
    emit(m, after([...KS, 5]), []);
    expect(layer(m.container).querySelectorAll('[data-saindo]')).toHaveLength(0);
  });

  it('as batidas que redesenham o palco não criam cópias novas', () => {
    const m = mount(BEFORE);
    emit(m, after([KS[3]!, 5]), [TURN, broken([KS[3]!])]);
    advance(300);
    expect(layer(m.container).querySelectorAll('[data-saindo]')).toHaveLength(1);
  });

  it('com movimento reduzido: a cópia fica até a batida e esmaece, sem tremor nem cacos', () => {
    const m = mount(BEFORE, { prefs: { reduceMotion: true } });
    emit(m, after([KS[3]!, 5]), [TURN, broken([KS[3]!])]);
    expect(copyOf(m.container, 'k8')).not.toBeNull();
    expect(calls.some((call) => call.frames.some((frame) => 'rotate' in frame))).toBe(false);
    advance(400 + 200);
    expect(copyOf(m.container, 'k8')).toBeNull();
    expect(shardCount(m.container)).toBe(0);
  });
});

describe('a essência da cura passiva (bloco A do playtest, ponto 9)', () => {
  // A minha Defesa perde a carta da frente (o 3) com 2 K na Guarda: ela vai ao cemitério e me cura.
  const HEALER: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, guard: ['K', 'K'], defenseRow: [3, 6, 9, 5] } };
  const front: NumCard = { id: 'x-p1-DEF-0', kind: 'NUM', value: 3, suit: 'copas' };
  const AFTER_HEAL: ViewSpec = { ...HEALER, self: { ...HEALER.self, defenseRow: [6, 9, 5] }, graveyard: [5, 8, 3] };
  const removed: GameEvent = { type: 'CardsRemovedFromRow', player: 'p1', row: 'DEF', cards: [front] };
  const healed: GameEvent = { type: 'Healed', player: 'p1', amount: 6, source: 'DEFENSE', card: front };
  const essence = (container: HTMLElement) => layer(container).querySelector('[data-essencia]');

  it('sai da carta na batida dela, voa até o seu retrato e some na batida da cura', () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER_HEAL, [removed, healed]);
    expect(essence(m.container)).not.toBeNull();
    const flight = calls.find((call) => call.el.hasAttribute('data-essencia'))!;
    expect(flight.options).toMatchObject({ delay: 0, duration: 300 });
    advance(299);
    expect(essence(m.container)).not.toBeNull();
    advance(1);
    expect(essence(m.container)).toBeNull();
  });

  it('com movimento reduzido, nenhuma essência', () => {
    const m = mount(HEALER, { training: 'medio', prefs: { reduceMotion: true } });
    emit(m, AFTER_HEAL, [removed, healed]);
    expect(essence(m.container)).toBeNull();
  });

  it('os K da Guarda de quem curou acendem na batida da cura', () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER_HEAL, [removed, healed]);
    const guard = () => [...m.container.querySelectorAll('[data-campo="p1"] [data-card-id^="x-p1-K"]')];
    expect(guard().every((card) => card.getAttribute('data-fx') !== 'cause')).toBe(true);
    advance(300);
    expect(guard().length).toBe(2);
    expect(guard().every((card) => card.getAttribute('data-fx') === 'cause')).toBe(true);
  });
});
