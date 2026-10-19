// Preparação do projeto `ui` (jsdom): os matchers do jest-dom no `expect` do Vitest e a limpeza do DOM entre
// testes. Sem `globals: true`, a Testing Library não registra o `cleanup` sozinha.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});
