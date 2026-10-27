// E2E do histórico e do replay do treino (spec do polimento §4.3, §4.4): terminar uma partida de treino desistindo, "Rever a
// partida", andar e voltar, e achar a partida na lista com "Rever". É o que o jsdom não prova: o Worker servindo as rotas novas
// (`/partidas`, `/partidas/<id>`) e os chunks carregados sob demanda, o `localStorage` de verdade e os cliques de mouse nos controles
// do replay no meio de uma cena (o `data-sem-pulo` tira os controles do "toque pula as batidas" do palco).
//
// A semente fixa do treino (`e2e2631-1`, Médio) faz a partida ser sempre a mesma; o número de passos do replay depende só de quando a
// desistência cai, e por isso o teste a faz num ponto fixo (rodada 3, depois de o Bot escolher a ordem) e lê o total do contador.
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  actionBar,
  ATTACK_BUTTON,
  axe,
  endPanel,
  equipByUi,
  expectNoHorizontalScroll,
  expectWhollyInView,
  failOnConsoleErrors,
  openMenu,
  replayControl,
  replayCounter,
  replaySteps,
  roundHeading,
  table,
} from './helpers.ts';

const TRAINING = '/treino?semente=e2e2631-1&nivel=medio';

/** As linhas do histórico (no PC a coluna está à vista; no celular é uma gaveta fechada, mas as linhas seguem no DOM). */
const historyLines = (page: Page): Locator =>
  page.getByRole('complementary', { name: 'Histórico da partida' }).getByRole('region', { name: 'Linhas do histórico' }).getByRole('listitem');
const round = (page: Page): Locator => page.getByRole('combobox', { name: 'Rodada' });

/**
 * Joga o treino até a rodada 3 (dois Equipar e a escolha da ordem do Bot, que a semente fixa) e desiste pelo menu. Termina com o
 * painel de fim aberto, que já oferece "Rever a partida" (a partida ficou guardada, com o replay, assim que a sala virou FINISHED).
 */
async function concedeTraining(page: Page): Promise<Locator> {
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  await equipByUi(page);
  await expect(roundHeading(page)).toHaveText('Rodada 2');
  await equipByUi(page);
  await expect(roundHeading(page)).toHaveText('Rodada 3');
  // O Bot escolheu atacar em segundo (a semente fixa): a vez de atacar é sua.
  await expect(actionBar(page).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();

  const menu = await openMenu(page);
  await menu.getByRole('button', { name: 'Desistir', exact: true }).click();
  const confirm = page.getByRole('dialog', { name: 'Desistir da partida?' });
  await expect(confirm).toBeVisible();
  await confirm.getByRole('button', { name: 'Confirmar', exact: true }).click();

  const end = endPanel(page);
  await expect(end).toBeVisible();
  await expect(end).toContainText('Você desistiu');
  return end;
}

test('treino: desistir, "Rever a partida", andar e voltar pelos passos, e achar a partida na lista com "Rever"', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  const end = await concedeTraining(page);
  await axe(page);

  // No treino "Rever a partida" troca a entrada do histórico (o Voltar do navegador vai ao início, não a um treino novo da mesma URL).
  const entries = await page.evaluate(() => window.history.length);
  await end.getByRole('button', { name: 'Rever a partida' }).click();
  await expect(page).toHaveURL(/\/partidas\/[0-9a-z-]+$/);
  const replayUrl = page.url();
  expect(await page.evaluate(() => window.history.length), 'o treino troca a entrada, não empilha outra').toBe(entries);

  // A mesa só de vista: sem relógio, sem barra de jogadas e sem menu; a faixa diz que é um replay, no começo da partida.
  await expect(table(page)).toBeVisible();
  await expect(page.getByRole('region', { name: 'Situação da rodada' })).toContainText('Revendo a partida');
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByRole('region', { name: 'Ações' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Menu da partida' })).toHaveCount(0);
  await expect(roundHeading(page)).toHaveText('Rodada 1');
  const { step, total } = await replaySteps(page);
  expect(step, 'o replay abre no começo').toBe(0);
  expect(total, 'a partida tem passos para ver').toBeGreaterThan(2);
  // No começo não há para onde voltar. (`aria-disabled` deixa o foco no botão apertado; um clique nele não faz nada.)
  await expect(replayControl(page, 'Início')).toHaveAttribute('aria-disabled', 'true');
  await expect(replayControl(page, 'Passo anterior')).toHaveAttribute('aria-disabled', 'true');
  await expect(replayControl(page, 'Próximo passo')).not.toHaveAttribute('aria-disabled', 'true');
  await axe(page);

  // Próximo passo anda um; Passo anterior volta. O clique cai com ou sem batidas no ar: o palco não o engole.
  await replayControl(page, 'Próximo passo').click();
  await expect(replayCounter(page)).toHaveText(`Passo 1 de ${total}`);
  await expect(replayControl(page, 'Passo anterior')).not.toHaveAttribute('aria-disabled', 'true');
  await replayControl(page, 'Próximo passo').click();
  await expect(replayCounter(page)).toHaveText(`Passo 2 de ${total}`);
  await replayControl(page, 'Passo anterior').click();
  await expect(replayCounter(page)).toHaveText(`Passo 1 de ${total}`);
  await replayControl(page, 'Passo anterior').click();
  await expect(replayCounter(page)).toHaveText(`Passo 0 de ${total}`);
  await expect(replayControl(page, 'Passo anterior')).toHaveAttribute('aria-disabled', 'true');

  // A rodada pula para a primeira jogada dela (e o histórico cresce até ali); "Início" volta ao começo (e o histórico encolhe).
  const linesAtStart = await historyLines(page).count();
  await round(page).selectOption('3');
  await expect(round(page)).toHaveValue('3');
  expect((await replaySteps(page)).step, 'a rodada 3 começa depois do começo').toBeGreaterThan(0);
  await expect(roundHeading(page)).toHaveText('Rodada 3');
  await expect.poll(() => historyLines(page).count()).toBeGreaterThan(linesAtStart);
  await replayControl(page, 'Início').click();
  await expect(replayCounter(page)).toHaveText(`Passo 0 de ${total}`);
  await expect(round(page)).toHaveValue('1');
  await expect(historyLines(page)).toHaveCount(linesAtStart);

  // Cliques seguidos, sem esperar as batidas: um clique, um passo. O palco não pula a cena nem engole o clique nos controles do replay
  // (o `data-sem-pulo`); o teste confere que algum clique de fato caiu com as batidas no ar.
  const quick = Math.min(total, 8);
  let sawBeats = false;
  for (let i = 1; i <= quick; i += 1) {
    await replayControl(page, 'Próximo passo').click();
    sawBeats ||= await page.evaluate(() => document.querySelector('[data-palco]')?.hasAttribute('data-ocupado') === true);
  }
  expect(sawBeats, 'algum clique caiu com as batidas no ar').toBe(true);
  await expect(replayCounter(page)).toHaveText(`Passo ${quick} de ${total}`);
  await replayControl(page, 'Início').click();
  await expect(replayCounter(page)).toHaveText(`Passo 0 de ${total}`);

  // "Tocar" anda sozinho (700 ms por passo, mais o tempo das batidas) e "Pausar" para na hora: o clique no meio de uma cena é um
  // clique, não um pulo que o engoliria.
  await replayControl(page, 'Tocar').click();
  await expect(replayControl(page, 'Pausar')).toBeVisible();
  await expect.poll(async () => (await replaySteps(page)).step, { timeout: 20_000 }).toBeGreaterThan(0);
  await replayControl(page, 'Pausar').click();
  await expect(replayControl(page, 'Tocar')).toBeVisible();
  const paused = await replaySteps(page);
  await page.waitForTimeout(1_800);
  expect(await replaySteps(page), 'pausado, o contador não anda').toEqual(paused);

  // A página recarregada na rota do replay (o Worker serve o `index.html` e o chunk da tela vem sob demanda) abre a mesma partida.
  await page.reload();
  await expect(table(page)).toBeVisible();
  await expect(replayCounter(page)).toHaveText(`Passo 0 de ${total}`);
  expect(page.url()).toBe(replayUrl);

  // Voltar à lista: a partida aparece, com o resultado do seu assento, contra quem, o modo e o botão "Rever".
  await page.getByRole('link', { name: 'Voltar à lista' }).click();
  await expect(page).toHaveURL(/\/partidas$/);
  await expect(page.getByRole('heading', { name: 'Partidas anteriores' })).toBeVisible();
  const games = page.getByRole('list').getByRole('listitem');
  await expect(games).toHaveCount(1);
  await expect(games.first()).toContainText('Derrota');
  await expect(games.first()).toContainText('contra Bot');
  await expect(games.first()).toContainText('Treino · Médio');
  await expect(games.first()).toContainText(/\d{2}\/\d{2}, \d{2}:\d{2}/);
  await expect(games.first().getByRole('button', { name: 'Rever', exact: true })).toBeVisible();
  await axe(page);

  // "Rever" abre a mesma partida, de novo no começo.
  await games.first().getByRole('button', { name: 'Rever', exact: true }).click();
  await expect(page).toHaveURL(replayUrl);
  await expect(replayCounter(page)).toHaveText(`Passo 0 de ${total}`);

  guard.expectClean();
});

test('a tela inicial leva às partidas anteriores; vazia, a lista diz que não há nenhuma, e um id desconhecido não quebra', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.goto('/');
  await page.getByRole('button', { name: 'Partidas anteriores' }).click();
  await expect(page).toHaveURL(/\/partidas$/);
  await expect(page.getByRole('heading', { name: 'Partidas anteriores' })).toBeVisible();
  await expect(page.getByText('Nenhuma partida terminada neste navegador.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rever', exact: true })).toHaveCount(0);
  await axe(page);

  await page.getByRole('button', { name: 'Voltar ao início' }).click();
  await expect(page).toHaveURL(/\/$/);

  await page.goto('/partidas/zzz');
  await expect(page.getByText('Esta partida não está mais neste navegador.')).toBeVisible();
  await axe(page);
  await page.getByRole('link', { name: 'Voltar à lista' }).click();
  await expect(page).toHaveURL(/\/partidas$/);
  guard.expectClean();
});

test.describe('celular em pé, 390 × 844', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('o replay cabe na tela: sem rolagem lateral, e o contador e os controles inteiros à vista', async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    const end = await concedeTraining(page);
    await end.getByRole('button', { name: 'Rever a partida' }).click();
    await expect(replayCounter(page)).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectWhollyInView(page, {
      'o contador': replayCounter(page),
      'o seletor de rodada': round(page),
      'Início': replayControl(page, 'Início'),
      'Passo anterior': replayControl(page, 'Passo anterior'),
      'Próximo passo': replayControl(page, 'Próximo passo'),
      'Tocar': replayControl(page, 'Tocar'),
      'Voltar à lista': page.getByRole('link', { name: 'Voltar à lista' }),
    });
    await axe(page);

    await replayControl(page, 'Próximo passo').tap();
    await expect(replayCounter(page)).toHaveText(/^Passo 1 de \d+$/);
    await expectNoHorizontalScroll(page);
    guard.expectClean();
  });
});
