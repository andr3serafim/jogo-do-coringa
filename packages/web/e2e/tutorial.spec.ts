// E2E do tutorial (spec do polimento §5, fatia 4): `/tutorial` é uma partida de treino de verdade contra o bot Fácil, na semente do
// tutorial, com o painel "Dica" e o contorno da zona de que a dica fala. Sem servidor e sem sala (a partida roda no navegador), e a
// semente fixa dá sempre o mesmo começo: a mão do Equipar 1 traz J, K e A, e você tem a iniciativa na rodada 3.
//
// Aqui entram as conferências que o jsdom não faz: o painel no lugar certo em cada largura, o axe com o contraste da tinta de verdade,
// o diálogo modal do fim (que deixa o resto inerte) com a dica do fim DENTRO dele, e a conta de que as dicas mais longas (a 1 e a 4)
// cabem no celular de 360 × 640 sem esconder a mão nem a barra.
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  actionBar,
  ATTACK_BUTTON,
  axe,
  band,
  endPanel,
  equipByUi,
  equipPanel,
  expectNoHorizontalScroll,
  expectWhollyInView,
  failOnConsoleErrors,
  openMenu,
  orderPanel,
  playUntil,
  roundHeading,
  roundNumber,
  table,
} from './helpers.ts';

const TUTORIAL_KEY = 'coringa:tutorial';

/** Os textos das dicas 1, 3 e 4 por inteiro (as mais longas são a 1 e a 4) e o começo das outras: o plano da fatia 4, "Textos finais das dicas". */
const EQUIP_HINT =
  'Suas numéricas vão para o campo na ordem em que saíram, e você só escolhe o destino: Ataque ou Defesa. Cada fileira é uma fila: quando você ataca, a primeira carta do seu Ataque vai para o cemitério; quando defende, a primeira da sua Defesa.';
const ORDER_HINT =
  'Quem tem a iniciativa escolhe atacar primeiro ou em segundo. Depois de cada rodada de Ataque, ela fica com quem causou mais dano; no empate, não muda.';
const FIRST_ATTACK_HINT =
  'Sua vez de atacar: o dano é o seu ATK menos a DEF do oponente, no mínimo 0. Com cartas no Ataque, atacar é obrigatório. O botão mostra a conta antes de você confirmar.';
const BUFFS_HINT = /^Dica\s*Cada J soma 1 ao multiplicador do seu ataque, e cada Q ao da sua defesa/;
const END_HINT = 'A partida acaba quando um Coringa chega a 0 de vida, ou quando alguém monta a Exódia: 4 K na Guarda. Gostou? Chame alguém para uma sala.';

/** O painel da dica: uma região "Dica" com o texto numa região viva (`polite`) e os botões "Entendi" e "Pular o tutorial". */
const hintPanel = (page: Page): Locator => page.getByRole('region', { name: 'Dica' });
const hintText = (page: Page): Locator => hintPanel(page).locator('[aria-live="polite"]');
const gotIt = (page: Page): Locator => hintPanel(page).getByRole('button', { name: 'Entendi', exact: true });
const skip = (page: Page): Locator => hintPanel(page).getByRole('button', { name: 'Pular o tutorial', exact: true });
/** O contorno parado da zona de que a dica fala (`data-dica="<zona>"`): no máximo um por vez. */
const outlined = (page: Page): Locator => page.locator('[data-dica]');
const hand = (page: Page): Locator => page.getByRole('list', { name: 'Sua mão' });
const history = (page: Page): Locator => page.getByRole('complementary', { name: 'Histórico da partida' });

/** O que o tutorial guardou no navegador (`done`, `skipped` ou nada). */
const stored = (page: Page): Promise<string | null> => page.evaluate((key) => localStorage.getItem(key), TUTORIAL_KEY);

/** Espera a mesa parar (sem batida): um toque durante as batidas só as pula e não vira clique no botão que está embaixo (spec §4.1). */
const settle = (page: Page): Promise<void> => expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1);

/** Abre o tutorial e espera a mesa, a faixa "Tutorial, sem relógio" e a dica do Equipar. */
async function openTutorial(page: Page): Promise<void> {
  await page.goto('/tutorial');
  await expect(table(page)).toBeVisible();
  await expect(roundHeading(page)).toHaveText('Rodada 1');
  await expect(band(page)).toContainText('Tutorial, sem relógio');
  await expect(hintText(page)).toContainText(EQUIP_HINT);
}

/** Monta as duas rodadas de Equipar pelos destinos oferecidos e chega à escolha da ordem da rodada 3, que é sua. */
async function equipToOrder(page: Page): Promise<void> {
  await equipByUi(page);
  await expect(roundHeading(page)).toHaveText('Rodada 2');
  await equipByUi(page);
  await expect(roundHeading(page)).toHaveText('Rodada 3');
  await expect(orderPanel(page).getByRole('button', { name: 'Atacar primeiro' })).toBeVisible();
}

test('a tela inicial convida ("Aprender jogando" em destaque) e leva ao tutorial', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.goto('/');
  const learn = page.getByRole('button', { name: 'Aprender jogando' });
  await expect(learn).toBeVisible();
  // Enquanto o tutorial não foi feito nem pulado, é o botão principal (em ouro), antes de "Criar sala".
  await expect(learn).toHaveAttribute('data-destaque', 'true');
  expect(await stored(page)).toBeNull();
  await axe(page);

  await learn.click();
  await expect(page).toHaveURL(/\/tutorial$/);
  await expect(table(page)).toBeVisible();
  await expect(hintPanel(page)).toBeVisible();
  guard.expectClean();
});

test('tutorial: a dica do Equipar, a seguinte quando a situação muda, e "Pular o tutorial"', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await openTutorial(page);
  expect(await stored(page), 'nada guardado antes de acabar ou pular').toBeNull();

  // A dica 1: no PC mora no alto da coluna do histórico, com os dois botões e o contorno na barra do Equipar.
  await expect(history(page).getByRole('region', { name: 'Dica' })).toBeVisible();
  await expect(gotIt(page)).toBeVisible();
  await expect(skip(page)).toBeVisible();
  await expect(outlined(page)).toHaveCount(1);
  await expect(page.locator('[data-dica="equip"]')).toHaveCount(1);
  await axe(page);

  // Monta a carta do Equipar 1: a dica fica no painel até o "Entendi" (a situação passou, mas ela segue lida na tela). "Entendi" a
  // fecha, e nenhuma outra vale na rodada 2: o painel esvazia e o contorno some.
  expect(await equipByUi(page)).toBeGreaterThan(0);
  await expect(roundHeading(page)).toHaveText('Rodada 2');
  await expect(hintText(page)).toContainText(EQUIP_HINT);
  await gotIt(page).click();
  await expect(hintText(page)).toBeEmpty();
  await expect(gotIt(page)).toHaveCount(0);
  await expect(outlined(page)).toHaveCount(0);

  // A escolha da ordem é sua: a dica seguinte (3) chega sozinha, com o contorno no painel da ordem.
  await equipByUi(page);
  await expect(roundHeading(page)).toHaveText('Rodada 3');
  await expect(hintText(page)).toContainText(ORDER_HINT);
  await expect(page.locator('[data-dica="order"]')).toHaveCount(1);
  await settle(page);
  // A ordem não sai sozinha no tutorial (nem o "Atacar primeiro" aos 3 s do treino): depois de bem mais que isso, o painel segue
  // lá, sem barra e sem falar em prazo, e a dica 3 também.
  await page.waitForTimeout(4_000);
  await expect(orderPanel(page)).toContainText('Escolha quando quiser.');
  await expect(orderPanel(page)).not.toContainText('prazo');
  await expect(orderPanel(page).locator('[data-auto-barra]')).toHaveCount(0);
  await expect(hintText(page)).toContainText(ORDER_HINT);
  await orderPanel(page).getByRole('button', { name: 'Atacar primeiro' }).click();

  // Sua vez de atacar: a dica 4 toma o lugar sem "Entendi" (a da ordem passou). O botão mostra a conta, como a dica diz.
  await expect(hintText(page)).toContainText(FIRST_ATTACK_HINT);
  await expect(page.locator('[data-dica="actionBar"]')).toHaveCount(1);
  const attack = actionBar(page).getByRole('button', { name: ATTACK_BUTTON });
  await expect(attack).toBeEnabled();
  await expect(attack).toContainText(/× .* · dano \d+/);

  // "Entendi": a próxima que vale neste mesmo momento (J, Q ou K de verdade na mão) ocupa o painel, com o contorno na mão.
  await gotIt(page).click();
  await expect(hintPanel(page)).toHaveText(BUFFS_HINT);
  await expect(page.locator('[data-dica="hand"]')).toHaveCount(1);
  await axe(page);

  // "Pular o tutorial": o painel e o contorno somem, o valor fica guardado, e a partida segue sem dica nenhuma.
  await skip(page).click();
  await expect(hintPanel(page)).toHaveCount(0);
  await expect(outlined(page)).toHaveCount(0);
  expect(await stored(page)).toBe('skipped');
  await expect(attack).toBeEnabled();
  await playUntil(page, async (p) => (await roundNumber(p).catch(() => 0)) >= 4);
  await expect(hintPanel(page)).toHaveCount(0);
  await expect(outlined(page)).toHaveCount(0);
  expect(await stored(page)).toBe('skipped');

  // Pulado, o botão da tela inicial vira um botão comum (a pessoa já decidiu), e continua lá para quem quiser rever.
  await page.goto('/');
  const learn = page.getByRole('button', { name: 'Aprender jogando' });
  await expect(learn).toBeVisible();
  await expect(learn).not.toHaveAttribute('data-destaque', 'true');
  guard.expectClean();
});

test('tutorial, o fim: a dica 10 mora DENTRO do painel de fim (diálogo modal), o leitor de tela a lê ao abrir e "Jogar com um amigo" volta ao início', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await openTutorial(page);

  // Desiste pelo menu (a dica do fim vale em qualquer fim de partida).
  const menu = await openMenu(page);
  await menu.getByRole('button', { name: 'Desistir', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Desistir da partida?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Confirmar', exact: true }).click();

  const end = endPanel(page);
  await expect(end).toBeVisible();
  const note = end.locator('[data-dica-nota]');
  await expect(note).toContainText(END_HINT);
  // O diálogo modal deixa o painel da coluna inerte: a dica do fim não está lá, e a de dentro não tem "Entendi" nem "Pular".
  await expect(end.getByRole('button', { name: 'Entendi' })).toHaveCount(0);
  await expect(end.getByRole('button', { name: 'Pular o tutorial' })).toHaveCount(0);
  // A nota entra na descrição do diálogo: o leitor de tela lê o motivo e a dica juntos quando ele abre.
  await expect(end).toHaveAccessibleDescription(/Você desistiu.*A partida acaba quando um Coringa chega a 0 de vida/);
  // O tutorial já conta como feito: a dica do fim apareceu.
  expect(await stored(page)).toBe('done');
  await axe(page);

  // O link leva à tela inicial (sem recarregar a sala: é o treino local), onde o botão do tutorial já é comum.
  const friend = note.getByRole('link', { name: 'Jogar com um amigo' });
  await expect(friend).toHaveAttribute('href', '/');
  await friend.click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.getByRole('heading', { name: 'Jogo do Coringa' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Aprender jogando' })).not.toHaveAttribute('data-destaque', 'true');
  guard.expectClean();
});

// O celular baixo (spec §3.2): o painel é o primeiro filho dos campos, que rolam por dentro, e a mão e a barra moram fora deles. As
// dicas mais longas (a 1, do Equipar, e a 4, do primeiro ataque) têm de caber na janela dos campos sem empurrar a mão nem a barra.
test.describe('celular baixo, 360 × 640', () => {
  test.use({ viewport: { width: 360, height: 640 }, hasTouch: true, isMobile: true });

  /** O painel é o primeiro filho do contêiner que rola (`[data-campos]`), e nem a mão nem a barra estão dentro dele. */
  async function expectPanelInFields(page: Page): Promise<void> {
    const where = await hintPanel(page).evaluate((panel) => {
      const fields = panel.closest('[data-campos]');
      return {
        first: fields !== null && fields.firstElementChild === panel,
        handInside: fields?.querySelector('ul[aria-label="Sua mão"]') != null,
        barInside: fields?.querySelector('section[aria-label="Ações"]') != null,
      };
    });
    expect(where, 'o painel no alto dos campos, e a mão e a barra fora deles').toEqual({ first: true, handInside: false, barInside: false });
  }

  test('a dica 1 (Equipar) e a dica 4 (o primeiro ataque) ficam à vista por inteiro, e a mão e a barra também', async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    await openTutorial(page);
    await expectPanelInFields(page);

    // Dica 1: o painel, os destinos do Equipar e a mão, tudo inteiro na janela e na janela dos campos.
    const destinations = equipPanel(page).getByRole('list', { name: 'Destinos' });
    await expect(destinations).toBeVisible();
    await expectWhollyInView(page, {
      'o painel da dica 1': hintPanel(page),
      'o painel do Equipar (a barra desta fase)': equipPanel(page),
      'os destinos do Equipar': destinations,
      'a mão': hand(page),
    });
    await expect(gotIt(page)).toBeInViewport({ ratio: 1 });
    await expect(skip(page)).toBeInViewport({ ratio: 1 });
    await expectNoHorizontalScroll(page);
    await axe(page);

    // Dica 4: chega na vez de atacar, com o painel à vista (a dica nova rola o painel ao alto dos campos), e a mão, a barra e o botão
    // Atacar também. Só os campos rolam; a página não.
    await gotIt(page).click();
    await equipToOrder(page);
    await expect(hintText(page)).toContainText(ORDER_HINT);
    await expectPanelInFields(page);
    await settle(page);
    await orderPanel(page).getByRole('button', { name: 'Atacar primeiro' }).click();
    await expect(hintText(page)).toContainText(FIRST_ATTACK_HINT);
    const attack = actionBar(page).getByRole('button', { name: ATTACK_BUTTON });
    await expect(attack).toBeEnabled();
    await expectPanelInFields(page);
    await expectWhollyInView(page, {
      'o painel da dica 4': hintPanel(page),
      'a mão': hand(page),
      'a barra de ações': actionBar(page),
      'o botão Atacar': attack,
    });
    await expect(gotIt(page)).toBeInViewport({ ratio: 1 });
    expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight), 'a página não rola').toBe(0);
    await expectNoHorizontalScroll(page);
    await axe(page);

    // "Entendi" na dica 4 (a próxima, a de J, Q e K): a mão segue à vista, e o painel esvazia por inteiro com "Pular".
    await gotIt(page).click();
    await expect(hintPanel(page)).toHaveText(BUFFS_HINT);
    await expectWhollyInView(page, { 'o painel da dica 5': hintPanel(page), 'a mão': hand(page), 'a barra de ações': actionBar(page) });
    await skip(page).click();
    await expect(hintPanel(page)).toHaveCount(0);
    await expect(attack).toBeEnabled();
    guard.expectClean();
  });
});
