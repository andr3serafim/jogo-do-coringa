// Folga de cena (sub-projeto 6 §9): durante uma cena rara o relógio para. A tabela é uma só, lida pelo núcleo do servidor
// (que estende o prazo da decisão pela folga) e pela linha do tempo da web (que toca a cena nesse tempo).
import type { GameEvent } from '@coringa/engine';

/**
 * Duração (ms) da cena de cada evento que tem uma. Cada fatia do sub-projeto 6 atualiza o valor da cena que refaz: a fatia 2 deu
 * ao Ataque e à Defesa Absolutos os tempos do protótipo (4,5 s e 4,8 s); a fatia 3, à Exódia (5,8 s) e à Devastação, que passou a
 * ser a da fileira que cai (`RowDevastated`, 3,1 s) ou a cancelada (1,4 s). O lançamento (`DevastationCast`) só abre a janela de
 * reação do alvo, e não tem cena. A fatia 4 deu ao Reflect as três cenas dele: o espelho que se forma (1,5 s), o cometa que volta dele
 * (3,8 s) e os dois espelhos que trincam (1,4 s).
 */
export const SCENE_MS: Readonly<Partial<Record<GameEvent['type'], number>>> = {
  Exodia: 5_800,
  AbsoluteAttack: 4_500,
  AbsoluteDefenseStarted: 4_800,
  RowDevastated: 3_100,
  DevastationCanceled: 1_400,
  ReflectPlayed: 1_500,
  ReflectTriggered: 3_800,
  ReflectCanceled: 1_400,
};

/** Teto da folga de um passo: duas cenas no mesmo passo somam, até aqui. */
export const SCENE_ALLOWANCE_CAP_MS = 8_000;

/** A folga que os eventos de um passo dão ao prazo: a soma das cenas, até o teto. */
export function sceneAllowanceMs(events: readonly { type: string }[]): number {
  let total = 0;
  for (const event of events) total += SCENE_MS[event.type as GameEvent['type']] ?? 0;
  return Math.min(total, SCENE_ALLOWANCE_CAP_MS);
}
