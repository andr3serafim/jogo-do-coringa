// E2E de celular (spec §9.2 item 2, §3.2): a entrada e a mesa em 390 × 844 (o projeto `mobile`) e em 360 × 740, sem rolagem de
// lado e com alvos de toque de pelo menos 44 px nos botões. A mesa vem do treino com semente, que não precisa de servidor para
// montar fileiras cheias (7 cartas por fileira cabem em 360 px).
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  ATTACK_BUTTON,
  axe,
  equipByUi,
  equipPanel,
  actionBar,
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

const TRAINING = '/treino?semente=e2e2631-1&nivel=medio';
const MIN_TARGET = 44;

/** Todo botão que `buttons` encontra tem pelo menos 44 × 44 px (`boundingBox`). Devolve quantos conferiu: zero seria uma conferência vazia. */
async function expectTouchTargets(buttons: Locator): Promise<number> {
  const found = await buttons.all();
  expect(found.length, 'há botões para conferir').toBeGreaterThan(0);
  for (const button of found) {
    const box = await button.boundingBox();
    const name = (await button.getAttribute('aria-label')) ?? (await button.innerText()).replaceAll('\n', ' ');
    expect(box, `"${name}" tem caixa`).not.toBeNull();
    expect(box!.width, `largura de "${name}"`).toBeGreaterThanOrEqual(MIN_TARGET - 0.5);
    expect(box!.height, `altura de "${name}"`).toBeGreaterThanOrEqual(MIN_TARGET - 0.5);
  }
  return found.length;
}

/**
 * O alvo do botão do cemitério (spec §3.2). O botão em si é só o texto "Cemitério 3": ele é esticado sobre a caixa inteira por um
 * `::after` (`after:inset-0`), e é a caixa que tem de medir pelo menos 44 × 44 px. A guarda é geométrica: a caixa mede o mínimo, e o
 * clique no centro, no desenho da carta de cima e perto dos quatro cantos cai no botão (`elementFromPoint`).
 */
async function expectGraveyardTarget(page: Page): Promise<void> {
  const target = await page.getByRole('button', { name: /^Cemitério / }).evaluate((button) => {
    const box = button.parentElement!;
    const rect = box.getBoundingClientRect();
    const inside = (x: number, y: number) => document.elementFromPoint(x, y) === button;
    const card = box.firstElementChild!.getBoundingClientRect();
    const margin = 3; // fora da borda de 1,5 px da caixa
    return {
      name: button.getAttribute('aria-label'),
      width: rect.width,
      height: rect.height,
      buttonWidth: button.getBoundingClientRect().width,
      hits: {
        centro: inside(rect.left + rect.width / 2, rect.top + rect.height / 2),
        carta: inside(card.left + card.width / 2, card.top + card.height / 2),
        cantoSuperiorEsquerdo: inside(rect.left + margin, rect.top + margin),
        cantoSuperiorDireito: inside(rect.right - margin, rect.top + margin),
        cantoInferiorEsquerdo: inside(rect.left + margin, rect.bottom - margin),
        cantoInferiorDireito: inside(rect.right - margin, rect.bottom - margin),
      },
    };
  });
  expect(target.width, `largura da caixa de "${target.name}"`).toBeGreaterThanOrEqual(MIN_TARGET - 0.5);
  expect(target.height, `altura da caixa de "${target.name}"`).toBeGreaterThanOrEqual(MIN_TARGET - 0.5);
  expect(target.buttonWidth, 'o botão é só o texto, menor que a caixa: o alvo vem do ::after').toBeLessThan(target.width);
  expect(target.hits, `onde o clique cai em "${target.name}"`).toEqual({
    centro: true,
    carta: true,
    cantoSuperiorEsquerdo: true,
    cantoSuperiorDireito: true,
    cantoInferiorEsquerdo: true,
    cantoInferiorDireito: true,
  });
}

for (const size of [
  { width: 390, height: 844 },
  { width: 360, height: 740 },
]) {
  test.describe(`${size.width} × ${size.height}`, () => {
    test.use({ viewport: size });

    test('a entrada: início, lobby e entrada na sala não rolam de lado e têm alvos de toque grandes', async ({ page, browser }) => {
      const guard = failOnConsoleErrors(page);

      await page.goto('/');
      await expect(page.getByRole('heading', { name: 'Jogo do Coringa' })).toBeVisible();
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(page.getByRole('main').getByRole('button'));
      await axe(page);

      await page.getByLabel('Seu apelido').fill('Ana');
      await page.getByRole('button', { name: 'Criar sala' }).click();
      await expect(page.getByRole('heading', { name: 'Sala de espera' })).toBeVisible();
      // O código grande (5xl, espaçado) e o link comprido são os candidatos a estourar a largura.
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(page.getByRole('main').getByRole('button'));
      await axe(page);

      // Quem recebe o link vê o formulário de entrada, no mesmo tamanho de tela.
      const link = await page.getByText(/^https?:\/\/.+\/s\/[A-Z0-9]{6}$/).innerText();
      const guestContext = await browser.newContext();
      try {
        const guest = await guestContext.newPage();
        const guestGuard = failOnConsoleErrors(guest);
        await guest.goto(link);
        await expect(guest.getByRole('heading', { name: /^Entrar na sala [A-Z0-9]{6}$/ })).toBeVisible();
        await expectNoHorizontalScroll(guest);
        await expectTouchTargets(guest.getByRole('main').getByRole('button'));
        await axe(guest);
        guestGuard.expectClean();
      } finally {
        await guestContext.close();
      }
      guard.expectClean();
    });

    test('a mesa: do Equipar à fileira cheia, sem rolagem de lado e com alvos de toque grandes na barra', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await page.goto(TRAINING);
      await expect(table(page)).toBeVisible();
      await expect(roundHeading(page)).toHaveText('Rodada 1');
      await expect(equipPanel(page)).toBeVisible();

      // O botão do menu e o do histórico são os dois botões fixos do cabeçalho do campo.
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(page.getByRole('button', { name: 'Menu da partida' }));
      await expectTouchTargets(page.getByRole('button', { name: /^Histórico/ }));
      // O Equipar: destinos, Desfazer e Recomeçar.
      await expectTouchTargets(equipPanel(page).getByRole('button'));
      await axe(page);
      await equipByUi(page);

      // Rodadas 2 e 3: o painel do Equipar e, depois, a barra de ataque.
      await expect(roundHeading(page)).toHaveText('Rodada 2');
      await expectTouchTargets(equipPanel(page).getByRole('button'));
      await equipByUi(page);
      await expect(roundHeading(page)).toHaveText('Rodada 3');
      await expect(actionBar(page).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
      await expectTouchTargets(actionBar(page).getByRole('button'));
      await expectGraveyardTarget(page); // vazio: "Cemitério vazio"
      await expectNoHorizontalScroll(page);
      await axe(page);

      // Até a rodada 5: a fileira de Ataque tem 6 cartas e a escolha da ordem é sua.
      await playUntil(page, async (p) => (await roundNumber(p).catch(() => 0)) >= 5, { order: 'wait' });
      const first = orderPanel(page).getByRole('button', { name: 'Atacar primeiro' });
      await expect(first).toBeVisible();
      // O foco no painel cancela a confirmação automática de 3 s (spec §3.6): sem isso a ordem sairia no meio das medidas.
      await first.focus();
      await expect(page.getByRole('group', { name: 'Sua fileira de ataque' }).locator('[data-card-id]')).toHaveCount(6);
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(orderPanel(page).getByRole('button'));
      await expectGraveyardTarget(page); // com cartas: "Cemitério 3, a de cima é ..."
      await axe(page);

      // A fileira de Ataque cheia (8 cartas, o limite desde o sub-projeto 5): a mesa mais larga, e nada rola de lado.
      await first.click();
      const attackRow = page.getByRole('group', { name: 'Sua fileira de ataque' }).locator('[data-card-id]');
      await playUntil(page, async () => (await attackRow.count()) >= 8, { order: 'wait' });
      await expect(attackRow).toHaveCount(8);
      await expectNoHorizontalScroll(page);
      await axe(page);

      // O menu abre por cima da mesa e também cabe.
      const menu = await openMenu(page);
      await expectNoHorizontalScroll(page);
      await expectTouchTargets(menu.getByRole('button'));
      await axe(page);

      // O resumo das regras é o diálogo com mais texto: abre por cima do menu, cabe na largura e não rola de lado (spec §7).
      await menu.getByRole('button', { name: 'Resumo das regras' }).click();
      const rules = page.getByRole('dialog', { name: 'Resumo das regras' });
      await expect(rules).toBeVisible();
      await expectNoHorizontalScroll(page);
      const box = await rules.evaluate((el) => {
        const rect = el.getBoundingClientRect();
        return { scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, left: rect.left, right: rect.right, window: window.innerWidth };
      });
      expect(box.scrollWidth, 'o resumo das regras não rola de lado').toBeLessThanOrEqual(box.clientWidth);
      expect(box.left, 'o resumo das regras começa dentro da janela').toBeGreaterThanOrEqual(0);
      expect(box.right, 'o resumo das regras termina dentro da janela').toBeLessThanOrEqual(box.window);
      await expectTouchTargets(rules.getByRole('button'));
      await axe(page);
      guard.expectClean();
    });
  });
}

test.describe('celular baixo, 360 × 640', () => {
  test.use({ viewport: { width: 360, height: 640 } });

  test('na sua vez de atacar, a sua fileira de Ataque, a Defesa do Bot (o alvo) e o botão principal ficam à vista', async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    await page.goto(TRAINING);
    await expect(table(page)).toBeVisible();
    await equipByUi(page);
    await expect(roundHeading(page)).toHaveText('Rodada 2');

    // O Equipar rola os campos até a carta posta. Antes de confirmar, eles voltam ao topo (como depois de recarregar a página):
    // é a chegada da vez de atacar que tem de trazer as fileiras.
    const panel = equipPanel(page);
    await expect(panel.getByText('Faltam 2 cartas')).toBeVisible();
    for (const left of ['Faltam 2 cartas', 'Falta 1 carta']) {
      await expect(panel.getByText(left)).toBeVisible();
      await panel.getByRole('list', { name: 'Destinos' }).getByRole('button').first().click();
    }
    await page.evaluate(() => {
      document.querySelector('section[aria-label="Seu campo"]')!.parentElement!.scrollTop = 0;
    });
    await panel.getByRole('button', { name: 'Confirmar', exact: true }).click();

    await expect(roundHeading(page)).toHaveText('Rodada 3');
    const attack = actionBar(page).getByRole('button', { name: ATTACK_BUTTON });
    await expect(attack).toBeEnabled();
    await expectWhollyInView(page, {
      'a sua fileira de Ataque': page.getByRole('group', { name: 'Sua fileira de ataque' }),
      'a fileira de Defesa do Bot': page.getByRole('group', { name: 'Fileira de defesa de Bot' }),
      'o botão Atacar': attack,
    });
    await expectNoHorizontalScroll(page);
    guard.expectClean();
  });
});

test('a gaveta do histórico fechada não deixa parada de Tab invisível, e aberta o teclado alcança a lista', async ({ page }) => {
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  await expect(equipPanel(page)).toBeVisible();

  const stopHere = (p: Page) =>
    p.evaluate(() => {
      const el = document.activeElement;
      if (!el || el === document.body) return null;
      const box = el.getBoundingClientRect();
      return {
        what: el.getAttribute('aria-label') ?? el.textContent?.trim().slice(0, 30) ?? el.tagName,
        inHistory: el.closest('aside[aria-label="Histórico da partida"]') !== null,
        seen: box.width > 1 && box.height > 1 && getComputedStyle(el).visibility !== 'hidden',
      };
    });

  // Um giro inteiro do Tab (e mais um pouco): nenhuma parada dentro da gaveta fechada, e todas elas à vista.
  const stops: string[] = [];
  for (let i = 0; i < 40; i += 1) {
    await page.keyboard.press('Tab');
    const stop = await stopHere(page);
    if (stop === null) continue;
    expect(stop.inHistory, `parada dentro da gaveta fechada: "${stop.what}"`).toBe(false);
    expect(stop.seen, `parada invisível: "${stop.what}"`).toBe(true);
    stops.push(stop.what);
  }
  expect(new Set(stops).size, 'o Tab passou por vários controles da mesa').toBeGreaterThan(3);

  // Aberta, a gaveta é o único lugar do Tab com "Fechar" e a lista rolável (focável por causa da rolagem).
  const toggle = page.getByRole('button', { name: /^Histórico/ });
  await toggle.click();
  const drawer = page.getByRole('complementary', { name: 'Histórico da partida' });
  await expect(drawer.getByRole('button', { name: 'Fechar o histórico' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(drawer.getByRole('region', { name: 'Linhas do histórico' })).toBeFocused();
  await axe(page);

  // Esc fecha, o foco volta ao botão do cabeçalho, e a gaveta fechada segue sem paradas.
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  for (let i = 0; i < 12; i += 1) {
    await page.keyboard.press('Tab');
    const stop = await stopHere(page);
    expect(stop?.inHistory ?? false, `parada dentro da gaveta fechada: "${stop?.what}"`).toBe(false);
  }
});
