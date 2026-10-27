import { applyAction, createGame, legalActions, viewEvents, viewFor } from '@coringa/engine';
import type { GameState } from '@coringa/engine';
import type { ClientMessage, PlayerAction } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { setup } from '@coringa/engine/testing';
import { autoSteps, commitStep, finishGame } from '../../src/core/game.ts';
import { phaseKey } from '../../src/core/epoch.ts';
import { ROOM_LIMITS, TIMERS } from '../../src/core/timers.ts';
import { CODE, Harness } from './harness.ts';

/** Fase de Equipar da rodada 1, cada um com duas numéricas pendentes. */
function equipState(): GameState {
  return setup({
    round: 1,
    roundKind: 'EQUIP',
    phase: { kind: 'EQUIP' },
    p1: { pending: [3, 4] },
    p2: { pending: [5, 6] },
  });
}

const EQUIP_P1: PlayerAction = { type: 'EQUIP', destinations: ['ATK', 'DEF'] };
const EQUIP_P2: PlayerAction = { type: 'EQUIP', destinations: ['DEF', 'ATK'] };

describe('act', () => {
  it('act válido: state para os dois com a própria visão e os eventos redigidos; depois o ack', async () => {
    const { h, p1, p2 } = await Harness.playing();
    const rec = h.core.record!;
    const action = legalActions(viewFor(rec.game!.state, 'p1')).find((a) => a.type === 'EQUIP')!;
    await h.send(p1, { t: 'act', id: 'a1', epoch: rec.epoch, action: action as PlayerAction });
    const last1 = p1.inbox.slice(-2);
    expect(last1.map((m) => m.t)).toEqual(['state', 'ack']);
    expect(last1[1]).toEqual({ t: 'ack', id: 'a1', ok: true, seq: 2 });
    const st2 = h.messages(p2, 'state').at(-1)!;
    expect(st2.events).toEqual(viewEvents(h.lastStepEvents(), 'p2'));
    expect(st2.view).toEqual(viewFor(h.core.record!.game!.state, 'p2'));
    expect(h.persisted).toBeGreaterThan(0);
  });

  it('ordem de recusa: NOT_PLAYING, STALE_EPOCH, erro do motor só para quem jogou, nada gravado', async () => {
    // 1. Sem partida (lobby) → NOT_PLAYING, mesmo com a época errada.
    const lobby = await Harness.lobby();
    await lobby.h.send(lobby.p1, { t: 'act', id: 'x', epoch: 99, action: { type: 'PASS' } });
    expect(lobby.p1.inbox.at(-1)).toMatchObject({ t: 'ack', id: 'x', ok: false, code: 'NOT_PLAYING' });

    // 2. Em PLAYING: época velha vence o erro do motor (PASS fora de reação seria WRONG_PHASE).
    const { h, p1, p2 } = await Harness.fromState(equipState());
    const rec = h.core.record!;
    const snapshot = (): string => JSON.stringify([rec.seq, rec.epoch, rec.game]);
    const before = snapshot();
    const persisted = h.persisted;
    const inbox2 = p2.inbox.length;
    await h.send(p1, { t: 'act', id: 'a1', epoch: rec.epoch - 1, action: { type: 'PASS' } });
    expect(p1.inbox.at(-1)).toMatchObject({ t: 'ack', id: 'a1', ok: false, code: 'STALE_EPOCH' });

    // 3. Época certa: o erro do motor vai só para quem jogou.
    await h.send(p1, { t: 'act', id: 'a2', epoch: rec.epoch, action: { type: 'PASS' } });
    expect(p1.inbox.at(-1)).toMatchObject({ t: 'ack', id: 'a2', ok: false, code: 'WRONG_PHASE' });

    expect(snapshot()).toBe(before);
    expect(h.persisted).toBe(persisted);
    expect(p2.inbox).toHaveLength(inbox2);
    expect(p1.inbox.filter((m) => m.t === 'state')).toHaveLength(0);

    // 4. Partida acabada → NOT_PLAYING com id novo.
    await h.send(p1, { t: 'concede', id: 'c1' });
    await h.send(p1, { t: 'act', id: 'a3', epoch: rec.epoch, action: { type: 'PASS' } });
    expect(p1.inbox.at(-1)).toMatchObject({ t: 'ack', id: 'a3', ok: false, code: 'NOT_PLAYING' });
  });

  it('confirmação do Equipar de um não invalida a do outro (mesma época)', async () => {
    const { h, p1, p2 } = await Harness.fromState(equipState());
    const rec = h.core.record!;
    const epoch = rec.epoch;
    await h.send(p1, { t: 'act', id: 'e1', epoch, action: EQUIP_P1 });
    expect(rec.epoch).toBe(epoch);
    await h.send(p2, { t: 'act', id: 'e2', epoch, action: EQUIP_P2 });
    expect(p1.inbox.find((m) => m.t === 'ack' && m.id === 'e1')).toMatchObject({ ok: true, seq: 2 });
    expect(p2.inbox.at(-1)).toEqual({ t: 'ack', id: 'e2', ok: true, seq: 3 });
    // O segundo Equipar fechou a rodada: a fase seguinte tem época nova.
    expect(rec.epoch).toBe(epoch + 1);
    expect(rec.game!.steps.map((s) => s.player)).toEqual(['p1', 'p2']);
  });

  it('a jogada enviada antes de uma reação é recusada depois dela; a época sobe ao abrir e ao fechar a janela', async () => {
    const state = setup({ p1: { hand: ['K'] } });
    const kId = state.players[0].hand[0]!.id;
    const { h, p1, p2 } = await Harness.fromState(state);
    const rec = h.core.record!;
    const epoch = rec.epoch;
    await h.send(p1, { t: 'act', id: 'k', epoch, action: { type: 'PLAY_K', cardIds: [kId] } });
    expect(p1.inbox.at(-1)).toMatchObject({ ok: true });
    expect(rec.epoch).toBe(epoch + 1);
    h.now += TIMERS.reactionMinMs; // o PASS só vale depois do piso da janela (Tarefa 7)
    await h.send(p2, { t: 'act', id: 'p', epoch: rec.epoch, action: { type: 'PASS' } });
    expect(p2.inbox.at(-1)).toMatchObject({ ok: true });
    expect(rec.epoch).toBe(epoch + 2);
    expect(rec.game!.state.phase).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    // Mesma fase de antes do K, mas a decisão do p1 foi tomada na época velha.
    await h.send(p1, { t: 'act', id: 'late', epoch, action: { type: 'END_TURN' } });
    expect(p1.inbox.at(-1)).toMatchObject({ ok: false, code: 'STALE_EPOCH' });
  });

  it('mesmo id duas vezes → o mesmo ack, aplicado uma vez (seq não sobe)', async () => {
    const { h, p1, p2 } = await Harness.fromState(equipState());
    const rec = h.core.record!;
    const act: ClientMessage = { t: 'act', id: 'dup', epoch: rec.epoch, action: EQUIP_P1 };
    await h.send(p1, act);
    const ack = p1.inbox.at(-1);
    expect(ack).toEqual({ t: 'ack', id: 'dup', ok: true, seq: 2 });
    const seq = rec.seq;
    const persisted = h.persisted;
    const inbox2 = p2.inbox.length;
    await h.send(p1, act);
    expect(p1.inbox.at(-1)).toEqual(ack);
    expect(rec.seq).toBe(seq);
    expect(rec.game!.steps).toHaveLength(1);
    expect(p2.inbox).toHaveLength(inbox2);
    expect(h.persisted).toBe(persisted);
  });

  it('o mesmo id vale depois do fim da partida: reenvia o ack guardado', async () => {
    const { h, p1 } = await Harness.fromState(equipState());
    await h.send(p1, { t: 'act', id: 'm1', epoch: 1, action: EQUIP_P1 });
    const ack = p1.inbox.at(-1);
    await h.send(p1, { t: 'concede', id: 'c1' });
    await h.send(p1, { t: 'act', id: 'm1', epoch: 1, action: EQUIP_P1 });
    expect(p1.inbox.at(-1)).toEqual(ack);
  });

  it('guarda só os 64 últimos acks de cada jogador', async () => {
    const { h, p1 } = await Harness.fromState(setup({ p1: { hand: ['J', 'J'] } }));
    const rec = h.core.record!;
    const state = rec.game!.state;
    const cardId = state.players[0].hand[0]!.id;
    // Uma jogada boa e muitas repetições recusadas não enchem o histórico; só os acks ok entram.
    await h.send(p1, { t: 'act', id: 'ok', epoch: rec.epoch, action: { type: 'PLAY_J', cardId } });
    for (let i = 0; i < 3; i += 1) {
      h.now += 1_000;
      await h.send(p1, { t: 'act', id: `r${i}`, epoch: rec.epoch, action: { type: 'PLAY_J', cardId } });
    }
    expect(rec.game!.acks.p1.map((a) => a.id)).toEqual(['ok']);
    // Enche o histórico por fora e confere o corte.
    rec.game!.acks.p1 = Array.from({ length: ROOM_LIMITS.ackHistory }, (_, i) => ({ t: 'ack', id: `h${i}`, ok: true }));
    const state2 = rec.game!.state;
    const second = state2.players[0].hand[0]!.id;
    h.now += 1_000;
    await h.send(p1, { t: 'act', id: 'novo', epoch: rec.epoch, action: { type: 'PLAY_J', cardId: second } });
    expect(rec.game!.acks.p1).toHaveLength(ROOM_LIMITS.ackHistory);
    expect(rec.game!.acks.p1[0]!.id).toBe('h1');
    expect(rec.game!.acks.p1.at(-1)!.id).toBe('novo');
  });

  it('clique duplo: dois ids, mesma jogada → o segundo recebe o erro do motor', async () => {
    const state = setup({ p1: { hand: ['J'] } });
    const cardId = state.players[0].hand[0]!.id;
    const { h, p1 } = await Harness.fromState(state);
    const epoch = h.core.record!.epoch;
    await h.send(p1, { t: 'act', id: 'a1', epoch, action: { type: 'PLAY_J', cardId } });
    await h.send(p1, { t: 'act', id: 'a2', epoch, action: { type: 'PLAY_J', cardId } });
    expect(p1.inbox.filter((m) => m.t === 'ack')).toEqual([
      { t: 'ack', id: 'a1', ok: true, seq: 2 },
      { t: 'ack', id: 'a2', ok: false, code: 'CARD_NOT_IN_HAND', message: expect.any(String) },
    ]);
    expect(h.core.record!.game!.steps).toHaveLength(1);
  });
});

describe('Equipar automático', () => {
  it('quem recebeu zero numéricas tem o Equipar aplicado em seu nome, em passo próprio e sem zerar estouros', async () => {
    const state = setup({
      round: 1,
      roundKind: 'EQUIP',
      phase: { kind: 'EQUIP' },
      p1: { pending: [3, 4] },
      p2: { pending: [] },
    });
    const { h } = await Harness.fromState(state);
    const rec = h.core.record!;
    rec.game!.strikes.p2 = 2;

    const steps = autoSteps(rec, h.now);
    expect(steps).toHaveLength(1);
    expect(steps[0]).toMatchObject({ seq: 2, events: [{ type: 'EquipSubmitted', player: 'p2' }] });
    expect(rec.game!.steps).toEqual([{ player: 'p2', action: { type: 'EQUIP', destinations: [] } }]);
    expect(rec.game!.strikes).toEqual({ p1: 0, p2: 2 });
    expect(autoSteps(rec, h.now)).toEqual([]);

    // Pela jogada de p1: o passo dele, o automático de p2 (que fecha a rodada) e o ack só do primeiro.
    const second = await Harness.fromState(state);
    const r2 = second.h.core.record!;
    await second.h.send(second.p1, { t: 'act', id: 'e1', epoch: r2.epoch, action: EQUIP_P1 });
    const seqs = second.h.messages(second.p2, 'state').map((m) => m.seq);
    expect(seqs).toEqual([2, 3]);
    expect(second.p1.inbox.slice(-3).map((m) => m.t)).toEqual(['state', 'state', 'ack']);
    expect(second.p1.inbox.at(-1)).toEqual({ t: 'ack', id: 'e1', ok: true, seq: 2 });
    expect(r2.seq).toBe(3);
    expect(r2.game!.steps.map((s) => s.player)).toEqual(['p1', 'p2']);
    expect(r2.game!.recent.map((s) => s.seq)).toEqual([1, 2, 3]);
  });

  it('a partida já começa com o passo automático quando alguém recebe só figuras (semente s33: p2 sem numéricas)', async () => {
    // A semente muda quando o baralho muda (era s29 antes dos 8 Ás do sub-projeto 5).
    const { h, p1, p2 } = await Harness.playing(undefined, 's33');
    const rec = h.core.record!;
    expect(rec.seq).toBe(2);
    expect(rec.game!.steps).toEqual([{ player: 'p2', action: { type: 'EQUIP', destinations: [] } }]);
    expect(rec.game!.strikes).toEqual({ p1: 0, p2: 0 });
    for (const sock of [p1, p2]) {
      expect(sock.inbox.slice(-3).map((m) => m.t)).toEqual(['room', 'state', 'state']);
      expect(h.messages(sock, 'state').map((m) => m.seq)).toEqual([1, 2]);
    }
    expect(h.messages(p1, 'state')[1]!.events).toEqual(viewEvents([{ type: 'EquipSubmitted', player: 'p2' }], 'p1'));
    expect(h.messages(p1, 'state')[1]!.view.opponent.equipSubmitted).toBe(true);
    expect(rec.game!.recent.map((r) => r.seq)).toEqual([1, 2]);
  });
});

describe('commitStep', () => {
  it('o anel de passos recentes guarda só os 50 últimos', async () => {
    const state = setup({});
    const { h } = await Harness.fromState(state);
    const rec = h.core.record!;
    const key = phaseKey(rec.game!.state);
    for (let i = 0; i < 60; i += 1) {
      commitStep(rec, 'p1', { type: 'END_TURN' }, { state: structuredClone(rec.game!.state), events: [] }, h.now);
    }
    expect(rec.seq).toBe(61);
    expect(rec.game!.recent).toHaveLength(ROOM_LIMITS.recentSteps);
    expect(rec.game!.recent[0]!.seq).toBe(12);
    expect(rec.game!.recent.at(-1)!.seq).toBe(61);
    expect(rec.game!.steps).toHaveLength(60);
    expect(rec.epoch).toBe(1);
    expect(phaseKey(rec.game!.state)).toBe(key);
  });

  it('jogada voluntária de um jogador zera os estouros dele; a do sistema não', async () => {
    const { h } = await Harness.fromState(setup({}));
    const rec = h.core.record!;
    rec.game!.strikes = { p1: 2, p2: 2 };
    const same = (): { state: GameState; events: [] } => ({ state: structuredClone(rec.game!.state), events: [] });
    commitStep(rec, 'system', { type: 'TIMEOUT' }, same(), h.now);
    expect(rec.game!.strikes).toEqual({ p1: 2, p2: 2 });
    commitStep(rec, 'p1', { type: 'END_TURN' }, same(), h.now);
    expect(rec.game!.strikes).toEqual({ p1: 0, p2: 2 });
  });
});

describe('fim de partida', () => {
  it('FINISHED, placar, outcome NORMAL, logs game.ended e game.replay reexecutável', async () => {
    const { h, p1, p2 } = await Harness.playing();
    await h.playToEnd();
    const rec = h.core.record!;
    const game = rec.game!;
    expect(rec.status).toBe('FINISHED');
    const phase = game.state.phase;
    if (phase.kind !== 'GAME_OVER') throw new Error('a fase devia ser GAME_OVER');
    expect(rec.outcome).toEqual({ gameNo: 1, result: phase.result, cause: 'NORMAL', durationMs: expect.any(Number) });
    expect(game.cause).toBe('NORMAL');
    if (phase.result.kind === 'WIN') {
      expect(rec.score).toEqual({ p1: phase.result.winner === 'p1' ? 1 : 0, p2: phase.result.winner === 'p2' ? 1 : 0, draws: 0 });
    } else {
      expect(rec.score).toEqual({ p1: 0, p2: 0, draws: 1 });
    }

    const ended = h.logs.filter((l) => l.evt === 'game.ended');
    expect(ended).toEqual([
      {
        evt: 'game.ended',
        code: CODE,
        gameNo: 1,
        result: phase.result,
        cause: 'NORMAL',
        rounds: game.state.round,
        durationMs: h.now - game.startedAt,
        steps: game.steps.length,
      },
    ]);
    const replayLogs = h.logs.filter((l) => l.evt === 'game.replay');
    expect(replayLogs).toHaveLength(1);
    const replay = replayLogs[0]!.evt === 'game.replay' ? replayLogs[0]!.replay : null;
    expect(replay).toMatchObject({ name: `sala-${CODE}-1`, seed: game.seed, players: ['p1', 'p2'] });
    expect(replay!.steps).toEqual(game.steps);

    // Reexecutar com o motor dá o mesmo estado final.
    const created = createGame(replay!.config, replay!.seed, replay!.players);
    if (!created.ok) throw new Error('createGame falhou');
    let state = created.state;
    for (const step of replay!.steps) {
      const result = applyAction(state, step.player, step.action);
      if (!result.ok) throw new Error(`replay quebrou: ${result.error.code}`);
      state = result.state;
    }
    expect(state).toEqual(game.state);

    // Os dois recebem o `room` final, com o desfecho, e depois o `replay`: a semente só aparece nele (spec 2 §8.4).
    for (const sock of [p1, p2]) {
      expect(h.messages(sock, 'room').at(-1)).toMatchObject({ status: 'FINISHED', outcome: rec.outcome, score: rec.score });
      expect(sock.inbox.slice(-2).map((m) => m.t)).toEqual(['room', 'replay']);
      expect(sock.inbox.at(-1)).toEqual({ t: 'replay', gameNo: 1, replay });
      expect(sock.inbox.filter((m) => JSON.stringify(m).includes(game.seed)).map((m) => m.t)).toEqual(['replay']);
    }
    expect(game.phaseDeadlineAt).toBeNull();
  });

  it('o passo que acaba a partida manda state, ack, o room FINISHED e depois o replay', async () => {
    const state = setup({ p1: { attack: [9] }, p2: { hp: 1 } });
    const { h, p1, p2 } = await Harness.fromState(state);
    const rec = h.core.record!;
    await h.send(p1, { t: 'act', id: 'atk', epoch: rec.epoch, action: { type: 'DECLARE_ATTACK' } });
    h.now += TIMERS.reactionMinMs;
    await h.send(p2, { t: 'act', id: 'pass', epoch: rec.epoch, action: { type: 'PASS' } });
    expect(rec.status).toBe('FINISHED');
    expect(rec.outcome).toMatchObject({ cause: 'NORMAL', result: { kind: 'WIN', winner: 'p1', reason: 'HP' } });
    expect(rec.score.p1).toBe(1);
    expect(p2.inbox.slice(-4).map((m) => m.t)).toEqual(['state', 'ack', 'room', 'replay']);
    expect(p1.inbox.slice(-3).map((m) => m.t)).toEqual(['state', 'room', 'replay']);
  });

  it('finishGame: empate soma em draws, vitória do p2 soma ao p2, ABANDONED não mexe no placar', async () => {
    const draw = await Harness.fromState(setup({ phase: { kind: 'GAME_OVER', result: { kind: 'DRAW', reason: 'ANTI_STALL' } } }));
    const rec = draw.h.core.record!;
    rec.agenda.push({ kind: 'phase', at: 5, epoch: 1 }, { kind: 'reconnect', at: 6, seat: 'p1', gameNo: 1 });
    const logs = finishGame(rec, 'NORMAL', draw.h.now + 5_000);
    expect(rec).toMatchObject({ status: 'FINISHED', score: { p1: 0, p2: 0, draws: 1 } });
    expect(rec.outcome).toEqual({ gameNo: 1, result: { kind: 'DRAW', reason: 'ANTI_STALL' }, cause: 'NORMAL', durationMs: expect.any(Number) });
    expect(logs.map((l) => l.evt)).toEqual(['game.ended', 'game.replay']);
    expect(logs[0]).toMatchObject({ durationMs: 5_000, steps: 0, rounds: 3 });
    // Os dois estão conectados (o `hello` tira o `idleExpiry`): sobra só o teto.
    expect(rec.agenda.map((item) => item.kind)).toEqual(['hardExpiry']);

    const win2 = await Harness.fromState(
      setup({ phase: { kind: 'GAME_OVER', result: { kind: 'WIN', winner: 'p2', reason: 'HP' } } }),
    );
    finishGame(win2.h.core.record!, 'AFK', win2.h.now);
    expect(win2.h.core.record!.score).toEqual({ p1: 0, p2: 1, draws: 0 });
    expect(win2.h.core.record!.outcome).toMatchObject({ cause: 'AFK' });

    const abandoned = await Harness.fromState(setup({}));
    const rec3 = abandoned.h.core.record!;
    const logs3 = finishGame(rec3, 'ABANDONED', abandoned.h.now);
    expect(rec3.score).toEqual({ p1: 0, p2: 0, draws: 0 });
    expect(rec3.outcome).toEqual({ gameNo: 1, result: null, cause: 'ABANDONED', durationMs: expect.any(Number) });
    expect(rec3.status).toBe('FINISHED');
    expect(logs3[0]).toMatchObject({ evt: 'game.ended', result: null, cause: 'ABANDONED' });
    expect(logs3[1]).toMatchObject({ evt: 'game.replay', gameNo: 1 });
  });

  it('finishGame recusa terminar sem GAME_OVER quando a causa não é ABANDONED', async () => {
    const { h } = await Harness.fromState(setup({}));
    expect(() => finishGame(h.core.record!, 'NORMAL', h.now)).toThrow();
  });
});

describe('desistência', () => {
  it('FORFEIT do próprio jogador, causa CONCEDE, vitória do outro', async () => {
    const { h, p1, p2 } = await Harness.playing();
    const rec = h.core.record!;
    await h.send(p2, { t: 'concede', id: 'c1' });
    expect(rec.status).toBe('FINISHED');
    expect(rec.outcome).toEqual({ gameNo: 1, result: { kind: 'WIN', winner: 'p1', reason: 'FORFEIT' }, cause: 'CONCEDE', durationMs: expect.any(Number) });
    expect(rec.score).toEqual({ p1: 1, p2: 0, draws: 0 });
    expect(rec.game!.steps.at(-1)).toEqual({ player: 'system', action: { type: 'FORFEIT', loser: 'p2' } });
    expect(p2.inbox.at(-4)).toMatchObject({ t: 'state' });
    expect(p2.inbox.slice(-4).map((m) => m.t)).toEqual(['state', 'ack', 'room', 'replay']);
    expect(p2.inbox.at(-3)).toEqual({ t: 'ack', id: 'c1', ok: true, seq: rec.seq });
    expect(h.messages(p1, 'state').at(-1)!.view.phase).toMatchObject({ kind: 'GAME_OVER' });
    expect(h.logs).toContainEqual(expect.objectContaining({ evt: 'game.ended', cause: 'CONCEDE' }));
    expect(h.logs.filter((l) => l.evt === 'game.replay')).toHaveLength(1);

    // Repetido → mesmo ack, sem reaplicar; id novo → NOT_PLAYING.
    const seq = rec.seq;
    await h.send(p2, { t: 'concede', id: 'c1' });
    expect(p2.inbox.at(-1)).toEqual({ t: 'ack', id: 'c1', ok: true, seq });
    await h.send(p2, { t: 'concede', id: 'c2' });
    expect(p2.inbox.at(-1)).toMatchObject({ ok: false, code: 'NOT_PLAYING' });
    expect(rec.seq).toBe(seq);
    expect(rec.score).toEqual({ p1: 1, p2: 0, draws: 0 });
  });
});

describe('revanche', () => {
  async function finished(): Promise<Awaited<ReturnType<typeof Harness.playing>>> {
    const room = await Harness.playing();
    await room.h.send(room.p2, { t: 'concede', id: 'c1' });
    return room;
  }

  it('só com os dois pedindo e conectados; semente nova; gameNo 2; placar mantido', async () => {
    const { h, p1, p2 } = await finished();
    const rec = h.core.record!;
    const seqBefore = rec.seq;
    const epochBefore = rec.epoch;
    const firstSeed = rec.game!.seed;

    await h.send(p1, { t: 'rematch', want: true });
    expect(rec.status).toBe('FINISHED');
    expect(rec.seats[0]!.wantsRematch).toBe(true);
    expect(h.messages(p2, 'room').at(-1)!.seats[0]).toMatchObject({ playerId: 'p1', wantsRematch: true });
    expect(p1.inbox.at(-1)!.t).toBe('room');

    // Retirar o pedido volta atrás.
    await h.send(p1, { t: 'rematch', want: false });
    expect(rec.seats[0]!.wantsRematch).toBe(false);
    await h.send(p2, { t: 'rematch', want: true });
    expect(rec.status).toBe('FINISHED');
    await h.send(p1, { t: 'rematch', want: true });

    expect(rec).toMatchObject({ status: 'PLAYING', gameNo: 2, outcome: null, score: { p1: 1, p2: 0, draws: 0 } });
    expect(rec.game!.seed).not.toBe(firstSeed);
    expect(rec.game!.seed).toBe('semente-2');
    expect(rec.seq).toBeGreaterThan(seqBefore);
    expect(rec.epoch).toBeGreaterThan(epochBefore);
    expect(rec.seats.every((s) => !s.wantsRematch && !s.ready)).toBe(true);
    expect(h.logs.filter((l) => l.evt === 'game.started')).toEqual([
      { evt: 'game.started', code: CODE, gameNo: 1 },
      { evt: 'game.started', code: CODE, gameNo: 2 },
    ]);
    // `room` (já PLAYING) antes do `state` de largada, que leva a visão nova.
    expect(p1.inbox.slice(-2).map((m) => m.t)).toEqual(['room', 'state']);
    expect(h.messages(p2, 'state').at(-1)!.view).toEqual(viewFor(rec.game!.state, 'p2'));
    expect(h.messages(p2, 'room').at(-1)).toMatchObject({ status: 'PLAYING', gameNo: 2 });
  });

  it('não começa com o outro desconectado, nem se o pedido de quem saiu ficou guardado', async () => {
    const { h, p1, p2 } = await finished();
    const rec = h.core.record!;
    await h.send(p1, { t: 'rematch', want: true });
    h.close(p1);
    await h.send(p2, { t: 'rematch', want: true });
    expect(rec.status).toBe('FINISHED');
    expect(h.messages(p2, 'room').at(-1)!.seats[0]).toMatchObject({ connected: false, wantsRematch: true });
  });

  it('socket sem sinal há mais de 45 s no pedido de revanche: cai com 4008, perde o pedido e a partida não larga', async () => {
    const { h, p1, p2 } = await finished();
    const rec = h.core.record!;
    await h.send(p1, { t: 'rematch', want: true });
    h.silent(p1);
    h.now += TIMERS.silentDropMs + 1_000;
    p2.lastSeenAt = h.now;
    await h.send(p2, { t: 'rematch', want: true });
    expect(rec.status).toBe('FINISHED');
    expect(p1.closed).toEqual({ code: 4008, reason: 'sem sinal' });
    expect(rec.seats.map((seat) => seat.wantsRematch)).toEqual([false, true]);
    expect(rec.seats[0]!.offlineSince).toBe(h.now);
    expect(h.messages(p2, 'room').at(-1)!.seats).toMatchObject([{ connected: false, wantsRematch: false }, { wantsRematch: true }]);
    expect(rec.gameNo).toBe(1);
  });

  it('pedido guardado na queda: A pede, A cai, B pede e A volta → a revanche larga no hello de A', async () => {
    const { h, p1, p2, tokens } = await finished();
    const rec = h.core.record!;
    const firstSeed = rec.game!.seed;
    await h.send(p1, { t: 'rematch', want: true });
    h.close(p1);
    expect(rec.seats[0]!.wantsRematch).toBe(true);
    await h.send(p2, { t: 'rematch', want: true });
    expect(rec.status).toBe('FINISHED');

    const back = h.open();
    await h.send(back, h.hello(tokens.p1));
    expect(rec).toMatchObject({ status: 'PLAYING', gameNo: 2, outcome: null, score: { p1: 1, p2: 0, draws: 0 } });
    expect(rec.game!.seed).not.toBe(firstSeed);
    expect(rec.seats.every((seat) => !seat.wantsRematch)).toBe(true);
    expect(back.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state']);
    expect(h.messages(back, 'state')[0]!.view).toEqual(viewFor(rec.game!.state, 'p1'));
    expect(h.messages(back, 'state')[0]!.resync).toBeUndefined();
    expect(p2.inbox.slice(-2).map((m) => m.t)).toEqual(['room', 'state']);
    expect(h.logs.filter((l) => l.evt === 'game.started')).toHaveLength(2);
  });

  it('hello em FINISHED sem os dois pedidos só manda o retrato; com sinal velho do outro, derruba o outro', async () => {
    const { h, p1, p2, tokens } = await finished();
    const rec = h.core.record!;
    h.close(p1);
    const back = h.open();
    await h.send(back, h.hello(tokens.p1));
    expect(rec.status).toBe('FINISHED');
    expect(back.inbox.map((m) => m.t)).toEqual(['welcome', 'room', 'state', 'replay']);
    expect(h.messages(back, 'state')[0]!.resync).toBe(true);

    // Os dois pedem; p2 fica mudo por mais de 45 s e p1 volta: p2 cai com 4008 e nada larga.
    await h.send(back, { t: 'rematch', want: true });
    rec.seats[1]!.wantsRematch = true;
    h.silent(p2);
    h.now += TIMERS.silentDropMs + 1_000;
    back.lastSeenAt = h.now;
    h.close(back);
    const again = h.open();
    await h.send(again, h.hello(tokens.p1));
    expect(rec.status).toBe('FINISHED');
    expect(p2.closed).toEqual({ code: 4008, reason: 'sem sinal' });
    expect(rec.seats[1]!.wantsRematch).toBe(false);
  });

  it('revanche fora de FINISHED → WRONG_STATUS', async () => {
    const { h, p1 } = await Harness.playing();
    await h.send(p1, { t: 'rematch', want: true });
    expect(p1.inbox.at(-1)).toMatchObject({ t: 'error', code: 'WRONG_STATUS' });
  });

  it('a partida seguinte também joga: o placar soma por cima do anterior', async () => {
    const { h, p1, p2 } = await finished();
    await h.send(p1, { t: 'rematch', want: true });
    await h.send(p2, { t: 'rematch', want: true });
    await h.send(p1, { t: 'concede', id: 'c-2' });
    const rec = h.core.record!;
    expect(rec.score).toEqual({ p1: 1, p2: 1, draws: 0 });
    expect(rec.outcome).toMatchObject({ gameNo: 2, cause: 'CONCEDE' });
    expect(h.logs.filter((l) => l.evt === 'game.replay').map((l) => (l.evt === 'game.replay' ? l.replay.name : ''))).toEqual([
      `sala-${CODE}-1`,
      `sala-${CODE}-2`,
    ]);
  });
});
