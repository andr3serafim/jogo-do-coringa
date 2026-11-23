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
  for (const v of ['antes', 'a', 'b', 'c']) {
    await page.evaluate((v) => {
      document.querySelectorAll('[data-tom="escuro"]').forEach((e) => {
        if (v === 'antes') e.setAttribute('data-antes', ''); else e.removeAttribute('data-antes');
        if (v === 'a' || v === 'antes') e.removeAttribute('data-variante'); else e.setAttribute('data-variante', v);
      });
    }, v);
    await page.waitForTimeout(300);
    const hand = page.getByRole('list', { name: 'Sua mão' });
    const a = await page.getByRole('group', { name: 'Sua fileira de ataque' }).boundingBox();
    const h = await hand.boundingBox();
    const top = a.y - 12, bottom = h.y + h.height + 8;
    await page.screenshot({ fullPage: true, path: `${out}/${vp.name}-${v}.png`, clip: { x: 0, y: top, width: Math.min(vp.width, vp.name === 'pc' ? 1100 : vp.width), height: bottom - top } });
  }
  await page.close();
}
await browser.close();
