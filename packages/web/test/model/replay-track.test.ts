import {
  applyAction,
  createGame,
  viewEvents,
  viewFor,
  type Action,
  type GameEvent,
  type GameResult,
  type GameState,
  type PlayerId,
  type Replay,
  type ReplayStep,
} from '@coringa/engine';
import type { RoomMessage } from '@coringa/protocol';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RESYNC_TEXT, roomNames } from '../../src/model/history.ts';
import { NO_MARKS } from '../../src/model/marks.ts';
import { buildTrack, diverges, frameMessage, replaySnapshot, trackResult, type ReplayTrack } from '../../src/model/replay-track.ts';
import { DEFAULT_PREFS } from '../../src/model/storage.ts';
import { realReplay, withStep } from '../fixtures.ts';

/** Faz o `applyAction` do motor lançar na `failAt`-ésima chamada (1 = a primeira), para o `catch` do `buildTrack`. Desligado, passa direto. */
const engineFault = vi.hoisted(() => ({ failAt: null as number | null, calls: 0 }));
vi.mock('@coringa/engine', async (importOriginal) => {
  const original = await importOriginal<typeof import('@coringa/engine')>();
  return {
    ...original,
    applyAction: (...args: Parameters<typeof original.applyAction>) => {
      if (engineFault.failAt !== null && ++engineFault.calls === engineFault.failAt) throw new Error('falha do motor');
      return original.applyAction(...args);
    },
  };
});

afterEach(() => {
  engineFault.failAt = null;
  engineFault.calls = 0;
});

const SEATS: [PlayerId, PlayerId] = ['p1', 'p2'];
const names = roomNames('p1', [
  { playerId: 'p1', nickname: 'Ana' },
  { playerId: 'p2', nickname: 'Duda' },
]);

const room = (gameNo: number): RoomMessage => ({
  t: 'room',
  code: 'TREINO',
  status: 'FINISHED',
  seats: [
    { playerId: 'p1', nickname: 'Ana', connected: true, ready: true, wantsRematch: false },
    { playerId: 'p2', nickname: 'Duda', connected: true, ready: true, wantsRematch: false },
  ],
  score: { p1: 0, p2: 0, draws: 0 },
  gameNo,
  expiresAt: 0,
});

/** O motor re-executado à parte: o estado e os eventos (sem redação) de cada quadro, para conferir a trilha. */
function reference(replay: Replay): { state: GameState; events: GameEvent[] }[] {
  const created = createGame(replay.config, replay.seed, replay.players);
  if (!created.ok) throw new Error(created.error.message);
  const out = [{ state: created.state, events: [] as GameEvent[] }];
  for (const step of replay.steps) {
    const result = applyAction(out[out.length - 1]!.state, step.player, step.action);
    if (!result.ok) throw new Error(result.error.message);
    out.push({ state: result.state, events: result.events });
  }
  return out;
}

const REPLAY = realReplay('trilha-1');
const STEPS = REPLAY.steps.length;
const TRACK = buildTrack(REPLAY, 'p1', names);

/** Um índice de passo que traz eventos (a trilha de verdade tem muitos). */
const EVENTFUL = TRACK.frames.findIndex((frame, i) => i > 0 && frame.state.events.length > 0);

describe('buildTrack: os quadros', () => {
  it('a partida de teste é de verdade: tem muitos passos e termina', () => {
    expect(STEPS).toBeGreaterThan(20);
    expect(EVENTFUL).toBeGreaterThan(0);
  });

  it('um quadro por passo mais o começo', () => {
    expect(TRACK.stoppedAt).toBeNull();
    expect(TRACK.frames).toHaveLength(STEPS + 1);
    const first = TRACK.frames[0]!;
    expect(first.state.events).toEqual([]);
    expect(first.state.resync).toBeUndefined();
    expect(first.state.catchUp).toBeUndefined();
    expect(first.round).toBe(first.state.view.round);
    TRACK.frames.forEach((frame, i) => {
      expect(frame.state).toMatchObject({ t: 'state', seq: i + 1, epoch: i, deadline: null, serverNow: 0 });
      expect(frame.round).toBe(frame.state.view.round);
    });
  });

  it('o último quadro é o fim da partida', () => {
    const last = TRACK.frames[STEPS]!;
    expect(last.state.view.phase.kind).toBe('GAME_OVER');
    expect(TRACK.frames.slice(0, STEPS).every((frame) => frame.state.view.phase.kind !== 'GAME_OVER')).toBe(true);
  });

  it('cada quadro é o que o motor dá ao re-executar o replay, visto do assento', () => {
    const ref = reference(REPLAY);
    ref.forEach(({ state, events }, i) => {
      expect(TRACK.frames[i]!.state.view).toEqual(viewFor(state, 'p1'));
      expect(TRACK.frames[i]!.state.events).toEqual(viewEvents(events, 'p1'));
    });
  });

  it('a vista é a do assento pedido (a mão do outro fica escondida)', () => {
    const ref = reference(REPLAY);
    for (const me of SEATS) {
      const other = me === 'p1' ? 'p2' : 'p1';
      const track = buildTrack(REPLAY, me, roomNames(me, []));
      let handsSeen = 0;
      track.frames.forEach((frame, i) => {
        const { view, events } = frame.state;
        expect(view.me).toBe(me);
        expect(view.self.hand).toEqual(ref[i]!.state.players.find((p) => p.id === me)!.hand);
        handsSeen += view.self.hand.length;
        expect(view.opponent.id).toBe(other);
        expect(view.opponent).not.toHaveProperty('hand');
        expect(view.opponent).not.toHaveProperty('pending');
        for (const event of events) {
          if (event.type === 'CardsDealt' && event.player === other) expect(event).not.toHaveProperty('cards');
        }
      });
      expect(handsSeen).toBeGreaterThan(0);
    }
    // O oponente compra nesta partida: o evento existe, com a contagem, para o assento oposto.
    const dealt = TRACK.frames.flatMap((frame) => frame.state.events).filter((e) => e.type === 'CardsDealt' && e.player === 'p2');
    expect(dealt.length).toBeGreaterThan(0);
    expect(dealt.every((e) => e.type === 'CardsDealt' && e.count > 0 && e.cards === undefined)).toBe(true);
  });

  it('um replay sem passos tem só o começo', () => {
    const track = buildTrack({ ...REPLAY, steps: [] }, 'p1', names);
    expect(track.stoppedAt).toBeNull();
    expect(track.frames).toHaveLength(1);
    expect(track.rounds).toEqual([{ round: 1, frame: 0 }]);
  });

  it('uma desistência (passo do sistema) fecha a trilha', () => {
    const cut = 12;
    const forfeit: ReplayStep = { player: 'system', action: { type: 'FORFEIT', loser: 'p1' } };
    const track = buildTrack({ ...REPLAY, steps: [...REPLAY.steps.slice(0, cut), forfeit] }, 'p1', names);
    expect(track.stoppedAt).toBeNull();
    expect(track.frames).toHaveLength(cut + 2);
    const last = track.frames[cut + 1]!.state;
    expect(last.view.phase).toMatchObject({ kind: 'GAME_OVER', result: { kind: 'WIN', winner: 'p2', reason: 'FORFEIT' } });
    expect(last.events.some((event) => event.type === 'GameOver')).toBe(true);
  });
});

describe('frameMessage', () => {
  it('um passo à frente traz os eventos do passo, como ao vivo', () => {
    const message = frameMessage(TRACK, EVENTFUL - 1, EVENTFUL);
    expect(message).toBe(TRACK.frames[EVENTFUL]!.state);
    expect(message.events.length).toBeGreaterThan(0);
    expect(message.resync).toBeUndefined();
    expect(message.seq).toBe(EVENTFUL + 1);
    expect(frameMessage(TRACK, 0, 1)).toBe(TRACK.frames[1]!.state);
  });

  it('voltar e saltar vêm em resync, sem eventos e com o mesmo estado', () => {
    for (const [from, to] of [
      [10, 9],
      [0, 10],
      [3, 15],
      [10, 10],
    ] as const) {
      const message = frameMessage(TRACK, from, to);
      const frame = TRACK.frames[to]!;
      expect(message).toEqual({ ...frame.state, events: [], resync: true });
      expect(message.view).toBe(frame.state.view);
      expect(message.seq).toBe(to + 1);
    }
    // O quadro guardado continua sendo o do passo (com os eventos e sem a marca).
    expect(TRACK.frames[10]!.state.events.length).toBeGreaterThan(0);
    expect(TRACK.frames[10]!.state.resync).toBeUndefined();
  });

  it('o mesmo salto devolve a mesma mensagem (o palco compara por identidade)', () => {
    expect(frameMessage(TRACK, 0, 9)).toBe(frameMessage(TRACK, 4, 9));
    expect(frameMessage(TRACK, 0, 9)).not.toBe(frameMessage(TRACK, 0, 10));
  });

  it('a sequência 5 → 6, 6 → 5, 5 → 6: mensagens vizinhas nunca são o mesmo objeto, e o avanço volta a trazer os eventos', () => {
    const forward = frameMessage(TRACK, 5, 6);
    const back = frameMessage(TRACK, 6, 5);
    const forwardAgain = frameMessage(TRACK, 5, 6);
    expect(back).not.toBe(forward);
    expect(forwardAgain).not.toBe(back);
    // O avanço é sempre o `state` do quadro: o palco o reconhece como novo depois do salto e refaz as batidas.
    expect(forwardAgain).toBe(forward);
    expect(forwardAgain.events).toEqual(TRACK.frames[6]!.state.events);
    expect(forwardAgain.resync).toBeUndefined();
    expect(back.resync).toBe(true);
    expect(back.events).toEqual([]);
  });

  it('um quadro fora da trilha é erro de quem chama', () => {
    expect(() => frameMessage(TRACK, 0, STEPS + 1)).toThrow(RangeError);
    expect(() => frameMessage(TRACK, 2, -1)).toThrow(RangeError);
  });
});

describe('o histórico do quadro', () => {
  it('abre com a rodada em que a partida está, sem eventos', () => {
    const { lines, lastSeq } = TRACK.frames[0]!.history;
    expect(lastSeq).toBe(1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toMatchObject({ seq: 1, kind: 'round' });
    expect(lines[0]!.text).toMatch(/^Rodada 1/);
  });

  it('tem as linhas até ali: cada quadro estende o anterior, no seq do próprio passo', () => {
    TRACK.frames.forEach((frame, i) => {
      expect(frame.history.lastSeq).toBe(i + 1);
      expect(frame.history.lines.every((line) => line.seq <= i + 1)).toBe(true);
      if (i === 0) return;
      const before = TRACK.frames[i - 1]!.history.lines;
      expect(frame.history.lines.slice(0, before.length)).toEqual(before);
      expect(frame.history.lines.slice(before.length).every((line) => line.seq === i + 1)).toBe(true);
    });
    const last = TRACK.frames[STEPS]!.history.lines;
    expect(last.length).toBeGreaterThan(TRACK.frames[0]!.history.lines.length);
    expect(last.filter((line) => line.kind === 'round')).toHaveLength(TRACK.rounds.length);
  });

  it('o quadro de um passo com eventos ganha as linhas deles', () => {
    const before = TRACK.frames[EVENTFUL - 1]!.history.lines.length;
    expect(TRACK.frames[EVENTFUL]!.history.lines.length).toBeGreaterThan(before);
  });

  it('nenhum quadro da trilha traz notas: não há reconexão num replay', () => {
    expect(TRACK.frames.every((frame) => frame.history.lines.every((line) => line.kind !== 'note'))).toBe(true);
  });
});

describe('rounds', () => {
  it('apontam para o primeiro quadro de cada rodada', () => {
    expect(TRACK.rounds[0]).toEqual({ round: 1, frame: 0 });
    TRACK.rounds.forEach(({ round, frame }, i) => {
      expect(TRACK.frames[frame]!.round).toBe(round);
      expect(TRACK.frames[frame - 1]?.round ?? 0).toBeLessThan(round);
      if (i > 0) {
        expect(round).toBeGreaterThan(TRACK.rounds[i - 1]!.round);
        expect(frame).toBeGreaterThan(TRACK.rounds[i - 1]!.frame);
      }
    });
    expect(TRACK.rounds.map((entry) => entry.round)).toEqual([...new Set(TRACK.frames.map((frame) => frame.round))]);
    expect(TRACK.rounds.length).toBeGreaterThan(2);
  });

  it('o quadro da rodada é o do passo que a começou (traz o RoundStarted)', () => {
    for (const { round, frame } of TRACK.rounds.slice(1)) {
      expect(TRACK.frames[frame]!.state.events).toContainEqual(expect.objectContaining({ type: 'RoundStarted', round }));
    }
  });
});

describe('buildTrack: o motor recusa ou falha', () => {
  const illegal = (replay: Replay, index: number): ReplayStep => ({ ...replay.steps[index]!, player: 'p9' as PlayerId });

  it.each([0, 1, 7, STEPS - 1])('um passo adulterado (o %i) para o replay ali e diz por quê', (index) => {
    const bad = illegal(REPLAY, index);
    const track = buildTrack(withStep(REPLAY, index, bad), 'p1', names);
    const before = reference({ ...REPLAY, steps: REPLAY.steps.slice(0, index) });
    const refused = applyAction(before[index]!.state, bad.player, bad.action);
    if (refused.ok) throw new Error('o passo adulterado deveria ser recusado');
    expect(track.stoppedAt).toEqual({ step: index + 1, message: refused.error.message });
    expect(track.stoppedAt!.message).toMatch(/p9/);
    expect(track.frames).toHaveLength(index + 1);
    expect(track.frames).toEqual(TRACK.frames.slice(0, index + 1));
    expect(track.rounds.every((entry) => entry.frame <= index)).toBe(true);
  });

  it('um passo fora de hora (ação ilegal na fase) também para ali', () => {
    const bad: ReplayStep = { player: 'p1', action: { type: 'DECLARE_ATTACK' } };
    const track = buildTrack(withStep(REPLAY, 0, bad), 'p1', names);
    expect(track.stoppedAt?.step).toBe(1);
    expect(track.stoppedAt?.message).toEqual(expect.any(String));
    expect(track.stoppedAt?.message).not.toBe('');
    expect(track.frames).toHaveLength(1);
  });

  it('passos depois do fim da partida param no primeiro deles', () => {
    const extra: ReplayStep = { player: 'p1', action: { type: 'END_TURN' } };
    const track = buildTrack({ ...REPLAY, steps: [...REPLAY.steps, extra, extra] }, 'p1', names);
    expect(track.stoppedAt).toEqual({ step: STEPS + 1, message: 'a partida já terminou' });
    expect(track.frames).toHaveLength(STEPS + 1);
  });

  it.each([
    ['action null', null, 'ação malformada'],
    ['tipo desconhecido', { type: 'NAO_EXISTE' }, 'ação desconhecida: NAO_EXISTE'],
    ['um texto no lugar da ação', 'EQUIP', 'ação malformada'],
  ])('um passo malformado (%s) para ali, com a mensagem do motor, sem lançar', (_label, action, message) => {
    const bad = { ...REPLAY.steps[3]!, action: action as unknown as Action };
    const track = buildTrack(withStep(REPLAY, 3, bad), 'p1', names);
    expect(track.stoppedAt).toEqual({ step: 4, message });
    expect(track.frames).toHaveLength(4);
  });

  it('um passo que não é um objeto faz o código lançar e a trilha para ali, sem lançar', () => {
    const track = buildTrack(withStep(REPLAY, 5, null as unknown as ReplayStep), 'p1', names);
    expect(track.stoppedAt).toEqual({ step: 6, message: 'jogada malformada' });
    expect(track.frames).toHaveLength(6);
  });

  it('o motor que lança num passo (um erro dele) também para ali, sem lançar', () => {
    engineFault.failAt = 9;
    const track = buildTrack(REPLAY, 'p1', names);
    expect(engineFault.calls).toBe(9);
    expect(track.stoppedAt).toEqual({ step: 9, message: 'jogada malformada' });
    expect(track.frames).toHaveLength(9);
    expect(track.frames).toEqual(TRACK.frames.slice(0, 9));
  });

  it('config inválida para no passo 0, sem quadros', () => {
    const track = buildTrack({ ...REPLAY, config: { ...REPLAY.config, hp: 0 } }, 'p1', names);
    expect(track).toEqual({ frames: [], stoppedAt: { step: 0, message: 'hp deve ser um inteiro ≥ 1' }, rounds: [] });
  });

  it('assentos repetidos também param no passo 0', () => {
    const track = buildTrack({ ...REPLAY, players: ['p1', 'p1'] }, 'p1', names);
    expect(track.frames).toEqual([]);
    expect(track.stoppedAt?.step).toBe(0);
    expect(track.stoppedAt?.message).toMatch(/jogadores/);
  });

  it.each([
    ['sem os assentos', { ...REPLAY, players: null as unknown as [PlayerId, PlayerId] }, 'p1'],
    ['sem a lista de passos', { ...REPLAY, steps: undefined as unknown as ReplayStep[] }, 'p1'],
    ['o assento pedido não joga', REPLAY, 'p9'],
  ] as const)('um replay malformado (%s) para no passo 0, sem lançar', (_label, replay, me) => {
    const track = buildTrack(replay, me as PlayerId, names);
    expect(track).toEqual({ frames: [], stoppedAt: { step: 0, message: 'replay malformado' }, rounds: [] });
  });
});

describe('replaySnapshot', () => {
  const frame = EVENTFUL + 2;

  it('é uma mesa aberta, sem jogada, sem aviso e sem marcas, com o histórico do quadro', () => {
    const message = frameMessage(TRACK, frame - 1, frame);
    const snapshot = replaySnapshot(TRACK, message, frame, room(1), DEFAULT_PREFS);
    expect(snapshot).toEqual({
      status: 'open',
      stop: null,
      slowRetry: false,
      me: 'p1',
      room: room(1),
      state: message,
      replay: null,
      legal: [],
      pending: false,
      notice: null,
      receivedAt: 0,
      equipDraft: [],
      equipConfirmed: 'none',
      orderAutoAt: null,
      marks: NO_MARKS,
      marksBaseSeq: null,
      history: { ...TRACK.frames[frame]!.history, gameNo: 1 },
      prefs: DEFAULT_PREFS,
    });
    expect(snapshot.state).toBe(message);
    expect(snapshot.marks).toBe(NO_MARKS);
    expect(snapshot.prefs).toBe(DEFAULT_PREFS);
  });

  it('o assento do snapshot é o da vista (o do outro lado também)', () => {
    const other = buildTrack(REPLAY, 'p2', roomNames('p2', []));
    const snapshot = replaySnapshot(other, frameMessage(other, 0, 1), 1, room(1), DEFAULT_PREFS);
    expect(snapshot.me).toBe('p2');
  });

  it('voltar não acrescenta "Mesa sincronizada": o histórico é o do quadro, não o da mensagem em resync', () => {
    const back = frameMessage(TRACK, frame, frame - 3);
    expect(back.resync).toBe(true);
    const snapshot = replaySnapshot(TRACK, back, frame - 3, room(1), DEFAULT_PREFS);
    expect(snapshot.history.lines).toEqual(TRACK.frames[frame - 3]!.history.lines);
    expect(snapshot.history.lines.some((line) => line.text === RESYNC_TEXT)).toBe(false);
    expect(snapshot.history.lastSeq).toBe(frame - 2);
    // O mesmo vale para um salto adiante.
    const jump = replaySnapshot(TRACK, frameMessage(TRACK, 0, STEPS), STEPS, room(1), DEFAULT_PREFS);
    expect(jump.history.lines).toEqual(TRACK.frames[STEPS]!.history.lines);
    expect(jump.history.lines.some((line) => line.text === RESYNC_TEXT)).toBe(false);
  });

  it('o número da partida da sala marca o histórico sem esvaziá-lo', () => {
    for (const gameNo of [1, 3]) {
      const snapshot = replaySnapshot(TRACK, frameMessage(TRACK, frame - 1, frame), frame, room(gameNo), DEFAULT_PREFS);
      expect(snapshot.history.gameNo).toBe(gameNo);
      expect(snapshot.history.lines).toEqual(TRACK.frames[frame]!.history.lines);
    }
  });

  it('um quadro fora da trilha é erro de quem chama', () => {
    expect(() => replaySnapshot(TRACK, TRACK.frames[0]!.state, STEPS + 1, room(1), DEFAULT_PREFS)).toThrow(RangeError);
  });

  it('as referências da trilha não mudam com o uso (é só leitura)', () => {
    const copy: ReplayTrack = structuredClone(TRACK);
    frameMessage(TRACK, 5, 2);
    replaySnapshot(TRACK, frameMessage(TRACK, 5, 2), 2, room(2), DEFAULT_PREFS);
    expect(TRACK).toEqual(copy);
  });
});

// ---------------------------------------------------------------------------------------------
// A partida que diverge: o resultado do último quadro contra o que ficou guardado

/** O resultado de verdade da partida de teste (o último quadro é o fim de jogo). */
const FINAL: GameResult = (() => {
  const { phase } = TRACK.frames[STEPS]!.state.view;
  if (phase.kind !== 'GAME_OVER') throw new Error('a partida de teste termina');
  return phase.result;
})();

/** Um resultado que a partida de teste não teve. */
const OTHER: GameResult = FINAL.kind === 'WIN' && FINAL.winner === 'p1' ? { kind: 'WIN', winner: 'p2', reason: 'HP' } : { kind: 'WIN', winner: 'p1', reason: 'HP' };

describe('trackResult', () => {
  it('é o resultado do fim de jogo do último quadro, quando a trilha foi até o fim', () => {
    expect(FINAL.kind).toBe('WIN');
    expect(trackResult(TRACK)).toEqual(FINAL);
  });

  it('é nulo quando a trilha parou antes do fim, quando a partida não acabou ali e quando não há quadro', () => {
    const stopped = buildTrack(withStep(REPLAY, 6, { ...REPLAY.steps[6]!, player: 'p9' as PlayerId }), 'p1', names);
    expect(stopped.stoppedAt).not.toBeNull();
    expect(trackResult(stopped)).toBeNull();
    expect(trackResult(buildTrack({ ...REPLAY, steps: REPLAY.steps.slice(0, 5) }, 'p1', names))).toBeNull();
    expect(trackResult(buildTrack({ ...REPLAY, config: { ...REPLAY.config, hp: -5 } }, 'p1', names))).toBeNull();
  });
});

describe('diverges', () => {
  it('o resultado guardado igual ao do último quadro não diverge', () => {
    expect(diverges(TRACK, FINAL)).toBe(false);
  });

  it('a ordem das chaves do resultado guardado não importa (o JSON do armazenamento não a garante)', () => {
    const shuffled = Object.fromEntries(Object.entries(FINAL).reverse()) as GameResult;
    expect(Object.keys(shuffled)).not.toEqual(Object.keys(FINAL));
    expect(diverges(TRACK, shuffled)).toBe(false);
  });

  it('um vencedor, um motivo ou um tipo de resultado diferente diverge', () => {
    if (FINAL.kind !== 'WIN') throw new Error('a partida de teste tem vencedor');
    expect(diverges(TRACK, OTHER)).toBe(true);
    expect(diverges(TRACK, { ...FINAL, reason: 'EXODIA' })).toBe(true);
    expect(diverges(TRACK, { kind: 'DRAW', reason: 'ANTI_STALL' })).toBe(true);
  });

  it('sem resultado guardado (abandono) não confere', () => {
    expect(diverges(TRACK, null)).toBe(false);
  });

  it('uma trilha que parou antes do fim não confere: o aviso da parada já diz o que houve', () => {
    const stopped = buildTrack(withStep(REPLAY, 6, { ...REPLAY.steps[6]!, player: 'p9' as PlayerId }), 'p1', names);
    expect(diverges(stopped, OTHER)).toBe(false);
    expect(diverges(stopped, FINAL)).toBe(false);
  });

  it('uma trilha que foi até o fim sem a partida acabar diverge de um resultado guardado', () => {
    const cut = buildTrack({ ...REPLAY, steps: REPLAY.steps.slice(0, 5) }, 'p1', names);
    expect(cut.stoppedAt).toBeNull();
    expect(diverges(cut, FINAL)).toBe(true);
    expect(diverges(cut, null)).toBe(false);
  });
});
