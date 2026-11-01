// A cena da Defesa Absoluta (sub-projeto 6 §7.2): a muralha que sobe, o escudo-fortaleza que despenca e crava, os 4 Q que cravam
// nos quartos do brasão, a trava (os 22 rebites, o emblema da coroa) e o escudo que encolhe e voa até o retrato do dono, onde vira
// a insígnia. Sem a cúpula. No jsdom não há Web Animations: os testes conferem o que existe e quando (timers falsos).
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roomNames } from '../../src/model/history.ts';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { buildTimeline } from '../../src/model/timeline.ts';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import { AbsoluteDefense, rivetPoints, RIVETS_LEAD_MS } from '../../src/ui/scenes/AbsoluteDefense.tsx';

const BOX: SceneBox = {
  band: { x: 0, y: 96, w: 1000, h: 360 },
  hudBottom: 96,
  portrait: { voce: { x: 40, y: 48 }, oponente: { x: 960, y: 48 } },
  row: () => null,
};
const M = SCENE_MOMENTS.ABSOLUTE_DEFENSE;

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

function show(player: 'p1' | 'p2', reduced = false) {
  const [beat] = buildTimeline([{ type: 'AbsoluteDefenseStarted', player }], { mode: 'live', reducedMotion: reduced, decisionPending: false });
  return render(<AbsoluteDefense beat={beat!} names={roomNames('p1', [])} reduced={reduced} me="p1" hitLanded={false} box={BOX} field={null} />);
}

const q = (selector: string) => document.querySelector<HTMLElement>(selector);
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

describe('os rebites do aro', () => {
  it('são 22, dentro do escudo, e nenhum repetido', () => {
    const points = rivetPoints();
    expect(points).toHaveLength(22);
    for (const { x, y } of points) {
      expect(x).toBeGreaterThan(20);
      expect(x).toBeLessThan(180);
      expect(y).toBeGreaterThan(14);
      expect(y).toBeLessThan(234);
    }
    expect(new Set(points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`)).size).toBe(22);
  });
});

describe('a Defesa Absoluta', () => {
  it('a muralha sobe, e o escudo crava no instante dele', () => {
    show('p1');
    expect(q('[data-muralha]')).not.toBeNull();
    advance(M.shieldLandsAt - 1);
    expect(q('[data-escudo]')).not.toHaveAttribute('data-pousado');
    advance(1);
    expect(q('[data-escudo]')).toHaveAttribute('data-pousado');
  });

  it('os 4 Q acendem nos quartos, um a um', () => {
    show('p1');
    const lit = () => all('[data-quarto]').filter((quarter) => quarter.hasAttribute('data-aceso')).length;
    // Os quartos são do escudo, que existe a partir da queda.
    advance(M.shieldLandsAt);
    expect(all('[data-quarto]')).toHaveLength(4);
    expect(lit()).toBe(0);
    advance(M.queensAt[0] - M.shieldLandsAt);
    expect(lit()).toBe(1);
    advance(M.queensAt[1] - M.queensAt[0]);
    expect(lit()).toBe(2);
    advance(M.queensAt[3] - M.queensAt[1]);
    expect(lit()).toBe(4);
  });

  it('a trava: os 22 rebites acendem em sequência até ela, e o emblema crava nela', () => {
    show('p1');
    const lit = () => all('[data-rebite]').filter((rivet) => rivet.hasAttribute('data-aceso')).length;
    advance(M.shieldLandsAt);
    expect(all('[data-rebite]')).toHaveLength(22);
    advance(M.lockAt - RIVETS_LEAD_MS - 1 - M.shieldLandsAt);
    expect(lit()).toBe(0);
    advance(RIVETS_LEAD_MS / 2);
    expect(lit()).toBeGreaterThan(0);
    expect(lit()).toBeLessThan(22);
    expect(q('[data-emblema]')).not.toHaveAttribute('data-aceso');
    advance(RIVETS_LEAD_MS / 2 + 1);
    expect(lit()).toBe(22);
    expect(q('[data-emblema]')).toHaveAttribute('data-aceso');
  });

  it('sem a cúpula', () => {
    show('p1');
    advance(4_800);
    expect(q('[data-cupula]')).toBeNull();
  });

  it('no fim, o escudo voa até o retrato do dono: o seu, quando é você', () => {
    show('p1');
    advance(M.insigniaAt - 1);
    expect(q('[data-insignia-voa]')).toBeNull();
    advance(1);
    expect(q('[data-insignia-voa]')).toHaveAttribute('data-alvo', 'voce');
  });

  it('o do oponente, quando é ele', () => {
    show('p2');
    advance(M.insigniaAt);
    expect(q('[data-insignia-voa]')).toHaveAttribute('data-alvo', 'oponente');
  });

  it('com movimento reduzido, o escudo aparece já pousado no instante dele, sem queda', () => {
    show('p1', true);
    advance(M.shieldLandsAt - 1);
    expect(q('[data-escudo]')).toBeNull();
    advance(1);
    expect(q('[data-escudo]')).toHaveAttribute('data-pousado');
  });
});
