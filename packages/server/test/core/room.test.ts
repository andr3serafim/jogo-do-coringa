import { describe, expect, it } from 'vitest';
import { RoomCore } from '../../src/core/room-core.ts';
import { STATE_SCHEMA, TIMERS } from '../../src/core/timers.ts';
import { sha256Hex } from '../../src/core/tokens.ts';
import type { RoomRecord, SocketInfo } from '../../src/core/types.ts';
import { roomMessage } from '../../src/core/views.ts';
import { Harness } from './harness.ts';

describe('sala: criar', () => {
  it('criar ocupa p1, grava o hash do token e loga room.created', async () => {
    const h = new Harness();
    const r = await h.create('  Ana ');
    expect(r).toMatchObject({ code: 'K7M2QX', playerId: 'p1' });
    expect(r.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const rec = h.core.record!;
    expect(rec).toMatchObject({
      schema: STATE_SCHEMA,
      status: 'LOBBY',
      gameNo: 0,
      seq: 0,
      epoch: 0,
      score: { p1: 0, p2: 0, draws: 0 },
    });
    expect(rec.seats).toEqual([
      {
        id: 'p1',
        nickname: 'Ana',
        tokenHash: await sha256Hex(r.token),
        ready: false,
        wantsRematch: false,
        offlineSince: 1_000_000,
      },
    ]);
    expect(JSON.stringify(rec)).not.toContain(r.token);
    expect(h.logs).toContainEqual({ evt: 'room.created', code: 'K7M2QX', playerId: 'p1' });
  });

  it('criar agenda a expiração por ociosidade e o teto de 24 h, e pede o alarme mais cedo', async () => {
    const h = new Harness();
    await h.create();
    expect(h.core.record!.createdAt).toBe(1_000_000);
    expect(h.core.record!.agenda).toEqual([
      { kind: 'idleExpiry', at: 1_000_000 + TIMERS.idleExpiryMs },
      { kind: 'hardExpiry', at: 1_000_000 + TIMERS.hardExpiryMs },
    ]);
    expect(h.alarm).toBe(1_000_000 + TIMERS.idleExpiryMs);
  });

  it('criar persiste', async () => {
    const core = new RoomCore(null, Harness.deps());
    const r = await core.create('K7M2QX', 'Ana', 5);
    expect(r.effects.persist).toBe(true);
  });

  it('criar de novo no mesmo objeto → EXISTS; apelido inválido → BAD_NICKNAME sem gravar', async () => {
    const h = new Harness();
    const first = await h.create();
    const again = await h.core.create('K7M2QX', 'Zé', h.now);
    expect(again).toMatchObject({ ok: false, error: 'EXISTS' });
    expect(again.effects.persist).toBe(false);
    expect(again.effects.alarm).toBe(h.alarm);
    expect(h.core.record!.seats).toHaveLength(1);
    expect(h.core.record!.seats[0]!.tokenHash).toBe(await sha256Hex(first.token));

    const fresh = new RoomCore(null, Harness.deps());
    const bad = await fresh.create('K7M2QX', '   ', 0);
    expect(bad).toMatchObject({ ok: false, error: 'BAD_NICKNAME' });
    expect(bad.effects.persist).toBe(false);
    expect(bad.effects.alarm).toBeNull();
    expect(fresh.record).toBeNull();
  });

  it('dois create ao mesmo tempo → um ok e um EXISTS', async () => {
    const core = new RoomCore(null, Harness.deps());
    const [a, b] = await Promise.all([core.create('K7M2QX', 'Ana', 1), core.create('K7M2QX', 'Bia', 1)]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toMatchObject({ error: 'EXISTS' });
    expect(core.record!.seats).toHaveLength(1);
  });

  it('token determinístico pela semente das deps', async () => {
    const a = await new Harness('x').create();
    const b = await new Harness('x').create();
    const c = await new Harness('y').create();
    expect(a.token).toBe(b.token);
    expect(a.token).not.toBe(c.token);
  });
});

describe('sala: entrar', () => {
  it('entrar ocupa p2; terceira entrada → FULL; sala vazia → NOT_FOUND sem gravar', async () => {
    const empty = new RoomCore(null, Harness.deps());
    const nf = await empty.join('Bia', [], 0);
    expect(nf).toMatchObject({ ok: false, error: 'NOT_FOUND' });
    expect(nf.effects.persist).toBe(false);
    expect(nf.effects.alarm).toBeNull();
    expect(empty.record).toBeNull();

    const h = new Harness();
    await h.create();
    const bia = await h.join();
    expect(bia).toMatchObject({ playerId: 'p2' });
    expect(bia.token).toMatch(/^[A-Za-z0-9_-]{43}$/);
    const rec = h.core.record!;
    expect(rec.seats.map((s) => s.id)).toEqual(['p1', 'p2']);
    expect(rec.seats[1]).toEqual({
      id: 'p2',
      nickname: 'Bia',
      tokenHash: await sha256Hex(bia.token),
      ready: false,
      wantsRematch: false,
      offlineSince: 1_000_000,
    });
    expect(JSON.stringify(rec)).not.toContain(bia.token);
    expect(h.logs).toContainEqual({ evt: 'room.joined', code: 'K7M2QX', playerId: 'p2' });

    const full = await h.core.join('Caio', [], h.now);
    expect(full).toMatchObject({ ok: false, error: 'FULL' });
    expect(full.effects.persist).toBe(false);
    expect(full.effects.send).toEqual([]);
    expect(h.core.record!.seats).toHaveLength(2);
  });

  it('entrar persiste e manda room só aos sockets autenticados', async () => {
    const h = new Harness();
    await h.create();
    const sockets: SocketInfo[] = [
      { socketId: 'a', seat: 'p1', connectedAt: 1, lastSeenAt: 1 },
      { socketId: 'b', seat: null, connectedAt: 1, lastSeenAt: 1 },
    ];
    const r = await h.core.join('Bia', sockets, h.now);
    expect(r.ok).toBe(true);
    expect(r.effects.persist).toBe(true);
    expect(r.effects.send).toHaveLength(1);
    const sent = r.effects.send[0]!;
    expect(sent.socketId).toBe('a');
    expect(sent.message).toMatchObject({
      t: 'room',
      code: 'K7M2QX',
      status: 'LOBBY',
      gameNo: 0,
      seats: [
        { playerId: 'p1', nickname: 'Ana', connected: true },
        { playerId: 'p2', nickname: 'Bia', connected: false },
      ],
    });
  });

  it('apelido inválido no join → BAD_NICKNAME sem gravar', async () => {
    const h = new Harness();
    await h.create();
    const before = JSON.stringify(h.core.record);
    const r = await h.core.join('x'.repeat(21), [], h.now);
    expect(r).toMatchObject({ ok: false, error: 'BAD_NICKNAME' });
    expect(r.effects.persist).toBe(false);
    expect(JSON.stringify(h.core.record)).toBe(before);
    const none = await new RoomCore(null, Harness.deps()).join('', [], 0);
    expect(none).toMatchObject({ ok: false, error: 'BAD_NICKNAME' });
  });

  it('assento livre: depois que p1 sai, quem entra fica com p1', async () => {
    const h = new Harness();
    await h.create();
    await h.join();
    h.core.record!.seats = h.core.record!.seats.filter((s) => s.id === 'p2');
    const r = await h.join('Caio');
    expect(r.playerId).toBe('p1');
    expect(h.core.record!.seats.map((s) => [s.id, s.nickname])).toEqual([
      ['p1', 'Caio'],
      ['p2', 'Bia'],
    ]);
  });

  it('assento livre: depois que p2 sai, quem entra fica com p2', async () => {
    const h = new Harness();
    await h.create();
    await h.join();
    h.core.record!.seats = h.core.record!.seats.filter((s) => s.id === 'p1');
    expect((await h.join('Caio')).playerId).toBe('p2');
  });

  it('dois join ao mesmo tempo (Promise.all) → um ok e um FULL', async () => {
    const h = new Harness();
    await h.create();
    const [a, b] = await Promise.all([h.core.join('Bia', [], h.now), h.core.join('Caio', [], h.now)]);
    expect([a.ok, b.ok].sort()).toEqual([false, true]);
    expect([a, b].find((r) => !r.ok)).toMatchObject({ error: 'FULL' });
    expect(h.core.record!.seats).toHaveLength(2);
    expect(h.core.record!.seats.map((s) => s.id)).toEqual(['p1', 'p2']);
  });
});

describe('sala: info', () => {
  it('info: dados públicos sem token nem hash', async () => {
    const h = new Harness();
    expect(h.core.info()).toBeNull();
    const ana = await h.create();
    expect(h.core.info()).toEqual({ code: 'K7M2QX', status: 'LOBBY', nicknames: ['Ana'], full: false });
    const bia = await h.join();
    const info = h.core.info();
    expect(info).toEqual({ code: 'K7M2QX', status: 'LOBBY', nicknames: ['Ana', 'Bia'], full: true });
    const json = JSON.stringify(info);
    expect(json).not.toContain(ana.token);
    expect(json).not.toContain(bia.token);
    expect(json).not.toContain('tokenHash');
  });
});

describe('roomMessage', () => {
  const base = (): RoomRecord => ({
    schema: 1,
    code: 'K7M2QX',
    createdAt: 100,
    status: 'LOBBY',
    seats: [
      { id: 'p1', nickname: 'Ana', tokenHash: 'h1', ready: true, wantsRematch: false, offlineSince: null },
      { id: 'p2', nickname: 'Bia', tokenHash: 'h2', ready: false, wantsRematch: true, offlineSince: 5_000 },
    ],
    score: { p1: 1, p2: 2, draws: 3 },
    gameNo: 4,
    outcome: null,
    seq: 0,
    epoch: 0,
    game: null,
    agenda: [],
  });
  const sock = (seat: 'p1' | 'p2' | null): SocketInfo => ({
    socketId: `s-${seat}`,
    seat,
    connectedAt: 0,
    lastSeenAt: 0,
  });

  it('connected vem dos sockets; woAt só em PLAYING; sem outcome fora do fim', () => {
    const rec = base();
    const lobby = roomMessage(rec, [sock('p1'), sock(null)], 0);
    expect(lobby).toEqual({
      t: 'room',
      code: 'K7M2QX',
      status: 'LOBBY',
      seats: [
        { playerId: 'p1', nickname: 'Ana', connected: true, ready: true, wantsRematch: false },
        { playerId: 'p2', nickname: 'Bia', connected: false, ready: false, wantsRematch: true },
      ],
      score: { p1: 1, p2: 2, draws: 3 },
      gameNo: 4,
      expiresAt: 100 + TIMERS.hardExpiryMs,
    });
    expect('outcome' in lobby).toBe(false);
    expect('woAt' in lobby.seats[1]!).toBe(false);

    rec.status = 'PLAYING';
    const playing = roomMessage(rec, [sock('p1')], 0);
    expect(playing.seats[0]).not.toHaveProperty('woAt');
    expect(playing.seats[1]).toMatchObject({ connected: false, woAt: 5_000 + TIMERS.reconnectMs });
  });

  it('inclui outcome quando existe', () => {
    const rec = base();
    rec.status = 'FINISHED';
    rec.outcome = { gameNo: 4, result: null, cause: 'ABANDONED' };
    expect(roomMessage(rec, [], 0).outcome).toEqual({ gameNo: 4, result: null, cause: 'ABANDONED' });
  });

  it('placar e desfecho são cópias: mudar o registro depois não altera a mensagem já montada', () => {
    const rec = base();
    rec.status = 'FINISHED';
    rec.outcome = { gameNo: 4, result: null, cause: 'ABANDONED' };
    const message = roomMessage(rec, [], 0);
    rec.score.p1 += 1;
    rec.outcome.cause = 'CONCEDE';
    expect(message.score).toEqual({ p1: 1, p2: 2, draws: 3 });
    expect(message.outcome).toEqual({ gameNo: 4, result: null, cause: 'ABANDONED' });
  });

  it('expiresAt é o menor entre idleExpiry e hardExpiry', () => {
    const rec = base();
    rec.agenda = [
      { kind: 'phase', at: 1, epoch: 0 },
      { kind: 'hardExpiry', at: 900 },
      { kind: 'idleExpiry', at: 400 },
    ];
    expect(roomMessage(rec, [], 0).expiresAt).toBe(400);
    rec.agenda = [{ kind: 'hardExpiry', at: 900 }];
    expect(roomMessage(rec, [], 0).expiresAt).toBe(900);
    rec.agenda = [{ kind: 'phase', at: 1, epoch: 0 }];
    expect(roomMessage(rec, [], 0).expiresAt).toBe(100 + TIMERS.hardExpiryMs);
  });
});
