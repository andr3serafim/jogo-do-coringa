// E2E da fluidez das jogadas comuns (sub-projeto 6 §8, fatia 5): a poeira do pouso, a cópia que racha e estoura em cacos e o voo da compra,
// no PC e no celular em pé de 360 × 640, sem rolar de lado e sem erro no console. É o que o jsdom não prova: a camada dos efeitos medida de
// verdade, o clone lido antes de o React mexer no DOM e o monte medido na tela.
//
// A partida vem de `fixtures/especiais.json` (a sua partida contra o Bot; o replay abre em `/partidas/<id>`, e o passo n mostra as batidas
// da jogada n − 1):
// - rodada 3, do passo 6 para o 7: você põe um K na Guarda;
// - rodada 5, do passo 18 para o 19: a sua Armadilha (A♣) destrói o J♥ dos Bônus de Ataque do Bot;
// - rodada 1, do passo 1 para o 2: a compra do Equipar da rodada 2.
//
// Os cacos e a poeira duram menos de meio segundo: quem os procura é a própria página, a cada quadro (como em `scenes.spec.ts`).
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { failOnConsoleErrors, replayControl, replayCounter } from './helpers.ts';

const SPECIALS = readFileSync(new URL('./fixtures/especiais.json', import.meta.url), 'utf8');
const GAME_ID = (JSON.parse(SPECIALS) as Array<{ id: string }>)[0]!.id;

/** Abre o replay parado no passo `step` (a rodada `round` é o atalho até perto dele). */
async function openAt(page: Page, round: number, step: number): Promise<void> {
  await page.addInitScript((games) => window.localStorage.setItem('coringa:partidas', games), SPECIALS);
  await page.goto(`/partidas/${GAME_ID}`);
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

/** A partir daqui, a página anota a cada quadro o pico de elementos que casam com `selector`. */
async function watchPeak(page: Page, selector: string): Promise<() => Promise<number>> {
  await page.evaluate((sel) => {
    const flags = window as unknown as { picos: Record<string, number> };
    flags.picos ??= {};
    flags.picos[sel] = 0;
    const look = () => {
      flags.picos[sel] = Math.max(flags.picos[sel]!, document.querySelectorAll(sel).length);
      requestAnimationFrame(look);
    };
    look();
  }, selector);
  return () => page.evaluate((sel) => (window as unknown as { picos: Record<string, number> }).picos[sel]!, selector);
}

/** A partir daqui, a página anota se alguma carta voou do monte (a animação do leque começa no monte, com a escala de 0,6). */
async function watchDealFlight(page: Page): Promise<() => Promise<boolean>> {
  await page.evaluate(() => {
    const flags = window as unknown as { voou: boolean };
    flags.voou = false;
    const look = () => {
      for (const animation of document.getAnimations()) {
        const first = (animation.effect as KeyframeEffect | null)?.getKeyframes()[0];
        if (first?.scale === '0.6' && typeof first.translate === 'string') flags.voou = true;
      }
      requestAnimationFrame(look);
    };
    look();
  });
  return () => page.evaluate(() => (window as unknown as { voou: boolean }).voou);
}

/** Nada rola de lado: a página não é mais larga que a janela. */
async function expectNoSideScroll(page: Page): Promise<void> {
  const { scroll, client } = await page.evaluate(() => ({
    scroll: document.documentElement.scrollWidth,
    client: document.documentElement.clientWidth,
  }));
  expect(scroll, 'a página não rola de lado').toBeLessThanOrEqual(client);
}

for (const viewport of [
  { width: 1366, height: 768 },
  { width: 360, height: 640 },
]) {
  test.describe(`${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport });

    test('a sua jogada: o K voa da mão e assenta com poeira, sem rolar de lado', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 3, 6);
      const dust = await watchPeak(page, '[data-camada-fx] [data-poeira]');
      await replayControl(page, 'Próximo passo').click();
      await expect.poll(dust, { timeout: 3_000 }).toBeGreaterThan(0);
      await expectNoSideScroll(page);
      guard.expectClean();
    });

    test('a sua Armadilha: a cópia do J do Bot racha e estoura em cacos, e nenhuma cópia leva o id da carta', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 5, 18);
      const copies = await watchPeak(page, '[data-camada-fx] [data-saindo]');
      const shards = await watchPeak(page, '[data-camada-fx] [data-caco]');
      const leaked = await watchPeak(page, '[data-camada-fx] [data-card-id]');
      await replayControl(page, 'Próximo passo').click();
      await expect.poll(shards, { timeout: 3_000 }).toBeGreaterThan(0);
      expect(await copies()).toBeGreaterThan(0);
      expect(await leaked()).toBe(0);
      await expectNoSideScroll(page);
      guard.expectClean();
    });

    test('a compra do Equipar: as cartas voam do monte, sem rolar de lado', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 1, 1);
      const flew = await watchDealFlight(page);
      await replayControl(page, 'Próximo passo').click();
      await expect.poll(flew, { timeout: 3_000 }).toBe(true);
      await expectNoSideScroll(page);
      guard.expectClean();
    });
  });
}
