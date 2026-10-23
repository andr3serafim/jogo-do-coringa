import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';
import tseslint from 'typescript-eslint';

const TESTING_ONLY = {
  name: '@coringa/engine/testing',
  message: 'Os auxiliares de teste do motor são só para os testes (test/), nunca para o código de produção.',
};

/** Barra os imports e exports relativos cujo caminho não termina numa das extensões aceitas. */
function relativeImportRule(extensions, message) {
  const unlisted = String.raw`[source.value=/^\./]:not([source.value=/\.(${extensions})$/])`;
  return [
    'error',
    ...['ImportDeclaration', 'ExportNamedDeclaration', 'ExportAllDeclaration', 'ImportExpression'].map((node) => ({
      selector: `${node}${unlisted}`,
      message,
    })),
  ];
}

export default defineConfig(
  {
    ignores: [
      '**/node_modules/**',
      '**/coverage/**',
      '**/dist/**',
      'packages/web/dist/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/worker-configuration.d.ts',
      '**/.wrangler/**',
    ],
  },
  {
    files: ['**/*.{ts,tsx}'],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    rules: {
      // Import relativo sem `.ts` passa nos testes (Vite resolve) mas quebra o Node puro, que carrega os pacotes sem bundler.
      'no-restricted-syntax': relativeImportRule(
        'ts',
        'Imports relativos precisam terminar em .ts (o Node carrega o código sem bundler).',
      ),
    },
  },
  {
    // A web é o único pacote com bundler (spec §1.1): o Vite também carrega componentes `.tsx` e folhas de estilo.
    // A extensão continua obrigatória, como no resto do repositório.
    files: ['packages/web/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': relativeImportRule(
        'ts|tsx|css',
        'Imports relativos na web precisam terminar em .ts, .tsx ou .css.',
      ),
    },
  },
  {
    // Regras de hooks do React nos componentes e nos hooks da web, que também podem morar em `.ts` (`useSession.ts`).
    files: ['**/*.tsx', 'packages/web/src/**/*.ts'],
    extends: [reactHooks.configs.flat.recommended],
  },
  {
    // As dependências dos efeitos são contrato: um efeito que cria a sessão ou ouve eventos não pode ficar com valor velho.
    files: ['packages/web/**/*.tsx', 'packages/web/src/**/*.ts'],
    rules: { 'react-hooks/exhaustive-deps': 'error' },
  },
  {
    // Os auxiliares de teste do motor (`setup`, `act`...) são só para os testes: código de produção nunca os importa. Um bloco
    // posterior que também define `no-restricted-imports` substitui este nos arquivos dele, então repete o `TESTING_ONLY`.
    files: ['packages/*/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: [TESTING_ONLY] }],
    },
  },
  {
    // O código da web vai para o navegador: nada de node:*, e o Zod dos esquemas fica fora do bundle (spec §1.1). Esta regra
    // substitui a de cima nos arquivos da web, então repete o subpath de teste.
    files: ['packages/web/src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            TESTING_ONLY,
            {
              name: '@coringa/protocol/schemas',
              message: 'A web nunca importa os esquemas Zod do protocolo: eles ficam só no servidor.',
            },
          ],
          patterns: [{ group: ['node:*'], message: 'O código da web roda no navegador: nada de node:*.' }],
        },
      ],
    },
  },
  {
    files: ['packages/server/src/core/**/*.ts', 'packages/protocol/src/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [TESTING_ONLY],
          patterns: [{ group: ['cloudflare:*'], message: 'O núcleo e o protocolo rodam no Node puro: nada de cloudflare:*.' }],
        },
      ],
    },
  },
  {
    // Esses arquivos vão para o navegador (via `exports` do @coringa/sim): nada de node:*. O `determinize` entra no chunk do treino
    // pela busca do Difícil (`bots/hard.ts`).
    files: [
      'packages/sim/src/bots/**/*.ts',
      'packages/sim/src/experiments/determinize.ts',
      'packages/sim/src/rng.ts',
      'packages/sim/src/play/text.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [TESTING_ONLY],
          patterns: [{ group: ['node:*'], message: 'Este arquivo roda no navegador (exports do @coringa/sim): nada de node:*.' }],
        },
      ],
    },
  },
);
