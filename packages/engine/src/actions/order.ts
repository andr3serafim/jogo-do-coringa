import { fail } from '../errors';
import { setTurnOrder, startTurn } from '../flow';
import type { GameEvent, GameState, PlayerId } from '../types';

export function chooseOrder(s: GameState, first: boolean, ev: GameEvent[]): void {
  setTurnOrder(s, first);
  ev.push({ type: 'OrderChosen', player: s.initiative, first, turnOrder: [...s.turnOrder] });
  startTurn(s, 0, ev);
}

export function handleChooseOrder(s: GameState, playerId: PlayerId, first: boolean, ev: GameEvent[]): void {
  const phase = s.phase;
  if (phase.kind !== 'ORDER_CHOICE') fail('WRONG_PHASE', 'não há escolha de ordem pendente');
  if (phase.player !== playerId) fail('NOT_YOUR_TURN', 'só quem tem a iniciativa escolhe a ordem');
  if (typeof first !== 'boolean') fail('INVALID_ACTION', 'first deve ser verdadeiro ou falso');
  chooseOrder(s, first, ev);
}
