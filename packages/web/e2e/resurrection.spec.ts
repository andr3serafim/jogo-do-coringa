// A janela da Ressurreição no treino (ponto 16, plano do bloco E, Tarefa 7): a quadra que se forma na revelação do Equipar abre o
// painel no lugar da barra, antes do ataque. A semente (`seeds.ts`) abre a janela do jogador na rodada 4, jogando como o `playOnce`.
// A troca da última carta e a fileira protegida não aparecem aqui (o `playOnce` nunca enche as duas fileiras): ficam nos testes da
// mesa (`test/ui/resurrection-window.test.tsx`).
import { expect, test, type Locator, type Page, type TestInfo } from '@playwright/test';
import { axe, band, expectNoHorizontalScroll, expectWhollyInView, failOnConsoleErrors, playUntil, roundNumber } from './helpers.ts';
import { RESURRECTION_E2E_SEED } from './seeds.ts';

const TRAINING = `/treino?semente=${RESURRECTION_E2E_SEED}&nivel=medio`;
const windowPanel = (page: Page): Locator => page.getByRole('region', { name: 'Janela da Ressurreição' });
const keepButton = (page: Page): Locator => windowPanel(page).getByRole('button', { name: 'Guardar', exact: true });

/** A foto da tela, anexada ao relatório e gravada na pasta do teste (o jsdom não tem layout: o olho confere). */
async function photo(page: Page, testInfo: TestInfo, name: string): Promise<void> {
  const body = await page.screenshot({ path: testInfo.outputPath(`${name}.png`) });
  await testInfo.attach(name, { body, contentType: 'image/png' });
}

/** Joga como o `playOnce` até a janela da Ressurreição ser sua. */
async function openWindow(page: Page): Promise<void> {
  await page.goto(TRAINING);
  await playUntil(page, (p) => keepButton(p).isVisible());
  expect(await roundNumber(page)).toBe(4);
  await expect(band(page)).toContainText('Equipar · sua Ressurreição');
}

for (const [name, viewport] of [
  ['celular', { width: 360, height: 640 }],
  ['PC baixo', { width: 1366, height: 657 }],
] as const) {
  test(`a janela da Ressurreição no ${name} (${viewport.width} × ${viewport.height}): o painel inteiro à vista, sem rolar de lado`, async ({ page }, testInfo) => {
    const guard = failOnConsoleErrors(page);
    await page.setViewportSize(viewport);
    await openWindow(page);
    await expectNoHorizontalScroll(page);
    await expectWhollyInView(page, { painel: windowPanel(page) });
    await photo(page, testInfo, `janela-${viewport.width}`);
    guard.expectClean();
  });
}

test('a janela da Ressurreição: o painel antes do ataque, com o foco; ressuscitar toca a cena e a rodada segue', async ({ page }, testInfo) => {
  const guard = failOnConsoleErrors(page);
  await openWindow(page);
  await expect(windowPanel(page)).toBeFocused();
  await axe(page);

  await windowPanel(page).getByRole('button', { name: /^Ressuscitar/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Ressuscitar' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('list', { name: 'Cartas que podem voltar' }).getByRole('button').first().click();
  const rows = dialog.getByRole('list', { name: 'Fileiras' });
  await expect(rows.getByRole('button').first()).toContainText(/no fim da fileira · \d+ de 8 · total \d+ → \d+/);
  await photo(page, testInfo, 'janela-fileira');
  await rows.getByRole('button').first().click();
  await expect(dialog).toBeHidden();
  // A cena da Ressurreição toca (4,6 s), e a janela fecha: a rodada de Ataque começa.
  await expect(windowPanel(page)).toBeHidden({ timeout: 20_000 });
  await expect.poll(() => roundNumber(page), { timeout: 20_000 }).toBe(5);
  guard.expectClean();
});

test('a janela da Ressurreição: Guardar passa, e a Ressurreição continua disponível para o seu turno', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await openWindow(page);
  await keepButton(page).click();
  await expect(windowPanel(page)).toBeHidden();
  await expect.poll(() => roundNumber(page), { timeout: 20_000 }).toBe(5);
  await expect(page.getByText('1 Ressurreição disponível').first()).toBeVisible();
  guard.expectClean();
});
