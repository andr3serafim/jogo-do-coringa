import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPORTS_DIR = fileURLToPath(new URL('../reports/', import.meta.url));

export const pct = (x: number): string => `${(100 * x).toFixed(1)}%`;

type Cell = string | number;
const cell = (c: Cell): string => (typeof c === 'number' ? (Number.isInteger(c) ? String(c) : c.toFixed(2)) : c);

/** Tabela de texto alinhada para o terminal. */
export function textTable(headers: string[], rows: Cell[][]): string {
  const all = [headers, ...rows.map((r) => r.map(cell))];
  const widths = headers.map((_, i) => Math.max(...all.map((r) => r[i].length)));
  const line = (r: string[]) => r.map((c, i) => c.padEnd(widths[i])).join('  ').trimEnd();
  return [line(all[0]), widths.map((w) => '-'.repeat(w)).join('  '), ...all.slice(1).map(line)].join('\n');
}

/** Tabela Markdown (para o relatório de calibração). */
export function markdownTable(headers: string[], rows: Cell[][]): string {
  const line = (r: string[]) => `| ${r.join(' | ')} |`;
  return [line(headers), line(headers.map(() => '---')), ...rows.map((r) => line(r.map(cell)))].join('\n');
}

/** Grava `<name>.json` (e `<name>.md`, se houver) em `packages/sim/reports/`. Devolve os caminhos. */
export function writeReport(name: string, data: unknown, markdown?: string, dir = REPORTS_DIR): string[] {
  mkdirSync(dir, { recursive: true });
  const paths = [join(dir, `${name}.json`)];
  writeFileSync(paths[0], `${JSON.stringify(data, null, 2)}\n`);
  if (markdown !== undefined) {
    paths.push(join(dir, `${name}.md`));
    writeFileSync(paths[1], markdown);
  }
  return paths;
}
