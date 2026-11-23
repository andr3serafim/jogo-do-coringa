import { createRequire } from 'node:module';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const browser = await chromium.launch();
for (const vp of [{ width: 1440, height: 900, name: 'pc' }, { width: 390, height: 844, name: 'celular' }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
  await page.addInitScript(() => localStorage.setItem('coringa:abertura', 'pular'));
  await page.goto('http://localhost:5173/');
  await page.evaluate(async () => localStorage.setItem('coringa:partidas', await (await fetch('/tmp-especiais.json')).text()));
  await page.goto('http://localhost:5173/partidas/especiais');
  await page.getByRole('combobox', { name: 'Rodada' }).selectOption('17');
  await page.waitForTimeout(2500);
  await page.screenshot({ path: `${out}/escuro-${vp.name}.png`, fullPage: vp.name === 'celular' });
  await page.close();
}
await browser.close();
