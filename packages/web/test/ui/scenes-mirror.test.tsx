// As contas do espelho do Reflect (sub-projeto 6 §7.5): onde ele fica, de onde o cometa vem e para onde volta. Puro: a mesma caixa dá
// sempre o mesmo desenho, e no celular em pé tudo se prende à faixa medida.
import { describe, expect, it } from 'vitest';
import type { SceneBox } from '../../src/ui/anim/scene-box.ts';
import { cometStops, mirrorLayout, mirrorSize, mirrorTips, otherPlayer, reflectFrom } from '../../src/ui/scenes/mirror.ts';

const PC = { x: 0, y: 96, w: 1536, h: 480 };
const PHONE = { x: 0, y: 120, w: 360, h: 320 };

describe('o tamanho do espelho', () => {
  it('no PC, 300 px, como no protótipo', () => {
    expect(mirrorSize(PC)).toBe(300);
  });

  it('no celular, encolhe na proporção da faixa', () => {
    const size = mirrorSize(PHONE);
    expect(size).toBeGreaterThanOrEqual(140);
    expect(size).toBeLessThanOrEqual(224);
  });

  it('nunca fica abaixo de 140 px', () => {
    expect(mirrorSize({ w: 100, h: 100 })).toBe(140);
  });
});

describe('onde o espelho fica', () => {
  it('a 60% do caminho entre a fileira de quem atacou e o campo do dono', () => {
    const { center, start } = mirrorLayout({ x: 300, y: 200 }, { x: 900, y: 400 }, PC);
    expect(start).toEqual({ x: 300, y: 200 });
    expect(center).toEqual({ x: 660, y: 320 });
  });

  it('o espelho inteiro e a origem cabem na faixa, com a origem e o alvo fora dela', () => {
    const { center, size, start } = mirrorLayout({ x: -50, y: 20 }, { x: 900, y: 2_000 }, PHONE);
    expect(center.x - size / 2).toBeGreaterThanOrEqual(PHONE.x);
    expect(center.x + size / 2).toBeLessThanOrEqual(PHONE.x + PHONE.w);
    expect(center.y - size / 2).toBeGreaterThanOrEqual(PHONE.y);
    expect(center.y + size / 2).toBeLessThanOrEqual(PHONE.y + PHONE.h);
    expect(start.x).toBeGreaterThanOrEqual(PHONE.x);
    expect(start.y).toBeGreaterThanOrEqual(PHONE.y);
  });

  it('a faixa menor que o espelho: fica no meio dela', () => {
    const tiny = { x: 10, y: 20, w: 100, h: 100 };
    expect(mirrorLayout({ x: 0, y: 0 }, { x: 500, y: 500 }, tiny).center).toEqual({ x: 60, y: 70 });
  });
});

describe('as pontas e as paradas do cometa', () => {
  it('as três pontas nas frações do protótipo', () => {
    const [top, left, right] = mirrorTips({ x: 500, y: 300 }, 300);
    expect(top).toEqual({ x: 500, y: 300 - 126 });
    expect(left).toEqual({ x: 500 - 111, y: 300 + 66 });
    expect(right).toEqual({ x: 500 + 111, y: 300 + 66 });
  });

  it('o cometa para a 42% e a 66% do caminho, e bate no vidro', () => {
    const { p1, p2, hit } = cometStops({ x: 0, y: 0 }, { x: 100, y: 200 }, 300);
    expect(p1).toEqual({ x: 42, y: 84 });
    expect(p2).toEqual({ x: 66, y: 132 });
    expect(hit).toEqual({ x: 100, y: 194 });
  });
});

describe('quem é quem no Reflect', () => {
  const box = (rows = true): SceneBox => ({
    band: PC,
    hudBottom: 96,
    portrait: { voce: { x: 40, y: 48 }, oponente: { x: 1_500, y: 48 } },
    reflectZone: () => null,
    graveyard: () => null,
    row: (player) =>
      rows
        ? {
            rect: player === 'p1' ? { x: 100, y: 400, w: 400, h: 100 } : { x: 100, y: 120, w: 400, h: 100 },
            slots: [],
            field: player === 'p1' ? { x: 0, y: 340, w: 1_000, h: 200 } : { x: 0, y: 100, w: 1_000, h: 200 },
          }
        : null,
  });

  it('o outro jogador', () => {
    expect(otherPlayer('p1')).toBe('p2');
    expect(otherPlayer('p2')).toBe('p1');
  });

  it('o seu Reflect: o golpe vem da fileira do Bot, e volta ao retrato dele', () => {
    expect(reflectFrom(box(), 'p1', 'p2', 'p1')).toEqual({ origin: { x: 300, y: 170 }, target: { x: 500, y: 440 }, back: { x: 1_500, y: 48 } });
  });

  it('o Reflect do Bot: o seu golpe sai da sua fileira, e volta ao seu retrato', () => {
    expect(reflectFrom(box(), 'p2', 'p1', 'p1')).toEqual({ origin: { x: 300, y: 450 }, target: { x: 500, y: 200 }, back: { x: 40, y: 48 } });
  });

  it('sem a fileira medida, valem os retratos', () => {
    expect(reflectFrom(box(false), 'p1', 'p2', 'p1')).toEqual({ origin: { x: 1_500, y: 48 }, target: { x: 40, y: 48 }, back: { x: 1_500, y: 48 } });
  });
});
