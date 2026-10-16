import { handleEquip, timeoutEquip } from './actions/equip';
import { declareAttack, endTurnAction, playJ, playQ, requireMain } from './actions/main';
import { chooseOrder, handleChooseOrder } from './actions/order';
import { closeReaction, pass } from './actions/reaction';
import { fail, RuleViolation } from './errors';
import { endTurn } from './flow';
import { finishGame, getPlayer, opponentOf } from './state';
import type { Action, ActionResult, GameEvent, GameState, PlayerId } from './types';

/** Ponto único de entrada. Nunca muta `state`; erros de regra viram `{ ok: false }`. */
export function applyAction(state: GameState, player: PlayerId | 'system', action: Action): ActionResult {
  if (state.phase.kind === 'GAME_OVER') {
    return { ok: false, error: { code: 'GAME_OVER', message: 'a partida já terminou' } };
  }
  const s = structuredClone(state);
  const ev: GameEvent[] = [];
  try {
    if (player === 'system') {
      applySystem(s, action, ev);
    } else {
      getPlayer(s, player);
      applyPlayer(s, player, action, ev);
    }
  } catch (e) {
    if (e instanceof RuleViolation) return { ok: false, error: { code: e.code, message: e.message } };
    throw e;
  }
  return { ok: true, state: s, events: ev };
}

function applySystem(s: GameState, action: Action, ev: GameEvent[]): void {
  if (action.type === 'FORFEIT') {
    const loser = getPlayer(s, action.loser);
    finishGame(s, { kind: 'WIN', winner: opponentOf(s, loser.id).id, reason: 'FORFEIT' }, ev);
    return;
  }
  if (action.type !== 'TIMEOUT') fail('PLAYER_ONLY', 'o sistema só envia TIMEOUT ou FORFEIT');
  const phase = s.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return timeoutEquip(s, ev);
    case 'ORDER_CHOICE':
      return chooseOrder(s, true, ev);
    case 'ATTACK_MAIN': {
      const p = getPlayer(s, phase.player);
      if (p.attackRow.length > 0) return declareAttack(s, p, ev);
      return endTurn(s, ev);
    }
    case 'REACTION':
      return closeReaction(s, ev);
    case 'GAME_OVER':
      return;
  }
}

function applyPlayer(s: GameState, player: PlayerId, action: Action, ev: GameEvent[]): void {
  switch (action.type) {
    case 'EQUIP':
      return handleEquip(s, player, action.destinations, ev);
    case 'CHOOSE_ORDER':
      return handleChooseOrder(s, player, action.first, ev);
    case 'PLAY_J':
      return playJ(s, requireMain(s, player), action.cardId, ev);
    case 'PLAY_Q':
      return playQ(s, requireMain(s, player), action.cardId, ev);
    case 'DECLARE_ATTACK':
      return declareAttack(s, requireMain(s, player), ev);
    case 'END_TURN':
      return endTurnAction(s, requireMain(s, player), ev);
    case 'PASS':
      return pass(s, player, ev);
    case 'TIMEOUT':
    case 'FORFEIT':
      return fail('SYSTEM_ONLY', 'apenas o sistema envia esta ação');
    default:
      return fail('INVALID_ACTION', `ação desconhecida: ${String((action as { type?: unknown }).type)}`);
  }
}
