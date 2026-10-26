import { legalActions, viewFor } from '@coringa/engine';
import type { GameState } from '@coringa/engine';
import type { ClientMessage, PlayerAction, ReplayMessage, RoomMessage } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { setup } from '@coringa/engine/testing';
import { RoomCore } from '../../src/core/room-core.ts';
import { emptyEffects } from '../../src/core/effects.ts';
import { joinRecord, splitRecord } from '../../src/core/storage-layout.ts';
import { TIMERS } from '../../src/core/timers.ts';
import type { RoomRecord, SocketInfo } from '../../src/core/types.ts';
import { replayOf, sendReplay } from '../../src/core/views.ts';
import { CODE, Harness, reexecute } from './harness.ts';
import type { FakeSocket, Room } from './harness.ts';

/**
 * Replay online (spec 2 §8.4): a semente e o registro de passos só saem na mensagem `replay`, depois que a partida
 * acabou de vez, e sempre depois do `room` em `FINISHED` daquela partida. Um teste por caminho que leva a `FINISHED`.
 */

const types = (sock: FakeSocket, count: number): string[] => sock.inbox.slice(-count).map((message) => message.t);
const replaysOf = (sock: FakeSocket): ReplayMessage[] =>
  sock.inbox.filter((message): message is ReplayMessage => message.t === 'replay');

/** Jogadas na época atual do registro (a janela de reação abre uma época nova). */
const attack = (h: Harness): ClientMessage => ({ t: 'act', id: 'atk', epoch: h.core.record!.epoch, action: { type: 'DECLARE_ATTACK' } });
const pass = (h: Harness): ClientMessage => ({ t: 'act', id: 'pass', epoch: h.core.record!.epoch, action: { type: 'PASS' } });

/** O ataque do p1 mata o p2 (1 de vida) se ele passar; o motor encerra a partida na resolução. */
const lethal = (): GameState => setup({ p1: { attack: [9] }, p2: { hp: 1 } });

/** Sala em PLAYING com o estado montado e o prazo da fase armado. */
async function armed(state: GameState): Promise<Room> {
  const room = await Harness.fromState(state);
  room.h.arm();
  return room;
}

/** A mensagem que o servidor deve mandar: o `Replay` da linha de log `game.replay` daquela partida, sem remontar. */
function logged(h: Harness, gameNo = 1): ReplayMessage {
  const line = h.logs.filter((entry) => entry.evt === 'game.replay' && entry.gameNo === gameNo).at(-1);
  if (line?.evt !== 'game.replay') throw new Error(`sem game.replay da partida ${gameNo}`);
  return { t: 'replay', gameNo, replay: line.replay };
}

/** O socket recebeu o `room` em `FINISHED` da partida antes de cada `replay` dela. */
function expectRoomBeforeReplay(sock: FakeSocket): void {
  sock.inbox.forEach((message, index) => {
    if (message.t !== 'replay') return;
    const finished = sock.inbox
      .slice(0, index)
      .some((earlier) => earlier.t === 'room' && earlier.status === 'FINISHED' && earlier.gameNo === message.gameNo);
    expect(finished, `${sock.id} recebeu o replay da partida ${message.gameNo} antes do room FINISHED dela`).toBe(true);
  });
}

describe('o replay sai depois do room, em todo caminho que leva a FINISHED', () => {
  it('o fim pelo motor manda room e depois replay aos dois', async () => {
    const { h, p1, p2 } = await Harness.fromState(lethal());
    const rec = h.core.record!;
    await h.send(p1, attack(h));
    h.now += TIMERS.reactionMinMs;
    await h.send(p2, pass(h));
    expect(rec.status).toBe('FINISHED');
    expect(types(p2, 4)).toEqual(['state', 'ack', 'room', 'replay']);
    expect(types(p1, 3)).toEqual(['state', 'room', 'replay']);
    for (const sock of [p1, p2]) {
      expect(sock.inbox.at(-2)).toMatchObject({ t: 'room', status: 'FINISHED', gameNo: 1, outcome: rec.outcome });
      expect(sock.inbox.at(-1)).toEqual(logged(h));
      expectRoomBeforeReplay(sock);
    }
    expect(firstReplay(p1).replay).toMatchObject({ name: `sala-${CODE}-1`, seed: 'semente-fixa', players: ['p1', 'p2'] });
    expect(firstReplay(p1).replay.steps).toEqual(rec.game!.steps);
    expect(firstReplay(p1).replay.config).toEqual(rec.game!.state.config);
  });

  it('o fim pelo motor no estouro da janela de reação (alarme) também manda room e depois replay', async () => {
    const { h, p1, p2 } = await armed(lethal());
    await h.send(p1, attack(h));
    h.advance(TIMERS.reactionMs + TIMERS.graceMs);
    const rec = h.core.record!;
    expect(rec.status).toBe('FINISHED');
    expect(rec.game!.steps.at(-1)).toEqual({ player: 'system', action: { type: 'TIMEOUT' } });
    for (const s of [p1, p2]) {
      expect(types(s, 3)).toEqual(['state', 'room', 'replay']);
      expect(s.inbox.at(-1)).toEqual(logged(h));
      expectRoomBeforeReplay(s);
    }
  });

  it('o fim pelo motor com o PASS guardado que vale no alarme também manda room e depois replay', async () => {
    const { h, p1, p2 } = await armed(lethal());
    await h.send(p1, attack(h));
    await h.send(p2, pass(h)); // antes do piso de 2 s: guardado, ninguém vê nada
    expect(h.core.record!.status).toBe('PLAYING');
    expect(p2.inbox.at(-1)).toMatchObject({ t: 'ack', held: true });
    expect(replaysOf(p1).concat(replaysOf(p2))).toEqual([]);

    h.advance(TIMERS.reactionMinMs);
    const rec = h.core.record!;
    expect(rec.status).toBe('FINISHED');
    expect(rec.game!.steps.at(-1)).toEqual({ player: 'p2', action: { type: 'PASS' } });
    for (const s of [p1, p2]) {
      expect(types(s, 3)).toEqual(['state', 'room', 'replay']);
      expect(s.inbox.at(-1)).toEqual(logged(h));
    }
  });

  it('a desistência também', async () => {
    const { h, p1, p2 } = await Harness.playing();
    await h.send(p2, { t: 'concede', id: 'c1' });
    expect(types(p2, 4)).toEqual(['state', 'ack', 'room', 'replay']);
    expect(types(p1, 3)).toEqual(['state', 'room', 'replay']);
    for (const s of [p1, p2]) {
      expect(s.inbox.at(-1)).toEqual(logged(h));
      expectRoomBeforeReplay(s);
    }
    expect(firstReplay(p1).replay.steps.at(-1)).toEqual({ player: 'system', action: { type: 'FORFEIT', loser: 'p2' } });

    // Repetir a desistência (mesmo id) devolve o ack guardado e não manda o replay de novo.
    await h.send(p2, { t: 'concede', id: 'c1' });
    expect(replaysOf(p2)).toHaveLength(1);
  });

  describe('o W.O. (tempo esgotado três vezes e queda sem volta) também', () => {
    it('por três estouros (AFK): room e depois replay aos dois', async () => {
      const { h, p1, p2 } = await armed(setup({}));
      const rec = h.core.record!;
      rec.game!.strikes.p1 = 2;
      h.advance(TIMERS.turnMs + TIMERS.graceMs);
      expect(rec.outcome).toMatchObject({ cause: 'AFK', result: { kind: 'WIN', winner: 'p2', reason: 'FORFEIT' } });
      for (const s of [p1, p2]) {
        expect(types(s, 3)).toEqual(['state', 'room', 'replay']);
        expect(s.inbox.at(-1)).toEqual(logged(h));
        expectRoomBeforeReplay(s);
      }
      expect(firstReplay(p2).replay.steps.slice(-2)).toEqual([
        { player: 'system', action: { type: 'TIMEOUT' } },
        { player: 'system', action: { type: 'FORFEIT', loser: 'p1' } },
      ]);
    });

    it('por queda sem volta: o vencedor recebe room e replay; o perdedor, o replay no hello', async () => {
      const { h, p1, p2, tokens } = await Harness.playing();
      h.close(p2);
      h.advance(TIMERS.reconnectMs);
      const rec = h.core.record!;
      expect(rec.outcome).toMatchObject({ cause: 'RECONNECT_TIMEOUT', result: { kind: 'WIN', winner: 'p1' } });
      expect(types(p1, 3)).toEqual(['state', 'room', 'replay']);
      expect(p1.inbox.at(-1)).toEqual(logged(h));
      expect(replaysOf(p2)).toEqual([]);

      const back = h.open();
      await h.send(back, h.hello(tokens.p2));
      expect(back.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state', 'replay']);
      expect(back.inbox.at(-1)).toEqual(logged(h));
      expectRoomBeforeReplay(back);
      expect(replaysOf(p1)).toHaveLength(1); // quem já tinha o replay não o recebe de novo
    });
  });

  it('o abandono por três estouros com o outro fora: room e replay até o último passo, sem FORFEIT', async () => {
    const { h, p1, p2 } = await armed(setup({}));
    const rec = h.core.record!;
    rec.game!.strikes.p1 = 2;
    h.close(p2);
    h.advance(TIMERS.turnMs + TIMERS.graceMs);
    expect(rec.outcome).toEqual({ gameNo: 1, result: null, cause: 'ABANDONED' });
    // O abandono não é passo do motor: só o TIMEOUT gerou `state`; depois dele vêm `room` e `replay`.
    expect(types(p1, 3)).toEqual(['state', 'room', 'replay']);
    expect(p1.inbox.at(-1)).toEqual(logged(h));
    expect(firstReplay(p1).replay.steps).toEqual([{ player: 'system', action: { type: 'TIMEOUT' } }]);
    expect(replaysOf(p2)).toEqual([]);
  });

  it('o abandono dos dois fora sem volta: os dois recebem o replay no hello', async () => {
    const { h, p1, p2, tokens } = await Harness.playing();
    h.close(p1);
    h.close(p2);
    h.advance(TIMERS.reconnectMs);
    const rec = h.core.record!;
    expect(rec.outcome).toEqual({ gameNo: 1, result: null, cause: 'ABANDONED' });

    for (const seat of ['p1', 'p2'] as const) {
      const back = h.open();
      await h.send(back, h.hello(tokens[seat]));
      expect(back.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state', 'replay']);
      expect(back.inbox.at(-1)).toEqual(logged(h));
      expectRoomBeforeReplay(back);
    }
  });
});

describe('nenhum replay enquanto a partida pode continuar', () => {
  it('nenhum replay durante a partida (nenhuma mensagem com a semente antes do fim)', async () => {
    const { h, p1, p2 } = await Harness.playing();
    const seed = h.core.record!.game!.seed;
    const equip = h.core.record!.game!.state.players[0]!.pending.length > 0;
    if (equip) {
      await h.send(p1, { t: 'act', id: 'e1', epoch: h.core.record!.epoch, action: { type: 'EQUIP', destinations: ['ATK', 'DEF'] } });
    }
    for (const s of [p1, p2]) {
      expect(replaysOf(s)).toEqual([]);
      expect(JSON.stringify(s.inbox)).not.toContain(seed);
    }

    await h.send(p1, { t: 'concede', id: 'c1' });
    for (const s of [p1, p2]) {
      expect(s.inbox.filter((message) => JSON.stringify(message).includes(seed)).map((m) => m.t)).toEqual(['replay']);
    }
  });

  it('no lobby e no hello durante a partida não sai replay nem semente', async () => {
    const { h, p1, tokens } = await Harness.playing();
    h.close(p1);
    const back = h.open();
    await h.send(back, h.hello(tokens.p1));
    expect(back.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state']);
    expect(JSON.stringify(back.inbox)).not.toContain(h.core.record!.game!.seed);
  });
});

describe('o hello com a sala FINISHED', () => {
  async function finished(): Promise<Room> {
    const room = await Harness.playing();
    await room.h.send(room.p2, { t: 'concede', id: 'c1' });
    return room;
  }

  it('o hello com a sala FINISHED reenvia o replay depois do room', async () => {
    const { h, p1, tokens } = await finished();
    h.close(p1);
    const back = h.open();
    await h.send(back, h.hello(tokens.p1));
    expect(back.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state', 'replay']);
    expect(back.inbox.at(-1)).toEqual(logged(h));
    expectRoomBeforeReplay(back);
  });

  it('no hello, só o socket que entrou recebe o replay', async () => {
    const { h, p1, p2, tokens } = await finished();
    expect(replaysOf(p1)).toHaveLength(1);
    expect(replaysOf(p2)).toHaveLength(1);
    const p2Before = p2.inbox.length;
    h.close(p1);
    const back = h.open();
    await h.send(back, h.hello(tokens.p1));
    expect(replaysOf(back)).toHaveLength(1);
    expect(replaysOf(p2)).toHaveLength(1);
    expect(p2.inbox.slice(p2Before).map((m) => m.t)).toEqual(['room', 'room']); // a saída e a volta de p1; nenhum replay

    // Uma segunda aba do mesmo assento derruba a primeira (4009) e é ela quem recebe o replay.
    const second = h.open();
    await h.send(second, h.hello(tokens.p1));
    expect(back.closed).toMatchObject({ code: 4009 });
    expect(replaysOf(second)).toHaveLength(1);
    expect(replaysOf(back)).toHaveLength(1);
    expect(replaysOf(p2)).toHaveLength(1);
  });

  it('revanche pedida por um só: o hello ainda manda o replay da terminada', async () => {
    const { h, p1, p2, tokens } = await finished();
    await h.send(p2, { t: 'rematch', want: true });
    h.close(p1);
    const back = h.open();
    await h.send(back, h.hello(tokens.p1));
    expect(h.core.record!.status).toBe('FINISHED');
    expect(back.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state', 'replay']);
    expect(back.inbox.at(-1)).toEqual(logged(h));
  });

  it('revanche começada: nenhum replay, nem no hello', async () => {
    const { h, p1, p2, tokens } = await finished();
    // A pede, A cai, B pede e A volta: a revanche larga no hello de A.
    await h.send(p1, { t: 'rematch', want: true });
    h.close(p1);
    await h.send(p2, { t: 'rematch', want: true });
    const back = h.open();
    await h.send(back, h.hello(tokens.p1));
    expect(h.core.record).toMatchObject({ status: 'PLAYING', gameNo: 2 });
    expect(back.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state']);
    expect(replaysOf(p2)).toHaveLength(1); // só o da partida 1
    expect(types(p2, 2)).toEqual(['room', 'state']);

    // E um hello durante a partida 2 também não manda replay (a semente nova segue escondida).
    h.close(back);
    const again = h.open();
    await h.send(again, h.hello(tokens.p1));
    expect(again.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state']);
    const seed2 = h.core.record!.game!.seed;
    for (const s of [p2, back, again]) expect(JSON.stringify(s.inbox)).not.toContain(seed2);
  });

  it('a revanche acabada manda o replay da partida 2, com o nome e a semente dela', async () => {
    const { h, p1, p2 } = await finished();
    await h.send(p1, { t: 'rematch', want: true });
    await h.send(p2, { t: 'rematch', want: true });
    await h.send(p1, { t: 'concede', id: 'c2' });
    for (const s of [p1, p2]) {
      expect(replaysOf(s).map((r) => [r.gameNo, r.replay.name, r.replay.seed])).toEqual([
        [1, `sala-${CODE}-1`, 'semente-1'],
        [2, `sala-${CODE}-2`, 'semente-2'],
      ]);
      expect(s.inbox.at(-1)).toEqual(logged(h, 2));
      expectRoomBeforeReplay(s);
    }
  });

  it('o hello com a sala FINISHED num núcleo reconstruído do armazenamento (como o seed-seam faz) manda o replay com a semente e todos os passos', async () => {
    const { h, p1, tokens } = await Harness.playing();
    const equip = legalFirst(h, 'p1');
    await h.send(p1, { t: 'act', id: 'e1', epoch: h.core.record!.epoch, action: equip });
    await h.send(p1, { t: 'concede', id: 'c1' });
    const stored = h.core.record!;
    const original = logged(h);

    // O Durable Object hiberna e volta sem memória nenhuma: só o que foi gravado nas quatro chaves sobrevive.
    const parts = JSON.parse(JSON.stringify(splitRecord(stored))) as ReturnType<typeof splitRecord>;
    const rebuilt = joinRecord(parts);
    expect(rebuilt).not.toBeNull();
    h.core = new RoomCore(rebuilt, Harness.deps('outro'));
    h.close(p1);
    const back = h.open();
    await h.send(back, h.hello(tokens.p1));

    const [message] = replaysOf(back);
    expect(back.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state', 'replay']);
    expect(message!.replay.seed).toBe('semente-1');
    expect(message!.replay.steps).toHaveLength(stored.game!.steps.length);
    expect(message!.replay.steps.length).toBeGreaterThanOrEqual(2); // o Equipar e o FORFEIT
    expect(message).toEqual(original);
    expect(JSON.parse(JSON.stringify(message))).toEqual(message);
  });
});

describe('a sala que expira', () => {
  /** Vence o `hardExpiry` agora e roda o alarme, como a casca faria. */
  function expireNow(h: Harness): void {
    const rec = h.core.record!;
    rec.agenda = rec.agenda.map((item) => (item.kind === 'hardExpiry' ? { ...item, at: h.now } : item));
    h.apply(h.core.onAlarm(h.sockets, h.now));
  }

  it('sala que expira no meio da partida manda o replay até onde foi a quem está conectado, antes de fechar', async () => {
    const { h, p1, p2 } = await Harness.playing();
    await h.send(p1, { t: 'act', id: 'e1', epoch: h.core.record!.epoch, action: legalFirst(h, 'p1') });
    const rec = h.core.record!;
    const stray = h.open(); // sem hello: não tem assento
    expireNow(h);

    expect(h.deleted).toBe(true);
    expect(h.core.record).toBeNull();
    for (const s of [p1, p2]) {
      expect(types(s, 2)).toEqual(['room', 'replay']);
      expect(s.inbox.at(-2)).toMatchObject({
        t: 'room',
        status: 'FINISHED',
        gameNo: 1,
        outcome: { gameNo: 1, result: null, cause: 'ABANDONED' },
      });
      expect(s.inbox.at(-1)).toEqual(logged(h));
      expect(s.closed).toMatchObject({ code: 4000 });
      expectRoomBeforeReplay(s);
    }
    expect(firstReplay(p1).replay.steps).toEqual(rec.game!.steps);
    expect(firstReplay(p1).replay.steps.length).toBeGreaterThanOrEqual(1);
    expect(stray.inbox).toEqual([]);
    expect(stray.closed).toMatchObject({ code: 4000 });
  });

  it('o socket que a varredura fechou na mesma rodada não recebe nada', async () => {
    const { h, p1, p2 } = await Harness.playing();
    h.silent(p2);
    p2.lastSeenAt = h.now - TIMERS.silentDropMs - 1_000;
    const before = p2.inbox.length;
    expireNow(h);
    expect(p2.closed).toEqual({ code: 4008, reason: 'sem sinal' });
    expect(p2.inbox).toHaveLength(before);
    expect(types(p1, 2)).toEqual(['room', 'replay']);
  });

  it('o jogo que acaba por prazo no mesmo alarme da expiração ainda manda room e replay antes do 4000', async () => {
    const { h, p1, p2 } = await armed(setup({}));
    const rec = h.core.record!;
    rec.game!.strikes.p1 = 2;
    const phaseAt = rec.agenda.find((item) => item.kind === 'phase')!.at;
    rec.agenda = rec.agenda.map((item) => (item.kind === 'hardExpiry' ? { ...item, at: phaseAt + 1 } : item));
    h.now = phaseAt + 1;
    for (const fake of h.fakes) fake.lastSeenAt = h.now;
    h.apply(h.core.onAlarm(h.sockets, h.now));

    expect(h.core.record).toBeNull();
    expect(rec.outcome).toMatchObject({ cause: 'AFK' });
    for (const s of [p1, p2]) {
      expect(types(s, 3)).toEqual(['state', 'room', 'replay']);
      expect(s.inbox.at(-2)).toMatchObject({ t: 'room', status: 'FINISHED', outcome: { cause: 'AFK' } });
      expect(s.inbox.at(-1)).toEqual(logged(h));
      expect(s.closed).toMatchObject({ code: 4000 });
    }
    expect(replaysOf(p1)).toHaveLength(1);
  });

  it('sala FINISHED ou no lobby que expira não manda nada: quem estava conectado já tem o replay', async () => {
    const lobby = await Harness.lobby();
    const lobbySends = lobby.h.sent.length;
    expireNow(lobby.h);
    expect(lobby.h.sent).toHaveLength(lobbySends);
    expect(lobby.p1.closed).toMatchObject({ code: 4000 });

    const { h, p1, p2 } = await Harness.playing();
    await h.send(p2, { t: 'concede', id: 'c1' });
    const sent = h.sent.length;
    expireNow(h);
    expect(h.sent).toHaveLength(sent);
    expect(replaysOf(p1)).toHaveLength(1);
    expect(replaysOf(p2)).toHaveLength(1);
    expect(p1.closed).toMatchObject({ code: 4000 });
  });
});

describe('o replay reexecutado no motor', () => {
  it('o replay reexecutado no motor chega ao estado final guardado', async () => {
    const full = await Harness.playing();
    await full.h.playToEnd();
    const [message] = replaysOf(full.p1);
    expect(message).toBeDefined();
    expect(message!.replay.steps.length).toBeGreaterThan(5);
    expect(reexecute(message!.replay)).toEqual(full.h.core.record!.game!.state);

    const cut = await Harness.playing();
    await cut.h.send(cut.p1, { t: 'act', id: 'e1', epoch: cut.h.core.record!.epoch, action: legalFirst(cut.h, 'p1') });
    const record = cut.h.core.record!;
    record.agenda = record.agenda.map((item) => (item.kind === 'hardExpiry' ? { ...item, at: cut.h.now } : item));
    cut.h.apply(cut.h.core.onAlarm(cut.h.sockets, cut.h.now));
    const [abandoned] = replaysOf(cut.p2);
    expect(abandoned).toBeDefined();
    expect(reexecute(abandoned!.replay)).toEqual(record.game!.state);
  });
});

describe('sendReplay', () => {
  async function finishedRecord(): Promise<{ record: RoomRecord; sockets: SocketInfo[] }> {
    const { h, p1, p2 } = await Harness.playing();
    await h.send(p2, { t: 'concede', id: 'c1' });
    const sockets: SocketInfo[] = [p1, p2].map((s) => ({ socketId: s.id, seat: s.seat, connectedAt: 0, lastSeenAt: 0 }));
    return { record: h.core.record!, sockets };
  }

  const sentBy = (record: RoomRecord, sockets: SocketInfo[]): string[] => {
    const effects = emptyEffects();
    sendReplay(effects, record, sockets);
    return effects.send.map((entry) => `${entry.socketId}:${entry.message.t}`);
  };

  it('só com a sala FINISHED e um outcome da partida atual; qualquer outro status não manda nada', async () => {
    const { record, sockets } = await finishedRecord();
    expect(sentBy(record, sockets)).toEqual(['socket-1:replay', 'socket-2:replay']);

    for (const status of ['LOBBY', 'PLAYING'] as const) {
      expect(sentBy({ ...record, status }, sockets)).toEqual([]);
    }
    expect(sentBy({ ...record, outcome: null }, sockets)).toEqual([]);
    expect(sentBy({ ...record, outcome: { gameNo: 7, result: null, cause: 'ABANDONED' } }, sockets)).toEqual([]);
    expect(sentBy({ ...record, game: null }, sockets)).toEqual([]);
  });

  it('só aos sockets com assento', async () => {
    const { record, sockets } = await finishedRecord();
    const anonymous: SocketInfo = { socketId: 'sem-assento', seat: null, connectedAt: 0, lastSeenAt: 0 };
    expect(sentBy(record, [anonymous, ...sockets])).toEqual(['socket-1:replay', 'socket-2:replay']);
    expect(sentBy(record, [anonymous])).toEqual([]);
  });

  it('o Replay montado é o da linha de log e não depende de a lista de passos seguir igual', async () => {
    const { record } = await finishedRecord();
    const replay = replayOf(record);
    expect(replay).toMatchObject({ name: `sala-${CODE}-1`, seed: record.game!.seed, players: ['p1', 'p2'] });
    expect(replay.steps).toEqual(record.game!.steps);
    expect(replay.steps).not.toBe(record.game!.steps);
    expect(() => replayOf({ ...record, game: null })).toThrow('sem partida');
  });

  it('o ABANDONED, sem GAME_OVER no motor, também manda', async () => {
    const { h, p1 } = await Harness.fromState(setup({}));
    const record = h.core.record!;
    record.agenda = record.agenda.map((item) => (item.kind === 'hardExpiry' ? { ...item, at: h.now } : item));
    h.apply(h.core.onAlarm(h.sockets, h.now));
    expect(record.game!.state.phase.kind).not.toBe('GAME_OVER');
    const message = p1.inbox.at(-1) as ReplayMessage;
    expect(message).toMatchObject({ t: 'replay', gameNo: 1 });
    const room = p1.inbox.at(-2) as RoomMessage;
    expect(room.outcome).toMatchObject({ cause: 'ABANDONED' });
  });
});

/** O Equipar legal de `seat` na largada, para os testes que precisam de pelo menos um passo antes do fim. */
function legalFirst(h: Harness, seat: 'p1' | 'p2'): PlayerAction {
  const equip = legalActions(viewFor(h.core.record!.game!.state, seat)).find((action) => action.type === 'EQUIP');
  if (!equip) throw new Error(`${seat} não tem Equipar legal na largada`);
  return equip as PlayerAction;
}

/** O primeiro `replay` que o socket recebeu. */
function firstReplay(socket: FakeSocket): ReplayMessage {
  const [first] = replaysOf(socket);
  if (!first) throw new Error(`${socket.id} não recebeu replay`);
  return first;
}
