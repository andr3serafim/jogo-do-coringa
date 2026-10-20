// O que as cartas da mesa precisam saber da mesa inteira (marcas, alvos, seleção e ouvintes), sem passar tudo
// de mão em mão pelas fileiras e zonas.
import { createContext, useContext } from 'react';
import type { MarkZone } from '../../model/marks.ts';

export interface TableUi {
  /** Ids de carta com a marca "novo". */
  marked: ReadonlySet<string>;
  /** Zonas (vida, pressão) com a marca "novo". */
  zones: ReadonlySet<MarkZone>;
  targetIds: ReadonlySet<string>;
  selectedCardId: string | null;
  /** Ids das cartas pendentes do Equipar que já estão na fileira como rascunho (spec §3.5). */
  draftIds: ReadonlySet<string>;
  onSelectCard?: (id: string) => void;
  onSelectTarget?: (id: string) => void;
  /** O jogador viu a carta ou a zona (`zone:<nome>`): a marca apaga. */
  onSeen?: (key: string) => void;
}

export const TableUiContext = createContext<TableUi>({
  marked: new Set(),
  zones: new Set(),
  targetIds: new Set(),
  selectedCardId: null,
  draftIds: new Set(),
});

export const useTableUi = (): TableUi => useContext(TableUiContext);
