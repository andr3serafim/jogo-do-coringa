import { parseArgs } from 'node:util';
import type { ConfigOverrides } from '@coringa/engine';
import { BOT_NAMES, type BotName } from '../bots/index.ts';

/** Opções de regra aceitas por `pnpm sim` e `pnpm play`. */
export const RULE_OPTIONS = {
  hp: { type: 'string' },
  fileira: { type: 'string' },
  'sem-escolha': { type: 'boolean' },
  'sem-pressao': { type: 'boolean' },
  'sem-selvagens': { type: 'boolean' },
} as const;

export type RuleValues = { hp?: string; fileira?: string; 'sem-escolha'?: boolean; 'sem-pressao'?: boolean; 'sem-selvagens'?: boolean };

export function configFromArgs(v: RuleValues): ConfigOverrides {
  const overrides: ConfigOverrides = {};
  if (v.hp !== undefined) overrides.hp = Number(v.hp);
  if (v.fileira !== undefined) overrides.rowLimit = Number(v.fileira);
  if (v['sem-escolha']) overrides.initiativeChoice = false;
  if (v['sem-pressao']) overrides.tablePressure = false;
  if (v['sem-selvagens']) overrides.wildJokers = false;
  return overrides;
}

export function botName(value: string): BotName {
  if ((BOT_NAMES as readonly string[]).includes(value)) return value as BotName;
  throw new Error(`bot desconhecido: ${value} (use ${BOT_NAMES.join(', ')})`);
}

export { parseArgs };
