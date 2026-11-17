/// <reference types="node" />
/**
 * Tira de um `.woff` (WOFF 1, tabelas em zlib) o contorno de cada letra pedida, em unidades da fonte (o y para baixo, a linha de base em
 * 0), com o avanço de cada uma, e imprime em JSON. Foi assim que as letras da logo "LUSACAN productions" saíram da Cinzel (SIL OFL 1.1,
 * `@fontsource/cinzel`, pesos 600 e 500) para o `src/ui/intro/lusacan-shapes.ts` (decisoes.md 2026-11-17 (3)). Quem mudar o texto da
 * logo roda isto e põe os contornos novos lá (arredondados a inteiros), e depois o `gerar-logo-lusacan.ts`.
 *
 * Uso: `node scripts/cinzel-contornos.ts node_modules/@fontsource/cinzel/files/cinzel-latin-600-normal.woff LUSACN`
 *
 * Lê só o que a Cinzel usa: o `cmap` de subformato 4 e glifos simples (sem compostos); sem kerning (a logo espaça as letras à mão).
 */
import { readFileSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

interface Point {
  x: number;
  y: number;
  on: boolean;
}

export interface Outline {
  /** O contorno, como `d` de SVG. */
  d: string;
  advance: number;
}

function readTables(buffer: Buffer): Record<string, Buffer> {
  if (buffer.readUInt32BE(0) !== 0x774f4646) throw new Error('não é um WOFF 1');
  const tables: Record<string, Buffer> = {};
  const count = buffer.readUInt16BE(12);
  for (let i = 0; i < count; i++) {
    const at = 44 + i * 20;
    const tag = buffer.toString('latin1', at, at + 4);
    const offset = buffer.readUInt32BE(at + 4);
    const compressed = buffer.readUInt32BE(at + 8);
    const original = buffer.readUInt32BE(at + 12);
    const raw = buffer.subarray(offset, offset + compressed);
    tables[tag] = compressed < original ? inflateSync(raw) : raw;
  }
  return tables;
}

function table(tables: Record<string, Buffer>, tag: string): Buffer {
  const found = tables[tag];
  if (found === undefined) throw new Error(`a fonte não tem a tabela ${tag}`);
  return found;
}

/** O glifo de um caractere, pelo `cmap` de subformato 4 (o plano básico). */
function glyphIndex(cmap: Buffer, code: number): number {
  const subtables = cmap.readUInt16BE(2);
  for (let i = 0; i < subtables; i++) {
    const offset = cmap.readUInt32BE(4 + i * 8 + 4);
    if (cmap.readUInt16BE(offset) !== 4) continue;
    const segments2 = cmap.readUInt16BE(offset + 6);
    const ends = offset + 14;
    const starts = ends + segments2 + 2;
    const deltas = starts + segments2;
    const ranges = deltas + segments2;
    for (let s = 0; s < segments2 / 2; s++) {
      const end = cmap.readUInt16BE(ends + s * 2);
      const start = cmap.readUInt16BE(starts + s * 2);
      if (code < start || code > end) continue;
      const delta = cmap.readInt16BE(deltas + s * 2);
      const range = cmap.readUInt16BE(ranges + s * 2);
      if (range === 0) return (code + delta) & 0xffff;
      const index = cmap.readUInt16BE(ranges + s * 2 + range + (code - start) * 2);
      return index === 0 ? 0 : (index + delta) & 0xffff;
    }
  }
  return 0;
}

function contours(glyf: Buffer, start: number, end: number): Point[][] {
  if (end === start) return [];
  const count = glyf.readInt16BE(start);
  if (count < 0) throw new Error('glifo composto: este extrator não lê');
  let at = start + 10;
  const ends: number[] = [];
  for (let i = 0; i < count; i++, at += 2) ends.push(glyf.readUInt16BE(at));
  const total = ends[count - 1]! + 1;
  at += 2 + glyf.readUInt16BE(at);
  const flags: number[] = [];
  while (flags.length < total) {
    const flag = glyf[at++]!;
    flags.push(flag);
    if (flag & 8) for (let repeat = glyf[at++]!; repeat > 0; repeat--) flags.push(flag);
  }
  const coordinates = (short: number, same: number): number[] => {
    const values: number[] = [];
    let value = 0;
    for (const flag of flags) {
      if (flag & short) value += (flag & same ? 1 : -1) * glyf[at++]!;
      else if (!(flag & same)) {
        value += glyf.readInt16BE(at);
        at += 2;
      }
      values.push(value);
    }
    return values;
  };
  const xs = coordinates(2, 16);
  const ys = coordinates(4, 32);
  const result: Point[][] = [];
  let first = 0;
  for (const last of ends) {
    const points: Point[] = [];
    for (let i = first; i <= last; i++) points.push({ x: xs[i]!, y: ys[i]!, on: (flags[i]! & 1) === 1 });
    result.push(points);
    first = last + 1;
  }
  return result;
}

/** Um contorno de pontos de TrueType (na curva e de controle) como caminho de SVG, com curvas quadráticas e o y virado para baixo. */
function contourPath(points: Point[]): string {
  const first = points.findIndex((point) => point.on);
  const ring = first < 0 ? [{ x: (points[0]!.x + points[1]!.x) / 2, y: (points[0]!.y + points[1]!.y) / 2, on: true }, ...points.slice(1), points[0]!] : [...points.slice(first), ...points.slice(0, first)];
  const at = (point: Point): string => `${point.x} ${-point.y}`;
  let d = `M${at(ring[0]!)}`;
  for (let i = 1; i <= ring.length; i++) {
    const current = ring[i % ring.length]!;
    if (current.on) {
      d += `L${at(current)}`;
      continue;
    }
    const next = ring[(i + 1) % ring.length]!;
    const end = next.on ? next : { x: (current.x + next.x) / 2, y: (current.y + next.y) / 2, on: true };
    d += `Q${at(current)} ${at(end)}`;
    if (next.on) i++;
  }
  return `${d}Z`;
}

/** Os contornos das letras de `text` no `.woff` em `file`. */
export function outlines(file: string, text: string): Record<string, Outline> {
  const tables = readTables(readFileSync(file));
  const head = table(tables, 'head');
  const longOffsets = head.readInt16BE(50) === 1;
  const loca = table(tables, 'loca');
  const hmtx = table(tables, 'hmtx');
  const metrics = table(tables, 'hhea').readUInt16BE(34);
  const glyf = table(tables, 'glyf');
  const offset = (index: number): number => (longOffsets ? loca.readUInt32BE(index * 4) : loca.readUInt16BE(index * 2) * 2);
  const result: Record<string, Outline> = {};
  for (const char of new Set(text)) {
    const index = glyphIndex(table(tables, 'cmap'), char.codePointAt(0)!);
    if (index === 0) throw new Error(`a fonte não tem a letra ${char}`);
    result[char] = {
      d: contours(glyf, offset(index), offset(index + 1)).map(contourPath).join(''),
      advance: hmtx.readUInt16BE(Math.min(index, metrics - 1) * 4),
    };
  }
  return result;
}

if (import.meta.main) {
  const [file, text] = process.argv.slice(2);
  if (file === undefined || text === undefined) throw new Error('uso: node scripts/cinzel-contornos.ts <arquivo.woff> <letras>');
  console.log(JSON.stringify(outlines(file, text), null, 1));
}
