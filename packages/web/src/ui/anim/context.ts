// O que o palco (`Stage`) diz ao resto da mesa enquanto toca as batidas (spec §4): se há batida em curso, quando cada
// carta começa a se mexer, os efeitos da batida de agora e a fase da contagem dos números. Fora de um `Stage` (os
// testes de vista, a carta solta) vale o `IDLE_ANIM`: sem batida, sem atraso, sem efeito.
import { createContext, useContext } from 'react';
import { NO_EFFECTS, type BeatEffects } from '../../model/effects.ts';

/** Fase da contagem dos números (vida e totais): a espera pela batida do dano, a contagem e o valor novo. */
export type CountPhase = 'idle' | 'hold' | 'count';

export interface Anim {
  /** Há batida em curso: os controles ficam desligados (spec §4.1). */
  busy: boolean;
  /** Movimento reduzido: sem deslocamento, sem tremida e sem inversão. */
  reduced: boolean;
  /** Atraso (em segundos) da transição de layout do elemento com este `layoutId`: o início da batida que o move. */
  delayOf(id: string): number;
  /**
   * O `layoutDependency` dos elementos com `layoutId`: o Motion só mede a mesa quando ele muda (a cada `state`, e quando
   * as batidas acabam ou são puladas, o que termina na hora as transições que ficaram no ar).
   */
  layoutKey: string;
  /** Efeitos da batida de agora. */
  fx: BeatEffects;
  /** Duração, em ms, da batida de agora (os efeitos acendem e apagam dentro dela). */
  beatMs: number;
  count: CountPhase;
  /** Duração, em ms, da batida do dano (a contagem dos números). */
  countMs: number;
}

export const IDLE_ANIM: Anim = {
  busy: false,
  reduced: false,
  delayOf: () => 0,
  layoutKey: '',
  fx: NO_EFFECTS,
  beatMs: 0,
  count: 'idle',
  countMs: 0,
};

export const AnimContext = createContext<Anim>(IDLE_ANIM);

export const useAnim = (): Anim => useContext(AnimContext);

/** Verdadeiro enquanto há batida: a mesa desliga os controles e eles voltam no fim ou no pulo. */
export const useBoardBusy = (): boolean => useAnim().busy;
