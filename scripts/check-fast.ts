// Pre-commit rápido (regra de evolução do CLAUDE.md: o `pnpm check` passou de ~45 s).
// Roda lint e typecheck do repositório inteiro e, de testes, só os relacionados aos arquivos em stage:
// `vitest related --run` em cada pacote que teve arquivo alterado. Fica de fora o projeto workerd do servidor
// (`vitest.worker.config.ts`): o `vitest related` usa só a configuração do Node. O pre-push roda o `pnpm check`
// completo, que cobre o que este atalho deixa passar (workerd, cobertura, smoke, testes de outros pacotes que
// dependem do arquivo alterado).
import { spawnSync } from 'node:child_process';

export interface PackageFiles {
  /** Pasta do pacote, relativa à raiz do repositório (`packages/sim`). */
  dir: string;
  /** Arquivos de código do pacote, relativos à pasta dele (`src/match.ts`). */
  files: string[];
}

/** Só código TypeScript entra no `vitest related`; as declarações geradas (`*.d.ts`) ficam de fora. */
const isSource = (file: string): boolean => file.endsWith('.ts') && !file.endsWith('.d.ts');

/** Agrupa os arquivos em stage (caminhos com `/`, a partir da raiz) por pacote em `packages/*`. */
export function groupByPackage(stagedFiles: string[]): PackageFiles[] {
  const groups = new Map<string, string[]>();
  for (const raw of stagedFiles) {
    const file = raw.trim().replaceAll('\\', '/');
    const match = /^(packages\/[^/]+)\/(.+)$/.exec(file);
    if (!match || !isSource(file)) continue;
    const [, dir, rest] = match as unknown as [string, string, string];
    groups.set(dir, [...(groups.get(dir) ?? []), rest]);
  }
  return [...groups].map(([dir, files]) => ({ dir, files }));
}

/** Os comandos do pre-commit, em ordem: lint, typecheck e um `vitest related` por pacote alterado. */
export function fastCommands(stagedFiles: string[]): string[][] {
  return [
    ['lint'],
    ['typecheck'],
    ...groupByPackage(stagedFiles).map(({ dir, files }) => [
      '--filter',
      `./${dir}`,
      'exec',
      'vitest',
      'related',
      '--run',
      '--passWithNoTests',
      ...files,
    ]),
  ];
}

function stagedFiles(): string[] {
  // ACMR: sem os apagados, que o vitest não consegue abrir.
  const out = spawnSync('git', ['diff', '--cached', '--name-only', '--diff-filter=ACMR'], { encoding: 'utf8' });
  if (out.status !== 0) throw new Error(`git diff --cached falhou: ${out.stderr.trim()}`);
  return out.stdout.split('\n').filter(Boolean);
}

/** Roda os comandos até o primeiro que falhar e devolve o código de saída. */
export function runFast(): number {
  const win = process.platform === 'win32';
  for (const args of fastCommands(stagedFiles())) {
    console.log(`\n> pnpm ${args.join(' ')}`);
    // No Windows o pnpm é um .cmd, que o spawnSync só abre pelo shell: um comando único, com os caminhos entre aspas
    // (passar args com `shell: true` é obsoleto no Node).
    const run = win
      ? spawnSync(`pnpm ${args.map((a) => `"${a}"`).join(' ')}`, { stdio: 'inherit', shell: true })
      : spawnSync('pnpm', args, { stdio: 'inherit' });
    if (run.status !== 0) {
      console.error(`\npre-commit rápido falhou em: pnpm ${args.join(' ')}`);
      return run.status ?? 1;
    }
  }
  return 0;
}

if (import.meta.main) process.exitCode = runFast();
