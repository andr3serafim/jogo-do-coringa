/// <reference types="node" />
// E2E (spec §9.2, §9.3): Chromium contra o `wrangler dev` servindo a web construída (API e interface na mesma origem, porta
// 8787). Local: `pnpm e2e` (reaproveita um servidor já no ar). CI: `CI=true` sobe um servidor novo, com o build novo.
//
// `retries: 0` de propósito: um teste que só passa na segunda tentativa tem um defeito que a CI estaria escondendo.
import { defineConfig, devices } from '@playwright/test';

const PORT = 8787;
// Por IP, e não `localhost`: o servidor escuta só em IPv4, e o `localhost` do Linux pode resolver para `::1` primeiro.
const HOST = '127.0.0.1';

/*
 * O limite de criação de salas do Worker (`CREATE_LIMITER`, no `wrangler.jsonc`) é de 10 por minuto por IP, e o E2E usa um IP só:
 * uma execução cria 4 salas (duas no `online.spec.ts`, a partida inteira e a do replay, e uma por tamanho de tela no
 * `mobile.spec.ts`; o treino e o tutorial jogam contra o bot no próprio navegador e não criam sala). Reaproveitar um servidor
 * já no ar (`reuseExistingServer`) ou repetir tudo (`--repeat-each`) soma salas no mesmo minuto e pode estourar o limite (429
 * ao criar): para repetir, rode a execução inteira de novo, que sobe um servidor com o limitador zerado.
 */

/**
 * Semente do sorteio online: o Worker deste servidor sorteia a partida `n` com `<semente>-<n>` (`wrangler dev --var`; no
 * `wrangler.jsonc` a var é vazia e nunca vai para a produção). Com `e2e`, a primeira partida passa das duas rodadas de Equipar
 * (Ana recebe 3 e 2 numéricas, Duda 4 e 2), nenhuma vida chega perto de zero e a partida dura até a desistência. Os testes ainda
 * reagem ao que está na tela, porque os prazos e o relógio do runner continuam reais. Para reaproveitar um servidor que você já
 * subiu à mão, suba com `--var E2E_SEED:e2e`: o `online.spec.ts` confere a distribuição e avisa se a semente não valeu.
 */
const E2E_SEED = 'e2e';

export default defineConfig({
  testDir: './e2e',
  retries: 0,
  // O job da CI tem 15 min: se algo travar, o Playwright encerra a 10 e ainda sobra tempo para gerar e enviar o relatório.
  globalTimeout: 600_000,
  // Prazos de verdade (3 s da ordem automática, 2 s do passe, reconexão com espera): cada teste tem folga larga.
  timeout: 120_000,
  expect: { timeout: 15_000 },
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: `http://${HOST}:${PORT}`,
    // Sem teto, um clique que espera para sempre (botão coberto, diálogo modal) só cairia no limite do teste inteiro.
    actionTimeout: 20_000,
    navigationTimeout: 30_000,
    // Sem trace nem vídeo: o trace guardaria o corpo das respostas e os frames do WebSocket, e neles vai o token do assento.
    trace: 'off',
    video: 'off',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'desktop',
      testMatch: ['online.spec.ts', 'training.spec.ts', 'replay.spec.ts', 'sound.spec.ts', 'tutorial.spec.ts', 'drag.spec.ts'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      testMatch: ['mobile.spec.ts', 'drag.spec.ts'],
      use: { ...devices['Desktop Chrome'], viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true },
    },
  ],
  webServer: {
    command: `pnpm --filter @coringa/web build && pnpm --filter @coringa/server exec wrangler dev --ip ${HOST} --port ${PORT} --var E2E_SEED:${E2E_SEED}`,
    url: `http://${HOST}:${PORT}/api/health`,
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
    env: { WRANGLER_SEND_METRICS: 'false' },
    stdout: process.env.CI ? 'pipe' : 'ignore',
    stderr: 'pipe',
  },
});
