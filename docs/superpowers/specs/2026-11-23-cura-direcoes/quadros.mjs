// Quadros das direções do protótipo da cura (câmera lenta 3×): uma foto por instante, por direção e por tela, e uma prancha por tela.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const so = process.argv[3]; // opcional: "pc" ou "celular"
mkdirSync(`${out}/quadros`, { recursive: true });
const INSTANTES = [250, 600, 900, 1250, 1600, 2300];
const browser = await chromium.launch();
const telas = [
  { nome: 'pc', vp: { width: 1500, height: 1300 }, clip: { x: 0, y: 0, w: 1080, h: 900 } },
  { nome: 'celular', vp: { width: 900, height: 1300 }, clip: { x: 0, y: 0, w: 390, h: 760 } },
].filter((t) => !so || t.nome === so);
for (const tela of telas) {
  const page = await browser.newPage({ viewport: tela.vp, deviceScaleFactor: 1 });
  await page.goto('http://localhost:5173/tmp-cura/prototipo.html');
  await page.getByRole('button', { name: tela.nome === 'pc' ? 'PC' : 'Celular', exact: true }).click();
  await page.getByRole('button', { name: 'Câmera lenta' }).click();
  await page.waitForTimeout(800);
  const linhas = [];
  for (const dir of ['A · Seiva', 'B · Gotas', 'C · Coração', 'Hoje']) {
    await page.getByRole('button', { name: dir }).click();
    await page.waitForTimeout(400);
    const caixa = await page.locator('#palco').boundingBox();
    const escala = caixa.width / (tela.nome === 'pc' ? 1440 : 390);
    const t0 = Date.now();
    await page.getByRole('button', { name: 'TOCAR' }).click();
    const fotos = [];
    for (const ms of INSTANTES) {
      const espera = ms * 3 - (Date.now() - t0);
      if (espera > 0) await page.waitForTimeout(espera);
      const arq = `quadros/${tela.nome}-${dir[0].toLowerCase()}-${ms}.png`;
      await page.screenshot({ path: `${out}/${arq}`, clip: { x: caixa.x + tela.clip.x * escala, y: caixa.y + tela.clip.y * escala, width: tela.clip.w * escala, height: tela.clip.h * escala } });
      fotos.push({ arq, ms });
    }
    linhas.push({ dir, fotos });
    await page.waitForTimeout(3000);
  }
  // A prancha: uma linha por direção, um quadro por instante.
  const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#0b0908;color:#f1f0ea;font:700 15px system-ui;padding:12px}
    .l{display:flex;gap:6px;margin-bottom:14px;align-items:flex-start}.r{width:110px;flex:none;padding-top:4px}
    figure{margin:0}img{display:block;width:${tela.nome === 'pc' ? 300 : 150}px;border:1px solid #3b2f26}figcaption{font-weight:400;font-size:12px;color:#b9b3a5}</style>
    ${linhas.map((l) => `<div class="l"><div class="r">${l.dir}</div>${l.fotos.map((f) => `<figure><img src="data:image/png;base64,${readFileSync(`${out}/${f.arq}`).toString('base64')}"><figcaption>${(f.ms / 1000).toFixed(2).replace('.', ',')} s</figcaption></figure>`).join('')}</div>`).join('')}`;
  const p2 = await browser.newPage({ viewport: { width: tela.nome === 'pc' ? 2000 : 1100, height: 800 } });
  await p2.setContent(html);
  await p2.waitForTimeout(300);
  await p2.screenshot({ path: `${out}/prancha-${tela.nome}.png`, fullPage: true });
  await p2.close();
  await page.close();
}
await browser.close();
writeFileSync(`${out}/quadros/LEIA.txt`, 'Quadros tirados pelo quadros.mjs (scratchpad), com a câmera lenta do protótipo; o tempo é o do jogo (1×).\n');
console.log('ok');
