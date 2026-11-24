// As fotos das três direções do Cordel Escuro, no jogo de verdade: o replay da fixture `especiais` (você no Cordel Escuro, o Bot no
// Cordel; e o contrário, para a mão do Bot mostrar o verso), na rodada 17, no PC e no celular. Pede o dev server da web (`pnpm dev:web`)
// e as fixtures com as aparências em `packages/web/public/tmp-especiais.json` e `tmp-especiais-bot.json` (fora do git: apague depois). Uso: `node docs/superpowers/specs/2026-11-24-cordel-direcoes/fotos.mjs <pasta>`.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const css = readFileSync(new URL('./variantes.css', import.meta.url), 'utf8');
const browser = await chromium.launch();
for (const [pass, file] of [['voce', 'tmp-especiais.json'], ['bot', 'tmp-especiais-bot.json']]) for (const vp of [
  { width: 1440, height: 900, name: 'pc' },
  { width: 390, height: 844, name: 'celular' },
]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
  await page.addInitScript(() => localStorage.setItem('coringa:abertura', 'pular'));
  await page.goto('http://localhost:5173/');
  await page.evaluate(async (file) => localStorage.setItem('coringa:partidas', await (await fetch('/' + file)).text()), file);
  await page.goto('http://localhost:5173/partidas/especiais');
  await page.getByRole('combobox', { name: 'Rodada' }).selectOption('17');
  await page.waitForTimeout(2500);
  await page.addStyleTag({ content: css });
  for (const v of ['hoje', 'a', 'b', 'c']) {
    await page.evaluate((v) => {
      document.querySelectorAll('[data-tom="escuro"], [data-verso-deck="cordel-escuro"]').forEach((e) => {
        if (v === 'hoje') e.removeAttribute('data-variante');
        else e.setAttribute('data-variante', v);
      });
    }, v);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/${pass}-${vp.name}-${v}.png`, fullPage: vp.name === 'celular' });
  }
  await page.close();
}
await browser.close();
