import { legalActions, type PlayerView } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';

/** As jogadas legais que o cliente pode enviar: `TIMEOUT` e `FORFEIT` são do servidor (nunca aparecem em `legalActions`, mas o tipo permite). */
export function playerActions(view: PlayerView): PlayerAction[] {
  return legalActions(view).filter((action): action is PlayerAction => action.type !== 'TIMEOUT' && action.type !== 'FORFEIT');
}
