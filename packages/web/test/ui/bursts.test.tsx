// As partículas das jogadas comuns (sub-projeto 6 §8, fatia 5): a poeira do pouso e os cacos da carta que quebra, a camada que as recebe e o
// que o palco diz às cartas (o recuo e o pouso de cada uma).
import type { GameEvent, SpecialCard } from '@coringa/engine';
import { act, render, screen } from '@testing-library/react';
import { useRef, type ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { shardsPerCard, TABLE_MOTION } from '../../src/model/table-motion.ts';
import type { Session } from '../../src/model/session.ts';
import { dust, shards } from '../../src/ui/anim/bursts.ts';
import { useAnim } from '../../src/ui/anim/context.ts';
import { FxLayer, useFxLayer } from '../../src/ui/anim/FxLayer.tsx';
import { rng } from '../../src/ui/anim/particles.ts';
import { Stage } from '../../src/ui/anim/Stage.tsx';
import { advance, cleanup, connect, emit, MINE, TURN } from './anim-harness.tsx';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(cleanup);

const BOX = { x: 10, y: 20, w: 60, h: 84 };
const live = (layer: Element) => layer.querySelectorAll('[data-particula]').length;

describe('a poeira e os cacos', () => {
  it('a poeira solta `count` puffs que saem sozinhos', () => {
    const layer = document.createElement('div');
    dust([], layer, BOX, 5, rng(1));
    expect(layer.querySelectorAll('[data-poeira][data-particula]')).toHaveLength(5);
    advance(TABLE_MOTION.dustMs);
    expect(live(layer)).toBe(0);
  });

  it('os cacos de papel saem sozinhos', () => {
    const layer = document.createElement('div');
    shards([], layer, BOX, 10, rng(2));
    expect(layer.querySelectorAll('[data-caco][data-particula]')).toHaveLength(10);
    advance(TABLE_MOTION.shardMs);
    expect(live(layer)).toBe(0);
  });

  it('4 K que estouram juntos, com duas poeiras, ficam abaixo de 60 partículas (§11)', () => {
    const layer = document.createElement('div');
    for (let i = 0; i < 4; i++) shards([], layer, BOX, shardsPerCard(4), rng(i + 1));
    dust([], layer, BOX, TABLE_MOTION.dust, rng(9));
    dust([], layer, BOX, TABLE_MOTION.dust, rng(10));
    expect(live(layer)).toBeLessThanOrEqual(60);
  });
});

describe('a camada dos efeitos', () => {
  function Spark({ kind }: { kind: 'dust' | 'shards' }) {
    const fx = useFxLayer();
    const self = useRef<HTMLButtonElement>(null);
    return (
      <button type="button" ref={self} onClick={() => fx.burst(kind, self.current!, 4)}>
        soltar
      </button>
    );
  }
  const layerOf = (container: HTMLElement) => container.querySelector('[data-camada-fx]')!;

  it('o burst põe as partículas na camada, escondida do leitor de tela', () => {
    const { container } = render(
      <FxLayer reduced={false}>
        <Spark kind="dust" />
      </FxLayer>,
    );
    act(() => screen.getByRole('button').click());
    expect(layerOf(container)).toHaveAttribute('aria-hidden', 'true');
    expect(layerOf(container).querySelectorAll('[data-poeira]')).toHaveLength(4);
  });

  it('com movimento reduzido, nada', () => {
    const { container } = render(
      <FxLayer reduced>
        <Spark kind="shards" />
      </FxLayer>,
    );
    act(() => screen.getByRole('button').click());
    expect(live(layerOf(container))).toBe(0);
  });
});

describe('o palco diz às cartas o recuo e o pouso', () => {
  const J: SpecialCard = { id: 'j-voa', kind: 'J', suit: 'ouros' };
  const PLAY: GameEvent = { type: 'BuffPlayed', player: 'p1', card: J, as: 'J' };

  function Probe() {
    const anim = useAnim();
    return (
      <output data-testid="fx">
        {JSON.stringify({ recoil: anim.recoilAt(J.id), land: anim.landAt(J.id) })}
      </output>
    );
  }
  const stageOf = (session: Session): ReactNode => (
    <Stage snapshot={session.snapshot()} reducedMotion={false}>
      <Probe />
    </Stage>
  );
  const read = () => JSON.parse(screen.getByTestId('fx').textContent!) as { recoil: number | null; land: { at: number; drop: boolean; dust: number } | null };

  it('ao vivo: o J recua no começo da batida dele e pousa depois do recuo e da mola, em segundos', () => {
    const { session, connection } = connect(MINE);
    const view = render(stageOf(session));
    emit({ connection }, MINE, [TURN, PLAY]);
    view.rerender(stageOf(session));
    expect(read()).toEqual({ recoil: 0.4, land: { at: 0.91, drop: false, dust: 5 } });
  });

  it('o pouso continua valendo depois do fim natural das batidas, mas o pulo o apaga', () => {
    const { session, connection } = connect(MINE);
    const view = render(stageOf(session));
    emit({ connection }, MINE, [TURN, PLAY]);
    view.rerender(stageOf(session));
    advance(800);
    view.rerender(stageOf(session));
    expect(read().land).not.toBeNull();
    emit({ connection }, MINE, [TURN, PLAY]);
    view.rerender(stageOf(session));
    act(() => document.querySelector<HTMLElement>('[data-palco]')!.click());
    expect(read()).toEqual({ recoil: null, land: null });
  });

  it('no catchUp não há recuo nem pouso', () => {
    const { session, connection } = connect(MINE);
    const view = render(stageOf(session));
    emit({ connection }, MINE, [TURN, PLAY], { catchUp: true });
    view.rerender(stageOf(session));
    expect(read()).toEqual({ recoil: null, land: null });
  });
});
