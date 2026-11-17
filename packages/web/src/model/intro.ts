// A abertura do jogo (decisoes.md 2026-11-16 (5); a logo do dragão, 2026-11-17 (3)): a logo "LUSACAN productions" e a intro do jogo, até o menu. Puro: só os tempos, as
// pistas de som e a regra do que pula. O componente (`ui/intro/Intro.tsx`) entrega estes números ao CSS como variáveis, e o
// sintetizador os usa para pôr o impacto no instante certo: quem muda o ritmo da abertura muda aqui, e só aqui.
import type { Cue } from './sound.ts';

/** Os instantes da abertura completa, em ms desde que ela aparece. */
export const INTRO = {
  /** O aviso de pular. */
  hintAt: 500,
  /** A lua aparece no céu. */
  logoAt: 100,
  /** A pista da logo: as batidas de asa do voo, o giro, o mergulho e o baque das asas que se abrem em `wingsAt`. */
  logoCueAt: 180,
  /** O dragão entra voando, pequeno, longe, batendo as asas. */
  flyAt: 200,
  /** O dragão gira no ar (um parafuso) em volta da lua. */
  spinAt: 650,
  /** O dragão volta, de asas recolhidas, mergulhando na direção de quem olha. */
  returnAt: 950,
  /** As asas se abrem de uma vez, e os veios de raio acendem: o dragão para na pose da logo. */
  wingsAt: 1200,
  /** Quanto o dragão leva para assentar na pose depois de abrir as asas (um leve passar do ponto e voltar). */
  settleMs: 300,
  /** O nome começa a subir, letra a letra; "PRODUCTIONS" e os filetes vêm no fim. */
  nameAt: 1300,
  /** Quanto o nome leva para ficar inteiro. */
  nameMs: 450,
  /** A logo começa a sair. */
  logoOutAt: 2300,
  /** A intro do jogo: a primeira carta sobe. */
  themeAt: 2500,
  /** O atraso de cada uma das quatro cartas depois de `themeAt`: cada intervalo é menor que o anterior. */
  cardDelays: [0, 170, 310, 420],
  /** Quanto cada carta leva para subir até o leque. */
  cardRiseMs: 420,
  /** As cartas se juntam no centro, e a aura cresce. */
  gatherAt: 3350,
  /** O maço vira e mostra o Coringa. */
  flipAt: 3700,
  /** A pista do título: a subida começa aqui e a chamada cai em `titleAt`. */
  titleCueAt: 3850,
  /** O título é carimbado. */
  titleAt: 4150,
  /** A abertura começa a esmaecer para o menu. */
  fadeAt: 5150,
  /** O menu. */
  total: 5600,
} as const;

/**
 * A versão curta, com movimento reduzido (o sistema ou o menu do jogo): a logo parada (o dragão já de asas abertas), com um esmaecer na
 * entrada e outro na saída, e só o baque das asas no som.
 */
export const INTRO_REDUCED = {
  hintAt: 500,
  logoCueAt: 150,
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
      cues: [{ at: INTRO_REDUCED.logoCueAt, cue: 'abertura-logo-curta' }],
    };
  }
  return {
    variant: 'completa',
    hintAt: INTRO.hintAt,
    fadeAt: INTRO.fadeAt,
    total: INTRO.total,
    cues: [
      { at: INTRO.logoCueAt, cue: 'abertura-logo' },
      { at: INTRO.titleCueAt, cue: 'abertura-titulo' },
    ],
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
