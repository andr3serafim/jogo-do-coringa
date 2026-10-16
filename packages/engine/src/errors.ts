import type { RuleErrorCode } from './types';

/** Violação de regra causada por uma ação do jogador. `applyAction` converte em `{ ok: false }`. */
export class RuleViolation extends Error {
  readonly code: RuleErrorCode;

  constructor(code: RuleErrorCode, message: string) {
    super(message);
    this.name = 'RuleViolation';
    this.code = code;
  }
}

export function fail(code: RuleErrorCode, message: string): never {
  throw new RuleViolation(code, message);
}
