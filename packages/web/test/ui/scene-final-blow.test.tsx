// A cena do golpe final (bloco B dos pontos do playtest, ponto 15): a fileira de quem bate acende, o corte atravessa a mesa até o retrato do outro,
// o número no impacto e o carimbo. No jsdom não há Web Animations nem layout: a caixa é falsa, e os testes conferem o que existe e quando (timers
// falsos). A inversão, o tremor e a vida que desce são do palco (`animation.test.tsx`).
import type { GameEvent, PlayerId } from '@coringa/engine';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rowKey, type FinalBlowInfo } from '../../src/model/effects.ts';
import { roomNames } from '../../src/model/history.ts';
import { FINAL_BLOW_MS, SCENE_MOMENTS, TITLE_MS } from '../../src/model/scene-moments.ts';
import { buildTimeline } from '../../src/model/timeline.ts';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import { FinalBlow } from '../../src/ui/scenes/FinalBlow.tsx';

const T = SCENE_MOMENTS.FINAL_BLOW;
const MAX_PARTICLES = 60;

/** A caixa falsa: o p1 embaixo, o p2 em cima, cada fileira de Ataque com 8 vagas de 50 × 70, a cada 60 px. */
function fakeBox(): SceneBox {
  return {
    band: { x: 0, y: 90, w: 1000, h: 500 },
    hudBottom: 90,
    portrait: { voce: { x: 40, y: 48 }, oponente: { x: 960, y: 48 } },
    reflectZone: () => null,
    graveyard: () => null,
    row: (player) => {
      const y = player === 'p1' ? 400 : 120;
      return {
        rect: { x: 40, y, w: 700, h: 80 },
        slots: Array.from({ length: 8 }, (_, i) => ({ x: 40 + i * 60, y, w: 50, h: 70 })),
        field: { x: 0, y: y - 30, w: 1000, h: 200 },
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

const kill = (attacker: PlayerId): GameEvent[] => [
  { type: 'DamageDealt', attacker, defender: attacker === 'p1' ? 'p2' : 'p1', attack: 290, defense: 95, damage: 195 },
  { type: 'GameOver', result: { kind: 'WIN', winner: attacker, reason: 'HP' } },
];

interface Show {
  attacker?: PlayerId;
  me?: PlayerId;
  reduced?: boolean;
  cards?: number;
  hitLanded?: boolean;
}

function element({ attacker = 'p1', me = 'p1', reduced = false, cards = 5, hitLanded = false }: Show) {
  const [beat] = buildTimeline(kill(attacker), { mode: 'live', reducedMotion: reduced, decisionPending: false });
  const blow: FinalBlowInfo = { attacker, target: attacker === me ? 'oponente' : 'voce', cards };
  return (
    <div data-palco>
      <div data-campos>
        <div data-fileira={rowKey(attacker, 'ATK')} />
      </div>
      <FinalBlow beat={beat!} names={roomNames(me, [])} reduced={reduced} me={me} hitLanded={hitLanded} box={fakeBox()} field={null} blow={blow} />
    </div>
  );
}

const show = (options: Show = {}) => {
  const rendered = render(element(options));
  return { ...rendered, land: () => rendered.rerender(element({ ...options, hitLanded: true })) };
};

const q = (selector: string) => document.querySelector<HTMLElement>(selector);
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];

function peakParticles(ms: number): number {
  let peak = 0;
  for (let t = 0; t < ms; t += 20) {
    advance(20);
    peak = Math.max(peak, all('[data-particula]').length);
  }
  return peak;
}

describe('o golpe final: a fileira acende e o corte atravessa a mesa', () => {
  it('as tarjas desde o começo, abaixo do placar', () => {
    show();
    advance(0);
    expect(q('[data-golpe-final]')).not.toBeNull();
    expect(q('[data-tarja="cima"]')).not.toBeNull();
    expect(q('[data-tarja="baixo"]')).not.toBeNull();
  });

  it('as cartas da fileira de Ataque de quem bate acendem uma depois da outra, até litUntil, nas vagas certas', () => {
    show({ cards: 5 });
    advance(0);
    expect(all('[data-acesa]')).toHaveLength(1);
    advance(Math.ceil((2 * T.litUntil) / 5));
    expect(all('[data-acesa]')).toHaveLength(3);
    advance(T.litUntil);
    const lit = all('[data-acesa]');
    expect(lit).toHaveLength(5);
    expect(lit.map((halo) => halo.style.left)).toEqual(['40px', '100px', '160px', '220px', '280px']);
    expect(lit.every((halo) => halo.style.top === '400px')).toBe(true);
  });

  it('do Bot, a fileira dele, em cima', () => {
    show({ attacker: 'p2', me: 'p1', cards: 3 });
    advance(T.litUntil);
    expect(all('[data-acesa]').map((halo) => halo.style.top)).toEqual(['120px', '120px', '120px']);
  });

  it('o corte sai do meio da fileira em cutAt e vai até o retrato do alvo', () => {
    show({ cards: 5 });
    advance(T.cutAt - 1);
    expect(q('[data-corte]')).toBeNull();
    advance(1);
    const cut = q('[data-corte]')!;
    expect(cut).toHaveAttribute('data-alvo', 'oponente');
    // O meio das cinco vagas (de 40 a 330) e o meio da altura delas; o retrato do Bot em (960, 48).
    const from = { x: 185, y: 435 };
    const to = { x: 960, y: 48 };
    expect(cut.style.left).toBe(`${from.x}px`);
    expect(cut.style.width).toBe(`${Math.round(Math.hypot(to.x - from.x, to.y - from.y))}px`);
    expect(cut.style.transform).toContain(`rotate(${((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI).toFixed(2)}deg)`);
  });

  it('o do Bot vai até o seu retrato', () => {
    show({ attacker: 'p2', me: 'p1' });
    advance(T.cutAt);
    expect(q('[data-corte]')).toHaveAttribute('data-alvo', 'voce');
  });
});

describe('o golpe final: o impacto e o carimbo', () => {
  it('o número do golpe só quando o golpe acende, perto do retrato do alvo', () => {
    const m = show();
    advance(T.hitAt);
    expect(q('[data-dano]')).toBeNull();
    m.land();
    expect(q('[data-dano]')).toHaveTextContent('−195');
  });

  it('GOLPE FINAL! para quem bate, em titleAt, e sai depois do carimbo comum', () => {
    show();
    advance(T.titleAt - 1);
    expect(q('[data-carimbo]')).toBeNull();
    advance(1);
    expect(q('[data-carimbo="FINAL_BLOW"]')).toHaveTextContent('GOLPE FINAL!');
    advance(TITLE_MS);
    expect(q('[data-carimbo]')).toBeNull();
  });

  it('DERROTA para quem leva: a mesma cena, espelhada', () => {
    show({ attacker: 'p2', me: 'p1' });
    advance(T.titleAt);
    expect(q('[data-carimbo="FINAL_BLOW"]')).toHaveTextContent('DERROTA');
  });

  it('as faíscas no retrato e os respingos do carimbo: no máximo 60 de uma vez, e somem sozinhos', () => {
    show();
    const peak = peakParticles(FINAL_BLOW_MS + 1_000);
    expect(peak).toBeGreaterThan(0);
    expect(peak).toBeLessThanOrEqual(MAX_PARTICLES);
    expect(all('[data-particula]')).toHaveLength(0);
  });
});

describe('o golpe final com movimento reduzido', () => {
  it('a fileira acende de uma vez, nenhuma partícula, e o corte e o carimbo nos mesmos instantes', () => {
    show({ reduced: true, cards: 4 });
    advance(0);
    expect(all('[data-acesa]')).toHaveLength(4);
    expect(peakParticles(T.cutAt)).toBe(0);
    expect(q('[data-corte]')).not.toBeNull();
    expect(peakParticles(T.titleAt - T.cutAt)).toBe(0);
    expect(q('[data-carimbo="FINAL_BLOW"]')).not.toBeNull();
    expect(peakParticles(FINAL_BLOW_MS)).toBe(0);
  });
});

describe('o golpe final no celular em pé', () => {
  it('os campos rolam até a fileira de quem bate antes da medida', () => {
    const rect = (top: number, bottom: number) => ({ top, bottom, left: 0, right: 360, width: 360, height: bottom - top, x: 0, y: top, toJSON: () => ({}) });
    const spy = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      if (this.hasAttribute('data-campos')) return rect(0, 640) as DOMRect;
      if (this.getAttribute('data-fileira') === rowKey('p1', 'ATK')) return rect(900, 980) as DOMRect;
      return rect(0, 0) as DOMRect;
    });
    show();
    expect(q('[data-campos]')!.scrollTop).toBe(980 - 640 + 12);
    spy.mockRestore();
  });
});
