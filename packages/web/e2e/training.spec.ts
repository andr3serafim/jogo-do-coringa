// E2E do treino (spec §2.6, §9.2 item 3) e da mesa em situações que o sorteio online não deixa fixar: sem servidor e com semente,
// a partida contra o bot é sempre a mesma. Aqui entram também as conferências de navegador real que o jsdom não faz: algarismos
// tabulares, foco preso nos diálogos, o menu a ~960 px e a mesa num PC de pouca altura.
import { expect, test, type Locator, type Page } from '@playwright/test';
import {
  actionBar,
  ATTACK_BUTTON,
  axe,
  band,
  equipByUi,
  equipPanel,
  failOnConsoleErrors,
  menuButton,
  openDialog,
  openMenu,
  orderPanel,
  playUntil,
  roundHeading,
  roundNumber,
  table,
} from './helpers.ts';

/** Treino com semente fixa: a distribuição, as jogadas do bot e os danos são sempre os mesmos. */
const TRAINING = '/treino?semente=e2e-1';

const history = (page: Page) => page.getByRole('complementary', { name: 'Histórico da partida' });
const lives = async (page: Page) => (await page.locator('[data-hp]').allInnerTexts()).map(Number);

test('treino: três rodadas determinísticas pela interface, sem relógio', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  await expect(roundHeading(page)).toHaveText('Rodada 1');
  await expect(band(page)).toContainText('Treino, sem relógio');
  await expect(page.getByRole('timer')).toHaveCount(0);
  expect(await lives(page), 'vida do Bot e a sua').toEqual([300, 300]);

  // Rodada 1 e 2 (Equipar): quantas numéricas vêm é da semente.
  await expect(equipPanel(page)).toContainText('Carta 1 de 3');
  await axe(page);
  expect(await equipByUi(page)).toBe(3);
  await expect(roundHeading(page)).toHaveText('Rodada 2');
  await expect(equipPanel(page)).toContainText('Carta 1 de 2');
  expect(await equipByUi(page)).toBe(2);
  await expect(roundHeading(page)).toHaveText('Rodada 3');
  await expect(history(page)).toContainText('Bot confirmou o Equipar');

  // Rodada 3 (Ataque): o Bot tem a iniciativa e escolhe atacar em segundo; você ataca primeiro. Sem passe automático no treino:
  // quem joga a reação é o jogador ou o bot, e o treino segue pelos botões que a tela oferece.
  await expect(history(page)).toContainText('Bot escolheu atacar em segundo');
  await expect(actionBar(page).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  await axe(page);
  await playUntil(page, async (p) => (await roundNumber(p).catch(() => 0)) >= 4, { order: 'wait' });
  await expect(history(page)).toContainText('Ataque de você: 27 contra 3 → 24 de dano');
  await expect(history(page)).toContainText('Ataque de Bot: 17 contra 0 → 17 de dano');
  await expect.poll(() => lives(page)).toEqual([276, 283]);

  guard.expectClean();
});

test('axe em cada estado da mesa: mão, Reflect, janela de reação, cemitério (com o chip e o diálogo) e a mão com J, Q e K', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  // As numéricas da rodada 1 vão para a Defesa: o ataque do Bot na rodada 3 gasta uma delas, que vai ao cemitério por mão dele, e é
  // isso que acende o chip "novo" no cemitério (o que sai do seu campo por ataque seu, o Ataque Absoluto incluído, não fica marcado).
  await equipByUi(page, /Defesa/);
  await expect(roundHeading(page)).toHaveText('Rodada 2');
  await equipByUi(page);
  await expect(roundHeading(page)).toHaveText('Rodada 3');
  const hand = page.getByRole('list', { name: 'Sua mão' });

  // Rodada 3, sua vez: a mão (Q, K e o Selvagem) em botões, "Lançar Reflect" (K + Selvagem + Q) e o botão principal, de duas linhas.
  const attack = actionBar(page).getByRole('button', { name: ATTACK_BUTTON });
  await expect(attack).toBeEnabled();
  await expect(actionBar(page).getByRole('button', { name: /^Lançar Reflect / })).toBeVisible();
  await expect(hand.getByRole('button', { name: /^Q, Buff de defesa, de / })).toBeVisible();
  await expect(hand.getByRole('button', { name: /^K, Guarda, de / })).toBeVisible();
  await axe(page);
  await attack.click();

  // A janela de reação: o Bot declara o ataque dele (sem relógio, sem passe automático) e a barra oferece "Passar".
  await expect(page.locator('[data-gatilho]')).toBeVisible();
  const pass = actionBar(page).getByRole('button', { name: 'Passar', exact: true });
  await expect(pass).toBeEnabled();
  await axe(page);
  await pass.click();

  // Rodada 4: o cemitério já tem cartas (as que saíram das fileiras) e o chip "novo" (o mouse não passou por ele). Depois, o diálogo.
  await expect(roundHeading(page)).toHaveText('Rodada 4');
  const graveyard = page.getByRole('button', { name: /^Cemitério \d+, novo, a de cima é / });
  await expect(graveyard).toHaveText(/^Cemitério \d+ novo$/);
  await axe(page);
  const dialog = await openDialog(graveyard, page.getByRole('dialog', { name: 'Cemitério' }));
  await axe(page);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('button', { name: /^Cemitério \d+, a de cima é / })).toBeVisible();

  // Rodada 5: a escolha da ordem é sua (o foco no painel cancela a confirmação de 3 s e deixa a tela parada para o axe), e depois a mão
  // tem J, Q, K e o Selvagem, de novo em botões.
  await equipByUi(page);
  await expect(roundHeading(page)).toHaveText('Rodada 5');
  const first = orderPanel(page).getByRole('button', { name: 'Atacar primeiro' });
  await expect(first).toBeVisible();
  await first.focus();
  await axe(page);
  await first.click();
  await expect(attack).toBeEnabled();
  await expect(hand.getByRole('button', { name: /^J, Buff de ataque, de / })).toBeVisible();
  await expect(hand.getByRole('button', { name: /^Q, Buff de defesa, de / })).toBeVisible();
  await expect(hand.getByRole('button', { name: /^K, Guarda, de / })).toBeVisible();
  await axe(page);
  guard.expectClean();
});

test('algarismos tabulares: a largura de "111" é a de "888" na vida e nos totais das fileiras (tnum da fonte)', async ({ page }) => {
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  // Mede com a fonte de texto já carregada, e confere que é mesmo a Archivo (uma fonte de reserva daria um "passa" sem sentido).
  const measured = await page.evaluate(async () => {
    await document.fonts.ready;
    const archivo = [...document.fonts].filter((face) => face.family.includes('Archivo') && face.status === 'loaded').length;
    const widthOf = (selector: string, text: string): { family: string; width: number } => {
      const sample = document.querySelector(selector);
      if (!sample?.parentElement) throw new Error(`sem ${selector} na mesa`);
      const probe = sample.cloneNode() as HTMLElement;
      probe.removeAttribute('data-hp');
      probe.removeAttribute('data-total');
      probe.textContent = text;
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      sample.parentElement.append(probe);
      const rect = probe.getBoundingClientRect();
      const family = getComputedStyle(probe).fontFamily;
      probe.remove();
      return { family, width: rect.width };
    };
    return {
      archivo,
      life: [widthOf('[data-hp]', '111'), widthOf('[data-hp]', '888')],
      total: [widthOf('[data-total]', '111'), widthOf('[data-total]', '888')],
    };
  });
  expect(measured.archivo, 'a Archivo carregou').toBeGreaterThan(0);
  for (const pair of [measured.life, measured.total]) {
    expect(pair[0]!.family).toContain('Archivo');
    expect(pair[0]!.width).toBeGreaterThan(0);
    expect(pair[0]!.width).toBeCloseTo(pair[1]!.width, 1);
  }
});

test.describe('diálogos', () => {
  test('o foco fica preso no menu e no resumo das regras: Tab e Shift+Tab nunca chegam à mesa', async ({ page }) => {
    await page.goto(TRAINING);
    await expect(table(page)).toBeVisible();

    /**
     * Aperta a tecla `presses` vezes e confere que o foco nunca para num elemento FORA do diálogo de cima (a mesa, por exemplo). O
     * Chromium deixa o Tab passar do último controle de um diálogo modal para a interface do navegador (`document.activeElement` vira o
     * corpo da página) e o traz de volta ao primeiro: isso vale uma vez seguida, nunca duas. Devolve os controles distintos que o
     * foco visitou DENTRO do diálogo: um diálogo com o foco parado num só botão não prova nada, então quem chama confere que foram vários.
     */
    const stayInside = async (key: 'Tab' | 'Shift+Tab', presses: number): Promise<Set<string>> => {
      const visited = new Set<string>();
      let onBody = 0;
      for (let i = 0; i < presses; i += 1) {
        await page.keyboard.press(key);
        const where = await page.evaluate(() => {
          // O diálogo de cima é o último aberto (o resumo das regras é irmão do menu, aberto depois dele).
          const open = [...document.querySelectorAll('dialog[open]')].at(-1);
          const active = document.activeElement;
          if (!active || active === document.body) return { body: true, inside: false, what: 'o corpo da página' };
          const what = `${active.tagName.toLowerCase()} "${active.getAttribute('aria-label') ?? active.textContent?.trim().slice(0, 30) ?? ''}"`;
          return { body: false, inside: open?.contains(active) === true, what };
        });
        onBody = where.body ? onBody + 1 : 0;
        expect(onBody, `${key} #${i + 1}: o foco ficou fora da página por mais de um Tab`).toBeLessThanOrEqual(1);
        if (!where.body) {
          expect(where.inside, `${key} #${i + 1}: o foco foi para ${where.what}, fora do diálogo`).toBe(true);
          visited.add(where.what);
        }
      }
      return visited;
    };

    const menu = await openMenu(page);
    expect((await stayInside('Tab', 12)).size, 'o Tab percorre os controles do menu').toBeGreaterThanOrEqual(2);
    expect((await stayInside('Shift+Tab', 12)).size, 'o Shift+Tab também').toBeGreaterThanOrEqual(2);

    await page.getByRole('button', { name: 'Resumo das regras' }).click();
    const rules = page.getByRole('dialog', { name: 'Resumo das regras' });
    await expect(rules).toBeVisible();
    expect((await stayInside('Tab', 12)).size, 'o Tab percorre os controles do resumo').toBeGreaterThanOrEqual(2);
    expect((await stayInside('Shift+Tab', 12)).size, 'o Shift+Tab também').toBeGreaterThanOrEqual(2);
    await axe(page);

    // Esc fecha o de cima e o foco volta ao botão que o abriu.
    await page.keyboard.press('Escape');
    await expect(rules).toBeHidden();
    await expect(page.getByRole('button', { name: 'Resumo das regras' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(menuButton(page)).toBeFocused();
  });
});

test.describe('largura de tablet, ~960 px', () => {
  test.use({ viewport: { width: 960, height: 700 } });

  test('o menu abre pelo botão do campo e chega a "Desistir" e ao "Resumo das regras"', async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    await page.goto(TRAINING);
    await expect(table(page)).toBeVisible();
    // Abaixo de 1024 px o histórico é uma gaveta e o menu mora no cabeçalho do campo do oponente (não na coluna do histórico).
    await expect(history(page).getByRole('button', { name: 'Menu da partida' })).toBeHidden();
    const button = menuButton(page);
    await expect(button).toHaveCount(1);
    await expect(button).toBeVisible();
    const menu = await openMenu(page);
    const concede = menu.getByRole('button', { name: 'Desistir', exact: true });
    await concede.scrollIntoViewIfNeeded();
    await expect(concede).toBeInViewport();
    await menu.getByRole('button', { name: 'Resumo das regras' }).click();
    await expect(page.getByRole('dialog', { name: 'Resumo das regras' })).toBeVisible();
    await page.keyboard.press('Escape');

    await concede.click();
    await expect(page.getByRole('dialog', { name: 'Desistir da partida?' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar' }).click();
    await expect(menu).toBeVisible();
    guard.expectClean();
  });
});

/**
 * Espera a mesa parar (sem batida e sem animação com fim) e confere que cada lugar está À VISTA POR INTEIRO na janela: o
 * `toBeInViewport()` padrão aceita qualquer pedaço, e a vida cortada ao meio no topo da tela passaria.
 */
async function expectWhollyInView(page: Page, places: Record<string, Locator>): Promise<void> {
  await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1);
  await page.waitForFunction(() => document.getAnimations().every((animation) => animation.effect?.getComputedTiming().iterations === Infinity));
  const height = page.viewportSize()!.height;
  for (const [what, place] of Object.entries(places)) {
    const box = await place.boundingBox();
    expect(box, `${what} está desenhado`).not.toBeNull();
    // 1 px de folga para o arredondamento do navegador.
    expect(box!.y, `o topo de ${what} está na janela`).toBeGreaterThanOrEqual(-1);
    expect(box!.y + box!.height, `o pé de ${what} está na janela`).toBeLessThanOrEqual(height + 1);
  }
}

// Notebooks comuns: 1366×768 (janela de 657 px), 1440×900 (800 px) e 1920×1080 a 125% (730 px). Na sua vez o foco vai para o
// painel de baixo, e a mesa não pode rolar a vida e o nome do oponente nem o botão do menu para fora da vista.
for (const size of [
  { width: 1366, height: 657 },
  { width: 1440, height: 800 },
  { width: 1536, height: 730 },
]) {
  test.describe(`PC de pouca altura, ${size.width} × ${size.height}`, () => {
    test.use({ viewport: size });

    test('na sua vez (Equipar, Ataque e reação) a vida e o nome do oponente, o menu, a mão e o botão principal ficam à vista', async ({ page }) => {
      const guard = failOnConsoleErrors(page);
      await page.goto(TRAINING);
      await expect(table(page)).toBeVisible();
      const opponent = page.getByRole('region', { name: 'Campo de Bot' });
      const top = {
        'a vida do oponente': opponent.locator('[data-hp]'),
        'o nome do oponente': opponent.getByRole('heading', { name: 'Bot' }),
        'o botão do menu': menuButton(page),
      };
      const hand = page.getByRole('list', { name: 'Sua mão' });

      // Rodada 1, Equipar: o painel com os destinos.
      await expect(equipPanel(page).getByText('Carta 1 de 3')).toBeVisible();
      const destinations = equipPanel(page).getByRole('list', { name: 'Destinos' });
      await expectWhollyInView(page, { ...top, 'a mão': hand, 'os destinos do Equipar': destinations });
      // A página em si nunca rola.
      expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight)).toBe(0);
      await equipByUi(page);
      await expect(roundHeading(page)).toHaveText('Rodada 2');

      // O menu abre sem rolar nada.
      const menu = await openMenu(page);
      await page.keyboard.press('Escape');
      await expect(menu).toBeHidden();
      await equipByUi(page);

      // Rodada 3, Ataque: a mão e o botão principal, com a prévia.
      await expect(roundHeading(page)).toHaveText('Rodada 3');
      const attack = actionBar(page).getByRole('button', { name: ATTACK_BUTTON });
      await expect(attack).toBeEnabled();
      await expectWhollyInView(page, { ...top, 'a mão': hand, 'o botão Atacar': attack });
      await attack.click();

      // A janela de reação ao ataque do Bot: o gatilho com a prévia e o Passar.
      await expect(page.locator('[data-gatilho]')).toBeVisible();
      const pass = actionBar(page).getByRole('button', { name: 'Passar', exact: true });
      await expect(pass).toBeEnabled();
      await expectWhollyInView(page, { ...top, 'a mão': hand, 'o gatilho da reação': page.locator('[data-gatilho]'), 'o Passar': pass });
      await axe(page);
      guard.expectClean();
    });
  });
}
