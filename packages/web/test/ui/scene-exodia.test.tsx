// A cena da Exódia (sub-projeto 6 §7.3): os 4 K chegam um a um e cada um ergue o seu pilar de luz, a aura vermelha e dourada
// cresce em volta do Coringa, a coroa desce e crava (a inversão é da linha do tempo), e os raios estalam em volta. Sem feixes dos
// K até o Coringa. No jsdom não há Web Animations: os testes conferem o que existe e quando (timers falsos).
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roomNames } from '../../src/model/history.ts';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { buildTimeline, RARE_SCENE_MS } from '../../src/model/timeline.ts';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import { AURA_BOIL_MS } from '../../src/ui/anim/aura.ts';
import { Exodia } from '../../src/ui/scenes/Exodia.tsx';

const BOX: SceneBox = {
  band: { x: 0, y: 96, w: 1000, h: 360 },
  hudBottom: 96,
  portrait: { voce: { x: 40, y: 48 }, oponente: { x: 960, y: 48 } },
  row: () => null,
  reflectZone: () => null,
  graveyard: () => null,
};
const M = SCENE_MOMENTS.EXODIA;

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

function show(reduced = false) {
  const [beat] = buildTimeline([{ type: 'Exodia', player: 'p2' }], { mode: 'live', reducedMotion: reduced, decisionPending: false });
  return render(<Exodia beat={beat!} names={roomNames('p1', [])} reduced={reduced} me="p1" hitLanded={false} box={BOX} field={null} />);
}

const q = (selector: string) => document.querySelector<HTMLElement>(selector);
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];
const landed = () => all('[data-carta-cena="K"][data-chegou]').length;
const litPillars = () => all('[data-pilar][data-aceso]').length;

describe('a Exódia', () => {
  it('os 4 K chegam um a um, cada um no seu instante, e cada um ergue o seu pilar', () => {
    show();
    expect(all('[data-pilar]')).toHaveLength(4);
    let now = 0;
    for (const [i, at] of M.kingsAt.entries()) {
      advance(at - 1 - now);
      expect(landed()).toBe(i);
      expect(litPillars()).toBe(i);
      advance(1);
      now = at;
      expect(landed()).toBe(i + 1);
      expect(litPillars()).toBe(i + 1);
    }
  });

  it('sem feixes dos K até o Coringa', () => {
    show();
    advance(RARE_SCENE_MS.EXODIA);
    expect(q('[data-feixe]')).toBeNull();
  });

  it('a coroa crava no instante dela, e os olhos acendem', () => {
    show();
    advance(M.crownAt - 1);
    expect(q('[data-coroa]')).not.toHaveAttribute('data-cravada');
    expect(q('[data-olhos]')).not.toHaveAttribute('data-aceso');
    advance(1);
    expect(q('[data-coroa]')).toHaveAttribute('data-cravada');
    expect(q('[data-olhos]')).toHaveAttribute('data-aceso');
  });

  it('a aura ferve: a forma troca a cada 70 ms', () => {
    show();
    const first = q('[data-aura] path')!.getAttribute('d');
    advance(AURA_BOIL_MS);
    expect(q('[data-aura] path')!.getAttribute('d')).not.toBe(first);
  });

  it('nunca passa de 60 partículas vivas', () => {
    show();
    let peak = 0;
    for (let t = 0; t < RARE_SCENE_MS.EXODIA; t += 20) {
      advance(20);
      peak = Math.max(peak, all('[data-particula]').length);
    }
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(60);
  });

  it('com movimento reduzido: a aura parada, nenhuma partícula, e os K e a coroa aparecem no lugar, sem voo', () => {
    show(true);
    const first = q('[data-aura] path')!.getAttribute('d');
    advance(M.kingsAt[0]);
    expect(landed()).toBe(1);
    expect(q('[data-carta-cena="K"]')).not.toHaveAttribute('data-voo');
    advance(M.crownAt - M.kingsAt[0]);
    expect(q('[data-coroa]')).toHaveAttribute('data-cravada');
    expect(q('[data-aura] path')!.getAttribute('d')).toBe(first);
    expect(all('[data-particula]')).toHaveLength(0);
  });
});
