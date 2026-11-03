// O momento da especial do oponente na mesa (bloco A dos pontos do playtest, ponto 1): a conta do turno entre um `state` e outro, o véu
// leve pela mesma trava de flash da cortina e, online, a sua especial que segura o tempo do momento que o oponente vê (decisoes.md
// 2026-11-03 (5), A9a).
import type { GameEvent, SpecialCard } from '@coringa/engine';
import { SPECIAL_MOMENT_MS } from '@coringa/protocol';
import { act } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { advance, busy, cleanup, emit, MINE, mount, stage, THEIRS, TURN } from './anim-harness.tsx';
import type { ViewSpec } from '../fixtures.ts';

afterEach(cleanup);

const JB: SpecialCard = { id: 'jb', kind: 'J', suit: 'paus' };
const JB2: SpecialCard = { id: 'jb2', kind: 'J', suit: 'copas' };
const botBuff = (card: SpecialCard): GameEvent => ({ type: 'BuffPlayed', player: 'p2', card, as: 'J' });
const BOT_ONE: ViewSpec = { ...THEIRS, opponent: { ...THEIRS.opponent, attackBuffs: [JB] } };
const BOT_TWO: ViewSpec = { ...THEIRS, opponent: { ...THEIRS.opponent, attackBuffs: [JB, JB2] } };

/** Quanto tempo as batidas ficam no ar, em passos de 50 ms (o palco tira `data-ocupado` no fim). */
function busyFor(container: HTMLElement): number {
  let ms = 0;
  while (busy(container) && ms < 10_000) {
    advance(50);
    ms += 50;
  }
  return ms;
}

const veil = (container: HTMLElement) => container.querySelector('[data-cortina][data-ativa][data-veu="momento"]');

describe('a conta do turno, de um state para o outro', () => {
  it('a segunda especial do Bot no mesmo turno é mais curta; o TurnStarted zera', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [TURN, botBuff(JB)]);
    expect(busyFor(m.container)).toBe(400 + SPECIAL_MOMENT_MS.first);
    emit(m, BOT_TWO, [botBuff(JB2)]);
    expect(busyFor(m.container)).toBe(SPECIAL_MOMENT_MS.next);
    emit(m, BOT_ONE, [TURN, botBuff(JB)]);
    expect(busyFor(m.container)).toBe(400 + SPECIAL_MOMENT_MS.first);
  });

  it('o resync zera a conta', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [TURN, botBuff(JB)]);
    busyFor(m.container);
    emit(m, BOT_ONE, [], { resync: true });
    emit(m, BOT_TWO, [botBuff(JB2)]);
    expect(busyFor(m.container)).toBe(SPECIAL_MOMENT_MS.first);
  });
});

describe('o véu do momento', () => {
  it('sobe com o momento, é o leve, e desce no fim dele', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [botBuff(JB)]);
    // A cortina sobe no timer da batida (0 ms), como a das cenas.
    advance(10);
    expect(veil(m.container)).not.toBeNull();
    advance(SPECIAL_MOMENT_MS.first + 400);
    expect(m.container.querySelector('[data-cortina][data-ativa]')).toBeNull();
  });

  it('com movimento reduzido, nenhum véu', () => {
    const m = mount(THEIRS, { training: 'medio', prefs: { reduceMotion: true } });
    emit(m, BOT_ONE, [botBuff(JB)]);
    expect(m.container.querySelector('[data-cortina][data-ativa]')).toBeNull();
  });

  it('o pulo no meio: o véu desce e a carta de verdade aparece na hora', () => {
    const m = mount(THEIRS, { training: 'medio' });
    emit(m, BOT_ONE, [botBuff(JB)]);
    advance(300);
    expect(m.container.querySelector('[data-card-id="jb"]')).toHaveAttribute('data-entra');
    act(() => stage(m.container).click());
    expect(m.container.querySelector('[data-card-id="jb"]')).not.toHaveAttribute('data-entra');
    advance(1_100);
    expect(m.container.querySelector('[data-cortina][data-ativa]')).toBeNull();
  });
});

describe('online, a sua especial espera o momento que o oponente vê (A9a)', () => {
  const J1: SpecialCard = { id: 'j1', kind: 'J', suit: 'espadas' };
  const J2: SpecialCard = { id: 'j2', kind: 'J', suit: 'ouros' };
  const MY_TURN: GameEvent = { type: 'TurnStarted', player: 'p1' };
  const myBuff = (card: SpecialCard): GameEvent => ({ type: 'BuffPlayed', player: 'p1', card, as: 'J' });
  const HAND: ViewSpec = { ...MINE, self: { ...MINE.self, hand: [J1, J2], attackBuffs: [] } };
  const ONE: ViewSpec = { ...HAND, self: { ...HAND.self, hand: [J2], attackBuffs: [J1] } };
  const TWO: ViewSpec = { ...HAND, self: { ...HAND.self, hand: [], attackBuffs: [J1, J2] } };

  it('a primeira do turno segura 1,6 s, a segunda 1,1 s, sem véu nem carta grande', () => {
    const m = mount(HAND);
    emit(m, ONE, [MY_TURN, myBuff(J1)]);
    expect(veil(m.container)).toBeNull();
    expect(busyFor(m.container)).toBe(400 + SPECIAL_MOMENT_MS.first);
    emit(m, TWO, [myBuff(J2)]);
    expect(busyFor(m.container)).toBe(SPECIAL_MOMENT_MS.next);
  });

  it('no treino, a sua especial é a jogada de sempre', () => {
    const m = mount(HAND, { training: 'medio' });
    emit(m, ONE, [MY_TURN, myBuff(J1)]);
    expect(busyFor(m.container)).toBe(400 + 300);
  });
});
