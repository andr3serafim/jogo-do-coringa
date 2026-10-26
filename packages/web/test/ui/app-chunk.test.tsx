// A fronteira das telas sob demanda dentro do `App` (spec do polimento, fatia 3): com o `import()` das duas telas das partidas
// falhando (o deploy novo tirou o chunk velho, a rede caiu), a rota mostra o aviso e o "Atualizar", e o resto do site segue
// funcionando. Arquivo à parte: o `vi.mock` vale para o arquivo inteiro, e o `lazy` do `App` guarda o primeiro resultado no
// módulo, então estes testes não cabem no `app.test.tsx`, em que as mesmas telas chegam de verdade.
import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { navigate } from '../../src/app/router.ts';
import { fakeApi, seriousViolations } from './support.tsx';

vi.mock('../../src/ui/screens/PastGames.tsx', () => {
  throw new Error('Failed to fetch dynamically imported module: PastGames');
});
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

describe('<App />: uma tela das partidas que não chega', () => {
  it('/partidas mostra o aviso com "Atualizar", e não o "Algo deu errado"', async () => {
    window.history.replaceState(null, '', '/partidas');
    const { container } = render(<App api={fakeApi()} />);
    expect(await screen.findByText(LOAD_FAILED)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Algo deu errado' })).not.toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('/partidas/<id> também', async () => {
    window.history.replaceState(null, '', '/partidas/lz3k9a');
    render(<App api={fakeApi()} />);
    expect(await screen.findByText(LOAD_FAILED)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Atualizar' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Algo deu errado' })).not.toBeInTheDocument();
  });

  it('o resto do site segue de pé: sair da rota que falhou abre a outra tela', async () => {
    window.history.replaceState(null, '', '/partidas');
    render(<App api={fakeApi()} />);
    expect(await screen.findByText(LOAD_FAILED)).toBeInTheDocument();

    act(() => navigate('/'));
    expect(screen.getByRole('heading', { name: 'Jogo do Coringa' })).toBeInTheDocument();
    expect(screen.queryByText(LOAD_FAILED)).not.toBeInTheDocument();
  });
});
