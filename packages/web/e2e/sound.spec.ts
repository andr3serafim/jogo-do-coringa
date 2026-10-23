// E2E dos sons (Fase C, fatia 1): sem gesto do usuário o navegador não deixa o áudio tocar, então o jogo não cria o
// `AudioContext` (nem baixa o sintetizador) antes de um gesto que o Chrome conta como ativação. O `pointerdown` não conta (só
// o `pointerup`, o `touchend`, o `click` e o `keydown`). Um `addInitScript` troca o `AudioContext` por uma subclasse que conta as
// instâncias em `window.__audioContexts`; é o contexto real por baixo, então o sintetizador carrega e soa como na produção.
import { expect, test, type Page } from '@playwright/test';
import { equipPanel, failOnConsoleErrors, openMenu, table } from './helpers.ts';

/** Treino com semente fixa. O `nivel` ainda não existe na tela: o parâmetro é ignorado até a tarefa dos níveis. */
const TRAINING = '/treino?semente=e2e-1&nivel=medio';

/** Quantos `AudioContext` a página já criou. */
const audioContexts = (page: Page): Promise<number> =>
  page.evaluate(() => (window as unknown as { __audioContexts: number }).__audioContexts);

test('som: nenhum AudioContext antes de um gesto de ativação; a chave "Som" vem ligada', async ({ page }) => {
  const guard = failOnConsoleErrors(page);
  await page.addInitScript(() => {
    const w = window as unknown as { __audioContexts: number; AudioContext: typeof AudioContext };
    w.__audioContexts = 0;
    const Real = w.AudioContext;
    w.AudioContext = class extends Real {
      constructor(...args: ConstructorParameters<typeof AudioContext>) {
        super(...args);
        w.__audioContexts += 1;
      }
    };
  });
  const synthRequests: string[] = [];
  page.on('request', (request) => {
    if (/\/assets\/synth-[^/]+\.js$/.test(new URL(request.url()).pathname)) synthRequests.push(request.url());
  });

  await page.goto(TRAINING);
  await expect(table(page)).toBeVisible();
  await expect(equipPanel(page)).toContainText('Carta 1 de 3');
  // A mesa parada: o toque seguinte não pula batida nenhuma (um toque que pula não vira clique, e o teste esperaria à toa).
  await expect(page.locator('[data-palco]:not([data-ocupado])')).toHaveCount(1);
  expect(await audioContexts(page), 'só abrir a página não cria contexto').toBe(0);

  // Um ponteiro que só desce, sem subir, não ativa nada.
  await page.mouse.move(700, 450);
  await page.mouse.down();
  expect(await audioContexts(page), 'pointerdown sozinho não cria contexto').toBe(0);
  expect(synthRequests, 'o sintetizador só é baixado depois do gesto').toEqual([]);

  // O clique (o ponteiro sobe) num destino do Equipar cria o contexto, um só, e baixa o sintetizador.
  await equipPanel(page).getByRole('list', { name: 'Destinos' }).getByRole('button').first().click();
  await expect.poll(() => audioContexts(page)).toBe(1);
  await expect.poll(() => synthRequests.length).toBe(1);

  // Mais gestos não criam outro.
  await page.keyboard.press('Shift');
  await page.keyboard.press('Tab');
  expect(await audioContexts(page)).toBe(1);

  // A chave "Som" do menu vem marcada (o som nasce ligado).
  const menu = await openMenu(page);
  await expect(menu.getByRole('switch', { name: 'Som' })).toBeChecked();

  guard.expectClean();
});
