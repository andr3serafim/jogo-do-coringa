// As transições de layout da mesa (U4 do sub-projeto 5): o autor achou tudo "seco e rápido". As cartas e a marca da iniciativa
// deslizam com mola suave em vez de 0,3 s `easeInOut`. O início continua na batida que move o elemento (`delay`); a mola só muda
// o desenho do caminho, e a linha do tempo (os controles) não espera por ela.

/** A mola do deslize: assenta em ~0,42 s, com um quase nada de sobra. */
export const LAYOUT_SPRING = { type: 'spring', visualDuration: 0.42, bounce: 0.15 } as const;

/** A transição de layout de um elemento: a mola, ou nenhuma (`instant`: o pulo, o `resync`). */
export function layoutTransition(delay: number, instant: boolean) {
  return instant ? { delay, duration: 0 } : { delay, ...LAYOUT_SPRING };
}
