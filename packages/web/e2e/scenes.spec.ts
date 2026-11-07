// E2E das cenas raras refeitas no sub-projeto 6 (fatia 2: os Absolutos; fatia 3: a Devastação e a Exódia; fatia 4: o Reflect; fatia 4b: a Ressurreição): a cena desenhada aparece,
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
//
// O Reflect vem de `fixtures/reflect.json`, greedy × turtle (semente `fatia4-220`, config padrão das regras de 2026-10-31): do passo 175
// para o 176 (rodada 37) o Bot joga o Reflect contra o seu ataque; do 176 para o 177, o golpe volta (49 de dano em você); do 358 para o 359
// (rodada 73), a sua Devastação refletida abre o chão no seu campo.
//
// A Ressurreição vem da mesma `exodia-devastacao.json`: do passo 27 para o 28 (rodada 7) a sua, com a quadra de 9 na fileira de destino; do 182 para o 183
// (rodada 37) a do Bot, sem quadra na mesa.
//
// O golpe final (bloco B dos pontos do playtest, ponto 15) vem das duas que acabam pela vida: na `especiais.json`, do passo 178 para o 179
// (rodada 37), o seu golpe comum derruba o Bot (195 de dano; ele fica com -118, e o placar mostra 0); na `absolutos.json`, do 99 para o 100
// (rodada 21), o golpe comum do Bot derruba você (184).
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { failOnConsoleErrors, placar, replayControl, replayCounter } from './helpers.ts';

const ABSOLUTES = readFileSync(new URL('./fixtures/absolutos.json', import.meta.url), 'utf8');
const SLICE_3 = readFileSync(new URL('./fixtures/exodia-devastacao.json', import.meta.url), 'utf8');
const REFLECT = readFileSync(new URL('./fixtures/reflect.json', import.meta.url), 'utf8');
const SPECIALS = readFileSync(new URL('./fixtures/especiais.json', import.meta.url), 'utf8');

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
const REFLECT_GAME = { id: 'reflect', fixture: REFLECT };
const SPECIALS_GAME = { id: 'especiais', fixture: SPECIALS };

/** O id da carta que a jogada do passo `step` da `exodia-devastacao.json` ressuscita. */
const revivedAt = (step: number): string => (JSON.parse(SLICE_3) as Array<{ replay: { steps: Array<{ action: { cardId: string } }> } }>)[0]!.replay.steps[step]!.action.cardId;

/** A partir daqui, a própria página anota, a cada quadro, se a tela inverteu: as consultas de fora poderiam cair entre duas trocas. */
async function watchInversion(page: Page): Promise<() => Promise<boolean>> {
  await page.evaluate(() => {
    const flags = window as unknown as { inverteu: boolean };
    flags.inverteu = false;
    const look = () => {
      if (document.querySelector('[data-palco][data-invertido]')) flags.inverteu = true;
      requestAnimationFrame(look);
    };
    look();
  });
  return () => page.evaluate(() => (window as unknown as { inverteu: boolean }).inverteu);
}

/** O elemento inteiro dentro da janela. */
async function expectInView(page: Page, selector: string): Promise<void> {
  const box = (await page.locator(selector).first().boundingBox())!;
  const window = page.viewportSize()!;
  expect(box.x + box.width / 2, `${selector}: no meio, dentro da largura`).toBeGreaterThanOrEqual(0);
  expect(box.x + box.width / 2, `${selector}: no meio, dentro da largura`).toBeLessThanOrEqual(window.width);
  expect(box.y + box.height / 2, `${selector}: no meio, dentro da altura`).toBeGreaterThanOrEqual(0);
  expect(box.y + box.height / 2, `${selector}: no meio, dentro da altura`).toBeLessThanOrEqual(window.height);
}

/** O espelho inteiro dentro da janela. */
async function expectMirrorInView(page: Page): Promise<void> {
  const mirror = (await page.locator('[data-espelho]').boundingBox())!;
  const window = page.viewportSize()!;
  expect(mirror.x, 'o espelho não sai pela esquerda').toBeGreaterThanOrEqual(0);
  expect(mirror.y, 'o espelho não sai por cima').toBeGreaterThanOrEqual(0);
  expect(mirror.x + mirror.width, 'o espelho não sai pela direita').toBeLessThanOrEqual(window.width);
  expect(mirror.y + mirror.height, 'o espelho não sai por baixo').toBeLessThanOrEqual(window.height);
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

    test('o Reflect do Bot se forma: o espelho à vista, sem tarjas nem rolar de lado, e fica pequeno na zona dele', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 37, 175, REFLECT_GAME);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="REFLECT_PLAYED"]')).toHaveCount(1);
      await expect(page.locator('[data-espelho]')).toHaveCount(1);
      await expect(page.locator('[data-carta-cena]')).toHaveCount(3);
      await expect(page.locator('[data-tarja]')).toHaveCount(0);
      await expect(page.locator('[data-cortina][data-ativa]')).toHaveCount(1);
      await expect(page.locator('[data-carimbo]')).toHaveCount(0);
      await expectMirrorInView(page);
      await expectNoSideScroll(page);
      await tapTable(page);
      await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1, { timeout: 500 });
      await expect(page.locator('[data-espelho]')).toHaveCount(0);
      await expect(page.locator('[data-espelho-zona="p2"]')).toHaveCount(1);
      guard.expectClean();
    });

    test('o cometa volta do espelho: a volta dourada, o número e o nome, e o toque pula para a vida final, sem o espelho', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 37, 176, REFLECT_GAME);
      await expect(page.locator('[data-espelho-zona="p2"]')).toHaveCount(1);
      const before = Number(await placar(page).locator('[data-lado="voce"] [data-hp]').textContent());
      // A volta dura menos de meio segundo, e as consultas de fora podem cair antes e depois dela: a própria página a procura a cada quadro.
      const sawReturn = page.evaluate(
        () =>
          new Promise<boolean>((resolve) => {
            const look = () => (document.querySelector('[data-cometa][data-volta]') ? resolve(true) : requestAnimationFrame(look));
            look();
          }),
      );
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="REFLECT_TRIGGERED"]')).toHaveCount(1);
      await expect(page.locator('[data-carga]')).toHaveCount(1);
      await expectMirrorInView(page);
      expect(await sawReturn, 'o cometa volta dourado').toBe(true);
      await expect(page.locator('[data-dano]')).toHaveText('−49', { timeout: 2_000 });
      await expect(page.locator('[data-carimbo="REFLECT_TRIGGERED"]')).toBeVisible();
      await expect(page.locator('[data-cacos]')).toHaveCount(1);
      expect(await page.locator('[data-particula]').count(), 'as partículas ficam no limite').toBeLessThanOrEqual(60);
      await expectNoSideScroll(page);
      await tapTable(page);
      await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1, { timeout: 500 });
      await expect(placar(page).locator('[data-lado="voce"] [data-hp]')).toHaveText(String(before - 49), { timeout: 500 });
      await expect(page.locator('[data-espelho-zona]')).toHaveCount(0);
      await expect(page.locator('[data-cometa]')).toHaveCount(0);
      guard.expectClean();
    });

    test('a Devastação refletida: o chão se abre no campo de quem lançou, sem cometa', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 73, 358, REFLECT_GAME);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="DEVASTATION"]')).toHaveCount(1);
      await expect(page.locator('[data-cometa]')).toHaveCount(0);
      await expectNoSideScroll(page);
      await tapTable(page);
      await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1, { timeout: 500 });
      await expect(page.locator('[data-campo="p1"][data-apagado]')).toHaveCount(1);
      await expect(page.locator('[data-espelho-zona]')).toHaveCount(0);
      guard.expectClean();
    });

    test('a sua Ressurreição: a quadra acende, o céu abre, nunca inverte, e o toque pula para a carta de verdade na fileira', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 7, 27, SLICE_3_GAME);
      const inverted = await watchInversion(page);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="RESURRECTED"]')).toHaveCount(1);
      await expect(page.locator('[data-quadra-cena]')).toHaveCount(4);
      // A cópia tem o tamanho da carta, e não encolhe até virar um ponto (visto no navegador, 2026-11-02).
      const copy = (await page.locator('[data-quadra-cena] [role="img"]').first().boundingBox())!;
      expect(copy.width, 'a cópia da quadra tem largura de carta').toBeGreaterThan(20);
      await expect(page.locator('[data-tarja]')).toHaveCount(0);
      await expect(page.locator('[data-cortina][data-ativa]')).toHaveCount(1);
      // A carta de verdade espera a cópia pousar.
      await expect(page.locator(`[data-card-id="${revivedAt(27)}"]`)).toBeHidden();
      await expect(page.locator('[data-portal]')).toHaveCount(1, { timeout: 2_000 });
      await expectInView(page, '[data-portal]');
      await expect(page.locator('[data-carta-cena]')).toHaveCount(1, { timeout: 2_000 });
      await expectInView(page, '[data-carta-cena]');
      await expect(page.locator('[data-carimbo="RESURRECTED"]')).toBeVisible({ timeout: 2_000 });
      expect(await page.locator('[data-particula]').count(), 'as partículas ficam no limite').toBeLessThanOrEqual(60);
      await expectNoSideScroll(page);
      await tapTable(page);
      await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1, { timeout: 500 });
      await expect(page.locator(`[data-card-id="${revivedAt(27)}"]`)).toBeVisible();
      await expect(page.locator('[data-portal]')).toHaveCount(0);
      expect(await inverted(), 'a Ressurreição não inverte a tela').toBe(false);
      guard.expectClean();
    });

    test('a Ressurreição do Bot sem quadra na mesa: nenhuma carta acende, os fios saem da fileira, e ela pousa sozinha', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 37, 182, SLICE_3_GAME);
      const inverted = await watchInversion(page);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="RESURRECTED"]')).toHaveCount(1);
      await expect(page.locator('[data-fio]')).toHaveCount(4, { timeout: 2_000 });
      await expect(page.locator('[data-quadra-cena]')).toHaveCount(0);
      await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1, { timeout: 7_000 });
      await expect(page.locator(`[data-card-id="${revivedAt(182)}"]`)).toBeVisible();
      await expectNoSideScroll(page);
      expect(await inverted(), 'a Ressurreição não inverte a tela').toBe(false);
      guard.expectClean();
    });

    test('o seu golpe final: as tarjas sem cortina, a fileira acende, o corte vai ao retrato do Bot, a tela inverte, GOLPE FINAL! e o retrato dele racha', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 37, 178, SPECIALS_GAME);
      const inverted = await watchInversion(page);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="FINAL_BLOW"]')).toHaveCount(1);
      await expect(page.locator('[data-golpe-final] [data-tarja]')).toHaveCount(2);
      await expect(page.locator('[data-cortina][data-ativa]')).toHaveCount(0);
      await expect(page.locator('[data-acesa]').first()).toBeAttached();
      await expect(page.locator('[data-corte]')).toHaveAttribute('data-alvo', 'oponente');
      await expect(page.locator('[data-carimbo="FINAL_BLOW"]')).toHaveText('GOLPE FINAL!');
      await expectInView(page, '[data-carimbo="FINAL_BLOW"] span');
      await expectNoSideScroll(page);
      await expect(placar(page).locator('[data-retrato="oponente"][data-derrotado]')).toHaveCount(1);
      await expect(placar(page).locator('[data-retrato="voce"][data-derrotado]')).toHaveCount(0);
      await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1, { timeout: 5_000 });
      await expect(placar(page).locator('[data-lado="oponente"] [data-hp]')).toHaveText('0');
      expect(await inverted(), 'a tela inverte no impacto').toBe(true);
      guard.expectClean();
    });

    test('o golpe final do Bot: DERROTA, o corte vem até o seu retrato, e o toque pula para o seu retrato rachado e a vida 0', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await openAt(page, 21, 99);
      await replayControl(page, 'Próximo passo').click();
      await expect(page.locator('[data-cena="FINAL_BLOW"]')).toHaveCount(1);
      await expect(page.locator('[data-corte]')).toHaveAttribute('data-alvo', 'voce');
      await expect(page.locator('[data-carimbo="FINAL_BLOW"]')).toHaveText('DERROTA');
      await expectNoSideScroll(page);
      await tapTable(page);
      await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1, { timeout: 500 });
      await expect(placar(page).locator('[data-retrato="voce"][data-derrotado]')).toHaveCount(1, { timeout: 500 });
      await expect(placar(page).locator('[data-lado="voce"] [data-hp]')).toHaveText('0', { timeout: 500 });
      await expect(page.locator('[data-golpe-final]')).toHaveCount(0);
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
