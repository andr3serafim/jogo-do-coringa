import {
  applyAction,
  createGame,
  DEFAULT_CONFIG,
  legalActions,
  viewEvents,
  viewFor,
  type Action,
  type GameEvent,
  type GameState,
  type PlayerView,
  type Replay,
} from '@coringa/engine';
import type { ConnectionEvent, PlayerAction, ReplayMessage, RoomMessage, StateMessage } from '@coringa/protocol';
import { BOTS, runHard } from '@coringa/sim/bots';
import { createRng } from '@coringa/sim/rng';
import { describe, expect, it, vi } from 'vitest';
import {
  gameSeed,
  LOCAL_ME,
  LocalRoom,
  TRAINING_LEVELS,
  trainingHp,
  trainingLevel,
  trainingSeed,
  type LocalRoomOptions,
} from '../../src/model/local-room.ts';

/** Liga a falha da busca do Difícil: ela cede uma vez e lança. Desligada, a busca de verdade passa sem mudar nada. */
const searchFault = vi.hoisted(() => ({ on: false }));
vi.mock('@coringa/sim/bots', async (importOriginal) => {
  const original = await importOriginal<typeof import('@coringa/sim/bots')>();
  return {
    ...original,
    hardSearch: function* (...args: Parameters<typeof original.hardSearch>) {
      if (searchFault.on) {
        yield;
        throw new Error('falha na busca');
      }
      return yield* original.hardSearch(...args);
    },
  };
});

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
const replays = (events: ConnectionEvent[]): ReplayMessage[] =>
  events.flatMap((e) => (e.type === 'replay' ? [e.replay] : []));

/** Reexecuta o replay no motor puro, do `createGame` ao último passo: o que o motor faria com ele. */
function rerun(replay: Replay): GameState {
  const created = createGame(replay.config, replay.seed, replay.players);
  if (!created.ok) throw new Error(`configuração inválida: ${created.error.message}`);
  let state = created.state;
  for (const [i, step] of replay.steps.entries()) {
    const result = applyAction(state, step.player, step.action);
    if (!result.ok) throw new Error(`o passo ${i} foi recusado: ${result.error.code}`);
    state = result.state;
  }
  return state;
}

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

/**
 * Joga a partida até o fim: o jogador escolhe sempre a primeira jogada legal; o bot vem dos timers. Com `ui`, o jogador joga
 * como a interface: sem numéricas pendentes ela não tem botão para o Equipar, então ele não manda o `EQUIP` vazio.
 */
async function playToEnd(room: LocalRoom, timers: FakeTimers, limit = 5000, ui = false): Promise<void> {
  for (let i = 0; i < limit && room.room?.status !== 'FINISHED'; i++) {
    const view = room.state!.view;
    const noButton = ui && view.phase.kind === 'EQUIP' && view.self.pending.length === 0;
    if (myTurn(view) && !noButton) {
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

describe('gameSeed', () => {
  it('a partida 1 usa a semente, e a n usa <semente>-<n>', () => {
    expect(gameSeed('mesa', 1)).toBe('mesa');
    expect(gameSeed('mesa', 2)).toBe('mesa-2');
    expect(gameSeed('mesa', 10)).toBe('mesa-10');
  });

  it('abrir o treino com a semente de uma partida n repete a partida n (a do diagnóstico)', async () => {
    const { room } = setup('rev');
    room.connect();
    await room.concede();
    room.rematch(true);
    expect(room.room!.gameNo).toBe(2);
    const second = setup(gameSeed('rev', 2));
    second.room.connect();
    expect(second.room.state!.view.self.pending.map((c) => c.id)).toEqual(room.state!.view.self.pending.map((c) => c.id));
    expect(second.room.state!.view.self.hand.map((c) => c.id)).toEqual(room.state!.view.self.hand.map((c) => c.id));
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

  it('thinkMs configurável, em qualquer nível', () => {
    const { timers, room } = setup('treino-1', { thinkMs: 50, level: 'facil' });
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

  describe('Equipar sem numéricas (como o servidor, spec 2 §5): a interface não tem botão para ele', () => {
    // Sementes em que o jogador recebe 4 especiais (zero numéricas) no primeiro Equipar (com o baralho do sub-projeto 5, 8 Ás).
    const NO_NUMBERS = ['s618', 's701', 's852', 's867'];

    it.each(NO_NUMBERS)('%s: o EQUIP vazio sai em nome do jogador, como passo próprio, e a partida segue', (seed) => {
      const { room, timers, events } = setup(seed);
      room.connect();
      expect(room.state!.view.self.pending).toHaveLength(0);
      const all = states(events);
      expect(all.map((s) => s.seq)).toEqual([1, 2]);
      expect(all[0]!.events).toEqual([]);
      expect(all[1]!.view.self.equipSubmitted).toBe(true);
      expect(all[1]!.view.phase.kind).toBe('EQUIP');
      // O bot ainda vai confirmar o dele: um timer só, e com a confirmação dele o Equipar se resolve (o passo traz os eventos).
      expect(timers.pending.size).toBe(1);
      expect(timers.runNext()).toBe(true);
      expect(room.state!.seq).toBeGreaterThanOrEqual(3);
      expect(states(events).at(2)!.events.length).toBeGreaterThan(0);
    });

    it('o jogador que só usa botões nunca fica preso, em nenhuma rodada: a partida termina', async () => {
      for (const seed of [...NO_NUMBERS, 'u1', 'u2', 'u3', 'u4', 'u5', 'u6']) {
        const { room, timers } = setup(seed);
        room.connect();
        await playToEnd(room, timers, 5000, true);
      }
    });
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
      // A duração (U5), pelo relógio injetado, do começo da partida ao fim.
      durationMs: expect.any(Number),
    });
    expect(last.outcome!.durationMs).toBeGreaterThanOrEqual(0);
    // O state do fim vem antes do room do fim, e o replay da partida entre os dois.
    expect(events.map((e) => e.type).slice(-3)).toEqual(['state', 'replay', 'room']);
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

describe('LocalRoom: o replay da partida', () => {
  /** O jogador joga a primeira jogada legal dele. */
  const playFirst = (room: LocalRoom) => room.act(legalActions(room.state!.view)[0] as PlayerAction);

  it('no fim da partida emite o replay, que o motor reexecuta até o mesmo estado final', async () => {
    const { room, timers, events } = setup('rep-1');
    room.connect();
    await playToEnd(room, timers);
    expect(replays(events)).toHaveLength(1);
    const message = replays(events)[0]!;
    expect(message).toMatchObject({
      t: 'replay',
      gameNo: 1,
      replay: { name: 'treino-rep-1', seed: 'rep-1', players: ['p1', 'p2'], config: DEFAULT_CONFIG },
    });
    // Cada `state` depois do primeiro é um passo aplicado (o primeiro é a mesa recém-dada): o replay não perde nem repete nenhum.
    expect(message.replay.steps).toHaveLength(states(events).length - 1);
    expect(new Set(message.replay.steps.map((step) => step.player))).toEqual(new Set(['p1', 'p2']));

    const final = rerun(message.replay);
    expect(final.phase.kind).toBe('GAME_OVER');
    expect(viewFor(final, 'p1')).toEqual(room.state!.view);
    expect(final.phase.kind === 'GAME_OVER' && final.phase.result).toEqual(room.room!.outcome!.result);

    // O replay sai depois do último `state` e ANTES do `room` em FINISHED, que ainda traz o `gameNo` da partida.
    expect(events.map((e) => e.type).slice(-3)).toEqual(['state', 'replay', 'room']);
    expect(room.room).toMatchObject({ status: 'FINISHED', gameNo: message.gameNo });
  });

  it('o Equipar vazio automático entra no replay, em nome do jogador, como passo próprio', async () => {
    // Sementes em que o jogador recebe zero numéricas no primeiro Equipar (as mesmas do bloco do Equipar sem numéricas).
    for (const seed of ['s618', 's701']) {
      const { room, timers, events } = setup(seed);
      room.connect();
      await playToEnd(room, timers, 5000, true);
      const { replay } = replays(events)[0]!;
      expect(replay.steps[0], seed).toEqual({ player: 'p1', action: { type: 'EQUIP', destinations: [] } });
      expect(replay.steps, seed).toHaveLength(states(events).length - 1);
      expect(viewFor(rerun(replay), 'p1'), seed).toEqual(room.state!.view);
    }
  });

  it('a desistência entra no replay como FORFEIT de system, e o replay sai antes do room', async () => {
    const { room, timers, events } = setup('rep-c');
    room.connect();
    await playFirst(room);
    expect(timers.runNext()).toBe(true);
    await room.concede();
    expect(room.room).toMatchObject({ status: 'FINISHED', outcome: { cause: 'CONCEDE' } });
    expect(events.map((e) => e.type).slice(-3)).toEqual(['state', 'replay', 'room']);
    const { replay } = replays(events)[0]!;
    expect(replay.steps.at(-1)).toEqual({ player: 'system', action: { type: 'FORFEIT', loser: 'p1' } });
    expect(replay.steps.slice(0, -1).every((step) => step.player !== 'system')).toBe(true);
    expect(replay.steps).toHaveLength(states(events).length - 1);
    expect(viewFor(rerun(replay), 'p1')).toEqual(room.state!.view);
  });

  it('a revanche começa um replay novo: os passos da partida 2 não trazem os da 1', async () => {
    const { room, timers, events } = setup('rev');
    room.connect();
    await playFirst(room);
    await room.concede();
    const first = replays(events)[0]!;
    const firstSteps = structuredClone(first.replay.steps);
    expect(first).toMatchObject({ gameNo: 1, replay: { name: 'treino-rev', seed: 'rev' } });

    room.rematch(true);
    // Começar a partida 2 não emite replay nenhum.
    expect(replays(events)).toHaveLength(1);
    await playToEnd(room, timers);

    expect(replays(events)).toHaveLength(2);
    const second = replays(events)[1]!;
    expect(second).toMatchObject({ gameNo: 2, replay: { name: 'treino-rev-2', seed: 'rev-2', players: ['p1', 'p2'] } });
    expect(second.replay.steps.some((step) => step.player === 'system')).toBe(false);
    expect(viewFor(rerun(second.replay), 'p1')).toEqual(room.state!.view);
    // A mensagem da partida 1 não foi tocada pela 2.
    expect(first.replay.steps).toEqual(firstSteps);
    expect(second.replay.steps).not.toBe(first.replay.steps);
    expect(events.map((e) => e.type).slice(-3)).toEqual(['state', 'replay', 'room']);
  });

  it('nada de replay antes do fim: nem na abertura, nem a cada jogada, nem na revanche que só avisa', async () => {
    const { room, timers, events } = setup('rep-2');
    room.connect();
    expect(replays(events)).toEqual([]);
    for (let i = 0; i < 3 && room.room?.status === 'PLAYING'; i++) {
      const view = room.state!.view;
      if (myTurn(view)) await playFirst(room);
      else timers.runNext();
      expect(replays(events)).toEqual([]);
    }
    room.rematch(true);
    expect(replays(events)).toEqual([]);
    await playToEnd(room, timers);
    expect(replays(events)).toHaveLength(1);
    room.rematch(false);
    expect(replays(events)).toHaveLength(1);
  });
});

describe('a vida inicial do treino (sub-projeto 5, R3)', () => {
  it('trainingHp aceita só as vidas da sala (HP_CHOICES)', () => {
    expect(trainingHp('?vida=800')).toBe(800);
    expect(trainingHp('?nivel=facil&vida=300')).toBe(300);
    expect(trainingHp('?vida=400')).toBeNull();
    expect(trainingHp('?vida=abc')).toBeNull();
    expect(trainingHp('')).toBeNull();
  });

  it('a sala local começa com a vida dada (e a padrão sem ela), e a revanche a mantém', async () => {
    const { room } = setup('vida-1', { hp: 800 });
    room.connect();
    expect(room.state!.view.config.hp).toBe(800);
    expect(room.state!.view.self.hp).toBe(800);
    const plain = setup('vida-1');
    plain.room.connect();
    expect(plain.room.state!.view.self.hp).toBe(DEFAULT_CONFIG.hp);
    await room.concede();
    room.rematch(true);
    expect(room.state!.view.self.hp).toBe(800);
  });
});

describe('trainingLevel', () => {
  it('lê ?nivel= da URL; sem ele, ou com um valor que não é nível, devolve null', () => {
    expect(trainingLevel('?nivel=facil')).toBe('facil');
    expect(trainingLevel('?semente=abc&nivel=dificil')).toBe('dificil');
    expect(trainingLevel('?nivel=medio&semente=abc')).toBe('medio');
    expect(trainingLevel('')).toBeNull();
    expect(trainingLevel('?semente=abc')).toBeNull();
    expect(trainingLevel('?nivel=')).toBeNull();
    expect(trainingLevel('?nivel=impossivel')).toBeNull();
    expect(trainingLevel('?nivel=Medio')).toBeNull();
  });

  it('a lista dos níveis tem os três, do mais fácil ao mais difícil (o portão do Difícil foi aprovado)', () => {
    expect(TRAINING_LEVELS).toEqual(['facil', 'medio', 'dificil']);
  });
});

describe('níveis do bot', () => {
  // A semente em que o Fácil, o Médio e o Difícil jogam o Equipar do bot de três jeitos diferentes: os testes não passam por acaso.
  const SEED = 'rev';

  /** Resultado de um passo do motor puro; falha o teste se a jogada for ilegal. */
  function step(state: GameState, player: 'p1' | 'p2', action: Action): { state: GameState; events: GameEvent[] } {
    const result = applyAction(state, player, action);
    if (!result.ok) throw new Error(`jogada ilegal no motor puro: ${result.error.code}`);
    return result;
  }

  /**
   * O que o jogador deve ver depois de jogar a primeira jogada legal dele e de o bot responder com `pick`, no motor puro, sem a
   * sala. É o que a sala tem que reproduzir no Equipar da rodada 1.
   */
  function expected(seed: string, pick: (state: GameState, legal: Action[]) => Action) {
    const created = createGame(DEFAULT_CONFIG, seed, ['p1', 'p2']);
    if (!created.ok) throw new Error('configuração inválida');
    const mine = step(created.state, 'p1', legalActions(viewFor(created.state, 'p1'))[0]!);
    const action = pick(mine.state, legalActions(viewFor(mine.state, 'p2')));
    const theirs = step(mine.state, 'p2', action);
    return { action, view: viewFor(theirs.state, 'p1'), events: viewEvents(theirs.events, 'p1') };
  }

  const easy = (seed: string) => (state: GameState, legal: Action[]) => BOTS.easy(viewFor(state, 'p2'), legal, createRng(`${seed}/bot`));
  const greedy = (seed: string) => (state: GameState, legal: Action[]) => BOTS.greedy(viewFor(state, 'p2'), legal, createRng(`${seed}/bot`));
  // A busca do Difícil sorteia por decisão do bot (`<semente>/bot/<n>`, `n` = quantas jogadas ele já aplicou na partida), e não pelo fluxo do
  // bot: a primeira decisão é a 0.
  const hard = (seed: string) => (state: GameState, legal: Action[]) => runHard(state, 'p2', legal, createRng(`${seed}/bot/0`));

  /** O relógio que anda 3 ms a cada leitura: a busca do Difícil, que se fatia por ele, precisa de várias tarefas. */
  function steppedClock() {
    let t = 1_000;
    return () => (t += 3);
  }

  /** O jogador joga a primeira jogada legal dele. */
  const playFirst = (room: LocalRoom) => room.act(legalActions(room.state!.view)[0] as PlayerAction);

  it('a semente dos testes separa os três níveis (senão os testes abaixo não provariam nada)', () => {
    const plays = [easy, greedy, hard].map((bot) => JSON.stringify(expected(SEED, bot(SEED)).action));
    expect(new Set(plays).size).toBe(3);
  });

  it.each([
    ['facil', easy],
    ['medio', greedy],
    [undefined, greedy],
  ] as const)('level %s: o bot joga o que o bot do nível jogaria, com a mesma semente (o padrão é o Médio)', async (level, pick) => {
    const { room, timers } = setup(SEED, { level });
    room.connect();
    await playFirst(room);
    expect(timers.runNext()).toBe(true);
    const want = expected(SEED, pick(SEED));
    expect(room.state!.view).toEqual(want.view);
    expect(room.state!.events).toEqual(want.events);
  });

  it('uma partida inteira no Fácil termina, com o bot jogando numa tarefa só (pensar de 600 ms, ou 0 ms na reação)', async () => {
    const { room, timers } = setup('treino-1', { level: 'facil' });
    room.connect();
    await playToEnd(room, timers);
    expect(timers.delays.filter((d) => d !== 0 && d !== 600)).toEqual([]);
    expect(timers.pending.size).toBe(0);
  });

  describe('Difícil: a busca em fatias', () => {
    it('joga só quando a busca termina, depois de várias tarefas, e é a jogada que o runHard jogaria', async () => {
      const { room, timers } = setup(SEED, { level: 'dificil', now: steppedClock() });
      room.connect();
      await playFirst(room);
      const before = room.state!.seq;
      // O tempo de pensar vem antes da busca, como nos outros níveis.
      expect(timers.delays).toEqual([600]);
      expect(timers.runNext()).toBe(true);
      expect(room.state!.seq).toBe(before);

      // Cada fatia seguinte é uma tarefa só dela (0 ms), até a busca terminar. Nada é jogado no meio.
      let tasks = 1;
      while (room.state!.seq === before) {
        expect(timers.pending.size).toBe(1);
        expect(timers.delays.at(-1)).toBe(0);
        expect(timers.runNext()).toBe(true);
        tasks += 1;
        expect(tasks).toBeLessThan(200);
      }
      // 32 rollouts (4 candidatas × 8) a 3 ms a leitura, em fatias de 8 ms: umas dez tarefas.
      expect(tasks).toBeGreaterThan(5);
      expect(room.state!.seq).toBe(before + 1);
      const want = expected(SEED, hard(SEED));
      expect(room.state!.view).toEqual(want.view);
      expect(room.state!.events).toEqual(want.events);
    });

    it('um act do jogador no meio da busca (no Equipar, a única fase em que os dois jogam juntos) a cancela: a fatia velha nunca roda', async () => {
      const { room, timers } = setup(SEED, { level: 'dificil', now: steppedClock() });
      room.connect();
      expect(timers.runNext()).toBe(true);
      const seq = room.state!.seq;
      expect(timers.delays.at(-1)).toBe(0);
      const [stale] = [...timers.pending.keys()];
      expect(stale).toBeDefined();

      await playFirst(room);
      // A fatia velha saiu da fila, e só resta o tempo de pensar da decisão nova.
      expect(timers.pending.has(stale!)).toBe(false);
      expect(timers.pending.size).toBe(1);
      expect(timers.delays.at(-1)).toBe(600);

      // O bot joga uma vez só, e o que ele joga é o da busca sobre o estado novo (nada da velha sobrou).
      for (let i = 0; i < 200 && room.state!.seq === seq + 1; i += 1) expect(timers.runNext()).toBe(true);
      expect(room.state!.seq).toBe(seq + 2);
      const want = expected(SEED, hard(SEED));
      expect(room.state!.view).toEqual(want.view);
      expect(room.state!.events).toEqual(want.events);
    });

    it.each([SEED, 'x2', 'x4', 'c2'])(
      '%s: o Equipar do bot é o mesmo se o jogador confirma antes do pensar, no meio da busca ou depois de o bot jogar',
      async (seed) => {
        /** Anda os timers até a partida chegar ao `seq` 3: os dois Equipar confirmados e a rodada resolvida. */
        const finish = (s: ReturnType<typeof setup>) => {
          for (let i = 0; i < 200 && s.room.state!.seq < 3; i += 1) s.timers.runNext();
          expect(s.room.state!.seq).toBe(3);
        };

        // O jogador confirma antes do "pensar" do bot.
        const before = setup(seed, { level: 'dificil', now: steppedClock() });
        before.room.connect();
        await playFirst(before.room);
        finish(before);

        // No meio da busca (que recomeça).
        const mid = setup(seed, { level: 'dificil', now: steppedClock() });
        mid.room.connect();
        mid.timers.runNext();
        await playFirst(mid.room);
        finish(mid);

        // Depois de o bot jogar: o caso comum de quem pensa antes de confirmar. O estado, o `seq` e o fluxo de timers são outros.
        const after = setup(seed, { level: 'dificil', now: steppedClock() });
        after.room.connect();
        for (let i = 0; i < 200 && after.room.state!.seq < 2; i += 1) after.timers.runNext();
        expect(after.room.state!.view.opponent.equipSubmitted).toBe(true);
        await playFirst(after.room);
        finish(after);

        // O que a resolução mostra (as montagens dos dois) é igual; só a ordem de quem confirmou por último (`EquipSubmitted`) muda.
        const resolved = (s: ReturnType<typeof setup>) => s.room.state!.events.filter((event) => event.type !== 'EquipSubmitted');
        expect(resolved(before).length, seed).toBeGreaterThan(0);
        for (const other of [mid, after]) {
          expect(other.room.state!.view, seed).toEqual(before.room.state!.view);
          expect(resolved(other), seed).toEqual(resolved(before));
        }
      },
    );

    it('desistir no meio da busca encerra a partida e solta a busca: nada fica agendado, e o bot não joga', async () => {
      const { room, timers } = setup(SEED, { level: 'dificil', now: steppedClock() });
      room.connect();
      timers.runNext();
      expect(timers.pending.size).toBe(1);
      expect(timers.delays.at(-1)).toBe(0);
      const seq = room.state!.seq;

      expect(await room.concede()).toMatchObject({ ok: true });
      expect(room.room!.status).toBe('FINISHED');
      expect(timers.pending.size).toBe(0);
      expect(timers.runNext()).toBe(false);
      expect(room.state!.seq).toBe(seq + 1);
    });

    it('fechar a sala no meio da busca solta a busca: nada fica agendado', () => {
      const { room, timers } = setup(SEED, { level: 'dificil', now: steppedClock() });
      room.connect();
      timers.runNext();
      expect(timers.pending.size).toBe(1);
      room.close();
      expect(timers.pending.size).toBe(0);
      expect(timers.runNext()).toBe(false);
    });

    it('a revanche mantém o nível: a decisão do bot na partida 2 também sai em fatias', async () => {
      const { room, timers } = setup(SEED, { level: 'dificil', now: steppedClock() });
      room.connect();
      await room.concede();
      room.rematch(true);
      expect(room.room).toMatchObject({ status: 'PLAYING', gameNo: 2 });
      expect(timers.delays.at(-1)).toBe(600);
      const seq = room.state!.seq;
      expect(timers.runNext()).toBe(true);
      // Com o Médio o bot jogaria já neste primeiro disparo; no Difícil sobra uma fatia agendada.
      expect(room.state!.seq).toBe(seq);
      expect(timers.delays.at(-1)).toBe(0);
    });

    it('uma partida inteira termina; a ordem do ataque e a reação não têm busca e saem numa tarefa só', { timeout: 60_000 }, async () => {
      const { room, timers } = setup('treino-1', { level: 'dificil', now: steppedClock() });
      room.connect();
      let searched = 0;
      for (let i = 0; i < 5000 && room.room?.status !== 'FINISHED'; i++) {
        const view = room.state!.view;
        if (myTurn(view)) {
          await room.act(legalActions(view)[0] as PlayerAction);
          continue;
        }
        const kind = view.phase.kind;
        const seq = room.state!.seq;
        let tasks = 0;
        while (room.state!.seq === seq && timers.runNext()) tasks += 1;
        expect(room.state!.seq, 'o bot jogou').toBeGreaterThan(seq);
        if (kind === 'REACTION' || kind === 'ORDER_CHOICE') expect(tasks, kind).toBe(1);
        else if (tasks > 1) searched += 1;
      }
      expect(room.room?.status).toBe('FINISHED');
      expect(searched, 'houve decisões com busca').toBeGreaterThan(3);
    });
  });

  describe('a partida da revanche é a da sala nova com a mesma semente (spec §2.6: `?semente=<ela>&nivel=<nível>` repete a partida)', () => {
    /**
     * Joga a partida em curso até o bot jogar `botMoves` vezes (o jogador joga a primeira jogada legal) e devolve o que o jogador viu
     * a partir do estado `from`, e as fases em que o bot decidiu. Compara `view` e `events`: `seq` e `epoch` acumulam por sala.
     */
    async function drive(s: ReturnType<typeof setup>, from: number, botMoves: number) {
      const { room, timers, events } = s;
      const phases = new Set<string>();
      for (let moves = 0; moves < botMoves && room.room?.status === 'PLAYING'; ) {
        const view = room.state!.view;
        if (myTurn(view)) {
          await playFirst(room);
          continue;
        }
        const seq = room.state!.seq;
        phases.add(view.phase.kind);
        while (room.state!.seq === seq) {
          if (!timers.runNext()) break;
        }
        moves += 1;
      }
      const seen = states(events)
        .slice(from)
        .map((state) => ({ view: state.view, events: state.events }));
      return { phases, seen };
    }

    it.each([
      ['facil', ['rev', 'x4'], 10],
      ['medio', ['rev', 'x4'], 10],
      ['dificil', ['rev', 'x4', 'c2', 'x2'], 8],
    ] as const)('%s: a partida 2 por revanche joga o mesmo que a sala nova com <semente>-2', { timeout: 60_000 }, async (level, seeds, botMoves) => {
      for (const seed of seeds) {
        // A sala velha: a partida 1 anda um pouco (o `seq` da sala sobe) e acaba por desistência; a revanche abre a partida 2.
        const rematch = setup(seed, { level, now: steppedClock() });
        rematch.room.connect();
        await drive(rematch, 0, 3);
        await rematch.room.concede();
        rematch.room.rematch(true);
        expect(rematch.room.room).toMatchObject({ status: 'PLAYING', gameNo: 2 });
        const from = states(rematch.events).length - 1;
        const second = await drive(rematch, from, botMoves);

        // A sala nova, aberta com a semente da partida 2 (é o que o diagnóstico manda abrir).
        const fresh = setup(gameSeed(seed, 2), { level, now: steppedClock() });
        fresh.room.connect();
        const direct = await drive(fresh, 0, botMoves);

        expect(second.seen.length, `${level} ${seed}: houve jogadas`).toBeGreaterThan(botMoves);
        expect(second.seen, `${level} ${seed}`).toEqual(direct.seen);
        // O que se comparou inclui o Equipar e uma jogada da fase principal do Ataque (onde o Difícil também busca).
        expect([...second.phases], `${level} ${seed}`).toEqual(expect.arrayContaining(['EQUIP', 'ATTACK_MAIN']));
      }
    });
  });

  describe('falha na busca do Difícil', () => {
    it('a exceção sobe da tarefa, a busca é solta (nada agendado) e a sala segue: o próximo estado agenda o bot de novo', async () => {
      const { room, timers } = setup(SEED, { level: 'dificil', now: steppedClock() });
      room.connect();
      searchFault.on = true;
      try {
        // A 1ª fatia cede uma vez e a mesma fatia chega à exceção.
        expect(() => timers.runNext()).toThrow('falha na busca');
      } finally {
        searchFault.on = false;
      }
      expect(timers.pending.size).toBe(0);

      // Sem a busca presa, o estado seguinte (o Equipar do jogador) agenda a decisão do bot, e agora ela chega ao fim.
      await playFirst(room);
      expect(timers.pending.size).toBe(1);
      expect(timers.delays.at(-1)).toBe(600);
      const seq = room.state!.seq;
      for (let i = 0; i < 200 && room.state!.seq === seq; i += 1) timers.runNext();
      expect(room.state!.seq).toBe(seq + 1);
    });
  });
});
