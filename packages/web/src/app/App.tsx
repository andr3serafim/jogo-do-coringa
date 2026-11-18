// Casca da interface: o `Storage`, a porta do servidor e o controlador de som nascem aqui, uma vez, e a rota escolhe a tela
// (spec §2.1). O som chega às telas pelo `SoundContext`; os ouvintes de gesto do controlador moram no `document`. A abertura do jogo
// (a logo e a intro, `ui/intro/Intro.tsx`) é uma camada por cima do Início, só quando a página abre nele, e chega num pedaço à parte
// (`intro-loader.ts`): até ele chegar, uma capa escura cobre o menu.
import { Suspense, useCallback, useEffect, useState, type ComponentType, type ReactNode } from 'react';
import { LEARN_LABEL, SCREEN_LOADING_TEXT } from '../model/copy.ts';
import { skipsIntro } from '../model/intro.ts';
import { introSkipped, loadPrefs, type KeyValueStore } from '../model/storage.ts';
import { SoundController, browserSoundDeps } from '../sound/controller.ts';
import { useReducedMotion } from '../ui/anim/useReducedMotion.ts';
import type { IntroProps } from '../ui/intro/Intro.tsx';
import { IntroBoundary } from '../ui/intro/IntroBoundary.tsx';
import { loadIntro, loadedIntro } from '../ui/intro/intro-loader.ts';
import { Button, Screen } from '../ui/parts.tsx';
import { Home } from '../ui/screens/Home.tsx';
import { NotFound } from '../ui/screens/NotFound.tsx';
import { RoomGate } from '../ui/screens/RoomGate.tsx';
import { Training } from '../ui/screens/Training.tsx';
import { SoundContext } from '../ui/sound-context.ts';
import { STORAGE_WARNING } from '../ui/text.ts';
import { openStore } from './browser-store.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { lazyScreen, ScreenBoundary } from './lazy-screen.tsx';
import { createRoomApi, type RoomApi } from './room-api.ts';
import { parseRoute, useRoute } from './router.ts';

// A lista das partidas e o visualizador do replay chegam sob demanda: nada deles pesa no JavaScript inicial (`scripts/smoke.ts`).
// Se o `import()` falhar, a rota mostra o aviso com "Atualizar" (`lazy-screen.tsx`), e não o erro genérico do app.
const PastGames = lazyScreen(() => import('../ui/screens/PastGames.tsx'));
const ReplayScreen = lazyScreen(() => import('../ui/screens/ReplayScreen.tsx'));
// O tutorial (o painel das dicas, os textos e a semente) também: um pedaço só dele, fora do JavaScript inicial.
const Tutorial = lazyScreen(() => import('../ui/screens/Tutorial.tsx'));

export interface AppProps {
  /** Troca o HTTP e a conexão (testes). O padrão fala com o próprio site. */
  api?: RoomApi;
  /**
   * Mostra a abertura do jogo (decisoes.md 2026-11-16 (5)) quando a página abre no Início. Só o `main.tsx` liga: nos testes, e num
   * `App` solto, o padrão é sem ela.
   */
  intro?: boolean;
}

export function App({ api: injected, intro = false }: AppProps = {}) {
  const [{ store, available }] = useState(() => openStore('local'));
  const [api] = useState(() => injected ?? createRoomApi({ store }));
  const [warned, setWarned] = useState(!available);
  // Um controlador só, com a preferência guardada. Sem gesto não há contexto de áudio nem sintetizador (`controller.ts`).
  const [sound] = useState(() => new SoundController(browserSoundDeps, loadPrefs(store).sound));
  useEffect(() => sound.attach(document), [sound]);
  // A abertura só toca quando a página ABRE no Início: um link de sala, a reconexão, o treino e o replay abrem direto (ninguém espera
  // 5 s com o relógio da partida correndo), e voltar ao Início por dentro do app não a traz de volta. Não há "já vi" guardado; a
  // marca do armazenamento é só dos testes de ponta a ponta (`introSkipped`).
  const [introOpen, setIntroOpen] = useState(() => intro && parseRoute(window.location.pathname).name === 'home' && !introSkipped(store));
  const [menuReducesMotion] = useState(() => loadPrefs(store).reduceMotion);
  const reducedMotion = useReducedMotion(menuReducesMotion);
  const closeIntro = useCallback(() => setIntroOpen(false), []);
  // O pedaço da abertura: já carregado (os testes o carregam antes), ou pedido agora. Se não chegar, a abertura não toca e o menu abre.
  const [introScreen, setIntroScreen] = useState<{ Intro: ComponentType<IntroProps> } | null>(() => {
    const loaded = introOpen ? loadedIntro() : null;
    return loaded === null ? null : { Intro: loaded };
  });
  useEffect(() => {
    if (!introOpen || introScreen !== null) return;
    let live = true;
    loadIntro().then(
      (Intro) => {
        if (live) setIntroScreen({ Intro });
      },
      () => {
        if (live) closeIntro();
      },
    );
    return () => {
      live = false;
    };
  }, [introOpen, introScreen, closeIntro]);
  // Também na capa, as teclas que pulam a abertura (`skipsIntro`) abrem o menu: com a rede lenta, a capa pode durar um segundo ou mais.
  useEffect(() => {
    if (!introOpen || introScreen !== null) return;
    const onKey = (event: KeyboardEvent) => {
      if (!skipsIntro(event)) return;
      event.preventDefault();
      closeIntro();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [introOpen, introScreen, closeIntro]);
  // A abertura toca antes de qualquer gesto: o controlador tenta ligar o áudio, e onde o navegador não deixa ela roda muda.
  useEffect(() => {
    if (introOpen) sound.prime();
    // Só ao abrir: o fim da abertura não tenta de novo.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sound]);

  return (
    <ErrorBoundary>
      <SoundContext value={sound}>
        {/* O app inteiro fica inerte por baixo da abertura (já montado, carregando o que o menu precisa). `contents`: a caixa não existe para o layout. */}
        <div className="contents" inert={introOpen}>
          {warned ? (
            // Um único aviso para o site inteiro, e não um por tela (spec §6.1).
            <aside aria-label="Aviso do navegador" className="flex items-center gap-3 bg-tinta px-4 py-3 text-papel">
              <p className="flex-1">{STORAGE_WARNING}</p>
              <Button variant="secondary" onClick={() => setWarned(false)}>
                Entendi
              </Button>
            </aside>
          ) : null}
          <Routes api={api} store={store} />
        </div>
        {introOpen && introScreen !== null ? (
          <IntroBoundary onError={closeIntro}>
            <introScreen.Intro reduced={reducedMotion} onDone={closeIntro} />
          </IntroBoundary>
        ) : null}
        {/* A capa, enquanto o pedaço da abertura não chega: o escuro de onde a abertura começa. Um toque nela, ou uma tecla, abre o menu. */}
        {introOpen && introScreen === null ? (
          <div data-abertura-capa="" aria-hidden="true" className="fixed inset-0 z-100 bg-tinta" onClick={closeIntro} />
        ) : null}
      </SoundContext>
    </ErrorBoundary>
  );
}

function Routes({ api, store }: { api: RoomApi; store: KeyValueStore }) {
  const route = useRoute();
  switch (route.name) {
    case 'home':
      return <Home api={api} store={store} />;
    case 'room':
      return <RoomGate code={route.code} api={api} store={store} />;
    case 'training':
      return <Training store={store} />;
    // Uma chave por rota: a falha de uma das telas não segue para a outra quando o jogador navega entre elas.
    case 'tutorial':
      return (
        <LazyRoute key="tutorial" title={LEARN_LABEL}>
          <Tutorial store={store} />
        </LazyRoute>
      );
    case 'pastGames':
      return (
        <LazyRoute key="pastGames">
          <PastGames store={store} />
        </LazyRoute>
      );
    case 'pastGame':
      return (
        <LazyRoute key="pastGame">
          <ReplayScreen key={route.id} store={store} id={route.id} />
        </LazyRoute>
      );
    case 'notFound':
      return <NotFound />;
  }
}

/** Uma tela sob demanda: "Carregando…" até o pedaço chegar, e o aviso de falha se ele não chegar. */
function LazyRoute({ children, title }: { children: ReactNode; title?: string }) {
  return (
    <ScreenBoundary title={title}>
      <Suspense fallback={<ScreenLoading />}>{children}</Suspense>
    </ScreenBoundary>
  );
}

function ScreenLoading() {
  return (
    <Screen>
      <p role="status">{SCREEN_LOADING_TEXT}</p>
    </Screen>
  );
}
