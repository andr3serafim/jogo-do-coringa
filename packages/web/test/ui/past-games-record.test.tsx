// A mesa grava a partida terminada na lista local (spec do polimento §4.1): uma linha por partida, no instante em que a sala
// vira FINISHED, com o replay quando a conexão o entregou antes (o treino) ou, quando ele chega depois (online: o servidor manda
// o `room` e só então o `replay`), acrescentado à mesma linha. A mesa é a `PlayTable` sobre uma `Session` de verdade com uma
// `FakeConnection`; o armazenamento recusar nunca pode quebrar o painel de fim.
import { RULES_VERSION, makeConfig, type GameResult, type PlayerId, type Replay } from '@coringa/engine';
import type { RoomMessage, Score } from '@coringa/protocol';
import { act, render, renderHook, screen } from '@testing-library/react';
import { Profiler, StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingLevel } from '../../src/model/local-room.ts';
import { loadPastGames, PAST_GAMES_KEY } from '../../src/model/past-games.ts';
import { saveSeat, type KeyValueStore } from '../../src/model/storage.ts';
import { RoomGate } from '../../src/ui/screens/RoomGate.tsx';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { useRecordPastGame } from '../../src/ui/table/useRecordPastGame.ts';
import { stateMessage, viewAt } from '../fixtures.ts';
import { advance, cleanup, connect, emit, EXODIA, EXODIA_OVER, seatOf, THEIRS } from './anim-harness.tsx';
import { CODE, fakeApi, memoryStore, roomMessage, seat } from './support.tsx';

afterEach(() => {
  cleanup();
  window.history.replaceState(null, '', '/');
});

const win = (winner: PlayerId, reason: Extract<GameResult, { kind: 'WIN' }>['reason'] = 'HP'): GameResult => ({
  kind: 'WIN',
  winner,
  reason,
});

/** Um replay de forma válida (o que o motor julga é problema da tela de replay, não da gravação). */
function replayOf(name: string): Replay {
  return {
    name,
    config: makeConfig(),
    seed: name,
    players: ['p1', 'p2'],
    steps: [
      { player: 'p1', action: { type: 'EQUIP', destinations: [] } },
      { player: 'p2', action: { type: 'EQUIP', destinations: [] } },
    ],
  };
}

const SEATS: RoomMessage['seats'] = [seatOf('p1', 'André'), seatOf('p2', 'Duda')];

interface MountOptions {
  /** Treino contra o bot, e o nível. Sem ele a mesa é online (sala `ABC234`). */
  training?: TrainingLevel;
  /** `null`: a mesa sem `store`. */
  store?: KeyValueStore | null;
  strict?: boolean;
  /** A sala já abre em FINISHED (a página recarregou depois do fim). */
  finished?: boolean;
}

/** A sala que abre já em FINISHED: a partida 1, ganha por p1. */
const FINISHED_ROOM: Parameters<typeof roomMessage>[0] = {
  status: 'FINISHED',
  seats: SEATS,
  score: { p1: 1, p2: 0, draws: 0 },
  outcome: { gameNo: 1, result: win('p1'), cause: 'NORMAL' },
};

function mount(options: MountOptions = {}) {
  const m = connect(THEIRS, options.finished ? { room: FINISHED_ROOM } : {});
  const store = options.store === undefined ? memoryStore() : options.store;
  const table: ReactNode = (
    <PlayTable session={m.session} store={store ?? undefined} training={options.training} onNewRoom={() => undefined} />
  );
  const rendered = render(options.strict ? <StrictMode>{table}</StrictMode> : table);
  return { ...m, store, ...rendered };
}

type Mounted = ReturnType<typeof mount>;

interface FinishOptions {
  gameNo?: number;
  result?: GameResult | null;
  score?: Score;
  /** O replay que a conexão entrega antes do `room` em FINISHED (o treino; o servidor, online, o manda depois: `deliverReplay`). */
  replay?: Replay;
  /** O assento de quem joga recebe revanche pedida (a sala reemite o `room` com o mesmo `gameNo`). */
  mineWants?: boolean;
}

/** Como a `LocalRoom`: o `replay` primeiro, o `room` em FINISHED depois, cada um no seu `act`. Sem `replay`, só o `room`. */
function finish(m: Pick<Mounted, 'connection'>, options: FinishOptions = {}) {
  const gameNo = options.gameNo ?? 1;
  if (options.replay) {
    const replay = options.replay;
    act(() => m.connection.emit({ type: 'replay', replay: { t: 'replay', gameNo, replay } }));
  }
  act(() =>
    m.connection.emitRoom(
      roomMessage({
        status: 'FINISHED',
        gameNo,
        seats: SEATS.map((seat) => ({ ...seat, wantsRematch: seat.playerId === 'p1' && (options.mineWants ?? false) })),
        score: options.score ?? { p1: 1, p2: 0, draws: 0 },
        outcome: { gameNo, result: options.result === undefined ? win('p1') : options.result, cause: 'NORMAL' },
      }),
    ),
  );
}

/** A sala volta a PLAYING numa partida nova (a revanche): o replay da anterior sai da sessão. */
function startGame(m: Pick<Mounted, 'connection'>, gameNo: number) {
  act(() => m.connection.emitRoom(roomMessage({ status: 'PLAYING', gameNo, seats: SEATS })));
}

/** Como o servidor online: o `replay` da partida chega depois do `room` em FINISHED, numa mensagem só dele. */
function deliverReplay(m: Pick<Mounted, 'connection'>, gameNo: number, replay: Replay) {
  act(() => m.connection.emit({ type: 'replay', replay: { t: 'replay', gameNo, replay } }));
}

/** Um armazenamento em memória que conta as gravações (`set`): quantas vezes a lista foi escrita. */
function countingStore(): KeyValueStore & { sets: number } {
  const inner = memoryStore();
  const store = {
    sets: 0,
    get: (key: string) => inner.get(key),
    set(key: string, value: string) {
      store.sets += 1;
      inner.set(key, value);
    },
    remove: (key: string) => inner.remove(key),
  };
  return store;
}

const rows = (m: Pick<Mounted, 'store'>) => (m.store === null ? [] : loadPastGames(m.store));
const reviewButton = () => screen.queryByRole('button', { name: 'Rever a partida' });

describe('a mesa grava a partida terminada', () => {
  it('no treino: uma linha com o replay, o nível, o assento, os apelidos, o placar e a versão das regras', () => {
    const m = mount({ training: 'medio' });
    expect(rows(m)).toEqual([]);

    const replay = replayOf('treino-t1');
    finish(m, { replay, score: { p1: 1, p2: 0, draws: 0 } });

    const [row, ...others] = rows(m);
    expect(others).toEqual([]);
    expect(row).toEqual({
      id: expect.stringMatching(/^[0-9a-z]+$/),
      date: 10_000,
      mode: { kind: 'training', level: 'medio' },
      seat: 'p1',
      names: { me: 'André', opponent: 'Duda' },
      outcome: { gameNo: 1, result: win('p1'), cause: 'NORMAL' },
      rounds: 7,
      score: { p1: 1, p2: 0, draws: 0 },
      rulesVersion: RULES_VERSION,
      replay,
    });
    // O treino não tem `key`: duas partidas de treino nunca são a mesma.
    expect(row).not.toHaveProperty('key');
  });

  it('online: sem replay, com o código da sala e a `key` da partida', () => {
    const m = mount();
    finish(m, { gameNo: 3, result: win('p2', 'EXODIA'), score: { p1: 1, p2: 2, draws: 0 } });

    expect(rows(m)).toEqual([
      {
        id: expect.any(String),
        key: `sala:${CODE}:3`,
        date: 10_000,
        mode: { kind: 'online', code: CODE },
        seat: 'p1',
        names: { me: 'André', opponent: 'Duda' },
        outcome: { gameNo: 3, result: win('p2', 'EXODIA'), cause: 'NORMAL' },
        rounds: 7,
        score: { p1: 1, p2: 2, draws: 0 },
        rulesVersion: RULES_VERSION,
      },
    ]);
  });

  it('a partida sem resultado (os dois saíram) também fica na lista', () => {
    const m = mount();
    finish(m, { result: null });
    expect(rows(m).map((row) => row.outcome.result)).toEqual([null]);
  });

  it('só uma vez, mesmo sob <StrictMode> (o efeito roda duas vezes) e com a sala reemitida', () => {
    const m = mount({ training: 'facil', strict: true });
    finish(m, { replay: replayOf('treino-s') });
    expect(rows(m)).toHaveLength(1);

    // O servidor reemite o `room` da mesma partida (revanche pedida, oponente que sai): não é outra partida.
    finish(m, { mineWants: true });
    finish(m, { mineWants: false });
    expect(rows(m)).toHaveLength(1);
    expect(rows(m)[0]!.replay).toEqual(replayOf('treino-s'));
  });

  it('sob <StrictMode>, a mesa que já abre com a sala em FINISHED grava uma vez (o treino não tem `key` para juntar duas)', () => {
    const m = mount({ training: 'medio', strict: true, finished: true });
    expect(rows(m)).toHaveLength(1);
    expect(screen.getByRole('dialog', { name: 'Você venceu' })).toBeInTheDocument();
  });

  it('online, voltar a uma sala já terminada (recarregar a página) não repete a partida: a `key` as junta', () => {
    const store = memoryStore();
    const first = mount({ store, strict: true, finished: true });
    expect(rows(first)).toHaveLength(1);
    expect(rows(first)[0]).toMatchObject({ key: `sala:${CODE}:1`, mode: { kind: 'online', code: CODE } });
    first.unmount();

    const again = mount({ store, finished: true });
    expect(rows(again)).toHaveLength(1);
  });

  it('uma partida em curso não grava nada', () => {
    const m = mount({ training: 'medio' });
    startGame(m, 1);
    expect(m.store?.get(PAST_GAMES_KEY)).toBeNull();
    expect(rows(m)).toEqual([]);
  });

  it('a revanche é outra partida: a segunda linha tem o seu `gameNo` e o seu replay, e não herda o da primeira', () => {
    const m = mount({ training: 'medio' });
    finish(m, { replay: replayOf('treino-a'), score: { p1: 1, p2: 0, draws: 0 } });
    startGame(m, 2);
    finish(m, { gameNo: 2, replay: replayOf('treino-a-2'), result: win('p2'), score: { p1: 1, p2: 1, draws: 0 } });
    startGame(m, 3);
    // A terceira não recebe replay: a linha dela fica sem, e o da segunda não passa para ela.
    finish(m, { gameNo: 3, result: { kind: 'DRAW', reason: 'ANTI_STALL' }, score: { p1: 1, p2: 1, draws: 1 } });

    const saved = rows(m);
    expect(saved.map((row) => row.outcome.gameNo)).toEqual([3, 2, 1]);
    expect(saved.map((row) => row.replay?.name)).toEqual([undefined, 'treino-a-2', 'treino-a']);
    expect(saved.map((row) => row.score)).toEqual([
      { p1: 1, p2: 1, draws: 1 },
      { p1: 1, p2: 1, draws: 0 },
      { p1: 1, p2: 0, draws: 0 },
    ]);
  });

  it('grava na hora em que a sala vira FINISHED, mesmo com a cena do último golpe ainda tocando (o painel espera, a linha não)', () => {
    const m = connect(THEIRS);
    const store = memoryStore();
    render(<PlayTable session={m.session} store={store} training="dificil" />);
    emit(m, EXODIA_OVER, [EXODIA]);
    finish(m, { result: win('p2', 'EXODIA'), replay: replayOf('treino-exodia') });

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(loadPastGames(store)).toHaveLength(1);
    advance(2_000);
    expect(screen.getByRole('dialog', { name: 'Duda venceu' })).toBeInTheDocument();
    expect(loadPastGames(store)).toHaveLength(1);
  });

  it('sem `store` não grava nada, e o painel de fim aparece do mesmo jeito', () => {
    const m = mount({ training: 'medio', store: null });
    finish(m, { replay: replayOf('treino-sem-store') });
    expect(screen.getByRole('dialog', { name: 'Você venceu' })).toBeInTheDocument();
    expect(reviewButton()).not.toBeInTheDocument();
  });
});

describe('armazenamento que recusa', () => {
  it('um `set` que lança (cota) não quebra o painel de fim, que não oferece "Rever a partida"', () => {
    const set = vi.fn(() => {
      throw new DOMException('cheio', 'QuotaExceededError');
    });
    const store: KeyValueStore = { get: () => null, set, remove: () => undefined };
    const m = mount({ training: 'medio', store });
    finish(m, { replay: replayOf('treino-cheio') });

    expect(set).toHaveBeenCalled();
    expect(screen.getByRole('dialog', { name: 'Você venceu' })).toBeInTheDocument();
    expect(reviewButton()).not.toBeInTheDocument();

    // Uma tentativa por partida: a sala reemitida não grava de novo.
    const attempts = set.mock.calls.length;
    finish(m, { mineWants: true });
    expect(set).toHaveBeenCalledTimes(attempts);
  });

  it('um armazenamento em que tudo lança também não quebra', () => {
    const boom = (): never => {
      throw new Error('bloqueado');
    };
    const m = mount({ training: 'medio', store: { get: boom, set: boom, remove: boom } });
    finish(m, { replay: replayOf('treino-bloqueado') });
    expect(screen.getByRole('dialog', { name: 'Você venceu' })).toBeInTheDocument();
    expect(reviewButton()).not.toBeInTheDocument();
  });
});

describe('"Rever a partida" no painel de fim', () => {
  it('aparece com o replay gravado e leva a /partidas/<id> da linha', async () => {
    const m = mount({ training: 'medio' });
    finish(m, { replay: replayOf('treino-rever') });

    const id = rows(m)[0]!.id;
    await m.user.click(screen.getByRole('button', { name: 'Rever a partida' }));
    expect(window.location.pathname).toBe(`/partidas/${id}`);
  });

  it('no treino troca a entrada do histórico (o Voltar do replay vai ao início); online empilha uma (o Voltar volta à sala)', async () => {
    const training = mount({ training: 'medio' });
    finish(training, { replay: replayOf('treino-voltar') });
    const trainingLength = window.history.length;
    await training.user.click(screen.getByRole('button', { name: 'Rever a partida' }));
    expect(window.location.pathname).toBe(`/partidas/${rows(training)[0]!.id}`);
    expect(window.history.length).toBe(trainingLength);
    training.unmount();

    const online = mount();
    finish(online, { replay: replayOf('online-voltar') });
    const onlineLength = window.history.length;
    await online.user.click(screen.getByRole('button', { name: 'Rever a partida' }));
    expect(window.location.pathname).toBe(`/partidas/${rows(online)[0]!.id}`);
    expect(window.history.length).toBe(onlineLength + 1);
  });

  it('não aparece enquanto a partida não tem replay: online que ainda não o recebeu, nem o treino sem ele', () => {
    const online = mount();
    finish(online, {});
    expect(screen.getByRole('dialog', { name: 'Você venceu' })).toBeInTheDocument();
    expect(reviewButton()).not.toBeInTheDocument();
    online.unmount();

    const training = mount({ training: 'medio' });
    finish(training, {});
    expect(rows(training)).toHaveLength(1);
    expect(reviewButton()).not.toBeInTheDocument();
  });

  it('o da revanche não herda o botão da partida anterior', () => {
    const m = mount({ training: 'medio' });
    finish(m, { replay: replayOf('treino-1') });
    expect(reviewButton()).toBeInTheDocument();

    startGame(m, 2);
    finish(m, { gameNo: 2 });
    expect(screen.getByRole('dialog', { name: 'Você venceu' })).toBeInTheDocument();
    expect(reviewButton()).not.toBeInTheDocument();
  });
});

describe('online: o replay chega depois do FINISHED', () => {
  it('online, o replay que chega depois do FINISHED entra na linha e o "Rever" aparece', async () => {
    const m = mount();
    finish(m, {});

    // O servidor manda o `room` em FINISHED e só então o `replay`: a linha já existe, sem ele.
    const [before] = rows(m);
    expect(before).toMatchObject({ key: `sala:${CODE}:1`, mode: { kind: 'online', code: CODE } });
    expect(before).not.toHaveProperty('replay');
    expect(reviewButton()).not.toBeInTheDocument();

    const replay = replayOf('online-1');
    deliverReplay(m, 1, replay);

    // A mesma linha (o mesmo id, no mesmo lugar), agora com o replay.
    const saved = rows(m);
    expect(saved).toEqual([{ ...before, replay }]);
    expect(screen.getByRole('dialog', { name: 'Você venceu' })).toBeInTheDocument();
    await m.user.click(screen.getByRole('button', { name: 'Rever a partida' }));
    expect(window.location.pathname).toBe(`/partidas/${before!.id}`);
  });

  it('o replay que já está no snapshot no FINISHED entra na gravação direto', () => {
    // O treino emite o replay antes do `room` em FINISHED; online a ordem também é aceita, se chegar assim.
    for (const options of [{ training: 'medio' }, {}] satisfies MountOptions[]) {
      const store = countingStore();
      const m = mount({ ...options, store });
      const replay = replayOf('antes-do-room');
      finish(m, { replay });

      // Uma gravação só, já com ele.
      expect(store.sets).toBe(1);
      expect(rows(m)).toHaveLength(1);
      expect(rows(m)[0]!.replay).toEqual(replay);
      expect(reviewButton()).toBeInTheDocument();
      m.unmount();
    }
  });

  it('as duas ordens de chegada dão a mesma linha, menos o id', () => {
    const replay = replayOf('ordem');
    const first = mount({ strict: true });
    finish(first, { replay });
    const direct = rows(first)[0]!;
    first.unmount();

    const second = mount({ strict: true });
    finish(second, {});
    deliverReplay(second, 1, replay);
    expect(rows(second)[0]).toEqual({ ...direct, id: rows(second)[0]!.id });
  });

  it('recarregar com a sala FINISHED não duplica e anexa o replay que faltava', async () => {
    const store = countingStore();
    // A primeira página: a sala já terminada e nenhum replay antes de a página fechar.
    const first = mount({ store, finished: true });
    expect(rows(first)).toHaveLength(1);
    expect(rows(first)[0]).not.toHaveProperty('replay');
    const { id } = rows(first)[0]!;
    first.unmount();

    // A página recarregada: o `hello` devolve o `room`, depois o `state` e o `replay`.
    const again = mount({ store, finished: true, strict: true });
    expect(rows(again)).toHaveLength(1);
    expect(reviewButton()).not.toBeInTheDocument();
    expect(store.sets).toBe(1);

    const replay = replayOf('recarregou');
    deliverReplay(again, 1, replay);

    expect(rows(again)).toHaveLength(1);
    expect(rows(again)[0]).toMatchObject({ id, replay });
    expect(store.sets).toBe(2);
    await again.user.click(screen.getByRole('button', { name: 'Rever a partida' }));
    expect(window.location.pathname).toBe(`/partidas/${id}`);
  });

  it('o `room` em FINISHED e o `replay` no mesmo `act` (a mesma renderização) anexam o replay à linha que já existia', async () => {
    const store = countingStore();
    // A página de antes gravou a linha, sem o replay (a sala já terminada na volta do `hello`).
    const first = mount({ store, finished: true });
    const { id } = rows(first)[0]!;
    expect(rows(first)[0]).not.toHaveProperty('replay');
    first.unmount();
    expect(store.sets).toBe(1);

    // A mesa nova abre com a partida em curso; o `room` em FINISHED e o `replay` chegam juntos, numa renderização só. A
    // gravação acha a linha pela `key` (sem escrever nada) e o anexo, no mesmo desenho, acrescenta o replay a ela: sem esperar
    // um desenho a mais por causa do estado da gravação (o `Profiler` conta os desenhos até o `set` do anexo).
    let commits = 0;
    let commitsAtAttach = -1;
    const watched: KeyValueStore = {
      get: (key) => store.get(key),
      set(key, value) {
        commitsAtAttach = commits;
        store.set(key, value);
      },
      remove: (key) => store.remove(key),
    };
    const m = connect(THEIRS);
    const { user } = m;
    render(
      <Profiler id="mesa" onRender={() => void (commits += 1)}>
        <PlayTable session={m.session} store={watched} onNewRoom={() => undefined} />
      </Profiler>,
    );
    const replay = replayOf('mesmo-act');
    const before = commits;
    act(() => {
      m.connection.emitRoom(
        roomMessage({
          status: 'FINISHED',
          seats: SEATS,
          score: { p1: 1, p2: 0, draws: 0 },
          outcome: { gameNo: 1, result: win('p1'), cause: 'NORMAL' },
        }),
      );
      m.connection.emit({ type: 'replay', replay: { t: 'replay', gameNo: 1, replay } });
    });

    expect(loadPastGames(store)).toHaveLength(1);
    expect(loadPastGames(store)[0]).toMatchObject({ id, replay });
    expect(store.sets).toBe(2);
    expect(commitsAtAttach).toBe(before + 1);
    await user.click(screen.getByRole('button', { name: 'Rever a partida' }));
    expect(window.location.pathname).toBe(`/partidas/${id}`);
  });

  it('a linha que já tem o replay não é regravada quando ele chega de novo (recarregar)', () => {
    const store = countingStore();
    const replay = replayOf('ja-tinha');
    const first = mount({ store });
    finish(first, { replay });
    expect(store.sets).toBe(1);
    first.unmount();

    const again = mount({ store, finished: true });
    deliverReplay(again, 1, replay);
    deliverReplay(again, 1, replayOf('outro-conteudo'));

    expect(store.sets).toBe(1);
    expect(rows(again)).toHaveLength(1);
    expect(rows(again)[0]!.replay).toEqual(replay);
    expect(reviewButton()).toBeInTheDocument();
  });

  it('anexa uma vez só: sob <StrictMode> e com o replay e o `room` reenviados', () => {
    const store = countingStore();
    const m = mount({ store, strict: true });
    finish(m, {});
    const replay = replayOf('uma-vez');
    deliverReplay(m, 1, replay);
    expect(store.sets).toBe(2);

    // O servidor reenvia o replay (a volta do `hello`) e o `room` da mesma partida: nada mais é gravado.
    deliverReplay(m, 1, replay);
    finish(m, { mineWants: true });
    deliverReplay(m, 1, replay);
    expect(store.sets).toBe(2);
    expect(rows(m)).toHaveLength(1);
    expect(rows(m)[0]!.replay).toEqual(replay);
  });

  it('um replay de outra partida é ignorado', () => {
    const m = mount();
    finish(m, {});

    // O replay da partida 2 chega com a sala ainda na 1: não entra na linha da 1.
    deliverReplay(m, 2, replayOf('outra'));
    expect(rows(m)).toHaveLength(1);
    expect(rows(m)[0]).not.toHaveProperty('replay');
    expect(reviewButton()).not.toBeInTheDocument();

    // A revanche: a partida 2 acaba e recebe o seu; a linha da 1 continua sem.
    startGame(m, 2);
    finish(m, { gameNo: 2, result: win('p2'), score: { p1: 1, p2: 1, draws: 0 } });
    deliverReplay(m, 2, replayOf('dois'));
    // Um replay atrasado da partida 1 também não entra, nem na linha da 1 nem na da 2.
    deliverReplay(m, 1, replayOf('um-atrasado'));

    const saved = rows(m);
    expect(saved.map((row) => row.outcome.gameNo)).toEqual([2, 1]);
    expect(saved.map((row) => row.replay?.name)).toEqual(['dois', undefined]);
  });

  it('o hook também confere o `gameNo`: um replay de outra partida, mesmo que chegasse a ele, não entra', () => {
    const m = connect(THEIRS, { room: FINISHED_ROOM });
    const store = memoryStore();
    const snapshot = m.session.snapshot();
    const names = { self: 'André', opponent: 'Duda' };
    const { result, rerender } = renderHook(
      ({ snap }) => useRecordPastGame(snap, m.view, names, store, undefined),
      { initialProps: { snap: snapshot } },
    );
    expect(result.current).not.toBeNull();
    expect(result.current).not.toHaveProperty('replay');

    rerender({ snap: { ...snapshot, replay: { t: 'replay', gameNo: 2, replay: replayOf('outra') } } });
    expect(loadPastGames(store)[0]).not.toHaveProperty('replay');
    expect(result.current).not.toHaveProperty('replay');

    // Com o `gameNo` da partida gravada, entra.
    rerender({ snap: { ...snapshot, replay: { t: 'replay', gameNo: 1, replay: replayOf('certa') } } });
    expect(loadPastGames(store)[0]!.replay?.name).toBe('certa');
    expect(result.current?.replay?.name).toBe('certa');
  });

  it('sem `store` o replay que chega depois não faz nada, e o painel segue', () => {
    const m = mount({ store: null });
    finish(m, {});
    deliverReplay(m, 1, replayOf('sem-store'));
    expect(screen.getByRole('dialog', { name: 'Você venceu' })).toBeInTheDocument();
    expect(reviewButton()).not.toBeInTheDocument();
  });

  it('um armazenamento que recusa o anexo não quebra o painel, não oferece "Rever" e não tenta de novo', () => {
    let refuse = false;
    const inner = memoryStore();
    const set = vi.fn((key: string, value: string) => {
      if (refuse) throw new DOMException('cheio', 'QuotaExceededError');
      inner.set(key, value);
    });
    const store: KeyValueStore = { get: (key) => inner.get(key), set, remove: (key) => inner.remove(key) };
    const m = mount({ store });
    finish(m, {});
    expect(set).toHaveBeenCalledTimes(1);

    refuse = true;
    deliverReplay(m, 1, replayOf('recusado'));
    const attempts = set.mock.calls.length;
    expect(attempts).toBeGreaterThan(1);
    expect(screen.getByRole('dialog', { name: 'Você venceu' })).toBeInTheDocument();
    expect(reviewButton()).not.toBeInTheDocument();
    expect(rows(m)).toHaveLength(1);
    expect(rows(m)[0]).not.toHaveProperty('replay');

    // Depois de um `null`, nada de nova tentativa: nem com o replay reenviado nem com o `room` reemitido.
    deliverReplay(m, 1, replayOf('recusado'));
    finish(m, { mineWants: true });
    expect(set).toHaveBeenCalledTimes(attempts);
  });
});

describe('a sala que termina e fecha em seguida (4000)', () => {
  /** A mesa de verdade: `RoomGate` com a `Session` sobre uma `FakeConnection`, e a sala já em partida. */
  function openGate() {
    window.history.replaceState(null, '', `/s/${CODE}`);
    const api = fakeApi();
    const store = memoryStore();
    saveSeat(store, CODE, seat());
    render(<RoomGate code={CODE} api={api} store={store} marks={memoryStore()} />);
    const connection = api.connections[0]!;
    act(() => {
      connection.emitRoom(roomMessage({ status: 'PLAYING', gameNo: 1, seats: SEATS }));
      connection.emitState(stateMessage(viewAt(), { seq: 2 }));
    });
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    return { connection, store };
  }

  /** A sala que expirou no meio da partida: `ABANDONED`, sem resultado. */
  const abandoned = () =>
    roomMessage({
      status: 'FINISHED',
      gameNo: 1,
      seats: SEATS,
      outcome: { gameNo: 1, result: null, cause: 'ABANDONED' },
    });

  it('room FINISHED → replay → closed 4000: o replay entra na linha antes de a tela de parada desmontar a mesa', () => {
    const { connection, store } = openGate();
    const replay = replayOf('expirou');

    act(() => connection.emitRoom(abandoned()));
    expect(loadPastGames(store)).toHaveLength(1);
    expect(loadPastGames(store)[0]).not.toHaveProperty('replay');

    act(() => connection.emit({ type: 'replay', replay: { t: 'replay', gameNo: 1, replay } }));
    expect(loadPastGames(store)[0]!.replay).toEqual(replay);

    act(() => connection.emitClosed(4000, true));
    // A mesa saiu e a tela de parada entrou; a partida continua na lista, com o replay, para o "Rever".
    expect(screen.getByRole('heading', { name: 'Essa sala não existe mais' })).toBeInTheDocument();
    expect(screen.queryByRole('main', { name: 'Mesa' })).not.toBeInTheDocument();
    expect(loadPastGames(store)).toHaveLength(1);
    expect(loadPastGames(store)[0]).toMatchObject({
      key: `sala:${CODE}:1`,
      outcome: { gameNo: 1, result: null, cause: 'ABANDONED' },
      replay,
    });
  });
});
