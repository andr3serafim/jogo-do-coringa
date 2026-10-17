import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
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
import { enterRoom, forgetSession, loadSession, saveSession, type SavedSession } from '../src/online/sessions.ts';
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
  act(action: PlayerAction): Promise<AckMessage> {
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
  const session: SavedSession = { server: 'http://localhost:8787', code: 'K7M2QX', token: 'tok-ana', playerId: 'p1', nickname: 'Ana' };

  it('ida e volta num diretório temporário; outro servidor ou código → null', () => {
    const dir = mkdtempSync(join(tmpdir(), 'coringa-sessions-'));
    saveSession(session, dir);
    expect(existsSync(join(dir, 'K7M2QX.json'))).toBe(true);
    expect(loadSession('http://localhost:8787', 'K7M2QX', dir)).toEqual(session);
    expect(loadSession('http://localhost:8787/', 'k7m2qx', dir)).toEqual(session); // barra final e caixa não importam
    expect(loadSession('https://outro.exemplo', 'K7M2QX', dir)).toBeNull();
    expect(loadSession('http://localhost:8787', 'ABCDEF', dir)).toBeNull();
    expect(loadSession('http://localhost:8787', '../x', dir)).toBeNull();
    expect(() => saveSession({ ...session, code: '../fora' }, dir)).toThrow('código inválido');

    writeFileSync(join(dir, 'ABCDEF.json'), '{ não é json');
    expect(loadSession('http://localhost:8787', 'ABCDEF', dir)).toBeNull();
    writeFileSync(join(dir, 'ABCDEF.json'), JSON.stringify({ ...session, code: 'ABCDEF', token: 7 }));
    expect(loadSession('http://localhost:8787', 'ABCDEF', dir)).toBeNull();

    // lastSeq é opcional: com ele a volta em processo novo manda o hello certo; arquivos sem ele seguem carregando.
    saveSession({ ...session, lastSeq: 42 }, dir);
    expect(loadSession('http://localhost:8787', 'K7M2QX', dir)).toEqual({ ...session, lastSeq: 42 });
    saveSession(session, dir);
    expect(loadSession('http://localhost:8787', 'K7M2QX', dir)).toEqual(session);
    expect(loadSession('http://localhost:8787', 'K7M2QX', dir)).not.toHaveProperty('lastSeq');

    forgetSession('http://localhost:8787', 'K7M2QX', dir);
    expect(loadSession('http://localhost:8787', 'K7M2QX', dir)).toBeNull();
    forgetSession('http://localhost:8787', 'K7M2QX', dir); // apagar o que não existe não é erro
  });

  it('o arquivo padrão fica em packages/sim/sessions (fora do git)', () => {
    const gitignore = readFileSync(new URL('../../../.gitignore', import.meta.url), 'utf8');
    expect(gitignore).toContain('packages/sim/sessions/');
  });

  it('enterRoom: sem código cria; com código e sessão salva volta sem joinRoom; sem sessão entra; toda sessão nova é salva', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'coringa-enter-'));
    const calls: Array<{ url: string; method?: string; body?: string }> = [];
    const fetchImpl = (async (url: string, init?: { method?: string; body?: string }) => {
      calls.push({ url, method: init?.method, body: init?.body });
      const created = url.endsWith('/api/rooms');
      return new Response(JSON.stringify(created ? { code: 'K7M2QX', token: 'tok-novo', playerId: 'p1' } : { token: 'tok-join', playerId: 'p2' }), { status: 200 });
    }) as unknown as typeof fetch;
    let nicknameAsked = 0;
    const nickname = async () => (++nicknameAsked, 'Ana');
    const server = 'http://localhost:8787';

    const created = await enterRoom({ server, code: null, nickname, dir, fetchImpl });
    expect(created).toMatchObject({ resumed: false, created: true, session: { code: 'K7M2QX', token: 'tok-novo', playerId: 'p1', nickname: 'Ana', server } });
    expect(calls.map((c) => `${c.method} ${c.url}`)).toEqual([`POST ${server}/api/rooms`]);
    expect(loadSession(server, 'K7M2QX', dir)).toEqual(created.session);

    // Volta: tem sessão salva para este servidor e código → não chama a rede nem pergunta o apelido.
    const resumed = await enterRoom({ server, code: 'K7M2QX', nickname, dir, fetchImpl });
    expect(resumed).toEqual({ session: created.session, resumed: true, created: false });
    expect(calls).toHaveLength(1);
    expect(nicknameAsked).toBe(1);

    // Sem sessão salva para o código: entra pela rede e guarda o token novo.
    const joined = await enterRoom({ server, code: 'ABCDEF', nickname, dir, fetchImpl });
    expect(joined).toMatchObject({ resumed: false, created: false, session: { code: 'ABCDEF', token: 'tok-join', playerId: 'p2' } });
    expect(calls.at(-1)).toMatchObject({ method: 'POST', url: `${server}/api/rooms/ABCDEF/join` });
    expect(loadSession(server, 'ABCDEF', dir)).toEqual(joined.session);

    // Outro servidor com o mesmo código também não aproveita a sessão.
    await enterRoom({ server: 'https://outro.exemplo', code: 'K7M2QX', nickname, dir, fetchImpl });
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
