// O que o palco (`Stage`) diz ao resto da mesa enquanto toca as batidas (spec §4): se há batida em curso, quando cada
// carta começa a se mexer, os efeitos da batida de agora e a fase da contagem dos números. Fora de um `Stage` (os
// testes de vista, a carta solta) vale o `IDLE_ANIM`: sem batida, sem atraso, sem efeito.
import type { PlayerId } from '@coringa/engine';
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
   * A carta com este id entra na mesa na batida do `CardsDealt` (spec §4.2): fica apagada e esmaece depois de `n` segundos.
   * `null` se nenhuma batida a traz.
   */
  enterDelay(id: string): number | null;
  /** Quantas cartas de verso (a mão do oponente) entram na batida, e depois de quantos segundos; `null` sem batida. */
  backs(player: PlayerId): { count: number; delay: number } | null;
  /** O último encerramento na hora de transições (pulo, `state` novo): quais cartas remontaram. A mesa devolve o foco. */
  remounted: { serial: number; ids: ReadonlySet<string> };
  /** `key` do elemento com este `layoutId`: muda quando as transições dele são encerradas na hora (pulo, `state` novo). */
  markOf(id: string): number;
  /**
   * O elemento chega ao lugar sem animar: a transição dele acabou de ser encerrada na hora, ou o `state` é um salto (`resync`:
   * a reconexão fora do anel, e no replay o voltar, o "Início" e a rodada), que troca a mesa de uma vez sem deslize. O `catchUp`
   * e o `state` ao vivo seguem animando.
   */
  instant(id: string): boolean;
  /**
   * O `layoutDependency` dos elementos com `layoutId`: o Motion só mede a mesa quando ele muda (a cada `state` e quando as
   * batidas acabam), e não a cada desenho. Medir de novo não encerra uma transição em andamento; isso é `markOf`/`instant`.
   */
  layoutKey: string;
  /** Efeitos da batida de agora. */
  fx: BeatEffects;
  /** Duração, em ms, da batida de agora (os efeitos acendem e apagam dentro dela). */
  beatMs: number;
  count: CountPhase;
  /** Duração, em ms, da batida do dano (a contagem dos números). */
  countMs: number;
  /** O número da pressão espera a batida do `PressureChanged` (`hold`) e ganha destaque nela (`count`). */
  pressure: CountPhase;
}

export const IDLE_ANIM: Anim = {
  busy: false,
  reduced: false,
  delayOf: () => 0,
  enterDelay: () => null,
  backs: () => null,
  remounted: { serial: 0, ids: new Set() },
  markOf: () => 0,
  instant: () => false,
  layoutKey: '',
  fx: NO_EFFECTS,
  beatMs: 0,
  count: 'idle',
  countMs: 0,
  pressure: 'idle',
};

export const AnimContext = createContext<Anim>(IDLE_ANIM);

export const useAnim = (): Anim => useContext(AnimContext);

/** Verdadeiro enquanto há batida: a mesa desliga os controles e eles voltam no fim ou no pulo. */
export const useBoardBusy = (): boolean => useAnim().busy;
