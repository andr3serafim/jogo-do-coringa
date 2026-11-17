// O voo do dragão da logo (decisoes.md 2026-11-17 (3)): as poses da Web Animations que o `Intro.tsx` liga. O jsdom não anima; aqui se
// confere o que a pessoa veria: que o voo cabe nos instantes do modelo, começa invisível e longe, e acaba exatamente na pose da logo.
import { describe, expect, it } from 'vitest';
import { INTRO } from '../../src/model/intro.ts';
import { flightAnimation, wingAnimation, type DragonAnimation } from '../../src/ui/intro/dragon-flight.ts';

const ANIMATIONS: [string, DragonAnimation][] = [
  ['o voo do corpo', flightAnimation()],
  ['a asa', wingAnimation()],
];

/** Os números de um `transform` ("translate(1px, 2px) rotate(3deg) scale(4)" → [1, 2, 3, 4]). */
const numbers = (transform: unknown): number[] => String(transform).match(/-?\d+(\.\d+)?/g)!.map(Number);

describe.each(ANIMATIONS)('%s', (_, animation) => {
  it('começa quando o dragão entra e acaba quando ele assenta, de asas abertas', () => {
    expect(animation.delay).toBe(INTRO.flyAt);
    expect(animation.delay + animation.duration).toBe(INTRO.wingsAt + INTRO.settleMs);
  });

  it('as poses vêm em ordem, do começo (0) ao fim (1) do voo', () => {
    const offsets = animation.keyframes.map((frame) => frame.offset as number);
    expect(offsets[0]).toBe(0);
    expect(offsets.at(-1)).toBe(1);
    for (let i = 1; i < offsets.length; i++) expect(offsets[i]!).toBeGreaterThan(offsets[i - 1]!);
  });

  it('todas as poses dizem o mesmo tipo de transformação, para o navegador interpolar uma na outra', () => {
    const shapes = animation.keyframes.map((frame) => String(frame.transform).replace(/-?\d+(\.\d+)?/g, '#'));
    expect(new Set(shapes).size).toBe(1);
  });
});

describe('o voo do corpo', () => {
  const { keyframes } = flightAnimation();

  it('entra invisível, pequeno e longe, no alto à esquerda, e aparece logo depois', () => {
    const [x, y, , scale] = numbers(keyframes[0]!.transform);
    expect(keyframes[0]!.opacity).toBe(0);
    expect(keyframes[1]!.opacity).toBe(1);
    expect(x).toBeLessThan(-200);
    expect(y).toBeLessThan(-100);
    expect(scale).toBeLessThan(0.3);
  });

  it('dá uma volta inteira no ar (o parafuso) e acaba sem giro nenhum', () => {
    const turns = keyframes.map((frame) => numbers(frame.transform)[2]!);
    expect(turns.at(-1)).toBe(0);
    expect(Math.max(...turns) - Math.min(...turns)).toBeGreaterThanOrEqual(360);
  });

  it('volta maior do que a pose, na direção de quem olha, e assenta exatamente nela', () => {
    const scales = keyframes.map((frame) => numbers(frame.transform)[3]!);
    expect(Math.max(...scales)).toBeGreaterThan(1);
    expect(keyframes.at(-1)!.transform).toBe('translate(0px, 0px) rotate(0deg) scale(1)');
  });
});

describe('a asa', () => {
  const { keyframes, duration, delay } = wingAnimation();
  const at = (offset: number) => delay + offset * duration;

  it('bate três vezes enquanto ele chega: a ponta desce no meio de cada batida, onde o som põe o baque', () => {
    const beat = (INTRO.spinAt - INTRO.flyAt) / 3;
    const downs = keyframes.filter((frame) => numbers(frame.transform)[0]! < 0 && at(frame.offset as number) < INTRO.spinAt);
    expect(downs.map((frame) => Math.round(at(frame.offset as number)))).toEqual([0, 1, 2].map((i) => Math.round(INTRO.flyAt + beat * (i + 0.5))));
  });

  it('fica recolhida no mergulho e se abre de uma vez depois das asas', () => {
    const tucked = keyframes.filter((frame) => {
      const time = at(frame.offset as number);
      return time >= INTRO.returnAt && time < INTRO.wingsAt;
    });
    expect(tucked.length).toBeGreaterThan(0);
    for (const frame of tucked) expect(numbers(frame.transform)[1]!).toBeLessThan(0.5);
    expect(keyframes.at(-1)!.transform).toBe('rotate(0deg) scale(1, 1)');
  });
});
