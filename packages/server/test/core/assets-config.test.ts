import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// O projeto de testes no workerd chama o Worker direto pelo `SELF`, sem a camada de assets, então o fallback de SPA
// só aparece no `wrangler dev` (E2E, Tarefa 25). Aqui ficam travados os valores de configuração de que ele depende.
const read = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');

describe('configuração dos assets (spec §11)', () => {
  const wrangler = JSON.parse(read('../../wrangler.jsonc').replace(/^\s*\/\/.*$/gm, '')) as Record<string, unknown>;

  it('o Worker serve ../web/dist com fallback de SPA e /api/* primeiro, sem binding', () => {
    expect(wrangler.assets).toEqual({
      directory: '../web/dist',
      not_found_handling: 'single-page-application',
      run_worker_first: ['/api/*'],
    });
  });

  it('o _headers da web fecha a CSP à própria origem e dá cache longo só ao /assets/*', () => {
    const headers = read('../../../web/public/_headers');
    expect(headers).toContain(
      "Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self'; font-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; frame-ancestors 'none'; form-action 'self'",
    );
    expect(headers).toContain('Referrer-Policy: same-origin');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).toMatch(/\/assets\/\*\n\s+Cache-Control: public, max-age=31536000, immutable/);
  });
});
