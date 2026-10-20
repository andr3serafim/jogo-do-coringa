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

// O jsdom também não tem `showModal` nem `close` no `<dialog>`. Isto imita só o que os testes usam, dos passos de
// foco da spec do HTML: abrir leva o foco ao primeiro elemento focável de dentro; fechar devolve o foco a quem o
// tinha, dispara `close` e esconde o diálogo (o jsdom já esconde `dialog:not([open])`). O foco preso e o Esc nativo
// não existem aqui: quem testa o Esc dispara a tecla, e o foco preso só vale no navegador (E2E).
const FOCUSABLE = 'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])';
const openers = new WeakMap<HTMLDialogElement, Element | null>();

HTMLDialogElement.prototype.showModal = function showModal(this: HTMLDialogElement) {
  if (this.open) throw new DOMException('o diálogo já está aberto', 'InvalidStateError');
  openers.set(this, document.activeElement);
  this.setAttribute('open', '');
  this.querySelector<HTMLElement>(FOCUSABLE)?.focus();
};

HTMLDialogElement.prototype.close = function close(this: HTMLDialogElement) {
  if (!this.open) return;
  this.removeAttribute('open');
  const opener = openers.get(this);
  openers.delete(this);
  if (opener instanceof HTMLElement && opener.isConnected) opener.focus();
  this.dispatchEvent(new Event('close'));
};
