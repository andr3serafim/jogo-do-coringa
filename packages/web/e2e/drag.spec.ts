// E2E de arrastar cartas (spec do polimento §6, fatia 5): no treino, sem servidor e com semente, a mão do Equipar 1 traz J, K e A, e a
// carta numérica da vez é um 7. O arrasto é um caminho a MAIS (WCAG 2.5.7): os botões e o teclado seguem valendo, e aqui só se
// confere, no navegador de verdade, o que o jsdom não faz: o ponteiro real, a zona sob o dedo (`elementFromPoint`), o `touch-action`,
// o clique que o navegador manda depois do gesto e o que a página faz com o dedo (a mesa inteira não rola, os campos rolam).
//
// Os dois projetos rodam estes testes (PC e celular), com o mouse do Playwright; o projeto do celular (390 × 844, com toque) também
// roda os de toque de verdade, que mandam os eventos de toque pelo CDP (`Input.dispatchTouchEvent`): é o Chromium que decide, pelo
// `touch-action`, se o gesto vira rolagem (e cancela o ponteiro) ou chega ao arrasto.
import { expect, test, type CDPSession, type Locator, type Page } from '@playwright/test';
import { actionBar, ATTACK_BUTTON, axe, equipByUi, equipPanel, expectNoHorizontalScroll, failOnConsoleErrors, orderPanel, roundHeading, table } from './helpers.ts';

/** O tutorial sem o painel da dica: a mão do Equipar 1 vem com J, K e A, e a iniciativa da rodada 3 é sua. */
const TRAINING = '/treino?semente=tutorial-132&nivel=facil';

// As zonas de soltura (`data-soltar`, `model/drag.ts`).
const ZONE = {
  guard: '[data-soltar="guarda"]',
  attackBuffs: '[data-soltar="buffs:ATK"]',
  defenseBuffs: '[data-soltar="buffs:DEF"]',
} as const;

const hand = (page: Page): Locator => page.getByRole('list', { name: 'Sua mão' });
const handCard = (page: Page, name: RegExp): Locator => hand(page).getByRole('button', { name });
const K = /^K, Guarda, de /;
const J = /^J, Buff de ataque, de /;
const Q = /^Q, Buff de defesa, de /;
/** A Armadilha: sem alvo (o oponente não tem J, Q nem K em campo), não tem jogada e não arrasta. */
const TRAP = /^A, Armadilha, de /;
const myField = (page: Page): Locator => page.getByRole('region', { name: 'Seu campo' });
const myGuard = (page: Page): Locator => myField(page).getByRole('list', { name: 'Guarda' });
const myRow = (page: Page, kind: 'ATK' | 'DEF'): Locator => page.getByRole('group', { name: kind === 'ATK' ? 'Sua fileira de ataque' : 'Sua fileira de defesa' });
/** O fantasma da carta no ar: um clone numa camada fixa do `body`, só desenho. */
const ghost = (page: Page): Locator => page.locator('[data-fantasma]');
/** As zonas marcadas como destino possível enquanto a carta está no ar. */
const valid = (page: Page): Locator => page.locator('[data-soltar-ativo]');
const under = (page: Page): Locator => page.locator('[data-soltar-sob]');
const pressed = (card: Locator): Promise<string | null> => card.getAttribute('aria-pressed');

interface Point {
  x: number;
  y: number;
}

/**
 * Um ponto de `target` que de fato o acerta (`elementFromPoint`): a mão cobre parte dos campos no celular, e uma carta da mão
 * sobreposta cobre o meio da vizinha. Procura da região central para as bordas e falha se nenhum ponto à vista acerta.
 */
async function hitPoint(target: Locator): Promise<Point> {
  const point = await target.evaluate((el) => {
    const rect = el.getBoundingClientRect();
    const fractions = [0.5, 0.3, 0.7, 0.15, 0.85, 0.05, 0.95];
    for (const fy of fractions) {
      for (const fx of fractions) {
        const x = rect.left + rect.width * fx;
        const y = rect.top + rect.height * fy;
        if (x < 0 || y < 0 || x >= window.innerWidth || y >= window.innerHeight) continue;
        const hit = document.elementFromPoint(x, y);
        if (hit !== null && el.contains(hit)) return { x, y };
      }
    }
    return null;
  });
  expect(point, 'um ponto à vista que acerta o elemento (nada por cima)').not.toBeNull();
  return point!;
}

/** Aperta o mouse sobre a carta, sem mover: o arrasto só começa depois de 8 px. */
async function pickUp(page: Page, card: Locator): Promise<Point> {
  const from = await hitPoint(card);
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  return from;
}

/** Leva o mouse (apertado) até `to` em passos, como a mão faz. */
async function carryTo(page: Page, to: Point, steps = 12): Promise<void> {
  await page.mouse.move(to.x, to.y, { steps });
}

/** Solta o mouse. */
async function letGo(page: Page): Promise<void> {
  await page.mouse.up();
}

/** Arrasta `card` até `target` e solta. */
async function drag(page: Page, card: Locator, target: Locator): Promise<void> {
  await pickUp(page, card);
  await carryTo(page, await hitPoint(target));
  await letGo(page);
}

/** As duas rodadas de Equipar pelos destinos oferecidos e a escolha da ordem: chega na fase principal, na sua vez de atacar. */
async function toMainPhase(page: Page): Promise<void> {
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  await expect(roundHeading(page)).toHaveText('Rodada 1');
  await equipByUi(page);
  await expect(roundHeading(page)).toHaveText('Rodada 2');
  await equipByUi(page);
  await expect(roundHeading(page)).toHaveText('Rodada 3');
  await orderPanel(page).getByRole('button', { name: 'Atacar primeiro' }).click();
  await expect(actionBar(page).getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  // A mesa parada: sem batida nem animação com fim (um toque durante elas só as pula e não vira gesto).
  await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1);
}

/** O que o CSS calculado diz de um elemento (`touch-action`, `cursor`). */
const css = (el: Locator, property: 'touchAction' | 'cursor'): Promise<string> => el.evaluate((node, name) => getComputedStyle(node)[name], property);

/** Os campos rolam por dentro no celular (`[data-campos]`); no PC a mesa cabe e não há rolagem. */
const fieldsScroll = (page: Page): Promise<{ top: number; max: number; page: number }> =>
  page.evaluate(() => {
    const fields = document.querySelector('[data-campos]')!;
    return { top: Math.round(fields.scrollTop), max: fields.scrollHeight - fields.clientHeight, page: window.scrollY };
  });

// ---------------------------------------------------------------------------------------------
// O mouse (PC e celular)

test('Equipar: a carta da vez arrasta até a fileira de Defesa; solta fora de uma fileira, não escolhe nada', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  await expect(roundHeading(page)).toHaveText('Rodada 1');
  const panel = equipPanel(page);
  await expect(panel.getByText('Carta 1 de 1')).toBeVisible();
  // Só a carta do painel (o fantasma, um clone no `body`, também leva `data-card-id`).
  const card = panel.locator('[data-card-id]');
  await expect(card).toHaveCount(1);
  expect(await css(card, 'cursor'), 'a carta que arrasta mostra a mãozinha').toBe('grab');
  expect(await css(card, 'touchAction'), 'o dedo arrasta em vez de rolar').toBe('none');
  await axe(page);

  // No ar: o fantasma, as duas fileiras marcadas (as únicas que o motor deixa) e a carta de origem esmaecida; solta sobre a faixa
  // central, que não é destino: nada é escolhido, e o clique que o navegador manda depois do gesto não faz nada.
  await pickUp(page, card);
  await carryTo(page, await hitPoint(roundHeading(page)));
  await expect(ghost(page)).toHaveCount(1);
  await expect(ghost(page)).toHaveAttribute('aria-hidden', 'true');
  await expect(card).toHaveCount(1);
  await expect(card).toHaveCSS('opacity', '0.4');
  await expect(valid(page)).toHaveCount(2);
  await expect(myRow(page, 'ATK')).toHaveAttribute('data-soltar-ativo', '');
  await expect(myRow(page, 'DEF')).toHaveAttribute('data-soltar-ativo', '');
  await expect(under(page)).toHaveCount(0);
  await axe(page);
  await expectNoHorizontalScroll(page);
  await letGo(page);
  await expect(ghost(page)).toHaveCount(0);
  await expect(valid(page)).toHaveCount(0);
  await expect(card).toHaveCSS('opacity', '1');
  await expect(panel.getByText('Carta 1 de 1')).toBeVisible();
  await expect(page.locator('[data-rascunho]')).toHaveCount(0);

  // De novo, até a fileira de Defesa: ela leva o contorno de "sob o dedo" (a de Ataque, não), e a carta vira rascunho nela.
  await pickUp(page, card);
  await carryTo(page, await hitPoint(myRow(page, 'DEF')));
  await expect(myRow(page, 'DEF')).toHaveAttribute('data-soltar-sob', '');
  await expect(under(page)).toHaveCount(1);
  await axe(page);
  await letGo(page);
  await expect(ghost(page)).toHaveCount(0);
  await expect(valid(page)).toHaveCount(0);
  await expect(panel).toContainText('Tudo no lugar');
  await expect(myRow(page, 'DEF').locator('[data-rascunho]')).toHaveCount(1);
  await expect(myRow(page, 'ATK').locator('[data-rascunho]')).toHaveCount(0);
  await expect(card).toHaveCount(0);

  // O Confirmar segue pelo botão, e a partida anda.
  await panel.getByRole('button', { name: 'Confirmar', exact: true }).click();
  await expect(roundHeading(page)).toHaveText('Rodada 2');
  guard.expectClean();
});

test('Equipar: o botão do destino segue valendo, e as duas formas se misturam (o arrasto não tira o botão)', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  const panel = equipPanel(page);
  await expect(panel.getByText('Carta 1 de 1')).toBeVisible();
  await panel.getByRole('list', { name: 'Destinos' }).getByRole('button', { name: 'Fileira de Ataque' }).click();
  await expect(myRow(page, 'ATK').locator('[data-rascunho]')).toHaveCount(1);
  await panel.getByRole('button', { name: 'Desfazer' }).click();
  await expect(panel.getByText('Carta 1 de 1')).toBeVisible();
  // Depois do Desfazer, a carta volta a ser a da vez e arrasta.
  await drag(page, panel.locator('[data-card-id]'), myRow(page, 'ATK'));
  await expect(myRow(page, 'ATK').locator('[data-rascunho]')).toHaveCount(1);
  guard.expectClean();
});

test('fase principal: o K arrasta até a Guarda; a zona errada e fora de zona não mandam nada', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await toMainPhase(page);
  const j = handCard(page, J);
  const k = handCard(page, K);
  await expect(hand(page).getByRole('button')).toHaveCount(6);
  expect(await css(k, 'cursor'), 'a carta que arrasta mostra a mãozinha').toBe('grab');
  expect(await css(k, 'touchAction')).toBe('none');
  // A Armadilha não tem alvo (o oponente não tem J, Q nem K em campo): sem jogada, não arrasta, e o cursor segue o de botão.
  const trap = handCard(page, TRAP).first();
  expect(await css(trap, 'touchAction'), 'sem jogada, o dedo rola como sempre').toBe('auto');
  expect(await css(trap, 'cursor')).toBe('pointer');
  await axe(page);

  // O celular rola os campos para a Guarda aparecer por cima da mão (no PC a mesa cabe e `scrollIntoView` não rola nada).
  await myGuard(page).scrollIntoViewIfNeeded();
  await expect(page.locator(ZONE.guard)).toBeInViewport();

  // O J só vale nos Buffs de ataque: no ar, só eles ficam marcados; soltar na Guarda não manda nada nem escolhe a carta.
  await pickUp(page, j);
  await carryTo(page, await hitPoint(page.locator(ZONE.guard)));
  await expect(ghost(page)).toHaveCount(1);
  await expect(valid(page)).toHaveCount(1);
  await expect(page.locator(ZONE.attackBuffs)).toHaveAttribute('data-soltar-ativo', '');
  await expect(under(page)).toHaveCount(0);
  await letGo(page);
  await expect(ghost(page)).toHaveCount(0);
  await expect(valid(page)).toHaveCount(0);
  await expect(hand(page).getByRole('button')).toHaveCount(6);
  await expect(myGuard(page).locator('[data-card-id]')).toHaveCount(0);
  // O clique que o navegador manda depois do gesto não escolheu a carta (seria um toque a mais).
  expect(await pressed(j)).toBe('false');
  await expect(actionBar(page)).toContainText('Toque numa carta da mão para ver as jogadas.');

  // O K na Guarda: a zona leva o contorno de "sob o dedo", e a jogada sai (o K sai da mão e entra na Guarda).
  await pickUp(page, k);
  await carryTo(page, await hitPoint(page.locator(ZONE.guard)));
  await expect(page.locator(ZONE.guard)).toHaveAttribute('data-soltar-sob', '');
  await axe(page);
  await letGo(page);
  await expect(myGuard(page).locator('[data-card-id]')).toHaveCount(1);
  await expect(hand(page).getByRole('button', { name: K })).toHaveCount(0);
  await expect(ghost(page)).toHaveCount(0);
  await expect(valid(page)).toHaveCount(0);
  guard.expectClean();
});

test('fase principal: o toque, o Enter e o arrasto que volta à própria carta escolhem a carta (a escolha segue sem arrastar)', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await toMainPhase(page);
  const q = handCard(page, Q);

  // O toque (o clique do mouse): escolhe, e o clique que vem depois do gesto não escolhe duas vezes (e não alterna de volta).
  await q.click();
  await expect(q).toHaveAttribute('aria-pressed', 'true');
  await expect(actionBar(page).getByRole('list', { name: 'Jogadas' }).getByRole('button', { name: 'Buff de defesa' })).toBeVisible();
  await q.click();
  await expect(q).toHaveAttribute('aria-pressed', 'false');

  // O teclado: Enter na carta a escolhe (o `click` do Enter não tem ponteiro, e o gesto não o engole), e Esc desfaz.
  await q.focus();
  await page.keyboard.press('Enter');
  await expect(q).toHaveAttribute('aria-pressed', 'true');
  await page.keyboard.press('Escape');
  await expect(q).toHaveAttribute('aria-pressed', 'false');

  // O dedo que escorrega além do limiar e solta de volta sobre a carta, sem zona: é um toque (escolhe; de novo, desfaz).
  for (const expected of ['true', 'false']) {
    const from = await pickUp(page, q);
    await carryTo(page, { x: from.x, y: from.y - 60 }, 6);
    await expect(ghost(page)).toHaveCount(1);
    await carryTo(page, from, 6);
    await letGo(page);
    await expect(ghost(page)).toHaveCount(0);
    await expect(q).toHaveAttribute('aria-pressed', expected);
  }

  // Soltar sobre outra carta da mão (que não é zona) não escolhe nada.
  await drag(page, q, handCard(page, K));
  await expect(q).toHaveAttribute('aria-pressed', 'false');
  await expect(handCard(page, K)).toHaveAttribute('aria-pressed', 'false');
  guard.expectClean();
});

test('Esc no meio do arrasto cancela: nada é jogado, e o fantasma some', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await toMainPhase(page);
  await myGuard(page).scrollIntoViewIfNeeded();
  const k = handCard(page, K);
  await pickUp(page, k);
  await carryTo(page, await hitPoint(page.locator(ZONE.guard)));
  await expect(ghost(page)).toHaveCount(1);
  await page.keyboard.press('Escape');
  await expect(ghost(page)).toHaveCount(0);
  await expect(valid(page)).toHaveCount(0);
  await letGo(page);
  await expect(myGuard(page).locator('[data-card-id]')).toHaveCount(0);
  await expect(hand(page).getByRole('button', { name: K })).toHaveCount(1);
  expect(await pressed(k)).toBe('false');
  guard.expectClean();
});

// ---------------------------------------------------------------------------------------------
// O toque de verdade (só o projeto do celular)

test.describe('celular: o dedo (eventos de toque pelo CDP)', () => {
  test.skip(({ isMobile }) => !isMobile, 'o toque de verdade é do projeto do celular');

  async function touchSession(page: Page): Promise<CDPSession> {
    return page.context().newCDPSession(page);
  }

  const touch = (cdp: CDPSession, type: 'touchStart' | 'touchMove' | 'touchEnd', point?: Point) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: point === undefined ? [] : [{ x: point.x, y: point.y }] });

  /** O dedo anda de `from` a `to` em passos, com um respiro entre eles (o Chromium decide rolar ou entregar o ponteiro nos primeiros). */
  async function slide(page: Page, cdp: CDPSession, from: Point, to: Point, steps = 10): Promise<void> {
    for (let i = 1; i <= steps; i += 1) {
      await touch(cdp, 'touchMove', { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps });
      await page.waitForTimeout(16);
    }
  }

  test('a carta arrastável tem touch-action: none e o resto da mesa, auto; o dedo fora das cartas rola os campos', async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    await toMainPhase(page);
    expect(await css(handCard(page, K), 'touchAction')).toBe('none');
    expect(await css(handCard(page, TRAP).first(), 'touchAction')).toBe('auto');
    expect(await page.locator('[data-campos]').evaluate((fields) => getComputedStyle(fields).touchAction)).toBe('auto');
    expect(await page.locator('[data-fileira] [data-card-id]').first().evaluate((el) => getComputedStyle(el).touchAction), 'uma carta de fileira').toBe('auto');

    // A página não rola (só os campos), e os campos rolam com o dedo fora das cartas (o ponto está entre a fileira do oponente e a faixa).
    const before = await fieldsScroll(page);
    expect(before.max, 'os campos têm para onde rolar no celular').toBeGreaterThan(50);
    expect(await page.evaluate(() => document.documentElement.scrollHeight - document.documentElement.clientHeight), 'a página não rola').toBe(0);
    const cdp = await touchSession(page);
    const from = { x: 195, y: 400 };
    await touch(cdp, 'touchStart', from);
    await slide(page, cdp, from, { x: from.x, y: 150 });
    await touch(cdp, 'touchEnd');
    await expect.poll(async () => (await fieldsScroll(page)).top).toBeGreaterThan(before.top + 50);
    expect((await fieldsScroll(page)).page, 'a página segue parada').toBe(0);
    guard.expectClean();
  });

  test('arrastar o K com o dedo até a Guarda: a página e os campos não rolam durante o arrasto, e a jogada sai', async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    await toMainPhase(page);
    const cdp = await touchSession(page);
    // A Guarda fica sob a mão: o dedo fora das cartas rola os campos até ela (o que o jogador faria).
    const fromScroll = { x: 195, y: 400 };
    await touch(cdp, 'touchStart', fromScroll);
    await slide(page, cdp, fromScroll, { x: fromScroll.x, y: 100 });
    await touch(cdp, 'touchEnd');
    await expect.poll(async () => (await fieldsScroll(page)).top).toBe((await fieldsScroll(page)).max);
    await expect(page.locator(ZONE.guard)).toBeInViewport();
    const rolled = await fieldsScroll(page);

    const k = handCard(page, K);
    const start = await hitPoint(k);
    const end = await hitPoint(page.locator(ZONE.guard));
    await touch(cdp, 'touchStart', start);
    await slide(page, cdp, start, end);
    // No ar: o fantasma e a Guarda marcada; nada rolou (o gesto virou arrasto e não rolagem, que cancelaria o ponteiro).
    await expect(ghost(page)).toHaveCount(1);
    await expect(page.locator(ZONE.guard)).toHaveAttribute('data-soltar-sob', '');
    expect(await fieldsScroll(page), 'os campos e a página parados durante o arrasto').toEqual(rolled);
    await axe(page);
    await touch(cdp, 'touchEnd');
    await expect(ghost(page)).toHaveCount(0);
    await expect(myGuard(page).locator('[data-card-id]')).toHaveCount(1);
    await expect(hand(page).getByRole('button', { name: K })).toHaveCount(0);
    expect((await fieldsScroll(page)).page).toBe(0);
    guard.expectClean();
  });

  test('o toque na carta da mão escolhe; outro toque desfaz (o clique que o toque manda não alterna duas vezes)', async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    await toMainPhase(page);
    const q = handCard(page, Q);
    await q.tap();
    await expect(q).toHaveAttribute('aria-pressed', 'true');
    // O dedo mexe um pouco no toque (menos de 8 px): continua sendo um toque.
    const cdp = await touchSession(page);
    const point = await hitPoint(q);
    await touch(cdp, 'touchStart', point);
    await slide(page, cdp, point, { x: point.x + 4, y: point.y + 3 }, 2);
    await touch(cdp, 'touchEnd');
    await expect(q).toHaveAttribute('aria-pressed', 'false');
    await expect(ghost(page)).toHaveCount(0);
    guard.expectClean();
  });
});
