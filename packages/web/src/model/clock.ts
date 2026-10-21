import type { PlayerId } from '@coringa/engine';
import type { Deadline, DeadlineKind, PlayerAction, StateMessage } from '@coringa/protocol';

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

/** A vez do jogador local, para anunciar quando não há prazo (treino, spec §2.6 e §7). A `key` muda a cada época. */
export interface TurnCue {
  key: string;
  /** O mesmo tipo de um prazo: `TURN` é a fase principal, `REACTION` a janela de reação. */
  kind: DeadlineKind;
}

const CUE_KIND: Partial<Record<StateMessage['view']['phase']['kind'], DeadlineKind>> = {
  EQUIP: 'EQUIP',
  ORDER_CHOICE: 'ORDER',
  ATTACK_MAIN: 'TURN',
  REACTION: 'REACTION',
};

/**
 * Chegou a hora de o jogador decidir? Com prazo, quem anuncia é o relógio (`clockAnnouncement`); sem prazo (o treino não
 * tem relógio) o anúncio sai daqui. Vale a época do `state`: ela só sobe quando a fase em que o jogo espera uma jogada
 * muda, então as jogadas dentro de uma mesma fase não repetem o anúncio, e a vez que volta (depois de uma janela de
 * reação, na rodada seguinte, na revanche) é anunciada de novo. `legal` vazio é a vez do outro, ou o fim da partida.
 */
export function turnCue(state: StateMessage | null, legal: readonly PlayerAction[]): TurnCue | null {
  if (state === null || legal.length === 0) return null;
  const kind = CUE_KIND[state.view.phase.kind];
  return kind === undefined ? null : { key: `${state.epoch}:${kind}`, kind };
}
