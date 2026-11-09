// O sopro da aura da iniciativa (bloco C dos pontos do playtest, ponto 11): toca uma vez por troca de mão, e nada fica no ar.
import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { InitiativeAura } from '../../src/ui/table/InitiativeAura.tsx';

beforeEach(() => {
  vi.useFakeTimers();
  HTMLElement.prototype.animate = function () {
    return { cancel() {}, finished: Promise.resolve() } as unknown as Animation;
  } as HTMLElement['animate'];
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  delete (HTMLElement.prototype as Partial<HTMLElement>).animate;
});

const smoke = (container: HTMLElement) => container.querySelectorAll('[data-particula]').length;

it('ligar e desligar o movimento reduzido não toca o sopro de novo, e o que estava no ar sai com ele', () => {
  const view = render(<InitiativeAura streak={0} reduced={false} busy={false} puff={1} />);
  expect(smoke(view.container)).toBeGreaterThan(0);
  // O movimento reduzido liga no meio do sopro: a fumaça sai na hora, sem esperar os timers.
  view.rerender(<InitiativeAura streak={0} reduced busy={false} puff={1} />);
  expect(smoke(view.container)).toBe(0);
  // E desliga: a troca de mão já passou, nada sopra.
  view.rerender(<InitiativeAura streak={0} reduced={false} busy={false} puff={1} />);
  expect(smoke(view.container)).toBe(0);
  // A troca seguinte sopra.
  view.rerender(<InitiativeAura streak={0} reduced={false} busy={false} puff={2} />);
  expect(smoke(view.container)).toBeGreaterThan(0);
  vi.advanceTimersByTime(700);
  expect(smoke(view.container)).toBe(0);
});
