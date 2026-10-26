// Casca da interface: o `Storage`, a porta do servidor e o controlador de som nascem aqui, uma vez, e a rota escolhe a tela
// (spec §2.1). O som chega às telas pelo `SoundContext`; os ouvintes de gesto do controlador moram no `document`.
import { Suspense, useEffect, useState, type ReactNode } from 'react';
import { LEARN_LABEL, SCREEN_LOADING_TEXT } from '../model/copy.ts';
import { loadPrefs, type KeyValueStore } from '../model/storage.ts';
import { SoundController, browserSoundDeps } from '../sound/controller.ts';
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
import { useRoute } from './router.ts';

// A lista das partidas e o visualizador do replay chegam sob demanda: nada deles pesa no JavaScript inicial (`scripts/smoke.ts`).
// Se o `import()` falhar, a rota mostra o aviso com "Atualizar" (`lazy-screen.tsx`), e não o erro genérico do app.
const PastGames = lazyScreen(() => import('../ui/screens/PastGames.tsx'));
const ReplayScreen = lazyScreen(() => import('../ui/screens/ReplayScreen.tsx'));
// O tutorial (o painel das dicas, os textos e a semente) também: um pedaço só dele, fora do JavaScript inicial.
const Tutorial = lazyScreen(() => import('../ui/screens/Tutorial.tsx'));

export interface AppProps {
  /** Troca o HTTP e a conexão (testes). O padrão fala com o próprio site. */
  api?: RoomApi;
}

export function App({ api: injected }: AppProps = {}) {
  const [{ store, available }] = useState(() => openStore('local'));
  const [api] = useState(() => injected ?? createRoomApi({ store }));
  const [warned, setWarned] = useState(!available);
  // Um controlador só, com a preferência guardada. Sem gesto não há contexto de áudio nem sintetizador (`controller.ts`).
  const [sound] = useState(() => new SoundController(browserSoundDeps, loadPrefs(store).sound));
  useEffect(() => sound.attach(document), [sound]);

  return (
    <ErrorBoundary>
      <SoundContext value={sound}>
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
