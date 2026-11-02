// O leque da compra e do Equipar (sub-projeto 6 §8, fatia 5, E6): as cartas chegam do monte, 40 ms uma depois da outra. O `animate` falso
// mora em `HTMLElement` (no `Element.prototype` ele faria o Motion trocar de modo).
import type { GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import { screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { TABLE_MOTION } from '../../src/model/table-motion.ts';
import { advance, cleanup, emit, MINE, mount } from './anim-harness.tsx';
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

const S1: SpecialCard = { id: 's-nova', kind: 'J', suit: 'ouros' };
/** As numéricas pendentes da fixture têm os ids pela posição. */
const pending = (i: number, value: NumCard['value']): NumCard => ({ id: `x-p1-PEND-${i}`, kind: 'NUM', value, suit: 'copas' });
const DEALT: ViewSpec = {
  ...MINE,
  phase: { kind: 'EQUIP' },
  self: { ...MINE.self, hand: ['K', 'A', 'Q', S1], pending: [7, 3] },
  opponent: { ...MINE.opponent, hand: ['A', 'K', 'WILD', 'A', 'K', 'Q'], pending: [5] },
};
const DEALS: GameEvent[] = [
  { type: 'RoundStarted', round: 8, kind: 'EQUIP' },
  { type: 'CardsDealt', player: 'p1', count: 3, cards: [pending(0, 7), S1, pending(1, 3)] },
  { type: 'CardsDealt', player: 'p2', count: 3 },
];
/** A animação do voo (o `translate` que sai do monte) no elemento. */
const flightOf = (el: Element) => calls.find((call) => call.el === el && call.frames.some((frame) => 'translate' in frame));
const pendingItem = (id: string) => document.querySelector(`[data-card-id="${id}"]`)!.closest('li')!;

describe('o leque da compra (E6)', () => {
  it('as suas cartas chegam em leque, na ordem da compra: na mão e no painel do Equipar', () => {
    const m = mount(MINE);
    emit(m, DEALT, DEALS);
    expect(pendingItem('x-p1-PEND-0')).toHaveAttribute('data-entra', '0.4');
    expect(m.container.querySelector('[data-card-id="s-nova"]')).toHaveAttribute('data-entra', '0.44');
    expect(pendingItem('x-p1-PEND-1')).toHaveAttribute('data-entra', '0.48');
  });

  it('cada uma voa do monte, com o atraso dela', () => {
    const m = mount(MINE);
    emit(m, DEALT, DEALS);
    expect(flightOf(m.container.querySelector('[data-card-id="s-nova"]')!)!.options).toMatchObject({ delay: 440, duration: TABLE_MOTION.dealFlightMs });
    expect(flightOf(pendingItem('x-p1-PEND-1'))!.options).toMatchObject({ delay: 480 });
  });

  it('os versos da mão do Bot também chegam em leque', () => {
    const m = mount(MINE);
    emit(m, DEALT, DEALS);
    const backs = [...screen.getByRole('region', { name: 'Campo de Duda' }).querySelectorAll('[data-verso]')];
    expect(backs.map((back) => back.getAttribute('data-entra'))).toEqual([null, null, null, '0.7', '0.74', '0.78']);
    expect(flightOf(backs[5]!)!.options).toMatchObject({ delay: 780 });
  });

  it('o voo apaga a carta enquanto ela espera no monte: um verso que já estava montado não fica parado sobre o número', () => {
    const m = mount(MINE);
    emit(m, DEALT, DEALS);
    const backs = [...screen.getByRole('region', { name: 'Campo de Duda' }).querySelectorAll('[data-verso]')];
    const flight = flightOf(backs[5]!)!;
    expect(flight.frames[0]).toMatchObject({ opacity: 0 });
    expect(flight.options).toMatchObject({ fill: 'backwards' });
  });

  it('com mais cartas compradas que versos novos (as numéricas vão para o painel dele), o leque conta só os versos que há', () => {
    const m = mount(MINE);
    // A mão dele tinha 3 versos e ganha 1: a compra de 3 cartas trouxe 2 numéricas.
    emit(m, { ...DEALT, opponent: { ...DEALT.opponent, hand: ['A', 'K', 'WILD', 'Q'] } }, DEALS);
    const backs = [...screen.getByRole('region', { name: 'Campo de Duda' }).querySelectorAll('[data-verso]')];
    expect(backs.map((back) => back.getAttribute('data-entra'))).toEqual([null, '0.7', '0.74', '0.78']);
    // Só o verso que acabou de entrar voa do monte: os que já estavam montados não saem do lugar.
    expect(backs.map((back) => flightOf(back) !== undefined)).toEqual([false, false, false, true]);
    const lone = mount(MINE);
    emit(lone, { ...DEALT, opponent: { ...DEALT.opponent, hand: ['Q'] } }, DEALS);
    const only = [...screen.getAllByRole('region', { name: 'Campo de Duda' })[1]!.querySelectorAll('[data-verso]')];
    expect(only.map((back) => back.getAttribute('data-entra'))).toEqual(['0.7']);
  });

  it('o voo passa do fim das batidas: o fim natural não o corta', () => {
    const m = mount(MINE);
    emit(m, DEALT, DEALS);
    const before = calls.length;
    advance(2_000);
    // Nenhum voo recomeça nem some: o mesmo número de animações.
    expect(calls.length).toBe(before);
  });

  it('com movimento reduzido: as cartas só esmaecem, em leque, sem voar', () => {
    const m = mount(MINE, { prefs: { reduceMotion: true } });
    emit(m, DEALT, DEALS);
    expect(m.container.querySelector('[data-card-id="s-nova"]')).toHaveAttribute('data-entra', '0.44');
    expect(calls.filter((call) => call.frames.some((frame) => 'translate' in frame))).toHaveLength(0);
  });

  it('no catchUp: nenhum voo', () => {
    const m = mount(MINE);
    emit(m, DEALT, DEALS, { catchUp: true });
    expect(calls.filter((call) => call.frames.some((frame) => 'translate' in frame))).toHaveLength(0);
  });
});
