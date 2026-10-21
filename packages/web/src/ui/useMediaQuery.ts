// Uma media query como valor do React: reflete o `matchMedia` e muda quando ele muda. Sem `matchMedia` (jsdom) vale `false`.
import { useMemo, useSyncExternalStore } from 'react';

export function useMediaQuery(query: string): boolean {
  const [subscribe, snapshot] = useMemo(() => {
    const list = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null;
    const on = (onChange: () => void): (() => void) => {
      list?.addEventListener('change', onChange);
      return () => list?.removeEventListener('change', onChange);
    };
    return [on, (): boolean => list?.matches ?? false] as const;
  }, [query]);
  return useSyncExternalStore(subscribe, snapshot, () => false);
}
