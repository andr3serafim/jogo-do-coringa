import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { legalActions, makeConfig, viewFor, type GameEvent, type GameResult, type GameState, type PlayerId } from '@coringa/engine';
import type {
  AckMessage,
  ConnectionEvent,
  Deadline,
  PlayerAction,
  RoomConnection,
  RoomMessage,
  RoomStatus,
  SeatInfo,
  StateMessage,
} from '@coringa/protocol';
// Dívida: trocar por um subpath `@coringa/engine/testing` quando a interface chegar (acopla os pacotes).
import { P1, P2, setup } from '../../engine/test/helpers.ts';
import { resolveServer, targetArg } from '../src/cli/args.ts';
import { runBot } from '../src/online/bot.ts';
import { enterRoom, forgetSession, loadSessions, processAlive, saveSession, type SavedSession } from '../src/online/sessions.ts';
import { playOnline } from '../src/online/session.ts';
import { askAction, playGame } from '../src/play/game.ts';
import { askChoice, scriptedIo, QuitSignal, type Io } from '../src/play/io.ts';
import { namesFor } from '../src/play/text.ts';

/** Conexão de mentira: guarda o que o cliente mandou e deixa o teste agir como servidor (sem rede, sem relógio). */
class FakeConnection implements RoomConnection {
  playerId: PlayerId | null = P1;
  room: RoomMessage | null = null;
  state: StateMessage | null = null;
  now = 1_000_000;
  readonly acts: PlayerAction[] = [];
  /** Se cada `act` levou a marca `auto`. */
  readonly autos: boolean[] = [];
  readonly readies: boolean[] = [];
  readonly rematches: boolean[] = [];
  closes = 0;
  leaves = 0;
  /** Próximos `ack` de `act`, na ordem; acabando, responde ok. */
  acks: Array<AckMessage | Promise<AckMessage>> = [];
  readonly #listeners = new Set<(e: ConnectionEvent) => void>();

  subscribe(listener: (e: ConnectionEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => this.#listeners.delete(listener);
  }
  get listeners(): number {
    return this.#listeners.size;
  }
  ready(value: boolean): void {
    this.readies.push(value);
  }
  leave(): void {
    this.leaves += 1;
  }
  rematch(want: boolean): void {
    this.rematches.push(want);
  }
  close(): void {
    this.closes += 1;
  }
  connect(): void {}
  wake(): void {}
  act(action: PlayerAction, options?: { auto?: boolean }): Promise<AckMessage> {
    this.autos.push(options?.auto === true);
    this.acts.push(action);
    return Promise.resolve(this.acks.shift() ?? { t: 'ack', id: `a${this.acts.length}`, ok: true });
  }
  concede(): Promise<AckMessage> {
    return Promise.resolve({ t: 'ack', id: 'c', ok: true });
  }
  remainingMs(deadline: Deadline): number {
    return Math.max(0, deadline.at - this.now);
  }

  emit(event: ConnectionEvent): void {
    for (const listener of [...this.#listeners]) listener(event);
  }
  emitRoom(room: RoomMessage): void {
    this.room = room;
    this.emit({ type: 'room', room });
  }
  emitState(state: StateMessage): void {
    this.state = state;
    this.emit({ type: 'state', state });
  }
}

let seqCounter = 0;
function stateMsg(s: GameState, me: PlayerId, extra: Partial<StateMessage> & { epoch: number }): StateMessage {
  seqCounter += 1;
  return { t: 'state', seq: seqCounter, view: viewFor(s, me), events: [], deadline: null, serverNow: 1_000_000, ...extra };
}

function seat(playerId: PlayerId, over: Partial<SeatInfo> = {}): SeatInfo {
  return { playerId, nickname: playerId === P1 ? 'Ana' : 'Beto', connected: true, ready: false, wantsRematch: false, ...over };
}

function roomMsg(status: RoomStatus, over: Partial<RoomMessage> = {}): RoomMessage {
  return {
    t: 'room',
    code: 'K7M2QX',
    status,
    seats: [seat(P1), seat(P2)],
    score: { p1: 0, p2: 0, draws: 0 },
    gameNo: 1,
    expiresAt: 2_000_000,
    ...over,
  };
}

/** Deixa as promessas e microtarefas pendentes correrem (nenhum código sob teste usa timer real). */
const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

const wins = (winner: PlayerId): GameResult => ({ kind: 'WIN', winner, reason: 'FORFEIT' });

describe('askChoice e o jogo offline com AbortSignal', () => {
  it('askChoice aborta com o sinal e o playGame offline continua igual', async () => {
    // Já abortado: nem pergunta (a ordem das respostas não é consumida).
    const io = scriptedIo(['1']);
    await expect(askChoice(io, 'Escolha', ['a', 'b'], AbortSignal.abort())).rejects.toMatchObject({ name: 'AbortError' });
    expect(io.output).toEqual([]);

    // Pergunta pendente que o sinal cancela no meio da espera.
    const hanging = scriptedIo(() => new Promise<string>(() => {}));
    const controller = new AbortController();
    const pending = askChoice(hanging, 'Escolha', ['a', 'b'], controller.signal);
    await flush();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });

    // Sem sinal, a mesma pergunta se comporta como antes.
    expect(await askChoice(scriptedIo(['2']), 'Escolha', ['a', 'b'])).toBe(1);

    // O playGame offline (semente 'roteiro', sempre a opção 1) segue idêntico ao de antes da refatoração.
    const game = scriptedIo(() => '1');
    const outcome = await playGame({ io: game, seed: 'roteiro', bot: 'greedy', config: makeConfig(), saveDir: null });
    const sha = (text: string) => createHash('sha256').update(text).digest('hex');
    expect(sha(game.output.join('\n'))).toBe('8131f051a8d7e1543a0f00740b3aaa77e12385c854adbb39a0e3538e8a2f69b0');
    expect(sha(JSON.stringify(outcome.replay.steps))).toBe('1cbb67275b3db8bd6141531772b85cebb7de3d014f9096b65c2095a027ce9670');
    expect(outcome.replay.steps).toHaveLength(118);
  });

  it('askAction cancela a pergunta do Equipar e do menu pelo sinal', async () => {
    const view = viewFor(setup({ p1: { hand: ['J'] } }), P1);
    const controller = new AbortController();
    const io = scriptedIo(() => new Promise<string>(() => {}));
    const pending = askAction(io, view, legalActions(view), namesFor(P1, 'Oponente'), controller.signal);
    await flush();
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
    await expect(askAction(io, view, legalActions(view), namesFor(P1), AbortSignal.abort())).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('terminal online', () => {
  const names = namesFor(P1, 'Oponente');
  const stateA = setup({ p1: { hand: ['J'] } });
  const stateB = setup({ p1: { hand: ['Q', 'Q'] } });

  it('pergunta, manda a ação escolhida; state novo no meio cancela a pergunta e redesenha', async () => {
    const legalB = legalActions(viewFor(stateB, P1));
    expect(legalB[0]).not.toEqual(legalActions(viewFor(stateA, P1))[0]);

    // A primeira pergunta fica pendente; só a segunda recebe a resposta '1'.
    let asked = 0;
    const io = scriptedIo(() => (++asked === 1 ? new Promise<string>(() => {}) : '1'));
    const connection = new FakeConnection();
    const done = playOnline({ io, connection, names });

    connection.emitState(stateMsg(stateA, P1, { epoch: 4 }));
    await flush();
    expect(asked).toBe(1);
    connection.emitState(stateMsg(stateB, P1, { epoch: 5 }));
    await flush();

    expect(asked).toBe(2);
    expect(connection.acts).toEqual([legalB[0]]);
    expect(io.output.filter((l) => l.includes('Vida')).length).toBeGreaterThanOrEqual(2); // a mesa foi redesenhada
    connection.emit({ type: 'closed', code: 1000, final: true });
    await expect(done).resolves.toEqual({ result: null });
    expect(connection.listeners).toBe(0);
  });

  it('dois states seguidos: a pergunta do primeiro nem chega a ser feita (a resposta única vai para o segundo)', async () => {
    const io = scriptedIo(['1']);
    const connection = new FakeConnection();
    const done = playOnline({ io, connection, names });
    connection.emitState(stateMsg(stateA, P1, { epoch: 4 }));
    connection.emitState(stateMsg(stateB, P1, { epoch: 5 }));
    await flush();
    expect(connection.acts).toEqual([legalActions(viewFor(stateB, P1))[0]]);
    connection.emit({ type: 'closed', code: 4009, final: true });
    await done;
    expect(io.output.join('\n')).toContain('outra aba');
  });

  it('mesmo com o ack atrasado, um state novo da mesma época redesenha e o ack tardio não pergunta de novo', async () => {
    let answers = 0;
    const io = scriptedIo(() => {
      answers += 1;
      return '1';
    });
    const connection = new FakeConnection();
    let release: (ack: AckMessage) => void = () => {};
    connection.acks = [new Promise<AckMessage>((resolve) => (release = resolve))];
    const done = playOnline({ io, connection, names });
    connection.emitState(stateMsg(stateA, P1, { epoch: 4 }));
    await flush();
    expect(connection.acts).toHaveLength(1);
    // O servidor manda o state antes do ack (spec §4.6): mesma época, seq nova, de novo a minha vez.
    connection.emitState(stateMsg(stateB, P1, { epoch: 4 }));
    await flush();
    expect(connection.acts).toHaveLength(2);
    release({ t: 'ack', id: 'x', ok: false, code: 'STALE_EPOCH', message: 'velha' });
    await flush();
    expect(answers).toBe(2); // o ack tardio não gerou pergunta nova
    connection.emit({ type: 'closed', code: 1000, final: true });
    await done;
  });

  it('STALE_EPOCH espera o próximo state; fim mostra resultado e causa, revanche s → rematch(true)', async () => {
    const asks: string[] = [];
    const io = scriptedIo((q) => {
      asks.push(q);
      return q.startsWith('Revanche') ? 's' : '1';
    });
    const connection = new FakeConnection();
    connection.acks = [{ t: 'ack', id: 'a', ok: false, code: 'STALE_EPOCH', message: 'Mesa mudou.' }];
    const done = playOnline({ io, connection, names });

    connection.emitState(stateMsg(stateA, P1, { epoch: 4 }));
    await flush();
    expect(connection.acts).toHaveLength(1);
    expect(asks).toEqual(['> ']); // recusada por época velha: não pergunta de novo sozinha
    await flush();
    expect(asks).toEqual(['> ']);

    connection.emitState(stateMsg(stateB, P1, { epoch: 5 }));
    await flush();
    expect(asks).toEqual(['> ', '> ']);
    expect(connection.acts).toHaveLength(2);

    // Fim: o state final não tem jogada; a sala em FINISHED traz resultado e causa.
    const over = setup({ phase: { kind: 'GAME_OVER', result: wins(P2) } });
    connection.emitState(stateMsg(over, P1, { epoch: 6, events: [{ type: 'GameOver', result: wins(P2) }] }));
    connection.emitRoom(roomMsg('FINISHED', { outcome: { gameNo: 1, result: wins(P2), cause: 'RECONNECT_TIMEOUT' }, score: { p1: 0, p2: 1, draws: 0 } }));
    await flush();
    const text = io.output.join('\n');
    expect(text).toContain('Fim de jogo: Oponente venceu (W.O.)');
    expect(text.match(/Fim de jogo/g)).toHaveLength(1); // o GameOver do state não repete o resultado
    expect(text).toContain('RECONNECT_TIMEOUT');
    expect(text).toContain('Placar');
    expect(asks.at(-1)).toBe('Revanche? (s/n) ');
    expect(connection.rematches).toEqual([true]);

    // Reenvio do mesmo FINISHED (ex.: o outro pediu a revanche) não pergunta de novo.
    connection.emitRoom(roomMsg('FINISHED', { outcome: { gameNo: 1, result: wins(P2), cause: 'RECONNECT_TIMEOUT' }, seats: [seat(P1, { wantsRematch: true }), seat(P2, { wantsRematch: true })] }));
    await flush();
    expect(asks.filter((q) => q.startsWith('Revanche'))).toHaveLength(1);

    // Nova partida começa; depois a sala fecha de vez.
    connection.emitRoom(roomMsg('PLAYING', { gameNo: 2 }));
    connection.emit({ type: 'closed', code: 4000, final: true });
    await expect(done).resolves.toEqual({ result: wins(P2) });
    expect(io.output.join('\n')).toContain('aguardando o oponente aceitar');
  });

  it('revanche n → rematch(false) e o terminal encerra; resposta inválida pergunta de novo; abandono não tem vencedor', async () => {
    const answers = ['talvez', 'n'];
    const io = scriptedIo((q) => (q.startsWith('Revanche') ? answers.shift()! : '1'));
    const connection = new FakeConnection();
    const done = playOnline({ io, connection, names });
    connection.emitRoom(roomMsg('FINISHED', { outcome: { gameNo: 1, result: null, cause: 'ABANDONED' } }));
    await expect(done).resolves.toEqual({ result: null });
    expect(connection.rematches).toEqual([false]);
    const text = io.output.join('\n');
    expect(text).toContain('Responda s ou n');
    expect(text).toContain('ABANDONED');
    expect(text).not.toContain('venceu');
  });

  /** Io cujas perguntas ficam pendentes até o teste responder; guarda o sinal de cada uma. */
  function pendingIo(): Io & { output: string[]; asks: Array<{ q: string; signal?: AbortSignal; answer: (text: string) => void }> } {
    const output: string[] = [];
    const asks: Array<{ q: string; signal?: AbortSignal; answer: (text: string) => void }> = [];
    return {
      output,
      asks,
      ask: (q, signal) =>
        new Promise<string>((resolve, reject) => {
          signal?.throwIfAborted();
          asks.push({ q, signal, answer: resolve });
          signal?.addEventListener('abort', () => reject(signal.reason), { once: true });
        }),
      print: (t) => output.push(t),
    };
  }

  it('volta a uma partida abandonada (room FINISHED e retrato sem GAME_OVER): a revanche segue perguntada e nada é jogado', async () => {
    const io = pendingIo();
    const connection = new FakeConnection();
    const done = playOnline({ io, connection, names });
    // O hello em FINISHED traz a sala e o retrato final; o abandono não passa pelo motor, então não é GAME_OVER.
    connection.emitRoom(roomMsg('FINISHED', { outcome: { gameNo: 1, result: null, cause: 'ABANDONED' } }));
    connection.emitState(stateMsg(stateA, P1, { epoch: 7, resync: true }));
    await flush();
    expect(io.asks.map((a) => a.q)).toEqual(['Revanche? (s/n) ']);
    expect(io.asks[0]!.signal?.aborted).toBe(false);
    expect(connection.acts).toEqual([]);
    expect(io.output.join('\n')).not.toContain('Aguardando o oponente');

    io.asks[0]!.answer('s');
    await flush();
    expect(connection.rematches).toEqual([true]);
    connection.emit({ type: 'closed', code: 1000, final: true });
    await expect(done).resolves.toEqual({ result: null });
  });

  it('turno pendente e a sala vira FINISHED (abandono por estouros): o turno é abortado e a revanche é perguntada', async () => {
    const io = pendingIo();
    const connection = new FakeConnection();
    const done = playOnline({ io, connection, names });
    connection.emitRoom(roomMsg('PLAYING'));
    // O state do TIMEOUT chega antes do room FINISHED (Ruling 13): a pergunta da jogada já estava no ar.
    connection.emitState(stateMsg(stateA, P1, { epoch: 8 }));
    await flush();
    expect(io.asks.map((a) => a.q)).toEqual(['> ']);
    connection.emitRoom(roomMsg('FINISHED', { outcome: { gameNo: 1, result: null, cause: 'ABANDONED' } }));
    await flush();
    expect(io.asks[0]!.signal?.aborted).toBe(true);
    expect(io.asks.map((a) => a.q)).toEqual(['> ', 'Revanche? (s/n) ']);
    expect(connection.acts).toEqual([]);

    io.asks[1]!.answer('n');
    await expect(done).resolves.toEqual({ result: null });
    expect(connection.rematches).toEqual([false]);
  });

  it('imprime eventos, segundos restantes, eventos perdidos e a queda do oponente', async () => {
    const io = scriptedIo(['1']);
    const connection = new FakeConnection();
    const done = playOnline({ io, connection, names });
    const events: GameEvent[] = [{ type: 'OrderChosen', player: P2, first: true, turnOrder: [P2, P1] }];
    const deadline: Deadline = { kind: 'TURN', at: connection.now + 24_300, players: [P1] };
    connection.emitState(stateMsg(stateA, P1, { epoch: 4, events, deadline, catchUp: true }));
    await flush();
    const text = io.output.join('\n');
    expect(text).toContain('Oponente escolheu atacar primeiro');
    expect(text).toContain('25 s');
    expect(text).toMatch(/perdid/i);
    connection.emitState(stateMsg(setup({ turnOrder: [P2, P1] }), P1, { epoch: 5, resync: true })); // vez do oponente: sem pergunta
    await flush();
    expect(io.output.join('\n')).toContain('Sincronizado com a sala');

    connection.emitRoom(roomMsg('PLAYING', { seats: [seat(P1), seat(P2, { connected: false, woAt: connection.now + 60_000 })] }));
    expect(io.output.join('\n')).toContain('oponente desconectou');
    expect(io.output.join('\n')).toContain('60 s');
    connection.emitRoom(roomMsg('PLAYING'));
    expect(io.output.join('\n')).toContain('oponente voltou');

    connection.emit({ type: 'error', error: { t: 'error', code: 'WRONG_STATUS', message: 'sala errada' } });
    connection.emit({ type: 'closed', code: 1006, final: false });
    connection.emit({ type: 'open' });
    connection.emit({ type: 'closed', code: 4003, final: true });
    await done;
    const all = io.output.join('\n');
    expect(all).toContain('sala errada');
    expect(all).toContain('Reconectando');
    expect(all).toContain('Reconectado');
    expect(all).toContain('token');
  });

  it('jogada recusada por regra mostra o motivo e pergunta de novo; QuitSignal encerra', async () => {
    let n = 0;
    const io = scriptedIo(() => {
      if (++n === 2) throw new QuitSignal(); // a segunda pergunta só existe porque a jogada foi recusada
      return '1';
    });
    const connection = new FakeConnection();
    connection.acks = [{ t: 'ack', id: 'a', ok: false, code: 'INVALID_ACTION', message: 'Não pode.' }];
    const done = playOnline({ io, connection, names });
    connection.emitState(stateMsg(stateA, P1, { epoch: 4 }));
    await expect(done).resolves.toEqual({ result: null });
    expect(n).toBe(2);
    expect(connection.acts).toHaveLength(1);
    expect(io.output.join('\n')).toContain('Não pode.');
  });

  it('Ctrl+C sem pergunta pendente (io.closed) encerra; estado inicial já presente na conexão é tratado', async () => {
    let closeInput: () => void = () => {};
    const closed = new Promise<void>((resolve) => (closeInput = resolve));
    const base = scriptedIo(() => new Promise<string>(() => {}));
    const io: Io & { output: string[] } = { ...base, closed };
    const connection = new FakeConnection();
    connection.playerId = P1;
    connection.room = roomMsg('LOBBY');
    connection.state = null;
    const done = playOnline({ io, connection, names });
    expect(connection.readies).toEqual([true]); // sala que já estava no lobby ao começar
    closeInput();
    await expect(done).resolves.toEqual({ result: null });
  });

  it('no lobby, marca pronto sozinho e só de novo se o pronto se perder', async () => {
    const io = scriptedIo([]);
    const connection = new FakeConnection();
    const done = playOnline({ io, connection, names });
    connection.emitRoom(roomMsg('LOBBY', { seats: [seat(P1)] }));
    connection.emitRoom(roomMsg('LOBBY', { seats: [seat(P1, { ready: true })] }));
    expect(connection.readies).toEqual([true]);
    connection.emitRoom(roomMsg('LOBBY', { seats: [seat(P1)] }));
    expect(connection.readies).toEqual([true, true]);
    connection.emit({ type: 'closed', code: 1000, final: true });
    await done;
  });
});

describe('bot online', () => {
  const stateA = setup({ p1: { hand: ['J'] } });
  const stateB = setup({ p1: { hand: ['Q', 'Q'] } });
  const waiting = setup({ turnOrder: [P2, P1] });

  /** Timers falsos: o teste dispara quando quiser. */
  function fakeTimers() {
    const timers: Array<{ fn: () => void; ms: number }> = [];
    return { timers, setTimer: (fn: () => void, ms: number) => timers.push({ fn, ms }) - 1 };
  }

  it('joga ação legal sobre o state mais recente; descarta se a época mudou na espera', async () => {
    const { timers, setTimer } = fakeTimers();
    const connection = new FakeConnection();
    const done = runBot({ connection, bot: 'greedy', seed: 'bot-1', setTimer });

    connection.emitState(stateMsg(stateA, P1, { epoch: 4 }));
    expect(timers.map((t) => t.ms)).toEqual([600]); // espera padrão de "pensando"
    // A época muda durante a espera e agora é a vez do oponente: a jogada pensada para A morre.
    connection.emitState(stateMsg(waiting, P1, { epoch: 5 }));
    timers[0].fn();
    await flush();
    expect(connection.acts).toEqual([]);

    // Outra época, de novo a vez do bot: joga uma ação legal da visão B (a mais recente).
    connection.emitState(stateMsg(stateA, P1, { epoch: 6 }));
    connection.emitState(stateMsg(stateB, P1, { epoch: 7 }));
    const viewB = viewFor(stateB, P1);
    timers[1].fn(); // a espera de uma visão já trocada não joga
    timers[2].fn();
    await flush();
    expect(connection.acts).toHaveLength(1);
    expect(legalActions(viewB)).toContainEqual(connection.acts[0]);

    connection.emit({ type: 'closed', code: 1000, final: true });
    await done;
    expect(connection.listeners).toBe(0);
  });

  it('mesma época e state mais novo: só joga a espera do mais novo; thinkMs é configurável', async () => {
    const { timers, setTimer } = fakeTimers();
    const connection = new FakeConnection();
    const done = runBot({ connection, bot: 'random', seed: 'bot-2', thinkMs: 50, setTimer });
    connection.emitState(stateMsg(stateA, P1, { epoch: 4 }));
    connection.emitState(stateMsg(stateB, P1, { epoch: 4 }));
    expect(timers.map((t) => t.ms)).toEqual([50, 50]);
    timers[0].fn();
    timers[1].fn();
    await flush();
    expect(connection.acts).toHaveLength(1);
    expect(legalActions(viewFor(stateB, P1))).toContainEqual(connection.acts[0]);
    connection.emit({ type: 'closed', code: 4000, final: true });
    await done;
  });

  it('sem ação legal (vez do oponente ou fim de jogo) não agenda nada; ack recusado é registrado', async () => {
    const { timers, setTimer } = fakeTimers();
    const lines: string[] = [];
    const connection = new FakeConnection();
    const done = runBot({ connection, bot: 'greedy', seed: 'bot-3', setTimer, log: (l) => lines.push(l) });
    connection.emitState(stateMsg(waiting, P1, { epoch: 5 }));
    connection.emitState(stateMsg(setup({ phase: { kind: 'GAME_OVER', result: wins(P1) } }), P1, { epoch: 6 }));
    expect(timers).toEqual([]);

    connection.acks = [{ t: 'ack', id: 'a', ok: false, code: 'STALE_EPOCH', message: 'velha' }];
    connection.emitState(stateMsg(stateA, P1, { epoch: 7 }));
    timers[0].fn();
    await flush();
    expect(lines.join('\n')).toContain('STALE_EPOCH');
    // Um state que chega depois do fim da conexão não agenda nada.
    connection.emit({ type: 'closed', code: 4003, final: true });
    await done;
    connection.emitState(stateMsg(stateB, P1, { epoch: 8 }));
    expect(timers).toHaveLength(1);
  });

  it('marca pronto no lobby e pede revanche no fim, uma vez por partida', async () => {
    const connection = new FakeConnection();
    connection.playerId = P2;
    const done = runBot({ connection, bot: 'greedy', seed: 'bot-4', setTimer: () => 0 });
    connection.emitRoom(roomMsg('LOBBY', { seats: [seat(P1), seat(P2)] }));
    connection.emitRoom(roomMsg('LOBBY', { seats: [seat(P1), seat(P2, { ready: true })] }));
    expect(connection.readies).toEqual([true]);

    connection.emitRoom(roomMsg('FINISHED', { outcome: { gameNo: 1, result: wins(P1), cause: 'NORMAL' } }));
    connection.emitRoom(roomMsg('FINISHED', { outcome: { gameNo: 1, result: wins(P1), cause: 'NORMAL' }, seats: [seat(P1, { wantsRematch: true }), seat(P2)] }));
    expect(connection.rematches).toEqual([true]);
    connection.emitRoom(roomMsg('FINISHED', { gameNo: 2, outcome: { gameNo: 2, result: wins(P2), cause: 'NORMAL' } }));
    expect(connection.rematches).toEqual([true, true]);
    connection.emit({ type: 'open' });
    connection.emit({ type: 'closed', code: 1006, final: false }); // queda comum: o RoomClient reconecta sozinho
    expect(connection.listeners).toBe(1);
    connection.emit({ type: 'closed', code: 1000, final: true });
    await done;
  });

  it('já começa tratando a sala e o state que a conexão tinha antes do runBot', async () => {
    const { timers, setTimer } = fakeTimers();
    const connection = new FakeConnection();
    connection.room = roomMsg('LOBBY');
    connection.state = stateMsg(stateA, P1, { epoch: 4 });
    const done = runBot({ connection, bot: 'turtle', seed: 'bot-5', setTimer });
    expect(connection.readies).toEqual([true]);
    expect(timers).toHaveLength(1);
    connection.emit({ type: 'closed', code: 1000, final: true });
    await done;
  });
});

describe('sessão salva', () => {
  const server = 'http://localhost:8787';
  const ana: SavedSession = { server, code: 'K7M2QX', token: 'tok-ana', playerId: 'p1', nickname: 'Ana', pid: 101 };
  const bia: SavedSession = { server, code: 'K7M2QX', token: 'tok-bia', playerId: 'p2', nickname: 'Bia', pid: 202 };

  it('um arquivo por assento (<CÓDIGO>-<assento>.json, p1 antes de p2); outro servidor, código ou arquivo estragado ficam de fora', () => {
    const dir = mkdtempSync(join(tmpdir(), 'coringa-sessions-'));
    saveSession(bia, dir);
    saveSession(ana, dir);
    expect(existsSync(join(dir, 'K7M2QX-p1.json'))).toBe(true);
    expect(existsSync(join(dir, 'K7M2QX-p2.json'))).toBe(true);
    expect(loadSessions(server, 'K7M2QX', dir)).toEqual([ana, bia]);
    expect(loadSessions(`${server}/`, 'k7m2qx', dir)).toEqual([ana, bia]); // barra final e caixa não importam
    expect(loadSessions('https://outro.exemplo', 'K7M2QX', dir)).toEqual([]);
    expect(loadSessions(server, 'ABCDEF', dir)).toEqual([]);
    expect(loadSessions(server, '../x', dir)).toEqual([]);
    expect(loadSessions(server, 'K7M2QX', join(dir, 'nao-existe'))).toEqual([]);
    expect(() => saveSession({ ...ana, code: '../fora' }, dir)).toThrow('código inválido');
    expect(() => saveSession({ ...ana, playerId: '../p1' }, dir)).toThrow('assento inválido');

    // Formato antigo (`<CÓDIGO>.json`, sem pid): ignorado.
    writeFileSync(join(dir, 'ABCDEF.json'), JSON.stringify({ ...ana, code: 'ABCDEF', pid: undefined }));
    expect(loadSessions(server, 'ABCDEF', dir)).toEqual([]);
    // Estragados: JSON inválido, campo com tipo errado, pid ausente ou que não é inteiro positivo, assento trocado.
    const broken: unknown[] = [
      '{ não é json',
      { ...ana, code: 'ABCDEF', token: 7 },
      { ...ana, code: 'ABCDEF', pid: undefined },
      { ...ana, code: 'ABCDEF', pid: 0 },
      { ...ana, code: 'ABCDEF', pid: -1 },
      { ...ana, code: 'ABCDEF', pid: 1.5 },
      { ...ana, code: 'ABCDEF', pid: '101' },
      { ...bia, code: 'ABCDEF' }, // diz p2 no arquivo do p1
    ];
    for (const content of broken) {
      writeFileSync(join(dir, 'ABCDEF-p1.json'), typeof content === 'string' ? content : JSON.stringify(content));
      expect(loadSessions(server, 'ABCDEF', dir)).toEqual([]);
    }

    // lastSeq é opcional: com ele a volta em processo novo manda o hello certo; arquivos sem ele seguem carregando.
    saveSession({ ...ana, lastSeq: 42 }, dir);
    expect(loadSessions(server, 'K7M2QX', dir)[0]).toEqual({ ...ana, lastSeq: 42 });
    saveSession(ana, dir);
    expect(loadSessions(server, 'K7M2QX', dir)[0]).not.toHaveProperty('lastSeq');

    // Esquecer apaga só aquele assento; de outro servidor não apaga; o que não existe não é erro.
    forgetSession(server, 'K7M2QX', 'p1', dir);
    expect(loadSessions(server, 'K7M2QX', dir)).toEqual([bia]);
    forgetSession('https://outro.exemplo', 'K7M2QX', 'p2', dir);
    expect(loadSessions(server, 'K7M2QX', dir)).toEqual([bia]);
    forgetSession(server, 'K7M2QX', 'p1', dir);
    forgetSession(server, '../x', 'p1', dir);
    forgetSession(server, 'K7M2QX', '../x', dir);
    expect(loadSessions(server, 'K7M2QX', dir)).toEqual([bia]);
  });

  it('processAlive: o próprio processo está vivo; ESRCH é morto; EPERM conta como vivo', () => {
    expect(processAlive(process.pid)).toBe(true);
    const kill = vi.spyOn(process, 'kill');
    try {
      kill.mockImplementation(() => {
        throw Object.assign(new Error('sem processo'), { code: 'ESRCH' });
      });
      expect(processAlive(4242)).toBe(false);
      kill.mockImplementation(() => {
        throw Object.assign(new Error('sem permissão'), { code: 'EPERM' });
      });
      expect(processAlive(4242)).toBe(true);
      expect(kill).toHaveBeenLastCalledWith(4242, 0);
    } finally {
      kill.mockRestore();
    }
  });

  it('o arquivo padrão fica em packages/sim/sessions (fora do git)', () => {
    const gitignore = readFileSync(new URL('../../../.gitignore', import.meta.url), 'utf8');
    expect(gitignore).toContain('packages/sim/sessions/');
  });

  it('enterRoom (Ruling 23): dois terminais no mesmo PC ocupam os dois assentos; quem volta retoma o assento cujo processo morreu', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'coringa-enter-'));
    const calls: Array<{ url: string; method?: string }> = [];
    let joins = 0;
    const fetchImpl = (async (url: string, init?: { method?: string }) => {
      calls.push({ url, method: init?.method });
      const body = url.endsWith('/api/rooms')
        ? { code: 'K7M2QX', token: 'tok-ana', playerId: 'p1' }
        : { token: `tok-join-${++joins}`, playerId: 'p2' };
      return new Response(JSON.stringify(body), { status: 200 });
    }) as unknown as typeof fetch;
    let nicknameAsked = 0;
    const nickname = async () => (++nicknameAsked, 'Ana');
    const alive = new Set<number>();
    const enter = (code: string | null, pid: number, at = server) =>
      enterRoom({ server: at, code, nickname, dir, fetchImpl, pid, isAlive: (candidate) => alive.has(candidate) });

    // A cria a sala: p1, salvo com o pid de A.
    alive.add(101);
    const a = await enter(null, 101);
    expect(a).toMatchObject({ resumed: false, created: true, session: { code: 'K7M2QX', token: 'tok-ana', playerId: 'p1', pid: 101, server } });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([`POST ${server}/api/rooms`]);
    expect(loadSessions(server, 'K7M2QX', dir)).toEqual([a.session]);

    // B, no mesmo PC, roda `pnpm play --online K7M2QX` como o CLI manda: A está vivo, então B entra como p2.
    alive.add(202);
    const b = await enter('K7M2QX', 202);
    expect(b).toMatchObject({ resumed: false, created: false, session: { playerId: 'p2', token: 'tok-join-1', pid: 202 } });
    expect(calls.at(-1)).toMatchObject({ method: 'POST', url: `${server}/api/rooms/K7M2QX/join` });
    expect(loadSessions(server, 'K7M2QX', dir).map((s) => [s.playerId, s.pid])).toEqual([
      ['p1', 101],
      ['p2', 202],
    ]);

    // A morre: o próximo terminal com o código retoma p1, sem rede nem apelido, e regrava o arquivo com o pid novo.
    alive.delete(101);
    alive.add(303);
    const before = calls.length;
    const asked = nicknameAsked;
    const a2 = await enter('K7M2QX', 303);
    expect(a2).toEqual({ session: { ...a.session, pid: 303 }, resumed: true, created: false });
    expect(calls).toHaveLength(before);
    expect(nicknameAsked).toBe(asked);
    expect(loadSessions(server, 'K7M2QX', dir)[0]).toEqual({ ...a.session, pid: 303 });

    // B morre: com p1 vivo de novo (303), quem volta retoma p2.
    alive.delete(202);
    const b2 = await enter('K7M2QX', 404);
    expect(b2).toEqual({ session: { ...b.session, pid: 404 }, resumed: true, created: false });
    expect(calls).toHaveLength(before);

    // Arquivo de um processo morto cujo pid o sistema reaproveitou para este terminal: também retoma.
    alive.add(404);
    expect((await enter('K7M2QX', 404)).resumed).toBe(true);

    // Nenhuma sessão para o código: entra como novo e salva.
    const fresh = await enter('ABCDEF', 505);
    expect(fresh).toMatchObject({ resumed: false, created: false, session: { code: 'ABCDEF', playerId: 'p2', pid: 505 } });
    expect(loadSessions(server, 'ABCDEF', dir)).toEqual([fresh.session]);

    // Formato antigo (`<CÓDIGO>.json`) é ignorado: entra como novo.
    writeFileSync(join(dir, 'GHJKMN.json'), JSON.stringify({ server, code: 'GHJKMN', token: 'velho', playerId: 'p1', nickname: 'Ana' }));
    expect((await enter('GHJKMN', 606)).resumed).toBe(false);
    expect(calls.at(-1)?.url).toBe(`${server}/api/rooms/GHJKMN/join`);

    // Outro servidor com o mesmo código: as sessões salvas (de localhost) não servem.
    alive.clear();
    await enter('K7M2QX', 707, 'https://outro.exemplo');
    expect(calls.at(-1)?.url).toBe('https://outro.exemplo/api/rooms/K7M2QX/join');
  });
});

describe('argumentos da linha de comando', () => {
  it('servidor: --servidor, depois CORINGA_SERVIDOR, depois localhost:8787', () => {
    expect(resolveServer('https://a.exemplo', { CORINGA_SERVIDOR: 'https://b.exemplo' })).toBe('https://a.exemplo');
    expect(resolveServer(undefined, { CORINGA_SERVIDOR: 'https://b.exemplo' })).toBe('https://b.exemplo');
    expect(resolveServer(undefined, {})).toBe('http://localhost:8787');
    expect(resolveServer('', { CORINGA_SERVIDOR: '' })).toBe('http://localhost:8787');
  });

  it('alvo posicional vazio ou ausente vira undefined (parseTarget("") lança)', () => {
    expect(targetArg([])).toBeUndefined();
    expect(targetArg([''])).toBeUndefined();
    expect(targetArg(['  '])).toBeUndefined();
    expect(targetArg(['K7M2QX'])).toBe('K7M2QX');
    expect(() => targetArg(['A', 'B'])).toThrow('apenas um alvo');
  });
});
