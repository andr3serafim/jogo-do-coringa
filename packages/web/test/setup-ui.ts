// Preparação do projeto `ui` (jsdom): os matchers do jest-dom no `expect` do Vitest e a limpeza do DOM entre
// testes. Sem `globals: true`, a Testing Library não registra o `cleanup` sozinha.
import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
  cleanup();
});

// O jsdom não implementa estes dois; o `navigate` rola para o topo e o axe sonda o canvas. Sem o aviso no log.
window.scrollTo = () => undefined;
HTMLCanvasElement.prototype.getContext = (() => null) as typeof HTMLCanvasElement.prototype.getContext;
