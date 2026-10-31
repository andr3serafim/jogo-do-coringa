import type { Action, Destination } from '../src/types.ts';
import type { Chooser } from './playout.ts';

type ActionType = Action['type'];

/** Quantas numéricas o Equipar manda para a Defesa (inclui trocar a última da Defesa). */
const defenseCount = (a: Action): number =>
  a.type === 'EQUIP' ? a.destinations.filter((d: Destination) => d === 'DEF' || d === 'REPLACE_LAST_DEF').length : 0;

/**
 * Política enviesada: joga o primeiro tipo de `order` que estiver disponível. Tipos fora de `order`
 * nunca são jogados; por isso `order` deve conter as ações de fechamento (EQUIP, CHOOSE_ORDER,
 * DECLARE_ATTACK, END_TURN, PASS). Desempates: maior PLAY_K; Equipar pela Defesa se `allDefense`;
 * senão varia com `step`.
 */
export function prefer(order: ActionType[], opts: { allDefense?: boolean } = {}): Chooser {
  return (legal, _view, step) => {
    for (const type of order) {
      const candidates = legal.filter((a) => a.type === type);
      if (candidates.length === 0) continue;
      if (type === 'PLAY_K') {
        return candidates.reduce((best, a) =>
          a.type === 'PLAY_K' && best.type === 'PLAY_K' && a.cardIds.length > best.cardIds.length ? a : best,
        );
      }
      if (type === 'EQUIP' && opts.allDefense) {
        return candidates.reduce((best, a) => (defenseCount(a) > defenseCount(best) ? a : best));
      }
      return candidates[step % candidates.length];
    }
    throw new Error(`nenhuma ação permitida entre: ${legal.map((a) => a.type).join(', ')}`);
  };
}

const CLOSE: ActionType[] = ['EQUIP', 'CHOOSE_ORDER', 'DECLARE_ATTACK', 'END_TURN', 'PASS'];

/** Exódia: ninguém usa A; os K saem todos de uma vez; numéricas na Defesa para os K durarem. */
export const exodiaProfile: Chooser = prefer(['PLAY_K', ...CLOSE], { allDefense: true });

/** Absolutos: J e Q (e Selvagens) sempre que der; ninguém destrói buffs. */
export const absolutesProfile: Chooser = prefer(['PLAY_J', 'PLAY_Q', ...CLOSE]);
