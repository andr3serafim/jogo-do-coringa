import type { GameEvent } from '@coringa/engine';
import type { RoomMessage } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import {
  appendHistory,
  appendNote,
  CATCH_UP_TEXT,
  EMPTY_HISTORY,
  forGame,
  newLineCount,
  RESYNC_TEXT,
  returnNote,
  roomNames,
  type HistoryState,
} from '../../src/model/history.ts';
import { stateMessage, viewAt } from '../fixtures.ts';

const names = roomNames('p1', [
  { playerId: 'p1', nickname: 'André' },
  { playerId: 'p2', nickname: 'Duda' },
]);

const view = viewAt();
const ROUND = `Rodada ${view.round}: Ataque`;

const guardPlayed: GameEvent = { type: 'GuardPlayed', player: 'p2', cards: [{ id: 'k1', kind: 'K', suit: 'paus' }] };
const attack: GameEvent = { type: 'AttackDeclared', player: 'p1' };
const windowOpened: GameEvent = { type: 'ReactionWindowOpened', responder: 'p2', trigger: 'ATTACK' };

const msg = (seq: number, events: GameEvent[], extra: Parameters<typeof stateMessage>[1] = {}) =>
  stateMessage(view, { seq, events, ...extra });

const texts = (history: HistoryState) => history.lines.map((line) => line.text);

/** Um histórico que já começou (com o cabeçalho da rodada), para os testes olharem só as linhas novas. */
const started = appendHistory(EMPTY_HISTORY, msg(1, []), names);
const added = (next: HistoryState) => next.lines.slice(started.lines.length);

describe('roomNames', () => {
  it('você é "Você" e o outro tem o apelido da sala', () => {
    expect(names.of('p1')).toBe('Você');
    expect(names.of('p2')).toBe('Duda');
    expect(names.de('p1')).toBe('de você');
    expect(names.de('p2')).toBe('de Duda');
    expect(names.me).toBe('p1');
  });

  it('sem o assento do outro, ele é "Oponente"', () => {
    const lonely = roomNames('p2', [{ playerId: 'p2', nickname: 'Duda' }]);
    expect(lonely.of('p1')).toBe('Oponente');
    expect(lonely.de('p1')).toBe('de Oponente');
  });
});

describe('appendHistory: eventos viram linhas', () => {
  it('uma linha por evento, com o seq da mensagem e o texto do terminal', () => {
    const next = appendHistory(started, msg(5, [guardPlayed, attack]), names);
    expect(added(next)).toEqual([
      { seq: 5, kind: 'event', text: 'Duda pôs 1 K na Guarda' },
      { seq: 5, kind: 'event', text: 'Você declarou o ataque' },
    ]);
    expect(next.lastSeq).toBe(5);
  });

  it('eventos sem texto (a janela de reação) não viram linha', () => {
    const next = appendHistory(started, msg(2, [windowOpened, attack, windowOpened]), names);
    expect(added(next).map((line) => line.text)).toEqual(['Você declarou o ataque']);
  });

  it('o início de rodada vira cabeçalho, sem a quebra de linha e os traços do terminal', () => {
    const next = appendHistory(started, msg(3, [{ type: 'RoundStarted', round: 4, kind: 'ATTACK' }, attack]), names);
    expect(added(next)[0]).toEqual({ seq: 3, kind: 'round', text: 'Rodada 4: Ataque' });
    expect(added(next)[1]?.kind).toBe('event');
  });

  it('acumula as mensagens em ordem e não muda o estado anterior', () => {
    const first = appendHistory(started, msg(2, [attack]), names);
    const second = appendHistory(first, msg(3, [guardPlayed]), names);
    expect(texts(second).slice(started.lines.length)).toEqual(['Você declarou o ataque', 'Duda pôs 1 K na Guarda']);
    expect(first.lines).toHaveLength(started.lines.length + 1);
  });
});

describe('appendHistory: seq repetido ou antigo', () => {
  it('ignora o mesmo seq e os mais velhos, devolvendo o mesmo objeto', () => {
    const first = appendHistory(started, msg(5, [attack]), names);
    expect(appendHistory(first, msg(5, [guardPlayed]), names)).toBe(first);
    expect(appendHistory(first, msg(4, [guardPlayed]), names)).toBe(first);
  });
});

describe('appendHistory: catchUp e resync', () => {
  it('catchUp põe "Enquanto você estava fora" antes dos eventos perdidos', () => {
    const next = appendHistory(started, msg(9, [guardPlayed, attack], { catchUp: true }), names);
    expect(added(next).map((line) => [line.kind, line.text])).toEqual([
      ['note', CATCH_UP_TEXT],
      ['event', 'Duda pôs 1 K na Guarda'],
      ['event', 'Você declarou o ataque'],
    ]);
    expect(CATCH_UP_TEXT).toBe('Enquanto você estava fora');
  });

  it('catchUp sem nenhuma linha depois não deixa o cabeçalho sozinho', () => {
    const next = appendHistory(started, msg(9, [windowOpened], { catchUp: true }), names);
    expect(texts(next)).not.toContain(CATCH_UP_TEXT);
    expect(next.lastSeq).toBe(9);
  });

  it('resync registra "Mesa sincronizada" e não conta os eventos', () => {
    const next = appendHistory(started, msg(30, [guardPlayed], { resync: true }), names);
    expect(added(next).map((line) => [line.kind, line.text])).toEqual([['note', RESYNC_TEXT]]);
    expect(RESYNC_TEXT).toBe('Mesa sincronizada');
    expect(next.lastSeq).toBe(30);
  });
});

describe('appendHistory: o começo do histórico', () => {
  it('o primeiro state de uma partida (sem eventos) abre o histórico com a rodada em que está', () => {
    expect(started.lines).toEqual([{ seq: 1, kind: 'round', text: ROUND }]);
  });

  it('não repete o cabeçalho quando a mensagem já traz o início de rodada', () => {
    const next = appendHistory(EMPTY_HISTORY, msg(1, [{ type: 'RoundStarted', round: 1, kind: 'EQUIP' }]), names);
    expect(texts(next)).toEqual(['Rodada 1: Equipar']);
  });

  it('um histórico que já tem linhas não ganha o cabeçalho', () => {
    const next = appendHistory(started, msg(3, []), names);
    expect(next.lines).toHaveLength(started.lines.length);
  });

  it('a página recarregada no meio da rodada abre com a rodada atual, antes do aviso do catchUp', () => {
    const next = appendHistory(EMPTY_HISTORY, msg(6, [attack], { catchUp: true }), names);
    expect(next.lines.map((line) => [line.kind, line.text])).toEqual([
      ['round', ROUND],
      ['note', CATCH_UP_TEXT],
      ['event', 'Você declarou o ataque'],
    ]);
  });

  it('abre também no resync, antes da nota', () => {
    const next = appendHistory(EMPTY_HISTORY, msg(8, [], { resync: true }), names);
    expect(next.lines.map((line) => line.kind)).toEqual(['round', 'note']);
  });
});

describe('forGame: partida nova zera o histórico', () => {
  it('o primeiro número só é marcado, sem apagar nada', () => {
    const first = appendHistory(EMPTY_HISTORY, msg(2, [attack]), names);
    const next = forGame(first, 1);
    expect(next.gameNo).toBe(1);
    expect(next.lines).toEqual(first.lines);
  });

  it('o mesmo número devolve o mesmo objeto', () => {
    const state = forGame(EMPTY_HISTORY, 3);
    expect(forGame(state, 3)).toBe(state);
  });

  it('outro número esvazia as linhas e guarda o último seq (o seq só sobe entre partidas)', () => {
    const state = appendHistory(forGame(EMPTY_HISTORY, 1), msg(7, [attack]), names);
    const next = forGame(state, 2);
    expect(next).toEqual({ gameNo: 2, lastSeq: 7, lines: [] });
    // Um state velho da partida anterior continua sendo ignorado.
    expect(appendHistory(next, msg(7, [guardPlayed]), names)).toBe(next);
    // O state novo abre a partida nova com a rodada dela, antes dos eventos.
    expect(texts(appendHistory(next, msg(8, [guardPlayed]), names))).toEqual([ROUND, 'Duda pôs 1 K na Guarda']);
  });
});

describe('newLineCount', () => {
  const more = appendHistory(appendHistory(started, msg(2, [attack, guardPlayed]), names), msg(4, [attack]), names);

  it('sem base de marcas, nada é novo', () => {
    expect(newLineCount(more, null)).toBe(0);
  });

  it('conta as linhas com seq maior que o da base', () => {
    expect(newLineCount(more, 2)).toBe(1);
    expect(newLineCount(more, 1)).toBe(3);
    expect(newLineCount(more, 0)).toBe(more.lines.length);
    expect(newLineCount(more, 4)).toBe(0);
  });
});

describe('returnNote: a volta do oponente (spec §3.9)', () => {
  const seat = (playerId: 'p1' | 'p2', nickname: string, connected: boolean) => ({
    playerId,
    nickname,
    connected,
    ready: true,
    wantsRematch: false,
  });
  const room = (opponentConnected: boolean, extra: Partial<RoomMessage> = {}): RoomMessage => ({
    t: 'room',
    code: 'ABCD',
    status: 'PLAYING',
    seats: [seat('p1', 'André', true), seat('p2', 'Duda', opponentConnected)],
    score: { p1: 0, p2: 0, draws: 0 },
    gameNo: 1,
    expiresAt: 0,
    ...extra,
  });

  it('o oponente estava fora e voltou durante a partida: "Duda voltou"', () => {
    expect(returnNote(room(false), room(true), 'p1')).toBe('Duda voltou');
  });

  it('quem vê pelo outro assento recebe o apelido do outro', () => {
    const swapped = (connected: boolean): RoomMessage => ({
      ...room(true),
      seats: [seat('p1', 'André', connected), seat('p2', 'Duda', true)],
    });
    expect(returnNote(swapped(false), swapped(true), 'p2')).toBe('André voltou');
  });

  it('sem sala anterior, sem queda ou fora da partida, não há nota', () => {
    expect(returnNote(null, room(true), 'p1')).toBeNull();
    expect(returnNote(room(true), room(true), 'p1')).toBeNull();
    expect(returnNote(room(true), room(false), 'p1')).toBeNull();
    expect(returnNote(room(false), room(false), 'p1')).toBeNull();
    expect(returnNote(room(false, { status: 'LOBBY' }), room(true, { status: 'LOBBY' }), 'p1')).toBeNull();
    expect(returnNote(room(false), room(true, { status: 'FINISHED' }), 'p1')).toBeNull();
  });

  it('outra partida (gameNo) não conta como volta', () => {
    expect(returnNote(room(false), room(true, { gameNo: 2 }), 'p1')).toBeNull();
  });

  it('sem o assento do outro em alguma das salas, não há nota', () => {
    const lonely = (connected: boolean): RoomMessage => ({ ...room(connected), seats: [seat('p1', 'André', true)] });
    expect(returnNote(lonely(false), room(true), 'p1')).toBeNull();
    expect(returnNote(room(false), lonely(true), 'p1')).toBeNull();
  });
});

describe('appendNote', () => {
  it('acrescenta uma nota com o último seq, sem mexer na anterior', () => {
    const next = appendNote(started, 'Duda voltou');
    expect(next.lines.at(-1)).toEqual({ seq: started.lastSeq, kind: 'note', text: 'Duda voltou' });
    expect(next.lines).toHaveLength(started.lines.length + 1);
    expect(started.lines).toHaveLength(1);
    expect(next.lastSeq).toBe(started.lastSeq);
  });
});
