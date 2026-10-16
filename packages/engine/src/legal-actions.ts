import type { Action, Destination, PlayerView, ReactionTrigger, SpecialCard, SpecialKind } from './types';

const firstOf = (cards: SpecialCard[], kind: SpecialKind): SpecialCard | undefined => cards.find((c) => c.kind === kind);
const defined = (c: SpecialCard | undefined): c is SpecialCard => c !== undefined;

/** Representantes canônicos para um papel: a primeira carta real do tipo e o primeiro Selvagem. */
function sources(hand: SpecialCard[], kind: 'J' | 'Q' | 'A'): SpecialCard[] {
  return [firstOf(hand, kind), firstOf(hand, 'WILD')].filter(defined);
}

function reflectCombos(hand: SpecialCard[]): Array<{ k: string; j: string; q: string }> {
  const k = firstOf(hand, 'K');
  if (!k) return [];
  const wilds = hand.filter((c) => c.kind === 'WILD').slice(0, 2);
  const js = [firstOf(hand, 'J'), ...wilds].filter(defined);
  const qs = [firstOf(hand, 'Q'), ...wilds].filter(defined);
  const combos: Array<{ k: string; j: string; q: string }> = [];
  for (const j of js) {
    for (const q of qs) {
      if (j.id !== q.id) combos.push({ k: k.id, j: j.id, q: q.id });
    }
  }
  return combos;
}

function equipOptions(view: PlayerView): Destination[][] {
  const limit = view.config.rowLimit;
  const results: Destination[][] = [];
  const walk = (i: number, atk: number, def: number, acc: Destination[]): void => {
    if (i === view.self.pending.length) {
      results.push(acc);
      return;
    }
    if (atk >= limit && def >= limit) {
      for (const d of ['REPLACE_LAST_ATK', 'REPLACE_LAST_DEF', 'DISCARD'] as const) walk(i + 1, atk, def, [...acc, d]);
      return;
    }
    if (atk < limit) walk(i + 1, atk + 1, def, [...acc, 'ATK']);
    if (def < limit) walk(i + 1, atk, def + 1, [...acc, 'DEF']);
  };
  walk(0, view.self.attackRow.length, view.self.defenseRow.length, []);
  return results;
}

function protectAction(view: PlayerView): Action[] {
  const j = view.self.attackBuffs.at(0);
  const q = view.self.defenseBuffs.at(0);
  const k = view.self.guard.at(0);
  return j && q && k ? [{ type: 'PROTECT_FROM_REFLECT', jId: j.id, qId: q.id, kId: k.id }] : [];
}

function mainOptions(view: PlayerView): Action[] {
  const { self, opponent, config, graveyard } = view;
  const actions: Action[] = [];
  if (self.attackBuffs.length < config.buffLimit) {
    for (const c of sources(self.hand, 'J')) actions.push({ type: 'PLAY_J', cardId: c.id });
  }
  if (self.defenseBuffs.length < config.buffLimit) {
    for (const c of sources(self.hand, 'Q')) actions.push({ type: 'PLAY_Q', cardId: c.id });
  }
  const kings = self.hand.filter((c) => c.kind === 'K');
  for (let n = 1; n <= kings.length; n += 1) {
    actions.push({ type: 'PLAY_K', cardIds: kings.slice(0, n).map((c) => c.id) });
  }
  if (!opponent.absoluteDefense) {
    const targets = [...opponent.attackBuffs, ...opponent.defenseBuffs, ...opponent.guard];
    for (const c of sources(self.hand, 'A')) {
      for (const t of targets) actions.push({ type: 'TRAP', cardId: c.id, targetId: t.id });
    }
    for (const c of sources(self.hand, 'J')) {
      for (const t of opponent.attackBuffs) actions.push({ type: 'SACRIFICE', cardId: c.id, targetId: t.id });
    }
    for (const c of sources(self.hand, 'Q')) {
      for (const t of opponent.defenseBuffs) actions.push({ type: 'SACRIFICE', cardId: c.id, targetId: t.id });
    }
  }
  if (!self.reflect) {
    for (const c of reflectCombos(self.hand)) actions.push({ type: 'REFLECT', kId: c.k, jId: c.j, qId: c.q });
  }
  if (opponent.reflect) actions.push(...protectAction(view));
  if (self.resurrections.length > 0) {
    const seen = new Set<number>();
    for (const card of graveyard) {
      if (card.kind !== 'NUM' || seen.has(card.value)) continue;
      seen.add(card.value);
      if (self.attackRow.length < config.rowLimit) actions.push({ type: 'RESURRECT', cardId: card.id, row: 'ATK' });
      if (self.defenseRow.length < config.rowLimit) actions.push({ type: 'RESURRECT', cardId: card.id, row: 'DEF' });
    }
  }
  actions.push(self.attackRow.length > 0 ? { type: 'DECLARE_ATTACK' } : { type: 'END_TURN' });
  return actions;
}

function reactionOptions(view: PlayerView, trigger: ReactionTrigger): Action[] {
  const { self, opponent } = view;
  const actions: Action[] = [{ type: 'PASS' }];
  if (trigger === 'REFLECT_PLAYED') {
    for (const c of reflectCombos(self.hand)) actions.push({ type: 'CANCEL_REFLECT', kId: c.k, jId: c.j, qId: c.q });
    actions.push(...protectAction(view));
    return actions;
  }
  if (opponent.absoluteDefense) return actions;
  const targets =
    trigger === 'K_PLAYED' ? opponent.guard : [...opponent.attackBuffs, ...opponent.defenseBuffs, ...opponent.guard];
  for (const c of sources(self.hand, 'A')) {
    for (const t of targets) actions.push({ type: 'TRAP', cardId: c.id, targetId: t.id });
  }
  return actions;
}

/** Jogadas canônicas disponíveis para quem vê `view`. Lista vazia = não é a vez dele. */
export function legalActions(view: PlayerView): Action[] {
  const phase = view.phase;
  switch (phase.kind) {
    case 'GAME_OVER':
      return [];
    case 'EQUIP':
      return view.self.equipSubmitted ? [] : equipOptions(view).map((destinations): Action => ({ type: 'EQUIP', destinations }));
    case 'ORDER_CHOICE':
      return phase.player === view.me
        ? [
            { type: 'CHOOSE_ORDER', first: true },
            { type: 'CHOOSE_ORDER', first: false },
          ]
        : [];
    case 'ATTACK_MAIN':
      return phase.player === view.me ? mainOptions(view) : [];
    case 'REACTION':
      return phase.responder === view.me ? reactionOptions(view, phase.trigger) : [];
  }
}
