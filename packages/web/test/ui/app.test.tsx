import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { navigate } from '../../src/app/router.ts';
import { STORAGE_WARNING } from '../../src/ui/text.ts';
import { CODE, fakeApi, seriousViolations } from './support.tsx';

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  window.history.replaceState(null, '', '/');
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<App />: rotas', () => {
  it('/ desenha o início, com o título do jogo', () => {
    render(<App api={fakeApi()} />);
    expect(screen.getByRole('heading', { name: /Jogo do Coringa/ })).toBeInTheDocument();
    expect(screen.queryByText(STORAGE_WARNING)).not.toBeInTheDocument();
  });

  it('/s/<código> abre a entrada na sala; trocar de código recomeça', async () => {
    window.history.replaceState(null, '', `/s/${CODE.toLowerCase()}`);
    const api = fakeApi();
    render(<App api={api} />);
    expect(await screen.findByLabelText('Seu apelido')).toBeInTheDocument();
    expect(api.info).toHaveBeenCalledExactlyOnceWith(CODE);

    act(() => navigate('/s/7KQ2MD'));
    expect(await screen.findByLabelText('Seu apelido')).toBeInTheDocument();
    expect(api.info).toHaveBeenLastCalledWith('7KQ2MD');
  });

  it('/s/<lixo> mostra "Código inválido"', () => {
    window.history.replaceState(null, '', '/s/oi');
    render(<App api={fakeApi()} />);
    expect(screen.getByRole('heading', { name: 'Código inválido' })).toBeInTheDocument();
  });

  it('o botão "Treinar contra o bot" do início leva à mesa do treino', async () => {
    // Sem `?semente=` o navegador sorteia a partida; o sorteio é fixo aqui, como todo o aleatório dos testes.
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((array: Uint32Array) => {
      array[0] = 123_456_789;
      return array;
    }) as typeof crypto.getRandomValues);
    render(<App api={fakeApi()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Treinar contra o bot' }));
    expect(window.location.pathname).toBe('/treino');
    // Sem `?nivel=`, o treino pergunta o nível antes da mesa.
    await userEvent.click(await screen.findByRole('button', { name: /^Médio/ }));
    expect(await screen.findByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Campo de Bot' })).toBeInTheDocument();
    expect(screen.getByText('Treino · Médio, sem relógio')).toBeInTheDocument();
  });

  it('/partidas e /partidas/<id> chegam pelo carregamento sob demanda, com "Carregando…" até a tela chegar', async () => {
    window.history.replaceState(null, '', '/partidas');
    const { container } = render(<App api={fakeApi()} />);
    expect(screen.getByRole('status')).toHaveTextContent('Carregando…');
    expect(await screen.findByRole('heading', { name: 'Partidas anteriores' })).toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);

    act(() => navigate('/partidas/lz3k9a'));
    expect(await screen.findByRole('link', { name: 'Voltar à lista' })).toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);

    await userEvent.click(screen.getByRole('link', { name: 'Voltar à lista' }));
    expect(window.location.pathname).toBe('/partidas');
    expect(await screen.findByRole('heading', { name: 'Partidas anteriores' })).toBeInTheDocument();
  });

  it('um id fora do formato em /partidas/<id> é "Página não encontrada"', () => {
    window.history.replaceState(null, '', '/partidas/Oi.Mundo');
    render(<App api={fakeApi()} />);
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
  });

  it('qualquer outra rota: "Página não encontrada", com link para o início', async () => {
    window.history.replaceState(null, '', '/nada/aqui');
    const { container } = render(<App api={fakeApi()} />);
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);

    await userEvent.click(screen.getByRole('link', { name: 'Voltar ao início' }));
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Jogo do Coringa' })).toBeInTheDocument();
  });

  it('o botão voltar do navegador troca a tela', () => {
    render(<App api={fakeApi()} />);
    act(() => navigate('/treino?semente=t1'));
    expect(screen.getByRole('status')).toHaveTextContent('Preparando o treino…');
    act(() => {
      window.history.replaceState(null, '', '/');
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
    expect(screen.getByRole('heading', { name: 'Jogo do Coringa' })).toBeInTheDocument();
  });

  it('o App sem props monta a API de verdade (sem tocar na rede ao abrir o início)', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Jogo do Coringa' })).toBeInTheDocument();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});

describe('<App />: sem armazenamento do navegador', () => {
  const failing = (): Storage => {
    const fail = (): never => {
      throw new Error('bloqueado');
    };
    return { getItem: fail, setItem: fail, removeItem: fail, clear: fail, key: fail, length: 0 };
  };
  const throwingGetter = () =>
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
  const throwingStorage = () => vi.spyOn(window, 'localStorage', 'get').mockReturnValue(failing());

  it.each([
    ['o getter de localStorage lança', throwingGetter],
    ['o Storage existe, mas lança', throwingStorage],
  ])('%s: o aviso aparece uma única vez, em qualquer tela', async (_name, block) => {
    block();
    const { container } = render(<App api={fakeApi()} />);
    expect(screen.getAllByText(STORAGE_WARNING)).toHaveLength(1);

    act(() => navigate('/treino?semente=t1'));
    act(() => navigate('/nada'));
    act(() => navigate('/'));
    expect(screen.getAllByText(STORAGE_WARNING)).toHaveLength(1);
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('o aviso pode ser dispensado', async () => {
    throwingStorage();
    render(<App api={fakeApi()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(screen.queryByText(STORAGE_WARNING)).not.toBeInTheDocument();
  });

  it('o jogo funciona sem armazenamento: criar sala leva à sala, que conecta com o assento da memória', async () => {
    throwingStorage();
    const api = fakeApi();
    render(<App api={api} />);
    await userEvent.type(screen.getByLabelText('Seu apelido'), 'Duda');
    await userEvent.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(window.location.pathname).toBe(`/s/${CODE}`);
    expect(await screen.findByRole('region', { name: 'Sala' })).toBeInTheDocument();
    expect(api.info).not.toHaveBeenCalled();
  });
});
