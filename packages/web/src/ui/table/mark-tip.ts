// A dica aberta das marcas do Coringa (decisoes.md 2026-11-23 (8); spec da cura §5): uma por vez na mesa inteira. Uma loja pequena do
// módulo, que cada figura assina com `useSyncExternalStore`: abrir uma fecha a outra sem um provedor em volta da mesa.
import { useSyncExternalStore } from 'react';

let open: string | null = null;
const listeners = new Set<() => void>();

/** Abre a dica da figura `id` (e fecha a que estava aberta); `null` fecha. */
export function openTip(id: string | null): void {
  if (open === id) return;
  open = id;
  for (const listener of listeners) listener();
}

/** A dica aberta agora, fora do React. */
export const currentTip = (): string | null => open;

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** A dica aberta, para a figura saber se é a dela. */
export const useOpenTip = (): string | null => useSyncExternalStore(subscribe, currentTip, currentTip);
