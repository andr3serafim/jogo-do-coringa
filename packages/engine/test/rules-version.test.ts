import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RULES_VERSION } from '../src/index.ts';

/**
 * Digest SHA-256 de cada versão das regras, calculado sobre o resumo das partidas de referência
 * (`__snapshots__/golden/*.json`). Mudou o resultado de uma partida (snapshot aceito com `-u`)?
 * Suba `RULES_VERSION` (`src/version.ts`) e acrescente aqui a linha com o digest novo: os replays
 * guardados no navegador pela versão antiga abrem com aviso. Não apague as linhas antigas.
 */
const RULES_DIGESTS: Record<number, string> = {
  1: '0b68077c4621f6317248faef9affbfddc981e71de6fb82bc8c35217efdf84a3a',
};

const GOLDEN_DIR = new URL('./__snapshots__/golden/', import.meta.url);

/**
 * Cada arquivo entra como `JSON.stringify(JSON.parse(texto))`, junto com o nome, em ordem de nome:
 * o resultado é o mesmo no Windows e no Linux da CI, com ou sem CRLF, e não depende da ordem do readdir.
 */
function goldenDigest(): { digest: string; files: number } {
  const names = readdirSync(GOLDEN_DIR)
    .filter((name) => name.endsWith('.json'))
    .sort();
  const hash = createHash('sha256');
  for (const name of names) {
    const normalized = JSON.stringify(JSON.parse(readFileSync(new URL(name, GOLDEN_DIR), 'utf8')));
    hash.update(`${name}\n${normalized}\n`);
  }
  return { digest: hash.digest('hex'), files: names.length };
}

describe('versão das regras', () => {
  it('a versão das regras corresponde às partidas de referência', () => {
    const { digest, files } = goldenDigest();
    expect(files).toBeGreaterThan(0);
    // Versão já registrada = o resultado mudou depois dela; sem registro = a versão foi subida e falta a linha.
    const next = RULES_VERSION in RULES_DIGESTS ? RULES_VERSION + 1 : RULES_VERSION;
    const todo =
      next === RULES_VERSION
        ? `RULES_VERSION ${RULES_VERSION} ainda não tem digest`
        : `subiu o resultado de uma partida de referência: suba RULES_VERSION (hoje ${RULES_VERSION}) para ${next} em packages/engine/src/version.ts`;
    expect(RULES_DIGESTS[RULES_VERSION], `${todo} e registre o digest novo em RULES_DIGESTS (${next}: '${digest}')`).toBe(digest);
  });
});
