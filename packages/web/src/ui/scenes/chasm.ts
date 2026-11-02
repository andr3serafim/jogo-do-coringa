// As contas do abismo da Devastação (sub-projeto 6 §7.4): as bordas irregulares e os ramos das rachaduras, calculados uma vez, de
// sementes fixas (§11: nada de calcular forma a cada quadro). A mesma conta do protótipo aprovado. Puro: sem React nem DOM.
import { rng } from '../anim/particles.ts';

export interface Point {
  x: number;
  y: number;
}

export interface ChasmEdges {
  top: Point[];
  bottom: Point[];
}

/** Quantos trechos cada borda tem (23 pontos). */
const SEGMENTS = 22;

/** As bordas de cima e de baixo do abismo, de `x0` a `x1`, em volta da altura `yc`: fechadas nas pontas, abertas até `maxHalf` no meio. */
export function chasmEdges(x0: number, x1: number, yc: number, seed: number, maxHalf: number): ChasmEdges {
  const r = rng(seed);
  const top: Point[] = [];
  const bottom: Point[] = [];
  for (let i = 0; i <= SEGMENTS; i++) {
    const t = i / SEGMENTS;
    const x = x0 + (x1 - x0) * t;
    const envelope = Math.pow(Math.sin(Math.PI * t), 0.7);
    const half = maxHalf * (0.08 + 0.92 * envelope) * (0.7 + 0.55 * r());
    const wobble = (r() - 0.5) * 9 * envelope;
    top.push({ x: x + (r() - 0.5) * 7, y: yc - half + wobble });
    bottom.push({ x: x + (r() - 0.5) * 7, y: yc + half * (0.75 + 0.45 * r()) + wobble });
  }
  return { top, bottom };
}

/** Um ramo de rachadura: sai de (`x`, `y`) na direção `dir` (radianos) e quebra a cada 12 unidades, até `len`. */
export function crackBranch(seed: number, x: number, y: number, dir: number, len: number): string {
  const r = rng(seed);
  let px = x;
  let py = y;
  let angle = dir;
  let d = `M${px.toFixed(0)} ${py.toFixed(0)}`;
  for (let s = 0; s < len; s += 12) {
    angle += (r() - 0.5) * 0.9;
    px += Math.cos(angle) * 12;
    py += Math.sin(angle) * 12;
    d += ` L${px.toFixed(0)} ${py.toFixed(0)}`;
  }
  return d;
}

/** Os 12 ramos em volta do abismo: os pares sobem da borda de cima, os ímpares descem da de baixo, bem mais curtos. */
export function chasmBranches(edges: ChasmEdges, seed: number): string[] {
  const r = rng(seed);
  return Array.from({ length: 12 }, (_, i) => {
    const up = i % 2 === 0;
    const k = Math.floor((0.08 + r() * 0.84) * SEGMENTS);
    const base = up ? edges.top[k]! : edges.bottom[k]!;
    const dir = up ? -Math.PI / 2 + (r() - 0.5) * 1.4 : Math.PI / 2 + (r() - 0.5) * 1.6;
    const len = up ? 30 + r() * 80 : 14 + r() * 26;
    return crackBranch(seed + i * 31, base.x, base.y, dir, len);
  });
}

const line = (points: readonly Point[]): string => points.map(({ x, y }) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L');

/** Os caminhos do desenho: o abismo, a parede do fundo (a borda de cima, 13 unidades para baixo), as duas bordas e a fenda. */
export function chasmPaths(edges: ChasmEdges, x0: number, x1: number, yc: number) {
  const { top, bottom } = edges;
  const crack = top.map(({ x, y }) => `L${x.toFixed(0)} ${(y + (yc - y) * 0.85).toFixed(0)}`).join(' ');
  return {
    abyss: `M${line(top)} L${line([...bottom].reverse())} Z`,
    backWall: `M${line(top)} L${line([...top].reverse().map(({ x, y }) => ({ x, y: y + 13 })))} Z`,
    topEdge: `M${line(top)}`,
    bottomEdge: `M${line(bottom)}`,
    crack: `M${x0} ${yc} ${crack} L${x1} ${yc}`,
  };
}
