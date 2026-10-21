// Casca da interface: o `Storage` e a porta do servidor nascem aqui, uma vez, e a rota escolhe a tela (spec §2.1).
import { useState } from 'react';
import type { KeyValueStore } from '../model/storage.ts';
import { Button } from '../ui/parts.tsx';
import { Home } from '../ui/screens/Home.tsx';
import { NotFound } from '../ui/screens/NotFound.tsx';
import { RoomGate } from '../ui/screens/RoomGate.tsx';
import { Training } from '../ui/screens/Training.tsx';
import { STORAGE_WARNING } from '../ui/text.ts';
import { openStore } from './browser-store.ts';
import { ErrorBoundary } from './ErrorBoundary.tsx';
import { createRoomApi, type RoomApi } from './room-api.ts';
import { useRoute } from './router.ts';

export interface AppProps {
  /** Troca o HTTP e a conexão (testes). O padrão fala com o próprio site. */
  api?: RoomApi;
}

export function App({ api: injected }: AppProps = {}) {
  const [{ store, available }] = useState(() => openStore('local'));
  const [api] = useState(() => injected ?? createRoomApi({ store }));
  const [warned, setWarned] = useState(!available);

  return (
    <ErrorBoundary>
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
    case 'notFound':
      return <NotFound />;
  }
}
