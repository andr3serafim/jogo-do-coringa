import { fail } from '../errors.ts';
import { startRound } from '../flow.ts';
import { hasResurrectPlay } from '../quads.ts';
import { getPlayer } from '../state.ts';
import type { GameEvent, GameState, PlayerId, PlayerState, RowName } from '../types.ts';
import { resurrect } from './main.ts';

/**
 * A janela da Ressurreição (spec §1.8, ponto 16): depois da revelação do Equipar, quem formou quadra nela pode ressuscitar antes da
 * rodada seguinte. `formed` vem na ordem da iniciativa: decide primeiro quem a tem. Só abre para quem tem jogada (tudo o que decide é
 * público, e pular não revela nada); sem ninguém, a rodada segue.
 */
export function openResurrectionWindow(s: GameState, formed: PlayerId[], ev: GameEvent[]): void {
  const [first, second] = formed;
  if (first !== undefined && hasResurrectPlay(s, getPlayer(s, first))) {
    s.phase = { kind: 'RESURRECTION', player: first, next: second ?? null };
    return;
  }
  if (second !== undefined && hasResurrectPlay(s, getPlayer(s, second))) {
    s.phase = { kind: 'RESURRECTION', player: second, next: null };
    return;
  }
  startRound(s, ev);
}

/** Quem decide passou (ou o tempo dele acabou): a vez é do próximo da fila, se ele ainda tem jogada; senão a rodada segue. */
export function advanceResurrection(s: GameState, ev: GameEvent[]): void {
  const phase = s.phase;
  if (phase.kind !== 'RESURRECTION') throw new Error('advanceResurrection fora da janela da Ressurreição');
  openResurrectionWindow(s, phase.next === null ? [] : [phase.next], ev);
}

function requireWindow(s: GameState, playerId: PlayerId): PlayerState {
  const phase = s.phase;
  if (phase.kind !== 'RESURRECTION') fail('WRONG_PHASE', 'não há janela da Ressurreição aberta');
  if (phase.player !== playerId) fail('NOT_YOUR_TURN', 'a janela da Ressurreição é do oponente');
  return getPlayer(s, playerId);
}

/** A Ressurreição na janela. Em cadeia, quem ainda tem jogada fica; sem jogada, a janela segue para o próximo. */
export function resurrectInWindow(s: GameState, playerId: PlayerId, cardId: string, row: RowName, ev: GameEvent[]): void {
  const p = requireWindow(s, playerId);
  resurrect(s, p, cardId, row, ev);
  if (!hasResurrectPlay(s, p)) advanceResurrection(s, ev);
}

/** Passar na janela guarda a Ressurreição, que segue valendo na fase principal. */
export function passResurrection(s: GameState, playerId: PlayerId, ev: GameEvent[]): void {
  requireWindow(s, playerId);
  advanceResurrection(s, ev);
}
