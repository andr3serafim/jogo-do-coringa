// A transição de layout das cartas (spec §4.1): `layoutId` = id da carta, atrasada até o início da batida que a move, e
// encerrada na hora no pulo e no `state` novo. No jsdom o Motion não mede nem anima, então este arquivo troca os
// componentes `m.*` por elementos comuns que deixam no DOM o que a mesa passou a eles (`layoutId`, atraso e duração da
// transição de layout, `layoutDependency`) e contam quantas vezes cada `layoutId` foi montado (a remontagem é o que
// encerra a transição que o Motion deixou no ar).
import type { SpecialCard } from '@coringa/engine';
import { screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INITIATIVE_ID } from '../../src/model/effects.ts';
import { advance, cleanup, emit, mount, MINE, TURN, THEIRS, stage } from './anim-harness.tsx';
import type { ViewSpec } from '../fixtures.ts';

const probe = vi.hoisted(() => ({ mounts: new Map<string, number>() }));

vi.mock('motion/react-m', async () => {
  const React = await import('react');
  const make = (tag: string) =>
    function MockM(props: Record<string, unknown>) {
      const { layoutId, layoutDependency, transition, ...rest } = props as {
        layoutId?: string;
        layoutDependency?: string;
        transition?: { layout?: { delay?: number; duration?: number } };
      } & Record<string, unknown>;
      // Props do Motion que não são atributos do DOM.
      delete rest.animate;
      delete rest.initial;
      React.useEffect(() => {
        if (layoutId !== undefined) probe.mounts.set(layoutId, (probe.mounts.get(layoutId) ?? 0) + 1);
      }, [layoutId]);
      return React.createElement(tag, {
        ...rest,
        'data-layout-id': layoutId,
        'data-layout-delay': transition?.layout?.delay,
        'data-layout-duration': transition?.layout?.duration,
        'data-layout-dep': layoutDependency,
      });
    };
  return { div: make('div'), button: make('button'), span: make('span'), svg: make('svg'), p: make('p') };
});

beforeEach(() => probe.mounts.clear());
afterEach(cleanup);

const K1: SpecialCard = { id: 'k1', kind: 'K', suit: 'copas' };
const A1: SpecialCard = { id: 'a1', kind: 'A', suit: 'paus' };
const J1: SpecialCard = { id: 'j1', kind: 'J', suit: 'espadas' };
const J2: SpecialCard = { id: 'j2', kind: 'J', suit: 'copas' };
const Q1: SpecialCard = { id: 'q1', kind: 'Q', suit: 'ouros' };

/** J1 na mão. */
const BEFORE: ViewSpec = { ...MINE, self: { ...MINE.self, hand: [K1, A1, J1, Q1], attackBuffs: [J2], guard: [] } };
/** J1 jogada: foi da mão para os buffs de ataque. */
const AFTER: ViewSpec = { ...BEFORE, self: { ...BEFORE.self, hand: [K1, A1, Q1], attackBuffs: [J2, J1] } };

const BUFF = { type: 'BuffPlayed', player: 'p1', card: J1, as: 'J' } as const;

const layoutOf = (container: HTMLElement, id: string) =>
  container.querySelector<HTMLElement>(`[data-layout-id="${id}"]`)!;
const delayOf = (container: HTMLElement, id: string) => layoutOf(container, id).getAttribute('data-layout-delay');
const durationOf = (container: HTMLElement, id: string) => layoutOf(container, id).getAttribute('data-layout-duration');

describe('layoutId das cartas (spec §4.1)', () => {
  it('toda carta da mesa tem o `layoutId` igual ao seu id', () => {
    const m = mount(BEFORE);
    const cards = m.container.querySelectorAll('[data-card-id]');
    expect(cards.length).toBeGreaterThan(10);
    for (const card of cards) {
      expect(card).toHaveAttribute('data-layout-id', card.getAttribute('data-card-id'));
    }
  });

  it('a mão, as fileiras, os buffs, a Guarda e o cemitério são cartas animadas', () => {
    const m = mount(BEFORE);
    for (const id of ['k1', 'j2', 'x-p1-ATK-0', 'x-p2-DEF-0', 'x-grave-2']) expect(layoutOf(m.container, id)).not.toBeNull();
  });

  it('as cartas do diálogo do cemitério e a carta grande do Equipar ficam fora (não disputam o `layoutId` da mesa)', async () => {
    const m = mount(BEFORE);
    await m.user.click(screen.getByRole('button', { name: /^Ver o cemitério/ }));
    const dialog = screen.getByRole('dialog');
    const inside = dialog.querySelectorAll('[data-card-id]');
    expect(inside.length).toBeGreaterThan(0);
    for (const card of inside) expect(card).not.toHaveAttribute('data-layout-id');
  });

  it('a marca da iniciativa também tem `layoutId`', () => {
    const m = mount(THEIRS);
    expect(layoutOf(m.container, INITIATIVE_ID)).not.toBeNull();
  });
});

describe('transição atrasada até a batida que moveu a carta (spec §4.1)', () => {
  it('a carta espera o início da sua batida e, no fim das batidas, volta a não esperar', () => {
    const m = mount(BEFORE);
    expect(delayOf(m.container, 'j1')).toBe('0');
    emit(m, AFTER, [TURN, BUFF]);
    expect(delayOf(m.container, 'j1')).toBe('0.4');
    // As que não são movidas por batida nenhuma não esperam.
    expect(delayOf(m.container, 'k1')).toBe('0');
    advance(700);
    expect(delayOf(m.container, 'j1')).toBe('0');
  });

  it('a espera encolhe junto com a linha do tempo quando uma decisão minha espera (teto de 1 s)', () => {
    const m = mount(BEFORE);
    emit(m, AFTER, [TURN, TURN, TURN, TURN, BUFF]); // 4 × 400 + 300 = 1900 ms, escalados para 1000
    const delay = Number(delayOf(m.container, 'j1'));
    expect(delay).toBeGreaterThan(0.5);
    expect(delay).toBeLessThan(0.9);
  });

  it('com movimento reduzido nada espera: a troca é direta', () => {
    const m = mount(BEFORE, { prefs: { reduceMotion: true } });
    emit(m, AFTER, [TURN, BUFF]);
    expect(delayOf(m.container, 'j1')).toBe('0');
  });

  it('a marca da iniciativa espera a batida do InitiativeChanged', () => {
    const m = mount(THEIRS);
    emit(m, { ...THEIRS, initiative: 'opponent' }, [TURN, { type: 'InitiativeChanged', player: 'p2' }]);
    expect(delayOf(m.container, INITIATIVE_ID)).toBe('0.4');
  });

  it('o Motion mede a mesa uma vez por `state` e uma vez quando as batidas acabam', () => {
    const m = mount(BEFORE);
    const dep = () => layoutOf(m.container, 'k1').getAttribute('data-layout-dep');
    const first = dep();
    emit(m, AFTER, [TURN, BUFF]);
    const during = dep();
    expect(during).not.toBe(first);
    // Nada muda por causa da batida seguinte: a medida não repete a cada desenho.
    advance(400);
    expect(dep()).toBe(during);
    advance(300);
    expect(dep()).not.toBe(during);
  });
});

describe('encerrar na hora as transições que ficaram no ar', () => {
  it('o pulo remonta as cartas que a linha do tempo mexia, com duração zero; as outras ficam', async () => {
    const m = mount(BEFORE);
    emit(m, AFTER, [TURN, BUFF]);
    const before = new Map(probe.mounts);
    expect(durationOf(m.container, 'j1')).toBe('0.3');
    await m.user.click(stage(m.container));
    expect(probe.mounts.get('j1')).toBe((before.get('j1') ?? 0) + 1);
    expect(durationOf(m.container, 'j1')).toBe('0');
    // As cartas que nenhuma batida mexia seguem montadas (o foco do teclado não se perde).
    expect(probe.mounts.get('k1')).toBe(before.get('k1'));
    expect(probe.mounts.get('x-p1-ATK-0')).toBe(before.get('x-p1-ATK-0'));
  });

  it('o fim natural das batidas não remonta nada', () => {
    const m = mount(BEFORE);
    emit(m, AFTER, [TURN, BUFF]);
    const before = new Map(probe.mounts);
    advance(1_000);
    expect(probe.mounts).toEqual(before);
  });

  it('um `state` novo no meio das batidas remonta as cartas da linha velha que a nova não mexe', () => {
    const m = mount(BEFORE);
    emit(m, AFTER, [TURN, BUFF]);
    const before = probe.mounts.get('j1') ?? 0;
    advance(200);
    emit(m, AFTER, []); // o bot respondeu: um `state` sem batidas
    expect(probe.mounts.get('j1')).toBe(before + 1);
    expect(durationOf(m.container, 'j1')).toBe('0');
    expect(delayOf(m.container, 'j1')).toBe('0');
  });

  it('a carta que a linha nova também mexe anima de verdade, com a espera dela', () => {
    const m = mount(BEFORE);
    emit(m, AFTER, [TURN, BUFF]);
    advance(200);
    emit(m, AFTER, [TURN, TURN, BUFF]);
    expect(durationOf(m.container, 'j1')).toBe('0.3');
    // Mais batidas antes (e o teto de 1 s, com uma decisão minha esperando): espera mais que na linha velha.
    expect(Number(delayOf(m.container, 'j1'))).toBeGreaterThan(0.4);
  });

  it('depois do pulo, o `state` seguinte volta a animar normalmente', async () => {
    const m = mount(BEFORE);
    emit(m, AFTER, [TURN, BUFF]);
    await m.user.click(stage(m.container));
    expect(durationOf(m.container, 'j1')).toBe('0');
    emit(m, BEFORE, [BUFF]);
    expect(durationOf(m.container, 'j1')).toBe('0.3');
  });

  it('pular sem batida não remonta nada', async () => {
    const m = mount(BEFORE);
    const before = new Map(probe.mounts);
    await m.user.click(stage(m.container));
    expect(probe.mounts).toEqual(before);
  });

  it('o Esc também encerra na hora', async () => {
    const m = mount(BEFORE);
    emit(m, AFTER, [TURN, BUFF]);
    await m.user.keyboard('{Escape}');
    expect(durationOf(m.container, 'j1')).toBe('0');
  });
});

describe('o resto da mesa continua funcionando com o Motion trocado', () => {
  it('a mão com a barra de ação responde ao toque', async () => {
    const m = mount(BEFORE);
    const hand = within(screen.getByRole('list', { name: 'Sua mão' }));
    await m.user.click(hand.getByRole('button', { name: /^A de / }));
    expect(hand.getByRole('button', { name: /^A de / })).toHaveAttribute('aria-pressed', 'true');
  });
});
