import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['test/core/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/core/**/*.ts'],
      exclude: ['src/core/types.ts'],
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
