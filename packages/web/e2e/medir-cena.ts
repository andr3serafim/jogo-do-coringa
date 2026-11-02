// A medição de uma cena (sub-projeto 6 §11) e as fotos dela, no PC e no celular em pé, a partir do replay de uma fixture. Fica fora do `pnpm e2e` e da
// CI: só roda por `medir.config.ts`. Serve porque o jsdom não tem layout: nas fatias 4 e 4b, só as fotos acharam o cometa fora do lugar, a cena sem
// cortina e as cópias da quadra colapsadas. O resultado vai para `docs/memoria/notas/medicao-*.md`.
//
// Com a web já construída (`pnpm --filter @coringa/web build`) e a porta 8787 livre:
//
//   MEDIR_FIXTURE=exodia-devastacao MEDIR_RODADA=7 MEDIR_PASSO=27 MEDIR_MS=4600 MEDIR_FOTOS=300,1100,2500 MEDIR_SAIDA=<pasta> \
//     pnpm --filter @coringa/web exec playwright test --config medir.config.ts
//
// - `MEDIR_FIXTURE`: o nome do arquivo em `e2e/fixtures/`, sem o `.json`.
// - `MEDIR_RODADA` e `MEDIR_PASSO`: onde o replay para antes de "Próximo passo", o clique que toca a cena.
// - `MEDIR_MS`: a duração da cena; `MEDIR_FOTOS`: os instantes das fotos, em ms depois do clique (opcional).
// - `MEDIR_SAIDA`: a pasta das fotos (`<largura>-<ms>.png`) e da medida (`<largura>.json`). Fora do repositório.
//
// A medida é da CPU 4× mais lenta: quadros por segundo, p95 e maior intervalo em ms, e o pico de `[data-particula]` vivas. Os 5 primeiros quadros ficam de
// fora. As fotos saem antes, sem o acelerador, para o tempo delas não entrar na conta.
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';
import { replayControl, replayCounter } from './helpers.ts';

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`falta ${name}: o uso está no começo de e2e/medir-cena.ts`);
  return value;
}

const fixtureName = required('MEDIR_FIXTURE');
const round = required('MEDIR_RODADA');
const step = Number(required('MEDIR_PASSO'));
const sceneMs = Number(required('MEDIR_MS'));
const out = required('MEDIR_SAIDA');
const shots = (process.env.MEDIR_FOTOS ?? '').split(',').filter(Boolean).map(Number);
const fixture = readFileSync(new URL(`./fixtures/${fixtureName}.json`, import.meta.url), 'utf8');
const gameId = (JSON.parse(fixture) as Array<{ id: string }>)[0]!.id;
mkdirSync(out, { recursive: true });

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 360, height: 640 },
]) {
  test(`${viewport.width} × ${viewport.height}`, async ({ page }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await page.addInitScript((games) => window.localStorage.setItem('coringa:partidas', games), fixture);
    await page.goto(`/partidas/${gameId}`);
    await page.getByRole('combobox', { name: 'Rodada' }).selectOption(round);
    const next = replayControl(page, 'Próximo passo');
    for (let i = 0; i < 30; i++) {
      const text = (await replayCounter(page).textContent()) ?? '';
      if (Number(/^Passo (\d+)/.exec(text)?.[1]) >= step) break;
      await next.click();
    }
    const idle = page.locator('[data-palco]:not([data-ocupado])');
    await expect(idle).toHaveCount(1);

    // As fotos: toca a cena, fotografa, e volta um passo para medir a mesma cena.
    if (shots.length > 0) {
      await next.click();
      const began = Date.now();
      for (const at of shots) {
        await page.waitForTimeout(Math.max(0, at - (Date.now() - began)));
        await page.screenshot({ path: `${out}/${viewport.width}-${at}.png` });
      }
      await expect(idle).toHaveCount(1, { timeout: sceneMs + 4_000 });
      await replayControl(page, 'Passo anterior').click();
      await expect(idle).toHaveCount(1, { timeout: sceneMs + 4_000 });
    }

    // A medida, com a CPU 4× mais lenta.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate((duration) => {
      const flags = window as unknown as { medida: Promise<unknown> };
      flags.medida = new Promise((resolve) => {
        const gaps: number[] = [];
        let peak = 0;
        let previous = performance.now();
        const begin = previous;
        const tick = (now: number) => {
          gaps.push(now - previous);
          previous = now;
          peak = Math.max(peak, document.querySelectorAll('[data-particula]').length);
          if (now - begin < duration) {
            requestAnimationFrame(tick);
            return;
          }
          const useful = gaps.slice(5);
          const total = useful.reduce((sum, gap) => sum + gap, 0);
          const sorted = [...useful].sort((a, b) => a - b);
          resolve({ fps: Math.round((useful.length * 1000) / total), p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]!), worst: Math.round(sorted.at(-1)!), peak });
        };
        requestAnimationFrame(tick);
      });
    }, sceneMs);
    await next.click();
    const result = await page.evaluate(() => (window as unknown as { medida: Promise<unknown> }).medida);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    writeFileSync(`${out}/${viewport.width}.json`, JSON.stringify(result));
  });
}
