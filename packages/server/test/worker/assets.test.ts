import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

// Com `assets` na configuração, /api/* continua sendo do Worker (spec §11). O `SELF` do workerd chama o Worker direto,
// sem a camada de assets: servir `/s/7KQ2MD` com o index.html (200, text/html) só dá para conferir pelo `wrangler dev`,
// e essa checagem fica no E2E (Tarefa 25). A configuração que a sustenta está travada em test/core/assets-config.test.ts.
describe('Worker com assets configurados', () => {
  it('/api/health continua sendo do Worker', async () => {
    const res = await SELF.fetch('http://x/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: 'dev' });
  });

  it('/api/nada continua 404 em JSON', async () => {
    const res = await SELF.fetch('http://x/api/nada');
    expect(res.status).toBe(404);
    expect(res.headers.get('content-type')).toContain('application/json');
  });
});
