// A mesa grava a partida terminada na lista local (spec do polimento §4.1): uma linha por partida, no instante em que a sala
// vira FINISHED, com o replay quando a conexão o entregou antes (o treino). A mesa é a `PlayTable` sobre uma `Session` de
// verdade com uma `FakeConnection`; o armazenamento recusar nunca pode quebrar o painel de fim.
import { RULES_VERSION, makeConfig, type GameResult, type PlayerId, type Replay } from '@coringa/engine';
import type { RoomMessage, Score } from '@coringa/protocol';
import { act, render, screen } from '@testing-library/react';
import { StrictMode, type ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TrainingLevel } from '../../src/model/local-room.ts';
import { loadPastGames, PAST_GAMES_KEY } from '../../src/model/past-games.ts';
import type { KeyValueStore } from '../../src/model/storage.ts';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { advance, cleanup, connect, emit, EXODIA, EXODIA_OVER, seatOf, THEIRS } from './anim-harness.tsx';
import { CODE, memoryStore, roomMessage } from './support.tsx';

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

function mount(options: MountOptions = {}) {
  const m = connect(
    THEIRS,
    options.finished
      ? {
          room: {
            status: 'FINISHED',
            seats: SEATS,
            score: { p1: 1, p2: 0, draws: 0 },
            outcome: { gameNo: 1, result: win('p1'), cause: 'NORMAL' },
          },
        }
      : {},
  );
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
  /** O replay que a conexão entrega antes do `room` em FINISHED (o treino). */
  replay?: Replay;
  /** O assento de quem joga recebe revanche pedida (a sala reemite o `room` com o mesmo `gameNo`). */
  mineWants?: boolean;
}

/** Como a `LocalRoom`: o `replay` primeiro, o `room` em FINISHED depois, cada um no seu `act`. */
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

  it('não aparece online (a conexão não manda replay nesta fatia) nem no treino sem replay', () => {
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
