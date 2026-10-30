// Linha do tempo das animações (spec §4 e §10.4). Puro: sem React, DOM nem timers. Recebe os eventos
// de um `state` e devolve as batidas em ordem, com início e duração absolutos (ms desde o começo da
// linha do tempo); quem toca as batidas é a interface (Tarefa 22) e quem mede a espera é a sessão
// (`timelineMs`, para a confirmação automática da ordem).
//
// As batidas são contíguas: `startMs` da batida i+1 = `startMs + durationMs` da batida i. Não há
// sobreposição; o número de dano, a faixa e a tremida acontecem dentro da duração da própria batida.
import type { GameEvent } from '@coringa/engine';

/** Duração base de cada tipo de batida (spec §4.1). `scene` é a cena comum (o Reflect); as raras têm a sua, em `RARE_SCENE_MS`. */
export const BEAT_MS = { move: 300, damage: 600, banner: 400, scene: 1_500 } as const;
/**
 * As cenas raras (sub-projeto 5, U3): mais longas que a comum, e fora do teto de decisão (o resto da linha do tempo encolhe para
 * caber nele; elas não). São raras, a Exódia acaba a partida, e o toque ou o Esc pulam na hora. Os Absolutos passaram de 2,6 s
 * para 3 s a pedido do autor (2026-10-30).
 */
export const RARE_SCENE_MS = { EXODIA: 4_200, ABSOLUTE_ATTACK: 3_000, ABSOLUTE_DEFENSE: 3_000 } as const;
/** Teto de uma linha do tempo que antecede uma decisão do jogador. */
export const DECISION_CAP_MS = 1_000;
/** Teto de uma linha do tempo de `catchUp` (eventos perdidos na reconexão). */
export const CATCH_UP_CAP_MS = 3_000;
/** Tempo mínimo que uma inversão fica no ar (spec §10.4). */
export const INVERT_MIN_HOLD_MS = 300;
/**
 * Depois de uma inversão, a próxima só começa 2 s depois do fim dela. É mais rígido que o piso da
 * WCAG 2.3.1 (3 trocas por segundo), que já sai garantido: duas inversões ficam a mais de 1 s uma da
 * outra, então nenhuma janela de 1 s pega mais de 3 trocas. Duas cenas coladas viram um pisca-pisca
 * mesmo dentro do piso, então a regra vence a cena: a segunda perde a inversão.
 */
export const INVERT_COOLDOWN_MS = 2_000;

export type SceneKind = 'EXODIA' | 'ABSOLUTE_ATTACK' | 'ABSOLUTE_DEFENSE' | 'REFLECT_PLAYED' | 'REFLECT_TRIGGERED';

/**
 * Onde, dentro da cena, a inversão acontece: na comum, logo no começo; nas raras, quando o título carimba (os J ou os Q já em
 * leque; na Exódia, a chegada do quarto K). A inversão dura sempre o mesmo, e é uma só por cena.
 */
export const SCENE_INVERT_LEAD_MS: Record<SceneKind, number> = {
  REFLECT_PLAYED: 150,
  REFLECT_TRIGGERED: 150,
  ABSOLUTE_ATTACK: 900,
  ABSOLUTE_DEFENSE: 900,
  EXODIA: 1_400,
};
const SCENE_INVERT_HOLD_MS = 600;

const isRare = (scene: SceneKind | null): scene is keyof typeof RARE_SCENE_MS => scene !== null && scene in RARE_SCENE_MS;

export interface Beat {
  event: GameEvent;
  kind: 'move' | 'damage' | 'banner' | 'scene' | 'quiet';
  /** Instante de início, em ms desde o começo da linha do tempo. */
  startMs: number;
  durationMs: number;
  /** Ids das cartas que o evento move. Pode ficar vazio (o evento não traz ids, ou vieram redigidos). */
  cards: string[];
  scene: SceneKind | null;
  /** Inversão da tela inteira; `atMs` é absoluto, como `startMs`. Sempre `null` fora de cena. */
  invert: { atMs: number; holdMs: number } | null;
}

export interface TimelineOptions {
  mode: 'live' | 'catchUp' | 'resync';
  reducedMotion: boolean;
  /** Há uma decisão do jogador esperando: tudo cabe em `DECISION_CAP_MS`. */
  decisionPending: boolean;
}

interface Classified {
  kind: Beat['kind'];
  cards: string[];
  scene: SceneKind | null;
}

const move = (cards: string[] = []): Classified => ({ kind: 'move', cards, scene: null });
const plain = (kind: 'banner' | 'damage' | 'quiet'): Classified => ({ kind, cards: [], scene: null });
const scene = (kindOfScene: SceneKind, cards: string[] = []): Classified => ({
  kind: 'scene',
  cards,
  scene: kindOfScene,
});

/** Tabela evento → batida (spec §4.2). O `never` do fim garante que nenhum evento fica de fora. */
function classify(event: GameEvent): Classified {
  switch (event.type) {
    case 'RoundStarted':
    case 'TurnStarted':
    case 'OrderChosen':
    case 'ReactionWindowOpened':
    case 'InitiativeChanged':
    case 'QuadFormed':
    case 'QuadBroken':
    case 'GameOver':
      return plain('banner');
    case 'EquipSubmitted':
    case 'ReactionWindowClosed':
      return plain('quiet');
    case 'DamageDealt':
      return plain('damage');
    case 'Exodia':
      return scene('EXODIA');
    case 'AbsoluteAttack':
      return scene('ABSOLUTE_ATTACK');
    case 'AbsoluteDefenseStarted':
      return scene('ABSOLUTE_DEFENSE');
    case 'ReflectPlayed':
      return scene('REFLECT_PLAYED', [event.reflect.k.id, event.reflect.j.id, event.reflect.q.id]);
    case 'ReflectTriggered':
      return scene('REFLECT_TRIGGERED');
    case 'CardsDealt':
      return move(event.cards?.map((c) => c.id));
    case 'CardsPlaced':
      return move(event.placements.flatMap((p) => (p.replaced ? [p.card.id, p.replaced.id] : [p.card.id])));
    case 'BuffPlayed':
    case 'Resurrected':
      return move([event.card.id]);
    case 'GuardPlayed':
    case 'GuardBroken':
    case 'BuffRemoved':
      return move(event.cards.map((c) => c.id));
    case 'CardsRemovedFromRow':
      return move(event.cards.map((c) => c.id));
    case 'TrapUsed':
    case 'Sacrificed':
      return move([event.card.id, event.target.id]);
    case 'DeckReshuffled':
    case 'ReflectCanceled':
    case 'ReflectProtected':
    case 'ReflectExpired':
    case 'AttackDeclared':
    case 'AbsoluteDefenseEnded':
      return move();
    default: {
      const unreachable: never = event;
      throw new Error(`evento sem batida: ${JSON.stringify(unreachable)}`);
    }
  }
}

function baseDuration(kind: Beat['kind'], scene: SceneKind | null): number {
  if (kind === 'quiet') return 0;
  return kind === 'scene' && isRare(scene) ? RARE_SCENE_MS[scene] : BEAT_MS[kind];
}

export function buildTimeline(events: GameEvent[], options: TimelineOptions): Beat[] {
  if (options.mode === 'resync') return [];
  const catchUp = options.mode === 'catchUp';

  // 1. Tipo e duração base. No `catchUp` as cenas viram faixa e tudo anda em velocidade dobrada.
  const items = events.map((event) => {
    const classified = classify(event);
    const flattened = catchUp && classified.kind === 'scene';
    const kind = flattened ? 'banner' : classified.kind;
    const scene = flattened ? null : classified.scene;
    const baseMs = baseDuration(kind, scene) / (catchUp ? 2 : 1);
    return { event, kind, cards: classified.cards, scene, baseMs, rare: isRare(scene) };
  });

  // 2. Escala proporcional para caber no teto (o menor dos que valem). As cenas raras ficam de fora: não encolhem nem contam
  // no teto. Arredonda para baixo, para nunca passar do teto por causa do arredondamento.
  const caps: number[] = [];
  if (catchUp) caps.push(CATCH_UP_CAP_MS);
  if (options.decisionPending) caps.push(DECISION_CAP_MS);
  const totalMs = items.reduce((sum, item) => sum + (item.rare ? 0 : item.baseMs), 0);
  const cap = Math.min(...caps, Infinity);
  const scale = totalMs > cap ? cap / totalMs : 1;

  // 3. Início absoluto de cada batida e, nas cenas, a inversão (se a regra deixar). O Ataque Absoluto que bate num Reflect
  // cede a inversão à cena do Reflect que devolve o golpe, que vem logo depois: o negativo da gravura fica com o desfecho.
  const reflected = items.some((item) => item.scene === 'REFLECT_TRIGGERED');
  const beats: Beat[] = [];
  let startMs = 0;
  let lastInvertEndMs = -Infinity;
  for (const item of items) {
    const itemScale = item.rare ? 1 : scale;
    const durationMs = Math.floor(item.baseMs * itemScale);
    let invert: Beat['invert'] = null;
    const yields = reflected && item.scene === 'ABSOLUTE_ATTACK';
    if (item.scene !== null && !options.reducedMotion && !yields) {
      const holdMs = Math.floor(SCENE_INVERT_HOLD_MS * itemScale);
      const atMs = startMs + Math.floor(SCENE_INVERT_LEAD_MS[item.scene] * itemScale);
      if (holdMs >= INVERT_MIN_HOLD_MS && atMs - lastInvertEndMs >= INVERT_COOLDOWN_MS) {
        invert = { atMs, holdMs };
        lastInvertEndMs = atMs + holdMs;
      }
    }
    beats.push({ event: item.event, kind: item.kind, startMs, durationMs, cards: item.cards, scene: item.scene, invert });
    startMs += durationMs;
  }
  return beats;
}

/** Duração total da linha do tempo, em ms. */
export function timelineMs(beats: Beat[]): number {
  const last = beats.at(-1);
  return last ? last.startMs + last.durationMs : 0;
}

/** Instante (ms desde o começo) de cada troca claro ↔ escuro, em ordem: a ida e a volta de cada inversão. */
export function luminanceSwitches(beats: Beat[]): number[] {
  return beats.flatMap((beat) => (beat.invert ? [beat.invert.atMs, beat.invert.atMs + beat.invert.holdMs] : []));
}
