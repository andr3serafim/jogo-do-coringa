import type { Action, PlayerView, ReactionTrigger } from '@coringa/engine';
import type { Rng } from '../rng.ts';
import {
  attackBase,
  best,
  boardScore,
  canCastReflect,
  defenseBase,
  hpDamage,
  placeAll,
  reflectedDamage,
  upcomingPressure,
  wildsUsed,
  without,
} from './eval.ts';
import type { Bot } from './types.ts';

/** Limiares das heurísticas (spec §3). Mudar um deles muda o bot, não a regra. */
export const GREEDY = {
  /** Dano refletido a partir do qual vale anular ou se proteger de um Reflect. */
  reflectThreat: 10,
  /** Valor mínimo do alvo para gastar A na fase principal (abaixo disso, guarda para reação). */
  trapMain: 12,
  /** Dano evitado mínimo para gastar A na reação a um ataque. */
  trapReaction: 10,
  /** Dano que o oponente levaria do próprio ataque a partir do qual vale lançar Reflect. */
  reflectAttack: 30,
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
  if (!end) throw new Error('fase principal sem DECLARE_ATTACK/END_TURN');
  return end;
}

/** Equipar: os destinos que maximizam a avaliação de mesa no próximo ataque. */
function chooseEquip(view: PlayerView, legal: Action[], rng: Rng): Action {
  const pressure = upcomingPressure(view);
  return best(
    ofType(legal, 'EQUIP'),
    (a) => boardScore(placeAll(view.self, view.self.pending, a.destinations), view.opponent, pressure),
    (ties) => rng.pick(ties),
  );
}

/** Escolha da ordem pela situação de vida: 1º com letal ou com Reflect contra um ataque forte; senão, 1º só se estiver atrás. */
export function prefersFirst(view: PlayerView): boolean {
  const { self, opponent, pressure, config } = view;
  if (hpDamage(self, opponent, pressure, config.buffLimit) >= opponent.hp) return true;
  if (canCastReflect(view) && reflectedDamage(opponent, pressure) >= GREEDY.reflectAttack) return true;
  return self.hp < opponent.hp;
}

/** Valor de destruir um J/Q/K do oponente (A na maior ameaça). Com o meu Reflect ativo, o J dele não vale nada: quanto mais forte o ataque, mais ele leva de volta. */
export function targetValue(view: PlayerView, targetId: string): number {
  const { self, opponent, config, pressure } = view;
  if (opponent.guard.some((c) => c.id === targetId)) {
    if (opponent.guard.length >= config.exodiaGuard - 1) return 1000;
    return opponent.guard.length === 1 ? hpDamage(self, without(opponent, targetId), pressure, config.buffLimit) : 0;
  }
  if (opponent.attackBuffs.some((c) => c.id === targetId)) {
    if (self.reflect) return 0;
    return attackBase(opponent) + (opponent.attackBuffs.length >= config.buffLimit ? 100 : 0);
  }
  return defenseBase(opponent);
}

function mainPhase(view: PlayerView, legal: Action[], rng: Rng): Action {
  const { self, opponent, config, pressure } = view;
  const kings = ofType(legal, 'PLAY_K');
  const allKings = kings.at(-1);
  // 1. Exódia: se os K da mão completam a Guarda, joga todos.
  if (allKings && self.guard.length + allKings.cardIds.length >= config.exodiaGuard) return allKings;
  // 2. Proteção contra o Reflect do oponente antes de um ataque que doeria.
  const protect = ofType(legal, 'PROTECT_FROM_REFLECT')[0];
  if (protect && self.attackRow.length > 0) {
    const reflected = reflectedDamage(self, pressure);
    if (reflected >= GREEDY.reflectThreat || reflected >= self.hp) return protect;
  }
  // 3. Ressurreição: sempre, no lugar que mais melhora a mesa.
  const resurrections = ofType(legal, 'RESURRECT');
  if (resurrections.length > 0) {
    return best(
      resurrections,
      (a) => {
        const card = view.graveyard.find((c) => c.id === a.cardId);
        return card?.kind === 'NUM' ? boardScore(placeAll(self, [card], [a.row]), opponent, pressure) : -Infinity;
      },
      (ties) => rng.pick(ties),
    );
  }
  // 4. Reflect quando o ataque do oponente é alto.
  const reflects = ofType(legal, 'REFLECT');
  if (reflects.length > 0 && reflectedDamage(opponent, pressure) >= GREEDY.reflectAttack) return cheapest(reflects, view, rng);
  // 5. Armadilha na maior ameaça, se valer gastar o A agora.
  const traps = ofType(legal, 'TRAP');
  if (traps.length > 0) {
    const trap = best(traps, (a) => targetValue(view, a.targetId) - wildsUsed(a, self.hand) / 2, (ties) => rng.pick(ties));
    if (targetValue(view, trap.targetId) >= GREEDY.trapMain) return trap;
  }
  // 6. Sacrifício quando o buff do oponente vale mais que o meu (nunca o J dele com o meu Reflect ativo).
  const sacrifices = ofType(legal, 'SACRIFICE');
  const worth = sacrifices.filter((s) =>
    opponent.attackBuffs.some((c) => c.id === s.targetId)
      ? !self.reflect && attackBase(opponent) > attackBase(self)
      : defenseBase(opponent) > defenseBase(self),
  );
  if (worth.length > 0) return cheapest(worth, view, rng);
  // 7. Guarda: joga os K, guardando um enquanto der para montar um Reflect.
  const playable = kings.length - (canCastReflect(view) ? 1 : 0);
  if (playable > 0) return kings[playable - 1];
  // 8. Buffs onde há fileira para multiplicar.
  const js = ofType(legal, 'PLAY_J');
  if (js.length > 0 && self.attackRow.length > 0) return cheapest(js, view, rng);
  const qs = ofType(legal, 'PLAY_Q');
  if (qs.length > 0 && self.defenseRow.length > 0) return cheapest(qs, view, rng);
  return closing(legal);
}

function reaction(view: PlayerView, legal: Action[], trigger: ReactionTrigger, rng: Rng): Action {
  const { self, opponent, config, pressure } = view;
  const pass: Action = { type: 'PASS' };
  if (trigger === 'REFLECT_PLAYED') {
    if (self.attackRow.length === 0 || reflectedDamage(self, pressure) < GREEDY.reflectThreat) return pass;
    const cancels = ofType(legal, 'CANCEL_REFLECT');
    if (cancels.length > 0) return cheapest(cancels, view, rng);
    return ofType(legal, 'PROTECT_FROM_REFLECT')[0] ?? pass;
  }
  const traps = ofType(legal, 'TRAP');
  if (traps.length === 0) return pass;
  if (trigger === 'K_PLAYED') {
    return opponent.guard.length >= config.exodiaGuard - 1 ? cheapest(traps, view, rng) : pass;
  }
  // ATTACK: a Armadilha que mais reduz o dano que vou levar.
  const incoming = hpDamage(opponent, self, pressure, config.buffLimit);
  const after = (a: Of<'TRAP'>) => hpDamage(without(opponent, a.targetId), self, pressure, config.buffLimit);
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
