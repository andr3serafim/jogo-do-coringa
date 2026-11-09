// As cartas que ainda vão pousar na mesa (sub-projeto 6 §8): o total da fileira (`Row`) e o nível das zonas (`PlayerField`, bloco C dos
// pontos do playtest, ponto 10) não as contam até o pouso, e a conta continua sendo a do motor, sobre o lado sem elas.
import type { PublicPlayer } from '@coringa/engine';
import { useEffect, useState } from 'react';
import { useAnim } from '../anim/context.ts';

/**
 * As cartas que ainda vão pousar (sub-projeto 6 §8): enquanto a carta cai ou voa até a fileira (ou até os bônus que a multiplicam), o total
 * não a conta, e ela entra na conta no pouso dela. A conta continua sendo a do motor, sobre o lado sem essas cartas. O pulo apaga os
 * pousos (`landAt`), e o total volta ao da `view` na hora.
 */
export function useLandingHold(ids: readonly string[]): { pending: ReadonlySet<string>; landed: number } {
  const anim = useAnim();
  const key = ids.flatMap((id) => {
    const landing = anim.landAt(id);
    return landing === null ? [] : [`${id}@${landing.at}`];
  }).join(',');
  const [done, setDone] = useState<{ key: string; ids: ReadonlySet<string> }>({ key: '', ids: new Set() });
  useEffect(() => {
    if (key === '') return;
    // As cartas que pousam no mesmo instante (as do Equipar) entram juntas: um desenho da fileira por instante, e não um por carta.
    const byInstant = new Map<string, string[]>();
    for (const entry of key.split(',')) {
      const at = entry.lastIndexOf('@');
      const instant = entry.slice(at + 1);
      byInstant.set(instant, [...(byInstant.get(instant) ?? []), entry.slice(0, at)]);
    }
    const timers = [...byInstant].map(([instant, ids]) =>
      window.setTimeout(() => setDone((prev) => ({ key, ids: new Set([...(prev.key === key ? prev.ids : []), ...ids]) })), Number(instant) * 1000),
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [key]);
  const landed = done.key === key ? done.ids : new Set<string>();
  const pending = new Set(key === '' ? [] : key.split(',').map((entry) => entry.slice(0, entry.lastIndexOf('@'))).filter((id) => !landed.has(id)));
  return { pending, landed: landed.size };
}

/** O lado sem as cartas `ids` (as que ainda vão pousar): nas fileiras, nos bônus e na Guarda. */
export function withoutCards(side: PublicPlayer, ids: ReadonlySet<string>): PublicPlayer {
  const keep = <T extends { id: string }>(cards: readonly T[]): T[] => cards.filter((card) => !ids.has(card.id));
  return {
    ...side,
    attackRow: keep(side.attackRow),
    defenseRow: keep(side.defenseRow),
    attackBuffs: keep(side.attackBuffs),
    defenseBuffs: keep(side.defenseBuffs),
    guard: keep(side.guard),
  };
}
