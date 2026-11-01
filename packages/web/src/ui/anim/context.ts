// O que o palco (`Stage`) diz ao resto da mesa enquanto toca as batidas (spec §4): se há batida em curso, quando cada
// carta começa a se mexer, os efeitos da batida de agora e a fase da contagem dos números. Fora de um `Stage` (os
// testes de vista, a carta solta) vale o `IDLE_ANIM`: sem batida, sem atraso, sem efeito.
import type { PlayerId } from '@coringa/engine';
import { createContext, useContext } from 'react';
import type { Ribbon } from '../../model/copy.ts';
import { NO_EFFECTS, type BeatEffects } from '../../model/effects.ts';

/** Fase da contagem dos totais das fileiras: a espera pela batida do dano, a contagem e o valor novo. */
export type CountPhase = 'idle' | 'hold' | 'count';

/**
 * A vida de um jogador na linha do tempo (decisoes.md 2026-11-01 (1)): cada um conta na batida que mexe na vida dele, o golpe
 * descendo e a cura subindo, em vez de tudo na primeira batida de dano.
 */
export interface LifeCount {
  /** Há batidas tocando (sem isso, ou com movimento reduzido, a vida é a da `view`). */
  playing: boolean;
  /** A soma das mudanças das batidas que já passaram nesta linha do tempo. */
  done: number;
  /** A mudança da batida de agora, se ela mexe na vida deste jogador; 0 sem ela. */
  step: number;
  /** Quanto dura a batida de agora: o tempo da contagem do `step`. */
  ms: number;
  /** A soma de todas as mudanças da linha do tempo (para achar a vida de antes a partir da de depois). */
  total: number;
}

export const IDLE_LIFE: LifeCount = { playing: false, done: 0, step: 0, ms: 0, total: 0 };

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
  /**
   * A fita no ar (sub-projeto 6 §4), ou `null`: o placar a desenha, logo abaixo dele. Quem decide quando ela sobe e desce é o
   * `useBeatPlayer`, pela mesma trava de flash da cena (spec §10.4); entre uma faixa e a seguinte só o texto troca.
   */
  ribbon: Ribbon | null;
  /** Duração, em ms, da batida de agora (os efeitos acendem e apagam dentro dela). */
  beatMs: number;
  count: CountPhase;
  /** Duração, em ms, da batida do dano (a contagem dos totais). */
  countMs: number;
  /** A vida de `player` na linha do tempo. */
  life(player: PlayerId): LifeCount;
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
  ribbon: null,
  beatMs: 0,
  count: 'idle',
  countMs: 0,
  life: () => IDLE_LIFE,
};

export const AnimContext = createContext<Anim>(IDLE_ANIM);

export const useAnim = (): Anim => useContext(AnimContext);

/** Verdadeiro enquanto há batida: a mesa desliga os controles e eles voltam no fim ou no pulo. */
export const useBoardBusy = (): boolean => useAnim().busy;
