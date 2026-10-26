// A lista das partidas anteriores (`/partidas`, spec do polimento §4.3): vazia, na ordem, o resultado do ponto de vista do seu
// assento, o modo e o "Rever" só quando há replay.
import { RULES_VERSION, type PlayerId } from '@coringa/engine';
import type { Outcome } from '@coringa/protocol';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { PAST_GAMES_KEY, recordPastGame, type PastGame } from '../../src/model/past-games.ts';
import PastGames from '../../src/ui/screens/PastGames.tsx';
import { realReplay } from '../fixtures.ts';
import { memoryStore, seriousViolations } from './support.tsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/partidas');
});

const REPLAY = realReplay('lista-1');
const WIN = (winner: PlayerId): Outcome => ({ gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner, reason: 'HP' } });

type Entry = Omit<PastGame, 'id'>;

/** Uma partida do treino, sem replay. A data é local (`new Date(a, m, d, h, min)`): o texto "dd/mm, hh:mm" não depende do fuso. */
function entry(extra: Partial<Entry> = {}): Entry {
  return {
    date: new Date(2026, 9, 25, 14, 30).getTime(),
    mode: { kind: 'training', level: 'medio' },
    seat: 'p1',
    names: { me: 'Ana', opponent: 'Duda' },
    outcome: WIN('p1'),
    rounds: 12,
    score: { p1: 1, p2: 0, draws: 0 },
    rulesVersion: RULES_VERSION,
    ...extra,
  };
}

/** Grava as partidas na ordem dada (a última gravada fica no topo) e devolve o armazenamento. */
function stored(...entries: Entry[]) {
  const store = memoryStore();
  const games = entries.map((item, i) => recordPastGame(store, item, 1_000 + i)!);
  return { store, games };
}

const rows = () => within(screen.getByRole('list')).getAllByRole('listitem');

describe('<PastGames />: a lista', () => {
  it('sem partidas: o texto de vazia e o caminho de volta', async () => {
    render(<PastGames store={memoryStore()} />);
    expect(screen.getByRole('heading', { name: 'Partidas anteriores' })).toBeInTheDocument();
    expect(screen.getByText('Nenhuma partida terminada neste navegador.')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: 'Voltar ao início' }));
    expect(window.location.pathname).toBe('/');
  });

  it('um armazenamento estragado também é lista vazia, sem quebrar', () => {
    const store = memoryStore();
    store.set(PAST_GAMES_KEY, '{isto não é JSON');
    render(<PastGames store={store} />);
    expect(screen.getByText('Nenhuma partida terminada neste navegador.')).toBeInTheDocument();
  });

  it('as linhas vêm da mais nova para a mais velha, cada uma com data, adversário, resultado e modo', () => {
    const { store } = stored(
      entry({ date: new Date(2026, 9, 24, 9, 5).getTime(), names: { me: 'Ana', opponent: 'Bia' }, mode: { kind: 'training', level: 'facil' } }),
      entry({ date: new Date(2026, 9, 25, 14, 30).getTime(), names: { me: 'Ana', opponent: 'Duda' }, mode: { kind: 'online', code: 'ABC234' }, outcome: WIN('p2') }),
    );
    render(<PastGames store={store} />);

    const [newest, oldest] = rows();
    expect(newest).toHaveTextContent('25/10, 14:30');
    expect(newest).toHaveTextContent('contra Duda');
    expect(newest).toHaveTextContent('Derrota');
    expect(newest).toHaveTextContent('Sala ABC234');
    expect(oldest).toHaveTextContent('24/10, 09:05');
    expect(oldest).toHaveTextContent('contra Bia');
    expect(oldest).toHaveTextContent('Vitória');
    expect(oldest).toHaveTextContent('Treino · Fácil');
    expect(rows()).toHaveLength(2);
  });

  it('o resultado é do ponto de vista do seu assento: no p2, a vitória do p2 é sua', () => {
    const { store } = stored(
      entry({ seat: 'p2', outcome: WIN('p2') }),
      entry({ seat: 'p2', outcome: WIN('p1') }),
      entry({ seat: 'p2', outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'DRAW', reason: 'ANTI_STALL' } } }),
      entry({ seat: 'p2', outcome: { gameNo: 1, cause: 'ABANDONED', result: null } }),
    );
    render(<PastGames store={store} />);
    // Do mais novo para o mais velho: sem resultado, empate, derrota, vitória.
    const [none, draw, loss, win] = rows();
    expect(none).toHaveTextContent('Sem resultado');
    expect(draw).toHaveTextContent('Empate');
    expect(loss).toHaveTextContent('Derrota');
    expect(win).toHaveTextContent('Vitória');
  });

  it('"Rever" só existe nas partidas com replay, e leva ao visualizador', async () => {
    const { store, games } = stored(entry(), entry({ replay: REPLAY }));
    render(<PastGames store={store} />);
    const [withReplay, without] = rows();
    expect(within(without!).queryByRole('button', { name: 'Rever' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Rever' })).toHaveLength(1);

    await userEvent.click(within(withReplay!).getByRole('button', { name: 'Rever' }));
    expect(window.location.pathname).toBe(`/partidas/${games[1]!.id}`);
  });

  it('o "Rever" é descrito pela linha: o leitor de tela sabe de qual partida é', () => {
    const { store } = stored(entry({ replay: REPLAY }));
    render(<PastGames store={store} />);
    expect(screen.getByRole('button', { name: 'Rever' })).toHaveAccessibleDescription(/25\/10, 14:30.*Duda/);
  });

  it('uma partida de 20 mostra as 20, sem quebrar', () => {
    const { store } = stored(...Array.from({ length: 20 }, (_, i) => entry({ names: { me: 'Ana', opponent: `Bot${i}` } })));
    render(<PastGames store={store} />);
    expect(rows()).toHaveLength(20);
    expect(rows()[0]).toHaveTextContent('contra Bot19');
  });

  it('um apelido vazio (entrada estragada) vira "Oponente"', () => {
    const { store } = stored(entry({ names: { me: '', opponent: '' } }));
    render(<PastGames store={store} />);
    expect(rows()[0]).toHaveTextContent('contra Oponente');
  });

  it('sem violações sérias de acessibilidade, vazia ou cheia', async () => {
    const empty = render(<PastGames store={memoryStore()} />);
    expect(await seriousViolations(empty.container)).toEqual([]);
    empty.unmount();

    const { store } = stored(entry({ replay: REPLAY }), entry());
    const full = render(<PastGames store={store} />);
    expect(await seriousViolations(full.container)).toEqual([]);
  });
});
