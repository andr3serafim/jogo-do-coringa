import js from '@eslint/js';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

/** Import relativo sem `.ts` passa nos testes (Vite resolve) mas quebra o Node puro, que carrega os pacotes sem bundler. */
const relativeWithoutTs = String.raw`[source.value=/^\./]:not([source.value=/\.ts$/])`;

export default defineConfig(
  { ignores: ['**/node_modules/**', '**/coverage/**', '**/dist/**'] },
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
);
