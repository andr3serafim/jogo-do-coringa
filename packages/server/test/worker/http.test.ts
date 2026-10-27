import { env, SELF } from 'cloudflare:test';
import type { CreateRoomResponse, JoinRoomResponse, RoomInfoResponse } from '@coringa/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../src/worker/index.ts';
import { handle, isOriginAllowed } from '../../src/worker/router.ts';
import { get, open, post, TestSocket, uniqueIp } from './helpers.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

/**
 * Repete `attempt` até ela dizer que o limite estourou e devolve quantas passaram antes. A janela do limite (60 s)
 * pode virar no meio do laço, então o número exato oscila: o que vale é passar pelo menos `limit` vezes e estourar
 * antes de `2 * limit`.
 */
async function untilLimited(limit: number, attempt: (i: number) => Promise<boolean>): Promise<number> {
  for (let i = 0; i < limit * 2; i += 1) {
    if (await attempt(i)) {
      expect(i).toBeGreaterThanOrEqual(limit);
      return i;
    }
  }
  throw new Error('o limite nunca estourou');
}


describe('rotas HTTP', () => {
  it('cria (201), entra (200), cheia (409), inexistente (404), consulta pública', async () => {
    const created = await post('/api/rooms', { nickname: '  Ana ' });
    expect(created.status).toBe(201);
    const ana = (await created.json()) as CreateRoomResponse;
    expect(ana.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{6}$/);
    expect(ana.token).toHaveLength(43);
    expect(ana.playerId).toBe('p1');

    const info = await get(`/api/rooms/${ana.code}`);
    expect(info.status).toBe(200);
    expect((await info.json()) as RoomInfoResponse).toEqual({
      code: ana.code,
      status: 'LOBBY',
      nicknames: ['Ana'],
      full: false,
    });

    const joined = await post(`/api/rooms/${ana.code}/join`, { nickname: 'Bia' });
    expect(joined.status).toBe(200);
    const bia = (await joined.json()) as JoinRoomResponse;
    expect(bia.playerId).toBe('p2');
    expect(bia.token).toHaveLength(43);
    expect(bia.token).not.toBe(ana.token);

    expect(((await (await get(`/api/rooms/${ana.code}`)).json()) as RoomInfoResponse).full).toBe(true);
    expect((await post(`/api/rooms/${ana.code}/join`, { nickname: 'Caio' })).status).toBe(409);

    // Código no formato certo, mas sem sala: 404 na consulta e na entrada (o código em minúsculas vale).
    expect((await get('/api/rooms/222222')).status).toBe(404);
    expect((await post('/api/rooms/222222/join', { nickname: 'Caio' })).status).toBe(404);
    expect((await get(`/api/rooms/${ana.code.toLowerCase()}`)).status).toBe(200);
  });

  it('a vida inicial (sub-projeto 5): uma das escolhas vale (201); outra, ou de outro tipo, é 400; na entrada não existe', async () => {
    expect((await post('/api/rooms', { nickname: 'Ana', hp: 800 })).status).toBe(201);
    expect((await post('/api/rooms', { nickname: 'Ana', hp: 300 })).status).toBe(201);
    for (const hp of [0, 400, 501, -500, 1_000_000]) {
      const res = await post('/api/rooms', { nickname: 'Ana', hp });
      expect(res.status, String(hp)).toBe(400);
      expect(((await res.json()) as { error: string }).error).toBe('BAD_HP');
    }
    expect((await post('/api/rooms', '{"nickname":"Ana","hp":"500"}')).status).toBe(400);
    expect((await post('/api/rooms', '{"nickname":"Ana","hp":500.5}')).status).toBe(400);
    const ana = (await (await post('/api/rooms', { nickname: 'Ana' })).json()) as CreateRoomResponse;
    expect((await post(`/api/rooms/${ana.code}/join`, { nickname: 'Bia', hp: 800 })).status).toBe(400);
  });

  it('apelido inválido 400; corpo > 1 KiB 413; código fora do formato 404', async () => {
    for (const body of [{ nickname: '' }, { nickname: '   ' }, { nickname: 'x'.repeat(21) }, { nickname: 'a\u0007b' }]) {
      expect((await post('/api/rooms', body)).status, JSON.stringify(body)).toBe(400);
    }
    // JSON quebrado, campo a mais, tipo errado e corpo vazio também são 400.
    for (const body of ['{', '{"nickname":"Ana","extra":1}', '{"nickname":7}', '[]', '']) {
      expect((await post('/api/rooms', body)).status, body).toBe(400);
    }

    const big = JSON.stringify({ nickname: 'Ana', padding: 'x'.repeat(1100) });
    expect((await post('/api/rooms', big)).status).toBe(413);
    // Sem Content-Length confiável (corpo em fluxo), o limite vale do mesmo jeito.
    const streamed = await handle(
      new Request('https://x/api/rooms', {
        method: 'POST',
        body: new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"nickname":"'));
            controller.enqueue(new TextEncoder().encode('x'.repeat(2000)));
            controller.enqueue(new TextEncoder().encode('"}'));
            controller.close();
          },
        }),
      }),
      env,
    );
    expect(streamed.status).toBe(413);

    for (const code of ['ABC', 'ABCDEFG', 'ABCDE0', 'ABCDEI', 'ab%20cd']) {
      expect((await get(`/api/rooms/${code}`)).status, code).toBe(404);
      expect((await post(`/api/rooms/${code}/join`, { nickname: 'Ana' })).status, code).toBe(404);
    }
    expect((await get('/api/rooms/222222/outra')).status).toBe(404);
    expect((await get('/api/rooms')).status).toBe(404);
  });

  it('saúde e métodos errados', async () => {
    expect(await (await SELF.fetch('https://x/api/health')).json()).toEqual({ ok: true, version: 'dev' });
    expect((await SELF.fetch('https://x/api/health', { method: 'POST' })).status).toBe(404);
    expect((await SELF.fetch('https://x/')).status).toBe(404);
  });

  it('11ª criação no minuto → 429', async () => {
    const ip = uniqueIp();
    let retryAfter: string | null = null;
    await untilLimited(10, async (i) => {
      const res = await post('/api/rooms', { nickname: 'Ana' }, ip);
      if (res.status === 429) {
        retryAfter = res.headers.get('retry-after');
        return true;
      }
      expect(res.status, `criação ${i + 1}`).toBe(201);
      return false;
    });
    expect(retryAfter).toBe('60');
    // Outro IP não é afetado.
    expect((await post('/api/rooms', { nickname: 'Ana' })).status).toBe(201);
  });

  it('entrar e consultar dividem o limite de 60/min por IP; criar tem o seu', async () => {
    const ip = uniqueIp();
    await untilLimited(60, async (i) => {
      const status = (await get('/api/rooms/222222', ip)).status;
      if (status !== 429) expect(status, `consulta ${i + 1}`).toBe(404);
      return status === 429;
    });
    expect((await post('/api/rooms/222222/join', { nickname: 'Ana' }, ip)).status).toBe(429);
    expect((await post('/api/rooms', { nickname: 'Ana' }, ip)).status).toBe(201);
  });

  it('cinco códigos que já existem → 503, sem mais tentativas', async () => {
    let attempts = 0;
    const fake = {
      ...env,
      ROOMS: {
        getByName: () => ({
          create: async () => {
            attempts += 1;
            return { ok: false, error: 'EXISTS' };
          },
        }),
      },
    } as unknown as Env;
    const res = await handle(
      new Request('https://x/api/rooms', { method: 'POST', body: JSON.stringify({ nickname: 'Ana' }) }),
      fake,
    );
    expect(res.status).toBe(503);
    expect(attempts).toBe(5);
  });
});

describe('WebSocket recusado chega como fechamento', () => {
  it('upgrade recusado chega como fechamento: sala inexistente 4000; origem 4003', async () => {
    const missing = await open('222222');
    expect(await missing.waitClosed()).toMatchObject({ code: 4000 });

    // Código fora do formato: também 4000, sem tocar no objeto (um 404 chegaria ao navegador como 1006).
    const malformed = await open('ABC');
    expect(await malformed.waitClosed()).toMatchObject({ code: 4000 });

    const logged = vi.spyOn(console, 'log');
    const foreign = await open('222222', { Origin: 'https://evil.example' });
    expect(await foreign.waitClosed()).toMatchObject({ code: 4003 });
    const lines = logged.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes('"evt":"protocol.violation"') && line.includes('"kind":"ORIGIN"'))).toBe(true);
  });

  it('origem: a própria, as listadas e http://localhost:* passam; as outras, não', async () => {
    const same = await open('222222', { Origin: 'https://x' });
    expect(await same.waitClosed()).toMatchObject({ code: 4000 }); // passou pela origem e caiu na sala inexistente
    const local = await open('222222', { Origin: 'http://localhost:5173' });
    expect(await local.waitClosed()).toMatchObject({ code: 4000 });
    const other = await open('222222', { Origin: 'http://localhost.evil.example:5173' });
    expect(await other.waitClosed()).toMatchObject({ code: 4003 });

    const allowed = 'https://coringa.example, http://localhost:*';
    expect(isOriginAllowed('https://coringa.example', 'https://x', allowed)).toBe(true);
    expect(isOriginAllowed('https://x', 'https://x', '')).toBe(true);
    expect(isOriginAllowed('http://localhost:8787', 'https://x', allowed)).toBe(true);
    expect(isOriginAllowed('http://localhost', 'https://x', allowed)).toBe(false);
    expect(isOriginAllowed('http://localhost:abc', 'https://x', allowed)).toBe(false);
    expect(isOriginAllowed('https://coringa.example.evil.io', 'https://x', allowed)).toBe(false);
    expect(isOriginAllowed('null', 'https://x', allowed)).toBe(false);
  });

  it('limite por IP no upgrade → 4029', async () => {
    const ip = uniqueIp();
    await untilLimited(60, async (i) => {
      const { code } = await (await open('222222', { 'cf-connecting-ip': ip })).waitClosed();
      if (code !== 4029) expect(code, `upgrade ${i + 1}`).toBe(4000);
      return code === 4029;
    });
  });

  it('o limite vem antes da origem: estourado o limite, o upgrade com origem ruim recebe 4029 e não escreve mais log', async () => {
    const ip = uniqueIp();
    const logged = vi.spyOn(console, 'log');
    const originLogs = () =>
      logged.mock.calls.filter((call) => String(call[0]).includes('"kind":"ORIGIN"')).length;
    const allowed = await untilLimited(60, async (i) => {
      const { code } = await (await open('222222', { 'cf-connecting-ip': ip, Origin: 'https://evil.example' })).waitClosed();
      if (code !== 4029) expect(code, `upgrade ${i + 1}`).toBe(4003);
      return code === 4029;
    });
    // Um log por upgrade que passou do limite, nenhum para o que foi barrado.
    expect(originLogs()).toBe(allowed);
    const again = await open('222222', { 'cf-connecting-ip': ip, Origin: 'https://evil.example' });
    expect(await again.waitClosed()).toMatchObject({ code: 4029 });
    // Código malformado também passa pelo limite.
    const malformed = await open('ABC', { 'cf-connecting-ip': ip });
    expect(await malformed.waitClosed()).toMatchObject({ code: 4029 });
    expect(originLogs()).toBe(allowed);
  });

  it('exceção do objeto durante o upgrade vira fechamento 1011 (nunca um 500) e entra no log', async () => {
    const fake = {
      ...env,
      JOIN_LIMITER: { limit: async () => ({ success: true }) },
      ROOMS: {
        getByName: () => ({
          fetch: async () => {
            throw new Error('o objeto quebrou');
          },
        }),
      },
    } as unknown as Env;
    const logged = vi.spyOn(console, 'log');
    const upgrade = await worker.fetch!(
      new Request('https://x/api/rooms/222222/ws', { headers: { Upgrade: 'websocket' } }) as never,
      fake,
    );
    expect(upgrade.status).toBe(101);
    const socket = new TestSocket(upgrade.webSocket!);
    expect(await socket.waitClosed()).toMatchObject({ code: 1011 });
    const lines = logged.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes('"evt":"error"') && line.includes('o objeto quebrou'))).toBe(true);

    // Sem Upgrade, o erro continua sendo um 500 de verdade.
    const broken = {
      ...fake,
      ROOMS: {
        getByName: () => ({
          info: async () => {
            throw new Error('x');
          },
        }),
      },
    } as unknown as Env;
    const plain = await worker.fetch!(new Request('https://x/api/rooms/222222') as never, broken);
    expect(plain.status).toBe(500);
  });

  it('sem Upgrade no /ws → 426', async () => {
    const res = await get('/api/rooms/222222/ws');
    expect(res.status).toBe(426);
  });
});
