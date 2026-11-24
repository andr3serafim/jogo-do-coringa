// Fotos da lista de partidas (`/partidas`) com duas opções de tom para a vitória e a derrota (decisoes.md 2026-11-23 (9)), nos dois temas
// do menu. Só CSS injetado: o jogo não muda. Pede o dev server da web; roda com `node historico-fotos.mjs <pasta>`.
import { createRequire } from 'node:module';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const base = { mode: { kind: 'training', level: 'medio' }, seat: 'p1', names: { me: 'Você', opponent: 'Bot' }, rounds: 30, score: { p1: 0, p2: 0 }, rulesVersion: 6 };
const games = [
  { ...base, id: 'v1', date: Date.UTC(2026, 10, 23, 15, 10), outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner: 'p1', reason: 'HP' } } },
  { ...base, id: 'd1', date: Date.UTC(2026, 10, 23, 14, 40), outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner: 'p2', reason: 'HP' } }, mode: { kind: 'online', code: 'K7M2QP' }, names: { me: 'Você', opponent: 'Duda' } },
  { ...base, id: 'e1', date: Date.UTC(2026, 10, 22, 21, 5), outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'DRAW', reason: 'ANTI_STALL' } } },
  { ...base, id: 'v2', date: Date.UTC(2026, 10, 22, 20, 30), outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner: 'p1', reason: 'EXODIA' } }, mode: { kind: 'training', level: 'dificil' } },
];
const OPCOES = {
  hoje: '',
  faixa: `
    li[data-res] { position: relative; color: var(--color-tinta); padding-left: 22px !important; }
    li[data-res]::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 10px; }
    li[data-res='v'] { background: linear-gradient(90deg, color-mix(in oklab, #2a7339 26%, var(--color-papel)) 0%, var(--color-papel) 62%) !important; }
    li[data-res='v']::before { background: #2a7339; }
    li[data-res='v'] > div > p:first-child { color: #2a7339; }
    li[data-res='d'] { background: linear-gradient(90deg, color-mix(in oklab, #b8261c 22%, var(--color-papel)) 0%, var(--color-papel) 62%) !important; }
    li[data-res='d']::before { background: #b8261c; }
    li[data-res='d'] > div > p:first-child { color: #b8261c; }`,
  selo: `
    li[data-res] { color: var(--color-tinta); }
    li[data-res='v'] { border-color: #2a7339 !important; box-shadow: 4px 4px 0 #2a7339; }
    li[data-res='d'] { border-color: #b8261c !important; box-shadow: 4px 4px 0 #b8261c; }
    li[data-res] > div > p:first-child { align-self: flex-start; padding: 2px 10px; border: 2px solid var(--color-tinta); font-size: 1.05rem !important; text-transform: uppercase; letter-spacing: .04em; }
    li[data-res='v'] > div > p:first-child { background: #2a7339; color: var(--color-papel); }
    li[data-res='d'] > div > p:first-child { background: #b8261c; color: var(--color-papel); }
    li[data-res='e'] > div > p:first-child { background: var(--color-papel); }`,
};
const browser = await chromium.launch();
for (const tema of ['pink', 'green']) {
  for (const [nome, css] of Object.entries(OPCOES)) {
    const page = await browser.newPage({ viewport: { width: 390, height: 780 }, deviceScaleFactor: 2 });
    await page.addInitScript(() => localStorage.setItem('coringa:abertura', 'pular'));
    await page.goto('http://localhost:5173/');
    await page.evaluate(({ games, tema }) => {
      localStorage.setItem('coringa:partidas', JSON.stringify(games));
      localStorage.setItem('coringa:prefs', JSON.stringify({ menuTheme: tema }));
    }, { games, tema });
    await page.goto('http://localhost:5173/partidas');
    await page.waitForTimeout(1200);
    await page.evaluate((css) => {
      for (const li of document.querySelectorAll('ul[role="list"] > li')) {
        const t = li.querySelector('p')?.textContent ?? '';
        li.dataset.res = t === 'Vitória' ? 'v' : t === 'Derrota' ? 'd' : 'e';
      }
      const s = document.createElement('style');
      s.textContent = css;
      document.head.appendChild(s);
    }, css);
    await page.waitForTimeout(300);
    await page.screenshot({ path: `${out}/historico-${tema === 'pink' ? 'rosa' : 'verde'}-${nome}.png` });
    await page.close();
  }
}
await browser.close();
console.log('ok');
