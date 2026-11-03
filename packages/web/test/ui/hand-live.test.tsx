// A mão que diz o que joga agora, na mesa de jogo (bloco A dos pontos do playtest, ponto 2): o conjunto sai da lista legal da `PlayTable`,
// não do `locked` das batidas; no Equipar e na vez dele, tudo apaga; depois do passe, a Armadilha que a lista ainda traz também.
import type { GameEvent, SpecialCard } from '@coringa/engine';
import { act, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { advance, busy, cleanup, emit, MINE, mount, THEIRS } from './anim-harness.tsx';
import type { ViewSpec } from '../fixtures.ts';

afterEach(cleanup);

const items = () => [...screen.getByRole('list', { name: 'Sua mão' }).querySelectorAll<HTMLElement>(':scope > li')];
const marks = () => items().map((li) => (li.hasAttribute('data-joga') ? 'joga' : li.hasAttribute('data-sem-jogada') ? 'apagada' : '—'));

describe('a mão na mesa de jogo', () => {
  it('na sua vez, as que jogam ficam em pé; no Equipar e na vez dele, todas apagam', () => {
    const first = mount(MINE, { training: 'medio' });
    expect(marks()).toEqual(['joga', 'joga', 'joga']);
    first.unmount();
    const theirs = mount(THEIRS, { training: 'medio' });
    expect(marks()).toEqual(['apagada', 'apagada', 'apagada']);
    theirs.unmount();
    mount({ ...MINE, phase: { kind: 'EQUIP' }, self: { ...MINE.self, pending: [5] } }, { training: 'medio' });
    expect(marks()).toEqual(['apagada', 'apagada', 'apagada']);
  });

  it('durante as batidas, a mão segue a decisão, não o travamento: as marcas não mudam de uma batida para a outra', () => {
    const Q1: SpecialCard = { id: 'q-joga', kind: 'Q', suit: 'copas' };
    const K1: SpecialCard = { id: 'k-joga', kind: 'K', suit: 'paus' };
    const before: ViewSpec = { ...MINE, self: { ...MINE.self, hand: [K1, Q1] } };
    const after: ViewSpec = { ...MINE, self: { ...MINE.self, hand: [K1], defenseBuffs: ['Q', Q1] } };
    const m = mount(before, { training: 'medio' });
    const played: GameEvent = { type: 'BuffPlayed', player: 'p1', card: Q1, as: 'Q' };
    emit(m, after, [{ type: 'TurnStarted', player: 'p1' }, played]);
    expect(busy(m.container)).toBe(true);
    const during = marks();
    expect(during).toEqual(['joga']);
    advance(200);
    expect(marks()).toEqual(during);
    advance(2_000);
    expect(busy(m.container)).toBe(false);
    expect(marks()).toEqual(during);
  });

  it('na janela do ataque dele, só o A joga; depois do seu passe, ele também apaga', async () => {
    const m = mount({ ...MINE, phase: 'ATTACK', self: { ...MINE.self, hand: ['J', 'Q', 'A'] } }, { training: 'medio' });
    expect(marks()).toEqual(['apagada', 'apagada', 'joga']);
    await act(async () => {
      await m.user.click(screen.getByRole('button', { name: /^Passar/ }));
    });
    expect(marks()).toEqual(['apagada', 'apagada', 'apagada']);
  });

  it('fora da sua vez, o toque na carta apagada segue mostrando o motivo', async () => {
    const m = mount(THEIRS, { training: 'medio' });
    await act(async () => {
      await m.user.click(items()[0]!.querySelector('button')!);
    });
    expect(m.container.querySelector('[data-motivo]')).not.toBeNull();
  });
});
