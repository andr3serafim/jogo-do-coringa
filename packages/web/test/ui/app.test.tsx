import { RULES_VERSION } from '@coringa/engine';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Suspense } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { ErrorBoundary } from '../../src/app/ErrorBoundary.tsx';
import { lazyScreen, ScreenBoundary } from '../../src/app/lazy-screen.tsx';
import { navigate } from '../../src/app/router.ts';
import { recordPastGame } from '../../src/model/past-games.ts';
import { INTRO, INTRO_REDUCED } from '../../src/model/intro.ts';
import { safeStore } from '../../src/model/storage.ts';
import { forgetIntro, loadIntro } from '../../src/ui/intro/intro-loader.ts';
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

  it('o menu do início leva à mesa do treino (Treinar, depois Jogar com o bot)', async () => {
    // Sem `?semente=` o navegador sorteia a partida; o sorteio é fixo aqui, como todo o aleatório dos testes.
    vi.spyOn(globalThis.crypto, 'getRandomValues').mockImplementation(((array: Uint32Array) => {
      array[0] = 123_456_789;
      return array;
    }) as typeof crypto.getRandomValues);
    render(<App api={fakeApi()} />);
    await userEvent.click(screen.getByRole('link', { name: 'Treinar' }));
    expect(window.location.pathname).toBe('/treinar');
    await userEvent.click(screen.getByRole('link', { name: 'Jogar com o bot' }));
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
    await userEvent.click(screen.getByRole('link', { name: 'Jogar online' }));
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

describe('<App intro />: a abertura (decisoes.md 2026-11-16 (5))', () => {
  const overlay = (container: HTMLElement) => container.querySelector('[data-abertura]');

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('sem a prop (os testes, um componente solto), não há abertura', () => {
    const { container } = render(<App api={fakeApi()} />);
    expect(overlay(container)).toBeNull();
    expect(container.querySelector('[inert]')).toBeNull();
  });

  it('ao abrir no início, a abertura cobre o menu, que já está montado por baixo e inerte', () => {
    const { container } = render(<App api={fakeApi()} intro />);
    expect(overlay(container)).toHaveAttribute('data-abertura', 'completa');
    const heading = screen.getByRole('heading', { name: /Jogo do Coringa/ });
    expect(heading.closest('[inert]')).not.toBeNull();
    expect(overlay(container)!.closest('[inert]')).toBeNull();
  });

  it('no fim da abertura, o menu fica livre e ela sai da página', () => {
    vi.useFakeTimers();
    const { container } = render(<App api={fakeApi()} intro />);
    act(() => void vi.advanceTimersByTime(INTRO.total));
    expect(overlay(container)).toBeNull();
    expect(container.querySelector('[inert]')).toBeNull();
    expect(screen.getByRole('link', { name: 'Treinar' })).toBeInTheDocument();
  });

  it('pulando com uma tecla, o menu abre em seguida e funciona', async () => {
    const { container } = render(<App api={fakeApi()} intro />);
    await userEvent.keyboard('{Escape}');
    await waitFor(() => expect(overlay(container)).toBeNull());
    await userEvent.click(screen.getByRole('link', { name: 'Partidas anteriores' }));
    expect(window.location.pathname).toBe('/partidas');
  });

  it.each(['/s/oi', '/partidas', '/treino?nivel=medio&semente=abertura', '/rota-que-nao-existe'])('abrindo direto em %s, não há abertura', (path) => {
    window.history.replaceState(null, '', path);
    const { container } = render(<App api={fakeApi()} intro />);
    expect(overlay(container)).toBeNull();
  });

  it('voltar ao início por dentro do app não toca a abertura', () => {
    window.history.replaceState(null, '', '/s/oi');
    const { container } = render(<App api={fakeApi()} intro />);
    act(() => navigate('/'));
    expect(screen.getByRole('heading', { name: /Jogo do Coringa/ })).toBeInTheDocument();
    expect(overlay(container)).toBeNull();
  });

  describe('enquanto o pedaço da abertura não chega', () => {
    afterEach(async () => {
      await loadIntro();
    });

    it('a capa escura cobre o menu, e depois vem a abertura', async () => {
      forgetIntro();
      const { container } = render(<App api={fakeApi()} intro />);
      expect(container.querySelector('[data-abertura-capa]')).not.toBeNull();
      expect(overlay(container)).toBeNull();
      expect(await screen.findByRole('img', { name: 'LUSACAN productions' })).toBeInTheDocument();
      expect(container.querySelector('[data-abertura-capa]')).toBeNull();
    });

    it.each(['Escape', 'Enter', ' '])('a tecla %j na capa abre o menu, e a abertura não toca depois', async (key) => {
      forgetIntro();
      const { container } = render(<App api={fakeApi()} intro />);
      const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true });
      act(() => void window.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(true);
      expect(container.querySelector('[data-abertura-capa]')).toBeNull();
      expect(container.querySelector('[inert]')).toBeNull();
      await loadIntro();
      await act(async () => {});
      expect(overlay(container)).toBeNull();
    });

    it('um atalho na capa (Ctrl+R) não abre o menu nem é engolido', () => {
      forgetIntro();
      const { container } = render(<App api={fakeApi()} intro />);
      const event = new KeyboardEvent('keydown', { key: 'r', ctrlKey: true, bubbles: true, cancelable: true });
      act(() => void window.dispatchEvent(event));
      expect(event.defaultPrevented).toBe(false);
      expect(container.querySelector('[data-abertura-capa]')).not.toBeNull();
    });

    it('um toque na capa abre o menu', () => {
      forgetIntro();
      const { container } = render(<App api={fakeApi()} intro />);
      // síncrono: o pedaço já carregado nos outros testes chega em seguida, e um clique que espera acharia a abertura no lugar da capa
      fireEvent.click(container.querySelector('[data-abertura-capa]')!);
      expect(container.querySelector('[data-abertura-capa]')).toBeNull();
      expect(container.querySelector('[inert]')).toBeNull();
    });
  });

  it('com a marca dos testes de ponta a ponta no armazenamento, não há abertura', () => {
    window.localStorage.setItem('coringa:abertura', 'pular');
    const { container } = render(<App api={fakeApi()} intro />);
    expect(overlay(container)).toBeNull();
  });

  it('com o sistema pedindo menos movimento, é a versão curta', () => {
    vi.stubGlobal('matchMedia', (query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      addEventListener() {},
      removeEventListener() {},
    }));
    vi.useFakeTimers();
    const { container } = render(<App api={fakeApi()} intro />);
    expect(overlay(container)).toHaveAttribute('data-abertura', 'curta');
    act(() => void vi.advanceTimersByTime(INTRO_REDUCED.total));
    expect(overlay(container)).toBeNull();
  });

  it('com "Reduzir movimento" ligado no menu do jogo, também', () => {
    window.localStorage.setItem('coringa:prefs', JSON.stringify({ reduceMotion: true }));
    const { container } = render(<App api={fakeApi()} intro />);
    expect(overlay(container)).toHaveAttribute('data-abertura', 'curta');
  });

  describe('o som', () => {
    /** Um `AudioContext` que só conta as instâncias e nunca sai do suspenso (o navegador que bloqueia o áudio sem gesto). */
    function stubAudioContext() {
      const created: unknown[] = [];
      class BlockedAudioContext {
        state = 'suspended';
        constructor() {
          created.push(this);
        }
        resume() {
          return new Promise<void>(() => {});
        }
        suspend() {
          return Promise.resolve();
        }
      }
      vi.stubGlobal('AudioContext', BlockedAudioContext);
      return created;
    }

    it('a abertura tenta ligar o áudio sem gesto; bloqueado, roda muda até o menu, sem erro', () => {
      const created = stubAudioContext();
      const errors = vi.spyOn(console, 'error').mockImplementation(() => {});
      vi.useFakeTimers();
      const { container } = render(<App api={fakeApi()} intro />);
      expect(created).toHaveLength(1);
      act(() => void vi.advanceTimersByTime(INTRO.total));
      expect(overlay(container)).toBeNull();
      expect(errors).not.toHaveBeenCalled();
    });

    it('sem abertura (outra rota, ou sem a prop), nada de áudio antes do gesto', () => {
      const created = stubAudioContext();
      window.history.replaceState(null, '', '/partidas');
      render(<App api={fakeApi()} intro />);
      expect(created).toHaveLength(0);
    });

    it('com o som desligado nas preferências, a abertura nem tenta', () => {
      const created = stubAudioContext();
      window.localStorage.setItem('coringa:prefs', JSON.stringify({ sound: false }));
      const { container } = render(<App api={fakeApi()} intro />);
      expect(overlay(container)).not.toBeNull();
      expect(created).toHaveLength(0);
    });
  });
});
