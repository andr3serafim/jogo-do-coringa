import type { PlayerId } from '@coringa/engine';
import type { Deadline, DeadlineKind } from '@coringa/protocol';

/** Faltando isto ou menos, o relógio entra em urgência (cor e forma). */
export const URGENT_MS = 5_000;

export interface ClockFace {
  kind: DeadlineKind;
  /** Segundos inteiros, arredondados para cima. */
  seconds: number;
  urgent: boolean;
  expired: boolean;
  /** O prazo é do jogador local (no Equipar, é dos dois). */
  mine: boolean;
  /** Tempo do turno congelado durante um prazo de reação, em segundos. */
  pausedTurnSeconds: number | null;
}

/**
 * Face do relógio a partir do tempo restante, que vem do servidor (`RoomClient.remainingMs`).
 * O relógio local não entra aqui: a função não lê hora nenhuma.
 */
export function clockFace(
  deadline: Deadline | null,
  remainingMs: number,
  me: PlayerId,
  pausedTurnMs?: number,
): ClockFace | null {
  if (!deadline) return null;
  return {
    kind: deadline.kind,
    seconds: Math.ceil(remainingMs / 1000),
    urgent: remainingMs > 0 && remainingMs <= URGENT_MS,
    expired: remainingMs === 0,
    mine: deadline.players.includes(me),
    pausedTurnSeconds: pausedTurnMs === undefined ? null : Math.ceil(pausedTurnMs / 1000),
  };
}

/**
 * Anúncio para leitor de tela: só em prazo do próprio jogador, no começo e ao cruzar 10 s e 5 s.
 * `previousSeconds` é o valor da face anterior do mesmo prazo, ou `null` quando o prazo começou.
 */
export function clockAnnouncement(
  previousSeconds: number | null,
  face: ClockFace | null,
): 'start' | 'ten' | 'five' | null {
  if (!face || !face.mine || face.expired) return null;
  if (previousSeconds === null) return 'start';
  if (previousSeconds > 5 && face.seconds <= 5) return 'five';
  if (previousSeconds > 10 && face.seconds <= 10) return 'ten';
  return null;
}
