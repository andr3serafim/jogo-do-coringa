import { legalActions, viewEvents, viewFor } from '@coringa/engine';
import type { GameEvent } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { setup } from '@coringa/engine/testing';
import { RoomCore } from '../../src/core/room-core.ts';
import { sweep } from '../../src/core/presence.ts';
import { STATE_SCHEMA, TIMERS } from '../../src/core/timers.ts';
import type { AgendaItem, RoomRecord, SeatId, SocketInfo } from '../../src/core/types.ts';
import { CODE, Harness } from './harness.ts';

const kinds = (record: RoomRecord | null): string[] => (record?.agenda ?? []).map((item) => item.kind);
const find = <K extends AgendaItem['kind']>(record: RoomRecord, kind: K): Extract<AgendaItem, { kind: K }> | undefined =>
  record.agenda.find((item): item is Extract<AgendaItem, { kind: K }> => item.kind === kind);
const info = (socketId: string, seat: SeatId | null, connectedAt = 0, lastSeenAt = 0): SocketInfo => ({
  socketId,
  seat,
  connectedAt,
  lastSeenAt,
});

describe('queda e volta no meio da partida', () => {
  it('queda limpa na partida: woAt no room; volta aos 59 s cancela; aos 60 s W.O. RECONNECT_TIMEOUT', async () => {
    const { h, p1, p2, tokens } = await Harness.playing();
    const rec = h.core.record!;
    const t = h.now;
    h.close(p2);
    expect(rec.seats[1]!.offlineSince).toBe(t);
    expect(find(rec, 'reconnect')).toEqual({ kind: 'reconnect', at: t + 60_000, seat: 'p2', gameNo: 1 });
    expect(h.logs).toContainEqual({ evt: 'player.disconnected', code: CODE, playerId: 'p2', gameNo: 1 });
    expect(h.messages(p1, 'room').at(-1)!.seats[1]).toMatchObject({ playerId: 'p2', connected: false, woAt: t + 60_000 });

    // Volta aos 59 s: o prazo cai, o W.O. não sai.
    h.advance(59_000);
    const back = h.open();
    await h.send(back, h.hello(tokens.p2));
    expect(rec.seats[1]!.offlineSince).toBeNull();
    expect(find(rec, 'reconnect')).toBeUndefined();
    expect(h.logs).toContainEqual({ evt: 'player.reconnected', code: CODE, playerId: 'p2', gameNo: 1 });
    expect(h.messages(p1, 'room').at(-1)!.seats[1]).toMatchObject({ connected: true });
    expect(h.messages(p1, 'room').at(-1)!.seats[1]).not.toHaveProperty('woAt');
    h.advance(5_000);
    expect(rec.status).toBe('PLAYING');
    expect(h.logs.some((line) => line.evt === 'wo.applied')).toBe(false);

    // Outra partida: aos 60 s o prazo vence e p1 ganha por W.O.
    const second = await Harness.playing();
    const h2 = second.h;
    const rec2 = h2.core.record!;
    h2.close(second.p2);
    h2.advance(59_999);
    expect(rec2.status).toBe('PLAYING');
    h2.advance(1);
    expect(rec2.status).toBe('FINISHED');
    expect(rec2.outcome).toEqual({ gameNo: 1, result: { kind: 'WIN', winner: 'p1', reason: 'FORFEIT' }, cause: 'RECONNECT_TIMEOUT', durationMs: expect.any(Number) });
    expect(rec2.score).toEqual({ p1: 1, p2: 0 });
    expect(rec2.game!.steps.at(-1)).toEqual({ player: 'system', action: { type: 'FORFEIT', loser: 'p2' } });
    expect(h2.logs).toContainEqual({ evt: 'wo.applied', code: CODE, gameNo: 1, loser: 'p2', cause: 'RECONNECT_TIMEOUT' });
    expect(h2.logs.map((line) => line.evt).slice(-3)).toEqual(['wo.applied', 'game.ended', 'game.replay']);
    expect(h2.messages(second.p1, 'room').at(-1)).toMatchObject({ status: 'FINISHED', outcome: { cause: 'RECONNECT_TIMEOUT' } });
    expect(h2.messages(second.p1, 'state').at(-1)!.seq).toBe(rec2.seq);
    expect(kinds(rec2).filter((kind) => kind === 'reconnect' || kind === 'presenceSweep')).toEqual([]);
  });

  it('os dois fora quando vence o prazo → abandono: FINISHED, result null, placar igual, logs game.ended ABANDONED e game.replay', async () => {
    const { h, p1, p2, tokens } = await Harness.playing();
    const rec = h.core.record!;
    const t = h.now;
    h.close(p1);
    h.advance(10_000);
    h.close(p2);
    expect(kinds(rec)).toContain('idleExpiry');
    expect(find(rec, 'idleExpiry')!.at).toBe(t + 10_000 + TIMERS.idleExpiryMs);
    h.advance(50_000); // t + 60 s: vence o reconnect de p1 e o outro (p2) está fora
    expect(rec.status).toBe('FINISHED');
    expect(rec.outcome).toEqual({ gameNo: 1, result: null, cause: 'ABANDONED', durationMs: expect.any(Number) });
    expect(rec.score).toEqual({ p1: 0, p2: 0 });
    expect(rec.game!.steps.some((step) => step.action.type === 'FORFEIT')).toBe(false);
    expect(h.logs).toContainEqual(expect.objectContaining({ evt: 'game.ended', gameNo: 1, result: null, cause: 'ABANDONED' }));
    expect(h.logs.some((line) => line.evt === 'game.replay')).toBe(true);
    expect(h.logs.some((line) => line.evt === 'wo.applied')).toBe(false);
    expect(kinds(rec).filter((kind) => kind === 'reconnect' || kind === 'presenceSweep')).toEqual([]);
    expect(kinds(rec)).toContain('idleExpiry');

    // Revanche possível: os dois voltam e pedem.
    const a = h.open();
    await h.send(a, h.hello(tokens.p1));
    expect(h.messages(a, 'room').at(-1)).toMatchObject({ status: 'FINISHED', outcome: { cause: 'ABANDONED', result: null } });
    await h.send(a, { t: 'rematch', want: true });
    const b = h.open();
    await h.send(b, h.hello(tokens.p2));
    await h.send(b, { t: 'rematch', want: true });
    expect(rec).toMatchObject({ status: 'PLAYING', gameNo: 2, score: { p1: 0, p2: 0 } });
  });

  it('dois fora e um volta a tempo: o que ficou fora perde por W.O.', async () => {
    const { h, p1, p2, tokens } = await Harness.playing();
    const rec = h.core.record!;
    h.close(p1);
    h.advance(10_000);
    h.close(p2);
    h.advance(10_000);
    const back = h.open();
    await h.send(back, h.hello(tokens.p1));
    expect(find(rec, 'idleExpiry')).toBeUndefined();
    h.advance(50_000); // vence o reconnect de p2 (t + 70 s) com p1 conectado
    expect(rec.outcome).toEqual({ gameNo: 1, result: { kind: 'WIN', winner: 'p1', reason: 'FORFEIT' }, cause: 'RECONNECT_TIMEOUT', durationMs: expect.any(Number) });
    expect(p2.open).toBe(false);
  });

  it('reconnect obsoleto (outra partida, assento já de volta ou partida acabada) é consumido sem efeito', async () => {
    const { h } = await Harness.playing();
    const rec = h.core.record!;
    rec.agenda.push({ kind: 'reconnect', at: h.now, seat: 'p2', gameNo: 99 }); // outra partida
    rec.agenda.push({ kind: 'reconnect', at: h.now, seat: 'p1', gameNo: 1 }); // p1 está conectado
    const effects = h.core.onAlarm(h.sockets, h.now);
    expect(rec.status).toBe('PLAYING');
    expect(kinds(rec).filter((kind) => kind === 'reconnect')).toEqual([]);
    expect(effects.send).toEqual([]);
    expect(effects.alarm).toBe(Math.min(...rec.agenda.map((item) => item.at)));
    // Partida acabada
    await h.send(h.fakes[0]!, { t: 'concede', id: 'c' });
    rec.agenda.push({ kind: 'reconnect', at: h.now, seat: 'p2', gameNo: 1 });
    rec.seats[1]!.offlineSince = h.now - 1;
    const after = h.core.onAlarm(h.sockets, h.now);
    expect(rec.outcome).toMatchObject({ cause: 'CONCEDE' });
    expect(after.send).toEqual([]);
    expect(kinds(rec)).not.toContain('reconnect');
  });
});

describe('queda silenciosa e varredura', () => {
  it('queda silenciosa: varredura (só em PLAYING) fecha 4008 e a saída conta do último sinal', async () => {
    const { h, p1, p2 } = await Harness.playing();
    const rec = h.core.record!;
    // A varredura roda a cada 20 s a partir da largada: aos 14,5 s o silêncio de p2 começa e a
    // varredura dos 60 s (45,5 s depois do último sinal) é a primeira que o pega.
    h.advance(14_500);
    const t = h.now;
    h.silent(p2);
    h.advance(46_000);
    expect(p2.closed).toEqual({ code: 4008, reason: 'sem sinal' });
    expect(p1.open).toBe(true);
    expect(rec.seats[1]!.offlineSince).toBe(t);
    expect(find(rec, 'reconnect')).toEqual({ kind: 'reconnect', at: t + 60_000, seat: 'p2', gameNo: 1 });
    expect(h.messages(p1, 'room').at(-1)!.seats[1]).toMatchObject({ connected: false, woAt: t + 60_000 });
    expect(h.logs).toContainEqual({ evt: 'player.disconnected', code: CODE, playerId: 'p2', gameNo: 1 });
    expect(find(rec, 'presenceSweep')!.at).toBeGreaterThan(h.now);
    // O W.O. sai no prazo contado do último sinal.
    h.advance(13_999);
    expect(rec.status).toBe('PLAYING');
    h.advance(1);
    expect(rec.outcome).toMatchObject({ cause: 'RECONNECT_TIMEOUT', result: { kind: 'WIN', winner: 'p1' } });
  });

  it('se o instante t + 60 s já passou quando a varredura pega a queda, o W.O. sai no mesmo alarme', async () => {
    const { h, p1, p2 } = await Harness.playing();
    const rec = h.core.record!;
    h.silent(p2);
    // O alarme da varredura atrasou muito: agora é 100 s depois do último sinal.
    h.now += 100_000;
    p1.lastSeenAt = h.now;
    const effects = h.core.onAlarm(h.sockets, h.now);
    expect(effects.close).toContainEqual({ socketId: p2.id, code: 4008, reason: 'sem sinal' });
    expect(rec.status).toBe('FINISHED');
    expect(rec.outcome).toMatchObject({ cause: 'RECONNECT_TIMEOUT', result: { kind: 'WIN', winner: 'p1' } });
    expect(effects.logs.map((line) => line.evt)).toEqual(['player.disconnected', 'wo.applied', 'game.ended', 'game.replay']);
    expect(effects.persist).toBe(true);
    expect(kinds(rec)).not.toContain('presenceSweep');
    expect(effects.send.some((entry) => entry.socketId === p1.id && entry.message.t === 'room')).toBe(true);
  });

  it('os dois mudos com 10 s de diferença: o primeiro reconnect vence com o outro já sem sinal → abandono, não W.O.', async () => {
    const { h, p1, p2 } = await Harness.playing();
    const rec = h.core.record!;
    // Varreduras a cada 20 s da largada (T0): p1 fica mudo em T0 + 10 s e p2 em T0 + 20 s.
    h.advance(10_000);
    h.silent(p1);
    h.advance(10_000);
    h.silent(p2);
    // A varredura dos 60 s pega só p1 (50 s sem sinal; p2 tem 40 s). O reconnect de p1 vence em T0 + 70 s,
    // quando p2 já passou dos 45 s sem sinal embora a varredura dos 80 s ainda não tenha rodado.
    h.advance(40_000);
    expect(p1.closed).toEqual({ code: 4008, reason: 'sem sinal' });
    expect(rec.seats[1]!.offlineSince).toBeNull();
    expect(rec.status).toBe('PLAYING');
    h.advance(10_000);
    expect(p2.closed).toEqual({ code: 4008, reason: 'sem sinal' });
    expect(rec.status).toBe('FINISHED');
    expect(rec.outcome).toEqual({ gameNo: 1, result: null, cause: 'ABANDONED', durationMs: expect.any(Number) });
    expect(rec.score).toEqual({ p1: 0, p2: 0 });
    expect(rec.game!.steps.some((step) => step.action.type === 'FORFEIT')).toBe(false);
    expect(h.logs.some((line) => line.evt === 'wo.applied')).toBe(false);
    expect(h.logs.filter((line) => line.evt === 'player.disconnected').map((line) => (line.evt === 'player.disconnected' ? line.playerId : ''))).toEqual(['p1', 'p2']);
    expect(h.logs).toContainEqual(expect.objectContaining({ evt: 'game.ended', result: null, cause: 'ABANDONED' }));
    // Cada socket é fechado uma vez só, mesmo com a conferência e a varredura no mesmo alarme.
    expect(h.closed.filter((entry) => entry.socketId === p2.id)).toHaveLength(1);
  });

  it('sockets sem hello há mais de 10 s caem com 4008 na varredura da partida', async () => {
    const { h } = await Harness.playing();
    const stray = h.open();
    h.advance(19_999);
    expect(stray.open).toBe(true);
    h.advance(1);
    expect(stray.closed).toEqual({ code: 4008, reason: 'sem hello' });
  });

  it('sem varredura fora de partida: no lobby, a agenda só tem expirações', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    const rec = h.core.record!;
    const allowed = ['idleExpiry', 'hardExpiry'];
    expect(kinds(rec).every((kind) => allowed.includes(kind))).toBe(true);
    h.silent(p2);
    h.advance(10 * 60_000);
    expect(p2.open).toBe(true);
    expect(rec.seats[1]!.offlineSince).toBeNull();
    expect(kinds(rec).every((kind) => allowed.includes(kind))).toBe(true);
    expect(h.alarm).toBe(rec.createdAt + TIMERS.hardExpiryMs); // a aba esquecida não acorda o objeto
    await h.send(p1, { t: 'ready', ready: true });
    expect(kinds(rec).every((kind) => allowed.includes(kind))).toBe(true);

    // Depois do fim também não há varredura.
    const done = await Harness.playing();
    await done.h.send(done.p1, { t: 'concede', id: 'c' });
    expect(kinds(done.h.core.record).every((kind) => allowed.includes(kind))).toBe(true);
    done.h.silent(done.p2);
    done.h.advance(5 * 60_000);
    expect(done.p2.open).toBe(true);
  });

  it('varredura obsoleta (fora de PLAYING ou de outra partida) é consumida, não reagenda e fora de PLAYING não fecha ninguém', async () => {
    const { h, p1, p2 } = await Harness.playing();
    const rec = h.core.record!;
    h.now += 100_000;
    p1.lastSeenAt = h.now;
    p2.lastSeenAt = h.now;
    rec.agenda = rec.agenda.filter((item) => item.kind !== 'presenceSweep' && item.kind !== 'phase');
    rec.agenda.push({ kind: 'presenceSweep', at: h.now, gameNo: 7 });
    const wrongGame = h.core.onAlarm(h.sockets, h.now);
    expect(wrongGame.close).toEqual([]);
    expect(kinds(rec)).not.toContain('presenceSweep');

    await h.send(p1, { t: 'concede', id: 'c' });
    h.silent(p2);
    h.now += 100_000;
    p1.lastSeenAt = h.now;
    rec.agenda.push({ kind: 'presenceSweep', at: h.now, gameNo: 1 });
    const finished = h.core.onAlarm(h.sockets, h.now);
    expect(finished.close).toEqual([]);
    expect(kinds(rec)).not.toContain('presenceSweep');
  });

  it('sweep(): socket silencioso e saudável no mesmo assento não derruba o assento; sem hello usa connectedAt', async () => {
    const { h } = await Harness.playing();
    const rec = h.core.record!;
    const now = h.now + 100_000;
    const result = sweep(
      rec,
      [
        info('velho', 'p1', 0, now - 46_000),
        info('novo', 'p1', 0, now),
        info('quase', 'p2', 0, now - 45_000),
        info('sem-hello', null, now - 10_001, now),
        info('recente', null, now - 10_000, now),
      ],
      now,
    );
    expect(result.close).toEqual([
      { socketId: 'velho', code: 4008, reason: 'sem sinal' },
      { socketId: 'sem-hello', code: 4008, reason: 'sem hello' },
    ]);
    expect(result.logs).toEqual([]);
    expect(rec.seats.map((seat) => seat.offlineSince)).toEqual([null, null]);
  });
});

describe('hello sem hello e limite no onOpen', () => {
  it('um socket novo derruba os sem hello com mais de 10 s e eles deixam de contar para o limite de 4', async () => {
    const { h } = await Harness.lobby();
    const olds = [h.open(), h.open(), h.open(), h.open()];
    h.now += 10_001;
    const fresh = h.open();
    expect(olds.map((sock) => sock.closed)).toEqual(Array(4).fill({ code: 4008, reason: 'sem hello' }));
    expect(fresh.open).toBe(true);
    expect(fresh.closed).toBeNull();
    // Com 10 s exatos ainda não caem.
    const young = h.open();
    h.now += 10_000;
    h.open();
    expect(young.open).toBe(true);
  });
});

describe('reconciliação ao acordar', () => {
  async function playingRecord(): Promise<{ h: Harness; core: RoomCore; record: RoomRecord }> {
    const { h } = await Harness.playing();
    const record = structuredClone(h.core.record!);
    return { h, core: new RoomCore(record, Harness.deps()), record };
  }

  it('reconciliação depois de reinício: assento sem socket vivo passa a estar fora agora', async () => {
    const { h, core, record } = await playingRecord();
    expect(record.seats.map((seat) => seat.offlineSince)).toEqual([null, null]);
    expect(kinds(record)).not.toContain('reconnect');
    const now = h.now + 5_000;
    const effects = core.reconcile([info('a', 'p1', 0, now)], now);
    expect(record.seats.map((seat) => seat.offlineSince)).toEqual([null, now]);
    expect(find(record, 'reconnect')).toEqual({ kind: 'reconnect', at: now + 60_000, seat: 'p2', gameNo: 1 });
    expect(kinds(record)).not.toContain('idleExpiry');
    expect(effects.persist).toBe(true);
    expect(effects.logs).toEqual([{ evt: 'player.disconnected', code: CODE, playerId: 'p2', gameNo: 1 }]);
    expect(effects.send).toHaveLength(1);
    expect(effects.send[0]).toMatchObject({ socketId: 'a', message: { t: 'room' } });
    const room = effects.send[0]!.message;
    expect(room.t === 'room' && room.seats[1]).toMatchObject({ connected: false, woAt: now + 60_000 });
    expect(effects.alarm).toBe(Math.min(...record.agenda.map((item) => item.at)));
    expect(effects.close).toEqual([]);
    expect(effects.deleteAll).toBe(false);
  });

  it('ninguém conectado: os dois ficam fora, cada um com o seu prazo, e a sala ganha idleExpiry em now + 30 min', async () => {
    const { h, core, record } = await playingRecord();
    const now = h.now + 7_000;
    const effects = core.reconcile([], now);
    expect(record.seats.map((seat) => seat.offlineSince)).toEqual([now, now]);
    expect(record.agenda.filter((item) => item.kind === 'reconnect').map((item) => (item.kind === 'reconnect' ? item.seat : ''))).toEqual(['p1', 'p2']);
    expect(find(record, 'idleExpiry')).toEqual({ kind: 'idleExpiry', at: now + TIMERS.idleExpiryMs });
    expect(effects.send).toEqual([]);
    expect(effects.logs.map((line) => line.evt)).toEqual(['player.disconnected', 'player.disconnected']);
  });

  it('garante a varredura em PLAYING: acrescenta quando falta e não duplica quando já existe', async () => {
    const { h, core, record } = await playingRecord();
    const sweepAt = find(record, 'presenceSweep')!.at;
    core.reconcile([info('a', 'p1'), info('b', 'p2')], h.now + 1_000);
    expect(record.agenda.filter((item) => item.kind === 'presenceSweep')).toEqual([{ kind: 'presenceSweep', at: sweepAt, gameNo: 1 }]);
    record.agenda = record.agenda.filter((item) => item.kind !== 'presenceSweep');
    const now = h.now + 2_000;
    const effects = core.reconcile([info('a', 'p1'), info('b', 'p2')], now);
    expect(record.agenda.filter((item) => item.kind === 'presenceSweep')).toEqual([
      { kind: 'presenceSweep', at: now + TIMERS.presenceSweepMs, gameNo: 1 },
    ]);
    expect(effects.persist).toBe(true);
  });

  it('tudo em ordem: nada muda, nada grava; idleExpiry velho some se alguém está conectado e um existente é mantido se não', async () => {
    const { h, core, record } = await playingRecord();
    const before = JSON.stringify(record);
    const quiet = core.reconcile([info('a', 'p1'), info('b', 'p2')], h.now + 1_000);
    expect(JSON.stringify(record)).toBe(before);
    expect(quiet.persist).toBe(false);
    expect(quiet.send).toEqual([]);

    record.agenda.push({ kind: 'idleExpiry', at: 123 });
    const stale = core.reconcile([info('a', 'p1'), info('b', 'p2')], h.now + 2_000);
    expect(kinds(record)).not.toContain('idleExpiry');
    expect(stale.persist).toBe(true);

    const first = core.reconcile([], h.now + 3_000);
    const at = find(record, 'idleExpiry')!.at;
    expect(at).toBe(h.now + 3_000 + TIMERS.idleExpiryMs);
    const second = core.reconcile([], h.now + 900_000);
    expect(find(record, 'idleExpiry')!.at).toBe(at);
    expect(second.persist).toBe(false);
    expect(first.alarm).not.toBeNull();
  });

  it('no lobby, o assento sem socket perde o pronto e não ganha prazo de W.O. nem varredura', async () => {
    const { h, p1 } = await Harness.lobby();
    await h.send(p1, { t: 'ready', ready: true });
    const record = structuredClone(h.core.record!);
    const core = new RoomCore(record, Harness.deps());
    const effects = core.reconcile([info('a', 'p1', 0, h.now)], h.now + 1_000);
    expect(record.seats[1]).toMatchObject({ offlineSince: h.now + 1_000, ready: false });
    expect(record.seats[0]).toMatchObject({ offlineSince: null, ready: true });
    expect(kinds(record).sort()).toEqual(['hardExpiry']);
    expect(effects.logs).toEqual([]);
    expect(effects.send).toHaveLength(1);
  });

  it('registro nulo: não faz nada', () => {
    const core = new RoomCore(null, Harness.deps());
    const effects = core.reconcile([info('a', 'p1')], 5);
    expect(effects).toMatchObject({ send: [], close: [], persist: false, deleteAll: false, alarm: null, logs: [] });
  });

  it('schema diferente ao acordar → room.reset e 4000', async () => {
    const { h } = await Harness.playing();
    const record = structuredClone(h.core.record!);
    record.schema = STATE_SCHEMA + 1;
    const core = new RoomCore(record, Harness.deps());
    const effects = core.reconcile([info('a', 'p1'), info('b', 'p2'), info('c', null)], h.now);
    expect(effects.close).toEqual(['a', 'b', 'c'].map((socketId) => ({ socketId, code: 4000, reason: expect.any(String) })));
    expect(effects.deleteAll).toBe(true);
    expect(effects.persist).toBe(false);
    expect(effects.alarm).toBeNull();
    expect(effects.send).toEqual([]);
    expect(effects.logs).toEqual([{ evt: 'room.reset', code: CODE, status: 'PLAYING', reason: expect.any(String) }]);
    expect(core.record).toBeNull();
    const reopened = core.onOpen(info('d', null), [info('d', null)], h.now);
    expect(reopened.close).toEqual([{ socketId: 'd', code: 4000, reason: expect.any(String) }]);
  });
});

describe('volta com eventos perdidos', () => {
  /** p1 cai logo na largada; o jogo anda sem ele (estouros) e ele volta pedindo desde `lastSeq`. */
  async function away(): Promise<{ h: Harness; tokens: Record<SeatId, string> }> {
    const { h, p1, p2, tokens } = await Harness.playing();
    h.close(p1);
    // p2 equipa (passo 2) e o Equipar de p1 estoura (passo 3, com a rodada nova e as cartas dela).
    const equip = legalActions(viewFor(h.core.record!.game!.state, 'p2')).find((a) => a.type === 'EQUIP')!;
    await h.send(p2, { t: 'act', id: 'eq', epoch: h.core.record!.epoch, action: equip as PlayerAction });
    h.advance(TIMERS.equipMs + TIMERS.graceMs + 1);
    h.advance(1_000);
    return { h, tokens };
  }

  async function comeBack(h: Harness, token: string, lastSeq?: number) {
    const sock = h.open();
    const hello = h.hello(token);
    if (hello.t === 'hello' && lastSeq !== undefined) hello.lastSeq = lastSeq;
    await h.send(sock, hello);
    return { sock, state: h.messages(sock, 'state') };
  }

  it('volta com eventos perdidos: ≤ 50 passos → catchUp em ordem; mais → resync; lastSeq > seq → resync', async () => {
    const { h, tokens } = await away();
    const rec = h.core.record!;
    expect(rec.seq).toBeGreaterThanOrEqual(3);
    const lost = rec.game!.recent.filter((step) => step.seq > 1);
    expect(lost.length).toBe(rec.seq - 1);
    const expected = lost.flatMap((step) => viewEvents(step.events, 'p1'));
    expect(expected.length).toBeGreaterThan(0);

    const { sock, state } = await comeBack(h, tokens.p1, 1);
    expect(state).toHaveLength(1);
    expect(state[0]).toMatchObject({ seq: rec.seq, epoch: rec.epoch, catchUp: true, events: expected });
    expect(state[0]).not.toHaveProperty('resync');
    expect(state[0]!.view).toEqual(viewFor(rec.game!.state, 'p1'));
    expect(sock.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state']);

    // Sem lastSeq, lastSeq > seq → retrato inteiro.
    h.close(sock);
    const none = await comeBack(h, tokens.p1);
    expect(none.state[0]).toMatchObject({ resync: true, events: [] });
    expect(none.state[0]).not.toHaveProperty('catchUp');
    h.close(none.sock);
    const ahead = await comeBack(h, tokens.p1, rec.seq + 1);
    expect(ahead.state[0]).toMatchObject({ resync: true, events: [] });
    expect(ahead.state[0]).not.toHaveProperty('catchUp');
  });

  it('lastSeq === seq → state sem eventos e com catchUp', async () => {
    const { h, tokens } = await away();
    const rec = h.core.record!;
    const { state } = await comeBack(h, tokens.p1, rec.seq);
    expect(state[0]).toMatchObject({ seq: rec.seq, catchUp: true, events: [] });
    expect(state[0]).not.toHaveProperty('resync');
  });

  it('o limite do anel: seq − 50 ainda é catchUp, seq − 51 e 0 contra 100 passos viram resync', async () => {
    const { h, tokens } = await away();
    const rec = h.core.record!;
    const turn = (n: number): GameEvent[] => [{ type: 'TurnStarted', player: n % 2 === 0 ? 'p1' : 'p2' }];
    rec.seq = 100;
    rec.game!.recent = Array.from({ length: 50 }, (_, i) => ({ seq: 51 + i, events: turn(51 + i) }));
    const edge = await comeBack(h, tokens.p1, 50);
    expect(edge.state[0]).toMatchObject({ catchUp: true });
    expect(edge.state[0]!.events).toEqual(rec.game!.recent.flatMap((step) => step.events));
    expect(edge.state[0]!.events).toHaveLength(50);
    h.close(edge.sock);
    const out = await comeBack(h, tokens.p1, 49);
    expect(out.state[0]).toMatchObject({ resync: true, events: [] });
    h.close(out.sock);
    const far = await comeBack(h, tokens.p1, 0);
    expect(far.state[0]).toMatchObject({ resync: true, events: [] });
    h.close(far.sock);
    // Anel com buraco: falta um passo no meio.
    rec.game!.recent.splice(20, 1);
    const hole = await comeBack(h, tokens.p1, 60);
    expect(hole.state[0]).toMatchObject({ resync: true, events: [] });
  });

  it('em FINISHED a volta também aceita catchUp; sem partida (lobby) o lastSeq é ignorado', async () => {
    const { h, p1, p2, tokens } = await Harness.playing();
    h.close(p1);
    await h.send(p2, { t: 'concede', id: 'c' });
    const rec = h.core.record!;
    const { state } = await comeBack(h, tokens.p1, rec.seq - 1);
    expect(state[0]).toMatchObject({ seq: rec.seq, catchUp: true });
    expect(state[0]!.events).toEqual(viewEvents(rec.game!.recent.at(-1)!.events, 'p1'));

    const lobby = await Harness.lobby();
    lobby.h.close(lobby.p1);
    const back = await comeBack(lobby.h, lobby.tokens.p1, 3);
    expect(back.state).toEqual([]);
    expect(back.sock.inbox.map((m) => m.t)).toEqual(['welcome', 'room']);
  });
});

describe('expiração da sala', () => {
  it('expiração ociosa (30 min sem ninguém) e de teto (24 h): 4000, deleteAll, room.expired', async () => {
    // Ociosa: ninguém chega a conectar.
    const idle = new Harness();
    await idle.create('Ana');
    const stray = idle.open();
    idle.advance(TIMERS.idleExpiryMs - 1);
    expect(idle.deleted).toBe(false);
    idle.advance(1);
    expect(idle.deleted).toBe(true);
    expect(idle.core.record).toBeNull();
    expect(stray.closed).toEqual({ code: 4000, reason: expect.any(String) });
    expect(idle.logs).toContainEqual({ evt: 'room.expired', code: CODE, status: 'LOBBY', reason: 'IDLE' });
    expect(idle.alarm).toBeNull();

    // Ociosa depois que o último saiu: o relógio conta da saída.
    const left = await Harness.lobby();
    left.h.advance(60_000);
    left.h.close(left.p1);
    left.h.advance(20_000);
    left.h.close(left.p2);
    const leftAt = left.h.now;
    expect(find(left.h.core.record!, 'idleExpiry')!.at).toBe(leftAt + TIMERS.idleExpiryMs);
    left.h.advance(TIMERS.idleExpiryMs);
    expect(left.h.deleted).toBe(true);
    expect(left.h.logs.filter((line) => line.evt === 'room.expired')).toEqual([
      { evt: 'room.expired', code: CODE, status: 'LOBBY', reason: 'IDLE' },
    ]);

    // Teto: dois conectados no lobby, 24 h depois da criação.
    const hard = await Harness.lobby();
    const created = hard.h.core.record!.createdAt;
    hard.h.advance(TIMERS.hardExpiryMs - (hard.h.now - created) - 1);
    expect(hard.h.deleted).toBe(false);
    hard.h.advance(1);
    expect(hard.h.deleted).toBe(true);
    expect(hard.p1.closed).toEqual({ code: 4000, reason: expect.any(String) });
    expect(hard.p2.closed).toEqual({ code: 4000, reason: expect.any(String) });
    expect(hard.h.logs).toContainEqual({ evt: 'room.expired', code: CODE, status: 'LOBBY', reason: 'HARD' });
    expect(hard.h.core.record).toBeNull();
  });

  it('teto no meio da partida: registrada como abandonada (game.ended ABANDONED + game.replay) antes do room.expired', async () => {
    const { h, p1 } = await Harness.fromState(setup({}));
    h.advance(TIMERS.hardExpiryMs);
    expect(h.deleted).toBe(true);
    expect(p1.closed?.code).toBe(4000);
    const evts = h.logs.map((line) => line.evt);
    expect(evts.slice(-3)).toEqual(['game.ended', 'game.replay', 'room.expired']);
    expect(h.logs).toContainEqual(expect.objectContaining({ evt: 'game.ended', result: null, cause: 'ABANDONED' }));
    expect(h.logs.at(-1)).toEqual({ evt: 'room.expired', code: CODE, status: 'PLAYING', reason: 'HARD' });
  });

  it('o efeito da expiração: nada para gravar, alarme nulo, sem mensagens', async () => {
    const { h } = await Harness.lobby();
    h.now += TIMERS.hardExpiryMs;
    const effects = h.core.onAlarm(h.sockets, h.now);
    expect(effects).toMatchObject({ deleteAll: true, persist: false, alarm: null, send: [] });
    expect(effects.close).toHaveLength(2);
    expect(h.core.record).toBeNull();
  });

  it('idleExpiry vencido com alguém conectado é obsoleto: consumido, a sala fica', async () => {
    const { h } = await Harness.lobby();
    const rec = h.core.record!;
    rec.agenda.push({ kind: 'idleExpiry', at: h.now });
    const effects = h.core.onAlarm(h.sockets, h.now);
    expect(h.core.record).toBe(rec);
    expect(effects.deleteAll).toBe(false);
    expect(effects.close).toEqual([]);
    expect(kinds(rec)).toEqual(['hardExpiry']);
  });

  it('um hello válido tira o idleExpiry; o último a sair agenda de novo; sair do lobby também reavalia', async () => {
    const h = new Harness();
    const ana = await h.create('Ana');
    const bia = await h.join('Bia');
    const rec = h.core.record!;
    expect(find(rec, 'idleExpiry')!.at).toBe(rec.createdAt + TIMERS.idleExpiryMs);
    const p1 = h.open();
    await h.send(p1, h.hello(ana.token));
    expect(find(rec, 'idleExpiry')).toBeUndefined();
    const p2 = h.open();
    await h.send(p2, h.hello(bia.token));
    h.advance(1_000);
    h.close(p2);
    expect(find(rec, 'idleExpiry')).toBeUndefined();
    h.advance(1_000);
    await h.send(p1, { t: 'leave' }); // p2 está fora e p1 sai: ninguém conectado
    expect(rec.seats.map((seat) => seat.id)).toEqual(['p2']);
    expect(find(rec, 'idleExpiry')!.at).toBe(h.now + TIMERS.idleExpiryMs);
    expect(h.alarm).toBe(h.now + TIMERS.idleExpiryMs);
  });

  it('mensagem para sala já apagada → 4000, sem gravar', async () => {
    const { h, p1, p2, tokens } = await Harness.lobby();
    h.advance(TIMERS.hardExpiryMs);
    expect(h.core.record).toBeNull();
    const persisted = h.persisted;
    const open = h.core.onOpen(info('novo', null, h.now, h.now), [info('novo', null, h.now, h.now)], h.now);
    expect(open.close).toEqual([{ socketId: 'novo', code: 4000, reason: expect.any(String) }]);
    expect(open.persist).toBe(false);

    for (const raw of [JSON.stringify({ t: 'ready', ready: true }), JSON.stringify(h.hello(tokens.p1)), 'lixo', new ArrayBuffer(2)]) {
      const effects = await h.core.onMessage(p1.id, raw, [info(p1.id, 'p1')], h.now);
      expect(effects.close).toEqual([{ socketId: p1.id, code: 4000, reason: expect.any(String) }]);
      expect(effects.persist).toBe(false);
      expect(effects.send).toEqual([]);
      expect(effects.logs).toEqual([]);
      expect(effects.alarm).toBeNull();
    }
    const joined = await h.core.join('Cris', [], h.now);
    expect(joined).toMatchObject({ ok: false, error: 'NOT_FOUND' });
    expect(joined.effects.persist).toBe(false);
    expect(h.core.record).toBeNull();
    expect(h.persisted).toBe(persisted);
    expect(h.core.info()).toBeNull();
    expect(h.core.onClose(p2.id, [], h.now)).toMatchObject({ persist: false, send: [], alarm: null });
    expect(h.core.onAlarm([], h.now)).toMatchObject({ persist: false, alarm: null });
  });

  it('o registro some durante o await do hash do hello: a continuação fecha com 4000 e não grava nada', async () => {
    const { h, p1, tokens } = await Harness.lobby();
    h.close(p1);
    const stray = h.open();
    const pending = h.core.onMessage(stray.id, JSON.stringify(h.hello(tokens.p1)), h.sockets, h.now);
    // Antes de o hash voltar, a sala expira.
    h.now += TIMERS.hardExpiryMs;
    h.apply(h.core.onAlarm(h.sockets, h.now));
    expect(h.core.record).toBeNull();
    const effects = await pending;
    expect(effects.close).toEqual([{ socketId: stray.id, code: 4000, reason: expect.any(String) }]);
    expect(effects.send).toEqual([]);
    expect(effects.attach).toEqual([]);
    expect(effects.logs).toEqual([]);
    expect(effects.persist).toBe(false);
    expect(effects.alarm).toBeNull();
    expect(h.core.record).toBeNull();
  });
});

describe('W.O. por estouros e abandono (Ruling 13)', () => {
  const equip = () =>
    setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: { pending: [3, 4] }, p2: { pending: [5, 6] } });

  it('os dois chegam a 3 estouros no mesmo passo → abandono, sem vencedor e sem wo.applied', async () => {
    const { h, p1, p2 } = await Harness.fromState(equip());
    h.arm();
    const rec = h.core.record!;
    rec.game!.strikes = { p1: 2, p2: 2 };
    h.advance(TIMERS.equipMs + TIMERS.graceMs);
    expect(rec.game!.strikes).toEqual({ p1: 3, p2: 3 });
    expect(rec.status).toBe('FINISHED');
    expect(rec.outcome).toEqual({ gameNo: 1, result: null, cause: 'ABANDONED', durationMs: expect.any(Number) });
    expect(rec.score).toEqual({ p1: 0, p2: 0 });
    expect(rec.game!.steps.some((step) => step.action.type === 'FORFEIT')).toBe(false);
    expect(h.logs.some((line) => line.evt === 'wo.applied')).toBe(false);
    expect(h.logs.map((line) => line.evt).slice(-2)).toEqual(['game.ended', 'game.replay']);
    expect(h.logs).toContainEqual(expect.objectContaining({ evt: 'game.ended', result: null, cause: 'ABANDONED' }));
    for (const sock of [p1, p2]) {
      expect(h.messages(sock, 'room').at(-1)).toMatchObject({ status: 'FINISHED', outcome: { result: null, cause: 'ABANDONED' } });
      // Só o TIMEOUT gerou `state`: o abandono não é passo do motor.
      expect(h.messages(sock, 'state').map((m) => m.seq)).toEqual([2]);
    }
    expect(rec.seq).toBe(2);
    expect(rec.game!.cause).toBe('ABANDONED');
    expect(h.persisted).toBeGreaterThan(0);
  });

  it('3 estouros com o outro jogador fora → abandono em vez de W.O.', async () => {
    const { h, p1, p2 } = await Harness.fromState(setup({}));
    h.arm();
    const rec = h.core.record!;
    rec.game!.strikes.p1 = 2;
    h.close(p2);
    h.advance(TIMERS.turnMs + TIMERS.graceMs);
    expect(rec.game!.strikes.p1).toBe(3);
    expect(rec.outcome).toEqual({ gameNo: 1, result: null, cause: 'ABANDONED', durationMs: expect.any(Number) });
    expect(rec.score).toEqual({ p1: 0, p2: 0 });
    expect(h.logs.some((line) => line.evt === 'wo.applied')).toBe(false);
    expect(h.messages(p1, 'room').at(-1)).toMatchObject({ status: 'FINISHED', outcome: { cause: 'ABANDONED' } });
    expect(p2.open).toBe(false);
  });

  it('3 estouros com o outro conectado continua sendo W.O. AFK', async () => {
    const { h } = await Harness.fromState(setup({}));
    h.arm();
    const rec = h.core.record!;
    rec.game!.strikes.p1 = 2;
    h.advance(TIMERS.turnMs + TIMERS.graceMs);
    expect(rec.outcome).toMatchObject({ cause: 'AFK', result: { kind: 'WIN', winner: 'p2', reason: 'FORFEIT' } });
  });
});
