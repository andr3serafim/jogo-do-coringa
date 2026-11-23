// Junta as fotos do histórico numa prancha: uma coluna por opção, uma linha por tema.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const [dir, saida] = process.argv.slice(2);
const img = (n) => `data:image/png;base64,${readFileSync(`${dir}/${n}`).toString('base64')}`;
const col = { hoje: 'Hoje', faixa: '1 · Faixa (CS2)', selo: '2 · Selo' };
const html = `<body style="margin:0;background:#0b0908;color:#f1f0ea;font:700 16px system-ui;padding:12px"><div style="display:grid;grid-template-columns:repeat(3,390px);gap:12px">
${['rosa', 'verde'].flatMap((t) => Object.entries(col).map(([k, l]) => `<figure style="margin:0"><figcaption style="margin-bottom:6px">${l} · ${t}</figcaption><img style="width:390px;display:block" src="${img(`historico-${t}-${k}.png`)}"></figure>`)).join('')}</div></body>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1220, height: 800 } });
await p.setContent(html);
await p.waitForTimeout(300);
await p.screenshot({ path: saida, fullPage: true });
await b.close();
