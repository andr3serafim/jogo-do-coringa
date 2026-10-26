// O que as cartas da mesa precisam saber da mesa inteira (marcas, alvos, seleção e ouvintes), sem passar tudo
// de mão em mão pelas fileiras e zonas.
import { createContext, useContext } from 'react';
import type { DropKey } from '../../model/drag.ts';
import type { MarkZone } from '../../model/marks.ts';
import type { HintZone } from '../../model/tutorial.ts';

/** O arrasto das cartas da mão (fatia 5): a mesa diz onde cada carta pode cair e o que a soltura faz. Sem ele, a mão não arrasta. */
export interface HandDrag {
  /** As zonas onde a carta pode cair agora (lida a cada movimento e na soltura, com a lista do último `state`). */
  zones: (cardId: string) => ReadonlySet<DropKey>;
  /** A soltura da carta: a zona válida sob o dedo, ou `null` fora de todas. */
  onDrop: (cardId: string, key: DropKey | null) => void;
}

export interface TableUi {
  /** Ids de carta com a marca "novo". */
  marked: ReadonlySet<string>;
  /** Zonas (vida, pressão) com a marca "novo". */
  zones: ReadonlySet<MarkZone>;
  targetIds: ReadonlySet<string>;
  /** Controles travados: as cartas que são botão ficam apagadas (`aria-disabled`), sem tirar o foco. */
  locked: boolean;
  selectedCardId: string | null;
  /** Ids das cartas pendentes do Equipar que já estão na fileira como rascunho (spec §3.5). */
  draftIds: ReadonlySet<string>;
  onSelectCard?: (id: string) => void;
  onSelectTarget?: (id: string) => void;
  handDrag?: HandDrag;
  /** O jogador viu a carta ou a zona (`zone:<nome>`): a marca apaga. */
  onSeen?: (key: string) => void;
  /** A zona de que a dica do tutorial fala, que ganha o contorno parado (`data-dica`); `null` fora do tutorial e sem dica valendo. */
  hintZone: HintZone | null;
}

export const TableUiContext = createContext<TableUi>({
  marked: new Set(),
  zones: new Set(),
  targetIds: new Set(),
  locked: false,
  selectedCardId: null,
  draftIds: new Set(),
  hintZone: null,
});

export const useTableUi = (): TableUi => useContext(TableUiContext);
