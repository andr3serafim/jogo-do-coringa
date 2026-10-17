import { env, evictAllDurableObjects, runDurableObjectAlarm, runInDurableObject } from 'cloudflare:test';
import { PROTOCOL_VERSION } from '@coringa/protocol';
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

  it('quadro binário fecha com 1003 e quadro maior que 4 KiB com 1009, visíveis ao cliente', async () => {
    const room = await makeRoom();
    const binary = await open(room.code);
    binary.ws.send(new Uint8Array([1, 2, 3]));
    expect(await binary.waitClosed()).toMatchObject({ code: 1003 });

    const big = await open(room.code);
    big.ws.send('x'.repeat(4097));
    expect(await big.waitClosed()).toMatchObject({ code: 1009 });
  });

  it('abuso (mais de 100 descartes pelo balde) fecha com 1008', async () => {
    const room = await makeRoom();
    const p1 = await open(room.code);
    await p1.hello(room.tokens.p1);
    for (let i = 0; i < 140; i += 1) p1.ws.send('{"t":"nada"}');
    expect(await p1.waitClosed()).toMatchObject({ code: 1008 });
  });

  it('mensagem de um socket que o núcleo acabou de fechar é ignorada (sem 4003 falso) e o onClose ainda roda', async () => {
    const room = await makeRoom();
    const p1 = await open(room.code);
    const p2 = await open(room.code);
    await p1.hello(room.tokens.p1);
    await p2.hello(room.tokens.p2);
    await p1.waitFor(() => p1.room?.seats.every((seat) => seat.connected), 'os dois conectados');

    const logged = vi.spyOn(console, 'log');
    await runInDurableObject(stubFor(room.code), async (instance, state) => {
      const target = state.getWebSockets().find((ws) => (ws.deserializeAttachment() as { seat: string | null }).seat === 'p2')!;
      target.close(4009, 'fechado pelo núcleo'); // agora CLOSING; a mensagem ainda estava no ar
      await instance.webSocketMessage(target, JSON.stringify({ t: 'ready', ready: true }));
      await instance.webSocketClose(target, 4009, 'fechado pelo núcleo');
    });
    const lines = logged.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes('protocol.violation') || line.includes('"evt":"error"'))).toBe(false);
    expect(await p2.waitClosed()).toMatchObject({ code: 4009 });
    await p1.waitFor(() => p1.room?.seats.some((seat) => !seat.connected), 'p2 fora depois do fechamento');
  });

  it('falha de fechamento num socket aberto (código inválido) não é engolida: vai ao log e o núcleo é descartado', async () => {
    const room = await makeRoom();
    const p1 = await open(room.code);
    await p1.hello(room.tokens.p1);
    const logged = vi.spyOn(console, 'log');
    const outcome = await runInDurableObject(stubFor(room.code), async (instance, state) => {
      const target = state.getWebSockets()[0]!;
      const socketId = (target.deserializeAttachment() as { socketId: string }).socketId;
      instance.core!.onMessage = async () => ({
        send: [],
        close: [{ socketId, code: 5, reason: 'código que o runtime recusa' }],
        attach: [],
        persist: false,
        alarm: null,
        deleteAll: false,
        logs: [],
      });
      let threw = false;
      try {
        await instance.webSocketMessage(target, JSON.stringify({ t: 'ready', ready: true }));
      } catch {
        threw = true;
      }
      return { threw, discarded: instance.core === null };
    });
    expect(outcome).toEqual({ threw: true, discarded: true });
    expect(logged.mock.calls.some((call) => String(call[0]).includes('"evt":"error"'))).toBe(true);
  });

  it('entradas em fila: hello e ready do mesmo socket sem esperar entre eles → o ready vale depois do hello, sem 4003', async () => {
    const room = await makeRoom();
    const p1 = await open(room.code);
    const logged = vi.spyOn(console, 'log');
    await runInDurableObject(stubFor(room.code), async (instance, state) => {
      const ws = state.getWebSockets().find((candidate) => (candidate.deserializeAttachment() as { seat: string | null }).seat === null)!;
      // O ready chega enquanto o hello espera o SHA-256 do token: sem a fila, ele veria o socket ainda sem assento.
      await Promise.all([
        instance.webSocketMessage(ws, JSON.stringify({ t: 'hello', protocol: PROTOCOL_VERSION, token: room.tokens.p1 })),
        instance.webSocketMessage(ws, JSON.stringify({ t: 'ready', ready: true })),
      ]);
    });
    await p1.waitFor(() => p1.room?.seats.find((seat) => seat.playerId === 'p1')?.ready, 'p1 pronto');
    expect(p1.of('welcome')).toHaveLength(1);
    expect(p1.closed).toBeNull();
    const lines = logged.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes('protocol.violation') || line.includes('"evt":"error"'))).toBe(false);
  });

  it('entrada na fila de um socket que a entrada anterior fechou (4009) é ignorada: sem 4003 falso no log', async () => {
    const room = await makeRoom();
    const tab1 = await open(room.code);
    await tab1.hello(room.tokens.p1);
    const tab2 = await open(room.code);
    const logged = vi.spyOn(console, 'log');
    await runInDurableObject(stubFor(room.code), async (instance, state) => {
      const seatOf = (ws: WebSocket) => (ws.deserializeAttachment() as { seat: string | null }).seat;
      const ws1 = state.getWebSockets().find((ws) => seatOf(ws) === 'p1')!;
      const ws2 = state.getWebSockets().find((ws) => seatOf(ws) === null)!;
      // O ready da aba 1 entra na fila aberto; quando chega a vez dele, o hello da aba 2 já a fechou com 4009.
      await Promise.all([
        instance.webSocketMessage(ws2, JSON.stringify({ t: 'hello', protocol: PROTOCOL_VERSION, token: room.tokens.p1 })),
        instance.webSocketMessage(ws1, JSON.stringify({ t: 'ready', ready: true })),
      ]);
    });
    expect(await tab1.waitClosed()).toMatchObject({ code: 4009 });
    expect(tab2.closed).toBeNull();
    const lines = logged.mock.calls.map((call) => String(call[0]));
    expect(lines.some((line) => line.includes('protocol.violation') || line.includes('"evt":"error"'))).toBe(false);
  });

  it('alarme com a instância fria: reconcile e onAlarm aplicados juntos, um setAlarm só', async () => {
    const { room, p1 } = await startGame();
    const before = p1.state!.seq;
    await runInDurableObject(stubFor(room.code), (_instance, state) => {
      const record = state.storage.kv.get<Record<string, unknown>>('room') as unknown as RoomRecord;
      record.agenda = record.agenda.map((item) => (item.kind === 'phase' ? { ...item, at: Date.now() - 1_000 } : item));
      state.storage.kv.put('room', record);
    });
    await evictAllDurableObjects();

    // Instância nova (o runInDurableObject não passa pelo `#enter`): o alarme é a primeira entrada e reconcilia.
    const outcome = await runInDurableObject(stubFor(room.code), async (instance, state) => {
      const setAlarm = vi.spyOn(state.storage, 'setAlarm');
      const started = Date.now();
      await instance.alarm();
      return { calls: setAlarm.mock.calls.map((call) => Number(call[0])), started, stored: await state.storage.getAlarm() };
    });
    // Antes: o reconcile gravava o alarme do item ainda vencido (no passado) e o onAlarm gravava o certo logo depois.
    expect(outcome.calls).toHaveLength(1);
    expect(outcome.calls[0]).toBeGreaterThan(outcome.started);
    expect(outcome.stored).toBe(outcome.calls[0]);
    await p1.waitState(before);
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
