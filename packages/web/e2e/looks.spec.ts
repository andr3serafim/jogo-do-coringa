// E2E das cartas com arte (decks e raças, fatias 1 e 2): o painel "Aparência" do Início por teclado e guardado, a mesa do treino com as
// imagens carregadas de verdade (sob a CSP do `wrangler dev`), a troca no menu, a trava do Cordel e o tutorial sempre em cordel; na fatia 2,
// o bot com a aparência dele (os versos, o retrato e o campo) e o replay com as aparências gravadas na partida; na fatia 3, a sala online
// de duas pessoas, cada tela com cada lado na aparência do assento.
import { readFileSync } from 'node:fs';
import { expect, test, type Browser, type BrowserContext, type Locator, type Page } from '@playwright/test';
import { axe, equipByUi, expectNoHorizontalScroll, failOnConsoleErrors, openMenu, roundHeading, table } from './helpers.ts';
import { RESURRECTION_E2E_SEED } from './seeds.ts';

const TRAINING = `/treino?semente=${RESURRECTION_E2E_SEED}&nivel=medio`;

/** Os pacotes pelos nomes dos arquivos: no `dist` a imagem perde a pasta (`/assets/02-borboleta-<hash>.webp`). */
const BESTIARIO = /(morcego|aranha|lobo|urso|grifo|fenix|hidra|kraken|dragao)-[^/]*\.webp$/;
const CELESTIAL = /(borboleta|beija-flor|cervo-branco|unicornio|pegaso|leao-alado|aguia-gigante|baleia-celeste|arcanjo)-[^/]*\.webp$/;
const EGIPCIO = /(mascara|khopesh|escudo|adaga|anubis)-[^/]*\.webp$/;

/** As imagens das cartas do jogo (fora da amostra do seletor), com o estado do carregamento de cada uma. */
function cardImages(page: Page) {
  return page.evaluate(() =>
    [...document.querySelectorAll<HTMLImageElement>('[data-card-id] img')]
      .filter((img) => img.closest('[data-amostra]') === null)
      .map((img) => ({ src: img.getAttribute('src') ?? '', loaded: img.complete && img.naturalWidth > 0 })),
  );
}

/** Espera as imagens das cartas aparecerem e carregarem todas, e devolve as URLs. */
async function loadedCardImages(page: Page): Promise<string[]> {
  await expect
    .poll(async () => {
      const images = await cardImages(page);
      return images.length > 0 && images.every((image) => image.loaded);
    })
    .toBe(true);
  return (await cardImages(page)).map((image) => image.src);
}

const FANTASY_PREFS = JSON.stringify({ autoPass: true, reduceMotion: false, sound: true, look: { deck: 'bestiario', race: 'egipcio' } });

test('aparência: escolhida no Início por teclado, guardada, e a mesa do treino com as imagens carregadas', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.goto('/');
  const panel = page.getByRole('region', { name: 'Aparência' });
  await expect(panel.getByRole('radio', { name: 'Egípcio' })).toBeDisabled();

  // Por teclado: a seta anda no grupo e marca a opção (o rádio desligado fica de fora).
  await panel.getByRole('radio', { name: 'Cordel' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(panel.getByRole('radio', { name: 'Bestiário' })).toBeChecked();
  await panel.getByRole('radio', { name: 'Bufão' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(panel.getByRole('radio', { name: 'Egípcio' })).toBeChecked();
  // A amostra do painel já mostra a arte.
  await expect(panel.locator('[data-amostra] img')).toHaveCount(3);

  await page.reload();
  await expect(page.getByRole('region', { name: 'Aparência' }).getByRole('radio', { name: 'Bestiário' })).toBeChecked();
  await expect(page.getByRole('region', { name: 'Aparência' }).getByRole('radio', { name: 'Egípcio' })).toBeChecked();
  await axe(page);

  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  const images = await loadedCardImages(page);
  for (const src of images) expect(src).toMatch(new RegExp(`${BESTIARIO.source}|${EGIPCIO.source}`));
  expect(images.some((src) => BESTIARIO.test(src))).toBe(true);
  await axe(page);

  for (const size of [
    { width: 360, height: 640 },
    { width: 1366, height: 657 },
  ]) {
    await page.setViewportSize(size);
    await expectNoHorizontalScroll(page);
  }
  guard.expectClean();
});

test('aparência: a troca no menu do treino troca as imagens, e o Cordel trava o Coringa no Bufão', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.addInitScript((prefs) => {
    if (window.localStorage.getItem('coringa:prefs') === null) window.localStorage.setItem('coringa:prefs', prefs);
  }, FANTASY_PREFS);
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  await loadedCardImages(page);

  const menu = await openMenu(page);
  // O rádio é `sr-only` dentro do rótulo com cara de botão: quem recebe o toque é o rótulo (o `check()` no input esbarra nele).
  const option = (name: string) => menu.locator('label').filter({ hasText: new RegExp(`^${name}$`) });
  await option('Celestial').click();
  await expect(menu.getByRole('radio', { name: 'Celestial' })).toBeChecked();
  await expect.poll(async () => (await cardImages(page)).some((image) => CELESTIAL.test(image.src))).toBe(true);
  const celestial = await loadedCardImages(page);
  expect(celestial.filter((src) => BESTIARIO.test(src))).toEqual([]);

  await option('Cordel').click();
  await expect.poll(async () => (await cardImages(page)).length).toBe(0);
  // Com o Cordel, o Egípcio não se marca: o Coringa volta ao Bufão e fica travado nele.
  await expect(menu.getByRole('radio', { name: 'Bufão' })).toBeChecked();
  await expect(menu.getByRole('radio', { name: 'Egípcio' })).toBeDisabled();
  await expect(menu.getByText('O deck Cordel joga com o Coringa Bufão.')).toBeVisible();
  guard.expectClean();
});

test('aparência: o tutorial fica em cordel, mesmo com a preferência fantasy', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  // Todo pedido de imagem dos pacotes e da fonte que vem junto com qualquer pacote (o `font.css`, a Cinzel): o tutorial não pede nenhum.
  const looksRequests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/\.webp(\?|$)/.test(url) || /\/font-[^/]*\.css(\?|$)/.test(url) || /cinzel/i.test(url)) looksRequests.push(url);
  });
  await page.addInitScript((prefs) => window.localStorage.setItem('coringa:prefs', prefs), FANTASY_PREFS);
  await page.goto('/tutorial');
  await expect(table(page)).toBeVisible();
  await expect.poll(() => page.locator('[data-card-id]').count()).toBeGreaterThan(0);
  // Os pedidos saem quando a mesa monta: com a rede quieta, todo pedido que alguém fizesse já teria saído.
  await page.waitForLoadState('networkidle');
  expect(looksRequests).toEqual([]);
  expect(await cardImages(page)).toEqual([]);
  guard.expectClean();
});

/** As imagens das cartas dentro de uma região (um campo), com o estado do carregamento. */
function imagesIn(region: Locator) {
  return region.evaluate((root) =>
    [...root.querySelectorAll<HTMLImageElement>('[data-card-id] img')].map((img) => ({
      src: img.getAttribute('src') ?? '',
      loaded: img.complete && img.naturalWidth > 0,
    })),
  );
}

/** Espera as imagens da região aparecerem e carregarem todas, e devolve as URLs. */
async function loadedIn(region: Locator): Promise<string[]> {
  await expect
    .poll(async () => {
      const images = await imagesIn(region);
      return images.length > 0 && images.every((image) => image.loaded);
    })
    .toBe(true);
  return (await imagesIn(region)).map((image) => image.src);
}

/** Os dois retratos do placar com a imagem carregada. */
function portraitsLoaded(page: Page) {
  return page.evaluate(() => {
    const images = [...document.querySelectorAll<HTMLImageElement>('[data-retrato] img')];
    return images.length === 2 && images.every((img) => img.complete && img.naturalWidth > 0 && /anubis/.test(img.src));
  });
}

const RETRATO = /retrato-anubis-[^/]*\.webp$/;
const theirField = (page: Page) => page.getByRole('region', { name: /^Campo de / });
const myField = (page: Page) => page.getByRole('region', { name: 'Seu campo' });

test('aparência: no treino, o bot veste a dele (Celestial + Egípcio): os versos, o retrato e o campo dele', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.addInitScript((prefs) => {
    if (window.localStorage.getItem('coringa:prefs') === null) window.localStorage.setItem('coringa:prefs', prefs);
  }, FANTASY_PREFS);
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();

  // Os versos da mão do bot pelo deck dele, e os dois retratos com o Anúbis carregado.
  const backs = theirField(page).locator('[data-verso]');
  await expect(backs.first()).toBeVisible();
  for (const deck of await backs.evaluateAll((all) => all.map((back) => back.getAttribute('data-verso-deck')))) expect(deck).toBe('celestial');
  await expect.poll(() => portraitsLoaded(page)).toBe(true);
  for (const src of await page.locator('[data-retrato] img').evaluateAll((all) => all.map((img) => img.getAttribute('src') ?? ''))) {
    expect(src).toMatch(RETRATO);
  }

  // Depois da revelação, as fileiras de cada lado com a aparência do dono.
  await equipByUi(page);
  const theirs = await loadedIn(theirField(page));
  for (const src of theirs) expect(src).toMatch(new RegExp(`${CELESTIAL.source}|${EGIPCIO.source}`));
  expect(theirs.some((src) => CELESTIAL.test(src))).toBe(true);
  const mine = await loadedIn(myField(page));
  for (const src of mine) expect(src).toMatch(new RegExp(`${BESTIARIO.source}|${EGIPCIO.source}`));
  expect(mine.some((src) => BESTIARIO.test(src))).toBe(true);
  await axe(page);
  guard.expectClean();
});

/** A fixture `especiais` com as aparências gravadas na partida (você em Bestiário + Egípcio, o Bot em Celestial + Bufão). */
const ESPECIAIS = (() => {
  const games = JSON.parse(readFileSync(new URL('./fixtures/especiais.json', import.meta.url), 'utf8')) as Array<Record<string, unknown>>;
  games[0] = { ...games[0], looks: { me: { deck: 'bestiario', race: 'egipcio' }, opponent: { deck: 'celestial', race: 'bufao' } } };
  return { id: String(games[0].id), json: JSON.stringify(games) };
})();

for (const size of [
  { width: 1366, height: 657 },
  { width: 360, height: 640 },
]) {
  test(`aparência: o replay veste as aparências gravadas na partida, cada lado com a sua (${size.width} × ${size.height})`, async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    await page.setViewportSize(size);
    await page.addInitScript((games) => window.localStorage.setItem('coringa:partidas', games), ESPECIAIS.json);
    await page.goto(`/partidas/${ESPECIAIS.id}`);
    await expect(table(page)).toBeVisible();
    await page.getByRole('combobox', { name: 'Rodada' }).selectOption('9');
    const mine = await loadedIn(myField(page));
    for (const src of mine) expect(src).toMatch(new RegExp(`${BESTIARIO.source}|${EGIPCIO.source}`));
    expect(mine.some((src) => BESTIARIO.test(src))).toBe(true);
    // O Bufão do Bot: as especiais dele são de cordel, e o retrato dele é o Coringa.
    const theirs = await loadedIn(theirField(page));
    for (const src of theirs) expect(src).toMatch(CELESTIAL);
    await expect(page.locator('[data-retrato="oponente"] img')).toHaveCount(0);
    await expect(page.locator('[data-retrato="voce"] img')).toHaveCount(1);
    await expectNoHorizontalScroll(page);
    guard.expectClean();
  });
}

// --- A sala online (fatia 3): cada tela veste cada lado com a aparência do assento.

const contexts: BrowserContext[] = [];

// Os contextos criados à mão não são fechados pelo Playwright Test: sem isto as sessões (e os WebSockets) vazariam para os testes seguintes.
test.afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close()));
});

/** Um navegador isolado por pessoa (o `localStorage` e o token do assento são de cada uma). */
async function newPerson(browser: Browser): Promise<{ page: Page; guard: ReturnType<typeof failOnConsoleErrors> }> {
  const context = await browser.newContext();
  contexts.push(context);
  const page = await context.newPage();
  return { page, guard: failOnConsoleErrors(page) };
}

/**
 * Os versos da mão do outro (no campo dele), com o deck de cada um. Podem ser zero: com a semente do servidor de teste, no Equipar da
 * rodada 1 a mão do outro está toda montando (nenhum verso à mostra); os versos de cada deck por assento estão no `room-looks.test.tsx`.
 */
function backDecks(page: Page): Promise<Array<string | null>> {
  return theirField(page)
    .locator('[data-verso]')
    .evaluateAll((all) => all.map((back) => back.getAttribute('data-verso-deck')));
}

/** O retrato de um lado com o Anúbis carregado. */
function portraitLoaded(page: Page, side: 'voce' | 'oponente') {
  return page.evaluate((which) => {
    const img = document.querySelector<HTMLImageElement>(`[data-retrato="${which}"] img`);
    return img !== null && img.complete && img.naturalWidth > 0 && /anubis/.test(img.src);
  }, side);
}

const ALL = (...packs: RegExp[]) => new RegExp(packs.map((pack) => pack.source).join('|'));

test('aparência: na sala online, cada tela veste cada lado com a aparência do assento (Ana em Bestiário + Egípcio, Duda em Celestial + Bufão)', async ({
  browser,
}) => {
  const ana = await newPerson(browser);
  const duda = await newPerson(browser);

  await test.step('Ana escolhe Bestiário + Egípcio no painel do Início e cria a sala', async () => {
    await ana.page.goto('/');
    const panel = ana.page.getByRole('region', { name: 'Aparência' });
    await expect(panel.getByText('Na sala online, vale a que você tinha ao entrar.')).toBeVisible();
    await panel.getByRole('radio', { name: 'Cordel' }).focus();
    await ana.page.keyboard.press('ArrowRight');
    await expect(panel.getByRole('radio', { name: 'Bestiário' })).toBeChecked();
    await panel.getByRole('radio', { name: 'Bufão' }).focus();
    await ana.page.keyboard.press('ArrowRight');
    await expect(panel.getByRole('radio', { name: 'Egípcio' })).toBeChecked();
    await ana.page.getByLabel('Seu apelido').fill('Ana');
    await ana.page.getByRole('button', { name: 'Criar sala' }).click();
    await expect(ana.page.getByRole('heading', { name: 'Sala de espera' })).toBeVisible();
  });

  await test.step('Duda, com Celestial + Bufão nas preferências, entra pelo link; os dois marcam pronto', async () => {
    const code = /\/s\/([A-Z0-9]{6})$/.exec(ana.page.url())?.[1];
    if (code === undefined) throw new Error(`o código da sala não está na URL: ${ana.page.url()}`);
    // A entrada por link não mostra o painel: a aparência vem das preferências guardadas.
    await duda.page.addInitScript(
      (prefs) => window.localStorage.setItem('coringa:prefs', prefs),
      JSON.stringify({ autoPass: true, reduceMotion: false, sound: true, look: { deck: 'celestial', race: 'bufao' } }),
    );
    await duda.page.goto(`/s/${code}`);
    await duda.page.getByLabel('Seu apelido').fill('Duda');
    await duda.page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(duda.page.getByRole('heading', { name: 'Sala de espera' })).toBeVisible();
    await expect(ana.page.getByText('Conectado', { exact: true })).toHaveCount(2);
    await ana.page.getByRole('button', { name: 'Estou pronto' }).click();
    await duda.page.getByRole('button', { name: 'Estou pronto' }).click();
    for (const { page } of [ana, duda]) await expect(roundHeading(page)).toHaveText('Rodada 1');
  });

  await test.step('no Equipar: as suas cartas com a sua, os versos e o retrato do outro com a dele', async () => {
    // Ana: as cartas dela do Bestiário (as especiais, do Egípcio); os versos de Duda da Celestial; o Anúbis dela e o Coringa de Duda.
    const anaImages = await loadedCardImages(ana.page);
    for (const src of anaImages) expect(src).toMatch(ALL(BESTIARIO, EGIPCIO));
    expect(anaImages.some((src) => BESTIARIO.test(src))).toBe(true);
    for (const deck of await backDecks(ana.page)) expect(deck).toBe('celestial');
    await expect.poll(() => portraitLoaded(ana.page, 'voce')).toBe(true);
    await expect(ana.page.locator('[data-retrato="oponente"] img')).toHaveCount(0);

    // Duda: o contrário (as especiais dela, do Bufão, são de cordel).
    const dudaImages = await loadedCardImages(duda.page);
    for (const src of dudaImages) expect(src).toMatch(CELESTIAL);
    for (const deck of await backDecks(duda.page)) expect(deck).toBe('bestiario');
    await expect.poll(() => portraitLoaded(duda.page, 'oponente')).toBe(true);
    await expect(duda.page.locator('[data-retrato="voce"] img')).toHaveCount(0);
    await axe(ana.page);
    await axe(duda.page);
  });

  await test.step('depois da revelação: as fileiras de Ana com o Bestiário e as de Duda com a Celestial, nas duas telas', async () => {
    await Promise.all([equipByUi(ana.page), equipByUi(duda.page)]);
    for (const { page } of [ana, duda]) await expect(roundHeading(page)).toHaveText('Rodada 2');

    const anaMine = await loadedIn(myField(ana.page));
    for (const src of anaMine) expect(src).toMatch(ALL(BESTIARIO, EGIPCIO));
    expect(anaMine.some((src) => BESTIARIO.test(src))).toBe(true);
    const anaTheirs = await loadedIn(theirField(ana.page));
    for (const src of anaTheirs) expect(src).toMatch(CELESTIAL);

    const dudaMine = await loadedIn(myField(duda.page));
    for (const src of dudaMine) expect(src).toMatch(CELESTIAL);
    const dudaTheirs = await loadedIn(theirField(duda.page));
    for (const src of dudaTheirs) expect(src).toMatch(ALL(BESTIARIO, EGIPCIO));
    expect(dudaTheirs.some((src) => BESTIARIO.test(src))).toBe(true);
    await axe(ana.page);
    await axe(duda.page);
  });

  await test.step('o menu da sala diz que a aparência é a de quem entrou, sem o seletor', async () => {
    const menu = await openMenu(ana.page);
    await expect(menu.getByText('A aparência desta sala é a que você tinha ao entrar.')).toBeVisible();
    await expect(menu.getByRole('group', { name: 'Deck' })).toHaveCount(0);
  });

  ana.guard.expectClean();
  duda.guard.expectClean();
});
