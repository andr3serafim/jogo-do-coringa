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
// - `MEDIR_PORTA` (opcional): a porta do servidor da medição, quando a 8787 está ocupada (ver `medir.config.ts`).
// - `MEDIR_APARENCIA` (opcional): `<deck>:<raça>` (ex.: `bestiario:egipcio`), gravado em `coringa:prefs` antes de abrir o replay, que veste
//   a aparência de agora (decks e raças, fatia 1, F4). A medida espera as imagens das cartas carregarem. Sem a variável, nada muda.
// - `MEDIR_PERFIL=1` (opcional): grava também o perfil do Chromium do clique medido em `<largura>-perfil.json` (abre no painel Performance do DevTools). O
//   rastreamento pesa: com ele, os números da medida não valem. Meça sem ele e use o perfil só para ver do que é feito cada quadro.
//
// A medida é da CPU 4× mais lenta: quadros por segundo, p95 e maior intervalo em ms, o pico de `[data-particula]` vivas e a `chegada`, o maior intervalo
// nos 300 ms depois do toque no "Próximo passo" (o quadro em que o passo chega à mesa). Os 5 primeiros quadros ficam de fora. As fotos saem antes, sem o
// acelerador, para o tempo delas não entrar na conta.
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
const profile = process.env.MEDIR_PERFIL === '1';
const [lookDeck, lookRace] = (process.env.MEDIR_APARENCIA ?? '').split(':');
/** O que o perfil grava: a linha do tempo do DevTools e as amostras de JS (para saber de qual função é cada trecho). */
const TRACE_CATEGORIES = ['devtools.timeline', 'disabled-by-default-devtools.timeline', 'disabled-by-default-devtools.timeline.frame', 'v8.execute', 'disabled-by-default-v8.cpu_profiler', 'disabled-by-default-devtools.timeline.invalidationTracking'];
/** Depois do toque, a janela em que o passo chega à mesa. */
const ARRIVAL_WINDOW_MS = 300;
const fixture = readFileSync(new URL(`./fixtures/${fixtureName}.json`, import.meta.url), 'utf8');
const gameId = (JSON.parse(fixture) as Array<{ id: string }>)[0]!.id;
mkdirSync(out, { recursive: true });

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 360, height: 640 },
]) {
  test(`${viewport.width} × ${viewport.height}`, async ({ page, browser }) => {
    test.setTimeout(90_000);
    await page.setViewportSize(viewport);
    await page.addInitScript((games) => window.localStorage.setItem('coringa:partidas', games), fixture);
    if (lookDeck && lookRace) {
      const prefs = JSON.stringify({ autoPass: true, reduceMotion: false, sound: true, look: { deck: lookDeck, race: lookRace } });
      await page.addInitScript((value) => window.localStorage.setItem('coringa:prefs', value), prefs);
    }
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
    // Com uma aparência de arte, a medida começa com as imagens das cartas já carregadas (o pacote chega por `import()`).
    if (lookDeck && lookRace) {
      await expect
        .poll(() =>
          page.evaluate(() => {
            const images = [...document.querySelectorAll<HTMLImageElement>('[data-card-id] img')];
            return images.length > 0 && images.every((image) => image.complete && image.naturalWidth > 0);
          }),
        )
        .toBe(true);
    }

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

    // A medida, com a CPU 4× mais lenta. O perfil abre antes dela: abrir o rastreamento trava a página por quase 1 s.
    if (profile) await browser.startTracing(page, { path: `${out}/${viewport.width}-perfil.json`, screenshots: false, categories: TRACE_CATEGORIES });
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    await page.evaluate(([duration, arrivalMs]) => {
      const flags = window as unknown as { medida: Promise<unknown> };
      let touched = Infinity;
      document.addEventListener('pointerdown', () => (touched = performance.now()), { capture: true, once: true });
      flags.medida = new Promise((resolve) => {
        const gaps: number[] = [];
        let arrival = 0;
        let peak = 0;
        let previous = performance.now();
        const begin = previous;
        const tick = (now: number) => {
          gaps.push(now - previous);
          if (now >= touched && now - touched <= arrivalMs) arrival = Math.max(arrival, now - previous);
          previous = now;
          peak = Math.max(peak, document.querySelectorAll('[data-particula]').length);
          if (now - begin < duration) {
            requestAnimationFrame(tick);
            return;
          }
          const useful = gaps.slice(5);
          const total = useful.reduce((sum, gap) => sum + gap, 0);
          const sorted = [...useful].sort((a, b) => a - b);
          resolve({
            fps: Math.round((useful.length * 1000) / total),
            p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]!),
            worst: Math.round(sorted.at(-1)!),
            chegada: Math.round(arrival),
            peak,
          });
        };
        requestAnimationFrame(tick);
      });
    }, [sceneMs, ARRIVAL_WINDOW_MS] as const);
    await next.click();
    const result = await page.evaluate(() => (window as unknown as { medida: Promise<unknown> }).medida);
    if (profile) await browser.stopTracing();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    writeFileSync(`${out}/${viewport.width}.json`, JSON.stringify(result));
  });
}
