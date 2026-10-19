// O `Storage` do navegador, com o acesso ao próprio getter protegido: `window.localStorage` lança em alguns
// bloqueios de dados (spec §6.1). Sem `Storage`, o `safeStore` devolve memória com `available: false`.
import { safeStore, type KeyValueStore } from '../model/storage.ts';

export function browserStorage(kind: 'local' | 'session'): Storage | undefined {
  try {
    return kind === 'local' ? window.localStorage : window.sessionStorage;
  } catch {
    return undefined;
  }
}

export function openStore(kind: 'local' | 'session'): { store: KeyValueStore; available: boolean } {
  return safeStore(browserStorage(kind));
}
