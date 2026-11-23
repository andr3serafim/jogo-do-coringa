// As telas fora da mesa no tema verde do menu (decisoes.md 2026-11-23 (7), (9) e (10)): a lista de partidas sumia no verde (o texto da
// linha herdava o papel do tema, sobre o papel da linha). O axe confere o contraste de cada tela parada; os outros E2E rodam no rosa, o
// padrão. A Sala de espera e a tela de entrar no verde ficam no `online.spec.ts` (a Duda abre a sala no verde), sem sala a mais aqui: o
// limite é de 10 salas por minuto por IP.
import { expect, test } from '@playwright/test';
import { axe, failOnConsoleErrors } from './helpers.ts';

const base = { mode: { kind: 'training', level: 'medio' }, seat: 'p1', names: { me: 'Você', opponent: 'Bot' }, rounds: 30, score: { p1: 0, p2: 0 }, rulesVersion: 6 };
/** Uma vitória, uma derrota online e um empate, sem replay (só a linha conta aqui). */
const GAMES = [
  { ...base, id: 'v1', date: Date.UTC(2026, 10, 23, 15, 10), outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner: 'p1', reason: 'HP' } } },
  { ...base, id: 'd1', date: Date.UTC(2026, 10, 23, 14, 40), mode: { kind: 'online', code: 'K7M2QP' }, names: { me: 'Você', opponent: 'Duda' }, outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner: 'p2', reason: 'HP' } } },
  { ...base, id: 'e1', date: Date.UTC(2026, 10, 22, 21, 5), outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'DRAW', reason: 'ANTI_STALL' } } },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript((games) => {
    if (localStorage.getItem('coringa:prefs') === null) localStorage.setItem('coringa:prefs', JSON.stringify({ menuTheme: 'green' }));
    if (localStorage.getItem('coringa:partidas') === null) localStorage.setItem('coringa:partidas', JSON.stringify(games));
  }, GAMES);
});

test('no tema verde, as telas do menu passam no axe (o contraste do texto de cada uma)', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  for (const path of ['/', '/jogar', '/treinar', '/opcoes', '/treino']) {
    await page.goto(path);
    await expect(page.locator('main.menu[data-tema="green"]')).toBeVisible();
    await expect(page.getByRole('heading').first()).toBeVisible();
    await axe(page);
  }
  guard.expectClean();
});

test('no tema verde, a lista de partidas mostra o texto e o resultado pela cor', async ({ page }) => {
  await page.goto('/partidas');
  const rows = page.getByRole('list').getByRole('listitem');
  await expect(rows).toHaveCount(3);
  await expect(rows.nth(0)).toContainText('Vitória');
  await expect(rows.nth(0)).toHaveAttribute('data-resultado', 'vitoria');
  await expect(rows.nth(1)).toHaveAttribute('data-resultado', 'derrota');
  await expect(rows.nth(2)).toHaveAttribute('data-resultado', 'neutro');
  // O texto é tinta, não o papel do tema verde.
  const color = await rows.nth(2).locator('p').first().evaluate((el) => getComputedStyle(el).color);
  expect(color).toBe('rgb(23, 18, 15)');
  await axe(page);
});
