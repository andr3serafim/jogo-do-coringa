// E2E online (spec §9.2, item 1): duas pessoas, cada uma no seu navegador, contra o `wrangler dev` servindo a web construída.
// Criar a sala, entrar pelo link, os dois prontos, duas rodadas de Equipar, a escolha da ordem, um ataque com reação, a queda
// e a volta de um lado, desistir, o painel de fim e a revanche. Cada tela passa pelo axe.
//
// O servidor de teste sobe com `E2E_SEED=e2e` (playwright.config.ts), o que fixa só o sorteio da partida: a primeira distribuição
// é sempre a mesma (uma conferência abaixo avisa se não for). Os prazos, o piso de 2 s do passe automático e o relógio do
// runner continuam reais, então o resto do teste só reage ao que está na tela e não conta cartas.
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  actionBar,
  answerReaction,
  axe,
  controlSocket,
  endPanel,
  equipByUi,
  equipPanel,
  failOnConsoleErrors,
  handIds,
  openMenu,
  orderPanel,
  playUntil,
  roundHeading,
  roundNumber,
  table,
  type ConsoleGuard,
  type SocketControl,
} from './helpers.ts';

interface Player {
  name: string;
  page: Page;
  console: ConsoleGuard;
}

const contexts: BrowserContext[] = [];

/** Um navegador isolado por jogador (cookies, `localStorage` e o token do assento são de cada um). */
async function newPlayer(browser: Browser, name: string): Promise<Player> {
  const context = await browser.newContext();
  contexts.push(context);
  const page = await context.newPage();
  return { name, page, console: failOnConsoleErrors(page) };
}

// Os contextos criados à mão não são fechados pelo Playwright Test: sem isto as duas sessões (e os WebSockets) vazariam para os testes seguintes.
test.afterEach(async () => {
  await Promise.all(contexts.splice(0).map((context) => context.close()));
});

const reconnecting = (page: Page) => page.getByRole('status').filter({ hasText: 'Reconectando…' });
const history = (page: Page) => page.getByRole('complementary', { name: 'Histórico da partida' });
const readyButton = (page: Page) => page.getByRole('button', { name: 'Estou pronto' });

test.describe('casca estática', () => {
  test('/s/<CÓDIGO> e as outras rotas da SPA respondem 200 text/html, com a CSP', async ({ request }) => {
    for (const path of ['/', '/s/ABC234', '/treino', '/qualquer/coisa']) {
      const response = await request.get(path);
      expect(response.status(), path).toBe(200);
      expect(response.headers()['content-type'], path).toContain('text/html');
      expect(response.headers()['content-security-policy'], path).toContain("default-src 'self'");
    }
    // A API continua sendo do Worker, em JSON.
    const health = await request.get('/api/health');
    expect(health.status()).toBe(200);
    expect(health.headers()['content-type']).toContain('application/json');
    expect((await request.get('/api/nada')).status()).toBe(404);
  });

  test('uma violação de CSP no console falha o teste: o guarda enxerga o estilo inline que a política barra', async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Jogo do Coringa' })).toBeVisible();
    guard.expectClean();

    await page.evaluate(() => {
      const style = document.createElement('style');
      style.textContent = 'body { outline: 1px solid red }';
      document.head.append(style);
    });
    await expect.poll(() => guard.errors.length).toBeGreaterThan(0);
    expect(guard.errors.join('\n')).toContain('Content Security Policy');
  });
});

test('duas pessoas jogam uma sala: do lobby ao fim, com queda e revanche', async ({ browser }) => {
  const ana = await newPlayer(browser, 'Ana');
  const duda = await newPlayer(browser, 'Duda');
  const players = [ana, duda];
  const opponentOf = (player: Player): Player => (player === ana ? duda : ana);
  const socket: SocketControl = await controlSocket(duda.page);

  await test.step('Ana cria a sala', async () => {
    await ana.page.goto('/');
    await expect(ana.page.getByRole('heading', { name: 'Jogo do Coringa' })).toBeVisible();
    await axe(ana.page);
    await ana.page.getByLabel('Seu apelido').fill(ana.name);
    await ana.page.getByRole('button', { name: 'Criar sala' }).click();
    await expect(ana.page.getByRole('heading', { name: 'Sala de espera' })).toBeVisible();
    await expect(ana.page).toHaveURL(/\/s\/[A-Z0-9]{6}$/);
    await axe(ana.page);
  });

  await test.step('Duda abre o link e entra com apelido', async () => {
    // O link que o lobby mostra é o que se manda por mensagem.
    const link = await ana.page.getByText(/^https?:\/\/.+\/s\/[A-Z0-9]{6}$/).innerText();
    expect(link).toMatch(/\/s\/[A-Z0-9]{6}$/);
    await duda.page.goto(link);
    await expect(duda.page.getByRole('heading', { name: /^Entrar na sala [A-Z0-9]{6}$/ })).toBeVisible();
    await axe(duda.page);
    await duda.page.getByLabel('Seu apelido').fill(duda.name);
    await duda.page.getByRole('button', { name: 'Entrar', exact: true }).click();
    await expect(duda.page.getByRole('heading', { name: 'Sala de espera' })).toBeVisible();
    // Os dois assentos, conectados, nas duas telas.
    for (const player of players) {
      await expect(player.page.getByText('Conectado', { exact: true })).toHaveCount(2);
      await expect(player.page.getByText(ana.name).first()).toBeVisible();
      await expect(player.page.getByText(duda.name).first()).toBeVisible();
    }
    await axe(ana.page);
    await axe(duda.page);
  });

  await test.step('os dois marcam pronto e a partida começa na rodada 1', async () => {
    await readyButton(ana.page).click();
    await expect(readyButton(ana.page)).toHaveAttribute('aria-pressed', 'true');
    await expect(duda.page.getByText(`${ana.name}`).first()).toBeVisible();
    // Com o segundo pronto a partida começa, e o lobby some das duas telas.
    await readyButton(duda.page).click();
    for (const player of players) {
      await expect(table(player.page)).toBeVisible();
      await expect(roundHeading(player.page)).toHaveText('Rodada 1');
      await expect(equipPanel(player.page)).toBeVisible();
    }
  });

  await test.step('rodada 1 (Equipar): os dois equipam pelos destinos oferecidos e confirmam', async () => {
    await axe(ana.page);
    const [anaPlaced, dudaPlaced] = await Promise.all([equipByUi(ana.page), equipByUi(duda.page)]);
    // A semente do servidor de teste vale: Ana recebe 3 numéricas e Duda 4 (sem isso o servidor não subiu com E2E_SEED=e2e).
    expect([anaPlaced, dudaPlaced], 'o Worker de teste sorteia com E2E_SEED=e2e').toEqual([3, 4]);
    for (const player of players) await expect(roundHeading(player.page)).toHaveText('Rodada 2');
  });

  await test.step('rodada 2 (Equipar de novo)', async () => {
    await Promise.all([equipByUi(ana.page), equipByUi(duda.page)]);
    for (const player of players) await expect(roundHeading(player.page)).toHaveText('Rodada 3');
  });

  // Rodada 3, a primeira de Ataque: quem tem a iniciativa escolhe a ordem, e a escolha sai sozinha depois de 3 s.
  let chooser = duda;
  await test.step('a escolha da ordem: quem tem a iniciativa espera a confirmação automática', async () => {
    const first = (player: Player) => orderPanel(player.page).getByRole('button', { name: 'Atacar primeiro' });
    await expect.poll(async () => (await first(ana).count()) + (await first(duda).count())).toBe(1);
    chooser = (await first(ana).count()) === 1 ? ana : duda;
    const waiting = opponentOf(chooser);
    // O outro só vê quem escolhe.
    await expect(orderPanel(waiting.page)).toContainText(`${chooser.name} está escolhendo a ordem`);
    await expect(orderPanel(chooser.page).locator('[data-auto-barra]')).toBeVisible();
    // A tela de quem espera passa pelo axe agora; a de quem escolhe não é tocada: qualquer toque, foco ou mouse no painel cancelaria
    // a confirmação automática.
    await axe(waiting.page);
    // A barra esvazia e a ordem sai com a marca `auto`.
    await expect(first(chooser)).toBeHidden({ timeout: 15_000 });
    await expect(orderPanel(chooser.page)).toBeHidden();
  });

  await test.step('B perde a conexão por 3 s e volta: a mesma partida, o aviso aparece e some', async () => {
    const before = { round: await roundNumber(duda.page), hand: await handIds(duda.page) };
    await socket.drop();
    await expect(reconnecting(duda.page)).toBeVisible();
    await expect(ana.page.getByRole('status').filter({ hasText: `${duda.name} caiu` })).toBeVisible();
    await duda.page.waitForTimeout(3_000);
    socket.release();
    await expect(reconnecting(duda.page)).toHaveCount(0);
    await expect(ana.page.getByRole('status').filter({ hasText: `${duda.name} caiu` })).toHaveCount(0);
    await expect(history(ana.page).getByText(`${duda.name} voltou`)).toBeVisible();

    // A mesma partida: a mesa, a rodada e a mão são as de antes, e o lobby não voltou.
    await expect(table(duda.page)).toBeVisible();
    expect(await roundNumber(duda.page)).toBe(before.round);
    expect(await handIds(duda.page)).toEqual(before.hand);
    await expect(duda.page.getByRole('heading', { name: 'Sala de espera' })).toHaveCount(0);
  });

  await test.step('o atacante ataca, quem responde tem o passe automático ou passa', async () => {
    const mainButton = (player: Player) => actionBar(player.page).getByRole('button', { name: /^(Atacar|Encerrar turno)$/ });
    await expect.poll(async () => (await mainButton(ana).count()) + (await mainButton(duda).count())).toBe(1);
    const attacker = (await mainButton(ana).count()) === 1 ? ana : duda;
    await axe(attacker.page);
    await mainButton(attacker).click();
    const answered = await answerReaction(opponentOf(attacker).page);
    expect(['auto', 'manual']).toContain(answered);

    // O resto da rodada 3 (o outro ataca) e o começo da seguinte: cada um joga o que a tela oferece.
    const nextRound = async (page: Page) => (await roundNumber(page).catch(() => 0)) >= 4;
    await Promise.all(players.map((player) => playUntil(player.page, nextRound, { order: 'wait' })));
    await axe(ana.page);
  });

  await test.step('Ana desiste: os dois veem o painel de fim com a causa certa', async () => {
    await openMenu(ana.page);
    await ana.page.getByRole('button', { name: 'Desistir', exact: true }).click();
    await expect(ana.page.getByRole('dialog', { name: 'Desistir da partida?' })).toContainText('Você perde esta partida por W.O.');
    await ana.page.getByRole('button', { name: 'Confirmar', exact: true }).click();

    await expect(endPanel(ana.page)).toBeVisible();
    await expect(endPanel(duda.page)).toBeVisible();
    await expect(endPanel(ana.page)).toContainText('Duda venceu');
    await expect(endPanel(ana.page)).toContainText('Você desistiu');
    await expect(endPanel(ana.page)).toContainText('Ana 0 × 1 Duda');
    await expect(endPanel(duda.page)).toContainText('Você venceu');
    await expect(endPanel(duda.page)).toContainText('Ana desistiu');
    await expect(endPanel(duda.page)).toContainText('Duda 1 × 0 Ana');
    await axe(ana.page);
    await axe(duda.page);
  });

  await test.step('os dois pedem revanche e começa outra partida, na rodada 1', async () => {
    await endPanel(ana.page).getByRole('button', { name: 'Revanche' }).click();
    await expect(endPanel(ana.page)).toContainText(`esperando ${duda.name}`);
    await expect(endPanel(duda.page)).toContainText(`${ana.name} quer revanche`);
    await endPanel(duda.page).getByRole('button', { name: 'Revanche' }).click();

    for (const player of players) {
      await expect(endPanel(player.page)).toBeHidden();
      await expect(roundHeading(player.page)).toHaveText('Rodada 1');
      await expect(equipPanel(player.page)).toBeVisible();
    }
    await axe(ana.page);
    await axe(duda.page);
  });

  for (const player of players) player.console.expectClean();
});
