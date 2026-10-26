// A `key` por rota das telas sob demanda do `App` (spec do polimento, fatia 3): só o `import()` da lista falha, e o do
// visualizador chega. Quem navega da rota que falhou para a outra não pode herdar a falha: a fronteira de cada rota é nova. Sem a
// `key`, o React reaproveitaria a mesma `ScreenBoundary` (as duas rotas desenham `LazyRoute` no mesmo lugar) e ela seguiria
// mostrando o aviso na tela que chegou. Arquivo à parte: o `vi.mock` vale para o arquivo inteiro, e o `lazy` do `App` guarda o
// primeiro resultado no módulo. O inverso (o visualizador falha, a lista chega) está em `app-chunk-replay-fails.test.tsx`.
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { navigate } from '../../src/app/router.ts';
import { UNKNOWN_GAME_TEXT } from '../../src/model/past-games-copy.ts';
import { fakeApi } from './support.tsx';

vi.mock('../../src/ui/screens/PastGames.tsx', () => {
  throw new Error('Failed to fetch dynamically imported module: PastGames');
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

describe('<App />: a lista não chega e o visualizador chega', () => {
  it('PastGames falha e ReplayScreen carrega: da lista que falhou para o replay, o aviso some e a tela abre', async () => {
    window.history.replaceState(null, '', '/partidas');
    render(<App api={fakeApi()} />);
    expect(await screen.findByText(LOAD_FAILED)).toBeInTheDocument();

    // `/partidas/<id>` desconhecido: o visualizador de verdade carregou e diz que a partida não está mais ali.
    act(() => navigate('/partidas/zzz'));
    expect(await screen.findByText(UNKNOWN_GAME_TEXT)).toBeInTheDocument();
    expect(screen.queryByText(LOAD_FAILED)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atualizar' })).not.toBeInTheDocument();
  });

  it('e a volta: do replay que chegou para a lista que falha, o aviso volta', async () => {
    window.history.replaceState(null, '', '/partidas/zzz');
    render(<App api={fakeApi()} />);
    expect(await screen.findByText(UNKNOWN_GAME_TEXT)).toBeInTheDocument();

    act(() => navigate('/partidas'));
    expect(await screen.findByText(LOAD_FAILED)).toBeInTheDocument();
    expect(screen.queryByText(UNKNOWN_GAME_TEXT)).not.toBeInTheDocument();
  });
});
