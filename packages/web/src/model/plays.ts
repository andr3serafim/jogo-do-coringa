// Jogadas da mesa a partir de `legalActions` (spec §1.5, passo 2, e §3.4). Puro: sem React nem DOM.
//
// `legalActions` devolve representantes canônicos (a primeira carta de cada tipo), mas o motor aceita
// qualquer carta da mão do mesmo tipo. Por isso a mesa compara pelo papel (`roleKey`): tipo de jogada,
// tipo de carta e alvo, nunca o id de uma carta da mão. Nenhuma regra do jogo mora aqui: só se
// reaproveita o que a lista legal já diz, trocando a carta canônica pela que o jogador tocou.
import { legalActions, type Card, type PlayerView, type Rank, type RowName, type SpecialCard } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { asRoleText, guardText, PLAY_TEXT, targetText, type TargetZone } from './copy.ts';

export interface Target {
  id: string;
  zone: TargetZone;
  label: string;
}

export interface CardPlay {
  /** Estável dentro da carta: `PLAY_J`, `TRAP`, `SACRIFICE:Q`, `PLAY_K:2`. */
  key: string;
  label: string;
  /** `null`: a jogada não pede alvo. */
  targets: Target[] | null;
  make(targetId?: string): PlayerAction;
}

export interface TablePlays {
  /** Id da carta da mão → jogadas com ela. Cartas sem jogada não aparecem. */
  byCard: Map<string, CardPlay[]>;
  reflect: PlayerAction | null;
  cancelReflect: PlayerAction | null;
  /** A Devastação (F3), uma por fileira do oponente: a de menos Selvagens. */
  devastate: PlayerAction[];
  /** Um item por valor no cemitério; `rows` só com as fileiras que têm vaga. */
  resurrect: { cardId: string; value: Rank; rows: RowName[] }[];
  finish: { type: 'DECLARE_ATTACK' } | { type: 'END_TURN' } | null;
  pass: boolean;
}

/** As jogadas legais de quem vê `view`, sem `TIMEOUT` nem `FORFEIT` (que o motor nunca lista). */
export function legalFor(view: PlayerView): PlayerAction[] {
  return legalActions(view).filter((a): a is PlayerAction => a.type !== 'TIMEOUT' && a.type !== 'FORFEIT');
}

/** Cartas da mão e do próprio campo, por id. */
function ownCards(view: PlayerView): Map<string, SpecialCard> {
  const { hand, attackBuffs, defenseBuffs, guard } = view.self;
  return new Map([...hand, ...attackBuffs, ...defenseBuffs, ...guard].map((c) => [c.id, c]));
}

/** Ids de carta (mão, cemitério ou campo) de uma ação; o alvo e a fileira ficam de fora. */
function cardIdsOf(action: PlayerAction): string[] {
  switch (action.type) {
    case 'PLAY_J':
    case 'PLAY_Q':
    case 'TRAP':
    case 'SACRIFICE':
    case 'RESURRECT':
      return [action.cardId];
    case 'PLAY_K':
      return action.cardIds;
    case 'REFLECT':
    case 'CANCEL_REFLECT':
      return [action.kId, action.jId, action.qId];
    case 'DEVASTATE':
      return [action.kId, action.aId, action.xId];
    default:
      return [];
  }
}

/**
 * A jogada sem os ids das cartas da mão: cada id da mão vira o `kind` da carta (`J`, `Q`, `K`, `A`,
 * `WILD`) e cada id do cemitério vira `NUM:<valor>`. Os ids de alvo (cartas do oponente) e de campo
 * ficam como estão. Os campos entram numa ordem fixa por tipo, então o formato do objeto não importa.
 */
export function roleKey(action: PlayerAction, view: PlayerView): string {
  const inHand = new Map<string, string>(view.self.hand.map((c) => [c.id, c.kind]));
  for (const c of view.graveyard) if (c.kind === 'NUM') inHand.set(c.id, `NUM:${c.value}`);
  const role = (id: string): string => inHand.get(id) ?? id;
  switch (action.type) {
    case 'PLAY_J':
    case 'PLAY_Q':
      return `${action.type}|${role(action.cardId)}`;
    case 'PLAY_K':
      return `PLAY_K|${action.cardIds.map(role).join(',')}`;
    case 'TRAP':
    case 'SACRIFICE':
      return `${action.type}|${role(action.cardId)}|${action.targetId}`;
    case 'REFLECT':
    case 'CANCEL_REFLECT':
      return `${action.type}|${role(action.kId)}|${role(action.jId)}|${role(action.qId)}`;
    case 'RESURRECT':
      return `RESURRECT|${role(action.cardId)}|${action.row}`;
    case 'DEVASTATE':
      return `DEVASTATE|${role(action.kId)}|${role(action.aId)}|${role(action.xId)}|${action.row}`;
    case 'EQUIP':
      return `EQUIP|${action.destinations.join(',')}`;
    case 'CHOOSE_ORDER':
      return `CHOOSE_ORDER|${action.first}`;
    case 'DECLARE_ATTACK':
    case 'END_TURN':
    case 'PASS':
      return action.type;
  }
}

/** `action` é uma das jogadas legais pelo papel, e não repete uma carta (o motor recusa `DUPLICATE_CARDS`). */
export function isLegal(action: PlayerAction, legal: PlayerAction[], view: PlayerView): boolean {
  const ids = cardIdsOf(action);
  if (new Set(ids).size !== ids.length) return false;
  const key = roleKey(action, view);
  return legal.some((l) => roleKey(l, view) === key);
}

interface Group {
  key: string;
  label: string;
  build(targetId?: string): PlayerAction;
  targets: Target[] | null;
}

interface OpponentCard {
  id: string;
  card: SpecialCard;
  zone: TargetZone;
}

/** Cartas do oponente que podem ser alvo, por id. */
function opponentTargets(view: PlayerView): Map<string, OpponentCard> {
  const out = new Map<string, OpponentCard>();
  const zones: TargetZone[] = ['attackBuffs', 'defenseBuffs', 'guard'];
  for (const zone of zones) for (const card of view.opponent[zone]) out.set(card.id, { id: card.id, card, zone });
  return out;
}

/** As jogadas da carta `card`: cada jogada legal feita com uma carta do mesmo tipo, trocando pela tocada. */
function playsOf(card: SpecialCard, view: PlayerView, legal: PlayerAction[], targets: Map<string, OpponentCard>): CardPlay[] {
  const kindInHand = new Map(view.self.hand.map((c) => [c.id, c.kind]));
  const sameKind = (id: string): boolean => kindInHand.get(id) === card.kind;
  const kings = view.self.hand.filter((c) => c.kind === 'K');
  const groups = new Map<string, Group>();

  const add = (
    key: string,
    role: 'J' | 'Q' | 'A' | null,
    text: string,
    build: (targetId?: string) => PlayerAction,
    target?: OpponentCard,
  ): void => {
    let group = groups.get(key);
    if (!group) {
      const label = card.kind === 'WILD' && role !== null ? asRoleText(role, text) : text;
      group = { key, label, build, targets: target ? [] : null };
      groups.set(key, group);
    }
    if (target && !group.targets!.some((t) => t.id === target.id)) {
      group.targets!.push({ id: target.id, zone: target.zone, label: targetText(target.card, target.zone) });
    }
  };

  for (const entry of legal) {
    switch (entry.type) {
      case 'PLAY_J':
      case 'PLAY_Q': {
        if (!sameKind(entry.cardId)) break;
        const type = entry.type;
        add(type, type === 'PLAY_J' ? 'J' : 'Q', PLAY_TEXT[type], () => ({ type, cardId: card.id }));
        break;
      }
      case 'PLAY_K': {
        if (card.kind !== 'K') break;
        const count = entry.cardIds.length;
        const others = kings.filter((k) => k.id !== card.id).map((k) => k.id);
        add(`PLAY_K:${count}`, null, guardText(count, kings.length), () => ({
          type: 'PLAY_K',
          cardIds: [card.id, ...others.slice(0, count - 1)],
        }));
        break;
      }
      case 'TRAP': {
        const target = targets.get(entry.targetId);
        if (!sameKind(entry.cardId) || !target) break;
        add('TRAP', 'A', PLAY_TEXT.TRAP, (targetId) => ({ type: 'TRAP', cardId: card.id, targetId: targetId! }), target);
        break;
      }
      case 'SACRIFICE': {
        const target = targets.get(entry.targetId);
        if (!sameKind(entry.cardId) || !target) break;
        // O papel do Selvagem no Sacrifício é o do alvo: J abate J, Q abate Q.
        const role = target.zone === 'attackBuffs' ? 'J' : 'Q';
        add(
          `SACRIFICE:${role}`,
          role,
          PLAY_TEXT.SACRIFICE,
          (targetId) => ({ type: 'SACRIFICE', cardId: card.id, targetId: targetId! }),
          target,
        );
        break;
      }
      default:
        break;
    }
  }

  return [...groups.values()].map(
    ({ key, label, build, targets: list }): CardPlay => ({
      key,
      label,
      targets: list,
      make(targetId) {
        if (list && !list.some((t) => t.id === targetId)) throw new Error(`alvo inválido para "${label}"`);
        return build(targetId);
      },
    }),
  );
}

/** Entre as combinações legais, a de menos Selvagens (entre cartas da mão ou do próprio campo). */
function fewestWilds(list: PlayerAction[], view: PlayerView): PlayerAction | null {
  const own = ownCards(view);
  const wilds = (a: PlayerAction): number => cardIdsOf(a).filter((id) => own.get(id)?.kind === 'WILD').length;
  let best: PlayerAction | null = null;
  for (const candidate of list) if (best === null || wilds(candidate) < wilds(best)) best = candidate;
  return best;
}

/** Tudo o que a mesa pode oferecer, a partir da lista legal. */
export function tablePlays(view: PlayerView, legal: PlayerAction[]): TablePlays {
  const targets = opponentTargets(view);
  const byCard = new Map<string, CardPlay[]>();
  for (const card of view.self.hand) {
    const plays = playsOf(card, view, legal, targets);
    if (plays.length > 0) byCard.set(card.id, plays);
  }

  const graveyard = new Map<string, Card>(view.graveyard.map((c) => [c.id, c]));
  const resurrect = new Map<string, { cardId: string; value: Rank; rows: RowName[] }>();
  for (const entry of legal) {
    if (entry.type !== 'RESURRECT') continue;
    const card = graveyard.get(entry.cardId);
    if (card?.kind !== 'NUM') continue;
    const item = resurrect.get(entry.cardId) ?? { cardId: entry.cardId, value: card.value, rows: [] };
    item.rows.push(entry.row);
    resurrect.set(entry.cardId, item);
  }

  const has = (type: PlayerAction['type']): boolean => legal.some((a) => a.type === type);
  return {
    byCard,
    reflect: fewestWilds(legal.filter((a) => a.type === 'REFLECT'), view),
    cancelReflect: fewestWilds(legal.filter((a) => a.type === 'CANCEL_REFLECT'), view),
    devastate: (['ATK', 'DEF'] as const)
      .map((row) => fewestWilds(legal.filter((a) => a.type === 'DEVASTATE' && a.row === row), view))
      .filter((a): a is PlayerAction => a !== null),
    resurrect: [...resurrect.values()],
    finish: has('DECLARE_ATTACK') ? { type: 'DECLARE_ATTACK' } : has('END_TURN') ? { type: 'END_TURN' } : null,
    pass: has('PASS'),
  };
}
