import type {
  GameEvent,
  GameState,
  NumCard,
  PlayerState,
  Quad,
  Rank,
  Resurrection,
  ResurrectionRow,
  RowName,
  RulesConfig,
} from './types.ts';

export function rowCards(p: PlayerState, row: RowName): NumCard[] {
  return row === 'ATK' ? p.attackRow : p.defenseRow;
}

/** Valores com 4+ cópias na fileira (spec §1.8: não precisam estar seguidas). */
export function quadValues(cards: readonly NumCard[]): Rank[] {
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

/**
 * Onde a ressuscitada pode entrar em cada fileira (spec §1.8, ponto 16). Com vaga, no fim. Com as duas cheias (e `resurrectOnQuad`),
 * no lugar da última, a não ser que a última seja da quadra: toda numérica com o valor de uma quadra daquela fileira, para a troca
 * nunca desfazer uma quadra. A fileira cheia com vaga na outra não aceita, como antes. É a fonte única do motor, dos bots e da mesa.
 */
export function resurrectionRows(
  config: Pick<RulesConfig, 'rowLimit' | 'resurrectOnQuad'>,
  rows: { attackRow: readonly NumCard[]; defenseRow: readonly NumCard[] },
): Record<RowName, ResurrectionRow> {
  const bothFull = rows.attackRow.length >= config.rowLimit && rows.defenseRow.length >= config.rowLimit;
  const of = (cards: readonly NumCard[]): ResurrectionRow => {
    if (cards.length < config.rowLimit) return { kind: 'APPEND' };
    const last = cards[cards.length - 1];
    if (!bothFull || config.resurrectOnQuad !== true) return { kind: 'BLOCKED', reason: 'FULL', last };
    if (quadValues(cards).includes(last.value)) return { kind: 'BLOCKED', reason: 'QUAD', last };
    return { kind: 'REPLACE', leaving: last };
  };
  return { ATK: of(rows.attackRow), DEF: of(rows.defenseRow) };
}

/** O jogador pode ressuscitar agora? Uma Ressurreição válida, uma numérica no cemitério e uma fileira que aceite. */
export function hasResurrectPlay(s: GameState, p: PlayerState): boolean {
  if (validResurrections(s, p).length === 0 || !s.graveyard.some((c) => c.kind === 'NUM')) return false;
  const rows = resurrectionRows(s.config, p);
  return rows.ATK.kind !== 'BLOCKED' || rows.DEF.kind !== 'BLOCKED';
}
