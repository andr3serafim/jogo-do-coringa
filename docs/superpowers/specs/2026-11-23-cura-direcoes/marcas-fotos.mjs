// Fotos das marcas do Coringa só com a figura (decisoes.md 2026-11-23 (8)) no replay da fixture `especiais`, rodada 29 (a sua Cura passiva):
// no PC com o mouse em cima, no celular com o toque. Pede o dev server da web; roda com `node marcas-fotos.mjs <pasta>`.
import { createRequire } from 'node:module';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const browser = await chromium.launch();
for (const vp of [{ width: 1440, height: 900, name: 'pc', touch: false }, { width: 390, height: 844, name: 'celular', touch: true }]) {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2, hasTouch: vp.touch });
  const page = await context.newPage();
  await page.addInitScript(() => localStorage.setItem('coringa:abertura', 'pular'));
  await page.goto('http://localhost:5173/');
  await page.evaluate(async () => localStorage.setItem('coringa:partidas', await (await fetch('/e2e/fixtures/especiais.json')).text()));
  await page.goto('http://localhost:5173/partidas/especiais');
  await page.getByRole('combobox', { name: 'Rodada' }).selectOption('29');
  await page.waitForTimeout(3000);
  const figure = page.getByRole('button', { name: /^Cura passiva: / }).first();
  await figure.scrollIntoViewIfNeeded();
  if (vp.touch) await figure.tap();
  else await figure.hover();
  await page.waitForTimeout(400);
  const box = await figure.boundingBox();
  const x = Math.max(0, box.x - (vp.touch ? 150 : 260));
  const y = Math.max(0, box.y - 120);
  await page.screenshot({ path: `${out}/marcas-${vp.name}.png`, clip: { x, y, width: Math.min(vp.width - x, vp.touch ? 390 : 560), height: 260 } });
  await context.close();
}
await browser.close();
console.log('ok');
