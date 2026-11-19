// Rascunho (decisoes.md 2026-11-19 (3)): as fotos das três direções da mesa, vestidas por cima do app de verdade.
//
// Com o dev server da web na 5173 (`pnpm dev:web`), da raiz do repositório:
//   node docs/superpowers/specs/2026-11-19-mesa-direcoes/fotos.mjs [hoje,a,b,c]
//
// Cada direção é o `base.css` mais a sua folha (`a-capa.css`, `b-feltro.css`, `c-tinta.css`), injetadas como `<style>` (no dev
// server não há CSP). As cenas: o replay da fixture `especiais` na rodada 17 (quadra, ouro de quem lidera, iniciativa), com o
// oponente no deck Bestiário (Egípcio), e o Equipar da rodada 1 do treino (a barra de jogadas e a mão), a 1440 × 900 e a 390 × 844.
// As fotos vão para `fotos/<direção>-<tela>-<cena>.png`; antes do commit, viram WebP (`ffmpeg -i x.png -c:v libwebp -quality 86 x.webp`).
// A página das direções (`direcoes.html`) as mostra lado a lado.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');
const require = createRequire(join(root, 'packages/web/package.json'));
const { chromium } = require('@playwright/test');

const SHEETS = { hoje: [], a: ['base.css', 'a-capa.css'], b: ['base.css', 'b-feltro.css'], c: ['base.css', 'c-tinta.css'] };
const wanted = (process.argv[2] ?? 'hoje,a,b,c').split(',');
const out = join(here, 'fotos');
mkdirSync(out, { recursive: true });

const games = JSON.parse(readFileSync(join(root, 'packages/web/e2e/fixtures/especiais.json'), 'utf8'));
games[0] = { ...games[0], looks: { me: { deck: 'cordel', race: 'bufao' }, opponent: { deck: 'bestiario', race: 'egipcio' } } };
const fixture = JSON.stringify(games);
const BASE = 'http://localhost:5173';

const browser = await chromium.launch();
for (const name of wanted) {
  const css = SHEETS[name].map((file) => readFileSync(join(here, file), 'utf8')).join('\n');
  for (const [width, height, screen] of [
    [1440, 900, 'pc'],
    [390, 844, 'cel'],
  ]) {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
    await context.addInitScript((saved) => {
      localStorage.setItem('coringa:abertura', 'pular');
      localStorage.setItem('coringa:partidas', saved);
      localStorage.setItem('coringa:tutorial', 'done');
    }, fixture);
    const page = await context.newPage();
    const dress = async () => {
      if (css) await page.addStyleTag({ content: css });
    };

    await page.goto(`${BASE}/partidas/${games[0].id}`);
    await page.getByRole('combobox', { name: 'Rodada' }).selectOption('17');
    await dress();
    await page.waitForTimeout(2800);
    await page.screenshot({ path: join(out, `${name}-${screen}-jogada.png`) });

    await page.goto(`${BASE}/treino?semente=foto1&nivel=medio`);
    await page.waitForTimeout(1500);
    await dress();
    await page.waitForTimeout(2500);
    await page.screenshot({ path: join(out, `${name}-${screen}-equipar.png`) });
    await context.close();
  }
  console.log('fotos de', name);
}
await browser.close();
