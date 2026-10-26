// Roteamento por `history`, sem biblioteca (spec §2.1). O código da sala vai na URL; o token nunca.
import { normalizeCode } from '@coringa/protocol';
import { useMemo, useSyncExternalStore } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'room'; code: string | null }
  | { name: 'training' }
  | { name: 'pastGames' }
  /** `/partidas/<id>`: o replay de uma partida da lista local. O id é só o formato; se a partida existe, quem diz é a tela. */
  | { name: 'pastGame'; id: string }
  | { name: 'notFound' };

/** O id de uma partida guardada (`recordPastGame`): o instante em base 36 e, no mesmo milissegundo, um sufixo `-n`. Sem `%`, sem maiúsculas. */
const PAST_GAME_PATH = /^\/partidas\/([0-9a-z]+(?:-[0-9a-z]+)*)$/;

/** `/s/<código>` com o código já normalizado; `code: null` para um código fora do formato. */
export function parseRoute(pathname: string): Route {
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (path === '/' || path === '') return { name: 'home' };
  if (path === '/treino') return { name: 'training' };
  if (path === '/partidas') return { name: 'pastGames' };
  const pastGame = PAST_GAME_PATH.exec(path);
  if (pastGame) return { name: 'pastGame', id: pastGame[1]! };
  const room = /^\/s\/([^/]+)$/.exec(path);
  if (room) {
    let raw = room[1]!;
    try {
      raw = decodeURIComponent(raw);
    } catch {
      // Percent-encoding quebrado: o texto cru também não vira um código válido.
    }
    return { name: 'room', code: normalizeCode(raw) };
  }
  return { name: 'notFound' };
}

const NAVIGATE_EVENT = 'coringa:navigate';

/**
 * `pushState` não dispara `popstate`: o evento próprio avisa quem usa `useRoute`. Com `replace`, a página troca a entrada de
 * agora do histórico em vez de empilhar outra (o Voltar não passa por ela): para a tela que a pessoa não quer rever voltando.
 */
export function navigate(path: string, options: { replace?: boolean } = {}): void {
  if (options.replace) window.history.replaceState(null, '', path);
  else window.history.pushState(null, '', path);
  window.dispatchEvent(new Event(NAVIGATE_EVENT));
  window.scrollTo?.(0, 0);
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener('popstate', onChange);
  window.addEventListener(NAVIGATE_EVENT, onChange);
  return () => {
    window.removeEventListener('popstate', onChange);
    window.removeEventListener(NAVIGATE_EVENT, onChange);
  };
}

const currentPath = (): string => window.location.pathname;

export function useRoute(): Route {
  // O snapshot é a string do caminho: um objeto novo a cada leitura faria o React girar sem parar.
  const pathname = useSyncExternalStore(subscribe, currentPath);
  return useMemo(() => parseRoute(pathname), [pathname]);
}
