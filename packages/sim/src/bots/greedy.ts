import type { Action, PlayerView, ReactionTrigger, SpecialCard } from '@coringa/engine';
import type { Rng } from '../rng.ts';
import {
  attackBase,
  best,
  boardScore,
  canHoldReflect,
  emptied,
  defenseBase,
  hpDamage,
  placeAll,
  reflectedDamage,
  stealValue,
  wildsUsed,
  without,
} from './eval.ts';
import type { Bot } from './types.ts';

/** Limiares das heurísticas (spec §3). Mudar um deles muda o bot, não a regra. */
export const GREEDY = {
  /** Dano refletido a partir do qual vale responder ao Reflect do oponente com outro Reflect. */
  reflectThreat: 10,
  /** Valor mínimo do alvo para gastar A na fase principal (abaixo disso, guarda para reação). */
  trapMain: 12,
  /** Valor mínimo de um Roubo (mesa + dano ou cura) para gastar A nele. */
  stealMain: 12,
  /** Dano evitado mínimo para gastar A na reação a um ataque. */
  trapReaction: 10,
  /** Dano que o oponente levaria do próprio ataque, refletido, a partir do qual vale responder ao ataque com Reflect. */
  reflectAttack: 30,
  /** Quanto a Devastação precisa mexer na avaliação de mesa (a meu favor) para valer as 3 cartas. */
  devastation: 25,
} as const;

type Of<T extends Action['type']> = Extract<Action, { type: T }>;
const ofType = <T extends Action['type']>(legal: Action[], type: T): Of<T>[] =>
  legal.filter((a): a is Of<T> => a.type === type);

/** Entre jogadas equivalentes, a que gasta menos Selvagens; depois, sorteio. */
function cheapest<A extends Action>(actions: A[], view: PlayerView, rng: Rng): A {
  return best(actions, (a) => -wildsUsed(a, view.self.hand), (ties) => rng.pick(ties));
}

function closing(legal: Action[]): Action {
  const end = legal.find((a) => a.type === 'DECLARE_ATTACK' || a.type === 'END_TURN');
  // Não mude este texto sem mudar `BOT_TEXT_MARK` em `packages/web/scripts/smoke.ts`: o smoke da web o usa para achar o bot no bundle.
  if (!end) throw new Error('fase principal sem DECLARE_ATTACK/END_TURN');
  return end;
}

/**
 * O que cada especial vale na mão, para o descarte do limite (CHOOSE, E3): sai primeiro o J ou o Q sem lugar (buffs no limite),
 * depois Q, J, A, Selvagem e K. A política decide o resultado da medição da CHOOSE e vai escrita no relatório.
 */
export function keepValue(view: PlayerView, kind: SpecialCard['kind']): number {
  const { self, config } = view;
  if (kind === 'J') return self.attackBuffs.length >= config.buffLimit ? 0 : 2;
  if (kind === 'Q') return self.defenseBuffs.length >= config.buffLimit ? 0 : 1;
  return { A: 3, WILD: 4, K: 5 }[kind];
}

/** Equipar: os destinos que maximizam a avaliação de mesa no próximo ataque; antes, o descarte do limite, se houver. */
function chooseEquip(view: PlayerView, legal: Action[], rng: Rng): Action {
  const discards = ofType(legal, 'DISCARD');
  if (discards.length > 0) {
    const kinds = new Map(view.self.hand.map((c) => [c.id, c.kind]));
    return best(discards, (a) => -a.cardIds.reduce((sum, id) => sum + keepValue(view, kinds.get(id)!), 0), (ties) => rng.pick(ties));
  }
  return best(
    ofType(legal, 'EQUIP'),
    (a) => boardScore(placeAll(view.self, view.self.pending, a.destinations), view.opponent),
    (ties) => rng.pick(ties),
  );
}

/** Escolha da ordem pela situação de vida: 1º com letal; senão, 1º só se estiver atrás. */
export function prefersFirst(view: PlayerView): boolean {
  const { self, opponent, config } = view;
  if (hpDamage(self, opponent, config.buffLimit) >= opponent.hp) return true;
  return self.hp < opponent.hp;
}

/** Valor de destruir um J/Q/K do oponente (A na maior ameaça). */
export function targetValue(view: PlayerView, targetId: string): number {
  const { self, opponent, config } = view;
  if (opponent.guard.some((c) => c.id === targetId)) {
    if (opponent.guard.length >= config.exodiaGuard - 1) return 1000;
    return opponent.guard.length === 1 ? hpDamage(self, without(opponent, targetId), config.buffLimit) : 0;
  }
  if (opponent.attackBuffs.some((c) => c.id === targetId)) {
    return attackBase(opponent) + (opponent.attackBuffs.length >= config.buffLimit ? 100 : 0);
  }
  return defenseBase(opponent);
}

function mainPhase(view: PlayerView, legal: Action[], rng: Rng): Action {
  const { self, opponent, config } = view;
  const kings = ofType(legal, 'PLAY_K');
  const allKings = kings.at(-1);
  // 1. Exódia: se os K da mão completam a Guarda, joga todos.
  if (allKings && self.guard.length + allKings.cardIds.length >= config.exodiaGuard) return allKings;
  // 2. Ressurreição: sempre, no lugar que mais melhora a mesa.
  const resurrections = ofType(legal, 'RESURRECT');
  if (resurrections.length > 0) {
    return best(
      resurrections,
      (a) => {
        const card = view.graveyard.find((c) => c.id === a.cardId);
        return card?.kind === 'NUM' ? boardScore(placeAll(self, [card], [a.row]), opponent) : -Infinity;
      },
      (ties) => rng.pick(ties),
    );
  }
  // 3. Devastação na fileira cuja perda mais muda a mesa a meu favor (o Reflect do oponente fica por conta dele).
  const devastations = ofType(legal, 'DEVASTATE');
  if (devastations.length > 0) {
    const gain = (a: Of<'DEVASTATE'>) => boardScore(self, emptied(opponent, a.row)) - boardScore(self, opponent);
    const pick = best(devastations, (a) => gain(a) - wildsUsed(a, self.hand) / 2, (ties) => rng.pick(ties));
    if (gain(pick) >= GREEDY.devastation) return pick;
  }
  // 4. O A na fase principal: Armadilha na maior ameaça ou Roubo, o que valer mais, se valer gastar o A agora.
  const traps = ofType(legal, 'TRAP');
  const steals = ofType(legal, 'STEAL');
  const trap = traps.length > 0 ? best(traps, (a) => targetValue(view, a.targetId) - wildsUsed(a, self.hand) / 2, (ties) => rng.pick(ties)) : null;
  const stolen = steals.length > 0 ? best(steals, (a) => stealValue(view, a) - wildsUsed(a, self.hand) / 2, (ties) => rng.pick(ties)) : null;
  const trapWorth = trap && targetValue(view, trap.targetId) >= GREEDY.trapMain ? targetValue(view, trap.targetId) : -Infinity;
  const stealWorth = stolen && stealValue(view, stolen) >= GREEDY.stealMain ? stealValue(view, stolen) : -Infinity;
  if (trap && trapWorth >= stealWorth && trapWorth > -Infinity) return trap;
  if (stolen && stealWorth > -Infinity) return stolen;
  // 5. Sacrifício quando o buff do oponente vale mais que o meu.
  const sacrifices = ofType(legal, 'SACRIFICE');
  const worth = sacrifices.filter((s) =>
    opponent.attackBuffs.some((c) => c.id === s.targetId)
      ? attackBase(opponent) > attackBase(self)
      : defenseBase(opponent) > defenseBase(self),
  );
  if (worth.length > 0) return cheapest(worth, view, rng);
  // 6. Guarda: joga os K, guardando um enquanto der para montar um Reflect (a resposta a um ataque).
  const playable = kings.length - (canHoldReflect(view) ? 1 : 0);
  if (playable > 0) return kings[playable - 1];
  // 7. Buffs onde há fileira para multiplicar.
  const js = ofType(legal, 'PLAY_J');
  if (js.length > 0 && self.attackRow.length > 0) return cheapest(js, view, rng);
  const qs = ofType(legal, 'PLAY_Q');
  if (qs.length > 0 && self.defenseRow.length > 0) return cheapest(qs, view, rng);
  return closing(legal);
}

function reaction(view: PlayerView, legal: Action[], trigger: ReactionTrigger, rng: Rng): Action {
  const { self, opponent, config } = view;
  const pass: Action = { type: 'PASS' };
  const devastation = view.phase.kind === 'REACTION' ? view.phase.devastation : undefined;
  /** O quanto a minha mesa piora se eu perder a fileira `row` (Devastação). */
  const rowLoss = (row: 'ATK' | 'DEF') => boardScore(self, opponent) - boardScore(emptied(self, row), opponent);
  if (trigger === 'DEVASTATION') {
    const reflects = ofType(legal, 'REFLECT');
    if (!devastation || reflects.length === 0 || rowLoss(devastation.row) < GREEDY.reflectThreat) return pass;
    return cheapest(reflects, view, rng);
  }
  if (trigger === 'REFLECT_PLAYED') {
    // Fui refletido: outro Reflect anula os dois quando o golpe que volta doeria (ou a fileira que eu perderia valia).
    const back = devastation ? rowLoss(devastation.row) : reflectedDamage(self);
    if (back < GREEDY.reflectThreat && back < self.hp) return pass;
    const cancels = ofType(legal, 'CANCEL_REFLECT');
    return cancels.length > 0 ? cheapest(cancels, view, rng) : pass;
  }
  // Contra um ataque, o Reflect vem antes da Armadilha: tirar um J do atacante diminuiria o que volta para ele.
  const reflects = ofType(legal, 'REFLECT');
  if (trigger === 'ATTACK' && reflects.length > 0) {
    const lethal = hpDamage(opponent, self, config.buffLimit) >= self.hp;
    if (reflectedDamage(opponent) >= GREEDY.reflectAttack || lethal) return cheapest(reflects, view, rng);
  }
  const traps = ofType(legal, 'TRAP');
  if (traps.length === 0) return pass;
  if (trigger === 'K_PLAYED') {
    return opponent.guard.length >= config.exodiaGuard - 1 ? cheapest(traps, view, rng) : pass;
  }
  // ATTACK: a Armadilha que mais reduz o dano que vou levar.
  const incoming = hpDamage(opponent, self, config.buffLimit);
  const after = (a: Of<'TRAP'>) => hpDamage(without(opponent, a.targetId), self, config.buffLimit);
  const trap = best(traps, (a) => incoming - after(a) - wildsUsed(a, self.hand) / 2, (ties) => rng.pick(ties));
  const saved = incoming - after(trap);
  const savesLife = incoming >= self.hp && after(trap) < self.hp;
  return saved >= GREEDY.trapReaction || savesLife ? trap : pass;
}

export const greedyBot: Bot = (view, legal, rng) => {
  const phase = view.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return chooseEquip(view, legal, rng);
    case 'ORDER_CHOICE':
      return { type: 'CHOOSE_ORDER', first: prefersFirst(view) };
    case 'ATTACK_MAIN':
      return mainPhase(view, legal, rng);
    case 'REACTION':
      return reaction(view, legal, phase.trigger, rng);
    case 'GAME_OVER':
      throw new Error('bot chamado depois do fim da partida');
  }
};
