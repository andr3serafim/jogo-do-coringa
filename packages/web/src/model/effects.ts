// O que cada batida mostra (spec §4.2): efeitos nas cartas e nas fileiras, o número do dano, o texto das faixas e das
// cenas, e o atraso das transições de layout. Puro: sem React nem DOM. Quem desenha é a interface (`ui/anim`).
import type { GameEvent, PlayerId, PlayerView, RowName } from '@coringa/engine';
import { eventText, type Names } from '@coringa/sim/text';
import { SCENE_TITLE } from './copy.ts';
import type { Beat } from './timeline.ts';

/** `layoutId` da marca da iniciativa: ela troca de lado na batida do `InitiativeChanged`. */
export const INITIATIVE_ID = 'marca-iniciativa';

/** Chave de uma fileira de um jogador, para o conjunto de fileiras acesas: "p1:ATK". */
export const rowKey = (player: PlayerId, row: RowName): string => `${player}:${row}`;

/** O efeito numa carta: o K que racha, a carta do escudo do Reflect, a carta da quadra que acende. */
export type CardFx = 'crack' | 'shield' | 'light';

export interface BeatEffects {
  cards: ReadonlyMap<string, CardFx>;
  /** Fileiras acesas (`rowKey`). */
  rows: ReadonlySet<string>;
  /** O número do dano que sobe no Coringa de `target`. */
  damage: { target: PlayerId; amount: number } | null;
  /** O escudo do Reflect de `owner` quebra: a `view` já não o tem, então é só uma sobreposição no Coringa dele. */
  shieldBreak: PlayerId | null;
}

export const NO_EFFECTS: BeatEffects = { cards: new Map(), rows: new Set(), damage: null, shieldBreak: null };

/** As cartas da fileira da quadra: as da fileira com o valor dela (a `view` já é a de depois do evento). */
function quadCards(view: PlayerView, player: PlayerId, row: RowName, value: number): string[] {
  const side = view.me === player ? view.self : view.opponent;
  return (row === 'ATK' ? side.attackRow : side.defenseRow).filter((card) => card.value === value).map((card) => card.id);
}

const fxMap = (ids: string[], fx: CardFx): ReadonlyMap<string, CardFx> => new Map(ids.map((id) => [id, fx] as const));

function effectsOfEvent(event: GameEvent, view: PlayerView): Partial<BeatEffects> {
  switch (event.type) {
    case 'AttackDeclared':
    case 'AbsoluteAttack':
      return { rows: new Set([rowKey(event.player, 'ATK')]) };
    case 'DamageDealt':
      return {
        rows: new Set([rowKey(event.attacker, 'ATK'), rowKey(event.defender, 'DEF')]),
        damage: event.damage > 0 ? { target: event.defender, amount: event.damage } : null,
      };
    case 'ReflectTriggered':
      return { damage: event.damage > 0 ? { target: event.attacker, amount: event.damage } : null };
    case 'GuardBroken':
      return { cards: fxMap(event.cards.map((card) => card.id), 'crack') };
    case 'TrapUsed':
    case 'Sacrificed':
      // A carta usada vai até o alvo e o alvo quebra (as duas vão para o cemitério pelo `layoutId`).
      return { cards: fxMap([event.target.id], 'crack') };
    case 'ReflectCanceled':
    case 'ReflectProtected':
    case 'ReflectExpired':
      return { shieldBreak: event.owner };
    case 'ReflectPlayed':
      return { cards: fxMap([event.reflect.k.id, event.reflect.j.id, event.reflect.q.id], 'shield') };
    case 'QuadFormed':
    case 'QuadBroken':
      return { cards: fxMap(quadCards(view, event.player, event.quad.row, event.quad.value), 'light') };
    default:
      return {};
  }
}

/** Os efeitos da batida em curso, sobre a `view` do `state` que a trouxe. Sem batida, nenhum. */
export function effectsOf(beat: Beat | null, view: PlayerView): BeatEffects {
  if (beat === null) return NO_EFFECTS;
  return { ...NO_EFFECTS, ...effectsOfEvent(beat.event, view) };
}

/**
 * Quando cada elemento com `layoutId` (as cartas e a marca da iniciativa) começa a se mexer: o início, em ms, da
 * batida que o move. Se mais de uma batida mexe na carta, vale a última: a carta fica onde estava até lá.
 */
export function delaysOf(beats: readonly Beat[]): ReadonlyMap<string, number> {
  const delays = new Map<string, number>();
  for (const beat of beats) {
    for (const id of beat.cards) delays.set(id, beat.startMs);
    if (beat.event.type === 'InitiativeChanged') delays.set(INITIATIVE_ID, beat.startMs);
  }
  return delays;
}

export interface Deals {
  /** Cartas com id que entram (as suas): id → início da batida do `CardsDealt`, em ms. */
  cards: ReadonlyMap<string, number>;
  /** Cartas sem id (o verso na mão do oponente): quantas entram e quando. */
  backs: ReadonlyMap<PlayerId, { count: number; startMs: number }>;
}

/** As cartas que entram na mesa na batida do `CardsDealt` (spec §4.2): esperam a batida e esmaecem, em vez de já estarem lá. */
export function dealsOf(beats: readonly Beat[]): Deals {
  const cards = new Map<string, number>();
  const backs = new Map<PlayerId, { count: number; startMs: number }>();
  for (const beat of beats) {
    if (beat.event.type !== 'CardsDealt') continue;
    const { player, count, cards: dealt } = beat.event;
    if (dealt) {
      for (const card of dealt) cards.set(card.id, beat.startMs);
    } else {
      const before = backs.get(player);
      backs.set(player, { count: (before?.count ?? 0) + count, startMs: before?.startMs ?? beat.startMs });
    }
  }
  return { cards, backs };
}

/** A batida em que o número da pressão muda (e ganha destaque); -1 sem ela. */
export function pressureBeatIndex(beats: readonly Beat[]): number {
  return beats.findIndex((beat) => beat.event.type === 'PressureChanged');
}

/** A batida em que a vida e os totais contam até o valor novo (o dano, ou o dano devolvido pelo Reflect); -1 sem ela. */
export function damageBeatIndex(beats: readonly Beat[]): number {
  return beats.findIndex((beat) => beat.event.type === 'DamageDealt' || beat.event.type === 'ReflectTriggered');
}

/**
 * A faixa de um evento (spec §4.2), ou `null` se o evento não tem faixa. As cenas (Exódia, Absolutos, Reflect) também têm
 * texto: no `catchUp` elas viram faixa (spec §4.1: sem cenas especiais na volta).
 */
export function bannerText(event: GameEvent, names: Names): string | null {
  switch (event.type) {
    case 'RoundStarted':
      return `Rodada ${event.round} · ${event.kind === 'EQUIP' ? 'Equipar' : 'Ataque'}`;
    case 'TurnStarted':
      return event.player === names.me ? 'Sua vez' : `Vez de ${names.of(event.player)}`;
    case 'ReactionWindowOpened':
      return event.responder === names.me ? 'Você pode reagir' : `${names.of(event.responder)} pode reagir`;
    case 'DeckReshuffled':
      return 'O cemitério virou o monte';
    case 'OrderChosen':
    case 'PressureChanged':
    case 'InitiativeChanged':
    case 'QuadFormed':
    case 'QuadBroken':
    case 'GameOver':
    case 'Exodia':
    case 'AbsoluteAttack':
    case 'AbsoluteDefenseStarted':
    case 'ReflectPlayed':
    case 'ReflectTriggered':
      return eventText(event, names);
    default:
      return null;
  }
}

/** O título e a linha de baixo da cena da batida; vazios se a batida não é uma cena. */
export function sceneText(beat: Beat, names: Names): { title: string; detail: string } {
  const { event, scene } = beat;
  if (scene === null) return { title: '', detail: '' };
  const title = SCENE_TITLE[scene];
  switch (event.type) {
    case 'Exodia':
      return { title, detail: `${names.of(event.player)} reuniu os quatro K` };
    case 'AbsoluteAttack':
    case 'AbsoluteDefenseStarted':
      return { title, detail: names.of(event.player) };
    case 'ReflectPlayed':
      return { title, detail: `${names.of(event.player)} armou o escudo` };
    case 'ReflectTriggered': {
      const target = event.attacker === names.me ? 'você' : names.of(event.attacker);
      return { title, detail: `O ataque voltou: ${event.damage} de dano em ${target}` };
    }
    default:
      return { title, detail: '' };
  }
}
