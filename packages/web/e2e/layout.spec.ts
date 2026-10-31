// E2E do arranjo da coluna dos especiais no PC (sub-projeto 5, F5): no notebook de 1536 × 695 do autor (mesa compacta, altura
// abaixo de 900 px), a Guarda, os buffs e as marcas de estado ("Ataque Absoluto armado", "1 Ressurreição
// disponível") não podem encolher, se sobrepor nem sair do campo. É o que o jsdom não prova: a conta de verdade do flex e do grid.
//
// A partida vem de `fixtures/especiais.json`, uma entrada de "partidas anteriores" com o replay de uma partida greedy × greedy do
// simulador (semente `layout-1188`, config padrão das regras de 2026-10-31), escolhida por juntar tudo isso no passo 99: no seu campo
// a Guarda, 4 J (Ataque Absoluto armado) e 3 Q; no do Bot, uma Ressurreição. Com o Reflect reativo (F2), a zona do Reflect só existe
// na janela de reação e nenhuma partida a junta com o resto: ela saiu da conta. O replay abre direto em `/partidas/especiais`.
import { readFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { failOnConsoleErrors, replayControl, replayCounter } from './helpers.ts';

const FIXTURE = readFileSync(new URL('./fixtures/especiais.json', import.meta.url), 'utf8');
const STEP = 99;

interface Box {
  top: number;
  bottom: number;
}
interface ColumnBoxes {
  field: Box;
  zones: Array<Box & { label: string; cards: Box[] }>;
  state: Box | null;
}

/** As caixas da coluna dos especiais de cada campo (o do oponente primeiro), lidas no navegador. */
function columnBoxes(page: Page): Promise<ColumnBoxes[]> {
  return page.evaluate(() => {
    const box = (el: Element) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    };
    return [...document.querySelectorAll('.campo')].map((field) => {
      const column = field.querySelector('.campo-zonas');
      const zones = column ? [...column.querySelectorAll(':scope > .campo-zona')] : [];
      const state = column?.querySelector(':scope > .campo-estado') ?? null;
      return {
        field: box(field),
        zones: zones.map((zone) => ({
          ...box(zone),
          label: zone.querySelector('.zona-titulo')?.textContent ?? '',
          cards: [...zone.querySelectorAll('li')].map(box),
        })),
        state: state ? box(state) : null,
      };
    });
  });
}

async function openAtStep(page: Page): Promise<void> {
  await page.addInitScript((games) => window.localStorage.setItem('coringa:partidas', games), FIXTURE);
  await page.goto('/partidas/especiais');
  await page.getByRole('combobox', { name: 'Rodada' }).selectOption('21');
  const next = replayControl(page, 'Próximo passo');
  for (let i = 0; i < 20; i++) {
    const text = (await replayCounter(page).textContent()) ?? '';
    const step = Number(/^Passo (\d+)/.exec(text)?.[1]);
    if (step >= STEP) break;
    await next.click();
  }
  await expect(replayCounter(page)).toHaveText(new RegExp(`^Passo ${STEP} de \\d+$`));
}

for (const viewport of [
  { width: 1536, height: 695 },
  { width: 1366, height: 657 },
  { width: 1440, height: 900 },
]) {
  test(`especiais no PC de ${viewport.width} × ${viewport.height}: Guarda, buffs e marcas sem encolher nem se sobrepor`, async ({
    page,
  }) => {
    const guard = failOnConsoleErrors(page);
    await page.setViewportSize(viewport);
    await openAtStep(page);

    const fields = await columnBoxes(page);
    expect(fields).toHaveLength(2);
    for (const { field, zones, state } of fields) {
      let floor = field.top;
      for (const zone of zones) {
        // Uma zona começa depois da anterior e cabe as próprias cartas inteiras.
        expect(zone.top, `${zone.label} começa depois da zona de cima`).toBeGreaterThanOrEqual(floor - 0.5);
        for (const card of zone.cards) {
          expect(card.top, `carta de ${zone.label} dentro da zona`).toBeGreaterThanOrEqual(zone.top - 0.5);
          expect(card.bottom, `carta de ${zone.label} dentro da zona`).toBeLessThanOrEqual(zone.bottom + 0.5);
        }
        floor = zone.bottom;
      }
      if (state) {
        expect(state.top, 'as marcas ficam abaixo das zonas').toBeGreaterThanOrEqual(floor - 0.5);
        // Uma ou duas linhas de etiqueta, nunca um bloco esticado até o fim da coluna.
        expect(state.bottom - state.top, 'as marcas têm a altura das etiquetas').toBeLessThanOrEqual(56);
        floor = state.bottom;
      }
      expect(floor, 'a coluna cabe no campo').toBeLessThanOrEqual(field.bottom + 0.5);
    }
    guard.expectClean();
  });
}
