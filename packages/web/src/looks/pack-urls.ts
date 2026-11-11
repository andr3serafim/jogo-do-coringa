// O que os módulos de pacote têm em comum: do mapa do `import.meta.glob` (caminho → URL) e da tabela arquivo → chave, as URLs por chave.
// Mora à parte e não importa nada em tempo de execução: os pacotes (chunks pedidos por `import()`) o dividem sem puxar o inicial.
import type { ArtKey } from '../model/looks.ts';

/** As URLs por chave: `files` vem do `import.meta.glob('./*.webp', …)`, `names` diz a chave de cada arquivo (sem a extensão). */
export function urlsByKey(files: Record<string, string>, names: Record<string, ArtKey>): Partial<Record<ArtKey, string>> {
  const urls: Partial<Record<ArtKey, string>> = {};
  for (const [path, url] of Object.entries(files)) {
    const name = path.slice(path.lastIndexOf('/') + 1).replace(/\.webp$/, '');
    const key = names[name];
    if (key !== undefined) urls[key] = url;
  }
  return urls;
}
