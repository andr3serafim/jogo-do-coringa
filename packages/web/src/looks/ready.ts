// O que já chegou dos pacotes de arte, para ler sem esperar (decks e raças, fatia 2): uma loja pequena que o `load.ts` preenche quando um
// pacote resolve, e que o provedor assina (`useSyncExternalStore`). Assim, o provedor que nasce depois do pacote já desenha a arte; e o
// pacote que chega por qualquer pedido (o adiantado da tela, a amostra do menu, uma nova tentativa depois de uma falha) acorda toda mesa
// que o quer, mesmo no intervalo entre o desenho e o efeito dela.
//
// Mora fora do `load.ts` de propósito: o teste do pacote que falha troca o `load.ts` inteiro (`vi.mock`) e continua lendo daqui, sem
// nada pronto. Não importa nada em tempo de execução.
import type { PackId } from '../model/looks.ts';
import type { PackUrls } from './load.ts';

/** O que chegou: as URLs de cada pacote e o retrato do placar de cada pacote de raça. Imutável: cada chegada troca o objeto. */
export interface ReadyState {
  packs: Partial<Record<PackId, PackUrls>>;
  portraits: Partial<Record<PackId, string>>;
}

const EMPTY: ReadyState = { packs: {}, portraits: {} };
let state: ReadyState = EMPTY;
const listeners = new Set<() => void>();

function publish(next: ReadyState): void {
  state = next;
  for (const listener of listeners) listener();
}

/** O estado de agora (o `getSnapshot` do `useSyncExternalStore`): o mesmo objeto enquanto nada chega. */
export function readyState(): ReadyState {
  return state;
}

/** Avisa a cada chegada; devolve o cancelamento. */
export function subscribeReady(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** As URLs do pacote, se ele já chegou; `undefined` se ainda não chegou ou falhou. */
export function readyPack(id: PackId): PackUrls | undefined {
  return state.packs[id];
}

/** O retrato quadrado do placar, se o pacote já chegou e tem um (só o de raça Egípcia). */
export function readyPortrait(id: PackId): string | undefined {
  return state.portraits[id];
}

/** Guarda o pacote que chegou, e o retrato dele, se houver (o `load.ts` chama). */
export function markReady(id: PackId, urls: PackUrls, portrait: string | undefined): void {
  publish({
    packs: { ...state.packs, [id]: urls },
    portraits: portrait ? { ...state.portraits, [id]: portrait } : state.portraits,
  });
}

/** Esquece tudo (só os testes, pelo `resetPacks`). */
export function forgetReady(): void {
  publish(EMPTY);
}
