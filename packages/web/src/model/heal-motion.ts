// Os instantes da batida da cura (spec `2026-11-23-cura-placas-historico-design.md` §4.2, a direção A do protótipo): a carta que curou
// acende, a gota sai dela e sobe até a ponta da barra de vida, e na chegada as faíscas, o brilho na barra, a vida que conta e o carimbo.
// Um lugar só: a linha do tempo (a chegada), a camada da cura, o placar e o som leem daqui. A batida inteira dura a folga do protocolo
// (`HEAL_MS`), que o relógio dá a quem vai jogar.
import { HEAL_MS } from '@coringa/protocol';

export const HEAL_MOTION = {
  /** O contorno verde da carta de origem cresce e some. */
  glowMs: 420,
  /** A gota sai da origem. */
  dropAt: 120,
  /** O voo da gota até a ponta da barra. */
  flightMs: 640,
  /** A chegada: as faíscas, o brilho, a vida que conta e o carimbo. */
  arriveAt: 760,
  /** A vida (o número e o ouro) conta até a nova. */
  countMs: 520,
  /** O brilho que corre pelo trecho verde da barra. */
  shineMs: 620,
  /** As faíscas da chegada. */
  sparksMs: 520,
  /** Quanto o carimbo fica depois do fim da batida, por conta própria. */
  stampHoldMs: 1_200,
  /** A saída do carimbo (sobe e esmaece). */
  stampOutMs: 300,
  /** A batida inteira. */
  beatMs: HEAL_MS,
} as const;
