// As contas do céu da Ressurreição (sub-projeto 6 §7.6): o portal, o chão onde a coluna pousa e o alto, onde a carta recebe a cor. Puro: a mesma
// caixa dá sempre o mesmo desenho, e no celular em pé tudo se prende à faixa medida, porque o cemitério pode estar fora da janela.
import { describe, expect, it } from 'vitest';
import { skyLayout } from '../../src/ui/scenes/sky.ts';

const PC = { x: 0, y: 90, w: 1100, h: 480 };
const PHONE = { x: 0, y: 66, w: 360, h: 345 };
const GRAVE = { x: 930, y: 330, w: 140, h: 60 };

const inside = (point: { x: number; y: number }, band: typeof PC) => {
  expect(point.x).toBeGreaterThanOrEqual(band.x);
  expect(point.x).toBeLessThanOrEqual(band.x + band.w);
  expect(point.y).toBeGreaterThanOrEqual(band.y);
  expect(point.y).toBeLessThanOrEqual(band.y + band.h);
};

describe('o céu da Ressurreição', () => {
  it('a escala segue a largura da faixa, entre 0,36 e 1', () => {
    expect(skyLayout(GRAVE, { ...PC, w: 1_536 }).k).toBe(1);
    expect(skyLayout(GRAVE, PHONE).k).toBe(0.36);
    expect(skyLayout(GRAVE, { ...PC, w: 700 }).k).toBeCloseTo(0.7);
  });

  it('o portal fica no alto da faixa, e a coluna desce em linha reta até o cemitério', () => {
    const { portal, ground, top } = skyLayout(GRAVE, PC);
    expect(portal.y).toBe(PC.y + 40);
    expect(ground.y).toBe(GRAVE.y + GRAVE.h / 2);
    expect(portal.x).toBe(ground.x);
    expect(top.x).toBe(ground.x);
  });

  it('a carta recebe a cor entre o portal e o chão, até 150 px acima do chão', () => {
    const { portal, ground, top } = skyLayout(GRAVE, PC);
    expect(ground.y - top.y).toBeLessThanOrEqual(150);
    expect(top.y).toBeGreaterThan(portal.y);
    expect(top.y).toBeLessThan(ground.y);
  });

  it('com o cemitério fora da faixa, tudo fica dentro dela', () => {
    for (const graveyard of [
      { x: 2_000, y: 2_000, w: 100, h: 60 },
      { x: -500, y: -500, w: 100, h: 60 },
    ]) {
      const { portal, ground, top } = skyLayout(graveyard, PHONE);
      [portal, ground, top].forEach((point) => inside(point, PHONE));
    }
  });

  it('sem o cemitério medido, ela usa o canto de baixo à direita da faixa', () => {
    const { ground, portal, top } = skyLayout(null, PHONE);
    expect(ground.x).toBeGreaterThan(PHONE.x + PHONE.w / 2);
    expect(ground.y).toBeGreaterThan(PHONE.y + PHONE.h / 2);
    [portal, ground, top].forEach((point) => inside(point, PHONE));
  });

  it('o portal não sai pelos lados da faixa', () => {
    const { portal, k } = skyLayout({ x: 1_090, y: 330, w: 10, h: 60 }, PC);
    expect(portal.x + 150 * k).toBeLessThanOrEqual(PC.x + PC.w);
  });

  it('o chão colado no portal: o alto ainda fica abaixo dele', () => {
    const { portal, top } = skyLayout({ x: 500, y: 100, w: 100, h: 20 }, PC);
    expect(top.y).toBeGreaterThanOrEqual(portal.y);
  });

  it('a mesma entrada dá a mesma saída', () => {
    expect(skyLayout(GRAVE, PC)).toEqual(skyLayout(GRAVE, PC));
  });
});
