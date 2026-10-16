import type { ConfigError, RulesConfig } from './types.ts';

export const DEFAULT_CONFIG: RulesConfig = {
  hp: 100,
  rowLimit: 7,
  buffLimit: 4,
  cardsPerEquip: 4,
  antiStallRounds: 5,
  exodiaGuard: 4,
  resurrectMinRounds: 3,
  deck: { numericCopies: 8, faceCopies: 6 },
  initiativeChoice: true,
  tablePressure: true,
  wildJokers: true,
};

export type ConfigOverrides = Partial<Omit<RulesConfig, 'deck'>> & {
  deck?: Partial<RulesConfig['deck']>;
};

/** Monta uma config a partir do padrão. Sem Pressão da mesa, o anti-travamento padrão é 3 (spec §1.11). */
export function makeConfig(overrides: ConfigOverrides = {}): RulesConfig {
  const antiStallRounds = overrides.tablePressure === false ? 3 : DEFAULT_CONFIG.antiStallRounds;
  return {
    ...DEFAULT_CONFIG,
    antiStallRounds,
    ...overrides,
    deck: { ...DEFAULT_CONFIG.deck, ...overrides.deck },
  };
}

const isInt = (n: number, min: number, max = Number.MAX_SAFE_INTEGER): boolean =>
  Number.isInteger(n) && n >= min && n <= max;

export function validateConfig(c: RulesConfig): ConfigError | null {
  const checks: Array<[boolean, string]> = [
    [isInt(c.hp, 1), 'hp deve ser um inteiro ≥ 1'],
    [isInt(c.rowLimit, 1), 'rowLimit deve ser um inteiro ≥ 1'],
    [isInt(c.buffLimit, 1), 'buffLimit deve ser um inteiro ≥ 1'],
    [isInt(c.cardsPerEquip, 1), 'cardsPerEquip deve ser um inteiro ≥ 1'],
    [isInt(c.antiStallRounds, 1), 'antiStallRounds deve ser um inteiro ≥ 1'],
    [isInt(c.exodiaGuard, 1), 'exodiaGuard deve ser um inteiro ≥ 1'],
    [isInt(c.resurrectMinRounds, 0), 'resurrectMinRounds deve ser um inteiro ≥ 0'],
    [isInt(c.deck.numericCopies, 1, 8), 'deck.numericCopies deve ser um inteiro entre 1 e 8'],
    [isInt(c.deck.faceCopies, 0, 8), 'deck.faceCopies deve ser um inteiro entre 0 e 8'],
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
