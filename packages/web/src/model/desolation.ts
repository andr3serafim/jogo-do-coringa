// A desolação (sub-projeto 6 §7.4): a fileira devastada fica desolada enquanto estiver vazia; quando uma carta volta a entrar nela,
// a fenda se fecha. É estado da mesa que o motor não guarda, então sai dos eventos e da `view`. Puro: sem React nem DOM.
import type { GameEvent, PlayerView } from '@coringa/engine';
import { rowKey } from './effects.ts';

/**
 * As fileiras desoladas depois dos `events` (chaves de `rowKey`). O `RowDevastated` acrescenta a fileira dele, e sai a que voltou a
 * ter carta na `view` (é ela que diz, qualquer que seja o evento que a encheu). Um `resync` (sem eventos) mantém só as que seguem
 * vazias. Nada mudou: devolve o mesmo conjunto.
 */
export function desolationAfter(before: ReadonlySet<string>, events: readonly GameEvent[], view: PlayerView): ReadonlySet<string> {
  const next = new Set(before);
  for (const event of events) {
    if (event.type === 'RowDevastated') next.add(rowKey(event.player, event.row));
  }
  for (const side of [view.self, view.opponent]) {
    if (side.attackRow.length > 0) next.delete(rowKey(side.id, 'ATK'));
    if (side.defenseRow.length > 0) next.delete(rowKey(side.id, 'DEF'));
  }
  return next.size === before.size && [...next].every((key) => before.has(key)) ? before : next;
}
