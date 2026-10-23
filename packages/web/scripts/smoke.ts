/// <reference types="node" />
/**
 * Smoke da web, depois do `vite build` (spec §9.1 e §12). Roda no Node puro e confere o `dist`:
 * - o JavaScript inicial (o que o `index.html` carrega e pré-carrega) cabe em 200 KB comprimido (gzip);
 * - nenhum `.js` do `dist` contém o Zod (`ZodError`): os esquemas ficam só no servidor (`@coringa/protocol/schemas`);
 * - o bot do treino (`@coringa/sim/bots`) fica fora do JavaScript inicial: ele entra por `import()` dinâmico (spec §12) e
 *   tem que estar num chunk à parte. Sem essa segunda metade a checagem seria vazia: o minificador renomeia `greedyBot`,
 *   e um bot que sumisse do `dist` também passaria por "fora do inicial".
 * - o sintetizador dos sons (`src/sound/synth.ts`) também fica fora do JavaScript inicial: só o controlador (`controller.ts`)
 *   está no inicial, e o `synth.ts` entra por `import()` dinâmico no primeiro gesto. Mesma dupla de conferências do bot.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

const BUDGET_BYTES = 200 * 1024;
const ZOD_MARK = 'ZodError';
/**
 * Marcas do bot do treino. `greedyBot` é o nome do bot, que o minificador renomeia (nenhum `.js` o guarda hoje); a segunda é o
 * texto de um erro lançado dentro dele (`packages/sim/src/bots/greedy.ts`, que avisa desta dependência), e um literal de string
 * sobrevive à minificação. Qualquer uma das duas num `.js` inicial reprova.
 */
const BOT_NAME_MARK = 'greedyBot';
const BOT_TEXT_MARK = 'fase principal sem DECLARE_ATTACK/END_TURN';
const BOT_MARKS = [BOT_NAME_MARK, BOT_TEXT_MARK];
/**
 * Marcas do sintetizador. Nenhuma sobrevive só no nome de um identificador nosso (o minificador renomeia): `createDynamicsCompressor`
 * é o método do Web Audio que monta o limitador (nome de propriedade do navegador, que não se renomeia) e `sawtooth` é um literal de
 * string de uma receita; as duas só existem no `synth.ts`. Qualquer uma num `.js` inicial reprova, e o chunk do sintetizador tem as duas.
 */
const SYNTH_MARKS = ['createDynamicsCompressor', 'sawtooth'];

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
const initialPaths = new Set<string>();
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
  initialPaths.add(path);
  const source = readFileSync(path);
  const gzip = gzipSync(source).length;
  total += gzip;
  console.log(`  ${url}: ${kb(source.length)} → ${kb(gzip)}`);
  const bot = BOT_MARKS.find((mark) => source.includes(mark));
  if (bot !== undefined) problems.push(`${url} contém o bot do treino ("${bot}"): ele tem que entrar por import() dinâmico, fora do inicial`);
  const synth = SYNTH_MARKS.find((mark) => source.includes(mark));
  if (synth !== undefined) {
    problems.push(`${url} contém o sintetizador dos sons ("${synth}"): ele tem que entrar por import() dinâmico, fora do inicial`);
  }
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

// O bot tem que existir em algum chunk que não é o inicial; do contrário, "fora do inicial" não provaria nada.
const botChunks = all.filter((path) => !initialPaths.has(path) && readFileSync(path).includes(BOT_TEXT_MARK));
if (botChunks.length === 0) {
  problems.push(`o bot do treino ("${BOT_TEXT_MARK}") não está em nenhum chunk carregado sob demanda: o import() dinâmico sumiu, ou a marca mudou`);
} else {
  console.log(`Bot do treino (fora do inicial): ${botChunks.map(fromDist).join(', ')}`);
}

// O sintetizador tem que existir em algum chunk que não é o inicial, pelo mesmo motivo.
const synthChunks = all.filter((path) => {
  if (initialPaths.has(path)) return false;
  const source = readFileSync(path);
  return SYNTH_MARKS.every((mark) => source.includes(mark));
});
if (synthChunks.length === 0) {
  problems.push(
    `o sintetizador dos sons (${SYNTH_MARKS.map((mark) => `"${mark}"`).join(' e ')}) não está em nenhum chunk carregado sob demanda: o import() dinâmico sumiu, ou as marcas mudaram`,
  );
} else {
  console.log(`Sintetizador dos sons (fora do inicial): ${synthChunks.map(fromDist).join(', ')}`);
}

if (problems.length > 0) throw new Error(`smoke da web falhou:\n- ${problems.join('\n- ')}`);
console.log('smoke da web ok');
