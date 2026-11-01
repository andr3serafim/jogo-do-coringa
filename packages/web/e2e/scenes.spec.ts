// E2E das cenas raras refeitas no sub-projeto 6 (fatia 2: os Absolutos; fatia 3: a Devastação e a Exódia): a cena desenhada aparece,
// nada rola de lado durante ela (no PC e no celular em pé de 360 × 640), e um toque na mesa a pula, mostrando o estado final na hora.
// É o que o jsdom não prova: o módulo das cenas carregado de verdade (o chunk à parte), a caixa medida e o pulo pelo toque.
//
// A partida vem de `fixtures/absolutos.json`, uma entrada de "partidas anteriores" com o replay de uma partida greedy × greedy do
// simulador (semente `absolutos-40`, config padrão das regras de 2026-10-31): no passo 50 (rodada 11) o Bot acerta um Ataque
// Absoluto (a sua vida vai de 447 a 345); no passo 58 (rodada 13) você completa a Defesa Absoluta. O replay abre direto em
// `/partidas/absolutos`, e o passo n mostra as batidas da jogada n − 1.
//
// A Devastação e a Exódia vêm de `fixtures/exodia-devastacao.json`, turtle × turtle (semente `fatia3-0`, config padrão das regras de
// 2026-10-31): no passo 211 (rodada 43) a sua Devastação derruba a Defesa do Bot, com 8 cartas; no passo 408 (rodada 83) o Bot fecha a
// Exódia, e a partida acaba.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { failOnConsoleErrors, placar, replayControl, replayCounter } from './helpers.ts';

const ABSOLUTES = readFileSync(new URL('./fixtures/absolutos.json', import.meta.url), 'utf8');
const SLICE_3 = readFileSync(new URL('./fixtures/exodia-devastacao.json', import.meta.url), 'utf8');

/** Abre o replay parado no passo `step` (a rodada `round` é o atalho até perto dele). */
async function openAt(page: Page, round: number, step: number, game: { id: string; fixture: string } = { id: 'absolutos', fixture: ABSOLUTES }): Promise<void> {
  await page.addInitScript((games) => window.localStorage.setItem('coringa:partidas', games), game.fixture);
  await page.goto(`/partidas/${game.id}`);
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

const SLICE_3_GAME = { id: 'exodia-devastacao', fixture: SLICE_3 };

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

    test('a Devastação: a cena no campo, com a fileira à vista e sem cortina, e o toque pula para o campo desolado', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 43, 210, SLICE_3_GAME);
      // Os campos longe da fileira atingida (a Defesa do Bot, em cima): no celular, a cena tem de rolar até ela.
      await page.locator('[data-campos]').evaluate((fields) => {
        fields.scrollTop = fields.scrollHeight;
      });
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="DEVASTATION"]')).toHaveCount(1);
      await expect(page.locator('[data-campo-cena="DEVASTATION"]')).toHaveCount(1);
      await expect(page.locator('[data-carta-caindo]')).toHaveCount(8);
      await expect(page.locator('[data-faixa-cena]')).toHaveCount(0);
      await expect(page.locator('[data-tarja]')).toHaveCount(0);
      await expect(page.locator('[data-cortina][data-ativa]')).toHaveCount(0);
      const inView = await page.evaluate(() => {
        const port = document.querySelector('[data-campos]')!.getBoundingClientRect();
        const row = document.querySelector('[data-fileira="p2:DEF"]')!.getBoundingClientRect();
        // O tremor do campo mexe a fileira em até 4 px.
        return row.top >= port.top - 4 && row.bottom <= port.bottom + 4;
      });
      expect(inView, 'a fileira atingida fica à vista').toBe(true);
      await expectNoSideScroll(page);
      // O tremor do campo não pode criar uma barra de rolagem nos campos (visto no navegador, 2026-11-01).
      const { bar, overflow } = await page.locator('[data-campos]').evaluate((fields) => ({
        bar: (fields as HTMLElement).offsetHeight - fields.clientHeight,
        overflow: getComputedStyle(fields).overflowX,
      }));
      expect(bar, 'sem barra de rolagem de lado nos campos').toBe(0);
      expect(overflow).toBe('hidden');
      await tapTable(page);
      await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1, { timeout: 500 });
      await expect(page.locator('[data-fileira="p2:DEF"][data-desolada]')).toHaveCount(1, { timeout: 500 });
      await expect(page.locator('[data-campo="p2"][data-apagado]')).toHaveCount(1);
      await expect(page.locator('[data-carta-caindo]')).toHaveCount(0);
      await expectNoSideScroll(page);
      guard.expectClean();
    });

    test('a Exódia do Bot: a cena com as tarjas, sem rolar de lado, e o toque pula para o seu retrato rachado', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 83, 407, SLICE_3_GAME);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="EXODIA"]')).toHaveCount(1);
      await expect(page.locator('[data-faixa-cena="EXODIA"] [data-tarja]')).toHaveCount(2);
      await expect(placar(page).locator('[data-retrato="voce"][data-derrotado]')).toHaveCount(0);
      await expectNoSideScroll(page);
      await tapTable(page);
      await expect(placar(page).locator('[data-retrato="voce"][data-derrotado]')).toHaveCount(1, { timeout: 500 });
      await expect(placar(page).locator('[data-lado="voce"] [data-hp]')).toHaveText('0', { timeout: 500 });
      await expect(placar(page).locator('[data-retrato="oponente"][data-derrotado]')).toHaveCount(0);
      guard.expectClean();
    });
  });
}
