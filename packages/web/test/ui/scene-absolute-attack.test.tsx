// A cena do Ataque Absoluto (sub-projeto 6 §7.1): o Coringa de quem ataca, a aura que ferve, os 4 J que entram nele, os olhos que
// acendem, o feixe até o retrato do alvo. No jsdom não há Web Animations: os testes conferem o que existe e quando (timers
// falsos), o lado (o espelho do oponente), a geometria do feixe e o teto de partículas. O número, os respingos e o tremor do
// golpe são do placar e do palco (Task 2), não da cena.
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roomNames } from '../../src/model/history.ts';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { buildTimeline } from '../../src/model/timeline.ts';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import { AbsoluteAttack, attackLayout, BEAM_HOLD_MS, BEAM_LEAD_MS } from '../../src/ui/scenes/AbsoluteAttack.tsx';

const BOX: SceneBox = {
  band: { x: 0, y: 96, w: 1000, h: 360 },
  hudBottom: 96,
  portrait: { voce: { x: 40, y: 48 }, oponente: { x: 960, y: 48 } },
  row: () => null,
  reflectZone: () => null,
};
const M = SCENE_MOMENTS.ABSOLUTE_ATTACK;

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

function show(player: 'p1' | 'p2', { reduced = false, box = BOX } = {}) {
  const [beat] = buildTimeline([{ type: 'AbsoluteAttack', player }], { mode: 'live', reducedMotion: reduced, decisionPending: false });
  return render(<AbsoluteAttack beat={beat!} names={roomNames('p1', [])} reduced={reduced} me="p1" hitLanded={false} box={box} field={null} />);
}

const q = (selector: string) => document.querySelector<HTMLElement>(selector);

describe('o Ataque Absoluto do seu lado', () => {
  it('o Coringa fica à esquerda da faixa, e o feixe mira o retrato do oponente', () => {
    const layout = attackLayout(BOX, true);
    expect(layout.cx).toBeLessThan(500);
    expect(layout.target).toEqual(BOX.portrait.oponente);
    show('p1');
    expect(q('[data-heroi]')).toHaveAttribute('data-lado', 'voce');
  });

  it('a aura ferve: o desenho muda a cada ~70 ms', () => {
    show('p1');
    const d = () => q('[data-aura] path')!.getAttribute('d');
    const before = d();
    advance(70);
    expect(d()).not.toBe(before);
  });

  it('os 4 J giram e somem no Coringa até a transformação, quando os olhos acendem', () => {
    show('p1');
    expect(document.querySelectorAll('[data-carta-cena="J"]')).toHaveLength(4);
    expect(q('[data-olhos]')).not.toHaveAttribute('data-aceso');
    advance(M.transformAt);
    expect(document.querySelectorAll('[data-carta-cena="J"]')).toHaveLength(0);
    expect(q('[data-olhos]')).toHaveAttribute('data-aceso');
  });

  it('interceptado por um Reflect, o feixe não dispara: nada o acerta (§7.5)', () => {
    const [beat] = buildTimeline(
      [
        { type: 'AbsoluteAttack', player: 'p1' },
        { type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 40 },
      ],
      { mode: 'live', reducedMotion: false, decisionPending: false },
    );
    render(<AbsoluteAttack beat={beat!} names={roomNames('p1', [])} reduced={false} me="p1" hitLanded={false} box={BOX} field={null} />);
    advance(M.hitAt + 1);
    expect(q('[data-feixe]')).toBeNull();
  });

  it('o feixe só existe em volta do impacto, e aponta da bola para o retrato do alvo', () => {
    show('p1');
    advance(M.hitAt - BEAM_LEAD_MS - 1);
    expect(q('[data-feixe]')).toBeNull();
    advance(1);
    const beam = q('[data-feixe]')!;
    const { ball, target } = attackLayout(BOX, true);
    const angle = (Math.atan2(target.y - ball.y, target.x - ball.x) * 180) / Math.PI;
    expect(beam.style.left).toBe(`${ball.x}px`);
    expect(beam.style.top).toBe(`${ball.y}px`);
    expect(beam.style.transform).toBe(`rotate(${angle}deg)`);
    advance(BEAM_LEAD_MS + BEAM_HOLD_MS);
    expect(q('[data-feixe]')).toBeNull();
  });
});

describe('o Ataque Absoluto do oponente (o espelho)', () => {
  it('o Coringa fica à direita, e o feixe mira o seu retrato', () => {
    const layout = attackLayout(BOX, false);
    expect(layout.cx).toBeGreaterThan(500);
    expect(layout.target).toEqual(BOX.portrait.voce);
    show('p2');
    expect(q('[data-heroi]')).toHaveAttribute('data-lado', 'oponente');
  });

  it('no celular em pé, o Coringa fica no meio da faixa', () => {
    const narrow: SceneBox = { ...BOX, band: { x: 0, y: 64, w: 360, h: 420 } };
    expect(attackLayout(narrow, true).cx).toBe(500);
    expect(attackLayout(narrow, false).cx).toBe(500);
  });
});

describe('com movimento reduzido', () => {
  it('a aura não ferve, nada voa, e não há partículas', () => {
    show('p1', { reduced: true });
    const d = () => q('[data-aura] path')!.getAttribute('d');
    const before = d();
    advance(140);
    expect(d()).toBe(before);
    expect(document.querySelectorAll('[data-carta-cena="J"]')).toHaveLength(4);
    for (let t = 0; t < 4_500; t += 100) {
      advance(100);
      expect(document.querySelectorAll('[data-particula]')).toHaveLength(0);
    }
  });
});

describe('o teto de partículas (spec 6 §11)', () => {
  it('nunca mais de 60 vivas ao longo da cena', () => {
    show('p1');
    let peak = 0;
    for (let t = 0; t < 4_500; t += 50) {
      advance(50);
      peak = Math.max(peak, document.querySelectorAll('[data-particula]').length);
    }
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(60);
  });
});
