// Folga de cena (sub-projeto 6 §9): durante uma cena rara o relógio para. A tabela é uma só, lida pelo núcleo do servidor
// (que estende o prazo da decisão pela folga) e pela linha do tempo da web (que toca a cena nesse tempo). Desde o bloco A dos pontos do
// playtest, o momento da especial do oponente também dá folga (`momentsMs`), e o bot do treino espera os dois do mesmo jeito.
import type { GameEvent, PlayerId } from '@coringa/engine';

/**
 * Duração (ms) da cena de cada evento que tem uma. Cada fatia do sub-projeto 6 atualiza o valor da cena que refaz: a fatia 2 deu
 * ao Ataque e à Defesa Absolutos os tempos do protótipo (4,5 s e 4,8 s); a fatia 3, à Exódia (5,8 s) e à Devastação, que passou a
 * ser a da fileira que cai (`RowDevastated`, 3,1 s) ou a cancelada (1,4 s). O lançamento (`DevastationCast`) só abre a janela de
 * reação do alvo, e não tem cena. A fatia 4 deu ao Reflect as três cenas dele: o espelho que se forma (1,5 s), o cometa que volta dele
 * (3,8 s) e os dois espelhos que trincam (1,4 s). A fatia 4b deu à Ressurreição, que não tinha cena, os 4,6 s do protótipo.
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
  Resurrected: 4_600,
};

/** Teto da folga de um passo: duas cenas no mesmo passo somam, até aqui. */
export const SCENE_ALLOWANCE_CAP_MS = 8_000;

/** A folga que os eventos de um passo dão ao prazo: a soma das cenas, até o teto. */
export function sceneAllowanceMs(events: readonly { type: string }[]): number {
  let total = 0;
  for (const event of events) total += SCENE_MS[event.type as GameEvent['type']] ?? 0;
  return Math.min(total, SCENE_ALLOWANCE_CAP_MS);
}

/**
 * O momento da jogada especial do oponente (bloco A dos pontos do playtest, ponto 1; `decisoes.md` 2026-11-03 (4) e (5)): quem não
 * jogou vê a carta grande no centro da mesa e uma placa com o que ela fez. O primeiro do turno dura `first`; os seguintes, no mesmo
 * turno, `next` (o Bot joga em média 1,1 especial por turno, e um quarto dos turnos tem duas).
 */
export const SPECIAL_MOMENT_MS = { first: 1_600, next: 1_100 } as const;

/**
 * O que o impacto do momento ainda mostra depois do fim da batida: o racha e o tremor do alvo e a ida da carta ao cemitério (a web confere a
 * conta contra os tempos da mesa). Quem age sem pensar logo depois do momento de um Ás espera também isto, ou a jogada seguinte corta o alvo
 * quebrando: o PASS do respondente depois do Ás dele na janela de reação (o passe automático, online) e o Bot na janela, no treino.
 */
export const MOMENT_TAIL_MS = 480;

/** As jogadas especiais que viram momento para quem não jogou. O Reflect, a Devastação e a Ressurreição têm cena própria. */
export const MOMENT_PLAYS: ReadonlySet<GameEvent['type']> = new Set<GameEvent['type']>([
  'BuffPlayed',
  'GuardPlayed',
  'TrapUsed',
  'Sacrificed',
  'CardStolen',
]);

/** Quem jogou a especial do evento, ou `null` se ele não é uma das `MOMENT_PLAYS`. */
function momentPlayer(event: GameEvent): PlayerId | null {
  switch (event.type) {
    case 'BuffPlayed':
    case 'GuardPlayed':
    case 'TrapUsed':
    case 'Sacrificed':
    case 'CardStolen':
      return event.player;
    default:
      return null;
  }
}

/** O evento é um momento para quem vê do lado `viewer`: uma especial que outro jogou (com `viewer` `null`, a de qualquer um). */
export function isMomentFor(event: GameEvent, viewer: PlayerId | null): boolean {
  const player = momentPlayer(event);
  return player !== null && player !== viewer;
}

/**
 * O tempo dos momentos que `events` dão a quem vê do lado `viewer` (`null`: os dois lados contam) e a conta do turno depois deles.
 * `before` é quantos momentos o turno já teve; o `TurnStarted` zera a conta.
 */
export function momentsMs(events: readonly GameEvent[], viewer: PlayerId | null, before = 0): { ms: number; count: number } {
  let ms = 0;
  let count = before;
  for (const event of events) {
    if (event.type === 'TurnStarted') {
      count = 0;
    } else if (isMomentFor(event, viewer)) {
      ms += count === 0 ? SPECIAL_MOMENT_MS.first : SPECIAL_MOMENT_MS.next;
      count += 1;
    }
  }
  return { ms, count };
}

/** A folga de um passo: as cenas e os momentos que quem vê do lado `viewer` assiste, até o teto. */
export function stepAllowanceMs(events: readonly GameEvent[], viewer: PlayerId | null, before = 0): number {
  return Math.min(SCENE_ALLOWANCE_CAP_MS, sceneAllowanceMs(events) + momentsMs(events, viewer, before).ms);
}
