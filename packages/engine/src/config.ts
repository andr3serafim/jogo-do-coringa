import type { ConfigError, RulesConfig } from './types.ts';

export const DEFAULT_CONFIG: RulesConfig = {
  hp: 500,
  rowLimit: 8,
  buffLimit: 4,
  cardsPerEquip: 4,
  exodiaGuard: 4,
  resurrectMinRounds: 3,
  deck: { numericCopies: 8, faceCopies: 6, aceCopies: 8 },
  initiativeChoice: true,
  wildJokers: true,
  defenseHealGuard: 2,
  // A forma escolhida pelo autor (2026-10-31): a especial que passaria de 4 na mão vai direto ao cemitério.
  specialLimit: { max: 4, penalty: 'BURN' },
};

export type ConfigOverrides = Partial<Omit<RulesConfig, 'deck'>> & {
  deck?: Partial<RulesConfig['deck']>;
};

/** Monta uma config a partir do padrão. */
export function makeConfig(overrides: ConfigOverrides = {}): RulesConfig {
  return {
    ...DEFAULT_CONFIG,
    ...overrides,
    deck: { ...DEFAULT_CONFIG.deck, ...overrides.deck },
  };
}

const isInt = (n: number, min: number, max = Number.MAX_SAFE_INTEGER): boolean =>
  Number.isInteger(n) && n >= min && n <= max;

/**
 * Quantas especiais a mão de `handCount` cartas ainda deve descartar na rodada de Equipar: só com a penalidade `CHOOSE` do limite
 * de especiais (E3); nas outras formas (e sem limite), 0.
 */
export function discardsOwed(config: Pick<RulesConfig, 'specialLimit'>, handCount: number): number {
  const limit = config.specialLimit;
  return limit?.penalty === 'CHOOSE' ? Math.max(0, handCount - limit.max) : 0;
}

export function validateConfig(c: RulesConfig): ConfigError | null {
  // A config pode vir de JSON ou de outro pacote: sem o objeto (ou sem o baralho), a resposta é o erro, não um TypeError.
  if (typeof c !== 'object' || c === null) return { code: 'INVALID_CONFIG', message: 'a config deve ser um objeto' };
  if (typeof c.deck !== 'object' || c.deck === null) {
    return { code: 'INVALID_CONFIG', message: 'deck deve ser um objeto { numericCopies, faceCopies }' };
  }
  const checks: Array<[boolean, string]> = [
    [isInt(c.hp, 1), 'hp deve ser um inteiro ≥ 1'],
    [isInt(c.rowLimit, 1), 'rowLimit deve ser um inteiro ≥ 1'],
    [isInt(c.buffLimit, 1), 'buffLimit deve ser um inteiro ≥ 1'],
    [isInt(c.cardsPerEquip, 1), 'cardsPerEquip deve ser um inteiro ≥ 1'],
    [isInt(c.exodiaGuard, 1), 'exodiaGuard deve ser um inteiro ≥ 1'],
    [isInt(c.resurrectMinRounds, 0), 'resurrectMinRounds deve ser um inteiro ≥ 0'],
    [isInt(c.deck.numericCopies, 1, 8), 'deck.numericCopies deve ser um inteiro entre 1 e 8'],
    [isInt(c.deck.faceCopies, 0, 8), 'deck.faceCopies deve ser um inteiro entre 0 e 8'],
    [c.deck.aceCopies === undefined || isInt(c.deck.aceCopies, 0, 8), 'deck.aceCopies deve ser um inteiro entre 0 e 8'],
    [c.defenseHealGuard === undefined || isInt(c.defenseHealGuard, 1), 'defenseHealGuard deve ser um inteiro ≥ 1'],
    [
      c.specialLimit === undefined ||
        (typeof c.specialLimit === 'object' &&
          c.specialLimit !== null &&
          isInt(c.specialLimit.max, 3) &&
          ['BURN', 'CHOOSE', 'FEWER'].includes(c.specialLimit.penalty)),
      'specialLimit deve ser { max: inteiro ≥ 3, penalty: BURN | CHOOSE | FEWER }',
    ],
  ];
  for (const [ok, message] of checks) {
    if (!ok) return { code: 'INVALID_CONFIG', message };
  }
  // Garantia de compra (spec §1.4): numéricas nunca ficam na mão; o campo comporta 4 × rowLimit.
  const maxOnField = 4 * c.rowLimit;
  const budget = 9 * c.deck.numericCopies - 2 * c.cardsPerEquip;
  if (maxOnField > budget) {
    return {
      code: 'INVALID_CONFIG',
      message: `rowLimit ${c.rowLimit} quebra a garantia de compra: 4 × rowLimit deve ser ≤ ${budget}`,
    };
  }
  return null;
}
