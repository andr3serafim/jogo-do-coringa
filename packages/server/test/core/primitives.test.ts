import { describe, expect, it } from 'vitest';
import { act, handId, setup } from '../../../engine/test/helpers.ts';
import { dueItems, nextAlarm, withItem, withoutKinds } from '../../src/core/agenda.ts';
import { emptyEffects, mergeEffects } from '../../src/core/effects.ts';
import { phaseKey } from '../../src/core/epoch.ts';
import { TokenBucket } from '../../src/core/limiter.ts';
import { joinRecord, splitRecord, STORAGE_KEYS } from '../../src/core/storage-layout.ts';
import { ROOM_LIMITS, STATE_SCHEMA, TIMERS } from '../../src/core/timers.ts';
import { base64url, hex, sha256Hex } from '../../src/core/tokens.ts';
import type { AgendaItem, GameRecord, ReplayStep, RoomRecord, StepRecord } from '../../src/core/types.ts';

describe('agenda', () => {
  it('próximo alarme e vencidos em ordem', () => {
    const a = [
      { kind: 'hardExpiry', at: 90 },
      { kind: 'phase', at: 10, epoch: 1 },
      { kind: 'reconnect', at: 10, seat: 'p2', gameNo: 1 },
    ] as AgendaItem[];
    expect(nextAlarm(a)).toBe(10);
    expect(dueItems(a, 10).map((i) => i.kind)).toEqual(['phase', 'reconnect']);
    expect(dueItems(a, 9)).toEqual([]);
    expect(nextAlarm([])).toBeNull();
    expect(withItem(a, { kind: 'phase', at: 20, epoch: 2 }).filter((i) => i.kind === 'phase')).toEqual([
      { kind: 'phase', at: 20, epoch: 2 },
    ]);
    expect(
      withItem(a, { kind: 'reconnect', at: 5, seat: 'p1', gameNo: 1 }).filter((i) => i.kind === 'reconnect'),
    ).toHaveLength(2);
  });

  it('withItem substitui o reconnect do mesmo assento e os demais tipos únicos', () => {
    const a: AgendaItem[] = [
      { kind: 'reconnect', at: 7, seat: 'p2', gameNo: 1 },
      { kind: 'reactionMin', at: 3, epoch: 1 },
      { kind: 'presenceSweep', at: 4, gameNo: 1 },
      { kind: 'idleExpiry', at: 5 },
      { kind: 'hardExpiry', at: 6 },
    ];
    const b = withItem(a, { kind: 'reconnect', at: 9, seat: 'p2', gameNo: 1 });
    expect(b.filter((i) => i.kind === 'reconnect')).toEqual([{ kind: 'reconnect', at: 9, seat: 'p2', gameNo: 1 }]);
    let c = withItem(b, { kind: 'reactionMin', at: 30, epoch: 2 });
    c = withItem(c, { kind: 'presenceSweep', at: 40, gameNo: 2 });
    c = withItem(c, { kind: 'idleExpiry', at: 50 });
    c = withItem(c, { kind: 'hardExpiry', at: 60 });
    expect(c).toHaveLength(5);
    expect(c.find((i) => i.kind === 'idleExpiry')?.at).toBe(50);
    expect(c.find((i) => i.kind === 'hardExpiry')?.at).toBe(60);
    expect(c.find((i) => i.kind === 'reactionMin')?.at).toBe(30);
    expect(c.find((i) => i.kind === 'presenceSweep')?.at).toBe(40);
    // não muta a entrada
    expect(a).toHaveLength(5);
    expect(a.find((i) => i.kind === 'idleExpiry')?.at).toBe(5);
  });

  it('dueItems: empate pela ordem de inserção', () => {
    const a: AgendaItem[] = [
      { kind: 'idleExpiry', at: 10 },
      { kind: 'hardExpiry', at: 10 },
      { kind: 'presenceSweep', at: 5, gameNo: 1 },
    ];
    expect(dueItems(a, 10).map((i) => i.kind)).toEqual(['presenceSweep', 'idleExpiry', 'hardExpiry']);
  });

  it('withoutKinds remove por tipo e, com assento, só o reconnect dele', () => {
    const a: AgendaItem[] = [
      { kind: 'phase', at: 1, epoch: 1 },
      { kind: 'reactionMin', at: 2, epoch: 1 },
      { kind: 'reconnect', at: 3, seat: 'p1', gameNo: 1 },
      { kind: 'reconnect', at: 4, seat: 'p2', gameNo: 1 },
    ];
    expect(withoutKinds(a, ['phase', 'reactionMin']).map((i) => i.kind)).toEqual(['reconnect', 'reconnect']);
    expect(withoutKinds(a, ['reconnect'], 'p1')).toEqual([
      { kind: 'phase', at: 1, epoch: 1 },
      { kind: 'reactionMin', at: 2, epoch: 1 },
      { kind: 'reconnect', at: 4, seat: 'p2', gameNo: 1 },
    ]);
    expect(withoutKinds(a, ['reconnect']).map((i) => i.kind)).toEqual(['phase', 'reactionMin']);
  });
});

describe('epoch', () => {
  it('phaseKey: confirmar o Equipar não muda; jogar K muda e a volta repete a chave de antes', () => {
    // Equipar com pendentes nos dois: confirmar o EQUIP de p1 não muda a chave (o jogo segue em EQUIP).
    const equip = setup({
      roundKind: 'EQUIP',
      phase: { kind: 'EQUIP' },
      p1: { pending: [2, 3] },
      p2: { pending: [4, 5] },
    });
    const keyAntes = phaseKey(equip);
    const depois = act(equip, 'p1', { type: 'EQUIP', destinations: ['ATK', 'DEF'] });
    expect(depois.state.phase.kind).toBe('EQUIP');
    expect(phaseKey(depois.state)).toBe(keyAntes);

    // ATTACK_MAIN p1 com K na mão: k0 → PLAY_K → k1 (REACTION p2) → PASS de p2 → k2 (ATTACK_MAIN p1).
    const s0 = setup({ p1: { hand: ['K'] } });
    const k0 = phaseKey(s0);
    const s1 = act(s0, 'p1', { type: 'PLAY_K', cardIds: [handId(s0, 'p1', 'K')] }).state;
    expect(s1.phase.kind).toBe('REACTION');
    const k1 = phaseKey(s1);
    const s2 = act(s1, 'p2', { type: 'PASS' }).state;
    expect(s2.phase).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    const k2 = phaseKey(s2);
    expect(k1).not.toBe(k0);
    expect(k2).not.toBe(k1);
    expect(k2).toBe(k0);
    expect(JSON.parse(k0)).toEqual([3, 'ATTACK_MAIN', 'p1', null]);
    expect(JSON.parse(k1)).toEqual([3, 'REACTION', 'p2', 'K_PLAYED']);
  });

  it('phaseKey: ORDER_CHOICE e GAME_OVER', () => {
    const order = setup({ phase: { kind: 'ORDER_CHOICE', player: 'p2' }, round: 2 });
    expect(JSON.parse(phaseKey(order))).toEqual([2, 'ORDER_CHOICE', 'p2', null]);
    const over = setup({ round: 7 });
    over.phase = { kind: 'GAME_OVER', result: { kind: 'DRAW', reason: 'ANTI_STALL' } };
    expect(phaseKey(over)).toBe(JSON.stringify([7, 'GAME_OVER', null, null]));
  });
});

describe('TokenBucket', () => {
  it('20 de uma vez, depois 10/s', () => {
    const b = new TokenBucket(20, 10, 0);
    expect(Array.from({ length: 21 }, () => b.take(0)).filter(Boolean)).toHaveLength(20);
    expect(b.take(99)).toBe(false);
    expect(b.take(100)).toBe(true); // 0,1 s → 1 ficha
  });

  it('não passa da capacidade e tolera relógio que anda para trás', () => {
    const b = new TokenBucket(2, 10, 1000);
    expect(b.take(1_000_000)).toBe(true);
    expect(b.take(1_000_000)).toBe(true);
    expect(b.take(1_000_000)).toBe(false);
    expect(b.take(500)).toBe(false);
  });
});

describe('tokens', () => {
  it('base64url de 32 bytes tem 43 caracteres; sha256Hex é o hash conhecido', async () => {
    expect(base64url(new Uint8Array(32).fill(255))).toHaveLength(43);
    expect(await sha256Hex('abc')).toBe('ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  });

  it('base64url usa -_ e não tem preenchimento; hex tem 2 dígitos por byte', () => {
    expect(base64url(new Uint8Array([251, 255, 254]))).toBe('-__-');
    expect(base64url(new Uint8Array([1]))).toBe('AQ');
    expect(base64url(new Uint8Array([]))).toBe('');
    expect(hex(new Uint8Array([0, 1, 15, 16, 255]))).toBe('00010f10ff');
  });
});

describe('effects', () => {
  it('emptyEffects e mergeEffects: concatena, OU e alarme de b', () => {
    expect(emptyEffects()).toEqual({
      send: [],
      close: [],
      attach: [],
      persist: false,
      alarm: null,
      deleteAll: false,
      logs: [],
    });
    const a = {
      ...emptyEffects(),
      send: [{ socketId: 's1', message: { t: 'error', code: 'BAD_MESSAGE', message: 'x' } as const }],
      persist: true,
      alarm: 10,
      logs: [{ evt: 'room.created', code: 'ABCDEF', playerId: 'p1' } as const],
    };
    const b = {
      ...emptyEffects(),
      close: [{ socketId: 's2', code: 1000, reason: 'ok' }],
      attach: [{ socketId: 's3', seat: 'p2' as const }],
      deleteAll: true,
      alarm: 20,
    };
    const m = mergeEffects(a, b);
    expect(m.send).toHaveLength(1);
    expect(m.close).toHaveLength(1);
    expect(m.attach).toEqual([{ socketId: 's3', seat: 'p2' }]);
    expect(m.persist).toBe(true);
    expect(m.deleteAll).toBe(true);
    expect(m.alarm).toBe(20);
    expect(m.logs).toHaveLength(1);
    expect(mergeEffects(a, emptyEffects()).alarm).toBeNull();
    expect(mergeEffects(emptyEffects(), emptyEffects()).persist).toBe(false);
  });
});

describe('constantes', () => {
  it('valores da spec', () => {
    expect(TIMERS.turnMs).toBe(30_000);
    expect(TIMERS.hardExpiryMs).toBe(86_400_000);
    expect(STATE_SCHEMA).toBe(1);
    expect(ROOM_LIMITS.recentSteps).toBe(50);
  });
});

function makeRecord(withGame: boolean, nSteps = 3, nRecent = 60): RoomRecord {
  const steps: ReplayStep[] = Array.from({ length: nSteps }, () => ({ player: 'p1', action: { type: 'PASS' } }));
  const recent: StepRecord[] = Array.from({ length: nRecent }, (_, i) => ({ seq: i + 1, events: [] }));
  const game: GameRecord = {
    gameNo: 1,
    seed: 'seed-x',
    state: setup(),
    startedAt: 1,
    steps,
    recent,
    phaseStartedAt: 2,
    phaseDeadlineAt: 3,
    pausedTurnMs: null,
    heldPass: null,
    strikes: { p1: 0, p2: 1 },
    acks: { p1: [], p2: [] },
    cause: null,
  };
  return {
    schema: STATE_SCHEMA,
    code: 'K7M2QX',
    createdAt: 0,
    status: withGame ? 'PLAYING' : 'LOBBY',
    seats: [
      { id: 'p1', nickname: 'Ana', tokenHash: 'h1', ready: true, wantsRematch: false, offlineSince: null },
      { id: 'p2', nickname: 'Beto', tokenHash: 'h2', ready: false, wantsRematch: false, offlineSince: 5 },
    ],
    score: { p1: 0, p2: 0, draws: 0 },
    gameNo: withGame ? 1 : 0,
    outcome: null,
    seq: 4,
    epoch: 2,
    game: withGame ? game : null,
    agenda: [{ kind: 'idleExpiry', at: 99 }],
  };
}

describe('storage-layout', () => {
  it('splitRecord e joinRecord vão e voltam iguais, com e sem partida; sem room → null', () => {
    const comPartida = makeRecord(true, 3, 40);
    expect(joinRecord(splitRecord(comPartida))).toEqual(comPartida);
    const lobby = makeRecord(false);
    expect(joinRecord(splitRecord(lobby))).toEqual(lobby);
    expect(joinRecord({})).toBeNull();
    expect(STORAGE_KEYS).toEqual(['room', 'game', 'recent', 'log']);
  });

  it('as chaves ficam limitadas: recent corta em 50 e room não carrega passos nem estado', () => {
    const r = makeRecord(true, 3, 60);
    const parts = splitRecord(r);
    expect(parts.recent).toHaveLength(ROOM_LIMITS.recentSteps);
    expect(parts.recent[0]?.seq).toBe(11); // os 50 mais recentes
    expect(parts.log).toEqual(r.game?.steps);
    expect(parts.room.hasGame).toBe(true);
    expect('game' in parts.room).toBe(false);
    expect(parts.game).not.toBeNull();
    expect(parts.game && 'steps' in parts.game).toBe(false);
    expect(parts.game && 'recent' in parts.game).toBe(false);
    const lobbyParts = splitRecord(makeRecord(false));
    expect(lobbyParts.game).toBeNull();
    expect(lobbyParts.recent).toEqual([]);
    expect(lobbyParts.log).toEqual([]);
    expect(lobbyParts.room.hasGame).toBe(false);
  });

  it('joinRecord recusa partida sem game ou sem log; recent faltando vira []; sem partida, game null', () => {
    const parts = splitRecord(makeRecord(true, 2, 2));
    expect(joinRecord({ room: parts.room, recent: parts.recent, log: parts.log })).toBeNull(); // sem game
    expect(joinRecord({ room: parts.room })).toBeNull();
    expect(joinRecord({ room: parts.room, game: parts.game, recent: parts.recent })).toBeNull(); // sem log
    const semRecent = joinRecord({ room: parts.room, game: parts.game, log: parts.log });
    expect(semRecent?.game?.recent).toEqual([]);
    expect(semRecent?.game?.steps).toEqual(parts.log);
    const lobby = splitRecord(makeRecord(false));
    expect(joinRecord({ room: lobby.room })?.game).toBeNull();
    expect(joinRecord({ room: lobby.room, game: parts.game })?.game).toBeNull();
  });
});
