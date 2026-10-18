import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/** Import relativo sem `.ts` passa nos testes (Vite resolve) mas quebra o Node puro, que carrega os pacotes sem bundler. */
const relativeWithoutTs = String.raw`[source.value=/^\./]:not([source.value=/\.ts$/])`;

export default defineConfig(
  { ignores: ['**/node_modules/**', '**/coverage/**', '**/dist/**', '**/worker-configuration.d.ts', '**/.wrangler/**'] },
  {
    files: ['**/*.ts'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      'no-restricted-syntax': [
        'error',
        ...['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].map((node) => ({
          selector: `${node}${relativeWithoutTs}`,
          message: 'Imports relativos precisam terminar em .ts (o Node carrega o código sem bundler).',
        })),
      ],
    },
  },
  {
    files: ['packages/server/src/core/**/*.ts', 'packages/protocol/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['cloudflare:*'], message: 'O núcleo e o protocolo rodam no Node puro: nada de cloudflare:*.' }],
        },
      ],
    },
  },
  {
    // Esses arquivos vão para o navegador (via `exports` do @coringa/sim): nada de node:*.
    files: ['packages/sim/src/bots/**/*.ts', 'packages/sim/src/rng.ts', 'packages/sim/src/play/text.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [{ group: ['node:*'], message: 'Este arquivo roda no navegador (exports do @coringa/sim): nada de node:*.' }],
        },
      ],
    },
  },
);
