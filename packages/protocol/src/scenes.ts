// Folga de cena (sub-projeto 6 §9): durante uma cena rara o relógio para. A tabela é uma só, lida pelo núcleo do servidor
// (que estende o prazo da decisão pela folga) e pela linha do tempo da web (que toca a cena nesse tempo).
import type { GameEvent } from '@coringa/engine';

/** Duração (ms) da cena de cada evento que tem uma. Cada fatia do sub-projeto 6 atualiza o valor da cena que refaz. */
export const SCENE_MS: Readonly<Partial<Record<GameEvent['type'], number>>> = {
  Exodia: 4_200,
  AbsoluteAttack: 3_000,
  AbsoluteDefenseStarted: 3_000,
  DevastationCast: 3_000,
  ReflectPlayed: 1_500,
  ReflectTriggered: 1_500,
};

/** Teto da folga de um passo: duas cenas no mesmo passo somam, até aqui. */
export const SCENE_ALLOWANCE_CAP_MS = 8_000;

/** A folga que os eventos de um passo dão ao prazo: a soma das cenas, até o teto. */
export function sceneAllowanceMs(events: readonly { type: string }[]): number {
  let total = 0;
  for (const event of events) total += SCENE_MS[event.type as GameEvent['type']] ?? 0;
  return Math.min(total, SCENE_ALLOWANCE_CAP_MS);
}
