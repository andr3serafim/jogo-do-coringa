// O pre-commit rápido (`scripts/check-fast.ts`, na raiz) não tem pacote próprio nem runner; o teste mora no
// `packages/sim`, que roda no Node puro e já tem o Vitest, e importa o script por caminho relativo.
import { describe, expect, it } from 'vitest';
import { fastCommands, groupByPackage } from '../../../scripts/check-fast.ts';

describe('scripts/check-fast.ts', () => {
  it('agrupa os arquivos em stage por pacote, com caminhos relativos ao pacote', () => {
    expect(
      groupByPackage([
        'packages/sim/src/match.ts',
        'packages/server/src/core/game.ts',
        'packages/sim/test/replay.test.ts',
      ]),
    ).toEqual([
      { dir: 'packages/sim', files: ['src/match.ts', 'test/replay.test.ts'] },
      { dir: 'packages/server', files: ['src/core/game.ts'] },
    ]);
  });

  it('ignora o que não é código de pacote: raiz, docs, JSON, declarações geradas e arquivos sem pasta', () => {
    expect(
      groupByPackage([
        'CLAUDE.md',
        'package.json',
        'scripts/check-fast.ts',
        'docs/superpowers/specs/x.md',
        'packages/engine/test/fixtures/golden-replays.json',
        'packages/server/worker-configuration.d.ts',
        'packages/engine/package.json',
        'packages/orfao',
      ]),
    ).toEqual([]);
  });

  it('aceita componentes .tsx da web, para o pre-commit rodar os testes relacionados', () => {
    expect(groupByPackage(['packages/web/src/ui/Card.tsx'])).toEqual([{ dir: 'packages/web', files: ['src/ui/Card.tsx'] }]);
  });

  it('aceita caminhos com barra invertida e espaços nas pontas', () => {
    expect(groupByPackage(['packages\\protocol\\src\\code.ts ', ' packages/protocol/src/client.ts'])).toEqual([
      { dir: 'packages/protocol', files: ['src/code.ts', 'src/client.ts'] },
    ]);
  });

  it('monta lint, typecheck e um vitest related por pacote alterado', () => {
    expect(fastCommands(['packages/engine/src/apply-action.ts', 'README.md', 'packages/sim/src/match.ts'])).toEqual([
      ['lint'],
      ['typecheck'],
      ['--filter', './packages/engine', 'exec', 'vitest', 'related', '--run', '--passWithNoTests', 'src/apply-action.ts'],
      ['--filter', './packages/sim', 'exec', 'vitest', 'related', '--run', '--passWithNoTests', 'src/match.ts'],
    ]);
  });

  it('sem arquivo de código em stage roda só lint e typecheck', () => {
    expect(fastCommands(['CLAUDE.md'])).toEqual([['lint'], ['typecheck']]);
  });
});
