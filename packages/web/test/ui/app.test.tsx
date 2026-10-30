import { RULES_VERSION } from '@coringa/engine';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { ErrorBoundary } from '../../src/app/ErrorBoundary.tsx';
import { lazyScreen, ScreenBoundary } from '../../src/app/lazy-screen.tsx';
import { navigate } from '../../src/app/router.ts';
import { recordPastGame } from '../../src/model/past-games.ts';
import { safeStore } from '../../src/model/storage.ts';
import { STORAGE_WARNING } from '../../src/ui/text.ts';
import { realReplay } from '../fixtures.ts';
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

  it('/partidas lista a partida guardada, "Rever" abre o replay dela, e outro id recomeça do passo 0', async () => {
    const store = safeStore(window.localStorage).store;
    const replay = realReplay('app-1');
    const game = (name: string, now: number) =>
      recordPastGame(
        store,
        {
          date: new Date(2026, 9, 25, 14, 30).getTime(),
          mode: { kind: 'training', level: 'medio' },
          seat: 'p1',
          names: { me: 'Ana', opponent: name },
          outcome: { gameNo: 1, cause: 'NORMAL', result: { kind: 'WIN', winner: 'p1', reason: 'HP' } },
          rounds: 9,
          score: { p1: 1, p2: 0 },
          rulesVersion: RULES_VERSION,
          replay,
        },
        now,
      )!;
    const first = game('Duda', 1_000);
    const second = game('Bia', 2_000);
    window.history.replaceState(null, '', '/partidas');
    render(<App api={fakeApi()} />);

    const rows = await screen.findAllByRole('button', { name: 'Rever' });
    expect(rows).toHaveLength(2);
    await userEvent.click(rows[1]!); // a mais velha: a primeira gravada
    expect(window.location.pathname).toBe(`/partidas/${first.id}`);
    expect(await screen.findByRole('region', { name: 'Campo de Duda' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Próximo passo' }));
    expect(screen.getByText(/^Passo 1 de \d+$/)).toBeInTheDocument();

    act(() => navigate(`/partidas/${second.id}`));
    expect(await screen.findByRole('region', { name: 'Campo de Bia' })).toBeInTheDocument();
    expect(screen.getByText(/^Passo 0 de \d+$/)).toBeInTheDocument();
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

describe('as telas sob demanda: o import que falha', () => {
  const LOAD_FAILED = 'Não deu para abrir esta tela. Atualize a página.';

  beforeEach(() => {
    // O React registra o erro capturado no console; o teste não precisa dele.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  const chunkFailure = () => Promise.reject(new Error('Failed to fetch dynamically imported module: /assets/PastGames-x1y2z3.js'));

  function screens(Screen: ReturnType<typeof lazyScreen>, reload: () => void = () => undefined) {
    return (
      <ErrorBoundary reload={reload}>
        <ScreenBoundary reload={reload}>
          <Suspense fallback={<p role="status">Carregando…</p>}>
            <Screen />
          </Suspense>
        </ScreenBoundary>
      </ErrorBoundary>
    );
  }

  it('mostra "Não deu para abrir esta tela. Atualize a página." com o botão "Atualizar", e não o erro genérico', async () => {
    const reload = vi.fn();
    render(screens(lazyScreen(chunkFailure), reload));
    expect(await screen.findByText(LOAD_FAILED)).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Algo deu errado' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Copiar diagnóstico' })).not.toBeInTheDocument();

    expect(reload).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole('button', { name: 'Atualizar' }));
    expect(reload).toHaveBeenCalledOnce();
  });

  it('enquanto o import não termina, o "Carregando…" segue valendo, e a tela chega quando termina', async () => {
    const Ok = lazyScreen(async () => ({ default: () => <p>a tela chegou</p> }));
    render(screens(Ok));
    expect(await screen.findByText('a tela chegou')).toBeInTheDocument();
    expect(screen.queryByText(LOAD_FAILED)).not.toBeInTheDocument();
  });

  it('uma tela que chegou e quebra ao desenhar segue para o "Algo deu errado" do app, sem o aviso do import', async () => {
    const Bomb = lazyScreen(async () => ({
      default: (): never => {
        throw new Error('quebrou ao desenhar');
      },
    }));
    render(screens(Bomb));
    expect(await screen.findByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();
    expect(screen.queryByText(LOAD_FAILED)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Atualizar' })).not.toBeInTheDocument();
  });

  it('um erro de fora do import dentro da fronteira (nada a ver com o chunk) também segue para o app', () => {
    function Bomb(): never {
      throw new Error('quebrou');
    }
    render(
      <ErrorBoundary>
        <ScreenBoundary>
          <Bomb />
        </ScreenBoundary>
      </ErrorBoundary>,
    );
    expect(screen.getByRole('heading', { name: 'Algo deu errado' })).toBeInTheDocument();
    expect(screen.queryByText(LOAD_FAILED)).not.toBeInTheDocument();
  });

  it('sem violações sérias de acessibilidade, e com um título de tela', async () => {
    const { container } = render(screens(lazyScreen(chunkFailure)));
    expect(await screen.findByRole('heading', { name: 'Partidas anteriores' })).toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);
  });
});
