/// <reference types="node" />
/**
 * Smoke da web, depois do `vite build` (spec §9.1 e §12). Roda no Node puro e confere o `dist`:
 * - o JavaScript inicial (o que o `index.html` carrega e pré-carrega) cabe em 200 KB comprimido (gzip);
 * - nenhum `.js` do `dist` contém o Zod (`ZodError`): os esquemas ficam só no servidor (`@coringa/protocol/schemas`).
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 200 * 1024;
const ZOD_MARK = 'ZodError';

const dist = join(import.meta.dirname, '..', 'dist');
const indexPath = join(dist, 'index.html');
if (!existsSync(indexPath)) throw new Error('dist/index.html não existe: rode o `vite build` antes do smoke');
const html = readFileSync(indexPath, 'utf8');

/** Valor de um atributo dentro de uma tag (`src="..."`), ou `null`. */
function attribute(tag: string, name: string): string | null {
  return new RegExp(`\\s${name}=["']([^"']+)["']`, 'i').exec(tag)?.[1] ?? null;
}

/** Os `.js` que o HTML pede na abertura: `<script src>` e `<link rel="modulepreload" href>`, sem repetir. */
function initialScripts(page: string): string[] {
  const urls = new Set<string>();
  for (const [tag] of page.matchAll(/<(?:script|link)\b[^>]*>/gi)) {
    const isScript = /^<script/i.test(tag);
    const url = isScript ? attribute(tag, 'src') : attribute(tag, 'href');
    const preload = !isScript && (attribute(tag, 'rel') ?? '').split(/\s+/).includes('modulepreload');
    if (url && (isScript || preload)) urls.add(url);
  }
  return [...urls];
}

function jsFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return jsFiles(path);
    return entry.name.endsWith('.js') ? [path] : [];
  });
}

const kb = (bytes: number): string => `${(bytes / 1024).toFixed(1)} KB`;
const fromDist = (path: string): string => relative(dist, path).replaceAll('\\', '/');
const problems: string[] = [];

const initial = initialScripts(html);
if (initial.length === 0) problems.push('o dist/index.html não carrega nenhum script: o orçamento não teria o que medir');

let total = 0;
console.log('JavaScript inicial (bruto → gzip):');
for (const url of initial) {
  if (!url.startsWith('/')) {
    problems.push(`script inicial fora do próprio site: ${url}`);
    continue;
  }
  const path = join(dist, url.slice(1));
  if (!existsSync(path)) {
    problems.push(`o index.html aponta para um script que não está no dist: ${url}`);
    continue;
  }
  const source = readFileSync(path);
  const gzip = gzipSync(source).length;
  total += gzip;
  console.log(`  ${url}: ${kb(source.length)} → ${kb(gzip)}`);
}
console.log(`  total: ${kb(total)} de ${kb(BUDGET_BYTES)}`);
if (total > BUDGET_BYTES) problems.push(`JavaScript inicial com ${kb(total)} gzip passa do orçamento de ${kb(BUDGET_BYTES)}`);

const all = jsFiles(dist);
console.log(`Todos os .js do dist: ${all.length}`);
for (const path of all) {
  const source = readFileSync(path);
  console.log(`  ${fromDist(path)}: ${kb(source.length)} → ${kb(gzipSync(source).length)}`);
  if (source.includes(ZOD_MARK)) problems.push(`${fromDist(path)} contém o Zod (${ZOD_MARK}): a web nunca importa os esquemas`);
}

if (problems.length > 0) throw new Error(`smoke da web falhou:\n- ${problems.join('\n- ')}`);
console.log('smoke da web ok');
