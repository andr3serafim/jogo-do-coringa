// A liderança da mesa (bloco C dos pontos do playtest, ponto 13; spec §5.3): quem tem o Ataque maior ganha o ouro na espada do total, e quem tem a
// Defesa maior, no escudo. Compara Ataque com Ataque e Defesa com Defesa (decisoes.md 2026-11-03 (4)), pelos totais que as fileiras mostram: os que
// esperam a carta pousar e contam na batida do golpe (C7). No empate, inclusive 0 × 0, ninguém.
//
// Um armazém por mesa, fora do estado do React: cada fileira informa o total dela e assina só a liderança do tipo dela (Ataque ou Defesa), então um
// total que muda redesenha, no máximo, as fileiras daquele tipo, e só quando a liderança troca (a fatia 5 mediu ~100 ms de estilo recalculado com a
// CPU 4× quando uma mudança comum atingia a mesa inteira).
import type { PlayerId, RowName } from '@coringa/engine';
import { createContext, createElement, useCallback, useContext, useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';

/** Quem lidera entre `a` e `b`: só o estritamente maior. */
export function leaderOf(a: number, b: number): 'a' | 'b' | null {
  return a > b ? 'a' : b > a ? 'b' : null;
}

class LeadStore {
  readonly #totals: Record<RowName, Map<PlayerId, number>> = { ATK: new Map(), DEF: new Map() };
  readonly #listeners: Record<RowName, Set<() => void>> = { ATK: new Set(), DEF: new Set() };

  report(player: PlayerId, kind: RowName, total: number | null): void {
    const totals = this.#totals[kind];
    if (total === null ? !totals.has(player) : totals.get(player) === total) return;
    if (total === null) totals.delete(player);
    else totals.set(player, total);
    for (const listener of [...this.#listeners[kind]]) listener();
  }

  /** `null` enquanto a mesa não tem os dois totais (o primeiro desenho: as fileiras informam nos efeitos). */
  leading(player: PlayerId, kind: RowName): boolean | null {
    const totals = this.#totals[kind];
    const mine = totals.get(player);
    const others = [...totals].filter(([id]) => id !== player).map(([, total]) => total);
    if (mine === undefined || others.length === 0) return null;
    return others.every((other) => leaderOf(mine, other) === 'a');
  }

  subscribe(kind: RowName, listener: () => void): () => void {
    this.#listeners[kind].add(listener);
    return () => this.#listeners[kind].delete(listener);
  }
}

const LeadContext = createContext<LeadStore | null>(null);

/** O armazém da liderança da mesa. */
export function LeadProvider({ children }: { children: ReactNode }) {
  const [store] = useState(() => new LeadStore());
  return createElement(LeadContext.Provider, { value: store }, children);
}

/** A fileira informa o total que mostra; ao sair da mesa, sai da conta. */
export function useReportTotal(player: PlayerId, kind: RowName, total: number): void {
  const store = useContext(LeadContext);
  useEffect(() => {
    store?.report(player, kind, total);
  }, [store, player, kind, total]);
  useEffect(() => () => store?.report(player, kind, null), [store, player, kind]);
}

const never = () => () => {};
const unknown = () => null;

/**
 * A fileira `kind` de `player` lidera agora: `true` ou `false`, e `null` enquanto a mesa não sabe (no primeiro desenho, antes de as
 * duas fileiras informarem; sem o armazém, uma fileira fora da mesa, sempre). Quem desenha trata `null` como "não lidera", e o sopro da
 * troca só vale de `false` para `true`: o ouro que já está lá quando a mesa aparece não sopra.
 */
export function useLead(player: PlayerId, kind: RowName): boolean | null {
  const store = useContext(LeadContext);
  const subscribe = useCallback((listener: () => void) => (store ? store.subscribe(kind, listener) : never()), [store, kind]);
  const snapshot = useCallback(() => (store ? store.leading(player, kind) : unknown()), [store, player, kind]);
  return useSyncExternalStore(subscribe, snapshot);
}
