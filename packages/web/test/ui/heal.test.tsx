// A camada da cura (spec `2026-11-23-cura-placas-historico-design.md` §4.2, a direção A): a origem acende, a gota sobe até a ponta da barra
// de quem curou e, na chegada, as faíscas e o carimbo com o bruto e a conta. O carimbo vive além da batida (sai sozinho), e uma cura nova do
// mesmo lado, o golpe do mesmo lado, uma cena, o fim da partida e o pulo o tiram. O `animate` falso mora em `HTMLElement` (como no
// `leaving.test.tsx`).
import type { GameEvent, NumCard } from '@coringa/engine';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { HEAL_MOTION } from '../../src/model/heal-motion.ts';
import { advance, busy, cleanup, emit, HIT, mount, SCENE, THEIRS, TURN } from './anim-harness.tsx';
import type { ViewSpec } from '../fixtures.ts';

beforeEach(() => {
  HTMLElement.prototype.animate = function () {
    return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
  } as HTMLElement['animate'];
});
afterEach(() => {
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
  cleanup();
});

const layer = (container: HTMLElement) => container.querySelector('[data-camada-fx]')!;
const all = (container: HTMLElement, selector: string) => [...layer(container).querySelectorAll(selector)];
const stamps = (container: HTMLElement) => all(container, '[data-cura-carimbo]');

// A minha Defesa perde a carta da frente (o 3♥) com 2 K na Guarda e 1 Q: ela vai ao cemitério e cura 3 × 2 = 6.
const HEALER: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, guard: ['K', 'K'], defenseBuffs: ['Q'], defenseRow: [3, 6, 9, 5] } };
const front: NumCard = { id: 'cura-3', kind: 'NUM', value: 3, suit: 'copas' };
const AFTER: ViewSpec = { ...HEALER, self: { ...HEALER.self, defenseRow: [6, 9, 5] }, graveyard: [5, 8, 3] };
const removed: GameEvent = { type: 'CardsRemovedFromRow', player: 'p1', row: 'DEF', cards: [front] };
const healed = (amount = 6): GameEvent => ({ type: 'Healed', player: 'p1', amount, source: 'DEFENSE', card: front });
/** A batida da carta que cai (300 ms) vem antes; a da cura começa aos 300. */
const HEAL_AT = 300;
/** Até a batida de cura começar (`at`) e o desenho dela agendar a camada; depois, até a gota chegar. */
function toArrival(at = HEAL_AT): void {
  advance(at);
  advance(1);
  advance(HEAL_MOTION.arriveAt);
}

describe('a camada da cura', () => {
  it('a origem acende e a gota sai na batida da cura; na chegada, as faíscas e o carimbo com o bruto e a conta, no seu lado', () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed()]);
    expect(all(m.container, '[data-cura-origem]')).toHaveLength(0);
    advance(HEAL_AT);
    advance(1);
    // A carta de cima do cemitério é outra (os ids do cenário): acende o monte.
    expect(all(m.container, '[data-cura-origem]').map((el) => el.getAttribute('data-cura-origem'))).toEqual(['monte']);
    advance(HEAL_MOTION.dropAt);
    expect(all(m.container, '[data-cura-gota]')).toHaveLength(1);
    expect(stamps(m.container)).toHaveLength(0);
    advance(HEAL_MOTION.flightMs);
    expect(all(m.container, '[data-cura-faisca]').length).toBeGreaterThan(0);
    const [stamp] = stamps(m.container);
    expect(stamp).toHaveAttribute('data-lado', 'voce');
    expect(stamp).toHaveTextContent('+6');
    expect(stamp).toHaveTextContent('3♥ × 2');
    expect(stamp).toHaveAttribute('aria-hidden', 'true');
  });

  it('a cura do oponente: o carimbo vai para o lado dele', () => {
    const THEIR_HEALER: ViewSpec = { ...THEIRS, opponent: { ...THEIRS.opponent, guard: ['K', 'K'], defenseBuffs: [], defenseRow: [4, 6] } };
    const card: NumCard = { id: 'cura-4', kind: 'NUM', value: 4, suit: 'paus' };
    const m = mount(THEIR_HEALER, { training: 'medio' });
    emit(m, { ...THEIR_HEALER, opponent: { ...THEIR_HEALER.opponent, defenseRow: [6] } }, [
      { type: 'CardsRemovedFromRow', player: 'p2', row: 'DEF', cards: [card] },
      { type: 'Healed', player: 'p2', amount: 4, source: 'DEFENSE', card },
    ]);
    toArrival();
    expect(stamps(m.container).map((el) => el.getAttribute('data-lado'))).toEqual(['oponente']);
    expect(stamps(m.container)[0]).toHaveTextContent('+4');
  });

  it('no Roubo, a gota sai da carta roubada, já na sua fileira, e o carimbo mostra o value do Roubo', () => {
    const THIEF: ViewSpec = { ...THEIRS, self: { ...THEIRS.self, attackRow: [7, 5] } };
    const stolen: NumCard = { id: 'x-p1-ATK-0', kind: 'NUM', value: 7, suit: 'copas' };
    const m = mount(THIEF, { training: 'medio' });
    emit(m, THIEF, [
      { type: 'StealDamage', player: 'p1', victim: 'p2', value: 14, damage: 14, blocked: false },
      { type: 'Healed', player: 'p1', amount: 14, source: 'STEAL', card: stolen },
    ]);
    // O golpe do Roubo (600 ms) vem antes da cura.
    advance(600 + 1);
    expect(all(m.container, '[data-cura-origem]').map((el) => el.getAttribute('data-cura-origem'))).toEqual(['carta']);
    advance(HEAL_MOTION.arriveAt);
    expect(stamps(m.container)[0]).toHaveTextContent('+14');
    expect(stamps(m.container)[0]).toHaveTextContent('7♥ × 2');
  });

  it('o carimbo fica além do fim da batida e sai sozinho, sem nó sobrando', () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed()]);
    toArrival();
    advance(HEAL_MOTION.beatMs - HEAL_MOTION.arriveAt + 100);
    expect(stamps(m.container)).toHaveLength(1);
    // Um `state` novo no meio da espera não tira nem duplica o carimbo.
    emit(m, AFTER, [TURN]);
    expect(stamps(m.container)).toHaveLength(1);
    advance(HEAL_MOTION.stampHoldMs + HEAL_MOTION.stampOutMs);
    advance(1);
    expect(stamps(m.container)).toHaveLength(0);
    expect(all(m.container, '[data-cura-gota], [data-cura-faisca], [data-cura-origem]')).toHaveLength(0);
  });

  it('a vida já cheia: a cura toca, e o carimbo mostra o bruto', () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed(0)]);
    toArrival();
    expect(stamps(m.container)[0]).toHaveTextContent('+6');
  });

  it('uma cura nova do mesmo lado troca o carimbo', () => {
    const second: NumCard = { id: 'cura-6', kind: 'NUM', value: 6, suit: 'ouros' };
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed(), { type: 'Healed', player: 'p1', amount: 12, source: 'DEFENSE', card: second }]);
    toArrival();
    expect(stamps(m.container)[0]).toHaveTextContent('+6');
    toArrival(HEAL_MOTION.beatMs - HEAL_MOTION.arriveAt - 1);
    expect(stamps(m.container)).toHaveLength(1);
    expect(stamps(m.container)[0]).toHaveTextContent('+12');
  });

  it('o golpe no mesmo lado tira o carimbo: o número do golpe fica sozinho', () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed(), HIT]);
    toArrival();
    expect(stamps(m.container)).toHaveLength(1);
    advance(HEAL_MOTION.beatMs - HEAL_MOTION.arriveAt - 1);
    advance(1);
    expect(stamps(m.container)).toHaveLength(0);
  });

  it('uma cena tira o carimbo na hora', () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed(), SCENE]);
    toArrival();
    expect(stamps(m.container)).toHaveLength(1);
    advance(HEAL_MOTION.beatMs - HEAL_MOTION.arriveAt - 1);
    advance(1);
    expect(stamps(m.container)).toHaveLength(0);
  });

  it('o fim da partida tira o carimbo', () => {
    const m = mount(HEALER, { training: 'medio' });
    const result = { kind: 'WIN', winner: 'p1', reason: 'HP' } as const;
    emit(m, { ...AFTER, phase: { kind: 'GAME_OVER', result } }, [removed, healed(), { type: 'GameOver', result }]);
    toArrival();
    expect(stamps(m.container)).toHaveLength(1);
    advance(HEAL_MOTION.beatMs - HEAL_MOTION.arriveAt - 1);
    advance(1);
    expect(stamps(m.container)).toHaveLength(0);
  });

  it('o pulo tira a gota, as faíscas e o carimbo', async () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed()]);
    toArrival();
    expect(stamps(m.container)).toHaveLength(1);
    await m.user.keyboard('{Escape}');
    expect(all(m.container, '[data-cura-carimbo], [data-cura-gota], [data-cura-faisca], [data-cura-origem]')).toHaveLength(0);
  });

  it('desmontar a mesa tira os nós e os timers', () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed()]);
    toArrival();
    const node = layer(m.container);
    act(() => m.unmount());
    expect(node.querySelectorAll('[data-cura-carimbo]')).toHaveLength(0);
    advance(HEAL_MOTION.beatMs + HEAL_MOTION.stampHoldMs + HEAL_MOTION.stampOutMs);
  });

  it('as faíscas saem `sparksMs` depois da chegada, ainda dentro da batida', () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed()]);
    toArrival();
    expect(all(m.container, '[data-cura-faisca]').length).toBeGreaterThan(0);
    advance(HEAL_MOTION.sparksMs + 1);
    expect(all(m.container, '[data-cura-faisca]')).toHaveLength(0);
    expect(stamps(m.container)).toHaveLength(1);
  });

  it('com movimento reduzido a vida já está na nova: o carimbo fica na ponta dela, sem somar a cura de novo', () => {
    // A barra tem 100 px a partir da borda da camada; a vida mostrada já é a final (com movimento reduzido ela salta).
    const real = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.getAttribute('role') === 'meter') return { left: 0, right: 100, top: 0, bottom: 10, width: 100, height: 10, x: 0, y: 0, toJSON() {} } as DOMRect;
      return real.call(this);
    };
    try {
      const m = mount(HEALER, { training: 'medio', prefs: { reduceMotion: true } });
      emit(m, AFTER, [removed, healed()]);
      toArrival();
      const meter = m.container.querySelector('[data-lado="voce"] [role="meter"]')!;
      const shown = Number(m.container.querySelector('[data-lado="voce"] [data-hp]')!.textContent);
      const max = Number(meter.getAttribute('aria-valuemax'));
      expect(stamps(m.container)[0]).toHaveStyle({ left: `${2 + 96 * (shown / max)}px` });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = real;
    }
  });

  it('na primeira cura da partida (a faixa que ensina, logo abaixo do placar), o carimbo sobe para a ponta da barra e livra a faixa', () => {
    const real = HTMLElement.prototype.getBoundingClientRect;
    HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
      if (this.getAttribute('role') === 'meter') return { left: 0, right: 100, top: 30, bottom: 40, width: 100, height: 10, x: 0, y: 30, toJSON() {} } as DOMRect;
      return real.call(this);
    };
    try {
      // A sessão marca sozinha a primeira cura passiva da partida: ela ensina (a faixa no ar), e o carimbo sobe para a ponta da barra.
      const m = mount(HEALER, { training: 'medio' });
      emit(m, AFTER, [removed, healed()]);
      toArrival();
      expect(stamps(m.container)[0]).toHaveStyle({ top: '30px' });
      advance(HEAL_MOTION.beatMs + HEAL_MOTION.stampHoldMs + HEAL_MOTION.stampOutMs);
      // A segunda cura não ensina: o carimbo pende logo abaixo da barra.
      emit(m, AFTER, [removed, healed()]);
      toArrival();
      expect(stamps(m.container)[0]).toHaveStyle({ top: '36px' });
    } finally {
      HTMLElement.prototype.getBoundingClientRect = real;
    }
  });

  it('na mesa tocando, o toque na figura abre a dica sem pular as batidas, e o Esc fecha a dica sem pular', async () => {
    const m = mount(HEALER, { training: 'medio' });
    emit(m, AFTER, [removed, healed()]);
    advance(HEAL_AT);
    advance(1);
    expect(busy(m.container)).toBe(true);
    const figure = m.container.querySelector<HTMLElement>('[data-marca="cura"]')!;
    await m.user.pointer({ keys: '[TouchA]', target: figure });
    expect(document.querySelector('[data-dica-marca]')).not.toBeNull();
    expect(busy(m.container)).toBe(true);
    await m.user.keyboard('{Escape}');
    expect(document.querySelector('[data-dica-marca]')).toBeNull();
    expect(busy(m.container)).toBe(true);
  });

  it('com movimento reduzido, nem gota nem faísca; o carimbo aparece na chegada', () => {
    const m = mount(HEALER, { training: 'medio', prefs: { reduceMotion: true } });
    emit(m, AFTER, [removed, healed()]);
    advance(HEAL_AT);
    advance(1);
    advance(HEAL_MOTION.dropAt + 10);
    expect(all(m.container, '[data-cura-gota]')).toHaveLength(0);
    expect(stamps(m.container)).toHaveLength(0);
    advance(HEAL_MOTION.flightMs);
    expect(all(m.container, '[data-cura-faisca]')).toHaveLength(0);
    expect(stamps(m.container)).toHaveLength(1);
  });
});
