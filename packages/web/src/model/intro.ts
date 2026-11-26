// A abertura do jogo (decisoes.md 2026-11-16 (5); sem a logo LUSACAN desde 2026-11-19 (6); sem o título, a aura, o anel e as faíscas desde
// 2026-11-25 (2)): a intro do jogo, até o menu. Puro: só os
// tempos, as pistas de som e a regra do que pula. O componente (`ui/intro/Intro.tsx`) entrega estes números ao CSS como variáveis, e o
// sintetizador os usa para pôr o impacto no instante certo: quem muda o ritmo da abertura muda aqui, e só aqui.
import type { Cue } from './sound.ts';

/**
 * Os instantes da abertura completa, em ms desde que ela aparece. Antes dela, a capa escura cobre o tempo de o pedaço dela chegar
 * (`intro-loader.ts`, ~0,1 a 0,5 s), e a pessoa vê as duas como uma coisa só.
 */
export const INTRO = {
  /** O aviso de pular. */
  hintAt: 500,
  /** A primeira carta sobe (um respiro depois da capa escura). */
  themeAt: 150,
  /** O atraso de cada uma das quatro cartas depois de `themeAt`: cada intervalo é menor que o anterior. */
  cardDelays: [0, 170, 310, 420],
  /** Quanto cada carta leva para subir até o leque. */
  cardRiseMs: 420,
  /** As cartas se juntam no centro, e a aura cresce. */
  gatherAt: 1000,
  /** O maço vira e mostra o Coringa (a chamada do som). */
  flipAt: 1300,
  /** O Coringa entra, quando o maço termina de sair (o gesto de 150 ms do CSS). */
  coringaInAt: 1450,
  /** O Coringa pousa (a entrada de 240 ms do CSS) e dá o pulo; a chamada do som cai aqui (2026-11-26 (4)). */
  revealAt: 1690,
  /** A pista da chamada: a subida começa aqui, 300 ms antes do pouso. */
  revealCueAt: 1390,
  /** A abertura começa a esmaecer para o menu. */
  fadeAt: 2200,
  /** O menu. */
  total: 2650,
} as const;

/** A versão curta, com movimento reduzido (o sistema ou o menu do jogo): o Coringa parado, um esmaecer na entrada e outro na saída, sem som. */
export const INTRO_REDUCED = {
  hintAt: 500,
  fadeAt: 1400,
  total: 1800,
} as const;

/** Quanto leva o esmaecer de quem pulou. */
export const SKIP_FADE_MS = 150;

export interface IntroPlan {
  variant: 'completa' | 'curta';
  hintAt: number;
  /** A partir daqui a abertura já esmaece para o menu. */
  fadeAt: number;
  total: number;
  /** As pistas de som, cada uma no instante dela. */
  cues: readonly { at: number; cue: Cue }[];
}

/** O que a abertura faz no tempo, na versão completa ou na curta (`reduced`). */
export function introPlan(reduced: boolean): IntroPlan {
  if (reduced) {
    return {
      variant: 'curta',
      hintAt: INTRO_REDUCED.hintAt,
      fadeAt: INTRO_REDUCED.fadeAt,
      total: INTRO_REDUCED.total,
      cues: [],
    };
  }
  return {
    variant: 'completa',
    hintAt: INTRO.hintAt,
    fadeAt: INTRO.fadeAt,
    total: INTRO.total,
    cues: [{ at: INTRO.revealCueAt, cue: 'abertura-titulo' }],
  };
}

/** O que a regra do pulo lê de um `KeyboardEvent`. */
export interface IntroKey {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
}

/** As teclas que não são "qualquer tecla": as de modificador e de trava, e as que o teclado manda sem a pessoa escolher (IME, tecla morta). */
const QUIET_KEYS: ReadonlySet<string> = new Set([
  'Shift',
  'Control',
  'Alt',
  'AltGraph',
  'Meta',
  'OS',
  'Fn',
  'FnLock',
  'Hyper',
  'Super',
  'Symbol',
  'SymbolLock',
  'CapsLock',
  'NumLock',
  'ScrollLock',
  'ContextMenu',
  'PrintScreen',
  'Pause',
  'Unidentified',
  'Dead',
  'Process',
]);

/** As teclas de função (F1 a F24) e as de mídia e de sistema do teclado (volume, brilho, lançar um programa…). */
const SYSTEM_KEY = /^(F\d{1,2}|Audio|Media|Brightness|Launch|Browser|Power|Sleep|WakeUp|Eject)/;

/**
 * `true` se a tecla pula a abertura. "Qualquer tecla" pula, menos o que a pessoa aperta para outra coisa: um atalho do navegador ou do
 * sistema (com Ctrl, Cmd ou Alt: recarregar, trocar de aba, de janela), uma tecla de modificador sozinha, as de função (F5, F11,
 * F12) e as de mídia.
 */
export function skipsIntro({ key, ctrlKey, metaKey, altKey }: IntroKey): boolean {
  if (ctrlKey || metaKey || altKey) return false;
  return !QUIET_KEYS.has(key) && !SYSTEM_KEY.test(key);
}
