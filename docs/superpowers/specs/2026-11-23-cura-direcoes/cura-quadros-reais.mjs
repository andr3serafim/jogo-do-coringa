// Quadros da cura de verdade (a camada da cura, `ui/anim/Heal.tsx`) no replay da fixture `especiais`, rodada 29, passo 137 → 138 (o 7♥ cai
// da sua Defesa com 2 K e 3 Q: +28), no PC e no celular, um a cada `PASSO` ms depois do "Próximo passo". Pede o dev server da web; roda com
// `node cura-quadros-reais.mjs <pasta>`. Uma prancha por tela junta os quadros.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const PASSO = 250;
const QUADROS = 16;
const browser = await chromium.launch();
for (const vp of [{ width: 1440, height: 900, name: 'pc', clip: [0, 0, 1100, 900] }, { width: 390, height: 844, name: 'celular', clip: [0, 0, 390, 844] }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 1 });
  await page.addInitScript(() => localStorage.setItem('coringa:abertura', 'pular'));
  await page.goto('http://localhost:5173/');
  await page.evaluate(async () => localStorage.setItem('coringa:partidas', await (await fetch('/e2e/fixtures/especiais.json')).text()));
  await page.goto('http://localhost:5173/partidas/especiais');
  await page.getByRole('combobox', { name: 'Rodada' }).selectOption('29');
  await page.waitForTimeout(2500);
  const next = page.getByRole('button', { name: 'Próximo passo' });
  for (let i = 0; i < 10; i++) {
    const txt = await page.getByText(/Passo \d+ de 179/).innerText();
    if (txt.startsWith('Passo 137')) break;
    await next.click();
    await page.waitForTimeout(2500);
  }
  await page.waitForTimeout(1500);
  const shots = [];
  await next.click();
  const t0 = Date.now();
  for (let i = 0; i < QUADROS; i++) {
    const wait = (i + 1) * PASSO - (Date.now() - t0);
    if (wait > 0) await page.waitForTimeout(wait);
    const [x, y, w, h] = vp.clip;
    shots.push({ ms: Date.now() - t0, png: (await page.screenshot({ clip: { x, y, width: w, height: h } })).toString('base64') });
  }
  await page.close();
  const p2 = await browser.newPage({ viewport: { width: 2000, height: 800 } });
  const width = vp.name === 'pc' ? 480 : 240;
  await p2.setContent(`<body style="margin:0;background:#000;display:flex;flex-wrap:wrap;gap:4px;font:12px sans-serif;color:#fff">${shots
    .map((s) => `<figure style="margin:0"><img style="width:${width}px;display:block" src="data:image/png;base64,${s.png}"><figcaption>${s.ms} ms</figcaption></figure>`)
    .join('')}</body>`);
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: `${out}/cura-real-${vp.name}.png`, fullPage: true });
  await p2.close();
}
await browser.close();
console.log('ok', readFileSync ? '' : '');
