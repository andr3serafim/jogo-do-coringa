// O provedor da aparência (spec dos decks e raças, §3 e §5): conhece a aparência de quem olha (`look`) e a de cada dono (`owners`, fatia 2),
// pede a união dos pacotes de todas uma vez cada, e guarda o que chega. Rende os filhos sempre: a carta fica de cordel enquanto o pacote não
// chega, e se ele falhar (F3), sem erro e sem aviso; uma nova montagem pede de novo. Um provedor só na mesa: provedores por lado
// multiplicariam os pedidos e o cordel que pisca.
//
// O que chegou mora numa loja (`ready.ts`) que o provedor assina com `useSyncExternalStore`: o pacote que já chegou entra no próprio
// desenho (o provedor que nasce depois dele, ou a troca para um deck já carregado, não passa por um quadro de cordel), e o que chega por
// qualquer pedido (o adiantado da tela, a amostra do menu, uma nova tentativa depois de uma falha) acorda a mesa, mesmo entre o desenho e o
// efeito. Do `load.ts` só se usa o `loadPack` (o teste do pacote que falha troca aquele módulo inteiro).
import type { PlayerId } from '@coringa/engine';
import type { Look } from '@coringa/protocol';
import { useContext, useEffect, useMemo, useSyncExternalStore, type ReactNode } from 'react';
import { loadPack } from '../../looks/load.ts';
import { readyState, subscribeReady } from '../../looks/ready.ts';
import { packsOf, type PackId } from '../../model/looks.ts';
import { LooksContext, type LooksValue } from './looks-context.ts';

export interface LooksProviderProps {
  /** A aparência de quem olha: a mão, o Equipar, o cemitério, e todo lugar fora de um `LookZone`. */
  look: Look;
  /** A aparência de cada dono (o lado da mesa, o retrato). Sem ela, toda zona veste `look`. Estável entre desenhos (quem chama memoiza). */
  owners?: Partial<Record<PlayerId, Look>>;
  children: ReactNode;
  /** Os pacotes prontos, de fora (os testes e a amostra do seletor): com eles, nada é pedido. */
  packs?: LooksValue['packs'];
}

const NO_OWNERS: Partial<Record<PlayerId, Look>> = {};

/** Pede os pacotes de uma aparência sem esperar por eles e sem falhar (as telas, antes de a mesa montar). */
export function requestLook(look: Look | undefined): void {
  if (look === undefined) return;
  for (const id of packsOf(look)) loadPack(id).catch(() => undefined);
}

/** Os pacotes que as aparências pedem, sem repetir, numa ordem fixa (em texto, para o efeito não rodar de novo a cada objeto novo). */
function wantedPacks(looks: readonly Look[]): string {
  return [...new Set(looks.flatMap(packsOf))].sort().join(',');
}

export function LooksProvider({ look, owners = NO_OWNERS, children, packs: given }: LooksProviderProps) {
  const arrived = useSyncExternalStore(subscribeReady, readyState, readyState);
  const external = given !== undefined;
  const wanted = wantedPacks([look, ...Object.values(owners).filter((one): one is Look => one !== undefined)]);
  useEffect(() => {
    if (external || wanted === '') return;
    // O que chega vai à loja, que acorda o desenho; F3: o pacote que não chega deixa a carta de cordel.
    for (const id of wanted.split(',') as PackId[]) loadPack(id).catch(() => undefined);
  }, [external, wanted]);
  const ready = useMemo(() => {
    const packs: LooksValue['packs'] = {};
    const portraits: LooksValue['portraits'] = {};
    for (const id of (wanted === '' ? [] : wanted.split(',')) as PackId[]) {
      const urls = arrived.packs[id];
      if (urls !== undefined) packs[id] = urls;
      const portrait = arrived.portraits[id];
      if (portrait !== undefined) portraits[id] = portrait;
    }
    return { packs, portraits };
  }, [wanted, arrived]);
  const packs = given ?? ready.packs;
  const value = useMemo(
    () => ({ look, viewer: look, owners, packs, portraits: ready.portraits }),
    [look, owners, packs, ready.portraits],
  );
  return <LooksContext.Provider value={value}>{children}</LooksContext.Provider>;
}

/**
 * O lugar de um dono: os filhos vestem a aparência dele (`owners[owner]`, ou a de quem olha se ele não está lá). Sem dono (`null`, um evento
 * que não é de ninguém), o lugar fica como está. Não pede nada (o provedor já pediu a união) e não põe nó no DOM: os seletores da mesa
 * ficam como estão.
 */
export function LookZone({ owner, children }: { owner: PlayerId | null; children: ReactNode }) {
  const parent = useContext(LooksContext);
  const look = owner === null ? parent.look : (parent.owners[owner] ?? parent.viewer);
  const value = useMemo(() => (look === parent.look ? parent : { ...parent, look }), [parent, look]);
  return <LooksContext.Provider value={value}>{children}</LooksContext.Provider>;
}
