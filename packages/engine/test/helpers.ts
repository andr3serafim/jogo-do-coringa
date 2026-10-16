import { applyAction } from '../src/apply-action';
import { makeConfig, type ConfigOverrides } from '../src/config';
import { createGame } from '../src/create-game';
import { currentQuads } from '../src/quads';
import { getPlayer } from '../src/state';
import type {
  Action,
  Card,
  GameEvent,
  GameState,
  NumCard,
  Phase,
  PlayerId,
  PlayerState,
  Rank,
  RuleErrorCode,
  SpecialCard,
  SpecialKind,
} from '../src/types';

export const P1 = 'p1';
export const P2 = 'p2';

export type SpecialSpec = 'J' | 'Q' | 'K' | 'A' | 'W';
export type CardSpec = Rank | SpecialSpec;

export interface PlayerSetup {
  hp?: number;
  hand?: SpecialSpec[];
  pending?: Rank[];
  attack?: Rank[];
  defense?: Rank[];
  attackBuffs?: Array<'J' | 'W'>;
  defenseBuffs?: Array<'Q' | 'W'>;
  guard?: number;
  reflect?: boolean;
  absoluteDefense?: boolean;
  equipSubmitted?: boolean;
}

export interface Setup {
  config?: ConfigOverrides;
  p1?: PlayerSetup;
  p2?: PlayerSetup;
  graveyard?: CardSpec[];
  phase?: Phase;
  round?: number;
  roundKind?: 'EQUIP' | 'ATTACK';
  initiative?: PlayerId;
  turnOrder?: [PlayerId, PlayerId];
  pressure?: number;
  noDamageStreak?: number;
}

function matches(card: Card, spec: CardSpec): boolean {
  if (typeof spec === 'number') return card.kind === 'NUM' && card.value === spec;
  if (spec === 'W') return card.kind === 'WILD';
  return card.kind === spec;
}

/**
 * Monta um cenário a partir de uma partida real: devolve todas as cartas ao monte e
 * retira dele as cartas pedidas. Assim nenhuma carta é inventada e o total se conserva.
 * Padrão: rodada 3 de Ataque, fase principal de P1, ordem [P1, P2], iniciativa de P1.
 */
export function setup(spec: Setup = {}): GameState {
  const created = createGame(makeConfig(spec.config), 'seed-teste', [P1, P2]);
  if (!created.ok) throw new Error(created.error.message);
  const s = created.state;
  for (const p of s.players) {
    s.deck.push(...p.hand, ...p.pending);
    p.hand = [];
    p.pending = [];
  }
  const take = (cs: CardSpec): Card => {
    const index = s.deck.findIndex((c) => matches(c, cs));
    if (index < 0) throw new Error(`carta indisponível no monte: ${String(cs)}`);
    return s.deck.splice(index, 1)[0];
  };
  const takeNum = (v: Rank): NumCard => take(v) as NumCard;
  const takeSpecial = (cs: SpecialSpec): SpecialCard => take(cs) as SpecialCard;

  const entries: Array<[PlayerId, PlayerSetup]> = [
    [P1, spec.p1 ?? {}],
    [P2, spec.p2 ?? {}],
  ];
  for (const [id, ps] of entries) {
    const p = getPlayer(s, id);
    p.hp = ps.hp ?? s.config.hp;
    p.hand = (ps.hand ?? []).map(takeSpecial);
    p.pending = (ps.pending ?? []).map(takeNum);
    p.attackRow = (ps.attack ?? []).map(takeNum);
    p.defenseRow = (ps.defense ?? []).map(takeNum);
    p.attackBuffs = (ps.attackBuffs ?? []).map(takeSpecial);
    p.defenseBuffs = (ps.defenseBuffs ?? []).map(takeSpecial);
    p.guard = Array.from({ length: ps.guard ?? 0 }, () => takeSpecial('K'));
    p.reflect = ps.reflect ? { k: takeSpecial('K'), j: takeSpecial('J'), q: takeSpecial('Q') } : null;
    p.absoluteDefense = ps.absoluteDefense ?? false;
    p.equipSubmitted = ps.equipSubmitted ?? false;
    p.submittedDestinations = null;
    p.quads = currentQuads(p);
    p.resurrections = [];
    p.damageThisRound = 0;
  }
  s.graveyard = (spec.graveyard ?? []).map(take);
  s.round = spec.round ?? 3;
  s.roundKind = spec.roundKind ?? 'ATTACK';
  s.initiative = spec.initiative ?? P1;
  const turnOrder: [PlayerId, PlayerId] = spec.turnOrder ?? [P1, P2];
  s.turnOrder = turnOrder;
  s.phase = spec.phase ?? { kind: 'ATTACK_MAIN', player: turnOrder[0] };
  const phase = s.phase;
  s.turnIndex = phase.kind === 'ATTACK_MAIN' && phase.player === turnOrder[1] ? 1 : 0;
  s.pressure = spec.pressure ?? 0;
  s.noDamageStreak = spec.noDamageStreak ?? 0;
  s.hpLostThisRound = false;
  return s;
}

export function player(s: GameState, id: PlayerId): PlayerState {
  return getPlayer(s, id);
}

export function handId(s: GameState, id: PlayerId, kind: SpecialKind, nth = 0): string {
  const card = getPlayer(s, id).hand.filter((c) => c.kind === kind)[nth];
  if (!card) throw new Error(`sem ${kind} (#${nth}) na mão de ${id}`);
  return card.id;
}

export function values(cards: NumCard[]): number[] {
  return cards.map((c) => c.value);
}

export function allCards(s: GameState): Card[] {
  const cards: Card[] = [...s.deck, ...s.graveyard];
  for (const p of s.players) {
    cards.push(...p.hand, ...p.pending, ...p.attackRow, ...p.defenseRow, ...p.attackBuffs, ...p.defenseBuffs, ...p.guard);
    if (p.reflect) cards.push(p.reflect.k, p.reflect.j, p.reflect.q);
  }
  return cards;
}

export function act(s: GameState, who: PlayerId | 'system', action: Action): { state: GameState; events: GameEvent[] } {
  const result = applyAction(s, who, action);
  if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
  return { state: result.state, events: result.events };
}

export function actErr(s: GameState, who: PlayerId | 'system', action: Action): RuleErrorCode {
  const result = applyAction(s, who, action);
  if (result.ok) throw new Error(`esperava erro em ${JSON.stringify(action)}`);
  return result.error.code;
}

export function steps(
  s: GameState,
  list: Array<[PlayerId | 'system', Action]>,
): { state: GameState; events: GameEvent[] } {
  let state = s;
  const events: GameEvent[] = [];
  for (const [who, action] of list) {
    const result = act(state, who, action);
    state = result.state;
    events.push(...result.events);
  }
  return { state, events };
}
