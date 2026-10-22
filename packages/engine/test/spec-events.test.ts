import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/** Os nomes dos eventos da união `GameEvent`, lidos do código (o tipo não existe em tempo de execução). */
function unionEvents(): string[] {
  const source = readFileSync(new URL('../src/types.ts', import.meta.url), 'utf8');
  const union = /export type GameEvent =([\s\S]*?);\n/.exec(source)?.[1] ?? '';
  return [...union.matchAll(/type: '([A-Za-z]+)'/g)].map((match) => match[1]!);
}

/** Os nomes de evento que a spec do motor lista na §2.5. */
function specEvents(): string[] {
  const spec = readFileSync(new URL('../../../docs/superpowers/specs/2026-10-15-jogo-coringa-regras-motor-design.md', import.meta.url), 'utf8');
  const section = /### 2\.5 Eventos\n([\s\S]*?)\n### /.exec(spec)?.[1] ?? '';
  return [...section.matchAll(/`([A-Z][A-Za-z]+)`/g)].map((match) => match[1]!).filter((name) => name !== 'GameEvent');
}

describe('a spec do motor e a união GameEvent', () => {
  it('a §2.5 lista exatamente os eventos que o motor emite, sem nome a mais nem a menos', () => {
    const union = unionEvents();
    expect(union.length).toBeGreaterThan(25);
    expect(new Set(specEvents())).toEqual(new Set(union));
  });
});
