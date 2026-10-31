// A lista das partidas anteriores (`/partidas`, spec do polimento §4.3): vazia, na ordem, o resultado do ponto de vista do seu
// assento, o modo e o "Rever" só quando há replay.
import { RULES_VERSION, type PlayerId } from '@coringa/engine';
import type { Outcome } from '@coringa/protocol';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { loadPastGames, PAST_GAMES_KEY, recordPastGame, type PastGame } from '../../src/model/past-games.ts';
import { safeStore } from '../../src/model/storage.ts';
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
    score: { p1: 1, p2: 0 },
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

describe('<PastGames />: o foco', () => {
  const title = () => screen.getByRole('heading', { name: 'Partidas anteriores' });

  it('abre com o foco no título da tela, vazia ou cheia', () => {
    const empty = render(<PastGames store={memoryStore()} />);
    expect(title()).toHaveFocus();
    empty.unmount();

    const { store } = stored(entry({ replay: REPLAY }), entry());
    render(<PastGames store={store} />);
    expect(title()).toHaveFocus();
  });

  it('o título só é focável por código (fora da ordem do Tab) e o foco não rola a página', () => {
    const focus = vi.spyOn(HTMLElement.prototype, 'focus');
    render(<PastGames store={memoryStore()} />);
    expect(title()).toHaveAttribute('tabindex', '-1');
    expect(focus).toHaveBeenCalledWith({ preventScroll: true });
    focus.mockRestore();
  });

  it('redesenhar a lista não devolve o foco ao título', async () => {
    const { store } = stored(entry({ replay: REPLAY }));
    const { rerender } = render(<PastGames store={store} />);
    const button = screen.getByRole('button', { name: 'Voltar ao início' });
    button.focus();
    expect(button).toHaveFocus();
    rerender(<PastGames store={store} />);
    expect(button).toHaveFocus();
    expect(title()).not.toHaveFocus();
  });
});

describe('<PastGames />: apagar', () => {
  const title = () => screen.getByRole('heading', { name: 'Partidas anteriores' });
  const deleteIn = (row: HTMLElement) => within(row).getByRole('button', { name: 'Apagar' });
  const dialog = (name: string) => screen.getByRole('dialog', { name });
  const opponents = () => rows().map((row) => within(row).getByText(/^contra /).textContent);
  /** Três partidas, contra A (a mais velha), B e C (a mais nova, no topo). */
  const three = () => stored(...['A', 'B', 'C'].map((opponent) => entry({ names: { me: 'Ana', opponent } })));

  it('cada linha tem "Apagar", descrito pela linha; "Apagar o histórico" só existe com partidas', () => {
    const empty = render(<PastGames store={memoryStore()} />);
    expect(screen.queryByRole('button', { name: 'Apagar o histórico' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apagar' })).not.toBeInTheDocument();
    empty.unmount();

    const { store } = stored(entry({ replay: REPLAY }), entry());
    render(<PastGames store={store} />);
    expect(screen.getAllByRole('button', { name: 'Apagar' })).toHaveLength(2);
    expect(deleteIn(rows()[0]!)).toHaveAccessibleDescription(/25\/10, 14:30.*Duda/);
    expect(screen.getByRole('button', { name: 'Apagar o histórico' })).toBeInTheDocument();
  });

  it('"Apagar" pede confirmação dizendo qual partida é; Cancelar não apaga nada, e o foco volta ao botão', async () => {
    const { store } = stored(entry({ replay: REPLAY }));
    render(<PastGames store={store} />);
    const button = deleteIn(rows()[0]!);
    await userEvent.click(button);
    const confirm = dialog('Apagar esta partida?');
    expect(confirm).toHaveAccessibleDescription(
      'A partida contra Duda de 25/10, 14:30 (Vitória) some deste navegador, junto com o replay. Não dá para desfazer.',
    );
    // O foco cai no gesto seguro.
    expect(within(confirm).getByRole('button', { name: 'Cancelar' })).toHaveFocus();

    await userEvent.click(within(confirm).getByRole('button', { name: 'Cancelar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(rows()).toHaveLength(1);
    expect(loadPastGames(store)).toHaveLength(1);
    expect(button).toHaveFocus();
  });

  it('o Esc também cancela', async () => {
    const { store } = stored(entry());
    render(<PastGames store={store} />);
    await userEvent.click(deleteIn(rows()[0]!));
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(loadPastGames(store)).toHaveLength(1);
  });

  it('confirmar apaga só aquela partida, avisa e leva o foco ao "Apagar" da linha que tomou o lugar dela', async () => {
    const { store } = three();
    render(<PastGames store={store} />);
    expect(opponents()).toEqual(['contra C', 'contra B', 'contra A']);

    await userEvent.click(deleteIn(rows()[1]!));
    await userEvent.click(within(dialog('Apagar esta partida?')).getByRole('button', { name: 'Apagar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opponents()).toEqual(['contra C', 'contra A']);
    expect(loadPastGames(store).map((game) => game.names.opponent)).toEqual(['C', 'A']);
    expect(screen.getByRole('status')).toHaveTextContent('Partida apagada.');
    expect(deleteIn(rows()[1]!)).toHaveFocus();
  });

  it('apagar a última linha leva o foco à anterior; apagar a única, ao título', async () => {
    const { store } = stored(entry({ names: { me: 'Ana', opponent: 'A' } }), entry({ names: { me: 'Ana', opponent: 'B' } }));
    render(<PastGames store={store} />);
    await userEvent.click(deleteIn(rows()[1]!));
    await userEvent.click(within(dialog('Apagar esta partida?')).getByRole('button', { name: 'Apagar' }));
    expect(opponents()).toEqual(['contra B']);
    expect(deleteIn(rows()[0]!)).toHaveFocus();

    await userEvent.click(deleteIn(rows()[0]!));
    await userEvent.click(within(dialog('Apagar esta partida?')).getByRole('button', { name: 'Apagar' }));
    expect(screen.getByText('Nenhuma partida terminada neste navegador.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Apagar o histórico' })).not.toBeInTheDocument();
    expect(title()).toHaveFocus();
    expect(store.get(PAST_GAMES_KEY)).toBeNull();
  });

  it('"Apagar o histórico": Cancelar guarda tudo; confirmar esvazia a lista, avisa e leva o foco ao título', async () => {
    const { store } = three();
    store.set('coringa:tutorial', 'done');
    render(<PastGames store={store} />);
    const clear = screen.getByRole('button', { name: 'Apagar o histórico' });

    await userEvent.click(clear);
    expect(dialog('Apagar o histórico?')).toHaveAccessibleDescription(
      'As 3 partidas guardadas neste navegador somem. Não dá para desfazer.',
    );
    await userEvent.click(within(dialog('Apagar o histórico?')).getByRole('button', { name: 'Cancelar' }));
    expect(rows()).toHaveLength(3);
    expect(clear).toHaveFocus();

    await userEvent.click(clear);
    await userEvent.click(within(dialog('Apagar o histórico?')).getByRole('button', { name: 'Apagar' }));
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.getByText('Nenhuma partida terminada neste navegador.')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('Histórico apagado.');
    expect(title()).toHaveFocus();
    expect(store.get(PAST_GAMES_KEY)).toBeNull();
    // Só a lista sai: o resto do que o jogo guarda fica.
    expect(store.get('coringa:tutorial')).toBe('done');
  });

  it('o navegador que recusa a escrita: a partida continua na tela e no armazenamento, e o aviso diz que não deu', async () => {
    const disk = new Map<string, string>();
    let refuse = false;
    const raw: Storage = {
      get length() {
        return disk.size;
      },
      clear: () => disk.clear(),
      key: (index) => [...disk.keys()][index] ?? null,
      getItem: (key) => disk.get(key) ?? null,
      removeItem(key) {
        if (refuse && key === PAST_GAMES_KEY) throw new DOMException('bloqueado', 'SecurityError');
        disk.delete(key);
      },
      setItem(key, value) {
        if (refuse && key === PAST_GAMES_KEY) throw new DOMException('cheio', 'QuotaExceededError');
        disk.set(key, value);
      },
    };
    const { store } = safeStore(raw);
    recordPastGame(store, entry({ names: { me: 'Ana', opponent: 'A' } }), 1);
    recordPastGame(store, entry({ names: { me: 'Ana', opponent: 'B' } }), 2);
    refuse = true;
    render(<PastGames store={store} />);

    const button = deleteIn(rows()[0]!);
    await userEvent.click(button);
    await userEvent.click(within(dialog('Apagar esta partida?')).getByRole('button', { name: 'Apagar' }));
    expect(opponents()).toEqual(['contra B', 'contra A']);
    expect(screen.getByRole('status')).toHaveTextContent('O navegador não deixou apagar. Tente de novo.');
    expect(button).toHaveFocus();

    await userEvent.click(screen.getByRole('button', { name: 'Apagar o histórico' }));
    await userEvent.click(within(dialog('Apagar o histórico?')).getByRole('button', { name: 'Apagar' }));
    expect(rows()).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent('O navegador não deixou apagar. Tente de novo.');
    // O que a tela mostra é o que um recarregar mostraria.
    expect(loadPastGames(safeStore(raw).store)).toHaveLength(2);
  });

  it('abrir uma confirmação nova tira o aviso da anterior', async () => {
    const { store } = three();
    render(<PastGames store={store} />);
    await userEvent.click(deleteIn(rows()[0]!));
    await userEvent.click(within(dialog('Apagar esta partida?')).getByRole('button', { name: 'Apagar' }));
    expect(screen.getByRole('status')).toHaveTextContent('Partida apagada.');
    await userEvent.click(deleteIn(rows()[0]!));
    expect(screen.getByRole('status')).toBeEmptyDOMElement();
  });

  it('sem violações sérias de acessibilidade com a confirmação aberta', async () => {
    const { store } = stored(entry({ replay: REPLAY }), entry());
    const view = render(<PastGames store={store} />);
    await userEvent.click(deleteIn(rows()[0]!));
    expect(await seriousViolations(view.container)).toEqual([]);
    await userEvent.click(within(dialog('Apagar esta partida?')).getByRole('button', { name: 'Cancelar' }));
    await userEvent.click(screen.getByRole('button', { name: 'Apagar o histórico' }));
    expect(await seriousViolations(view.container)).toEqual([]);
  });
});
