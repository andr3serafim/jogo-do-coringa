// Garante as fixtures que as outras tarefas usam: determinismo das partidas e a conexão de mentira.
import type { ConnectionEvent } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { FakeConnection, deferredAck, scenarioAt, seededSteps, stateMessage, viewAt } from '../fixtures.ts';

describe('seededSteps', () => {
  it('é determinística: a mesma semente dá os mesmos passos', () => {
    const a = seededSteps('fixture-0', 60);
    const b = seededSteps('fixture-0', 60);
    expect(a).toEqual(b);
    expect(a.length).toBe(60);
    expect(seededSteps('fixture-1', 60)).not.toEqual(a);
  });

  it('guarda estado e view antes da jogada e os eventos redigidos para quem age', () => {
    const [first] = seededSteps('fixture-0', 1);
    expect(first!.view.me).toBe(first!.actor);
    expect(first!.state.phase.kind).toBe('EQUIP');
    expect(first!.events.some((e) => e.type === 'EquipSubmitted')).toBe(true);
  });

  it('para quando a partida acaba', () => {
    const steps = seededSteps('fixture-0', 100_000);
    expect(steps.length).toBeLessThan(100_000);
    expect(steps.at(-1)!.events.some((e) => e.type === 'GameOver')).toBe(true);
  });
});

describe('viewAt', () => {
  it('monta o cenário descrito e deixa o resto vazio', () => {
    const { state, view } = scenarioAt({
      self: { hand: ['J', 'WILD'], attackRow: [5, 5], guard: ['K'] },
      opponent: { hand: ['A'], reflect: true, absoluteDefense: true },
      graveyard: [3],
    });
    expect(view.me).toBe('p1');
    expect(view.phase).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    expect(view.self.hand.map((c) => c.kind)).toEqual(['J', 'WILD']);
    expect(view.self.attackRow.map((c) => c.value)).toEqual([5, 5]);
    expect(view.self.guard).toHaveLength(1);
    expect(view.opponent.handCount).toBe(1);
    expect(view.opponent.reflect).not.toBeNull();
    expect(view.opponent.absoluteDefense).toBe(true);
    expect(view.graveyard).toHaveLength(1);
    expect(state.players[1].hand.map((c) => c.kind)).toEqual(['A']);
  });

  it('rodada, pressão, rodadas sem dano e vida entram no cenário', () => {
    const view = viewAt({ round: 7, pressure: 1, noDamageStreak: 6, self: { hp: 187 }, opponent: { hp: 214 } });
    expect(view.round).toBe(7);
    expect(view.pressure).toBe(1);
    expect(view.noDamageStreak).toBe(6);
    expect([view.self.hp, view.opponent.hp]).toEqual([187, 214]);
    expect(viewAt()).toMatchObject({ round: 10, pressure: 0, noDamageStreak: 0, initiative: 'p1', turnOrder: ['p1', 'p2'] });
    expect(viewAt({ initiative: 'opponent', firstToAttack: 'opponent' })).toMatchObject({
      initiative: 'p2',
      turnOrder: ['p2', 'p1'],
    });
  });

  it('as fases de reação e de espera, e `me` como p2', () => {
    expect(viewAt({ phase: 'ATTACK' }).phase).toEqual({ kind: 'REACTION', responder: 'p1', trigger: 'ATTACK' });
    expect(viewAt({ phase: 'WAITING' }).phase).toEqual({ kind: 'ATTACK_MAIN', player: 'p2' });
    const p2 = viewAt({ me: 'p2', phase: { kind: 'ORDER_CHOICE', player: 'p2' } });
    expect(p2.me).toBe('p2');
    expect(p2.opponent.id).toBe('p1');
  });

  it('pending monta o Equipar de um lado: pendentes com ids próprios e sem confirmar', () => {
    const view = viewAt({ phase: { kind: 'EQUIP' }, self: { pending: [7, 7, 3] }, opponent: { pending: [4] } });
    expect(view.self.pending.map((c) => c.value)).toEqual([7, 7, 3]);
    expect(new Set(view.self.pending.map((c) => c.id)).size).toBe(3);
    expect(view.self.equipSubmitted).toBe(false);
    expect(view.opponent.pendingCount).toBe(1);
    expect(view.opponent.equipSubmitted).toBe(false);
    // Sem `pending` o lado segue confirmado, como antes; `equipSubmitted` sobrescreve.
    expect(viewAt({ phase: { kind: 'EQUIP' } }).self.equipSubmitted).toBe(true);
    expect(viewAt({ self: { pending: [2], equipSubmitted: true } }).self.equipSubmitted).toBe(true);
  });

  it('é determinística e aceita cartas prontas e config', () => {
    const wild = { id: 'meu-selvagem', kind: 'WILD' as const };
    const spec = { self: { hand: [wild] }, graveyard: [wild], config: { rowLimit: 3 } };
    expect(viewAt(spec)).toEqual(viewAt(spec));
    expect(viewAt(spec).self.hand[0]).toEqual(wild);
    expect(viewAt(spec).config.rowLimit).toBe(3);
  });
});

describe('FakeConnection', () => {
  const action = { type: 'PASS' } as const;

  it('registra act e concede, com as opções, e responde sucesso quando não há roteiro', async () => {
    const conn = new FakeConnection();
    await expect(conn.act(action, { auto: true })).resolves.toEqual({ t: 'ack', id: 'fake-1', ok: true });
    await expect(conn.concede()).resolves.toEqual({ t: 'ack', id: 'fake-2', ok: true });
    await conn.act(action);
    expect(conn.sent).toEqual([
      { type: 'act', id: 'fake-1', action, options: { auto: true } },
      { type: 'concede', id: 'fake-2' },
      { type: 'act', id: 'fake-3', action, options: undefined },
    ]);
  });

  it('segue o roteiro de acks, inclusive um que o teste resolve depois', async () => {
    const conn = new FakeConnection();
    const late = deferredAck();
    conn.acks.push({ ok: false, code: 'NOT_YOUR_TURN', message: 'não é a sua vez' }, late.promise);
    await expect(conn.act(action)).resolves.toMatchObject({ ok: false, code: 'NOT_YOUR_TURN' });
    let settled = false;
    const pending = conn.act(action).then((ack) => {
      settled = true;
      return ack;
    });
    await Promise.resolve();
    expect(settled).toBe(false);
    late.resolve({ ok: true, seq: 9 });
    await expect(pending).resolves.toEqual({ t: 'ack', id: 'fake-2', ok: true, seq: 9 });
  });

  it('emite state, room e closed depois de atualizar os getters, e respeita o unsubscribe', () => {
    const conn = new FakeConnection({ playerId: 'p2' });
    const events: ConnectionEvent[] = [];
    const seen: unknown[] = [];
    const off = conn.subscribe((e) => {
      events.push(e);
      seen.push(conn.state?.seq ?? null, conn.room?.code ?? null);
    });
    const state = stateMessage(viewAt({}), { seq: 7 });
    conn.emitState(state);
    conn.emitRoom({
      t: 'room',
      code: 'ABC234',
      status: 'PLAYING',
      seats: [],
      score: {},
      gameNo: 1,
      expiresAt: 0,
    } as never);
    conn.emitClosed(1006);
    off();
    conn.emitClosed(1000, true);
    expect(conn.playerId).toBe('p2');
    expect(events.map((e) => e.type)).toEqual(['state', 'room', 'closed']);
    expect(events[2]).toEqual({ type: 'closed', code: 1006, final: false });
    expect(seen).toEqual([7, null, 7, 'ABC234', 7, 'ABC234']);
  });

  it('anota os outros comandos e calcula o tempo que falta pelo relógio do servidor', () => {
    const conn = new FakeConnection({ now: 1_000 });
    conn.connect();
    conn.wake();
    conn.ready(true);
    conn.rematch(false);
    conn.leave();
    conn.close();
    expect(conn.calls).toEqual(['connect', 'wake', 'ready:true', 'rematch:false', 'leave', 'close']);
    const deadline = { kind: 'TURN', at: 4_500, players: ['p1'] } as const;
    expect(conn.remainingMs({ ...deadline, players: ['p1'] })).toBe(3_500);
    conn.now = 9_000;
    expect(conn.remainingMs({ ...deadline, players: ['p1'] })).toBe(0);
  });
});
