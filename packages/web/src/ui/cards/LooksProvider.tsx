// O provedor da aparência (spec dos decks e raças, §3 e §5): pede os pacotes que a aparência cita e guarda o que chega. Rende os filhos
// sempre: a carta fica de cordel enquanto o pacote não chega, e para sempre se ele falhar (F3), sem erro e sem aviso.
import type { Look } from '@coringa/protocol';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { loadPack } from '../../looks/load.ts';
import { packsOf, type PackId } from '../../model/looks.ts';
import { LooksContext, type LooksValue } from './looks-context.ts';

export interface LooksProviderProps {
  look: Look;
  children: ReactNode;
  /** Os pacotes prontos, de fora (os testes e a amostra do seletor): com eles, nada é pedido. */
  packs?: LooksValue['packs'];
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
  const packs = given ?? loaded;
  const value = useMemo(() => ({ look, packs }), [look, packs]);
  return <LooksContext.Provider value={value}>{children}</LooksContext.Provider>;
}
