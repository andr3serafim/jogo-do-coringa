import type { GameEvent } from '@coringa/engine';
import type { AckCode, AckMessage, RoomMessage } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { legalFor } from '../../src/model/plays.ts';
import {
  ackOutcome,
  Session,
  stopReasonFor,
  type SessionDeps,
  type SessionSnapshot,
} from '../../src/model/session.ts';
import { DEFAULT_PREFS } from '../../src/model/storage.ts';
import { deferredAck, FakeConnection, stateMessage, viewAt } from '../fixtures.ts';

/** Relógio e timers falsos: o teste avança o tempo na mão. */
function fakeDeps() {
  let nowMs = 1_000;
  let nextHandle = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const seqs: number[] = [];
  const deps: SessionDeps = {
    now: () => nowMs,
    setTimer: (fn, ms) => {
      nextHandle += 1;
      timers.set(nextHandle, { at: nowMs + ms, fn });
      return nextHandle;
    },
    clearTimer: (h) => {
      timers.delete(h as number);
    },
    onSeq: (seq) => seqs.push(seq),
  };
  return {
    deps,
    seqs,
    timers,
    advance(ms: number) {
      nowMs += ms;
      for (const [h, t] of [...timers]) {
        if (t.at <= nowMs) {
          timers.delete(h);
          t.fn();
        }
      }
    },
    setNow(ms: number) {
      nowMs = ms;
    },
  };
}

function setup(options: ConstructorParameters<typeof FakeConnection>[0] = {}) {
  const connection = new FakeConnection(options);
  const clock = fakeDeps();
  const session = new Session(connection, clock.deps);
  return { connection, clock, session };
}

const seatOf = (playerId: string, nickname: string) => ({
  playerId,
  nickname,
  connected: true,
  ready: false,
  wantsRematch: false,
});

const roomOf = (gameNo: number): RoomMessage => ({
  t: 'room',
  code: 'ABCD',
  status: 'PLAYING',
  seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda')],
  score: { p1: 0, p2: 0, draws: 0 },
  gameNo,
  expiresAt: 0,
});

const ROOM = roomOf(1);

const WAIT_CODES: AckCode[] = [
  'STALE_EPOCH',
  'DISCONNECTED',
  'ALREADY_PASSED',
  'NOT_PLAYING',
  'NOT_YOUR_TURN',
  'WRONG_PHASE',
  'GAME_OVER',
  'ALREADY_SUBMITTED',
];

const PASS = { type: 'PASS' } as const;

describe('stopReasonFor', () => {
  it('mapeia os fechamentos finais da spec §6.3', () => {
    expect(stopReasonFor(4000)).toBe('ROOM_GONE');
    expect(stopReasonFor(4001)).toBe('PROTOCOL');
    expect(stopReasonFor(4003)).toBe('AUTH');
    expect(stopReasonFor(4009)).toBe('OTHER_TAB');
    expect(stopReasonFor(1000)).toBe('LEFT');
  });

  it('devolve null para os códigos que reconectam', () => {
    expect(stopReasonFor(1006)).toBeNull();
    expect(stopReasonFor(1008)).toBeNull();
    expect(stopReasonFor(4029)).toBeNull();
  });
});

describe('ackOutcome (spec §6.4)', () => {
  const refused = (code: AckCode): AckMessage => ({ t: 'ack', id: 'x', ok: false, code, message: 'm' });

  it('ok', () => {
    expect(ackOutcome({ t: 'ack', id: 'x', ok: true })).toBe('ok');
    expect(ackOutcome({ t: 'ack', id: 'x', ok: true, seq: 4, held: true })).toBe('ok');
  });

  it.each(WAIT_CODES)('%s espera o state que explica', (code) => {
    expect(ackOutcome(refused(code))).toBe('wait');
  });

  it('RATE_LIMITED é "rate"', () => {
    expect(ackOutcome(refused('RATE_LIMITED'))).toBe('rate');
  });

  it.each<AckCode>(['INVALID_ACTION', 'CARD_NOT_IN_HAND', 'BAD_MESSAGE', 'BUFF_LIMIT'])(
    '%s é erro de regra',
    (code) => {
      expect(ackOutcome(refused(code))).toBe('rule');
    },
  );
});

describe('Session: estado inicial e snapshot', () => {
  it('começa conectando, sem sala nem estado', () => {
    const { session } = setup();
    expect(session.snapshot()).toMatchObject({
      status: 'connecting',
      stop: null,
      slowRetry: false,
      me: 'p1',
      room: null,
      state: null,
      legal: [],
      pending: false,
      notice: null,
    });
  });

  it('parte do que a conexão já tem', () => {
    const view = viewAt();
    const state = stateMessage(view, { seq: 7 });
    const { session } = setup({ room: ROOM, state });
    const snap = session.snapshot();
    expect(snap.room).toBe(ROOM);
    expect(snap.state).toBe(state);
    expect(snap.legal).toEqual(legalFor(view));
    expect(snap.receivedAt).toBe(1_000);
  });

  it('é o mesmo objeto enquanto nada muda e um novo a cada mudança', () => {
    const { connection, session } = setup();
    const calls: SessionSnapshot[] = [];
    session.subscribe(() => calls.push(session.snapshot()));
    const first = session.snapshot();
    expect(session.snapshot()).toBe(first);

    connection.emit({ type: 'open' });
    const second = session.snapshot();
    expect(second).not.toBe(first);
    expect(second.status).toBe('open');
    expect(calls).toEqual([second]);

    connection.emit({ type: 'open' });
    expect(session.snapshot()).toBe(second);
    expect(calls).toHaveLength(1);
  });

  it('o snapshot antigo não muda quando vem um novo', () => {
    const { connection, session } = setup();
    const first = session.snapshot();
    connection.emit({ type: 'open' });
    expect(first.status).toBe('connecting');
  });

  it('subscribe devolve a função que cancela', () => {
    const { connection, session } = setup();
    let n = 0;
    const off = session.subscribe(() => (n += 1));
    connection.emit({ type: 'open' });
    off();
    connection.emitClosed(1006);
    expect(n).toBe(1);
  });

  it('room e state entram no snapshot; legal vem da mesma view', () => {
    const { connection, session } = setup();
    connection.emit({ type: 'open' });
    connection.emitRoom(ROOM);
    expect(session.snapshot().room).toBe(ROOM);

    const a = viewAt({ self: { hand: ['J'] } });
    connection.emitState(stateMessage(a, { seq: 1 }));
    expect(session.snapshot().legal).toEqual(legalFor(a));

    const b = viewAt({ phase: 'WAITING' });
    const msg = stateMessage(b, { seq: 2 });
    connection.emitState(msg);
    const snap = session.snapshot();
    expect(snap.state).toBe(msg);
    expect(snap.legal).toEqual(legalFor(b));
    expect(snap.legal).not.toEqual(legalFor(a));
    expect(snap.legal.some((x) => ['TIMEOUT', 'FORFEIT'].includes(x.type))).toBe(false);
  });

  it('receivedAt é o relógio da chegada do state', () => {
    const { connection, clock, session } = setup();
    clock.setNow(5_000);
    connection.emitState(stateMessage(viewAt()));
    expect(session.snapshot().receivedAt).toBe(5_000);
    clock.setNow(5_400);
    connection.emitState(stateMessage(viewAt(), { seq: 2 }));
    expect(session.snapshot().receivedAt).toBe(5_400);
  });

  it('cada state chama onSeq com o seu seq', () => {
    const { connection, clock } = setup();
    connection.emitState(stateMessage(viewAt(), { seq: 3 }));
    connection.emitState(stateMessage(viewAt(), { seq: 4 }));
    expect(clock.seqs).toEqual([3, 4]);
  });

  it('funciona sem onSeq', () => {
    const connection = new FakeConnection();
    const clock = fakeDeps();
    const { now, setTimer, clearTimer } = clock.deps;
    const session = new Session(connection, { now, setTimer, clearTimer });
    connection.emitState(stateMessage(viewAt()));
    expect(session.snapshot().state).not.toBeNull();
  });

  it('me acompanha o playerId da conexão', () => {
    const { connection, session } = setup({ playerId: null });
    expect(session.snapshot().me).toBeNull();
    connection.playerId = 'p2';
    connection.emit({ type: 'open' });
    expect(session.snapshot().me).toBe('p2');
  });
});

describe('Session: jogadas e pendência', () => {
  it('play manda a ação com as opções e fica pendente até o ack', async () => {
    const { connection, session } = setup();
    const gate = deferredAck();
    connection.acks.push(gate.promise);

    const done = session.play(PASS, { auto: true });
    expect(session.snapshot().pending).toBe(true);
    expect(connection.sent).toEqual([{ type: 'act', id: 'fake-1', action: PASS, options: { auto: true } }]);

    gate.resolve({ ok: true });
    await done;
    expect(session.snapshot().pending).toBe(false);
    expect(session.snapshot().notice).toBeNull();
  });

  it('Review Focus 1: dois play seguidos mandam uma mensagem só', async () => {
    const { connection, session } = setup();
    const gate = deferredAck();
    connection.acks.push(gate.promise);

    const first = session.play(PASS);
    const second = session.play({ type: 'END_TURN' });
    await second;
    expect(connection.sent).toHaveLength(1);

    gate.resolve({ ok: true });
    await first;
    expect(connection.sent).toHaveLength(1);

    await session.play(PASS);
    expect(connection.sent).toHaveLength(2);
  });

  it('um state novo mantém a pendência até o ack', async () => {
    const { connection, session } = setup();
    const gate = deferredAck();
    connection.acks.push(gate.promise);
    const done = session.play(PASS);

    connection.emitState(stateMessage(viewAt(), { seq: 2 }));
    expect(session.snapshot().pending).toBe(true);

    gate.resolve({ ok: true, seq: 2 });
    await done;
    expect(session.snapshot().pending).toBe(false);
  });

  it.each(WAIT_CODES)('ack %s: sem aviso e os controles voltam', async (code) => {
    const { connection, session } = setup();
    connection.acks.push({ ok: false, code, message: 'qualquer' });
    await session.play(PASS);
    expect(session.snapshot().notice).toBeNull();
    expect(session.snapshot().pending).toBe(false);
  });

  it('RATE_LIMITED: aviso "rate" e os controles voltam', async () => {
    const { connection, session } = setup();
    connection.acks.push({ ok: false, code: 'RATE_LIMITED', message: 'Muitas mensagens' });
    await session.play(PASS);
    const snap = session.snapshot();
    expect(snap.notice?.kind).toBe('rate');
    expect(snap.notice?.text).toMatch(/devagar/i);
    expect(snap.pending).toBe(false);
  });

  it('erro de regra: aviso "rule" com a mensagem do motor', async () => {
    const { connection, session } = setup();
    connection.acks.push({ ok: false, code: 'BUFF_LIMIT', message: 'Você já tem 3 buffs.' });
    await session.play(PASS);
    expect(session.snapshot().notice).toEqual({ kind: 'rule', text: 'Você já tem 3 buffs.' });
    expect(session.snapshot().pending).toBe(false);
  });

  it('o aviso some sozinho depois de um tempo', async () => {
    const { connection, clock, session } = setup();
    connection.acks.push({ ok: false, code: 'BUFF_LIMIT', message: 'x' });
    await session.play(PASS);
    clock.advance(3_999);
    expect(session.snapshot().notice).not.toBeNull();
    clock.advance(1);
    expect(session.snapshot().notice).toBeNull();
  });

  it('um aviso novo reinicia o prazo do anterior', async () => {
    const { connection, clock, session } = setup();
    connection.acks.push({ ok: false, code: 'BUFF_LIMIT', message: 'x' });
    await session.play(PASS);
    clock.advance(3_000);
    connection.acks.push({ ok: false, code: 'RATE_LIMITED', message: 'y' });
    await session.play(PASS);
    clock.advance(3_000);
    expect(session.snapshot().notice?.kind).toBe('rate');
    clock.advance(1_000);
    expect(session.snapshot().notice).toBeNull();
  });

  it('uma jogada nova limpa o aviso na hora e cancela o timer', async () => {
    const { connection, clock, session } = setup();
    connection.acks.push({ ok: false, code: 'BUFF_LIMIT', message: 'x' });
    await session.play(PASS);
    const gate = deferredAck();
    connection.acks.push(gate.promise);
    const done = session.play(PASS);
    expect(session.snapshot().notice).toBeNull();
    expect(clock.timers.size).toBe(0);
    gate.resolve({ ok: true });
    await done;
  });

  it('play sem opções manda options indefinido', async () => {
    const { connection, session } = setup();
    await session.play(PASS);
    expect(connection.sent[0]).toMatchObject({ type: 'act', options: undefined });
  });

  it('se o act falhar, a pendência não fica presa', async () => {
    const { connection, session } = setup();
    connection.act = () => Promise.reject(new Error('boom'));
    await expect(session.play(PASS)).rejects.toThrow('boom');
    expect(session.snapshot().pending).toBe(false);
  });

  it('um act que falha depois de dispose não mexe no snapshot', async () => {
    const { connection, session } = setup();
    let fail!: (e: Error) => void;
    connection.act = () => new Promise((_, reject) => (fail = reject));
    const done = session.play(PASS);
    session.dispose();
    fail(new Error('boom'));
    await expect(done).rejects.toThrow('boom');
  });

  it('concede segue o mesmo caminho: pendência única e avisos', async () => {
    const { connection, session } = setup();
    const gate = deferredAck();
    connection.acks.push(gate.promise);
    const first = session.concede();
    await session.concede();
    await session.play(PASS);
    expect(session.snapshot().pending).toBe(true);
    expect(connection.sent).toEqual([{ type: 'concede', id: 'fake-1' }]);
    gate.resolve({ ok: false, code: 'RATE_LIMITED', message: 'm' });
    await first;
    expect(session.snapshot().pending).toBe(false);
    expect(session.snapshot().notice?.kind).toBe('rate');
  });

  it('um ack que chega depois de dispose não avisa ninguém', async () => {
    const { connection, session } = setup();
    const gate = deferredAck();
    connection.acks.push(gate.promise);
    const done = session.play(PASS);
    let n = 0;
    session.subscribe(() => (n += 1));
    session.dispose();
    gate.resolve({ ok: false, code: 'BUFF_LIMIT', message: 'x' });
    await done;
    expect(n).toBe(0);
  });

  it('play depois de dispose não manda nada', async () => {
    const { connection, session } = setup();
    session.dispose();
    await session.play(PASS);
    expect(connection.sent).toHaveLength(0);
  });
});

describe('Session: erros do servidor', () => {
  it('RATE_LIMITED vira aviso "rate"', () => {
    const { connection, session } = setup();
    connection.emit({ type: 'error', error: { t: 'error', code: 'RATE_LIMITED', message: 'm' } });
    expect(session.snapshot().notice?.kind).toBe('rate');
  });

  it('os outros erros não mostram nada', () => {
    const { connection, session } = setup();
    const before = session.snapshot();
    connection.emit({ type: 'error', error: { t: 'error', code: 'WRONG_STATUS', message: 'm' } });
    expect(session.snapshot()).toBe(before);
  });
});

describe('Session: fechamentos (spec §6.3)', () => {
  it('1006 não final: reconectando', () => {
    const { connection, session } = setup();
    connection.emit({ type: 'open' });
    connection.emitClosed(1006, false);
    expect(session.snapshot()).toMatchObject({ status: 'reconnecting', slowRetry: false, stop: null });
  });

  it.each([1008, 4029])('%i: reconectando devagar', (code) => {
    const { connection, session } = setup();
    connection.emit({ type: 'open' });
    connection.emitClosed(code, false);
    expect(session.snapshot()).toMatchObject({ status: 'reconnecting', slowRetry: true });
  });

  it('a volta (open) apaga o slowRetry', () => {
    const { connection, session } = setup();
    connection.emitClosed(4029, false);
    connection.emit({ type: 'open' });
    expect(session.snapshot()).toMatchObject({ status: 'open', slowRetry: false });
  });

  it.each([
    [4000, 'ROOM_GONE'],
    [4001, 'PROTOCOL'],
    [4003, 'AUTH'],
    [4009, 'OTHER_TAB'],
  ] as const)('%i final: parado por %s', (code, stop) => {
    const { connection, session } = setup();
    connection.emit({ type: 'open' });
    connection.emitClosed(code, true);
    expect(session.snapshot()).toMatchObject({ status: 'stopped', stop, slowRetry: false });
  });

  it('1000 depois de leave(): LEFT', () => {
    const { connection, session } = setup();
    connection.emit({ type: 'open' });
    session.leave();
    expect(connection.calls).toContain('leave');
    connection.emitClosed(1000, true);
    expect(session.snapshot()).toMatchObject({ status: 'stopped', stop: 'LEFT' });
  });

  it('close() da conexão (1000 final): LEFT', () => {
    const { connection, session } = setup();
    connection.emit({ type: 'open' });
    connection.close();
    expect(session.snapshot()).toMatchObject({ status: 'stopped', stop: 'LEFT' });
  });

  it('um fechamento final desconhecido para como PROTOCOL (pede para atualizar)', () => {
    const { connection, session } = setup();
    connection.emitClosed(4321, true);
    expect(session.snapshot()).toMatchObject({ status: 'stopped', stop: 'PROTOCOL' });
  });

  it('"Usar aqui": um open depois de 4009 volta a conectado', () => {
    const { connection, session } = setup();
    connection.emitClosed(4009, true);
    connection.emit({ type: 'open' });
    expect(session.snapshot()).toMatchObject({ status: 'open', stop: null });
  });

  it('a sala e o estado ficam visíveis enquanto reconecta', () => {
    const { connection, session } = setup();
    connection.emitRoom(ROOM);
    const msg = stateMessage(viewAt());
    connection.emitState(msg);
    connection.emitClosed(1006, false);
    expect(session.snapshot()).toMatchObject({ room: ROOM, state: msg });
  });
});

describe('Session: comandos que só passam adiante', () => {
  it('ready, leave, rematch e wake vão para a conexão', () => {
    const { connection, session } = setup();
    session.ready(true);
    session.rematch(false);
    session.wake();
    session.leave();
    expect(connection.calls).toEqual(['ready:true', 'rematch:false', 'wake', 'leave']);
  });

  it('wake depois do dispose não faz nada', () => {
    const { connection, session } = setup();
    session.dispose();
    session.wake();
    expect(connection.calls).toEqual([]);
  });

  it('dispose para de ouvir a conexão e limpa o timer do aviso', async () => {
    const { connection, clock, session } = setup();
    connection.acks.push({ ok: false, code: 'BUFF_LIMIT', message: 'x' });
    await session.play(PASS);
    expect(clock.timers.size).toBe(1);
    const before = session.snapshot();
    session.dispose();
    expect(clock.timers.size).toBe(0);
    connection.emit({ type: 'open' });
    connection.emitState(stateMessage(viewAt(), { seq: 9 }));
    expect(session.snapshot()).toBe(before);
    expect(clock.seqs).toEqual([]);
  });
});

describe('Session: histórico da mesa', () => {
  const attack: GameEvent = { type: 'AttackDeclared', player: 'p1' };
  const guardPlayed: GameEvent = { type: 'GuardPlayed', player: 'p2', cards: [{ id: 'k1', kind: 'K', suit: 'paus' }] };
  const texts = (session: Session) => session.snapshot().history.lines.map((line) => line.text);

  it('começa vazio', () => {
    const { session } = setup();
    expect(session.snapshot().history).toEqual({ gameNo: null, lastSeq: 0, lines: [] });
  });

  it('guarda os eventos de cada state, um depois do outro, com o apelido do outro assento', () => {
    const { connection, session } = setup();
    connection.emitRoom(ROOM);
    connection.emitState(stateMessage(viewAt(), { seq: 2, events: [attack] }));
    connection.emitState(stateMessage(viewAt(), { seq: 3, events: [guardPlayed] }));
    expect(texts(session)).toEqual(['Rodada 10: Ataque', 'Você declarou o ataque', 'Duda pôs 1 K na Guarda']);
  });

  it('um state sem a sala ainda chama o outro de "Oponente"', () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(viewAt(), { seq: 2, events: [guardPlayed] }));
    expect(texts(session)).toContain('Oponente pôs 1 K na Guarda');
  });

  it('parte do state que a conexão já tem', () => {
    const { session } = setup({ room: ROOM, state: stateMessage(viewAt(), { seq: 7, events: [attack] }) });
    expect(session.snapshot().history).toMatchObject({ gameNo: 1, lastSeq: 7 });
    expect(texts(session)).toEqual(['Rodada 10: Ataque', 'Você declarou o ataque']);
  });

  it('um state repetido ou antigo não muda o snapshot', () => {
    const { connection, session } = setup({ room: ROOM });
    connection.emitState(stateMessage(viewAt(), { seq: 4, events: [attack] }));
    const history = session.snapshot().history;
    connection.emitState(stateMessage(viewAt(), { seq: 4, events: [attack] }));
    connection.emitState(stateMessage(viewAt(), { seq: 3, events: [attack] }));
    expect(session.snapshot().history).toBe(history);
  });

  it('o primeiro número de partida não apaga nada; um número novo esvazia o histórico', () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(viewAt(), { seq: 2, events: [attack] }));
    connection.emitRoom(ROOM);
    expect(texts(session)).toEqual(['Rodada 10: Ataque', 'Você declarou o ataque']);

    connection.emitRoom({ ...ROOM, status: 'FINISHED' });
    expect(texts(session)).toHaveLength(2);

    connection.emitRoom(roomOf(2));
    expect(session.snapshot().history).toEqual({ gameNo: 2, lastSeq: 2, lines: [] });
    connection.emitState(stateMessage(viewAt(), { seq: 3 }));
    expect(texts(session)).toEqual(['Rodada 10: Ataque']);
  });

  it('a volta do oponente durante a partida deixa "Duda voltou" no histórico, uma vez', () => {
    const { connection, session } = setup({ room: ROOM });
    connection.emitState(stateMessage(viewAt(), { seq: 2 }));
    const gone = { ...ROOM, seats: [seatOf('p1', 'André'), { ...seatOf('p2', 'Duda'), connected: false }] };
    connection.emitRoom(gone);
    expect(texts(session)).toEqual(['Rodada 10: Ataque']);
    connection.emitRoom(ROOM);
    expect(session.snapshot().history.lines.at(-1)).toEqual({ seq: 2, kind: 'note', text: 'Duda voltou' });
    expect(texts(session)).toEqual(['Rodada 10: Ataque', 'Duda voltou']);
    connection.emitRoom({ ...ROOM, expiresAt: 5 });
    expect(texts(session)).toHaveLength(2);
  });

  it('sem o playerId da conexão (nenhuma volta para contar), a sala não deixa nota', () => {
    const { connection, session } = setup({ room: ROOM, playerId: null });
    const gone = { ...ROOM, seats: [seatOf('p1', 'André'), { ...seatOf('p2', 'Duda'), connected: false }] };
    connection.emitRoom(gone);
    connection.emitRoom(ROOM);
    expect(session.snapshot().history.lines).toEqual([]);
  });

  it('o catchUp e o resync deixam as suas notas', () => {
    const { connection, session } = setup({ room: ROOM });
    connection.emitState(stateMessage(viewAt(), { seq: 5, events: [attack], catchUp: true }));
    expect(texts(session)).toContain('Enquanto você estava fora');
    connection.emitState(stateMessage(viewAt(), { seq: 40, resync: true }));
    expect(texts(session).at(-1)).toBe('Mesa sincronizada');
  });
});

describe('Session: base das marcas no histórico (marksBaseSeq)', () => {
  const view = viewAt();

  it('é null enquanto não houve jogada voluntária', () => {
    const { connection, session } = setup();
    expect(session.snapshot().marksBaseSeq).toBeNull();
    connection.emitState(stateMessage(view, { seq: 4 }));
    expect(session.snapshot().marksBaseSeq).toBeNull();
  });

  it('uma jogada voluntária guarda o seq do state em que ela saiu', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(view, { seq: 4 }));
    await session.play({ type: 'END_TURN' });
    expect(session.snapshot().marksBaseSeq).toBe(4);
  });

  it('o ack com seq leva a base até o passo da jogada: o que ela mesma causou não é "novo"', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(view, { seq: 4 }));
    const gate = deferredAck();
    connection.acks.push(gate.promise);
    const done = session.play({ type: 'END_TURN' });
    connection.emitState(stateMessage(view, { seq: 5 }));
    expect(session.snapshot().marksBaseSeq).toBe(4);
    gate.resolve({ ok: true, seq: 5 });
    await done;
    expect(session.snapshot().marksBaseSeq).toBe(5);
  });

  it('um ack sem seq (PASS guardado) ou recusado não mexe na base', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(view, { seq: 4 }));
    connection.acks.push({ ok: true, held: true });
    await session.play(PASS);
    expect(session.snapshot().marksBaseSeq).toBe(4);
    connection.emitState(stateMessage(view, { seq: 6 }));
    connection.acks.push({ ok: false, code: 'BUFF_LIMIT', message: 'x' });
    await session.play({ type: 'END_TURN' });
    expect(session.snapshot().marksBaseSeq).toBe(6);
  });

  it('uma jogada automática não troca a base', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(view, { seq: 4 }));
    await session.play({ type: 'END_TURN' });
    connection.emitState(stateMessage(view, { seq: 9 }));
    await session.play(PASS, { auto: true });
    expect(session.snapshot().marksBaseSeq).toBe(4);
  });

  it('partida nova (outro gameNo) apaga a base', async () => {
    const { connection, session } = setup({ room: ROOM });
    connection.emitState(stateMessage(view, { seq: 4 }));
    await session.play({ type: 'END_TURN' });
    connection.emitRoom({ ...ROOM, status: 'FINISHED' });
    expect(session.snapshot().marksBaseSeq).toBe(4);
    connection.emitRoom(roomOf(2));
    expect(session.snapshot().marksBaseSeq).toBeNull();
    expect(session.snapshot().marks).toEqual({ cards: new Set(), zones: new Set() });
  });
});

describe('Session: tempo restante', () => {
  it('now devolve o relógio local da sessão (o mesmo da ordem automática)', () => {
    const { clock, session } = setup();
    expect(session.now()).toBe(1_000);
    clock.setNow(4_500);
    expect(session.now()).toBe(4_500);
  });

  it('remainingMs pergunta à conexão, que conhece o relógio do servidor', () => {
    const { connection, session } = setup({ now: 10_000 });
    expect(session.remainingMs({ kind: 'TURN', at: 31_000, players: ['p1'] })).toBe(21_000);
    connection.now = 40_000;
    expect(session.remainingMs({ kind: 'TURN', at: 31_000, players: ['p1'] })).toBe(0);
  });
});

describe('Session: preferências no snapshot', () => {
  it('o snapshot traz as preferências da sessão (a mesa lê "reduzir animações" dali)', () => {
    const connection = new FakeConnection();
    const session = new Session(connection, fakeDeps().deps, { ...DEFAULT_PREFS, reduceMotion: true });
    expect(session.snapshot().prefs).toEqual({ autoPass: true, reduceMotion: true, sound: true });
  });

  it('sem preferências, valem as padrão', () => {
    expect(setup().session.snapshot().prefs).toEqual(DEFAULT_PREFS);
  });

  it('setPrefs troca o snapshot e avisa quem ouve', () => {
    const { session } = setup();
    let calls = 0;
    session.subscribe(() => {
      calls += 1;
    });
    session.setPrefs({ autoPass: false, reduceMotion: true, sound: false });
    expect(session.snapshot().prefs).toEqual({ autoPass: false, reduceMotion: true, sound: false });
    expect(calls).toBeGreaterThan(0);
  });

  it('setPrefs com as mesmas preferências não avisa ninguém', () => {
    const { session } = setup();
    const prefs = session.snapshot().prefs;
    let calls = 0;
    session.subscribe(() => {
      calls += 1;
    });
    session.setPrefs(prefs);
    expect(calls).toBe(0);
  });
});
