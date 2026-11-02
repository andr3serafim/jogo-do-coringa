// A cena da Ressurreição (sub-projeto 6 §7.6): a quadra chama o céu, a carta sobe sem cor, a cor volta no alto e ela pousa na fileira. No jsdom não
// há Web Animations nem layout: a caixa é falsa, e os testes conferem o que existe e quando (timers falsos).
import type { GameEvent, NumCard, PlayerId } from '@coringa/engine';
import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { RisingInfo } from '../../src/model/effects.ts';
import { roomNames } from '../../src/model/history.ts';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { buildTimeline, RARE_SCENE_MS } from '../../src/model/timeline.ts';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import { Resurrection } from '../../src/ui/scenes/Resurrection.tsx';

const M = SCENE_MOMENTS.RESURRECTED;
const MAX_PARTICLES = 60;
const num = (id: string, value = 8): NumCard => ({ id, kind: 'NUM', value: value as NumCard['value'], suit: 'copas' });
const QUAD = [num('q1'), num('q2'), num('q3'), num('q4')];
const REVIVED = num('volta', 9);
const event = (player: PlayerId = 'p1'): GameEvent => ({ type: 'Resurrected', player, card: REVIVED, row: 'ATK' });
const WITH_QUAD: RisingInfo = { landIndex: 5, quad: { row: 'ATK', indices: [0, 1, 2, 3], cards: QUAD } };
const NO_QUAD: RisingInfo = { landIndex: 5, quad: null };

/** A caixa falsa: o p1 embaixo, o p2 em cima, cada fileira com 8 vagas. */
function fakeBox(): SceneBox {
  return {
    band: { x: 0, y: 90, w: 1000, h: 500 },
    hudBottom: 90,
    portrait: { voce: { x: 40, y: 48 }, oponente: { x: 960, y: 48 } },
    reflectZone: () => null,
    graveyard: () => ({ x: 800, y: 320, w: 120, h: 60 }),
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

function show({ player = 'p1', me = 'p1', reduced = false, rising = WITH_QUAD, box = fakeBox() }: { player?: PlayerId; me?: PlayerId; reduced?: boolean; rising?: RisingInfo | null; box?: SceneBox } = {}) {
  const [beat] = buildTimeline([event(player)], { mode: 'live', reducedMotion: reduced, decisionPending: false });
  return render(
    <div data-palco>
      <div data-campos />
      <span data-card-id="volta" data-real="" />
      <Resurrection beat={beat!} names={roomNames(me, [])} reduced={reduced} me={me} hitLanded={false} box={box} field={null} rising={rising} />
    </div>,
  );
}

const q = (selector: string) => document.querySelector<HTMLElement>(selector);
const all = (selector: string) => [...document.querySelectorAll<HTMLElement>(selector)];
const real = () => q('[data-real]')!;

function peakParticles(ms: number): number {
  let peak = 0;
  for (let t = 0; t < ms; t += 20) {
    advance(20);
    peak = Math.max(peak, all('[data-particula]').length);
  }
  return peak;
}

describe('a Ressurreição: a quadra chama o céu', () => {
  it('as cópias da quadra acendem nas vagas certas, desde o começo', () => {
    show();
    advance(0);
    const copies = all('[data-quadra-cena]');
    expect(copies).toHaveLength(4);
    expect(copies.map((copy) => copy.style.left)).toEqual(['40px', '100px', '160px', '220px']);
    expect(copies[0]!.style.top).toBe('400px');
  });

  it('os fios saem no instante deles, um de cada carta', () => {
    show();
    advance(M.threadsAt - 1);
    expect(all('[data-fio]')).toHaveLength(0);
    advance(1);
    expect(all('[data-fio]')).toHaveLength(4);
  });

  it('sem quadra na mesa: nenhuma carta acende, e os fios saem da fileira de destino', () => {
    show({ rising: NO_QUAD });
    advance(M.threadsAt);
    expect(all('[data-quadra-cena]')).toHaveLength(0);
    const threads = all('[data-fio]');
    expect(threads).toHaveLength(4);
    // A ponta de baixo de cada fio fica na fileira: o topo dele é a base menos a altura.
    threads.forEach((thread) => {
      expect(Number.parseFloat(thread.style.top) + Number.parseFloat(thread.style.height)).toBe(400);
    });
  });

  it('o portal, os raios e a coluna entram cada um no instante dele', () => {
    show();
    advance(M.portalAt - 1);
    expect(q('[data-portal]')).toBeNull();
    expect(q('[data-raios]')).toBeNull();
    advance(1);
    expect(q('[data-portal]')).not.toBeNull();
    expect(q('[data-raios]')).not.toBeNull();
    advance(M.columnAt - M.portalAt - 1);
    expect(q('[data-coluna]')).toBeNull();
    advance(1);
    expect(q('[data-coluna]')).not.toBeNull();
  });
});

describe('a Ressurreição: a carta renasce', () => {
  it('sobe no instante dela, com o valor da carta que volta', () => {
    show();
    advance(M.riseAt - 1);
    expect(q('[data-carta-cena]')).toBeNull();
    advance(1);
    expect(q('[data-carta-cena]')).toHaveTextContent('9');
  });

  it('a cor volta e o nome carimba no mesmo instante, e a auréola já está lá', () => {
    show();
    advance(M.colorAt - 1);
    expect(q('[data-carta-cena]')).not.toHaveAttribute('data-colorida');
    expect(q('[data-carimbo]')).toBeNull();
    expect(q('[data-aureola]')).not.toBeNull();
    advance(1);
    expect(q('[data-carta-cena]')).toHaveAttribute('data-colorida');
    expect(q('[data-carimbo="RESURRECTED"]')).toHaveTextContent('RESSURREIÇÃO');
  });

  it('a auréola some quando ela parte para a fileira', () => {
    show();
    advance(M.flightAt);
    expect(q('[data-aureola]')).toBeNull();
    expect(q('[data-carta-cena]')).toHaveAttribute('data-voo');
  });

  it('pousa no instante dela', () => {
    show();
    advance(M.landAt - 1);
    expect(q('[data-carta-cena]')).not.toHaveAttribute('data-pousou');
    advance(1);
    expect(q('[data-carta-cena]')).toHaveAttribute('data-pousou');
  });

  it('a carta de verdade fica escondida até a cópia pousar', () => {
    show();
    advance(0);
    expect(real().style.visibility).toBe('hidden');
    advance(M.landAt - 1);
    expect(real().style.visibility).toBe('hidden');
    advance(1);
    expect(real().style.visibility).toBe('');
  });

  it('o pulo (a cena desmonta no meio) devolve a carta de verdade na hora', () => {
    const view = show();
    advance(M.riseAt);
    const card = real();
    expect(card.style.visibility).toBe('hidden');
    view.rerender(
      <div data-palco>
        <div data-campos />
        <span data-card-id="volta" data-real="" ref={(node) => {
          if (node) expect(node).toBe(card);
        }} />
      </div>,
    );
    expect(card.style.visibility).toBe('');
  });

  it('sem a vaga medida, a cópia só some ao pousar, sem erro', () => {
    show({ rising: { landIndex: -1, quad: null } });
    advance(RARE_SCENE_MS.RESURRECTED);
    expect(real().style.visibility).toBe('');
  });

  it('sem o que a mesa diz, a cena ainda toca, sem cartas acesas', () => {
    show({ rising: null });
    advance(M.colorAt);
    expect(q('[data-carta-cena]')).toHaveAttribute('data-colorida');
    expect(all('[data-quadra-cena]')).toHaveLength(0);
  });
});

describe('a Ressurreição: os limites', () => {
  it('as partículas ficam dentro do limite, e somem sozinhas', () => {
    show();
    expect(peakParticles(RARE_SCENE_MS.RESURRECTED)).toBeLessThanOrEqual(MAX_PARTICLES);
    advance(3_000);
    expect(all('[data-particula]')).toHaveLength(0);
  });

  it('o céu some antes do fim da cena', () => {
    show();
    advance(M.fadeAt - 1);
    expect(q('[data-ceu]')).not.toHaveAttribute('data-somindo');
    advance(1);
    expect(q('[data-ceu]')).toHaveAttribute('data-somindo');
  });

  it('com movimento reduzido: as peças nos mesmos instantes, sem voo nem partícula', () => {
    show({ reduced: true });
    advance(M.portalAt);
    expect(q('[data-portal]')).not.toBeNull();
    advance(M.colorAt - M.portalAt);
    expect(q('[data-carta-cena]')).toHaveAttribute('data-colorida');
    expect(q('[data-carimbo="RESURRECTED"]')).not.toBeNull();
    expect(q('[data-voo]')).toBeNull();
    advance(M.flightAt - M.colorAt);
    expect(q('[data-voo]')).toBeNull();
    expect(peakParticles(RARE_SCENE_MS.RESURRECTED - M.flightAt)).toBe(0);
  });

  it('a do Bot pousa na fileira dele, em cima', () => {
    show({ player: 'p2' });
    advance(0);
    expect(all('[data-quadra-cena]')[0]!.style.top).toBe('120px');
  });
});
