// A jogada comum na carta (sub-projeto 6 §8, fatia 5): a que sai da sua mão recua antes de voar, assenta com um achatamento e solta poeira;
// a do Bot, que não tem de onde voar, espera a batida dela e cai no destino. O jsdom não tem `animate`: o teste o põe em `HTMLElement` (no
// `Element.prototype` ele faria o Motion trocar de modo) e grava as chamadas.
import type { GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TABLE_MOTION } from '../../src/model/table-motion.ts';
import { advance, cleanup, emit, MINE, mount, stage, TURN } from './anim-harness.tsx';
import type { ViewSpec } from '../fixtures.ts';

interface Call {
  el: HTMLElement;
  frames: Keyframe[];
  options: KeyframeAnimationOptions;
  canceled: boolean;
}
let calls: Call[] = [];

beforeEach(() => {
  calls = [];
  HTMLElement.prototype.animate = function (this: HTMLElement, frames: Keyframe[], options: KeyframeAnimationOptions) {
    const call: Call = { el: this, frames, options, canceled: false };
    calls.push(call);
    return { cancel: () => (call.canceled = true), finished: Promise.resolve() } as unknown as Animation;
  } as HTMLElement['animate'];
});
afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  cleanup();
});

/** As animações de uma propriedade (`translate` ou `scale`) na carta `id`. */
const on = (id: string, prop: 'translate' | 'scale') =>
  calls.filter((call) => call.el.getAttribute('data-card-id') === id && call.frames.some((frame) => prop in frame));
const dustCount = (container: HTMLElement) => container.querySelectorAll('[data-camada-fx] [data-poeira]').length;

const J1: SpecialCard = { id: 'j1', kind: 'J', suit: 'espadas' };
const K1: SpecialCard = { id: 'k1', kind: 'K', suit: 'copas' };
const JB: SpecialCard = { id: 'jb', kind: 'J', suit: 'paus' };
/** J1 na sua mão; o J do Bot ainda na mão dele. */
const BEFORE: ViewSpec = { ...MINE, self: { ...MINE.self, hand: [K1, J1], attackBuffs: [] }, opponent: { ...MINE.opponent, attackBuffs: [] } };
const MY_PLAY: GameEvent = { type: 'BuffPlayed', player: 'p1', card: J1, as: 'J' };
const AFTER_MINE: ViewSpec = { ...BEFORE, self: { ...BEFORE.self, hand: [K1], attackBuffs: [J1] } };
const BOT_PLAY: GameEvent = { type: 'BuffPlayed', player: 'p2', card: JB, as: 'J' };
const AFTER_BOT: ViewSpec = { ...BEFORE, phase: 'WAITING', opponent: { ...BEFORE.opponent, attackBuffs: [JB] } };

describe('a sua carta: recua, voa e assenta', () => {
  it('recua 6 px no começo da batida dela, achata no pouso e solta 5 poeiras', () => {
    const m = mount(BEFORE);
    emit(m, AFTER_MINE, [TURN, MY_PLAY]);
    const [recoil] = on('j1', 'translate');
    expect(recoil!.options).toMatchObject({ delay: 400, duration: TABLE_MOTION.recoilMs });
    expect(recoil!.frames[1]).toMatchObject({ translate: `0 ${TABLE_MOTION.recoilPx}px` });
    const [squash] = on('j1', 'scale');
    expect(squash!.options).toMatchObject({ delay: 910, duration: TABLE_MOTION.squashMs });
    expect(squash!.frames.map((frame) => frame.scale)).toEqual(['1', String(TABLE_MOTION.squash), '1']);
    advance(909);
    expect(dustCount(m.container)).toBe(0);
    advance(1);
    expect(dustCount(m.container)).toBe(TABLE_MOTION.dust);
  });

  it('a vizinha que só desliza na mão não recua, não achata e não solta poeira', () => {
    const m = mount(BEFORE);
    emit(m, AFTER_MINE, [TURN, MY_PLAY]);
    expect(on('k1', 'translate')).toHaveLength(0);
    expect(on('k1', 'scale')).toHaveLength(0);
  });

  it('o pulo antes do pouso: a animação cai, e nenhuma poeira sai depois', () => {
    const m = mount(BEFORE);
    emit(m, AFTER_MINE, [TURN, MY_PLAY]);
    advance(100);
    act(() => stage(m.container).click());
    advance(2_000);
    expect(dustCount(m.container)).toBe(0);
    expect(on('j1', 'scale').every((call) => call.canceled)).toBe(true);
  });
});

describe('a carta do Bot: cai no destino na batida dela', () => {
  it('fica apagada até a batida, cai de 14 px e então achata e solta poeira', () => {
    const m = mount(BEFORE);
    emit(m, AFTER_BOT, [TURN, BOT_PLAY]);
    const card = m.container.querySelector('[data-card-id="jb"]')!;
    expect(card).toHaveAttribute('data-entra', '0.4');
    const [fall] = on('jb', 'translate');
    expect(fall!.options).toMatchObject({ delay: 400, duration: TABLE_MOTION.dropMs });
    expect(fall!.frames[0]).toMatchObject({ translate: `0 -${TABLE_MOTION.dropPx}px` });
    expect(on('jb', 'scale')[0]!.options).toMatchObject({ delay: 400 + TABLE_MOTION.dropMs });
    advance(400 + TABLE_MOTION.dropMs);
    expect(dustCount(m.container)).toBe(TABLE_MOTION.dust);
  });

  it('as suas do Equipar, sem rascunho à vista, também caem', () => {
    // A fixture dá às numéricas os ids pela posição: a nova é a sexta do Ataque.
    const num: NumCard = { id: 'x-p1-ATK-5', kind: 'NUM', value: 6, suit: 'espadas' };
    const placed: GameEvent = { type: 'CardsPlaced', player: 'p1', placements: [{ card: num, destination: 'ATK' }] };
    const m = mount(BEFORE);
    emit(m, { ...BEFORE, self: { ...BEFORE.self, attackRow: [8, 4, 10, 7, 9, 6] } }, [placed]);
    const [fall] = on('x-p1-ATK-5', 'translate');
    expect(fall!.options).toMatchObject({ delay: 0, duration: TABLE_MOTION.dropMs });
    expect(on('x-p1-ATK-5', 'scale')[0]!.options).toMatchObject({ delay: TABLE_MOTION.dropMs });
  });
});

describe('sem o movimento novo', () => {
  it('com movimento reduzido: nada recua, cai ou achata, nenhuma poeira; a carta do Bot só esmaece na batida', () => {
    const m = mount(BEFORE, { prefs: { reduceMotion: true } });
    emit(m, AFTER_BOT, [TURN, BOT_PLAY]);
    expect(calls.filter((call) => call.frames.some((frame) => 'translate' in frame || 'scale' in frame))).toHaveLength(0);
    expect(m.container.querySelector('[data-card-id="jb"]')).toHaveAttribute('data-entra', '0.4');
    advance(1_000);
    expect(dustCount(m.container)).toBe(0);
  });

  it('no catchUp: a carta só troca de lugar, como sempre', () => {
    const m = mount(BEFORE);
    emit(m, AFTER_MINE, [TURN, MY_PLAY], { catchUp: true });
    expect(on('j1', 'translate')).toHaveLength(0);
    expect(on('j1', 'scale')).toHaveLength(0);
    advance(2_000);
    expect(dustCount(m.container)).toBe(0);
  });
});
