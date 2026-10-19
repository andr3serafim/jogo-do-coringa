// O `wrangler dev` e o `wrangler deploy --dry-run` recusam uma `assets.directory` que não existe (conferido na
// Tarefa 7; o `wrangler types` e o projeto de testes no workerd toleram a ausência). Num clone novo ou na CI a web
// ainda não foi construída, então este script reserva a pasta com um `index.html` mínimo. O `vite build` da web
// esvazia e refaz a pasta, e `packages/web/dist` está no .gitignore.
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PLACEHOLDER =
  '<!doctype html>\n<html lang="pt-BR"><meta charset="utf-8"><title>Jogo do Coringa</title>' +
  '<p>Construa a web: pnpm --filter @coringa/web build</p></html>\n';

/** Cria `dir/index.html` mínimo se ele não existe. Devolve `true` se reservou a pasta. */
export function ensureAssets(dir: string): boolean {
  const index = join(dir, 'index.html');
  if (existsSync(index)) return false;
  mkdirSync(dir, { recursive: true });
  writeFileSync(index, PLACEHOLDER);
  return true;
}

if (import.meta.main) {
  ensureAssets(fileURLToPath(new URL('../../web/dist/', import.meta.url)));
}
