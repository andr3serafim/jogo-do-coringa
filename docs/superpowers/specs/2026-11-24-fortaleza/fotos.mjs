// As fotos da Fortaleza (decisoes.md 2026-11-24 (10)): a zona dos Q do seu campo, no replay da fixture `especiais`, nos três níveis de
// hoje (passo 77: 3 Q, a muralha; passo 80: o escudo de ouro) e nas duas variações da Fortaleza (passo 90: os 4 Q depois do escudo),
// desenhadas por cima da camada de hoje. Pede o dev server da web (`pnpm dev:web`). Uso: `node <este arquivo> <pasta>`.
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire('D:/andr3/jogo-coringa/packages/web/package.json');
const { chromium } = require('@playwright/test');
const out = process.argv[2];
const games = JSON.parse(readFileSync('D:/andr3/jogo-coringa/packages/web/e2e/fixtures/especiais.json', 'utf8'));
games[0].date = Date.now();
const fixture = JSON.stringify(games);

/**
 * As duas Fortalezas, paradas (sem respirar), com a mesma camada atrás dos Q que o escudo de ouro usa, mas saindo por cima e por baixo
 * das cartas para aparecer: `box` é o tamanho da camada em relação à zona, e `viewBox` o quadro do desenho.
 */
const VARIANTS = {
  // 1 · Muro: um muro de pedra com ameias atrás da fileira dos Q (papel e tinta), mais largo e mais alto que as cartas.
  muro: {
    box: 'width:112%;height:150%;left:-6%;top:-25%',
    viewBox: '0 0 120 40',
    svg:
      '<path d="M0 40V9h7V2h9v7h8V2h9v7h8V2h9v7h8V2h9v7h8V2h9v7h8V2h9v7h8V2h9v38z" fill="var(--color-papel)" stroke="var(--color-tinta)" stroke-width=".9" stroke-linejoin="round"/>' +
      '<path d="M0 18h120M0 28h120M20 9v9M50 9v9M80 9v9M110 9v9M35 18v10M65 18v10M95 18v10M5 18v10M20 28v12M50 28v12M80 28v12M110 28v12" stroke="var(--color-tinta)" stroke-width=".6" opacity=".55"/>',
  },
  // 2 · Escudo de tinta: o escudo do nível de hoje, maior, em tinta com a borda, as ameias e a cruz de ouro (o ouro cheio fica para o escudo).
  escudo: {
    box: 'width:auto;height:190%;left:50%;top:50%;transform:translate(-50%,-50%)',
    viewBox: '0 0 24 27',
    svg:
      '<path d="M12 4l10 3V14c0 6-4.5 10-10 11.5C6.5 24 2 20 2 14V7z" fill="var(--color-tinta)" stroke="var(--color-ouro)" stroke-width="1.1"/>' +
      '<path d="M3.5 5V1.5h3v2h3.5v-2h4v2h3.5v-2h3V5" fill="none" stroke="var(--color-ouro)" stroke-width="1.1" stroke-linejoin="round"/>',
  },
};

const browser = await chromium.launch();
for (const vp of [
  { width: 1440, height: 900, name: 'pc' },
  { width: 390, height: 844, name: 'celular' },
]) {
  const page = await browser.newPage({ viewport: { width: vp.width, height: vp.height }, deviceScaleFactor: 2 });
  await page.addInitScript((games) => {
    localStorage.setItem('coringa:abertura', 'pular');
    localStorage.setItem('coringa:partidas', games);
  }, fixture);
  const zone = page.locator('[data-campo="p1"] [data-poder="Q"]');
  const shot = async (name) => {
    await zone.scrollIntoViewIfNeeded();
    const box = await zone.boundingBox();
    const field = await page.locator('[data-campo="p1"]').boundingBox();
    const x = vp.name === 'pc' ? Math.max(field.x, box.x - 260) : field.x;
    const right = field.x + field.width;
    await page.screenshot({ path: `${out}/${vp.name}-${name}.png`, clip: { x, y: Math.max(0, box.y - 90), width: right - x, height: box.height + 180 } });
  };
  const goTo = async (round, step) => {
    await page.goto('http://localhost:5173/partidas/especiais');
    await page.getByRole('combobox', { name: 'Rodada' }).selectOption(String(round));
    const next = page.getByRole('button', { name: 'Próximo passo' });
    for (let i = 0; i < 40; i++) {
      const text = (await page.getByText(/^Passo \d+ de \d+$/).textContent()) ?? '';
      if (Number(/^Passo (\d+)/.exec(text)?.[1]) >= step) break;
      await next.click();
    }
    await page.waitForTimeout(2500);
  };
  await goTo(17, 77);
  await shot('1-muralha-3Q');
  await goTo(17, 80);
  await shot('2-escudo-4Q');
  await goTo(19, 90);
  await shot('3-hoje-4Q-depois-do-escudo');
  for (const [name, v] of Object.entries(VARIANTS)) {
    await zone.evaluate((el, v) => {
      const layer = el.querySelector('[data-poder-camada] svg');
      if (!layer) throw new Error('sem a camada dos Q');
      layer.removeAttribute('data-muralha-zona');
      layer.removeAttribute('class');
      layer.setAttribute('viewBox', v.viewBox);
      layer.setAttribute('preserveAspectRatio', 'none');
      layer.setAttribute('style', 'position:absolute;overflow:visible;' + v.box);
      layer.innerHTML = v.svg;
    }, v);
    await page.waitForTimeout(200);
    await shot(`4-fortaleza-${name}`);
  }
  await page.close();
}
await browser.close();
