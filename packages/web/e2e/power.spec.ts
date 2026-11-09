// E2E do bloco C dos pontos do playtest (pontos 10, 11 e 13): os bônus em escala, a aura da iniciativa e a espada e o escudo de quem lidera, na mesa de
// verdade, no PC baixo, no PC e no celular em pé. É o que o jsdom não prova: o módulo carregado, as camadas no lugar e nada rolando de lado.
//
// As partidas vêm das fixtures (os valores esperados contados com o motor sobre os `steps`):
// - `especiais.json` (você é o `p1`): no passo 78 (rodada 17) você lidera o Ataque e a Defesa, os seus 3 Q estão a um do limite (nível 2) e o Bot
//   tem a cura passiva (2 K); no 99 (rodada 21) os seus 4 J estão armados (nível 3) e a sua sequência é 3; no 111 (rodada 24), 5; no 161 (rodada 34),
//   10, com a cura passiva nos seus K; no 174 (rodada 37), os seus 3 K (a brasa);
// - `exodia-devastacao.json`: o Bot segura a iniciativa por 10 rodadas até o passo 236 (rodada 47) e a perde no 237 (rodada 48).
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { failOnConsoleErrors, replayControl, replayCounter } from './helpers.ts';

const SPECIALS = readFileSync(new URL('./fixtures/especiais.json', import.meta.url), 'utf8');
const SLICE_3 = readFileSync(new URL('./fixtures/exodia-devastacao.json', import.meta.url), 'utf8');

/** Abre o replay parado no passo `step` (a rodada `round` é o atalho até perto dele). */
async function openAt(page: Page, game: { id: string; fixture: string }, round: number, step: number): Promise<void> {
  await page.addInitScript((games) => window.localStorage.setItem('coringa:partidas', games), game.fixture);
  await page.goto(`/partidas/${game.id}`);
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

const ESPECIAIS = { id: 'especiais', fixture: SPECIALS };
const EXODIA = { id: 'exodia-devastacao', fixture: SLICE_3 };

/** Nada rola de lado. */
async function expectNoSideScroll(page: Page): Promise<void> {
  const { scroll, client } = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, client: document.documentElement.clientWidth }));
  expect(scroll, 'a página não rola de lado').toBeLessThanOrEqual(client);
}

/** O elemento cabe inteiro dentro do outro (com 1 px de folga). */
async function expectInside(page: Page, inner: string, outer: string): Promise<void> {
  const a = (await page.locator(inner).first().boundingBox())!;
  const b = (await page.locator(outer).first().boundingBox())!;
  expect(a.x, `${inner} dentro de ${outer}`).toBeGreaterThanOrEqual(b.x - 1);
  expect(a.y, `${inner} dentro de ${outer}`).toBeGreaterThanOrEqual(b.y - 1);
  expect(a.x + a.width, `${inner} dentro de ${outer}`).toBeLessThanOrEqual(b.x + b.width + 1);
  expect(a.y + a.height, `${inner} dentro de ${outer}`).toBeLessThanOrEqual(b.y + b.height + 1);
}

const zone = (player: 'p1' | 'p2', power: 'J' | 'Q' | 'K') => `[data-campo="${player}"] [data-poder="${power}"]`;

for (const viewport of [
  { width: 1366, height: 657 },
  { width: 1366, height: 768 },
  { width: 360, height: 640 },
]) {
  test.describe(`${viewport.width} × ${viewport.height}`, () => {
    test.use({ viewport });

    test('a liderança e os níveis das zonas (passo 78): o ouro no seu Ataque e na sua Defesa, os seus Q e a cura do Bot', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, ESPECIAIS, 17, 78);
      await expect(page.locator('[data-fileira="p1:ATK"] [data-lider]')).toHaveCount(1);
      await expect(page.locator('[data-fileira="p1:DEF"] [data-lider]')).toHaveCount(1);
      await expect(page.locator('[data-fileira^="p2:"] [data-lider]')).toHaveCount(0);
      await expect(page.locator(zone('p1', 'Q'))).toHaveAttribute('data-nivel', '2');
      await expect(page.locator(zone('p2', 'K'))).toHaveAttribute('data-nivel', '1');
      await expect(page.locator('[data-aura-iniciativa]')).toHaveCount(0);
      await expect(page.locator('[data-selo-sequencia]')).toHaveCount(0);
      await page.locator('[data-fileira="p1:ATK"]').scrollIntoViewIfNeeded();
      await expectInside(page, '[data-fileira="p1:ATK"] [data-lider]', '[data-fileira="p1:ATK"]');
      await expectNoSideScroll(page);
      guard.expectClean();
    });

    test('os 4 J armados e a brasa da iniciativa (passo 99): a aura na zona, a sua aura de 3 rodadas e o selo', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, ESPECIAIS, 21, 99);
      await expect(page.locator(zone('p1', 'J'))).toHaveAttribute('data-nivel', '3');
      await expect(page.locator(`${zone('p1', 'J')} [data-poder-camada="J3"]`)).toHaveCount(1);
      await expect(page.locator('[data-lado="voce"] [data-aura-iniciativa]')).toHaveAttribute('data-aura-iniciativa', '1');
      await expect(page.locator('[data-lado="voce"] [data-selo-sequencia]')).toHaveText('×3');
      await expectInside(page, '[data-lado="voce"] [data-selo-sequencia]', '[data-placar]');
      await expectNoSideScroll(page);
      guard.expectClean();
    });

    test('a chama (passo 111) e a super aura (passo 161), com o selo no placar', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, ESPECIAIS, 24, 111);
      await expect(page.locator('[data-lado="voce"] [data-aura-iniciativa]')).toHaveAttribute('data-aura-iniciativa', '2');
      await expect(page.locator('[data-lado="voce"] [data-selo-sequencia]')).toHaveText('×5');
      await openAt(page, ESPECIAIS, 34, 161);
      await expect(page.locator('[data-lado="voce"] [data-aura-iniciativa]')).toHaveAttribute('data-aura-iniciativa', '3');
      await expect(page.locator('[data-lado="voce"] [data-selo-sequencia]')).toHaveText('×10');
      await expectInside(page, '[data-lado="voce"] [data-selo-sequencia]', '[data-placar]');
      await expect(page.locator(zone('p1', 'K'))).toHaveAttribute('data-nivel', '1');
      await expectNoSideScroll(page);
      guard.expectClean();
    });

    test('os 3 K (passo 174): a brasa nas cartas, sem texto', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, ESPECIAIS, 37, 174);
      await expect(page.locator(zone('p1', 'K'))).toHaveAttribute('data-nivel', '2');
      await expect(page.locator(zone('p1', 'K'))).not.toContainText(/Exódia|ameaça/i);
      await expectNoSideScroll(page);
      guard.expectClean();
    });

    test('a iniciativa do Bot depois de 10 rodadas troca de mão (passo 236 → 237): a aura dele apaga com o sopro', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, EXODIA, 47, 236);
      await expect(page.locator('[data-lado="oponente"] [data-aura-iniciativa]')).toHaveAttribute('data-aura-iniciativa', '3');
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-lado="oponente"] [data-aura-iniciativa]')).toHaveCount(0, { timeout: 5_000 });
      await expect(page.locator('[data-lado="oponente"] [data-sopro]')).toHaveCount(1);
      await expect(page.locator('[data-selo-sequencia]')).toHaveCount(0);
      await expectNoSideScroll(page);
      guard.expectClean();
    });
  });
}
