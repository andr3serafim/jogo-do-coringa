// Movimento reduzido (spec §4.1, §10.4): a preferência do menu OU a do sistema (`prefers-reduced-motion`). A do sistema
// é ouvida: se o jogador a liga com a partida aberta, a mesa passa a valer já.
import { useSyncExternalStore } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

function query(): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(QUERY) : null;
}

function subscribe(onChange: () => void): () => void {
  const list = query();
  list?.addEventListener('change', onChange);
  return () => list?.removeEventListener('change', onChange);
}

const systemPrefers = (): boolean => query()?.matches ?? false;

/** `true` se o sistema pede menos movimento (o menu mostra a chave ligada e travada). */
export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, systemPrefers, () => false);
}

/** `true` se o menu (`prefs.reduceMotion`) ou o sistema pedem menos movimento. */
export function useReducedMotion(menuPrefers: boolean): boolean {
  const system = useSystemReducedMotion();
  return menuPrefers || system;
}
