// Os pacotes de arte (spec dos decks e raças, §5): cada um chega por `import()` quando uma aparência o cita, junto com a fonte Cinzel. Nada
// daqui alcança, por `import` estático, os módulos de URLs, as imagens ou a fonte: o smoke da web confere que ficam fora do pacote inicial.
import type { ArtKey, PackId } from '../model/looks.ts';
import { forgetReady, markReady } from './ready.ts';

export { readyPack } from './ready.ts';

export type PackUrls = Partial<Record<ArtKey, string>>;

type Loaders = Record<PackId, () => Promise<{ urls: PackUrls }>>;

const LOADERS: Loaders = {
  bestiario: () => import('./bestiario/index.ts'),
  celestial: () => import('./celestial/index.ts'),
  egipcio: () => import('./egipcio/index.ts'),
};

let loaders: Loaders = LOADERS;
const requested = new Map<PackId, Promise<PackUrls>>();

/** Aquece as imagens no cache do navegador, sem esperar por elas (no Node, onde não há `Image`, não faz nada). */
function warm(urls: PackUrls): void {
  if (typeof Image === 'undefined') return;
  for (const url of Object.values(urls)) new Image().src = url;
}

/**
 * Pede o pacote (uma vez só por pacote: a promessa fica guardada) e, junto, a fonte. Quando chega, ele fica pronto para ler sem esperar
 * (`readyPack`). Rejeita se o `import()` falhar (sem rede, chunk antigo depois de um deploy): quem chama cai no cordel (F3), e a promessa
 * rejeitada sai do mapa, para o pedido seguinte (uma nova montagem) tentar de novo.
 */
export function loadPack(id: PackId): Promise<PackUrls> {
  let promise = requested.get(id);
  if (promise === undefined) {
    const made = Promise.all([loaders[id](), import('./font.css')]).then(([pack]) => {
      markReady(id, pack.urls);
      warm(pack.urls);
      return pack.urls;
    });
    made.catch(() => {
      if (requested.get(id) === made) requested.delete(id);
    });
    requested.set(id, made);
    promise = made;
  }
  return promise;
}

/**
 * Só para os testes: o que foi pedido e o que chegou é do módulo, e vaza entre os testes do mesmo arquivo. Esquece tudo e, com `fake`,
 * troca o `import()` de cada pacote dado.
 */
export function resetPacks(fake: Partial<Loaders> = {}): void {
  requested.clear();
  forgetReady();
  loaders = { ...LOADERS, ...fake };
}
