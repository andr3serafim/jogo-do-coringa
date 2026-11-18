// A abertura (decisoes.md 2026-11-16 (5)) chega num pedaço à parte, fora do JavaScript inicial; enquanto ele não chega, uma capa escura
// cobre o menu. Se o `import()` falhar (a rede caiu, o deploy novo tirou o arquivo velho), a abertura é enfeite: a capa sai e o menu abre,
// sem erro na tela. Arquivo à parte porque o `vi.mock` vale para o arquivo inteiro.
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { fakeApi } from './support.tsx';

vi.mock('../../src/ui/intro/Intro.tsx', () => {
  throw new Error('Failed to fetch dynamically imported module: Intro');
});

beforeEach(() => {
  window.localStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<App intro />: o pedaço da abertura não chega', () => {
  it('a capa escura cobre o menu enquanto espera; com a falha, ela sai e o menu abre e funciona', async () => {
    const { container } = render(<App api={fakeApi()} intro />);
    expect(container.querySelector('[data-abertura-capa]')).not.toBeNull();
    expect(screen.getByRole('heading', { name: /Jogo do Coringa/ }).closest('[inert]')).not.toBeNull();

    await waitFor(() => expect(container.querySelector('[data-abertura-capa]')).toBeNull());
    expect(container.querySelector('[inert]')).toBeNull();
    expect(screen.queryByRole('heading', { name: 'Algo deu errado' })).toBeNull();
    await userEvent.click(screen.getByRole('link', { name: /^Partidas anteriores/ }));
    expect(window.location.pathname).toBe('/partidas');
  });
});
