// E2E do bloco A dos pontos do playtest (pontos 1, 2, 6 e 9): o momento da especial do Bot no replay (a carta grande, a placa, o voo até a
// carta de verdade, mais curto na segunda do turno), a mão que apaga as cartas sem jogada no treino, e nada rolando de lado com a placa no ar,
// no PC baixo e no celular em pé. É o que o jsdom não prova: a camada medida, o voo e o layout de verdade.
//
// A partida vem de `fixtures/especiais.json` (semente `layout-1188`, treino Médio, regras 4): do passo 10 para o 11 (rodada 3) o Bot joga um
// J e, do 11 para o 12, outro J no mesmo turno; do 51 para o 52 (rodada 13), um K na Guarda; do 109 para o 110 (rodada 23), uma Armadilha.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { equipPanel, expectNoHorizontalScroll, failOnConsoleErrors, replayControl, replayCounter } from './helpers.ts';

const SPECIALS = readFileSync(new URL('./fixtures/especiais.json', import.meta.url), 'utf8');

/** Abre o replay parado no passo `step` (a rodada `round` é o atalho até perto dele). */
async function openAt(page: Page, round: number, step: number): Promise<void> {
  await page.addInitScript((games) => window.localStorage.setItem('coringa:partidas', games), SPECIALS);
  await page.goto('/partidas/especiais');
  await page.getByRole('combobox', { name: 'Rodada' }).selectOption(String(round));
  const next = replayControl(page, 'Próximo passo');
  for (let i = 0; i < 40; i++) {
    const text = (await replayCounter(page).textContent()) ?? '';
    if (Number(/^Passo (\d+)/.exec(text)?.[1]) >= step) break;
    await next.click();
  }
  await expect(replayCounter(page)).toHaveText(new RegExp(`^Passo ${step} de \\d+$`));
  await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1);
}

/**
 * A própria página anota, a cada quadro, quanto dura cada vez que a camada do momento fica montada (as consultas de fora cairiam entre
 * quadros, e a mesa parada de antes do passo chegar passaria por parada de depois).
 */
async function watchMoments(page: Page): Promise<() => Promise<number[]>> {
  await page.evaluate(() => {
    const flags = window as unknown as { momentos: number[]; desde: number | null };
    flags.momentos = [];
    flags.desde = null;
    const look = (now: number) => {
      const shown = document.querySelector('[data-momento]') !== null;
      if (shown && flags.desde === null) flags.desde = now;
      if (!shown && flags.desde !== null) {
        flags.momentos.push(now - flags.desde);
        flags.desde = null;
      }
      requestAnimationFrame(look);
    };
    requestAnimationFrame(look);
  });
  return () => page.evaluate(() => (window as unknown as { momentos: number[] }).momentos);
}

for (const viewport of [
  { width: 1366, height: 657 },
  { width: 360, height: 640 },
]) {
  test.describe(`${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport });

    test('a Guarda do Bot: a carta grande e a placa no meio da mesa, e o K aparece na Guarda dele no fim', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 13, 51);
      const kings = page.locator('[data-campo="p2"] [data-card-id]').filter({ hasText: 'K' });
      const before = await kings.count();
      await replayControl(page, 'Próximo passo').click();
      const moment = page.locator('[data-momento="GuardPlayed"]');
      await expect(moment).toBeVisible();
      await expect(moment.locator('[data-card-id]')).toHaveCount(0);
      const plate = page.locator('[data-placa-momento][data-visivel]');
      await expect(plate).toContainText(/pôs \d K na Guarda/);
      // A placa inteira à vista, e nada rola de lado com ela no ar.
      const box = (await plate.boundingBox())!;
      expect(box.x).toBeGreaterThanOrEqual(0);
      expect(box.x + box.width).toBeLessThanOrEqual(viewport.width);
      await expectNoHorizontalScroll(page);
      await expect(moment).toHaveCount(0, { timeout: 4_000 });
      await expect(kings).toHaveCount(before + 1);
      guard.expectClean();
    });

    test('o segundo J do Bot no mesmo turno tem o momento mais curto', async ({ page }) => {
      await openAt(page, 3, 10);
      const moments = await watchMoments(page);
      await replayControl(page, 'Próximo passo').click();
      await expect.poll(async () => (await moments()).length, { timeout: 6_000 }).toBe(1);
      await replayControl(page, 'Próximo passo').click();
      await expect.poll(async () => (await moments()).length, { timeout: 6_000 }).toBe(2);
      const [first, second] = await moments();
      expect(first).toBeGreaterThan(1_400);
      expect(second).toBeLessThan(1_400);
      expect(second).toBeGreaterThan(900);
    });

    test('um toque na mesa pula o momento: a camada some na hora', async ({ page }) => {
      await openAt(page, 23, 109);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-momento]')).toBeVisible();
      await page.locator('[data-palco]').click({ position: { x: 20, y: viewport.height / 2 } });
      await expect(page.locator('[data-momento]')).toHaveCount(0);
    });
  });
}

test('no treino, as cartas da mão sem jogada apagam no Equipar, e as que jogam ficam em pé na sua vez', async ({ page }) => {
  await page.goto('/treino?semente=e2e2631&nivel=medio');
  await expect(equipPanel(page)).toBeVisible();
  const hand = page.getByRole('list', { name: 'Sua mão' }).locator(':scope > li');
  const count = await hand.count();
  if (count > 0) await expect(page.locator('[aria-label="Sua mão"] > li[data-sem-jogada]')).toHaveCount(count);
});
