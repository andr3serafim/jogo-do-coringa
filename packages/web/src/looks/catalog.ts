// O catálogo das aparências (spec dos decks e raças, §2.3 e §4.4): o que é pequeno e síncrono, os rótulos, o nome de cada criatura e de cada
// artefato e a cor de metal do valor e do naipe. As URLs das imagens ficam nos módulos de cada pacote, pedidos por `import()` (`load.ts`).
// A arte pintada, quando vier, troca os `.webp` com os mesmos nomes e, se preciso, as cores daqui.
import type { DeckId, RaceId } from '@coringa/protocol';
import type { ArtKey, PackId } from '../model/looks.ts';

export interface CardMeta {
  name: string;
  /** A cor de metal do valor, do naipe, do anel e da aura (`#rrggbb`). */
  metal: string;
}

export const DECK_LABEL: Record<DeckId, string> = { cordel: 'Cordel', bestiario: 'Bestiário', celestial: 'Celestial' };

/**
 * O verso de cada deck (spec §4.3), nas cartas da mão do oponente: duas cores e uma borda, em classes, sem imagem. O do Cordel é o de hoje
 * (as listras de tinta e papel); o Bestiário, violeta escuro com fio de ouro; o Celestial, azul com fio de ouro.
 */
export const BACK_CLASS: Record<DeckId, string> = {
  cordel: 'border-tinta bg-[repeating-linear-gradient(45deg,var(--color-tinta)_0_2px,var(--color-papel)_2px_4px)]',
  bestiario: 'border-[#d9b25a] bg-[repeating-linear-gradient(45deg,#2b1640_0_2px,#4a2a6b_2px_4px)]',
  celestial: 'border-[#d9b25a] bg-[repeating-linear-gradient(45deg,#14305c_0_2px,#2c5a96_2px_4px)]',
};
export const RACE_LABEL: Record<RaceId, string> = { bufao: 'Bufão', egipcio: 'Egípcio' };

const EGYPT_GOLD = '#ffd98a';

/** Por pacote e chave: o nome da criatura ou do artefato e a cor de metal. */
export const ART_META: Record<PackId, Partial<Record<ArtKey, CardMeta>>> = {
  bestiario: {
    '02': { name: 'Morcego', metal: '#d9cdb8' },
    '03': { name: 'Aranha', metal: '#cfdad6' },
    '04': { name: 'Lobo', metal: '#d6e2f2' },
    '05': { name: 'Urso', metal: '#ead9a8' },
    '06': { name: 'Grifo', metal: '#ffe9b8' },
    '07': { name: 'Fênix', metal: '#ffe2b0' },
    '08': { name: 'Hidra', metal: '#f0e0a0' },
    '09': { name: 'Kraken', metal: '#f0d995' },
    '10': { name: 'Dragão Ancestral', metal: '#ffd75a' },
  },
  celestial: {
    '02': { name: 'Borboleta', metal: '#d6e6ff' },
    '03': { name: 'Beija-flor', metal: '#d9f2e6' },
    '04': { name: 'Cervo Branco', metal: '#f0e6b8' },
    '05': { name: 'Unicórnio', metal: '#f2e0ff' },
    '06': { name: 'Pégaso', metal: '#f2f6ff' },
    '07': { name: 'Leão Alado', metal: '#ffe9a8' },
    '08': { name: 'Águia Gigante', metal: '#ffe9b8' },
    '09': { name: 'Baleia Celeste', metal: '#dfe9ff' },
    '10': { name: 'Arcanjo', metal: '#ffe27a' },
  },
  egipcio: {
    K: { name: 'Máscara do Faraó', metal: EGYPT_GOLD },
    J: { name: 'Khopesh de Rá', metal: EGYPT_GOLD },
    Q: { name: 'Escudo de Hórus', metal: EGYPT_GOLD },
    A: { name: 'Adaga de Set', metal: EGYPT_GOLD },
    WILD: { name: 'Coringa Anúbis', metal: EGYPT_GOLD },
  },
};
