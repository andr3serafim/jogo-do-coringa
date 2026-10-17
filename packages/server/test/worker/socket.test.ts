import { env, evictAllDurableObjects, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import type { RoomRecord } from '../../src/core/types.ts';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { get, makeRoom, open, post, startGame } from './helpers.ts';

afterEach(() => {
  vi.restoreAllMocks();
});

const stubFor = (code: string) => env.ROOMS.getByName(code);

describe('Durable Object da sala', () => {
  it('dois WebSockets jogam alguns passos; ping recebe pong', async () => {
    const { p1, p2 } = await startGame();
    expect(p1.room).toMatchObject({ status: 'PLAYING' });
    expect(p2.room).toMatchObject({ status: 'PLAYING' });

    // O ping literal é respondido sem acordar o objeto e sem passar pelo núcleo.
    p1.send('ping');
    await p1.waitFor(() => p1.pongs > 0, 'pong');
    expect(p1.of('error')).toEqual([]);

    const first = await p1.act(p1.equip());
    expect(first).toMatchObject({ ok: true });
    const second = await p2.act(p2.equip());
    expect(second).toMatchObject({ ok: true });
    if (first.ok && second.ok) expect(second.seq).toBeGreaterThan(first.seq!);

    // O segundo Equipar fecha a rodada: os dois recebem o passo novo, cada um com a sua visão.
    const seq = (second.ok && second.seq) || 0;
    expect((await p1.waitState(seq - 1)).seq).toBeGreaterThanOrEqual(seq);
    expect((await p2.waitState(seq - 1)).seq).toBeGreaterThanOrEqual(seq);
    expect(p1.state!.view.me).not.toBe(p2.state!.view.me);
  });

  it('hibernação no meio da partida (evictAllDurableObjects) não perde nada', async () => {
    const { room, p1, p2 } = await startGame();
    const first = await p1.act(p1.equip());
    expect(first).toMatchObject({ ok: true });
    const before = p1.state!.seq;

    await evictAllDurableObjects();

    // O socket sobrevive, o ping continua respondido e a jogada seguinte soma ao que já existia.
    p2.send('ping');
    await p2.waitFor(() => p2.pongs > 0, 'pong depois do evict');
    const second = await p2.act(p2.equip());
    expect(second).toMatchObject({ ok: true });
    expect(second.ok && second.seq).toBeGreaterThan(before);
    expect((await p1.waitState(before)).seq).toBeGreaterThan(before);

    // O `ack` guardado antes do evict ainda vale: repetir o mesmo `id` devolve o mesmo resultado.
    const firstId = p1.of('ack')[0]!.id;
    p1.send({ t: 'act', id: firstId, epoch: p1.state!.epoch, action: p1.equip() });
    await p1.waitFor(() => p1.of('ack').filter((ack) => ack.id === firstId).length > 1, 'ack repetido');
    expect(p1.of('ack').filter((ack) => ack.id === firstId).at(-1)).toEqual(first);
    expect(p1.closed).toBeNull();
    expect(room.code).toHaveLength(6);
  });

  it('runDurableObjectAlarm aplica o estouro do Equipar', async () => {
    const { room, p1, p2 } = await startGame();
    const before = p1.state!.seq;

    // Vence o prazo da fase na agenda gravada; o objeto acorda do zero e o alarme dispara.
    await runInDurableObject(stubFor(room.code), (_instance, state) => {
      const record = state.storage.kv.get<Record<string, unknown>>('room') as unknown as RoomRecord;
      record.agenda = record.agenda.map((item) => (item.kind === 'phase' ? { ...item, at: Date.now() - 1_000 } : item));
      state.storage.kv.put('room', record);
    });
    await evictAllDurableObjects();
    expect(await runDurableObjectAlarm(stubFor(room.code))).toBe(true);

    await p1.waitState(before);
    await p2.waitState(before);
    const strikes = await runInDurableObject(
      stubFor(room.code),
      (_instance, state) => state.storage.kv.get<{ strikes: Record<string, number> }>('game')!.strikes,
    );
    expect(strikes).toEqual({ p1: 1, p2: 1 });
  });

  it('expiração: deleteAll; getAlarm null; info vira 404', async () => {
    const created = await post('/api/rooms', { nickname: 'Ana' });
    const { code } = (await created.json()) as { code: string };
    expect((await get(`/api/rooms/${code}`)).status).toBe(200);

    const stub = stubFor(code);
    const armed = await runInDurableObject(stub, async (_instance, state) => {
      const record = state.storage.kv.get<Record<string, unknown>>('room') as unknown as RoomRecord;
      record.agenda = record.agenda.map((item) => (item.kind === 'idleExpiry' ? { ...item, at: Date.now() - 1_000 } : item));
      state.storage.kv.put('room', record);
      return await state.storage.getAlarm();
    });
    expect(armed).not.toBeNull();
    await evictAllDurableObjects();

    const logged = vi.spyOn(console, 'log');
    expect(await runDurableObjectAlarm(stub)).toBe(true);
    const lines = logged.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes('"evt":"room.expired"') && line.includes('"reason":"IDLE"'))).toBe(true);

    const after = await runInDurableObject(stub, async (_instance, state) => ({
      alarm: await state.storage.getAlarm(),
      keys: [...state.storage.kv.list()].map(([key]) => key),
    }));
    expect(after).toEqual({ alarm: null, keys: [] });
    expect((await get(`/api/rooms/${code}`)).status).toBe(404);
    expect(await runDurableObjectAlarm(stub)).toBe(false);
  });

  it('reinício: assento marcado presente sem socket passa a estar fora (reconcile ao acordar)', async () => {
    const room = await makeRoom();
    const stub = stubFor(room.code);
    // Como se o objeto tivesse morrido com o p1 conectado: o registro diz "presente", mas não há socket.
    await runInDurableObject(stub, (_instance, state) => {
      const record = state.storage.kv.get<Record<string, unknown>>('room') as unknown as RoomRecord;
      record.seats[0]!.offlineSince = null;
      record.agenda = record.agenda.filter((item) => item.kind !== 'idleExpiry');
      state.storage.kv.put('room', record);
    });
    await evictAllDurableObjects();

    // Qualquer entrada acorda o objeto: a primeira coisa que ele faz é conferir os assentos com os sockets.
    expect((await get(`/api/rooms/${room.code}`)).status).toBe(200);
    const saved = await runInDurableObject(stub, (_instance, state) => {
      const record = state.storage.kv.get<Record<string, unknown>>('room') as unknown as RoomRecord;
      return { offlineSince: record.seats[0]!.offlineSince, idle: record.agenda.some((item) => item.kind === 'idleExpiry') };
    });
    expect(typeof saved.offlineSince).toBe('number');
    expect(saved.idle).toBe(true);
  });

  it('exceção no núcleo: nada é gravado, o erro vai ao log e a próxima entrada recarrega do storage', async () => {
    const room = await makeRoom();
    const stub = stubFor(room.code);
    const logged = vi.spyOn(console, 'log');

    // Estraga a memória do núcleo (não o storage): a próxima entrada que ler os assentos lança. A chamada é direta,
    // dentro do objeto, porque uma exceção que cruza o RPC o runtime ainda reporta como "não capturada".
    const outcome = await runInDurableObject(stub, async (instance) => {
      (instance.core!.record as unknown as { seats: unknown }).seats = null;
      let threw = false;
      try {
        await instance.join('Caio');
      } catch {
        threw = true;
      }
      return { threw, discarded: instance.core === null };
    });
    expect(outcome).toEqual({ threw: true, discarded: true });
    const errors = logged.mock.calls
      .map((call) => String(call[0]))
      .filter((line) => line.includes('"evt":"error"'))
      .map((line) => JSON.parse(line) as { code: string; message: string; stack?: string });
    expect(errors).toHaveLength(1);
    expect(errors[0]).toMatchObject({ evt: 'error', code: room.code });
    expect(errors[0]!.message).toBeTruthy();

    // A instância estragada foi descartada: a sala volta como estava no storage (Ana e Bia).
    expect(await stub.info()).toMatchObject({ nicknames: ['Ana', 'Bia'], full: true });
    expect(await stub.join('Caio')).toEqual({ ok: false, error: 'FULL' });
  });

  it('fechamento limpo e erro do socket chegam ao núcleo: o assento sai da sala', async () => {
    const room = await makeRoom();
    const p1 = await open(room.code);
    const p2 = await open(room.code);
    const p3 = await open(room.code);
    await p1.hello(room.tokens.p1);
    await p2.hello(room.tokens.p2);
    await p1.waitFor(() => p1.room?.seats.every((seat) => seat.connected), 'os dois conectados');

    // Fechamento limpo pelo cliente (`webSocketClose`).
    p2.ws.close(1000, 'tchau');
    await p1.waitFor(() => p1.room?.seats.some((seat) => !seat.connected), 'p2 fora da sala');
    expect(p1.room!.seats.find((seat) => seat.playerId === 'p2')!.connected).toBe(false);

    // Erro do socket (`webSocketError`): o p1 cai sem fechamento limpo, e o p3 só observa.
    await p3.hello(room.tokens.p2);
    await p1.waitFor(() => p1.room?.seats.every((seat) => seat.connected), 'p2 de volta');
    await runInDurableObject(stubFor(room.code), async (instance, state) => {
      const sockets = state.getWebSockets();
      const target = sockets.find((ws) => (ws.deserializeAttachment() as { seat: string | null }).seat === 'p2')!;
      await instance.webSocketError(target);
    });
    await p1.waitFor(() => p1.room?.seats.some((seat) => !seat.connected), 'p2 fora depois do erro');
    expect(p1.room!.seats.find((seat) => seat.playerId === 'p2')!.connected).toBe(false);
  });

  it('duas abas: a segunda derruba a primeira com 4009', async () => {
    const room = await makeRoom();
    const first = await open(room.code);
    await first.hello(room.tokens.p1);
    const second = await open(room.code);
    await second.hello(room.tokens.p1);
    expect(await first.waitClosed()).toMatchObject({ code: 4009 });
    expect(second.closed).toBeNull();
  });
});
