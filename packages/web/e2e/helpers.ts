// Peças dos testes E2E (spec §9.2): o guarda de console (inclusive CSP), a conferência de rolagem lateral, o axe, a queda
// controlada do WebSocket e o jogador que reage à tela.
//
// O sorteio online não é controlável pela interface (e, mesmo com a semente do servidor de teste, os prazos correm no
// relógio real), então nada aqui conta cartas: o que o jogador faz vem do que a tela oferece.
import AxeBuilder from '@axe-core/playwright';
import { expect, type Locator, type Page, type WebSocketRoute } from '@playwright/test';

// ---------------------------------------------------------------------------------------------
// Console, rolagem e acessibilidade

export interface ConsoleGuard {
  /** O que o navegador reportou como erro até agora (console, exceção da página e violação de CSP, que o Chromium registra como erro). */
  readonly errors: readonly string[];
  /** Falha o teste se houve algum erro. */
  expectClean(): void;
}

/** Junta os erros do console e as exceções da página; `expectClean()` no fim (ou em cada passo) falha com a lista. */
export function failOnConsoleErrors(page: Page): ConsoleGuard {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console.error: ${message.text()}`);
  });
  page.on('pageerror', (error) => {
    errors.push(`pageerror: ${error.message}`);
  });
  return {
    errors,
    expectClean: () => expect(errors, 'erros no console do navegador').toEqual([]),
  };
}

/**
 * A página não rola de lado: nem o documento, nem o `<main>` (a mesa corta o excesso com `overflow-x: hidden`, que esconderia a
 * rolagem do documento), e nenhuma carta de fileira passa da borda da janela.
 */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const doc = document.documentElement;
    const main = document.querySelector('main');
    const outside = [...document.querySelectorAll<HTMLElement>('[data-card-id]')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && (rect.right > doc.clientWidth + 0.5 || rect.left < -0.5);
      })
      .map((el) => el.getAttribute('aria-label') ?? el.dataset.cardId ?? '?');
    return {
      width: doc.clientWidth,
      document: doc.scrollWidth - doc.clientWidth,
      body: document.body.scrollWidth - doc.clientWidth,
      main: main ? main.scrollWidth - main.clientWidth : 0,
      outside,
    };
  });
  expect(overflow, 'rolagem lateral').toEqual({ width: overflow.width, document: 0, body: 0, main: 0, outside: [] });
}

/** O axe sobre a tela aberta: nenhuma violação `serious` ou `critical` (spec §7). */
export async function axe(page: Page): Promise<void> {
  // As batidas (opacidade, movimento) mudam o contraste que o axe calcula: ele olha a tela parada.
  await page.waitForFunction(() => document.getAnimations().length === 0, undefined, { timeout: 5_000 });
  // `label-content-name-mismatch` (WCAG 2.5.3, "Rótulo no nome") fica de fora de propósito: o axe exige que o texto VISÍVEL do botão
  // seja um trecho contínuo do nome acessível, e três padrões da mesa foram desenhados de outro jeito (spec §7): a carta da mão
  // ("Q de ouros, Buff de defesa", com "Q" e "Buff de defesa" na face), o botão de duas linhas (nome = título, detalhe = descrição)
  // e o cemitério. Mudar o nome deles reescreve a interface e os testes de componentes: é decisão do autor (registrada no relatório
  // da Tarefa 25). Todas as outras regras `serious` e `critical`, inclusive contraste, continuam valendo.
  const { violations } = await new AxeBuilder({ page }).disableRules(['label-content-name-mismatch']).analyze();
  const blocking = violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => {
      const where = violation.nodes.map((node) => `${node.target.join(' ')} ${node.html.slice(0, 200)}`).join(' || ');
      return `${violation.impact}: ${violation.id} (${violation.help}) em ${where}`;
    });
  expect(blocking, 'violações de acessibilidade').toEqual([]);
}

// ---------------------------------------------------------------------------------------------
// Lugares da tela

export const table = (page: Page): Locator => page.getByRole('main', { name: 'Mesa' });
export const band = (page: Page): Locator => page.getByRole('region', { name: 'Situação da rodada' });
export const roundHeading = (page: Page): Locator => band(page).getByRole('heading', { name: /^Rodada \d+$/ });
export const equipPanel = (page: Page): Locator => page.getByRole('region', { name: 'Equipar' });
export const actionBar = (page: Page): Locator => page.getByRole('region', { name: 'Ações' });
export const orderPanel = (page: Page): Locator => page.getByRole('region', { name: 'Escolha da ordem' });
/** O painel de fim da partida (o único `<dialog>` aberto nessa hora). */
export const endPanel = (page: Page): Locator => page.getByRole('dialog').filter({ hasText: 'Fim da partida' });
/** O botão do menu que está à vista (há um no cabeçalho do oponente, no celular, e outro no histórico, no PC). */
export const menuButton = (page: Page): Locator => page.getByRole('button', { name: 'Menu da partida' });

/**
 * Abre o menu da partida. Um toque na mesa durante as batidas só as pula e não vira clique (spec §4.1: o gesto que pulou não aciona o
 * botão que estava embaixo), então o clique que cai numa batida é refeito até o diálogo abrir. O jogador de verdade faz o mesmo.
 */
export async function openMenu(page: Page): Promise<Locator> {
  const menu = page.getByRole('dialog', { name: 'Menu da partida' });
  await expect(async () => {
    await menuButton(page).click();
    await expect(menu).toBeVisible({ timeout: 1_500 });
  }).toPass();
  return menu;
}

/** O número da rodada que a faixa central mostra. */
export async function roundNumber(page: Page): Promise<number> {
  const text = await roundHeading(page).innerText();
  return Number(/\d+/.exec(text)?.[0]);
}

/** Os ids das cartas da sua mão, na ordem: identifica a mão sem depender de quais cartas vieram no sorteio. */
export function handIds(page: Page): Promise<string[]> {
  return page.getByRole('list', { name: 'Sua mão' }).locator('[data-card-id]').evaluateAll((cards) => cards.map((card) => (card as HTMLElement).dataset.cardId ?? ''));
}

// ---------------------------------------------------------------------------------------------
// Jogar pela interface

/**
 * Equipar pelos destinos oferecidos (o primeiro de cada carta) e Confirmar. Quem não recebeu numéricas não tem o que
 * confirmar: o servidor envia o Equipar vazio por ele. Devolve quantas cartas foram montadas.
 */
export async function equipByUi(page: Page): Promise<number> {
  const panel = equipPanel(page);
  const destinations = panel.getByRole('list', { name: 'Destinos' });
  const none = panel.getByText('Você não recebeu numéricas nesta rodada');
  await expect(destinations.or(none)).toBeVisible();
  if (await none.isVisible()) return 0;

  const total = Number(/Carta 1 de (\d+)/.exec(await panel.innerText())?.[1]);
  expect(total, 'o painel do Equipar diz quantas cartas faltam montar').toBeGreaterThan(0);
  for (let placed = 0; placed < total; placed += 1) {
    await expect(panel.getByText(`Carta ${placed + 1} de ${total}`)).toBeVisible();
    await destinations.getByRole('button').first().click();
  }
  await panel.getByRole('button', { name: 'Confirmar', exact: true }).click();
  return total;
}

/**
 * A janela de reação, do lado de quem responde: ou o passe automático (só `PASS` legal: a barra diz "passando"), ou ele
 * passa à mão (há resposta possível, e a barra oferece "Passar"). Devolve qual dos dois aconteceu.
 */
export async function answerReaction(page: Page): Promise<'auto' | 'manual'> {
  const bar = actionBar(page);
  const auto = bar.getByText('Sem resposta possível; passando');
  const pass = bar.getByRole('button', { name: 'Passar', exact: true });
  // O botão aparece no primeiro desenho e some assim que o passe automático sai (a barra passa a dizer "passando").
  await expect(auto.or(pass)).toBeVisible();
  if (await auto.waitFor({ timeout: 2_000 }).then(() => true, () => false)) return 'auto';
  await pass.click();
  return 'manual';
}

export interface PlayOptions {
  /** Tempo máximo até o predicado ficar verdadeiro (padrão 60 s). */
  timeoutMs?: number;
  /** Na escolha da ordem: `click` escolhe a primeira oferta (padrão); `wait` deixa a confirmação automática agir. */
  order?: 'click' | 'wait';
}

/** Uma jogada oferecida agora pela interface, a primeira de cada painel, ou `null` se não há nenhuma. Erros de clique (o botão sumiu) contam como nenhuma. */
async function playOnce(page: Page, options: PlayOptions): Promise<string | null> {
  const attempt = async (name: string, button: Locator): Promise<string | null> => {
    if (!(await button.isVisible()) || !(await button.isEnabled())) return null;
    return button.click({ timeout: 2_000 }).then(() => name, () => null);
  };

  const equip = equipPanel(page);
  const destination = equip.getByRole('list', { name: 'Destinos' }).getByRole('button').first();
  const confirm = equip.getByRole('button', { name: 'Confirmar', exact: true });
  const order = orderPanel(page).getByRole('button').first();
  const bar = actionBar(page);
  const pass = bar.getByRole('button', { name: 'Passar', exact: true });
  const attack = bar.getByRole('button', { name: 'Atacar', exact: true });
  const endTurn = bar.getByRole('button', { name: 'Encerrar turno', exact: true });

  return (
    (await attempt('destino do Equipar', destination)) ??
    (await attempt('Confirmar o Equipar', confirm)) ??
    (options.order === 'wait' ? null : await attempt('ordem', order)) ??
    (await attempt('Passar', pass)) ??
    (await attempt('Atacar', attack)) ??
    (await attempt('Encerrar turno', endTurn))
  );
}

/**
 * Joga escolhendo a primeira jogada que a interface oferece até `predicate` ficar verdadeiro. Não conta cartas nem supõe o
 * sorteio: se ninguém tem o que fazer (a vez é do oponente), espera. Falha, com o resumo da faixa central, se estourar o prazo.
 */
export async function playUntil(page: Page, predicate: (page: Page) => Promise<boolean>, options: PlayOptions = {}): Promise<void> {
  const deadline = Date.now() + (options.timeoutMs ?? 60_000);
  let lastMove = 'nada ainda';
  while (!(await predicate(page))) {
    if (Date.now() > deadline) {
      const where = await band(page).innerText().catch(() => '(sem faixa central)');
      throw new Error(`playUntil: o predicado não ficou verdadeiro a tempo. Última jogada: ${lastMove}. Faixa central: ${where.replaceAll('\n', ' | ')}`);
    }
    const move = await playOnce(page, options);
    if (move === null) await page.waitForTimeout(100);
    else lastMove = move;
  }
}

// ---------------------------------------------------------------------------------------------
// Queda controlada da conexão

export interface SocketControl {
  /** Derruba a conexão aberta dos dois lados e recusa as seguintes (a página fica "sem rede") até `release()`. */
  drop(): Promise<void>;
  /** Volta a deixar as conexões novas passarem direto ao servidor. */
  release(): void;
}

/**
 * Põe a conexão da sala da página sob controle. O `context.setOffline(true)` do Chromium NÃO derruba um WebSocket já aberto
 * (conferido no Playwright 1.64: nenhum `close` e nenhum "Reconectando…" em 8 s), então a queda é feita pelo `routeWebSocket`:
 * `drop()` fecha a conexão (1011, que o cliente trata como queda e reconecta) e as tentativas seguintes são fechadas na hora
 * até `release()`. Precisa ser chamado antes de a página abrir a sala.
 */
export async function controlSocket(page: Page): Promise<SocketControl> {
  let blocked = false;
  let live: { toPage: WebSocketRoute; toServer: WebSocketRoute } | null = null;
  await page.routeWebSocket(/\/api\/rooms\/[A-Z0-9]+\/ws$/, (route) => {
    if (blocked) {
      void route.close({ code: 1011, reason: 'e2e: sem rede' });
      return;
    }
    live = { toPage: route, toServer: route.connectToServer() };
  });
  return {
    async drop() {
      blocked = true;
      const open = live;
      live = null;
      if (open === null) throw new Error('controlSocket: não há conexão aberta para derrubar');
      await open.toPage.close({ code: 1011, reason: 'e2e: queda' });
      await open.toServer.close();
    },
    release() {
      blocked = false;
    },
  };
}
