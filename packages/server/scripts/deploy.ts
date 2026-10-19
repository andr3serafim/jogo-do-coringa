// Constrói a web e publica o Worker, que a serve como static assets (`packages/web/dist`), carimbando a versão (o
// hash curto do commit) em `VERSION`, que o servidor devolve no /api/health e nos logs. Fica em Node e não em shell
// porque o pnpm roda os scripts no `cmd` do Windows. Só o autor roda isto (via `pnpm deploy:server` na raiz, depois do
// `pnpm check`): precisa do `wrangler login` feito uma vez.
import { spawnSync } from 'node:child_process';

/** Argumentos do `wrangler deploy` para o commit `hash`. Recusa o que não for hash curto de git. */
export function deployArgs(hash: string): string[] {
  if (!/^[0-9a-f]{4,40}$/.test(hash)) throw new Error(`hash de commit inválido: ${JSON.stringify(hash)}`);
  return ['deploy', '--var', `VERSION:${hash}`];
}

/** Constrói a web (`pnpm --filter @coringa/web build`) e devolve o código de saída; o deploy para se ele falhar. */
export function buildWeb(): number {
  // No Windows o pnpm é um .cmd, que o spawnSync só abre pelo shell; os argumentos são fixos.
  const run =
    process.platform === 'win32'
      ? spawnSync('pnpm --filter @coringa/web build', { stdio: 'inherit', shell: true })
      : spawnSync('pnpm', ['--filter', '@coringa/web', 'build'], { stdio: 'inherit' });
  if (run.error) {
    console.error(`erro: não consegui rodar o build da web: ${run.error.message}`);
    return 1;
  }
  return run.status ?? 1;
}

/** Roda o build da web e o publicador, e devolve o código de saída do primeiro que falhar (ou do wrangler). */
export function deploy(): number {
  const rev = spawnSync('git', ['rev-parse', '--short', 'HEAD'], { encoding: 'utf8' });
  if (rev.status !== 0) {
    console.error(`erro: não consegui ler o commit atual (git rev-parse): ${rev.stderr.trim() || rev.error?.message || 'sem detalhes'}`);
    return rev.status ?? 1;
  }
  const args = deployArgs(rev.stdout.trim());
  const build = buildWeb();
  if (build !== 0) {
    console.error('erro: o build da web falhou; nada foi publicado.');
    return build;
  }
  // No Windows o wrangler é um .cmd, que o spawnSync só abre pelo shell; os argumentos são fixos e já validados.
  const run =
    process.platform === 'win32'
      ? spawnSync(`wrangler ${args.join(' ')}`, { stdio: 'inherit', shell: true })
      : spawnSync('wrangler', args, { stdio: 'inherit' });
  if (run.error) {
    console.error(`erro: não consegui rodar o wrangler: ${run.error.message}`);
    return 1;
  }
  return run.status ?? 1;
}

if (import.meta.main) process.exitCode = deploy();
