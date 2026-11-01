// E2E das cenas do Ataque e da Defesa Absolutos (sub-projeto 6, fatia 2): a cena desenhada aparece com as tarjas, nada rola de
// lado durante ela (no PC e no celular em pé de 360 × 640), e um toque na mesa a pula, mostrando o estado final na hora. É o que o
// jsdom não prova: o módulo das cenas carregado de verdade (o chunk à parte), a caixa medida e o pulo pelo toque.
//
// A partida vem de `fixtures/absolutos.json`, uma entrada de "partidas anteriores" com o replay de uma partida greedy × greedy do
// simulador (semente `absolutos-40`, config padrão das regras de 2026-10-31): no passo 50 (rodada 11) o Bot acerta um Ataque
// Absoluto (a sua vida vai de 447 a 345); no passo 58 (rodada 13) você completa a Defesa Absoluta. O replay abre direto em
// `/partidas/absolutos`, e o passo n mostra as batidas da jogada n − 1.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { failOnConsoleErrors, placar, replayControl, replayCounter } from './helpers.ts';

const FIXTURE = readFileSync(new URL('./fixtures/absolutos.json', import.meta.url), 'utf8');

/** Abre o replay parado no passo `step` (a rodada `round` é o atalho até perto dele). */
async function openAt(page: Page, round: number, step: number): Promise<void> {
  await page.addInitScript((games) => window.localStorage.setItem('coringa:partidas', games), FIXTURE);
  await page.goto('/partidas/absolutos');
  await page.getByRole('combobox', { name: 'Rodada' }).selectOption(String(round));
  const next = replayControl(page, 'Próximo passo');
  for (let i = 0; i < 30; i++) {
    const text = (await replayCounter(page).textContent()) ?? '';
    if (Number(/^Passo (\d+)/.exec(text)?.[1]) >= step) break;
    await next.click();
  }
  await expect(replayCounter(page)).toHaveText(new RegExp(`^Passo ${step} de \\d+$`));
  await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1);
}

/** Nada rola de lado: a página não é mais larga que a janela. */
async function expectNoSideScroll(page: Page): Promise<void> {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, 'a página não rola de lado').toBeLessThanOrEqual(client);
}

/** Um toque na área dos campos, longe dos controles do replay (que não pulam: `data-sem-pulo`). */
async function tapTable(page: Page): Promise<void> {
  const box = (await page.locator('[data-campos]').boundingBox())!;
  await page.mouse.click(box.x + box.width / 2, box.y + 10);
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 360, height: 640 },
]) {
  test.describe(`${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport });

    test('o Ataque Absoluto do Bot: a cena com as tarjas, sem rolar de lado, e o toque pula para a vida final', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 11, 50);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="ABSOLUTE_ATTACK"]')).toHaveCount(1);
      await expect(page.locator('[data-faixa-cena="ABSOLUTE_ATTACK"] [data-tarja]')).toHaveCount(2);
      await expect(page.locator('[data-heroi]')).toHaveAttribute('data-lado', 'oponente');
      await expectNoSideScroll(page);
      await tapTable(page);
      await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1, { timeout: 500 });
      await expect(placar(page).locator('[data-lado="voce"] [data-hp]')).toHaveText('345', { timeout: 500 });
      guard.expectClean();
    });

    test('a sua Defesa Absoluta: a cena, sem rolar de lado, e o toque pula para a insígnia no seu retrato', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 13, 58);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="ABSOLUTE_DEFENSE"]')).toHaveCount(1);
      await expect(page.locator('[data-faixa-cena="ABSOLUTE_DEFENSE"] [data-tarja]')).toHaveCount(2);
      await expectNoSideScroll(page);
      await tapTable(page);
      await expect(placar(page).locator('[data-retrato="voce"] [data-insignia]')).toBeVisible({ timeout: 500 });
      guard.expectClean();
    });
  });
}
