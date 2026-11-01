// A aura de energia do Ataque Absoluto (sub-projeto 6 §7.1) e os raios pequenos em volta dela. A aura "ferve" trocando o `d` de 3
// caminhos entre 4 formas calculadas uma vez (§11: nada de calcular forma a cada quadro). As formas saem da mesma conta do
// protótipo aprovado, com as mesmas sementes: pontas viradas para cima, maiores no alto, quase nada embaixo.

/** Gerador de Park–Miller, o do protótipo: a mesma semente dá sempre o mesmo desenho. */
function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Um contorno fechado de `n` pontas em volta de uma elipse `rx` × `ry`, com pontas de até `maxL` viradas para cima. */
function auraPath(rx: number, ry: number, n: number, maxL: number, seed: number): string {
  const r = rng(seed);
  const vertices: Array<[number, number]> = [];
  const tips: Array<[number, number, number]> = [];
  for (let i = 0; i < n; i++) {
    const av = Math.PI / 2 + (i / n) * 2 * Math.PI;
    const at = Math.PI / 2 + ((i + 0.5) / n) * 2 * Math.PI;
    vertices.push([Math.cos(av) * rx * (0.94 + 0.1 * r()), Math.sin(av) * ry * (0.94 + 0.1 * r())]);
    const up = Math.max(0, -Math.sin(at));
    const down = Math.max(0, Math.sin(at));
    const L = maxL * (0.22 + 0.78 * Math.pow(up, 1.3)) * (0.72 + 0.5 * r()) * (1 - 0.85 * down);
    const bx = Math.cos(at) * rx;
    const by = Math.sin(at) * ry;
    tips.push([bx + Math.cos(at) * L * 0.45 + (r() - 0.5) * L * 0.25, by + Math.sin(at) * L * 0.45 - L * (0.35 + 0.55 * up), L]);
  }
  const f = (v: number) => v.toFixed(1);
  let d = `M${f(vertices[0]![0])} ${f(vertices[0]![1])}`;
  for (let i = 0; i < n; i++) {
    const [vx, vy] = vertices[i]!;
    const [tx, ty, L] = tips[i]!;
    const [nx, ny] = vertices[(i + 1) % n]!;
    d += ` C${f(vx + (tx - vx) * 0.2)} ${f(vy + (ty - vy) * 0.1)} ${f(tx - (tx - vx) * 0.12)} ${f(ty + L * 0.5)} ${f(tx)} ${f(ty)}`;
    d += ` C${f(tx + (nx - tx) * 0.12)} ${f(ty + L * 0.5)} ${f(nx - (nx - tx) * 0.2)} ${f(ny + (ty - ny) * 0.1)} ${f(nx)} ${f(ny)}`;
  }
  return `${d} Z`;
}

/** As três camadas, de fora para dentro: ouro com contorno de tinta, ouro claro, branco-quente (papel). */
export const AURA_LAYERS = [
  { rx: 100, ry: 108, n: 20, maxL: 100 },
  { rx: 86, ry: 94, n: 17, maxL: 70 },
  { rx: 70, ry: 80, n: 14, maxL: 44 },
] as const;

/** Quanto tempo cada forma fica antes da próxima (a aura "ferve"). */
export const AURA_BOIL_MS = 70;

let cached: string[][] | null = null;

/** As 4 formas de cada camada (3 × 4), calculadas uma vez. */
export function auraVariants(): string[][] {
  cached ??= AURA_LAYERS.map((layer, i) =>
    [0, 1, 2, 3].map((k) => auraPath(layer.rx, layer.ry, layer.n, layer.maxL, 211 + i * 47 + k * 13)),
  );
  return cached;
}

/** Um raio a cada 340 ms, no máximo (spec 6 §1: até 3 por segundo; o protótipo soltava um a cada 110–140 ms e não vai). */
export const BOLT_GAP_MS = 340;
/** Cada raio entra e sai em 100 ms (nunca de estalo) e fica 40 ms aceso. */
export const BOLT_FADE_MS = 100;
export const BOLT_HOLD_MS = 40;

/** Os instantes (ms desde o começo da cena) em que um raio começa a entrar, de `fromMs` até antes de `toMs`. */
export function boltTimes(fromMs: number, toMs: number): number[] {
  const times: number[] = [];
  for (let t = fromMs; t < toMs; t += BOLT_GAP_MS) times.push(t);
  return times;
}
