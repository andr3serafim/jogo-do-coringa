import { legalActions } from './legal-actions.ts';
import type { Action, PlayerView, SpecialCard, SpecialKind } from './types.ts';

/**
 * Por que uma carta da mão não tem jogada agora (B2 do sub-projeto 5): a interface só traduz o código.
 * - `GAME_OVER`: a partida acabou.
 * - `EQUIP_ROUND`: rodada de Equipar; as especiais só se jogam nas rodadas de Ataque (spec §1.3).
 * - `ORDER_CHOICE`: a ordem dos turnos ainda está sendo escolhida.
 * - `OPPONENT_TURN`: é a vez do oponente (o turno dele ou a janela de reação dele).
 * - `REACTION_TRAP_ONLY`: na sua janela de reação só o A (ou o Selvagem como A) responde (spec §1.7).
 * - `REACTION_REFLECT`: na resposta a um Reflect, só outro Reflect (K + J + Q da mão).
 * - `REACTION_DEVASTATION`: contra uma Devastação, só o Reflect (K + J + Q da mão).
 * - `BUFF_LIMIT`: os buffs daquele papel já estão no limite, e o Sacrifício não tem alvo.
 * - `NO_TARGET`: o A não tem J, Q ou K do oponente para mirar (as cartas de um Reflect não contam) nem numérica para roubar.
 * - `NO_GUARD_TARGET`: contra K jogado, o A só mira a Guarda, e ela está vazia.
 * - `TARGET_PROTECTED`: o oponente está sob Defesa Absoluta (imune a Armadilha e a Sacrifício).
 * - `NO_ROLE`: o Selvagem não serve agora como J, Q nem A.
 */
export type NoPlayReason =
  | 'GAME_OVER'
  | 'EQUIP_ROUND'
  | 'ORDER_CHOICE'
  | 'OPPONENT_TURN'
  | 'REACTION_TRAP_ONLY'
  | 'REACTION_REFLECT'
  | 'REACTION_DEVASTATION'
  | 'BUFF_LIMIT'
  | 'NO_TARGET'
  | 'NO_GUARD_TARGET'
  | 'TARGET_PROTECTED'
  | 'NO_ROLE';

/** Os ids de carta da mão que uma jogada de uma carta só usa (as de várias cartas, como o Reflect, têm botão próprio). */
function singleCardIds(action: Action): string[] {
  switch (action.type) {
    case 'PLAY_J':
    case 'PLAY_Q':
    case 'TRAP':
    case 'SACRIFICE':
    case 'STEAL':
      return [action.cardId];
    case 'PLAY_K':
      return action.cardIds;
    default:
      return [];
  }
}

/**
 * A carta tem jogada se `legalActions` lista uma jogada de uma carta só com uma carta da mão do mesmo tipo: a lista traz
 * representantes canônicos, e o motor aceita qualquer carta do tipo. Sem jogada, o motivo; com jogada, `null`.
 */
export function noPlayReason(view: PlayerView, card: SpecialCard): NoPlayReason | null {
  const kindOf = new Map<string, SpecialKind>(view.self.hand.map((c) => [c.id, c.kind]));
  const playable = legalActions(view).some((action) => singleCardIds(action).some((id) => kindOf.get(id) === card.kind));
  if (playable) return null;

  const { phase, opponent } = view;
  switch (phase.kind) {
    case 'GAME_OVER':
      return 'GAME_OVER';
    case 'EQUIP':
      return 'EQUIP_ROUND';
    case 'ORDER_CHOICE':
      return 'ORDER_CHOICE';
    case 'ATTACK_MAIN':
      if (phase.player !== view.me) return 'OPPONENT_TURN';
      if (card.kind === 'J' || card.kind === 'Q') return 'BUFF_LIMIT';
      if (card.kind === 'WILD') return 'NO_ROLE';
      return opponent.absoluteDefense ? 'TARGET_PROTECTED' : 'NO_TARGET';
    case 'REACTION':
      if (phase.responder !== view.me) return 'OPPONENT_TURN';
      if (phase.trigger === 'REFLECT_PLAYED') return 'REACTION_REFLECT';
      if (phase.trigger === 'DEVASTATION') return 'REACTION_DEVASTATION';
      if (card.kind !== 'A' && card.kind !== 'WILD') return 'REACTION_TRAP_ONLY';
      if (opponent.absoluteDefense) return 'TARGET_PROTECTED';
      return phase.trigger === 'K_PLAYED' ? 'NO_GUARD_TARGET' : 'NO_TARGET';
  }
}
