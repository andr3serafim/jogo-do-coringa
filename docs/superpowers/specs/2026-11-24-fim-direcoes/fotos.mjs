// As fotos das três direções do fim de partida, sobre a mesa de verdade: primeiro a foto da mesa no último passo da fixture `especiais`
// (o dev server da web, `pnpm dev:web`, e a fixture em `packages/web/public/tmp-especiais.json`, fora do git), depois o protótipo por cima,
// com as fontes do jogo (as do `packages/web/dist`, do `vite build`). Uso: `node docs/superpowers/specs/2026-11-24-fim-direcoes/fotos.mjs <pasta>`.
import { readdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const assets = 'D:/andr3/jogo-coringa/packages/web/dist/assets/';
const font = (prefix) => pathToFileURL(assets + readdirSync(assets).find((f) => f.startsWith(prefix) && f.endsWith('.woff2'))).href;
const fonts = `@font-face{font-family:'Alfa Slab One';src:url(${font('alfa-slab-one-latin-400')})}@font-face{font-family:'Archivo';src:url(${font('archivo-latin-wdth')});font-weight:100 900}`;
const prototype = pathToFileURL('D:/andr3/jogo-coringa/docs/superpowers/specs/2026-11-24-fim-direcoes/prototipo.html').href;

const browser = await chromium.launch();
for (const vp of [
  { width: 1440, height: 900, name: 'pc' },
  { width: 390, height: 844, name: 'celular' },
]) {
  const table = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
  await table.addInitScript(() => localStorage.setItem('coringa:abertura', 'pular'));
  await table.goto('http://localhost:5173/');
  await table.evaluate(async () => localStorage.setItem('coringa:partidas', await (await fetch('/tmp-especiais.json')).text()));
  await table.goto('http://localhost:5173/partidas/especiais');
  await table.getByRole('combobox', { name: 'Rodada' }).selectOption('35');
  await table.waitForTimeout(2500);
  const background = `${out}/mesa-${vp.name}.png`;
  await table.screenshot({ path: background });
  await table.close();
  for (const dir of (process.argv[3] ?? 'a,b,c').split(',')) {
    for (const res of ['vitoria', 'derrota']) {
      const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
      await page.goto(`${prototype}?dir=${dir}&res=${res}&fundo=${encodeURIComponent(pathToFileURL(background).href)}`);
      await page.addStyleTag({ content: fonts });
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(300);
      await page.screenshot({ path: `${out}/${dir}-${res}-${vp.name}.png` });
      await page.close();
    }
  }
}
await browser.close();
