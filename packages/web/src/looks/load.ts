// Os pacotes de arte (spec dos decks e raças, §5): cada um chega por `import()` quando uma aparência o cita, junto com a fonte Cinzel. Nada
// daqui alcança, por `import` estático, os módulos de URLs, as imagens ou a fonte: o smoke da web confere que ficam fora do pacote inicial.
import type { ArtKey, PackId } from '../model/looks.ts';

export type PackUrls = Partial<Record<ArtKey, string>>;

const LOADERS: Record<PackId, () => Promise<{ urls: PackUrls }>> = {
  bestiario: () => import('./bestiario/index.ts'),
  celestial: () => import('./celestial/index.ts'),
  egipcio: () => import('./egipcio/index.ts'),
};

const requested = new Map<PackId, Promise<PackUrls>>();

/** Aquece as imagens no cache do navegador, sem esperar por elas (no Node, onde não há `Image`, não faz nada). */
function warm(urls: PackUrls): void {
  if (typeof Image === 'undefined') return;
  for (const url of Object.values(urls)) new Image().src = url;
}

/**
 * Pede o pacote (uma vez só por pacote: a promessa fica guardada) e, junto, a fonte. Rejeita se o `import()` falhar (sem rede, chunk
 * antigo depois de um deploy): quem chama cai no cordel (F3), e a promessa rejeitada fica guardada até a página recarregar.
 */
export function loadPack(id: PackId): Promise<PackUrls> {
  let promise = requested.get(id);
  if (promise === undefined) {
    promise = Promise.all([LOADERS[id](), import('./font.css')]).then(([pack]) => {
      warm(pack.urls);
      return pack.urls;
    });
    requested.set(id, promise);
  }
  return promise;
}
