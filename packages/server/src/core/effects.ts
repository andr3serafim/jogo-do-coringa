import type { Effects } from './types.ts';

export function emptyEffects(): Effects {
  return { send: [], close: [], attach: [], persist: false, alarm: null, deleteAll: false, logs: [] };
}

/** Concatena as listas; `persist` e `deleteAll` por OU; o alarme é o de `b` (o mais novo). */
export function mergeEffects(a: Effects, b: Effects): Effects {
  return {
    send: [...a.send, ...b.send],
    close: [...a.close, ...b.close],
    attach: [...a.attach, ...b.attach],
    persist: a.persist || b.persist,
    alarm: b.alarm,
    deleteAll: a.deleteAll || b.deleteAll,
    logs: [...a.logs, ...b.logs],
  };
}
