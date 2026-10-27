// E2E online (spec §9.2, item 1): duas pessoas, cada uma no seu navegador, contra o `wrangler dev` servindo a web construída.
// Criar a sala, entrar pelo link, os dois prontos, duas rodadas de Equipar, a escolha da ordem, um ataque com reação, a queda
// e a volta de um lado, desistir, o painel de fim e a revanche. Cada tela passa pelo axe. Um segundo teste, curto, confere o
// replay da partida online (spec do polimento §4.2): "Rever a partida" nas duas telas, o visualizador e a lista com "Sala <código>".
//
// O servidor de teste sobe com `E2E_SEED=e2e2631` (playwright.config.ts), o que fixa só o sorteio da partida: a primeira distribuição
// é sempre a mesma (uma conferência abaixo avisa se não for). Os prazos, o piso de 2 s do passe automático e o relógio do
// runner continuam reais, então o resto do teste só reage ao que está na tela e não conta cartas.
import { expect, test, type Browser, type BrowserContext, type Page } from '@playwright/test';
import {
  actionBar,
  answerReaction,
  ATTACK_BUTTON,
  axe,
  controlSocket,
  endPanel,
  END_TURN_BUTTON,
  equipByUi,
  equipPanel,
  failOnConsoleErrors,
  handIds,
  openMenu,
  orderPanel,
  playUntil,
  replayControl,
  replayCounter,
  replaySteps,
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
    // A semente do servidor de teste vale: Ana recebe 3 numéricas e Duda 4 (sem isso o servidor não subiu com E2E_SEED=e2e2631).
    expect([anaPlaced, dudaPlaced], 'o Worker de teste sorteia com E2E_SEED=e2e2631').toEqual([3, 4]);
    for (const player of players) await expect(roundHeading(player.page)).toHaveText('Rodada 2');
  });

  await test.step('rodada 2 (Equipar de novo)', async () => {
    await Promise.all([equipByUi(ana.page), equipByUi(duda.page)]);
    for (const player of players) await expect(roundHeading(player.page)).toHaveText('Rodada 3');
  });

  // Rodada 3, a primeira de Ataque: quem tem a iniciativa escolhe a ordem, e a escolha sai sozinha depois de 3 s.
  await test.step('a escolha da ordem: quem tem a iniciativa espera a confirmação automática', async () => {
    const first = (player: Player) => orderPanel(player.page).getByRole('button', { name: 'Atacar primeiro' });
    await expect.poll(async () => (await first(ana).count()) + (await first(duda).count())).toBe(1);
    const chooser = (await first(ana).count()) === 1 ? ana : duda;
    const waiting = opponentOf(chooser);
    // O outro só vê quem escolhe.
    await expect(orderPanel(waiting.page)).toContainText(`${chooser.name} está escolhendo a ordem`);
    await expect(orderPanel(chooser.page).locator('[data-auto-barra]')).toBeVisible();
    // Nenhum toque, foco nem axe em nenhuma das duas telas durante os 3 s: qualquer toque, foco ou mouse no painel cancelaria a
    // confirmação, e o axe leva tempo do prazo. A barra esvazia e a ordem sai com a marca `auto`.
    await expect(first(chooser)).toBeHidden({ timeout: 15_000 });
    await expect(orderPanel(chooser.page)).toBeHidden();
    await expect(orderPanel(waiting.page)).toBeHidden();
    // Com o painel fora, a tela de quem esperava passa pelo axe (ele espera as batidas assentarem).
    await axe(waiting.page);
  });

  /** O botão principal da barra (Atacar ou Encerrar turno): só quem tem a vez de jogar o vê. */
  const mainButton = (player: Player) =>
    actionBar(player.page).getByRole('button', { name: ATTACK_BUTTON }).or(actionBar(player.page).getByRole('button', { name: END_TURN_BUTTON }));
  /** Espera um dos dois ter a vez e devolve quem. */
  const whoActs = async (): Promise<Player> => {
    await expect.poll(async () => (await mainButton(ana).count()) + (await mainButton(duda).count())).toBe(1);
    return (await mainButton(ana).count()) === 1 ? ana : duda;
  };

  await test.step('o atacante ataca e quem responde passa sozinho', async () => {
    const attacker = await whoActs();
    // A mão e a barra de quem ataca passam pelo axe antes do clique (na semente, a mão de Duda tem Armadilhas); a vez dele tem 30 s.
    await axe(attacker.page);
    await mainButton(attacker).click();
    // Na semente `e2e` só `PASS` é legal para quem responde (nenhuma Armadilha tem alvo), então o passe é o automático. Um sorteio
    // com resposta possível cairia em "manual", e esta conferência avisaria que a semente não valeu.
    expect(await answerReaction(opponentOf(attacker).page), 'a semente deixa só PASS legal na primeira reação').toBe('auto');
  });

  // A queda vem agora, na vez do outro: o relógio do turno (30 s) corre contra quem joga, e quem cai só espera. Se num runner lento ele
  // vencer e o servidor jogar por quem estava na vez, o resto do teste só reage ao que a tela oferecer (as conferências abaixo toleram isso).
  await test.step('B perde a conexão por 3 s e volta: a mesma partida, o aviso aparece e some', async () => {
    const acting = await whoActs();
    // A mão (Q, K, Selvagem) e a barra de quem joga agora, pelo axe, antes de a conexão cair.
    await axe(acting.page);
    const before = { round: await roundNumber(duda.page), hand: await handIds(duda.page) };
    await socket.drop();
    await expect(reconnecting(duda.page)).toBeVisible();
    await expect(ana.page.getByRole('status').filter({ hasText: `${duda.name} caiu` })).toBeVisible();
    await duda.page.waitForTimeout(3_000);
    socket.release();
    await expect(reconnecting(duda.page)).toHaveCount(0);
    await expect(ana.page.getByRole('status').filter({ hasText: `${duda.name} caiu` })).toHaveCount(0);
    await expect(history(ana.page).getByText(`${duda.name} voltou`)).toBeVisible();

    // A mesma partida: a mesa, e o lobby não voltou; a rodada nunca volta atrás e, enquanto é a mesma, a mão de Duda é a de antes.
    await expect(table(duda.page)).toBeVisible();
    await expect(duda.page.getByRole('heading', { name: 'Sala de espera' })).toHaveCount(0);
    const round = await roundNumber(duda.page);
    expect(round, 'a rodada não volta atrás').toBeGreaterThanOrEqual(before.round);
    if (round === before.round) expect(await handIds(duda.page)).toEqual(before.hand);
  });

  await test.step('o resto da rodada 3 e o começo da seguinte, pelo que a tela oferece', async () => {
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

/** Ana cria a sala, Duda entra pelo link e os dois marcam pronto: a partida começa na rodada 1, e a função devolve o código da sala. */
async function startOnlineGame(ana: Player, duda: Player): Promise<string> {
  await ana.page.goto('/');
  await ana.page.getByLabel('Seu apelido').fill(ana.name);
  await ana.page.getByRole('button', { name: 'Criar sala' }).click();
  await expect(ana.page.getByRole('heading', { name: 'Sala de espera' })).toBeVisible();
  await expect(ana.page).toHaveURL(/\/s\/[A-Z0-9]{6}$/);
  const code = /\/s\/([A-Z0-9]{6})$/.exec(ana.page.url())?.[1];
  if (code === undefined) throw new Error(`o código da sala não está na URL: ${ana.page.url()}`);

  await duda.page.goto(`/s/${code}`);
  await duda.page.getByLabel('Seu apelido').fill(duda.name);
  await duda.page.getByRole('button', { name: 'Entrar', exact: true }).click();
  await expect(duda.page.getByRole('heading', { name: 'Sala de espera' })).toBeVisible();
  await expect(ana.page.getByText('Conectado', { exact: true })).toHaveCount(2);

  await readyButton(ana.page).click();
  await readyButton(duda.page).click();
  for (const player of [ana, duda]) await expect(roundHeading(player.page)).toHaveText('Rodada 1');
  return code;
}

test('partida online terminada: as duas telas oferecem "Rever a partida", o replay anda e a lista mostra a sala com "Rever"', async ({ browser }) => {
  const ana = await newPlayer(browser, 'Ana');
  const duda = await newPlayer(browser, 'Duda');
  const players = [ana, duda];
  const code = await startOnlineGame(ana, duda);

  // Um Equipar de cada um antes de desistir: o replay tem passos para andar (desistindo logo na largada ele poderia ter zero).
  await Promise.all([equipByUi(ana.page), equipByUi(duda.page)]);
  for (const player of players) await expect(roundHeading(player.page)).toHaveText('Rodada 2');

  await openMenu(ana.page);
  await ana.page.getByRole('button', { name: 'Desistir', exact: true }).click();
  await ana.page.getByRole('dialog', { name: 'Desistir da partida?' }).getByRole('button', { name: 'Confirmar', exact: true }).click();

  // O servidor manda o `room` em FINISHED e, logo depois, o `replay`: o botão aparece nas duas telas quando a web o anexa à linha.
  for (const player of players) {
    await expect(endPanel(player.page)).toBeVisible();
    await expect(endPanel(player.page).getByRole('button', { name: 'Rever a partida' })).toBeVisible();
  }
  await axe(ana.page);
  await axe(duda.page);

  // Duda (a vencedora) abre o replay: a mesa só de vista, no começo, com passos para andar.
  await endPanel(duda.page).getByRole('button', { name: 'Rever a partida' }).click();
  await expect(duda.page).toHaveURL(/\/partidas\/[0-9a-z-]+$/);
  const replayUrl = duda.page.url();
  await expect(table(duda.page)).toBeVisible();
  await expect(duda.page.getByRole('region', { name: 'Situação da rodada' })).toContainText('Revendo a partida');
  await expect(duda.page.getByRole('region', { name: 'Ações' })).toHaveCount(0);
  const { step, total } = await replaySteps(duda.page);
  expect(step, 'o replay abre no começo').toBe(0);
  expect(total, 'a partida tem passos para ver').toBeGreaterThan(0);
  await expect(replayControl(duda.page, 'Passo anterior')).toHaveAttribute('aria-disabled', 'true');
  await expect(replayControl(duda.page, 'Próximo passo')).not.toHaveAttribute('aria-disabled', 'true');
  await axe(duda.page);

  await replayControl(duda.page, 'Próximo passo').click();
  await expect(replayCounter(duda.page)).toHaveText(`Passo 1 de ${total}`);
  await expect(replayControl(duda.page, 'Passo anterior')).not.toHaveAttribute('aria-disabled', 'true');
  await replayControl(duda.page, 'Passo anterior').click();
  await expect(replayCounter(duda.page)).toHaveText(`Passo 0 de ${total}`);

  // A lista: a partida da sala, com o resultado do assento dele, contra quem, "Sala <código>" e o botão "Rever".
  await duda.page.getByRole('link', { name: 'Voltar à lista' }).click();
  await expect(duda.page).toHaveURL(/\/partidas$/);
  await expect(duda.page.getByRole('heading', { name: 'Partidas anteriores' })).toBeFocused();
  const games = duda.page.getByRole('list').getByRole('listitem');
  await expect(games).toHaveCount(1);
  await expect(games.first()).toContainText('Vitória');
  await expect(games.first()).toContainText(`contra ${ana.name}`);
  await expect(games.first()).toContainText(`Sala ${code}`);
  await expect(games.first().getByRole('button', { name: 'Rever', exact: true })).toBeVisible();
  await axe(duda.page);

  // "Rever" abre a mesma partida, de novo no começo.
  await games.first().getByRole('button', { name: 'Rever', exact: true }).click();
  await expect(duda.page).toHaveURL(replayUrl);
  await expect(replayCounter(duda.page)).toHaveText(`Passo 0 de ${total}`);

  for (const player of players) player.console.expectClean();
});
