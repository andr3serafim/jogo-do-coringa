// A geometria da logo "LUSACAN productions" (decisoes.md 2026-11-16 (5)): desenho original do projeto. O olho de um dragão antigo que
// guarda a noite: a lua é a íris, a pupila é uma fenda, e a pálpebra de cima é um capuz pesado que sobe para fora como um chifre. As letras são desenhadas (traço
// e polígono), sem fonte: o SVG abre igual em qualquer lugar, sem depender de arquivo de tipo.
//
// Esta é a fonte da versão animada da abertura (`LusacanLogo.tsx`). Os SVG de `src/assets/lusacan/` trazem os mesmos traçados, e o
// teste `lusacan-logo.test.tsx` confere que os dois não se afastam.

/** A caixa do conjunto (símbolo em cima, nome, "PRODUCTIONS" embaixo). */
export const LOGO_BOX = { width: 220, height: 152 } as const;
/** A caixa do símbolo sozinho (o olho), para tamanhos pequenos. */
export const SYMBOL_BOX = { width: 126, height: 66 } as const;

/** Onde cada parte fica dentro da caixa do conjunto. */
export const PLACE = {
  symbol: { x: 47, y: 10 },
  word: { x: 17.5, y: 88 },
  tag: { x: 45.25, y: 130 },
} as const;

/** O olho, na caixa do símbolo. A ordem do desenho: a íris, a fenda, o capuz por cima (ele corta o alto da lua), a pálpebra de baixo. */
export const EYE = {
  /** A lua. */
  iris: { cx: 58, cy: 40, r: 15 },
  /** A fenda da pupila. */
  pupil: 'M58 28Q63.6 41 58 54Q52.4 41 58 28Z',
  /** O capuz: a pálpebra de cima, pesada, que nasce no canto de dentro e sobe para fora como um chifre. Preenchido. */
  hood: 'M4 46C22 26 44 10 72 8C92 7 110 6 124 4C114 14 104 22 92 26C74 31 40 30 4 46Z',
  /** A pálpebra de baixo: um fio, do canto de dentro até debaixo do chifre. Traço. */
  lower: 'M4 46C30 66 80 64 108 24',
  lowerWidth: 3,
} as const;

export interface Glyph {
  /** A letra (para a chave e para o teste). */
  char: string;
  /** O deslocamento horizontal dentro da linha. */
  x: number;
  d: string;
  /** `true`: é traço (com `strokeWidth` da linha); sem ele, é forma preenchida. */
  stroke?: true;
}

/** A espessura do traço das letras do nome (altura 28). */
export const WORD_STROKE = 6;
/** "LUSACAN": o L, os A (sem a barra) e o N são formas; o U, o S e o C são traços de ponta reta. */
export const WORD: readonly Glyph[] = [
  { char: 'L', x: 0, d: 'M0 0h6v22h11v6H0z' },
  { char: 'U', x: 24, d: 'M3 0V16.5A8.5 8.5 0 0 0 20 16.5V0', stroke: true },
  { char: 'S', x: 54, d: 'M16.34 6.18A7 5.5 0 1 0 10 14A7 5.5 0 1 1 3.66 21.82', stroke: true },
  { char: 'A', x: 79, d: 'M0 28L9 0h6l9 28h-6.4L12 10.58L6.4 28z' },
  { char: 'C', x: 107, d: 'M19.2 7.91A8.5 8.5 0 0 0 3 11.5V16.5A8.5 8.5 0 0 0 19.2 20.09', stroke: true },
  { char: 'A', x: 133, d: 'M0 28L9 0h6l9 28h-6.4L12 10.58L6.4 28z' },
  { char: 'N', x: 162, d: 'M0 28V0h6.5L17 17.5V0h6v28h-6.5L6 10.5V28z' },
];

/** A espessura do traço das letras de "PRODUCTIONS" (altura 8). */
export const TAG_STROKE = 1.5;
const O = 'M3 0A3 4 0 1 0 3 8A3 4 0 1 0 3 0Z';
/** "PRODUCTIONS", em versalete espaçado: tudo traço. */
export const TAG: readonly Glyph[] = [
  { char: 'P', x: 0, d: 'M0 8V0H3.5A2.25 2.25 0 0 1 3.5 4.5H0', stroke: true },
  { char: 'R', x: 13, d: 'M0 8V0H3.5A2.25 2.25 0 0 1 3.5 4.5H0M3 4.5L6 8', stroke: true },
  { char: 'O', x: 26, d: O, stroke: true },
  { char: 'D', x: 39, d: 'M0 0H2A4 4 0 0 1 2 8H0Z', stroke: true },
  { char: 'U', x: 52, d: 'M0 0V5A3 3 0 0 0 6 5V0', stroke: true },
  { char: 'C', x: 65, d: 'M5.4 1.59A3 4 0 1 0 5.4 6.41', stroke: true },
  { char: 'T', x: 77.5, d: 'M0 0H6M3 0V8', stroke: true },
  { char: 'I', x: 90.5, d: 'M0 0V8', stroke: true },
  { char: 'O', x: 97.5, d: O, stroke: true },
  { char: 'N', x: 110.5, d: 'M0 8V0L6 8V0', stroke: true },
  { char: 'S', x: 123.5, d: 'M5.36 1.15A2.6 2 0 1 0 3 4A2.6 2 0 1 1 0.64 6.85', stroke: true },
];

/** As cores do cordel (as do `@theme` do `styles.css`), para os SVG que saem do jogo. */
export const INK = '#17120f';
export const PAPER = '#f1f0ea';
export const GOLD = '#f5c238';
