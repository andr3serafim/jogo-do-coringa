// Fotos da cura passiva (fixture `especiais`, rodada 29, passo 137 → 138) e as caixas das peças, para o protótipo das direções.
import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const browser = await chromium.launch();
const boxes = {};
for (const vp of [{ width: 1440, height: 900, name: 'pc' }, { width: 390, height: 844, name: 'celular' }]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
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
  const hide = await page.addStyleTag({ content: 'section[aria-label="Controles do replay"]{display:none!important}' });
  await page.waitForTimeout(1500);
  const measure = async () =>
    page.evaluate(() => {
      const r = (el) => {
        if (!el) return null;
        const b = el.getBoundingClientRect();
        return { x: b.x, y: b.y + window.scrollY, w: b.width, h: b.height };
      };
      const field = document.querySelector('[aria-label="Seu campo"]');
      const def = document.querySelector('[aria-label="Sua fileira de defesa"]');
      const zone = (name) => [...(field?.querySelectorAll('section, div, ul') ?? [])].find((e) => e.getAttribute('aria-label')?.startsWith(name));
      return {
        page: { w: document.documentElement.scrollWidth, h: document.documentElement.scrollHeight },
        defIds: [...(def?.querySelectorAll('[data-card-id]') ?? [])].map((e) => ({ id: e.getAttribute('data-card-id'), label: e.getAttribute('aria-label'), box: r(e) })),
        grave: r(document.querySelector('[data-cemiterio]')),
        bar: r(document.querySelector('[data-lado="voce"] [role="meter"]')),
        hpNum: r(document.querySelector('[data-lado="voce"] [data-hp]')),
        hpLine: r(document.querySelector('[data-lado="voce"] [data-hp]')?.parentElement),
        info: r(document.querySelector('[data-lado="voce"] .placar-info')),
        portrait: r(document.querySelector('[data-retrato="voce"]')),
        guard: [...(field?.querySelectorAll('[data-card-id]') ?? [])].filter((e) => /^K de/.test(e.getAttribute('aria-label') ?? '')).map((e) => r(e)),
        queens: [...(field?.querySelectorAll('[data-card-id]') ?? [])].filter((e) => /^Q de/.test(e.getAttribute('aria-label') ?? '')).map((e) => r(e)),
        plates: r(field?.querySelector('.campo-estado')),
        plateItems: [...(field?.querySelectorAll('[data-placa-estado]') ?? [])].map((e) => ({ kind: e.getAttribute('data-placa-estado'), box: r(e) })),
        zonas: r(field?.querySelector('.campo-zonas')),
        fieldBox: r(field),
        zoneProbe: zone('Guarda') ? 'ok' : 'none',
      };
    });
  const before = await measure();
  await page.screenshot({ fullPage: true, path: `${out}/${vp.name}-antes.png` });
  await hide.evaluate((e) => (e.disabled = true));
  await next.click();
  await page.waitForTimeout(5000);
  await hide.evaluate((e) => (e.disabled = false));
  await page.waitForTimeout(800);
  const after = await measure();
  await page.screenshot({ fullPage: true, path: `${out}/${vp.name}-depois.png` });
  boxes[vp.name] = { before, after };
  await page.close();
}
await browser.close();
writeFileSync(`${out}/caixas.json`, JSON.stringify(boxes, null, 1));
console.log('ok');
