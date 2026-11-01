// A cena da Devastação (sub-projeto 6 §7.4), no campo, sobre a fileira atingida: a terra ronca, a fenda corre, o chão se abre e as
// cópias das cartas caem; o nome carimba. As variantes: a refletida (a fenda na fileira de quem lançou) e a cancelada (a fenda
// começa e para, sem abismo nem nome). No jsdom não há Web Animations nem layout: a caixa é falsa, e os testes conferem o que existe
// e quando (timers falsos).
import type { DevastationState, GameEvent, NumCard, RowName } from '@coringa/engine';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { fieldTarget } from '../../src/model/effects.ts';
import { roomNames } from '../../src/model/history.ts';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { buildTimeline, RARE_SCENE_MS } from '../../src/model/timeline.ts';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import { Devastation } from '../../src/ui/scenes/Devastation.tsx';

const M = SCENE_MOMENTS.DEVASTATION;
const C = SCENE_MOMENTS.DEVASTATION_CANCELED;
const num = (id: string): NumCard => ({ id, kind: 'NUM', value: 5, suit: 'copas' });
const CARDS = [num('n1'), num('n2'), num('n3'), num('n4')];
const cast: DevastationState = { player: 'p1', row: 'DEF', k: { id: 'k', kind: 'K', suit: 'copas' }, a: { id: 'a', kind: 'A', suit: 'paus' }, x: { id: 'q', kind: 'Q', suit: 'ouros' } };

/** A caixa falsa: a faixa começa em (0, 96), e cada fileira tem 5 vagas de 70 × 98. */
function fakeBox(asked: string[] = []): SceneBox {
  return {
    band: { x: 0, y: 96, w: 1000, h: 360 },
    hudBottom: 96,
    portrait: { voce: { x: 40, y: 48 }, oponente: { x: 960, y: 48 } },
    row: (player, row) => {
      asked.push(`${player}:${row}`);
      return {
        rect: { x: 80, y: 136, w: 500, h: 100 },
        slots: [0, 1, 2, 3, 4].map((i) => ({ x: 100 + i * 80, y: 136, w: 70, h: 98 })),
        field: { x: 0, y: 96, w: 1000, h: 180 },
      };
    },
  };
}

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

const advance = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

function show(event: GameEvent, { me = 'p1', reduced = false, box = fakeBox() }: { me?: 'p1' | 'p2'; reduced?: boolean; box?: SceneBox } = {}) {
  const [beat] = buildTimeline([event], { mode: 'live', reducedMotion: reduced, decisionPending: false });
  const field = fieldTarget(event, cast, me, me === 'p1' ? 'p2' : 'p1');
  return render(
    <div data-palco>
      <section data-campo="p1" />
      <section data-campo="p2" />
      <Devastation beat={beat!} names={roomNames(me, [])} reduced={reduced} me={me} hitLanded={false} box={box} field={field} />
    </div>,
  );
}

const fell = (player: 'p1' | 'p2', row: RowName = 'DEF', reflected = false): GameEvent => ({ type: 'RowDevastated', player, row, cards: CARDS, reflected });
const q = (selector: string) => document.querySelector<HTMLElement>(selector);
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

describe('a Devastação', () => {
  it('a terra ronca: até o fim do ronco, o campo do alvo treme, e só ele', () => {
    show(fell('p2'));
    expect(q('[data-campo="p2"]')).toHaveAttribute('data-tremendo');
    expect(q('[data-campo="p1"]')).not.toHaveAttribute('data-tremendo');
    advance(M.rumbleUntil - 1);
    expect(q('[data-campo="p2"]')).toHaveAttribute('data-tremendo');
    advance(1);
    expect(q('[data-campo="p2"]')).not.toHaveAttribute('data-tremendo');
  });

  it('o retrato de quem lançou brilha em vermelho', () => {
    show(fell('p2'));
    expect(q('[data-brilho-lancador]')).toHaveAttribute('data-brilho-lancador', 'voce');
  });

  it('a fenda corre no instante dela', () => {
    show(fell('p2'));
    advance(M.crackAt - 1);
    expect(q('[data-fenda]')).toBeNull();
    advance(1);
    expect(q('[data-fenda]')).not.toBeNull();
  });

  it('o chão se abre no instante dele, com as rachaduras', () => {
    show(fell('p2'));
    advance(M.openAt - 1);
    expect(q('[data-abismo]')).toBeNull();
    expect(all('[data-rachadura]')).toHaveLength(0);
    advance(1);
    expect(q('[data-abismo]')).not.toBeNull();
    expect(all('[data-rachadura]')).toHaveLength(12);
  });

  it('a fenda corre por cima das cartas, e o abismo toma o lugar dela', () => {
    show(fell('p2'));
    advance(M.crackAt);
    const crack = q('[data-fenda]')!;
    const copy = q('[data-carta-caindo]')!;
    expect(copy.compareDocumentPosition(crack) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    advance(M.openAt - M.crackAt);
    expect(q('[data-fenda]')).toBeNull();
  });

  it('as cartas da fileira: uma cópia por carta do evento, na vaga dela, relativa à faixa', () => {
    show(fell('p2'));
    const copies = all('[data-carta-caindo]');
    expect(copies).toHaveLength(4);
    copies.forEach((copy, i) => {
      expect(copy.style.left).toBe(`${100 + i * 80}px`);
      expect(copy.style.top).toBe(`${136 - 96}px`);
      expect(copy.style.width).toBe('70px');
    });
    expect(copies[0]!.querySelector('[data-card-id]')).toHaveAttribute('data-card-id', 'cena-n1');
  });

  it('as cópias saem depois de cair', () => {
    show(fell('p2'));
    advance(M.openAt);
    expect(all('[data-carta-caindo]')).toHaveLength(4);
    advance(RARE_SCENE_MS.DEVASTATION - M.openAt);
    expect(all('[data-carta-caindo]')).toHaveLength(0);
  });

  it('o nome carimba no instante dele', () => {
    show(fell('p2'));
    advance(M.titleAt - 1);
    expect(q('[data-carimbo]')).toBeNull();
    advance(1);
    expect(q('[data-carimbo="DEVASTATION"]')).toHaveTextContent('DEVASTAÇÃO!');
  });

  it('sem tarjas nem faixa: a cena é no campo', () => {
    show(fell('p2'));
    advance(M.openAt);
    expect(q('[data-tarja]')).toBeNull();
    expect(q('[data-faixa-cena]')).toBeNull();
    expect(q('[data-campo-cena]')).toHaveAttribute('data-campo-cena', 'DEVASTATION');
  });

  it('nunca passa de 60 partículas vivas', () => {
    show(fell('p2'));
    let peak = 0;
    for (let t = 0; t < RARE_SCENE_MS.DEVASTATION; t += 20) {
      advance(20);
      peak = Math.max(peak, all('[data-particula]').length);
    }
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(60);
  });

  it('as quatro combinações: a cena mede a fileira atingida, sua ou do oponente, de Ataque ou de Defesa', () => {
    for (const [player, row] of [['p1', 'ATK'], ['p1', 'DEF'], ['p2', 'ATK'], ['p2', 'DEF']] as const) {
      const asked: string[] = [];
      const { unmount } = show(fell(player, row), { box: fakeBox(asked) });
      expect(asked).toContain(`${player}:${row}`);
      expect(q(`[data-campo="${player}"]`)).toHaveAttribute('data-tremendo');
      unmount();
    }
  });

  it('refletida: a fenda abre na fileira de quem lançou, e é o retrato dele que brilha', () => {
    const asked: string[] = [];
    show(fell('p1', 'DEF', true), { box: fakeBox(asked) });
    expect(asked).toContain('p1:DEF');
    expect(q('[data-campo="p1"]')).toHaveAttribute('data-tremendo');
    expect(q('[data-brilho-lancador]')).toHaveAttribute('data-brilho-lancador', 'voce');
    advance(M.openAt);
    expect(q('[data-abismo]')).not.toBeNull();
  });

  it('o pulo (a cena desmonta) para o tremor', () => {
    const { unmount } = show(fell('p2'));
    expect(q('[data-campo="p2"]')).toHaveAttribute('data-tremendo');
    const field = q('[data-campo="p2"]')!;
    unmount();
    expect(field).not.toHaveAttribute('data-tremendo');
  });

  it('com movimento reduzido: nenhum tremor nem partícula; o abismo aparece e as cópias somem', () => {
    show(fell('p2'), { reduced: true });
    expect(q('[data-campo="p2"]')).not.toHaveAttribute('data-tremendo');
    expect(all('[data-carta-caindo]')).toHaveLength(4);
    advance(M.openAt);
    expect(q('[data-abismo]')).not.toBeNull();
    expect(all('[data-carta-caindo]')).toHaveLength(0);
    expect(all('[data-particula]')).toHaveLength(0);
  });
});

describe('a Devastação cancelada', () => {
  const canceled = (reason: 'REFLECT_CLASH' | 'ABSOLUTE_DEFENSE', player: 'p1' | 'p2' = 'p1'): GameEvent => ({ type: 'DevastationCanceled', player, reason });

  it('a fenda começa e para, sem abismo e sem nome', () => {
    show(canceled('REFLECT_CLASH'));
    advance(C.crackAt);
    expect(q('[data-fenda]')).not.toHaveAttribute('data-parada');
    advance(C.stopAt - C.crackAt);
    expect(q('[data-fenda]')).toHaveAttribute('data-parada');
    advance(RARE_SCENE_MS.DEVASTATION_CANCELED - C.stopAt);
    expect(q('[data-abismo]')).toBeNull();
    expect(q('[data-carimbo]')).toBeNull();
    expect(all('[data-carta-caindo]')).toHaveLength(0);
  });

  it('o tremor morre quando a fenda para', () => {
    show(canceled('REFLECT_CLASH'));
    advance(C.stopAt - 1);
    expect(q('[data-campo="p2"]')).toHaveAttribute('data-tremendo');
    advance(1);
    expect(q('[data-campo="p2"]')).not.toHaveAttribute('data-tremendo');
  });

  it('nos Reflects, a terra ronca no alvo da Devastação; a Defesa Absoluta segura a que voltou para quem a lançou', () => {
    const first = show(canceled('REFLECT_CLASH'));
    expect(q('[data-campo="p2"]')).toHaveAttribute('data-tremendo');
    first.unmount();
    show(canceled('ABSOLUTE_DEFENSE'));
    expect(q('[data-campo="p1"]')).toHaveAttribute('data-tremendo');
  });
});
