// O provedor da aparência (spec dos decks e raças, §3 e §5): pede os pacotes que a aparência cita e guarda o que chega. Rende os filhos
// sempre: a carta fica de cordel enquanto o pacote não chega, e se ele falhar (F3), sem erro e sem aviso; uma nova montagem pede de novo.
//
// O pacote que já chegou (por outro provedor, ou pelo pedido adiantado da tela) entra no próprio desenho, pelo `readyPack`: o provedor que
// nasce depois dele, ou a troca para um deck já carregado, não passa por um quadro de cordel. Do `load.ts` só se usa o `loadPack` (o teste
// do pacote que falha troca aquele módulo inteiro; o que está pronto mora no `ready.ts`).
import type { Look } from '@coringa/protocol';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadPack } from '../../looks/load.ts';
import { readyPack } from '../../looks/ready.ts';
import { packsOf, type PackId } from '../../model/looks.ts';
import { LooksContext, type LooksValue } from './looks-context.ts';

export interface LooksProviderProps {
  look: Look;
  children: ReactNode;
  /** Os pacotes prontos, de fora (os testes e a amostra do seletor): com eles, nada é pedido. */
  packs?: LooksValue['packs'];
}

/** Pede os pacotes de uma aparência sem esperar por eles e sem falhar (as telas, antes de a mesa montar). */
export function requestLook(look: Look | undefined): void {
  if (look === undefined) return;
  for (const id of packsOf(look)) loadPack(id).catch(() => undefined);
}

export function LooksProvider({ look, children, packs: given }: LooksProviderProps) {
  const [loaded, setLoaded] = useState<LooksValue['packs']>({});
  const external = given !== undefined;
  // A lista dos pacotes em texto, para o efeito não rodar de novo a cada objeto `look` novo com o mesmo conteúdo.
  const wanted = packsOf(look).join(',');
  useEffect(() => {
    if (external || wanted === '') return;
    let live = true;
    for (const id of wanted.split(',') as PackId[]) {
      if (readyPack(id) !== undefined) continue;
      loadPack(id).then(
        (urls) => {
          if (live) setLoaded((prev) => (prev[id] === urls ? prev : { ...prev, [id]: urls }));
        },
        // F3: o pacote que não chega deixa a carta de cordel.
        () => undefined,
      );
    }
    return () => {
      live = false;
    };
  }, [external, wanted]);
  const packs = useMemo(() => {
    if (given !== undefined) return given;
    const out: LooksValue['packs'] = {};
    for (const id of (wanted === '' ? [] : wanted.split(',')) as PackId[]) {
      const urls = readyPack(id) ?? loaded[id];
      if (urls !== undefined) out[id] = urls;
    }
    return out;
  }, [given, wanted, loaded]);
  const value = useMemo(() => ({ look, packs }), [look, packs]);
  return <LooksContext.Provider value={value}>{children}</LooksContext.Provider>;
}
