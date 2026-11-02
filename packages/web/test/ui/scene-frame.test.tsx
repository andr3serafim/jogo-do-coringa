// A moldura comum das cenas refeitas no sub-projeto 6 (fatia 2, §7 "Gramática comum"): as tarjas de cinema, a faixa onde a cena
// é desenhada (um quadro de 1000 × 360 escalado para a faixa medida) e o nome carimbado. No jsdom não há Web Animations nem
// layout: os testes conferem o que aparece e quando (timers falsos), as contas puras e as caixas que a moldura recebe.
import type { GameEvent } from '@coringa/engine';
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { roomNames } from '../../src/model/history.ts';
import { SCENE_MOMENTS, TITLE_MS } from '../../src/model/scene-moments.ts';
import { buildTimeline } from '../../src/model/timeline.ts';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import { BeatOverlay } from '../../src/ui/anim/Scene.tsx';
import { SceneFrame, stageFit, stampKeyframes } from '../../src/ui/scenes/SceneFrame.tsx';

const BOX: SceneBox = {
  band: { x: 0, y: 96, w: 1000, h: 360 },
  hudBottom: 96,
  portrait: { voce: { x: 40, y: 48 }, oponente: { x: 960, y: 48 } },
  row: () => null,
  reflectZone: () => null,
};

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

describe('o quadro da cena: 1000 × 360 unidades, escalado para caber na faixa e centrado', () => {
  it('na faixa do tamanho do quadro, escala 1', () => {
    expect(stageFit(1000, 360)).toEqual({ scale: 1, x: 0, y: 0 });
  });

  it('no celular em pé, a largura manda e o quadro desce para o meio da faixa', () => {
    const fit = stageFit(360, 400);
    expect(fit.scale).toBeCloseTo(0.36);
    expect(fit.x).toBe(0);
    expect(fit.y).toBeCloseTo((400 - 360 * 0.36) / 2);
  });

  it('numa faixa baixa e larga, a altura manda e o quadro vai para o meio da largura', () => {
    const fit = stageFit(1600, 360);
    expect(fit.scale).toBe(1);
    expect(fit.x).toBe(300);
  });
});

describe('<SceneFrame>', () => {
  it('a faixa fica na caixa medida, e as tarjas dentro dela, em cima e embaixo', () => {
    const { container } = render(
      <SceneFrame kind="ABSOLUTE_ATTACK" box={BOX} reduced={false}>
        <span data-teste />
      </SceneFrame>,
    );
    const band = container.querySelector<HTMLElement>('[data-faixa-cena]')!;
    expect(band.style).toMatchObject({ left: '0px', top: '96px', width: '1000px', height: '360px' });
    expect(band.querySelector('[data-tarja="cima"]')).not.toBeNull();
    expect(band.querySelector('[data-tarja="baixo"]')).not.toBeNull();
    expect(band.querySelector('[data-teste]')).not.toBeNull();
  });

  it('o nome carimba no instante dele e sai depois de TITLE_MS', () => {
    render(<SceneFrame kind="ABSOLUTE_ATTACK" box={BOX} reduced={false} />);
    const at = SCENE_MOMENTS.ABSOLUTE_ATTACK.titleAt;
    advance(at - 1);
    expect(document.querySelector('[data-carimbo]')).toBeNull();
    advance(1);
    expect(document.querySelector('[data-carimbo="ABSOLUTE_ATTACK"]')).toHaveTextContent('ATAQUE ABSOLUTO');
    advance(TITLE_MS);
    expect(document.querySelector('[data-carimbo]')).toBeNull();
  });

  it('a Defesa carimba no instante dela, com o nome dela', () => {
    render(<SceneFrame kind="ABSOLUTE_DEFENSE" box={BOX} reduced={false} />);
    advance(SCENE_MOMENTS.ABSOLUTE_DEFENSE.titleAt);
    expect(screen.getByText('DEFESA ABSOLUTA').closest('[data-carimbo]')).toHaveAttribute('data-carimbo', 'ABSOLUTE_DEFENSE');
  });

  it('o carimbo da Exódia (§7.3): ouro sobre tinta, com filete de ouro e sombra vermelha, maior que os outros', () => {
    render(<SceneFrame kind="EXODIA" box={BOX} reduced={false} />);
    advance(SCENE_MOMENTS.EXODIA.titleAt);
    const stamp = screen.getByText('EXÓDIA!');
    expect(stamp.closest('[data-carimbo]')).toHaveAttribute('data-carimbo', 'EXODIA');
    expect(stamp.className).toMatch(/\bbg-tinta\b/);
    expect(stamp.className).toMatch(/\btext-ouro\b/);
    expect(stamp.className).toMatch(/\bborder-ouro\b/);
    expect(stamp.className).toContain('var(--color-vermelho)');
    expect(stamp.className).toMatch(/\bpc:text-7xl\b/);
  });

  it('o carimbo entra grande e assenta; com movimento reduzido, só esmaece (nenhuma transformação)', () => {
    const full = stampKeyframes(false);
    expect(full[0]).toMatchObject({ opacity: 0, transform: 'scale(3)' });
    expect(full.at(-1)).toMatchObject({ opacity: 0 });
    const calm = stampKeyframes(true);
    expect(calm.every((frame) => !('transform' in frame))).toBe(true);
    expect(calm.map((frame) => frame.opacity)).toEqual([0, 1, 1, 0]);
  });

  it('sem caixa medida, nada desenha', () => {
    const { container } = render(<SceneFrame kind="ABSOLUTE_ATTACK" box={null} reduced={false} />);
    expect(container.querySelector('[data-faixa-cena]')).toBeNull();
  });
});

describe('sem o módulo das cenas carregado', () => {
  it('a cena rara mostra o painel de hoje, com o título', () => {
    const [beat] = buildTimeline([{ type: 'AbsoluteAttack', player: 'p2' } satisfies GameEvent], {
      mode: 'live',
      reducedMotion: false,
      decisionPending: false,
    });
    render(<BeatOverlay scene={beat!} curtain names={roomNames('p1', [])} reduced={false} me="p1" hitLanded={false} />);
    const panel = document.querySelector('[data-painel-cena]')!;
    expect(panel).toHaveAttribute('data-ativo', 'true');
    expect(panel).toHaveTextContent('ATAQUE ABSOLUTO');
  });

  it('a Exódia mostra o painel com os quatro K em cruz, os raios girando e o título com "e vence!"', () => {
    const [beat] = buildTimeline([{ type: 'Exodia', player: 'p2' } satisfies GameEvent], {
      mode: 'live',
      reducedMotion: false,
      decisionPending: false,
    });
    const names = roomNames('p1', [{ playerId: 'p2', nickname: 'Duda' }]);
    render(<BeatOverlay scene={beat!} curtain names={names} reduced={false} me="p1" hitLanded={false} />);
    expect(document.querySelector('[data-figura]')).toHaveAttribute('data-figura', 'cross');
    const cards = [...document.querySelectorAll('[data-figura] [data-card-id]')].map((card) => card.getAttribute('data-card-id'));
    expect(cards).toEqual(['cena-K-0', 'cena-K-1', 'cena-K-2', 'cena-K-3']);
    expect(document.querySelector('[data-raios]')!.getAttribute('class')).toContain('animate-[spin');
    expect(document.querySelector('[data-painel-cena]')).toHaveTextContent('Duda reuniu os quatro K e vence!');
  });

  it('com movimento reduzido, a figura já parada e os raios parados', () => {
    const [beat] = buildTimeline([{ type: 'Exodia', player: 'p2' } satisfies GameEvent], {
      mode: 'live',
      reducedMotion: true,
      decisionPending: false,
    });
    render(<BeatOverlay scene={beat!} curtain names={roomNames('p1', [])} reduced me="p1" hitLanded={false} />);
    expect(document.querySelectorAll('[data-figura] [data-card-id]')).toHaveLength(4);
    expect(document.querySelector('[data-raios]')!.getAttribute('class')).not.toContain('animate-');
  });
});
