// As partidas gravadas de `e2e/fixtures/`, prontas para a chave `coringa:partidas`. Cada uma sai com a data de agora: a lista esconde
// as partidas com mais de 30 dias (decisoes.md 2026-11-24 (7)), e a data gravada no arquivo um dia passaria disso.
import { readFileSync } from 'node:fs';

export type FixtureGame = Record<string, unknown>;

/** As partidas da fixture `name` (o arquivo sem `.json`), com a `date` de agora. */
export function fixtureGames(name: string): FixtureGame[] {
  const games = JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8')) as FixtureGame[];
  const now = Date.now();
  return games.map((game) => ({ ...game, date: now }));
}

/** O texto da chave `coringa:partidas` com as partidas da fixture `name`. */
export const fixtureText = (name: string): string => JSON.stringify(fixtureGames(name));
