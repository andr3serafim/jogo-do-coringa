// A abertura do jogo (decisoes.md 2026-11-16 (5); sem a logo LUSACAN desde 2026-11-19 (6)): a intro do jogo e o menu. No navegador de verdade: quanto
// dura, o que pula (clique, toque, Enter, Espaço, Esc, qualquer tecla), o console limpo com o áudio bloqueado, a versão curta com
// movimento reduzido e as rotas que abrem direto. Os outros testes não a veem (a marca do `playwright.config.ts`); aqui ela toca.
import { expect, test, type Page } from '@playwright/test';
import { failOnConsoleErrors } from './helpers.ts';

// Sem a marca do armazenamento: como para quem joga.
test.use({ storageState: { cookies: [], origins: [] } });

const overlay = (page: Page) => page.locator('[data-abertura]');
const menuTitle = (page: Page) => page.getByRole('heading', { name: 'Jogo do Coringa' });

interface Marks {
  in: number;
  out: number;
}

/** Anota, no relógio da página, quando a abertura entrou no DOM (a capa escura, enquanto o pedaço dela não chega, ou a camada) e quando saiu. */
async function watchIntro(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const marks = { in: 0, out: 0 };
    (window as unknown as { __abertura: typeof marks }).__abertura = marks;
    new MutationObserver(() => {
      const on = document.querySelector('[data-abertura], [data-abertura-capa]') !== null;
      if (on && marks.in === 0) marks.in = performance.now();
      if (!on && marks.in !== 0 && marks.out === 0) marks.out = performance.now();
    }).observe(document, { childList: true, subtree: true });
  });
}

/** Quanto a abertura ficou na tela, em ms (depois de ela sair). */
async function introLasted(page: Page): Promise<number> {
  const marks = await page.evaluate(() => (window as unknown as { __abertura: Marks }).__abertura);
  expect(marks.in, 'a abertura entrou na página').toBeGreaterThan(0);
  expect(marks.out, 'a abertura saiu da página').toBeGreaterThan(0);
  return marks.out - marks.in;
}

/** O menu abriu e funciona: o título, nada inerte, e um botão dele leva à tela dele. */
async function expectMenuWorks(page: Page): Promise<void> {
  await expect(overlay(page)).toHaveCount(0);
  await expect(menuTitle(page)).toBeVisible();
  await expect(page.locator('[inert]')).toHaveCount(0);
  await page.getByRole('link', { name: 'Partidas anteriores' }).click();
  await expect(page).toHaveURL(/\/partidas$/);
}

test('a abertura toca inteira ao abrir no início: as cartas, o título, de 3 a 4,5 s, e termina no menu, sem erro no console', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await watchIntro(page);
  await page.goto('/');

  await expect(overlay(page)).toHaveAttribute('data-abertura', 'completa');
  await expect(page.locator('.abertura-palco')).toBeVisible();
  await expect(page.getByRole('img', { name: /LUSACAN/ })).toHaveCount(0);
  // O menu já está montado por baixo, inerte: nada dele espera a abertura.
  await expect(page.locator('[inert] h1')).toHaveCount(1);
  // O aviso é discreto e entra depois de meio segundo.
  await expect(page.getByRole('button', { name: 'Pressione qualquer tecla para pular' })).toHaveCSS('opacity', '0.72');
  // O maço vira no Coringa; sem o título, a aura, o anel e as faíscas (decisoes.md 2026-11-25 (2)).
  await expect(page.locator('.abertura-coringa')).toBeVisible();
  await expect(page.locator('.abertura-titulo, .abertura-aura, .abertura-onda, .abertura-faisca')).toHaveCount(0);

  await expect(overlay(page)).toHaveCount(0, { timeout: 10_000 });
  const lasted = await introLasted(page);
  expect(lasted).toBeGreaterThanOrEqual(2000);
  expect(lasted).toBeLessThanOrEqual(3500);

  await expectMenuWorks(page);
  guard.expectClean();
});

test('com o áudio bloqueado pelo navegador, a abertura roda muda até o menu, sem erro no console', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  // Um `AudioContext` que nunca sai do suspenso, como no navegador que exige um gesto: a retomada fica à espera.
  await page.addInitScript(() => {
    const created: AudioContext[] = [];
    (window as unknown as { __contextos: AudioContext[] }).__contextos = created;
    const Native = window.AudioContext;
    window.AudioContext = class extends Native {
      constructor() {
        super();
        created.push(this);
        Object.defineProperty(this, 'state', { get: () => 'suspended' });
      }
      override resume(): Promise<void> {
        return new Promise<void>(() => {});
      }
    };
  });
  await watchIntro(page);
  await page.goto('/');
  await expect(overlay(page)).toHaveCount(1);
  await expect(overlay(page)).toHaveCount(0, { timeout: 10_000 });
  // A abertura tentou ligar o som (um contexto, sem gesto) e seguiu sem ele.
  expect(await page.evaluate(() => (window as unknown as { __contextos: AudioContext[] }).__contextos.length)).toBe(1);
  expect(await introLasted(page)).toBeGreaterThanOrEqual(3000);
  await expectMenuWorks(page);
  guard.expectClean();
});

test.describe('pular', () => {
  /** Abre no início, espera a abertura estar na tela e faz o gesto; ela tem de sair muito antes do fim. */
  async function skipWith(page: Page, gesture: () => Promise<void>): Promise<void> {
    const guard = failOnConsoleErrors(page);
    await watchIntro(page);
    await page.goto('/');
    await expect(page.locator('.abertura-palco')).toBeVisible();
    await gesture();
    await expect(overlay(page)).toHaveCount(0, { timeout: 2000 });
    expect(await introLasted(page)).toBeLessThan(2000);
    await expectMenuWorks(page);
    guard.expectClean();
  }

  for (const key of ['Enter', 'Space', 'Escape', 'KeyJ']) {
    test(`a tecla ${key} pula direto para o menu`, async ({ page }) => {
      await skipWith(page, () => page.keyboard.press(key));
    });
  }

  test('um clique em qualquer ponto pula direto para o menu, e não aciona o que está por baixo', async ({ page }) => {
    // No meio do alto da página fica o menu (o emblema do Coringa): o clique é da abertura, e a rota não muda.
    await skipWith(page, () => page.mouse.click(720, 150));
  });

  test.describe('no toque', () => {
    test.use({ hasTouch: true });

    test('um toque em qualquer ponto pula direto para o menu', async ({ page }) => {
      await skipWith(page, () => page.touchscreen.tap(400, 300));
    });
  });

  test('um atalho do navegador não pula: Ctrl+A e o Shift sozinho deixam a abertura seguir', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.abertura-palco')).toBeVisible();
    await page.keyboard.press('Control+KeyA');
    await page.keyboard.press('Shift');
    await expect(overlay(page)).not.toHaveAttribute('data-saindo', 'true');
    await expect(overlay(page)).toHaveCount(1);
  });
});

test.describe('com movimento reduzido', () => {
  test.use({ reducedMotion: 'reduce' });

  test('é a versão curta: o Coringa parado e o esmaecer, em menos de 2,5 s, e o menu', async ({ page }) => {
    const guard = failOnConsoleErrors(page);
    await watchIntro(page);
    await page.goto('/');
    await expect(overlay(page)).toHaveAttribute('data-abertura', 'curta');
    await expect(page.locator('.abertura-titulo')).toHaveCount(0);
    await expect(page.locator('.abertura-coringa')).toBeVisible();
    await expect(page.locator('.abertura-carta')).toHaveCount(0);
    await expect(overlay(page)).toHaveCount(0, { timeout: 5000 });
    expect(await introLasted(page)).toBeLessThan(2500);
    await expectMenuWorks(page);
    guard.expectClean();
  });
});

test.describe('onde a abertura não toca', () => {
  for (const path of ['/treino?semente=e2e2631&nivel=medio', '/partidas', '/tutorial', '/s/ABC234']) {
    test(`abrindo direto em ${path}, a tela chega sem abertura`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator('main').first()).toBeVisible();
      await expect(overlay(page)).toHaveCount(0);
    });
  }

  test('voltar ao início por dentro do app não toca de novo; recarregar no início toca', async ({ page }) => {
    await page.goto('/partidas');
    await page.evaluate(() => {
      window.history.pushState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    await expect(menuTitle(page)).toBeVisible();
    await expect(overlay(page)).toHaveCount(0);

    await page.reload();
    await expect(overlay(page)).toHaveCount(1);
  });
});
