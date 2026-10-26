// O inverso de `app-chunk-past-games-fails.test.tsx` (spec do polimento, fatia 3): só o `import()` do visualizador do replay
// falha, e o da lista chega. Quem navega do replay que falhou para a lista não herda o aviso: a `key` de cada rota dá uma
// fronteira nova. Arquivo à parte pelo mesmo motivo: o `vi.mock` vale para o arquivo inteiro.
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { navigate } from '../../src/app/router.ts';
import { PAST_GAMES_EMPTY_TEXT } from '../../src/model/past-games-copy.ts';
import { fakeApi } from './support.tsx';

vi.mock('../../src/ui/screens/ReplayScreen.tsx', () => {
  throw new Error('Failed to fetch dynamically imported module: ReplayScreen');
});

const LOAD_FAILED = 'Não deu para abrir esta tela. Atualize a página.';

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
  // O React registra o erro capturado no console; o teste não precisa dele.
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<App />: o visualizador não chega e a lista chega', () => {
  it('ReplayScreen falha e PastGames carrega: do replay que falhou para a lista, o aviso some e a tela abre', async () => {
    window.history.replaceState(null, '', '/partidas/lz3k9a');
    render(<App api={fakeApi()} />);
    expect(await screen.findByText(LOAD_FAILED)).toBeInTheDocument();

    // A lista de verdade carregou: sem partidas guardadas, ela diz que não há nenhuma.
    act(() => navigate('/partidas'));
    expect(await screen.findByText(PAST_GAMES_EMPTY_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(LOAD_FAILED)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atualizar' })).not.toBeInTheDocument();
  });

  it('e a volta: da lista que chegou para o replay que falha, o aviso volta', async () => {
    window.history.replaceState(null, '', '/partidas');
    render(<App api={fakeApi()} />);
    expect(await screen.findByText(PAST_GAMES_EMPTY_TEXT)).toBeInTheDocument();

    act(() => navigate('/partidas/lz3k9a'));
    expect(await screen.findByText(LOAD_FAILED)).toBeInTheDocument();
    expect(screen.queryByText(PAST_GAMES_EMPTY_TEXT)).not.toBeInTheDocument();
  });
});
