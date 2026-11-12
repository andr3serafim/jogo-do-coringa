// O que já chegou dos pacotes de arte, para ler sem esperar (decks e raças, fatia 2): o provedor que nasce depois de o pacote chegar
// já desenha a arte, sem um quadro de cordel no meio. O `load.ts` escreve aqui quando o pacote resolve.
//
// Mora fora do `load.ts` de propósito: o teste do pacote que falha troca o `load.ts` inteiro (`vi.mock`) e continua lendo daqui, sem
// nada pronto. Não importa nada em tempo de execução.
import type { PackId } from '../model/looks.ts';
import type { PackUrls } from './load.ts';

const packs = new Map<PackId, PackUrls>();

/** As URLs do pacote, se ele já chegou; `undefined` se ainda não chegou ou falhou. */
export function readyPack(id: PackId): PackUrls | undefined {
  return packs.get(id);
}

/** Guarda o pacote que chegou (o `load.ts` chama). */
export function markReady(id: PackId, urls: PackUrls): void {
  packs.set(id, urls);
}

/** Esquece tudo (só os testes, pelo `resetPacks`). */
export function forgetReady(): void {
  packs.clear();
}
