import { legalActions, type GameEvent, type PlayerView } from '@coringa/engine';
import type { ConnectionEvent, PlayerAction, RoomMessage, StateMessage } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { LOCAL_ME, LocalRoom, trainingSeed, type LocalRoomOptions } from '../../src/model/local-room.ts';

/** Timers e relógio de mentira: nada de tempo real; `runNext` dispara o timer mais cedo. */
class FakeTimers {
  now = 1_000;
  readonly pending = new Map<number, { at: number; fn: () => void }>();
  readonly delays: number[] = [];
  #id = 0;

  readonly setTimer = (fn: () => void, ms: number): unknown => {
    const id = ++this.#id;
    this.delays.push(ms);
    this.pending.set(id, { at: this.now + ms, fn });
    return id;
  };

  readonly clearTimer = (handle: unknown): void => {
    this.pending.delete(handle as number);
  };

  runNext(): boolean {
    let best: [number, { at: number; fn: () => void }] | null = null;
    for (const entry of this.pending) {
      if (best === null || entry[1].at < best[1].at) best = entry;
    }
    if (best === null) return false;
    this.pending.delete(best[0]);
    this.now = Math.max(this.now, best[1].at);
    best[1].fn();
    return true;
  }
}

function setup(seed: string, extra: Partial<LocalRoomOptions> = {}) {
  const timers = new FakeTimers();
  const room = new LocalRoom({
    seed,
    setTimer: timers.setTimer,
    clearTimer: timers.clearTimer,
    now: () => timers.now,
    ...extra,
  });
  const events: ConnectionEvent[] = [];
  room.subscribe((e) => events.push(e));
  return { room, timers, events };
}

const states = (events: ConnectionEvent[]): StateMessage[] =>
  events.flatMap((e) => (e.type === 'state' ? [e.state] : []));
const rooms = (events: ConnectionEvent[]): RoomMessage[] => events.flatMap((e) => (e.type === 'room' ? [e.room] : []));

/** É a vez do jogador? No Equipar, enquanto ele não confirmou; nas outras fases, pela fase. */
function myTurn(view: PlayerView): boolean {
  const phase = view.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return !view.self.equipSubmitted;
    case 'ORDER_CHOICE':
    case 'ATTACK_MAIN':
      return phase.player === LOCAL_ME;
    case 'REACTION':
      return phase.responder === LOCAL_ME;
    case 'GAME_OVER':
      return false;
  }
}

/** Joga a partida até o fim: o jogador escolhe sempre a primeira jogada legal; o bot vem dos timers. */
async function playToEnd(room: LocalRoom, timers: FakeTimers, limit = 5000): Promise<void> {
  for (let i = 0; i < limit && room.room?.status !== 'FINISHED'; i++) {
    const view = room.state!.view;
    if (myTurn(view)) {
      const ack = await room.act(legalActions(view)[0] as PlayerAction);
      expect(ack.ok, JSON.stringify(ack)).toBe(true);
    } else if (!timers.runNext()) {
      throw new Error('travou: nem jogada minha nem timer do bot');
    }
  }
  expect(room.room?.status).toBe('FINISHED');
}

describe('trainingSeed', () => {
  it('lê ?semente= da URL', () => {
    expect(trainingSeed('?semente=abc', () => 0.5)).toBe('abc');
    expect(trainingSeed('?x=1&semente=a%20b', () => 0.5)).toBe('a b');
  });

  it('sorteia quando não há semente ou ela vem vazia', () => {
    expect(trainingSeed('', () => 0.5)).toBe(trainingSeed('?semente=', () => 0.5));
    expect(trainingSeed('', () => 0.5)).toBe(trainingSeed('?outro=1', () => 0.5));
    expect(trainingSeed('', () => 0.1)).not.toBe(trainingSeed('', () => 0.9));
    expect(trainingSeed('', () => 0.5)).toMatch(/^[0-9a-z]+$/);
  });
});

describe('LocalRoom', () => {
  it('antes do connect não tem room nem state; o primeiro connect abre e entrega os dois', () => {
    const { room, events } = setup('semente-1');
    expect(LOCAL_ME).toBe('p1');
    expect(room.playerId).toBe('p1');
    expect(room.room).toBeNull();
    expect(room.state).toBeNull();
    room.connect();
    room.connect();
    room.wake();
    expect(events.map((e) => e.type)).toEqual(['open', 'room', 'state']);
    const msg = room.room!;
    expect(msg).toMatchObject({
      t: 'room',
      status: 'PLAYING',
      gameNo: 1,
      score: { p1: 0, p2: 0, draws: 0 },
      seats: [
        { playerId: 'p1', nickname: 'Você', connected: true, ready: false, wantsRematch: false },
        { playerId: 'p2', nickname: 'Bot', connected: true, ready: false, wantsRematch: false },
      ],
    });
    expect(msg.outcome).toBeUndefined();
    expect(msg.expiresAt).toBeGreaterThan(1_000);
    const st = room.state!;
    expect(st).toMatchObject({ t: 'state', seq: 1, epoch: 1, events: [], deadline: null, serverNow: 1_000 });
    expect(st.view.me).toBe('p1');
    expect(room.remainingMs({ kind: 'TURN', at: 99_999, players: ['p1'] })).toBe(0);
  });

  it('uma partida inteira com a primeira jogada legal termina em FINISHED, com seq e epoch crescentes', async () => {
    const { room, timers, events } = setup('treino-1');
    room.connect();
    await playToEnd(room, timers);
    const all = states(events);
    all.forEach((s, i) => expect(s.seq).toBe(i + 1));
    all.forEach((s, i) => i > 0 && expect(s.epoch).toBeGreaterThanOrEqual(all[i - 1]!.epoch));
    expect(all.at(-1)!.epoch).toBeGreaterThan(all[0]!.epoch);
    expect(all.every((s) => s.deadline === null)).toBe(true);
    const last = room.room!;
    expect(last.status).toBe('FINISHED');
    expect(last.outcome).toMatchObject({ gameNo: 1, cause: 'NORMAL' });
    expect(last.score.p1 + last.score.p2 + last.score.draws).toBe(1);
    const result = last.outcome!.result!;
    if (result.kind === 'WIN') expect(last.score[result.winner as 'p1' | 'p2']).toBe(1);
    else expect(last.score.draws).toBe(1);
  });

  it('a mesma semente dá a mesma sequência de seq e de eventos', async () => {
    const run = async (seed: string): Promise<Array<[number, number, GameEvent[]]>> => {
      const { room, timers, events } = setup(seed);
      room.connect();
      await playToEnd(room, timers);
      return states(events).map((s) => [s.seq, s.epoch, s.events]);
    };
    const a = await run('treino-det');
    const b = await run('treino-det');
    expect(a.length).toBeGreaterThan(5);
    expect(b).toEqual(a);
    const other = await run('treino-outra');
    expect(other.map((x) => x[2])).not.toEqual(a.map((x) => x[2]));
  });

  it('jogada ilegal vira ack com o código do motor e não muda nada', async () => {
    const { room, events } = setup('treino-1');
    room.connect();
    const before = states(events).length;
    const ack = await room.act({ type: 'END_TURN' });
    expect(ack).toMatchObject({ t: 'ack', ok: false });
    if (!ack.ok) {
      expect(ack.code).toBeTruthy();
      expect(ack.message).toBeTruthy();
    }
    expect(states(events)).toHaveLength(before);
  });

  it('o state sai antes do ack, que leva o seq do passo; os ids são únicos', async () => {
    const { room } = setup('treino-1');
    room.connect();
    const first = legalActions(room.state!.view)[0] as PlayerAction;
    const order: string[] = [];
    room.subscribe((e) => order.push(e.type));
    const ack = await room.act(first, { auto: true });
    expect(order[0]).toBe('state');
    expect(ack).toMatchObject({ ok: true, seq: room.state!.seq });
    const bad1 = await room.act({ type: 'END_TURN' });
    const bad2 = await room.act({ type: 'END_TURN' });
    expect(bad1.id).not.toBe(bad2.id);
  });

  it('o bot pensa thinkMs (600 por padrão) e responde às janelas de reação sem esperar', async () => {
    const { room, timers } = setup('treino-1');
    room.connect();
    // Equipar: o bot confirma o dele depois de 600 ms.
    expect(timers.delays).toEqual([600]);
    let sawReaction = false;
    for (let i = 0; i < 4000 && room.room?.status !== 'FINISHED'; i++) {
      const view = room.state!.view;
      if (view.phase.kind === 'REACTION' && view.phase.responder === 'p2') {
        sawReaction = true;
        expect(timers.delays.at(-1)).toBe(0);
      }
      if (myTurn(view)) await room.act(legalActions(view)[0] as PlayerAction);
      else timers.runNext();
    }
    expect(sawReaction).toBe(true);
    expect(timers.delays.filter((d) => d !== 0 && d !== 600)).toEqual([]);
  });

  it('thinkMs configurável e bot escolhido', () => {
    const { timers, room } = setup('treino-1', { thinkMs: 50, bot: 'random' });
    room.connect();
    expect(timers.delays).toEqual([50]);
  });

  it('no Equipar o bot confirma por conta própria; no fim ele não agenda mais nada', async () => {
    const { room, timers, events } = setup('treino-1');
    room.connect();
    expect(timers.runNext()).toBe(true);
    expect(states(events).at(-1)!.view.opponent.equipSubmitted).toBe(true);
    await playToEnd(room, timers);
    expect(timers.pending.size).toBe(0);
  });

  it('concede dá FORFEIT de p1 com causa CONCEDE, e depois disso não há partida', async () => {
    const { room, events } = setup('treino-1');
    room.connect();
    const ack = await room.concede();
    expect(ack).toMatchObject({ ok: true });
    const last = room.room!;
    expect(last).toMatchObject({ status: 'FINISHED', score: { p1: 0, p2: 1, draws: 0 } });
    expect(last.outcome).toEqual({
      gameNo: 1,
      result: { kind: 'WIN', winner: 'p2', reason: 'FORFEIT' },
      cause: 'CONCEDE',
    });
    // O state do fim vem antes do room do fim.
    expect(events.map((e) => e.type).slice(-2)).toEqual(['state', 'room']);
    expect(await room.concede()).toMatchObject({ ok: false, code: 'NOT_PLAYING' });
    expect(await room.act({ type: 'END_TURN' })).toMatchObject({ ok: false, code: 'NOT_PLAYING' });
  });

  it('rematch(true) começa outra partida com a semente <semente>-<n> e mantém o placar', async () => {
    const { room, timers } = setup('rev');
    room.connect();
    const firstDeal = room.state!.view.self.hand.map((c) => c.id);
    await room.concede();
    const seqBefore = room.state!.seq;
    const epochBefore = room.state!.epoch;
    room.rematch(true);
    expect(room.room).toMatchObject({ status: 'PLAYING', gameNo: 2, score: { p1: 0, p2: 1, draws: 0 } });
    expect(room.room!.outcome).toBeUndefined();
    expect(room.state!.seq).toBe(seqBefore + 1);
    expect(room.state!.epoch).toBe(epochBefore + 1);
    expect(room.state!.events).toEqual([]);
    expect(room.state!.view.self.hand.map((c) => c.id)).not.toEqual(firstDeal);

    // A semente do jogo 2 é `rev-2`: uma sala nova com essa semente dá a mesma mão.
    const twin = setup('rev-2');
    twin.room.connect();
    expect(twin.room.state!.view).toEqual(room.state!.view);
    expect(timers.pending.size).toBe(1);

    await playToEnd(room, timers);
    expect(room.room!.outcome!.gameNo).toBe(2);
  });

  it('rematch só vale depois do fim: no meio da partida é ignorado; rematch(false) só avisa o room', async () => {
    const { room, events } = setup('rev');
    room.connect();
    const seq = room.state!.seq;
    room.rematch(true);
    expect(room.state!.seq).toBe(seq);
    await room.concede();
    const roomsBefore = rooms(events).length;
    room.rematch(false);
    expect(room.room!.status).toBe('FINISHED');
    expect(room.room!.seats.every((s) => !s.wantsRematch)).toBe(true);
    expect(rooms(events).length).toBe(roomsBefore + 1);
  });

  it('ready e wake não fazem nada; close para os timers e avisa uma vez; depois, act não conecta', async () => {
    const { room, timers, events } = setup('treino-1');
    room.ready(true);
    room.connect();
    room.wake();
    expect(timers.pending.size).toBe(1);
    room.close();
    room.close();
    expect(timers.pending.size).toBe(0);
    expect(events.filter((e) => e.type === 'closed')).toEqual([{ type: 'closed', code: 1000, final: true }]);
    room.connect();
    expect(await room.act({ type: 'END_TURN' })).toMatchObject({ ok: false, code: 'DISCONNECTED' });
    expect(await room.concede()).toMatchObject({ ok: false, code: 'DISCONNECTED' });
    room.rematch(true);
    expect(timers.pending.size).toBe(0);
  });

  it('leave fecha a sala; close antes do connect não avisa', () => {
    const a = setup('treino-1');
    a.room.connect();
    a.room.leave();
    expect(a.events.at(-1)).toEqual({ type: 'closed', code: 1000, final: true });
    const b = setup('treino-1');
    b.room.close();
    expect(b.events).toEqual([]);
  });

  it('um listener que quebra não impede os outros; cancelar a inscrição funciona', () => {
    const { room } = setup('treino-1');
    const seen: string[] = [];
    room.subscribe(() => {
      throw new Error('quebrou');
    });
    const off = room.subscribe((e) => seen.push(e.type));
    const errors: unknown[] = [];
    const original = console.error;
    console.error = (...args: unknown[]) => errors.push(args);
    try {
      room.connect();
      expect(seen).toEqual(['open', 'room', 'state']);
      expect(errors).toHaveLength(3);
      off();
      room.close();
      expect(seen).toHaveLength(3);
    } finally {
      console.error = original;
    }
  });
});
