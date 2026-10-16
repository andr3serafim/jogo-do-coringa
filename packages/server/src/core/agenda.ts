import type { AgendaItem, SeatId } from './types.ts';

/** Instante do próximo prazo, ou `null` se a agenda está vazia. */
export function nextAlarm(agenda: AgendaItem[]): number | null {
  if (agenda.length === 0) return null;
  return Math.min(...agenda.map((item) => item.at));
}

/** Itens vencidos (`at <= now`) em ordem de `at`; empate pela ordem de inserção. */
export function dueItems(agenda: AgendaItem[], now: number): AgendaItem[] {
  return agenda.filter((item) => item.at <= now).sort((a, b) => a.at - b.at);
}

function sameIdentity(a: AgendaItem, b: AgendaItem): boolean {
  if (a.kind !== b.kind) return false;
  if (a.kind === 'reconnect' && b.kind === 'reconnect') return a.seat === b.seat;
  return true;
}

/** Põe o item na agenda no lugar do de mesma identidade (`reconnect` é único por assento, os demais por tipo). */
export function withItem(agenda: AgendaItem[], item: AgendaItem): AgendaItem[] {
  const index = agenda.findIndex((other) => sameIdentity(other, item));
  if (index < 0) return [...agenda, item];
  return agenda.map((other, i) => (i === index ? item : other));
}

/** Tira os itens dos tipos dados; com `seat`, os `reconnect` de outros assentos ficam. */
export function withoutKinds(agenda: AgendaItem[], kinds: AgendaItem['kind'][], seat?: SeatId): AgendaItem[] {
  return agenda.filter((item) => {
    if (!kinds.includes(item.kind)) return true;
    return seat !== undefined && item.kind === 'reconnect' && item.seat !== seat;
  });
}
