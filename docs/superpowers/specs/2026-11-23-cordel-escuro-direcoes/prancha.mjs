import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const dir = process.argv[2];
const labels = { antes: 'Antes (reprovada): inversão lisa', a: 'A · Noite de feira: cobre, creme e filete de ouro velho', b: 'B · Anil: azul de noite, osso e coral', c: 'C · Ouro gravado: valores em ouro, hachura e moldura dourada' };
const browser = await chromium.launch();
for (const [vp, cols, w] of [['pc', 1, 1100], ['celular', 2, 390]]) {
  const imgs = Object.entries(labels).map(([k, t]) => `<figure><figcaption>${t}</figcaption><img src="data:image/png;base64,${readFileSync(`${dir}/${vp}-${k}.png`).toString('base64')}" style="width:${w}px"></figure>`).join('');
  const page = await browser.newPage({ viewport: { width: cols * (w + 32) + 32, height: 400 }, deviceScaleFactor: 1.5 });
  await page.setContent(`<body style="margin:0;padding:16px;background:#2a2019;font:600 17px system-ui;color:#f1f0ea;display:grid;grid-template-columns:repeat(${cols},auto);gap:16px">${imgs}</body><style>figure{margin:0}figcaption{margin:0 0 8px}img{display:block;border-radius:6px}</style>`);
  await page.screenshot({ path: `${dir}/prancha-${vp}.png`, fullPage: true });
  await page.close();
}
await browser.close();
