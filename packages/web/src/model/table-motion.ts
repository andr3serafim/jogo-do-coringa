// O movimento das jogadas comuns (sub-projeto 6 §8, fatia 5): quem recua antes de voar, quando cada carta pousa, quem sai para o cemitério
// (e se estoura em cacos) e quais vizinhas esperam a batida da saída para deslizar. Puro: sem React nem DOM, como `effects.ts`. Nada daqui
// muda a linha do tempo: os efeitos correm por cima das batidas, presos ao início de cada uma.
import type { GameEvent, PlayerId, PlayerView, PublicPlayer, SpecialCard } from '@coringa/engine';
import type { Beat } from './timeline.ts';

/** Os tempos e os tamanhos do movimento (ms e px). `landAfterMs` é o `visualDuration` da `LAYOUT_SPRING`. */
export const TABLE_MOTION = {
  recoilMs: 90,
  recoilPx: 6,
  landAfterMs: 420,
  squash: 1.06,
  squashMs: 160,
  dropPx: 14,
  dropMs: 220,
  dust: 5,
  dustBudget: 10,
  dustMs: 520,
  crackShakeMs: 120,
  shards: 10,
  shardBudget: 40,
  shardMs: 650,
  exitMs: 360,
  fanStaggerMs: 40,
  dealFlightMs: 320,
} as const;

/** As batidas de cena desenham as próprias cópias: nada daqui vale nelas. */
const plainBeats = (beats: readonly Beat[]): Beat[] => beats.filter((beat) => beat.scene === null);

/**
 * Quando a batida mexe na mesa: o início dela, ou, no momento da especial do oponente (bloco A dos pontos do playtest, ponto 1), o impacto,
 * quando a carta grande chega ao destino ou ao alvo.
 */
export const touchMs = (beat: Beat): number => beat.moment?.impactAtMs ?? beat.startMs;

/** As cartas que saem da mão de quem jogou, neste evento. */
function handCards(event: GameEvent): { player: PlayerId; cards: SpecialCard[] } | null {
  switch (event.type) {
    case 'BuffPlayed':
      return { player: event.player, cards: [event.card] };
    case 'GuardPlayed':
      return { player: event.player, cards: event.cards };
    case 'TrapUsed':
    case 'Sacrificed':
      return { player: event.player, cards: [event.card] };
    case 'CardStolen':
      return { player: event.player, cards: [event.ace] };
    case 'DevastationCast':
      return { player: event.player, cards: [event.k, event.a, event.x] };
    default:
      return null;
  }
}

/** As suas cartas que saem da sua mão: id → início da batida. Só as suas: a mão do oponente são versos, sem de onde recuar. */
export function recoilsOf(beats: readonly Beat[], me: PlayerId): ReadonlyMap<string, number> {
  const recoils = new Map<string, number>();
  for (const beat of plainBeats(beats)) {
    const from = handCards(beat.event);
    if (from?.player === me) for (const card of from.cards) recoils.set(card.id, beat.startMs);
  }
  return recoils;
}

export interface Landing {
  /** Quando a carta assenta (achata e solta a poeira), em ms desde o começo da linha do tempo. */
  atMs: number;
  /** A carta não tinha de onde voar: espera a batida e cai de `dropPx` acima. */
  drop: boolean;
  /** Quantos puffs de poeira ela solta: `dustPerCard` das cartas que pousam na mesma batida. */
  dust: number;
  /**
   * A carta não tinha de onde voar, e a cópia do momento chega nela (a especial do oponente): fica escondida até `atMs` e aparece de uma
   * vez, com o achatamento e a poeira, sem a queda.
   */
  snap?: true;
}

/**
 * No máximo `dust` puffs por carta e `dustBudget` por batida (§11): as cartas do Equipar pousam juntas, e a medição da fatia 5 achou a
 * compra abaixo de 50 quadros por segundo com os 30 puffs dela.
 */
export const dustPerCard = (count: number): number => Math.min(TABLE_MOTION.dust, Math.floor(TABLE_MOTION.dustBudget / Math.max(1, count)));

/**
 * Quando cada carta que chega pousa. A sua, da mão, depois do recuo e da mola; a do oponente cai no destino na batida dela; as do Equipar
 * pousam todas em `dropMs`, e as suas só não caem se o rascunho estava à vista (`draftShown`: você confirmou nesta página). A numérica
 * roubada voa de uma fileira para a outra, sem recuo.
 */
export function landingsOf(beats: readonly Beat[], me: PlayerId, draftShown: boolean): ReadonlyMap<string, Landing> {
  const { recoilMs, landAfterMs, dropMs } = TABLE_MOTION;
  const landings = new Map<string, Landing>();
  for (const beat of plainBeats(beats)) {
    const { event, startMs } = beat;
    const here: [string, Omit<Landing, 'dust'>][] = [];
    switch (event.type) {
      case 'BuffPlayed':
      case 'GuardPlayed': {
        const cards = event.type === 'BuffPlayed' ? [event.card] : event.cards;
        const mine = event.player === me;
        for (const card of cards) {
          if (beat.moment) here.push([card.id, { atMs: beat.moment.impactAtMs, drop: false, snap: true }]);
          else here.push([card.id, mine ? { atMs: startMs + recoilMs + landAfterMs, drop: false } : { atMs: startMs + dropMs, drop: true }]);
        }
        break;
      }
      case 'CardsPlaced':
        for (const { card } of event.placements) here.push([card.id, { atMs: startMs + dropMs, drop: event.player !== me || !draftShown }]);
        break;
      case 'CardStolen':
        here.push([event.card.id, { atMs: touchMs(beat) + landAfterMs, drop: false }]);
        break;
      default:
        break;
    }
    const dust = dustPerCard(here.length);
    for (const [id, landing] of here) landings.set(id, { ...landing, dust });
  }
  return landings;
}

export interface Leaving {
  /** O início da batida em que a carta sai. */
  startMs: number;
  /** A carta quebra (K da Guarda, o alvo da Armadilha e do Sacrifício): estoura em cacos em vez de voar ao cemitério. */
  shatter: boolean;
}

/** As cartas que vão ao cemitério numa batida que não é cena: id → a batida e se estoura. */
export function leavingOf(beats: readonly Beat[]): ReadonlyMap<string, Leaving> {
  const leaving = new Map<string, Leaving>();
  for (const beat of plainBeats(beats)) {
    const { event } = beat;
    const startMs = touchMs(beat);
    // No momento, a carta que o oponente usou vem da mão dele (versos sem id): quem a leva ao cemitério é a camada do momento.
    const opponentHand = beat.kind === 'moment';
    const add = (cards: readonly { id: string }[], shatter: boolean) => {
      for (const card of cards) leaving.set(card.id, { startMs, shatter });
    };
    switch (event.type) {
      case 'CardsRemovedFromRow':
      case 'BuffRemoved':
      case 'HandLimitPenalty':
        add(event.cards, false);
        break;
      case 'CardsPlaced':
        add(event.placements.flatMap((placement) => (placement.replaced ? [placement.replaced] : [])), false);
        break;
      case 'DevastationCast':
        add([event.k, event.a, event.x], false);
        break;
      case 'CardStolen':
        if (!opponentHand) add([event.ace], false);
        break;
      case 'TrapUsed':
      case 'Sacrificed':
        if (!opponentHand) add([event.card], false);
        add([event.target], true);
        break;
      case 'GuardBroken':
        add(event.cards, true);
        break;
      default:
        break;
    }
  }
  return leaving;
}

export interface Heal {
  /** O início da batida em que a carta saiu da Defesa: a essência sai da cópia dela. */
  fromMs: number;
  /** O início da batida da cura: a essência chega ao retrato, e o "+N" nasce ali. */
  atMs: number;
  player: PlayerId;
}

/**
 * A essência da cura passiva (bloco A dos pontos do playtest, ponto 9): cada carta da Defesa que curou, com a batida em que ela saiu e a da
 * cura. Sem a saída na mesma linha do tempo, a essência sai na batida da cura.
 */
export function healsOf(beats: readonly Beat[]): ReadonlyMap<string, Heal> {
  const left = new Map<string, number>();
  const heals = new Map<string, Heal>();
  for (const beat of plainBeats(beats)) {
    const { event } = beat;
    if (event.type === 'CardsRemovedFromRow' && event.row === 'DEF') for (const card of event.cards) left.set(card.id, touchMs(beat));
    if (event.type === 'Healed' && event.source === 'DEFENSE' && event.amount > 0) {
      heals.set(event.card.id, { fromMs: left.get(event.card.id) ?? beat.startMs, atMs: beat.startMs, player: event.player });
    }
  }
  return heals;
}

/** No máximo `shards` cacos por carta e `shardBudget` por batida (§11: até ~60 partículas vivas). */
export const shardsPerCard = (count: number): number => Math.min(TABLE_MOTION.shards, Math.floor(TABLE_MOTION.shardBudget / count));

type Zone = 'attackRow' | 'defenseRow' | 'attackBuffs' | 'defenseBuffs' | 'guard' | 'hand';

/** A zona de bônus (ou a Guarda) de uma especial que sai; o Selvagem pode estar em qualquer uma das duas de bônus. */
function specialZones(card: SpecialCard): Zone[] {
  if (card.kind === 'K') return ['guard'];
  if (card.kind === 'J') return ['attackBuffs'];
  if (card.kind === 'Q') return ['defenseBuffs'];
  return ['attackBuffs', 'defenseBuffs'];
}

/** De onde as cartas deste evento saem: o dono e as zonas. */
function vacated(event: GameEvent): { player: PlayerId; zones: Zone[] }[] {
  const places: { player: PlayerId; zones: Zone[] }[] = [];
  const hand = handCards(event);
  if (hand) places.push({ player: hand.player, zones: ['hand'] });
  switch (event.type) {
    case 'CardsRemovedFromRow':
      places.push({ player: event.player, zones: [event.row === 'ATK' ? 'attackRow' : 'defenseRow'] });
      break;
    case 'BuffRemoved':
      places.push({ player: event.player, zones: [...new Set(event.cards.flatMap(specialZones))] });
      break;
    case 'GuardBroken':
      places.push({ player: event.player, zones: ['guard'] });
      break;
    case 'TrapUsed':
    case 'Sacrificed':
      places.push({ player: event.targetOwner, zones: specialZones(event.target) });
      break;
    case 'CardStolen':
      places.push({ player: event.from, zones: [event.fromRow === 'ATK' ? 'attackRow' : 'defenseRow'] });
      break;
    case 'CardsPlaced':
      for (const placement of event.placements) {
        if (placement.destination === 'REPLACE_LAST_ATK') places.push({ player: event.player, zones: ['attackRow'] });
        if (placement.destination === 'REPLACE_LAST_DEF') places.push({ player: event.player, zones: ['defenseRow'] });
      }
      break;
    case 'HandLimitPenalty':
      places.push({ player: event.player, zones: ['hand'] });
      break;
    default:
      break;
  }
  return places;
}

function zoneCards(view: PlayerView, player: PlayerId, zone: Zone): readonly { id: string }[] {
  if (zone === 'hand') return player === view.me ? view.self.hand : [];
  const side: PublicPlayer = player === view.me ? view.self : view.opponent;
  return side[zone];
}

/**
 * As cartas que ficam no lugar de onde outra sai (a mesma fileira, a Guarda, a zona de bônus ou a sua mão) esperam o início da batida da
 * saída para deslizar até a vaga: a cópia da que sai fica no lugar até lá (E2). Com mais de uma saída no mesmo lugar, vale a última: a
 * carta desliza uma vez só, até o lugar final. `view` é a de depois da linha do tempo.
 */
export function shiftDelaysOf(beats: readonly Beat[], view: PlayerView): ReadonlyMap<string, number> {
  const shifts = new Map<string, number>();
  for (const beat of plainBeats(beats)) {
    for (const { player, zones } of vacated(beat.event)) {
      for (const zone of zones) for (const card of zoneCards(view, player, zone)) shifts.set(card.id, touchMs(beat));
    }
  }
  return shifts;
}
