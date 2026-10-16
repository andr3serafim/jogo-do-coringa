import { viewFor } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { makeStep, startGame } from '../../src/core/game.ts';
import { RoomCore } from '../../src/core/room-core.ts';
import { TIMERS } from '../../src/core/timers.ts';
import type { RoomRecord, SocketInfo } from '../../src/core/types.ts';
import { stateFor } from '../../src/core/views.ts';
import { CODE, Harness } from './harness.ts';

const GOOD_TOKEN = 'A'.repeat(43);

function socketInfo(socketId: string, seat: 'p1' | 'p2' | null): SocketInfo {
  return { socketId, seat, connectedAt: 0, lastSeenAt: 0 };
}

describe('hello', () => {
  it('hello válido: welcome, room para todos e attach do assento', async () => {
    const { h, p1 } = await Harness.lobby();
    expect(p1.inbox[0]).toEqual({ t: 'welcome', protocol: 1, playerId: 'p1', serverNow: expect.any(Number) });
    expect(h.messages(p1, 'room').at(-1)).toMatchObject({
      status: 'LOBBY',
      seats: [
        { playerId: 'p1', connected: true },
        { playerId: 'p2', connected: true },
      ],
    });
    expect(p1.seat).toBe('p1');
    expect(h.core.record!.seats.every((seat) => seat.offlineSince === null)).toBe(true);
    expect(h.persisted).toBeGreaterThan(0);
  });

  it('primeira mensagem não-hello → 4003; protocolo 2 → error PROTOCOL_MISMATCH e 4001; token errado → 4003', async () => {
    const { h } = await Harness.lobby();
    const notHello = h.open();
    await h.send(notHello, { t: 'ready', ready: true });
    expect(notHello.closed).toEqual({ code: 4003, reason: 'esperava hello' });
    expect(h.logs).toContainEqual({ evt: 'protocol.violation', code: CODE, kind: 'AUTH' });

    const junk = h.open();
    await h.send(junk, 'isso não é json');
    expect(junk.closed?.code).toBe(4003);

    const old = h.open();
    await h.send(old, { t: 'hello', protocol: 2, token: GOOD_TOKEN });
    expect(h.messages(old)).toEqual([{ t: 'error', code: 'PROTOCOL_MISMATCH', message: expect.any(String) }]);
    expect(old.closed?.code).toBe(4001);

    const wrong = h.open();
    await h.send(wrong, h.hello(GOOD_TOKEN));
    expect(wrong.closed).toEqual({ code: 4003, reason: 'token inválido' });
    expect(wrong.inbox).toEqual([]);
    expect(wrong.seat).toBeNull();
  });

  it('segunda aba com o mesmo token derruba a primeira com 4009 sem derrubar o assento', async () => {
    const { h, p1, p2, tokens } = await Harness.lobby();
    await h.send(p1, { t: 'ready', ready: true });
    const again = h.open();
    await h.send(again, h.hello(tokens.p1));
    expect(p1.closed).toEqual({ code: 4009, reason: 'aberta em outra aba' });
    expect(again.seat).toBe('p1');
    const seat = h.core.record!.seats[0]!;
    expect(seat).toMatchObject({ offlineSince: null, ready: true });
    expect(h.messages(again).map((m) => m.t)).toEqual(['welcome', 'room']);
    expect(h.messages(p2, 'room').at(-1)!.seats[0]).toMatchObject({ playerId: 'p1', connected: true, ready: true });
    expect(h.messages(again, 'room')[0]!.seats.map((s) => s.connected)).toEqual([true, true]);
  });

  it('dois hello simultâneos com o mesmo token: uma aba cai com 4009 e o assento fica com uma só', async () => {
    const { h, p1, tokens } = await Harness.lobby();
    h.close(p1);
    const a = h.open();
    const b = h.open();
    await Promise.all([h.send(a, h.hello(tokens.p1)), h.send(b, h.hello(tokens.p1))]);
    const codes = [a, b].map((s) => s.closed?.code ?? null);
    expect(codes.filter((c) => c === 4009)).toHaveLength(1);
    expect(codes.filter((c) => c === null)).toHaveLength(1);
    const alive = [a, b].find((s) => s.open)!;
    expect(h.sockets.filter((s) => s.seat === 'p1')).toHaveLength(1);
    expect(alive.seat).toBe('p1');
    expect(h.core.record!.seats[0]!.offlineSince).toBeNull();
    // Fechar a aba que sobrou volta a marcar o assento como fora.
    h.close(alive);
    expect(h.core.record!.seats[0]!.offlineSince).not.toBeNull();
  });

  it('instantâneo velho sem a aba que acabou de entrar: ela também perde o assento', async () => {
    const { h, tokens } = await Harness.lobby();
    const a = h.open();
    await h.send(a, h.hello(tokens.p2));
    // Um instantâneo tirado antes do `hello` de `a` só conhece o recém-chegado.
    const b = h.open();
    const stale: SocketInfo[] = [socketInfo(b.id, null)];
    const effects = await h.core.onMessage(b.id, JSON.stringify(h.hello(tokens.p2)), stale, h.now);
    expect(effects.close.map((c) => c.socketId)).toContain(a.id);
    expect(effects.close.find((c) => c.socketId === a.id)).toMatchObject({ code: 4009 });
    expect(effects.send.every((m) => m.socketId === b.id)).toBe(true);
  });

  it('hello durante a partida: state com resync e a visão do próprio jogador', async () => {
    const { h, p1, tokens } = await Harness.playing();
    const again = h.open();
    await h.send(again, h.hello(tokens.p1));
    expect(p1.closed?.code).toBe(4009);
    expect(h.messages(again).map((m) => m.t)).toEqual(['welcome', 'room', 'state']);
    const state = h.messages(again, 'state')[0]!;
    expect(state).toMatchObject({ seq: 1, epoch: 1, resync: true, events: [], deadline: null });
    expect(state.view).toEqual(viewFor(h.core.record!.game!.state, 'p1'));
    expect(state).not.toHaveProperty('catchUp');
  });

  it('hello repetido de quem já está autenticado → BAD_MESSAGE', async () => {
    const { h, p1, tokens } = await Harness.lobby();
    await h.send(p1, h.hello(tokens.p1));
    expect(h.messages(p1, 'error')).toEqual([{ t: 'error', code: 'BAD_MESSAGE', message: 'hello repetido' }]);
    expect(p1.open).toBe(true);
  });
});

describe('transporte e limites', () => {
  it('binário → 1003; frame de 4097 bytes → 1009 (conta bytes UTF-8)', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    await h.send(p1, new ArrayBuffer(4));
    expect(p1.closed).toEqual({ code: 1003, reason: 'só texto' });

    // 'é' tem 2 bytes: 2049 deles são 4098 bytes, mas só 2049 unidades de texto.
    expect('é'.repeat(2049).length).toBeLessThan(4096);
    await h.send(p2, 'é'.repeat(2049));
    expect(p2.closed?.code).toBe(1009);

    const big = h.open();
    await h.send(big, 'a'.repeat(4097));
    expect(big.closed?.code).toBe(1009);
  });

  it('o limite é de 4096 bytes: nesse tamanho o frame passa pela checagem de tamanho', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    await h.send(p1, 'a'.repeat(4096));
    await h.send(p2, 'é'.repeat(2048));
    expect(p1.open && p2.open).toBe(true);
    expect(h.messages(p1, 'error')[0]).toMatchObject({ code: 'BAD_MESSAGE' });
    expect(h.messages(p2, 'error')[0]).toMatchObject({ code: 'BAD_MESSAGE' });
  });

  it('nona conexão e quinta sem autenticação → 4029', async () => {
    const { h } = await Harness.lobby();
    const open = Array.from({ length: 4 }, () => h.open());
    expect(open.every((s) => s.open)).toBe(true);
    const fifth = h.open();
    expect(fifth.closed).toEqual({ code: 4029, reason: 'conexões demais na sala' });
    expect(h.sockets).toHaveLength(6);

    const core = new RoomCore(h.core.record, Harness.deps());
    const eight = Array.from({ length: 8 }, (_, i) => socketInfo(`s${i}`, i % 2 === 0 ? 'p1' : 'p2'));
    const ninth = socketInfo('novo', null);
    expect(core.onOpen(ninth, eight, 0).close).toEqual([{ socketId: 'novo', code: 4029, reason: 'conexões demais na sala' }]);
    expect(core.onOpen(ninth, [...eight, ninth], 0).close).toHaveLength(1);
    // Com 7 abertos mais o novo (lista com ou sem ele), são 8 no total: cabe.
    expect(core.onOpen(ninth, eight.slice(1), 0).close).toEqual([]);
    expect(core.onOpen(ninth, [...eight.slice(1), ninth], 0).close).toEqual([]);
  });

  it('sala inexistente: onOpen fecha 4000 e não grava', async () => {
    const core = new RoomCore(null, Harness.deps());
    const opened = core.onOpen(socketInfo('a', null), [], 0);
    expect(opened.close).toEqual([{ socketId: 'a', code: 4000, reason: 'sala inexistente' }]);
    expect(opened.persist).toBe(false);
    expect(opened.logs).toEqual([]);
    expect(core.record).toBeNull();

    const message = await core.onMessage('a', JSON.stringify({ t: 'leave' }), [socketInfo('a', null)], 0);
    expect(message.close).toEqual([{ socketId: 'a', code: 4000, reason: 'sala inexistente' }]);
    expect(message.persist).toBe(false);

    const closed = core.onClose('a', [], 0);
    expect(closed).toMatchObject({ send: [], close: [], persist: false });
  });

  it('mensagens malformadas: erro BAD_MESSAGE; a 21ª fecha 1008 e loga protocol.violation MALFORMED', async () => {
    const { h, p1 } = await Harness.lobby();
    for (let i = 0; i < 20; i += 1) {
      h.now += 100;
      await h.send(p1, i % 2 === 0 ? 'não é json' : JSON.stringify({ t: 'ready' }));
    }
    expect(h.messages(p1, 'error')).toHaveLength(20);
    expect(h.messages(p1, 'error').every((e) => e.code === 'BAD_MESSAGE')).toBe(true);
    expect(p1.open).toBe(true);
    h.now += 100;
    await h.send(p1, 'mais uma');
    expect(p1.closed).toEqual({ code: 1008, reason: 'mensagens malformadas demais' });
    expect(h.logs).toContainEqual({ evt: 'protocol.violation', code: CODE, kind: 'MALFORMED' });
    expect(h.messages(p1, 'error')).toHaveLength(20);
  });

  it('limite por conexão: 21 mensagens no mesmo instante → a 21ª recebe RATE_LIMITED sem processar; 101 descartes → 1008 e protocol.violation RATE', async () => {
    const { h, p1 } = await Harness.lobby();
    // O balde começou cheio no hello (que gastou uma ficha); um segundo de relógio devolve as 20.
    h.now += 1_000;
    for (let i = 0; i < 20; i += 1) await h.send(p1, { t: 'ready', ready: false });
    expect(h.messages(p1, 'error')).toEqual([]);

    await h.send(p1, { t: 'ready', ready: true });
    expect(h.messages(p1, 'error')).toEqual([{ t: 'error', code: 'RATE_LIMITED', message: expect.any(String) }]);
    expect(h.core.record!.seats[0]!.ready).toBe(false);

    const act = { t: 'act', id: 'a1', epoch: 0, action: { type: 'PASS' } };
    await h.send(p1, JSON.stringify(act));
    await h.send(p1, JSON.stringify({ t: 'concede', id: 'c1' }));
    expect(p1.inbox.slice(-2)).toEqual([
      { t: 'ack', id: 'a1', ok: false, code: 'RATE_LIMITED', message: expect.any(String) },
      { t: 'ack', id: 'c1', ok: false, code: 'RATE_LIMITED', message: expect.any(String) },
    ]);

    // Sem id aproveitável (lixo, não-objeto, id vazio, id grande demais): error em vez de ack.
    for (const raw of ['lixo', 'null', '5', '{"t":"act","id":""}', JSON.stringify({ t: 'act', id: 'x'.repeat(65) })]) {
      await h.send(p1, raw);
      expect(p1.inbox.at(-1)).toMatchObject({ t: 'error', code: 'RATE_LIMITED' });
    }
    const limited = (): number =>
      p1.inbox.filter((m) => (m.t === 'error' || m.t === 'ack') && ('code' in m ? m.code === 'RATE_LIMITED' : false)).length;
    while (limited() < 100) await h.send(p1, 'enchente');
    expect(limited()).toBe(100);
    expect(p1.open).toBe(true);

    await h.send(p1, 'enchente');
    expect(p1.closed).toEqual({ code: 1008, reason: 'mensagens demais' });
    expect(limited()).toBe(100);
    expect(h.logs).toContainEqual({ evt: 'protocol.violation', code: CODE, kind: 'RATE' });
  });

  it('o balde repõe 10 fichas por segundo', async () => {
    const { h, p1 } = await Harness.lobby();
    for (let i = 0; i < 19; i += 1) await h.send(p1, { t: 'ready', ready: false });
    await h.send(p1, { t: 'ready', ready: false });
    expect(h.messages(p1, 'error')).toHaveLength(1);
    h.now += 500;
    for (let i = 0; i < 5; i += 1) await h.send(p1, { t: 'ready', ready: false });
    await h.send(p1, { t: 'ready', ready: false });
    expect(h.messages(p1, 'error')).toHaveLength(2);
  });
});

describe('lobby', () => {
  it('ready fora do lobby → error WRONG_STATUS; leave libera o assento e fecha 1000', async () => {
    const playing = await Harness.playing();
    await playing.h.send(playing.p1, { t: 'ready', ready: true });
    await playing.h.send(playing.p1, { t: 'leave' });
    expect(playing.h.messages(playing.p1, 'error').map((e) => e.code)).toEqual(['WRONG_STATUS', 'WRONG_STATUS']);
    expect(playing.p1.open).toBe(true);
    expect(playing.h.core.record!.seats).toHaveLength(2);

    const { h, p1, p2 } = await Harness.lobby();
    await h.send(p2, { t: 'ready', ready: true });
    const before = h.persisted;
    await h.send(p2, { t: 'leave' });
    expect(p2.closed).toEqual({ code: 1000, reason: 'saiu da sala' });
    expect(h.core.record!.seats.map((s) => s.id)).toEqual(['p1']);
    expect(h.persisted).toBeGreaterThan(before);
    expect(h.messages(p1, 'room').at(-1)).toMatchObject({ seats: [{ playerId: 'p1', connected: true }] });
    expect(h.messages(p1, 'room').at(-1)!.seats).toHaveLength(1);

    expect((await h.join('Caio')).playerId).toBe('p2');
  });

  it('começa só com os dois prontos e conectados; state inicial para cada um com a própria mão', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    await h.send(p1, { t: 'ready', ready: true });
    expect(h.core.record!.status).toBe('LOBBY');
    expect(h.messages(p2, 'room').at(-1)!.seats[0]).toMatchObject({ playerId: 'p1', ready: true });
    await h.send(p2, { t: 'ready', ready: true });
    const rec = h.core.record!;
    expect(rec).toMatchObject({ status: 'PLAYING', gameNo: 1, seq: 1, epoch: 1 });
    expect(rec.game!.seed).toBe('semente-1');
    const s1 = h.messages(p1, 'state').at(-1)!;
    expect(s1.view).toEqual(viewFor(rec.game!.state, 'p1'));
    expect(h.messages(p2, 'state').at(-1)!.view).toEqual(viewFor(rec.game!.state, 'p2'));
    expect(s1).toMatchObject({ seq: 1, epoch: 1, events: [], deadline: null, serverNow: h.now });
    expect(JSON.stringify([...p1.inbox, ...p2.inbox])).not.toContain('semente-1');
    expect(h.logs).toContainEqual({ evt: 'game.started', code: 'K7M2QX', gameNo: 1 });
    expect(h.logs.filter((l) => l.evt === 'game.started')).toHaveLength(1);
    // `room` já com o status novo, e depois o `state`.
    expect(p1.inbox.slice(-2).map((m) => m.t)).toEqual(['room', 'state']);
    expect(h.messages(p1, 'room').at(-1)).toMatchObject({ status: 'PLAYING', gameNo: 1 });
    expect(rec.seats.every((s) => !s.ready && !s.wantsRematch)).toBe(true);
    expect(rec.game).toMatchObject({
      gameNo: 1,
      startedAt: h.now,
      phaseStartedAt: h.now,
      steps: [],
      recent: [{ seq: 1, events: [] }],
      strikes: { p1: 0, p2: 0 },
    });
  });

  it('desmarcar o pronto antes do outro marcar não começa nada', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    await h.send(p1, { t: 'ready', ready: true });
    await h.send(p1, { t: 'ready', ready: false });
    await h.send(p2, { t: 'ready', ready: true });
    expect(h.core.record!.status).toBe('LOBBY');
  });

  it('cair no lobby desmarca o pronto e avisa o outro', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    await h.send(p1, { t: 'ready', ready: true });
    h.now += 5_000;
    h.close(p1);
    const seat = h.core.record!.seats[0]!;
    expect(seat).toMatchObject({ ready: false, offlineSince: h.now });
    expect(h.messages(p2, 'room').at(-1)!.seats[0]).toMatchObject({ playerId: 'p1', connected: false, ready: false });
    // Cada assento tem a sua saída marcada.
    h.close(p2);
    expect(h.core.record!.seats[1]!.offlineSince).toBe(h.now);
  });

  it('sinal velho (> 45 s) na largada fecha 4008 e não começa; a volta é possível', async () => {
    const { h, p1, p2, tokens } = await Harness.lobby();
    await h.send(p2, { t: 'ready', ready: true });
    h.silent(p2);
    h.now += 46_000;
    await h.send(p1, { t: 'ready', ready: true });
    expect(p2.closed).toEqual({ code: 4008, reason: 'sem sinal' });
    const rec = h.core.record!;
    expect(rec.status).toBe('LOBBY');
    expect(rec.seats.map((s) => s.ready)).toEqual([true, false]);
    expect(h.messages(p1, 'room').at(-1)!.seats[1]).toMatchObject({ playerId: 'p2', connected: false, ready: false });
    expect(h.logs.some((l) => l.evt === 'game.started')).toBe(false);

    const back = h.open();
    await h.send(back, h.hello(tokens.p2));
    await h.send(back, { t: 'ready', ready: true });
    expect(h.core.record!.status).toBe('PLAYING');
  });

  it('sinal de exatamente 45 s ainda vale', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    await h.send(p2, { t: 'ready', ready: true });
    h.silent(p2);
    h.now += TIMERS.silentDropMs;
    await h.send(p1, { t: 'ready', ready: true });
    expect(p2.closed).toBeNull();
    expect(h.core.record!.status).toBe('PLAYING');
  });

  it('os dois prontos mas um assento sem socket: não começa e o pronto cai', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    h.close(p2);
    h.core.record!.seats[1]!.ready = true;
    await h.send(p1, { t: 'ready', ready: true });
    expect(h.core.record!.status).toBe('LOBBY');
    expect(h.core.record!.seats.map((s) => s.ready)).toEqual([true, false]);
  });

  it('sem newSeed nas deps a semente vem dos bytes aleatórios', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    h.core = new RoomCore(h.core.record, { randomBytes: Harness.deps('outra').randomBytes });
    await h.send(p1, { t: 'ready', ready: true });
    await h.send(p2, { t: 'ready', ready: true });
    expect(h.core.record!.game!.seed).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('fora do lobby e mensagens ainda sem tratamento', () => {
  it('act e concede fora de PLAYING → ack NOT_PLAYING; rematch fora de FINISHED → WRONG_STATUS', async () => {
    const { h, p1 } = await Harness.lobby();
    await h.send(p1, JSON.stringify({ t: 'act', id: 'a1', epoch: 0, action: { type: 'PASS' } }));
    await h.send(p1, { t: 'concede', id: 'c1' });
    await h.send(p1, { t: 'rematch', want: true });
    expect(p1.inbox.slice(-3)).toEqual([
      { t: 'ack', id: 'a1', ok: false, code: 'NOT_PLAYING', message: expect.any(String) },
      { t: 'ack', id: 'c1', ok: false, code: 'NOT_PLAYING', message: expect.any(String) },
      { t: 'error', code: 'WRONG_STATUS', message: expect.any(String) },
    ]);
  });

  it('jogada, desistência e revanche entram na Tarefa 6: até lá, resposta explícita', async () => {
    const { h, p1 } = await Harness.playing();
    await h.send(p1, JSON.stringify({ t: 'act', id: 'a1', epoch: 1, action: { type: 'PASS' } }));
    expect(p1.inbox.at(-1)).toMatchObject({ t: 'ack', id: 'a1', ok: false, code: 'BAD_MESSAGE' });
    h.core.record!.status = 'FINISHED';
    await h.send(p1, { t: 'rematch', want: true });
    expect(p1.inbox.at(-1)).toMatchObject({ t: 'error', code: 'BAD_MESSAGE' });
  });
});

describe('alarme', () => {
  it('toda saída de onMessage traz o alarme da agenda: hello, ready, leave, recusas e erros', async () => {
    const { h, p1, p2, tokens } = await Harness.lobby();
    const expected = (): number | null => {
      const agenda = h.core.record!.agenda;
      return agenda.length === 0 ? null : Math.min(...agenda.map((item) => item.at));
    };
    const sock = (id: string, seat: 'p1' | 'p2' | null): SocketInfo => ({ socketId: id, seat, connectedAt: 0, lastSeenAt: h.now });
    const raw = (message: object): string => JSON.stringify(message);
    const results = [
      await h.core.onMessage(p1.id, raw({ t: 'ready', ready: true }), h.sockets, h.now),
      await h.core.onMessage(p1.id, 'lixo', h.sockets, h.now),
      await h.core.onMessage(p1.id, new ArrayBuffer(1), h.sockets, h.now),
      await h.core.onMessage(p1.id, raw({ t: 'rematch', want: true }), h.sockets, h.now),
      await h.core.onMessage('novo', raw({ t: 'hello', protocol: 1, token: tokens.p1 }), [...h.sockets, sock('novo', null)], h.now),
      await h.core.onMessage('ruim', raw({ t: 'hello', protocol: 1, token: GOOD_TOKEN }), [sock('ruim', null)], h.now),
      await h.core.onMessage(p2.id, raw({ t: 'leave' }), h.sockets, h.now),
    ];
    for (const effects of results) expect(effects.alarm).toBe(expected());
    expect(expected()).toBe(h.now + TIMERS.idleExpiryMs);
  });
});

describe('onClose', () => {
  it('socket sem autenticação que fecha não muda nada', async () => {
    const { h } = await Harness.lobby();
    const stray = h.open();
    const before = JSON.stringify(h.core.record);
    const sent = h.sent.length;
    h.close(stray);
    expect(JSON.stringify(h.core.record)).toBe(before);
    expect(h.sent).toHaveLength(sent);
  });

  it('em PLAYING marca a saída sem mexer no pronto e mostra o woAt aos outros', async () => {
    const { h, p1, p2 } = await Harness.playing();
    h.now += 3_000;
    h.close(p2);
    expect(h.core.record!.status).toBe('PLAYING');
    expect(h.core.record!.seats[1]!.offlineSince).toBe(h.now);
    expect(h.messages(p1, 'room').at(-1)!.seats[1]).toMatchObject({
      playerId: 'p2',
      connected: false,
      woAt: h.now + TIMERS.reconnectMs,
    });
  });
});

describe('game: startGame, makeStep e stateFor', () => {
  async function lobbyRecord(): Promise<RoomRecord> {
    const { h } = await Harness.lobby();
    return h.core.record!;
  }

  it('startGame sobe gameNo, seq e epoch, zera o que é da partida anterior e usa semente nova', async () => {
    const record = await lobbyRecord();
    const deps = Harness.deps();
    const first = startGame(record, deps, 10);
    expect(first.seq).toBe(1);
    expect(first.events).toEqual([]);
    expect(Object.keys(first.messages)).toEqual(['p1', 'p2']);

    record.status = 'FINISHED';
    record.outcome = { gameNo: 1, result: null, cause: 'ABANDONED' };
    record.seats[0]!.wantsRematch = true;
    const second = startGame(record, deps, 20);
    expect(second.seq).toBe(2);
    expect(record).toMatchObject({ status: 'PLAYING', gameNo: 2, seq: 2, epoch: 2, outcome: null });
    expect(record.seats[0]!.wantsRematch).toBe(false);
    expect(record.game).toMatchObject({ gameNo: 2, seed: 'semente-2', startedAt: 20, recent: [{ seq: 2, events: [] }] });
  });

  it('makeStep tira o retrato na hora: o passo seguinte não muda o anterior', async () => {
    const record = await lobbyRecord();
    startGame(record, Harness.deps(), 10);
    const step = makeStep(record, [], 10);
    const p1View = structuredClone(step.messages.p1.view);
    record.game!.state.round += 5;
    record.seq += 1;
    expect(step.messages.p1.view).toEqual(p1View);
    expect(step.messages.p1.seq).toBe(1);
    expect(step.messages.p1.view.me).toBe('p1');
    expect(step.messages.p2.view.me).toBe('p2');
  });

  it('stateFor: flags só aparecem quando pedidas, e sem partida dá erro', async () => {
    const record = await lobbyRecord();
    expect(() => stateFor(record, 'p1', [], 0)).toThrow('sem partida');
    startGame(record, Harness.deps(), 10);
    const plain = stateFor(record, 'p1', [], 7);
    expect(plain).not.toHaveProperty('catchUp');
    expect(plain).not.toHaveProperty('resync');
    expect(plain).not.toHaveProperty('pausedTurnMs');
    expect(plain.serverNow).toBe(7);
    expect(stateFor(record, 'p2', [], 7, { catchUp: true })).toMatchObject({ catchUp: true });
    const hidden = stateFor(
      record,
      'p2',
      [{ type: 'CardsDealt', player: 'p1', count: 0, cards: [] }],
      7,
    );
    expect(hidden.events).toEqual([{ type: 'CardsDealt', player: 'p1', count: 0 }]);
  });
});
