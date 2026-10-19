// O que o diagnóstico copiável sabe da sala (spec §6.5). A tela da sala atualiza; a fronteira de erro lê.
// Nunca guarda o token: só o código da sala, o `seq` e a época.
export interface DiagnosticContext {
  code: string | null;
  seq: number | null;
  epoch: number | null;
}

const EMPTY: DiagnosticContext = { code: null, seq: null, epoch: null };
let current: DiagnosticContext = EMPTY;

export function setDiagnosticContext(next: DiagnosticContext): void {
  current = next;
}

export function clearDiagnosticContext(): void {
  current = EMPTY;
}

export function getDiagnosticContext(): DiagnosticContext {
  return current;
}
