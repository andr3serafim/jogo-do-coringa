// O salto do replay (voltar, "Início", a rodada) entrega o `state` em `resync`: as cartas trocam de lugar sem deslizar (a
// transição de layout dura zero), e o passo à frente de verdade segue animando. No jsdom o Motion não anima, então este arquivo
// troca os `m.*` por elementos comuns que deixam no DOM a duração da transição de layout (como `animation-layout.test.tsx`).
import { RULES_VERSION } from '@coringa/engine';
import { act, cleanup as unmountAll, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LAYOUT_SPRING } from '../../src/ui/anim/motion.ts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { recordPastGame, type PastGame } from '../../src/model/past-games.ts';
import ReplayScreen from '../../src/ui/screens/ReplayScreen.tsx';
import { realReplay } from '../fixtures.ts';
import { advance, cleanup } from './anim-harness.tsx';
import { memoryStore } from './support.tsx';

vi.mock('motion/react-m', async () => {
  const React = await import('react');
  const make = (tag: string) =>
    function MockM(props: Record<string, unknown>) {
      const { layoutId, layoutDependency, transition, ...rest } = props as {
        layoutId?: string;
        layoutDependency?: string;
        transition?: { layout?: { delay?: number; duration?: number; visualDuration?: number } };
      } & Record<string, unknown>;
      delete rest.animate;
      delete rest.initial;
      return React.createElement(tag, {
        ...rest,
        'data-layout-id': layoutId,
        // A mola (U4) não tem `duration`: o que vale é quanto ela leva para assentar.
        'data-layout-duration': transition?.layout?.duration ?? transition?.layout?.visualDuration,
        'data-layout-dep': layoutDependency,
      });
    };
  return { div: make('div'), button: make('button'), span: make('span'), svg: make('svg'), p: make('p') };
});

beforeEach(() => {
  window.history.replaceState(null, '', '/partidas');
});

afterEach(() => {
  unmountAll();
  cleanup();
});

const REPLAY = realReplay('ui-1');

type Entry = Omit<PastGame, 'id'>;

const ENTRY: Entry = {
  date: new Date(2026, 9, 25, 14, 30).getTime(),
  mode: { kind: 'training', level: 'medio' },
  seat: 'p1',
  names: { me: 'Ana', opponent: 'Duda' },
  outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner: 'p1', reason: 'HP' } },
  rounds: 19,
  score: { p1: 1, p2: 0, draws: 0 },
  rulesVersion: RULES_VERSION,
  replay: REPLAY,
};

function open() {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  const advanceInAct = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };
  vi.stubGlobal('jest', { advanceTimersByTime: advanceInAct });
  const user = userEvent.setup({ advanceTimers: advanceInAct });
  const store = memoryStore();
  const game = recordPastGame(store, ENTRY, 1_000)!;
  const view = render(<ReplayScreen store={store} id={game.id} />);
  return { user, ...view };
}

const control = (name: string) => screen.getByRole('button', { name });
/** As durações de layout das cartas da mesa (e da marca da iniciativa) agora. */
const durations = (container: HTMLElement): Set<string | null> =>
  new Set([...container.querySelectorAll('[data-layout-id]')].map((el) => el.getAttribute('data-layout-duration')));

describe('o replay: o salto troca a mesa sem deslizar', () => {
  it('"Passo anterior", "Início" e a rodada zeram a duração do layout; o passo à frente volta a animar', async () => {
    const { user, container } = open();
    expect(durations(container).size).toBe(1);

    // Passo a passo, com as batidas: as cartas deslizam (a mola, U4; as que um passo seguinte encerrou na hora chegam com 0).
    for (let i = 0; i < 12; i++) await user.click(control('Próximo passo'));
    advance(5_000);
    expect(durations(container).has(String(LAYOUT_SPRING.visualDuration))).toBe(true);

    await user.click(control('Passo anterior'));
    expect(durations(container)).toEqual(new Set(['0']));

    await user.click(control('Próximo passo'));
    expect(durations(container)).toEqual(new Set([String(LAYOUT_SPRING.visualDuration)]));
    advance(5_000);

    await user.click(control('Início'));
    expect(durations(container)).toEqual(new Set(['0']));

    await user.click(control('Próximo passo'));
    await user.click(control('Próximo passo'));
    expect(durations(container)).toEqual(new Set([String(LAYOUT_SPRING.visualDuration)]));
    advance(5_000);

    await user.selectOptions(screen.getByLabelText('Rodada'), '3');
    expect(durations(container)).toEqual(new Set(['0']));
  });
});
