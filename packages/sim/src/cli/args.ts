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

/** Servidor: `--servidor`, depois `CORINGA_SERVIDOR`, depois o `wrangler dev` local. */
export function resolveServer(flag: string | undefined, env: Record<string, string | undefined> = process.env): string {
  return flag || env.CORINGA_SERVIDOR || 'http://localhost:8787';
}

/** O alvo posicional (código, link ou URL do servidor); vazio vira `undefined`, porque `parseTarget('')` lança. */
export function targetArg(positionals: string[]): string | undefined {
  if (positionals.length > 1) throw new Error('informe apenas um alvo (código, link ou URL do servidor)');
  return positionals[0]?.trim() || undefined;
}
