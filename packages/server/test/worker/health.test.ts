import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';

describe('Worker', () => {
  it('GET /api/health', async () => {
    const res = await SELF.fetch('https://x/api/health');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, version: 'dev' });
    expect((await SELF.fetch('https://x/nada')).status).toBe(404);
  });
});
