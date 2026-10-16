/** Código da sala, link e alvo digitado no terminal (spec §2.1, §10.2). */

/** 31 símbolos, sem 0/O nem 1/I/L. */
export const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
export const CODE_LENGTH = 6;

/** Maior múltiplo do alfabeto que cabe num byte (8 × 31): bytes a partir daqui são descartados. */
const BYTE_LIMIT = 248;
const BATCH = 8;

const CODE_PATTERN = new RegExp(`^[${CODE_ALPHABET}]{${CODE_LENGTH}}$`);

/** Maiúsculas, sem espaços nas pontas; `null` se não for um código válido. */
export function normalizeCode(input: string): string | null {
  const code = input.trim().toUpperCase();
  return CODE_PATTERN.test(code) ? code : null;
}

/** Sorteia um código sem viés de módulo; a aleatoriedade vem de quem chama. */
export function generateCode(randomBytes: (n: number) => Uint8Array): string {
  let code = '';
  while (code.length < CODE_LENGTH) {
    for (const b of randomBytes(BATCH)) {
      if (b >= BYTE_LIMIT) continue;
      code += CODE_ALPHABET[b % CODE_ALPHABET.length];
      if (code.length === CODE_LENGTH) break;
    }
  }
  return code;
}

export function roomLink(origin: string, code: string): string {
  return `${origin}/s/${code}`;
}

/**
 * Interpreta o que o jogador digitou: nada (servidor padrão, sem sala), um código, um link
 * `<origem>/s/<CÓDIGO>` ou só a URL do servidor. Qualquer outra coisa lança `alvo inválido`.
 */
export function parseTarget(input: string | undefined, defaultServer: string): { server: string; code: string | null } {
  if (input === undefined) return { server: defaultServer, code: null };
  const code = normalizeCode(input);
  if (code) return { server: defaultServer, code };
  const invalid = new Error(`alvo inválido: ${input}`);
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    throw invalid;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') throw invalid;
  if (url.pathname === '/' || url.pathname === '') return { server: url.origin, code: null };
  const match = /^\/s\/([^/]+)\/?$/.exec(url.pathname);
  const fromLink = match ? normalizeCode(match[1]) : null;
  if (!fromLink) throw invalid;
  return { server: url.origin, code: fromLink };
}
