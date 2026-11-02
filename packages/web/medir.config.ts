// A medição das cenas (`e2e/medir-cena.ts`, onde está o uso): fora do `pnpm e2e` e da CI, porque a configuração padrão lista os arquivos que roda.
// `MEDIR_PORTA` sobe o servidor da medição em outra porta, para não reaproveitar um `wrangler dev` aberto na 8787 (que não serve o replay da fixture).
import type { PlaywrightTestConfig } from '@playwright/test';
import base from './playwright.config.ts';

const project = { ...base.projects![0]!, testMatch: ['medir-cena.ts'] };
const port = process.env.MEDIR_PORTA;

function onPort(config: PlaywrightTestConfig, to: string): PlaywrightTestConfig {
  const server = config.webServer as { command: string; url: string };
  const swap = (text: string) => text.replaceAll(':8787', `:${to}`).replace('--port 8787', `--port ${to}`);
  return {
    ...config,
    use: { ...config.use, baseURL: swap(String(config.use?.baseURL)) },
    webServer: { ...server, command: swap(server.command), url: swap(server.url), reuseExistingServer: false },
  };
}

const config: PlaywrightTestConfig = { ...base, projects: [project] };
export default port ? onPort(config, port) : config;
