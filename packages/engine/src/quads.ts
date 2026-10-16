import type { GameEvent, GameState, NumCard, PlayerState, Quad, Rank, Resurrection, RowName } from './types';

export function rowCards(p: PlayerState, row: RowName): NumCard[] {
  return row === 'ATK' ? p.attackRow : p.defenseRow;
}

/** Valores com 4+ cópias na fileira (spec §1.8: não precisam estar seguidas). */
export function quadValues(cards: NumCard[]): Rank[] {
  const counts = new Map<Rank, number>();
  for (const c of cards) counts.set(c.value, (counts.get(c.value) ?? 0) + 1);
  return [...counts.entries()]
    .filter(([, count]) => count >= 4)
    .map(([value]) => value)
    .sort((a, b) => a - b);
}

/** Bônus de quadra: + valor da carta, uma vez por quadra. */
export function quadBonus(cards: NumCard[]): number {
  return quadValues(cards).reduce((sum, value) => sum + value, 0);
}

export function currentQuads(p: PlayerState): Quad[] {
  return (['ATK', 'DEF'] as const).flatMap((row) => quadValues(rowCards(p, row)).map((value) => ({ row, value })));
}

const quadKey = (q: Quad): string => `${q.row}:${q.value}`;

/** Compara as quadras atuais com as anteriores: emite eventos e concede Ressurreições a quadras novas. */
export function reevaluateQuads(s: GameState, p: PlayerState, ev: GameEvent[]): void {
  const now = currentQuads(p);
  const before = new Set(p.quads.map(quadKey));
  const after = new Set(now.map(quadKey));
  for (const quad of p.quads) {
    if (!after.has(quadKey(quad))) ev.push({ type: 'QuadBroken', player: p.id, quad });
  }
  for (const quad of now) {
    if (!before.has(quadKey(quad))) {
      ev.push({ type: 'QuadFormed', player: p.id, quad });
      p.resurrections.push({ row: quad.row, value: quad.value, formedAtRound: s.round });
    }
  }
  p.quads = now;
}

/** Vale enquanto a quadra existir, com garantia mínima de `resurrectMinRounds` rodadas (spec §1.8). */
export function isResurrectionValid(s: GameState, p: PlayerState, r: Resurrection): boolean {
  const quadPresent = p.quads.some((q) => q.row === r.row && q.value === r.value);
  return quadPresent || s.round <= r.formedAtRound + s.config.resurrectMinRounds;
}

export function validResurrections(s: GameState, p: PlayerState): Resurrection[] {
  return p.resurrections.filter((r) => isResurrectionValid(s, p, r));
}

export function pruneResurrections(s: GameState, p: PlayerState): void {
  p.resurrections = validResurrections(s, p);
}
