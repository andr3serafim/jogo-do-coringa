/**
 * Versão do resultado das regras. Sobe quando o resultado de uma partida de referência muda
 * (snapshots de `test/__snapshots__/golden/` aceitos com `-u`); `test/rules-version.test.ts` exige a
 * linha nova em `RULES_DIGESTS`. Replays guardados por uma versão antiga abrem com aviso.
 */
export const RULES_VERSION = 2;
