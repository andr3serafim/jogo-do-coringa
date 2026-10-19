import { defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.ts';

// Dois projetos (spec §9.1): `model` roda no Node, sem DOM; `ui` roda no jsdom com a Testing Library.
// Os dois herdam os plugins do `vite.config.ts` (`extends: true`), para o JSX dos testes sair igual ao do build.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      testTimeout: 60_000,
      projects: [
        { extends: true, test: { name: 'model', environment: 'node', include: ['test/model/**/*.test.ts'] } },
        {
          extends: true,
          test: {
            name: 'ui',
            environment: 'jsdom',
            include: ['test/ui/**/*.test.tsx'],
            setupFiles: ['./test/setup-ui.ts'],
          },
        },
      ],
      coverage: {
        provider: 'v8',
        include: ['src/model/**/*.ts'],
        exclude: ['src/model/copy.ts'],
        // Meta da spec §9.1: 90% de linhas e branches no núcleo puro.
        thresholds: { lines: 90, branches: 90 },
      },
    },
  }),
);
