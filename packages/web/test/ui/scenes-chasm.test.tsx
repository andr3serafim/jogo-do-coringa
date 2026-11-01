// As contas do abismo da Devastação (sub-projeto 6 §7.4, §11): as bordas e os ramos das rachaduras saem de sementes fixas, uma vez
// só, e a mesma semente dá o mesmo desenho.
import { describe, expect, it } from 'vitest';
import { chasmBranches, chasmEdges, chasmPaths, crackBranch } from '../../src/ui/scenes/chasm.ts';

describe('as bordas do abismo', () => {
  const edges = chasmEdges(100, 700, 200, 31, 34);

  it('têm 23 pontos em cima e embaixo, de um canto ao outro', () => {
    expect(edges.top).toHaveLength(23);
    expect(edges.bottom).toHaveLength(23);
    expect(edges.top[0]!.x).toBeLessThan(110);
    expect(edges.top[22]!.x).toBeGreaterThan(690);
  });

  it('a borda de cima fica sempre acima da de baixo', () => {
    edges.top.forEach((point, i) => expect(point.y).toBeLessThan(edges.bottom[i]!.y));
  });

  it('a mesma semente dá as mesmas bordas, e outra semente dá outras', () => {
    expect(chasmEdges(100, 700, 200, 31, 34)).toEqual(edges);
    expect(chasmEdges(100, 700, 200, 32, 34)).not.toEqual(edges);
  });

  it('a abertura é maior no meio que nas pontas', () => {
    const gap = (i: number) => edges.bottom[i]!.y - edges.top[i]!.y;
    expect(gap(11)).toBeGreaterThan(gap(0));
    expect(gap(11)).toBeGreaterThan(gap(22));
  });
});

describe('as rachaduras', () => {
  it('um ramo é uma linha quebrada, sempre a mesma para a mesma semente', () => {
    const d = crackBranch(77, 300, 200, -Math.PI / 2, 60);
    expect(d).toMatch(/^M300 200( L-?\d+ -?\d+)+$/);
    expect(crackBranch(77, 300, 200, -Math.PI / 2, 60)).toBe(d);
    expect(crackBranch(78, 300, 200, -Math.PI / 2, 60)).not.toBe(d);
  });

  it('são 12, metade subindo da borda de cima, metade descendo da de baixo, mais curtas', () => {
    const edges = chasmEdges(100, 700, 200, 31, 34);
    const branches = chasmBranches(edges, 77);
    expect(branches).toHaveLength(12);
    expect(chasmBranches(edges, 77)).toEqual(branches);
    const endY = (d: string) => Number(d.split(' ').at(-1));
    const startY = (d: string) => Number(d.split(' ')[1]);
    branches.forEach((d, i) => {
      if (i % 2 === 0) expect(endY(d)).toBeLessThan(startY(d));
    });
    const length = (d: string) => d.split(' L').length;
    const up = branches.filter((_, i) => i % 2 === 0);
    const down = branches.filter((_, i) => i % 2 === 1);
    expect(Math.max(...up.map(length))).toBeGreaterThan(Math.max(...down.map(length)));
  });
});

describe('os caminhos do abismo', () => {
  it('o abismo é fechado, as bordas são abertas, e a fenda vai de ponta a ponta na altura do meio', () => {
    const edges = chasmEdges(100, 700, 200, 31, 34);
    const paths = chasmPaths(edges, 100, 700, 200);
    expect(paths.abyss).toMatch(/^M.* Z$/);
    expect(paths.backWall).toMatch(/^M.* Z$/);
    expect(paths.topEdge).not.toContain('Z');
    expect(paths.bottomEdge).not.toContain('Z');
    expect(paths.crack.startsWith('M100 200')).toBe(true);
    expect(paths.crack.endsWith('L700 200')).toBe(true);
  });
});
