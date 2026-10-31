import type { Action } from '@coringa/engine';
import { best, defenseBase, placeAll } from './eval.ts';
import { greedyBot } from './greedy.ts';
import type { Bot } from './types.ts';

type Equip = Extract<Action, { type: 'EQUIP' }>;
const attackPlacements = (a: Equip): number => a.destinations.filter((d) => d === 'ATK' || d === 'REPLACE_LAST_ATK').length;

/**
 * Spec §3: na frente em vida, põe tudo na Defesa, deixa o Ataque vazio e joga todos os K.
 * O Equipar só permite trocar/descartar com as duas fileiras cheias (spec §1.4): com a Defesa cheia e
 * espaço no Ataque, a numérica vai para o Ataque à força, e o ataque passa a ser obrigatório.
 * Atrás ou empatado em vida, joga como o greedy.
 */
export const turtleBot: Bot = (view, legal, rng) => {
  if (view.self.hp <= view.opponent.hp) return greedyBot(view, legal, rng);
  const phase = view.phase;
  if (phase.kind === 'EQUIP') {
    const options = legal.filter((a): a is Equip => a.type === 'EQUIP');
    // O descarte do limite de especiais (CHOOSE, E3) vem antes do Equipar: o do greedy.
    if (options.length === 0) return greedyBot(view, legal, rng);
    return best(
      options,
      (a) => defenseBase(placeAll(view.self, view.self.pending, a.destinations)) - 1000 * attackPlacements(a),
      (ties) => rng.pick(ties),
    );
  }
  if (phase.kind === 'ATTACK_MAIN') {
    const kings = legal.filter((a) => a.type === 'PLAY_K');
    if (kings.length > 0) return kings[kings.length - 1];
    const queen = legal.find((a) => a.type === 'PLAY_Q');
    if (queen) return queen;
    const allowed = legal.filter((a) => a.type !== 'PLAY_J' && !(a.type === 'RESURRECT' && a.row === 'ATK'));
    return greedyBot(view, allowed, rng);
  }
  return greedyBot(view, legal, rng);
};
