// A carta que entra esmaecendo (a da compra, a que cai no destino): o esmaecer termina mesmo quando a batida dela some no meio dele. Um
// `state` novo no meio da batida da compra troca a linha do tempo, o `enterDelay` da carta vira `null` e, sem alvo, o Motion deixava a
// carta parada quase transparente, escura sobre a barra, como se estivesse travada (decisoes.md 2026-11-23 (1), o bug da mão apagada).
import type { Card as EngineCard } from '@coringa/engine';
import { render, waitFor } from '@testing-library/react';
import { domAnimation, LazyMotion } from 'motion/react';
import { describe, expect, it } from 'vitest';
import { AnimContext, IDLE_ANIM } from '../../src/ui/anim/context.ts';
import { Card, CardBack } from '../../src/ui/cards/Card.tsx';

const k: EngineCard = { id: 'k-novo', kind: 'K', suit: 'copas' };

function at(enter: number | null) {
  return (
    <LazyMotion features={domAnimation}>
      <AnimContext value={{ ...IDLE_ANIM, enterDelay: (id) => (id === k.id ? enter : null) }}>
        <Card card={k} size="hand" />
      </AnimContext>
    </LazyMotion>
  );
}

const opacityOf = (container: HTMLElement): number => Number((container.firstElementChild as HTMLElement).style.opacity || '1');

describe('a carta que entra esmaecendo', () => {
  it('termina de aparecer quando a batida dela some no meio do esmaecer', async () => {
    const { container, rerender } = render(at(0.02));
    await new Promise((done) => setTimeout(done, 80));
    rerender(at(null));
    await waitFor(() => expect(opacityOf(container)).toBe(1), { timeout: 2000 });
  });

  it('sem entrada, a carta não leva opacidade inline: as classes do rascunho, da trava e do cemitério valem', () => {
    const draft = (
      <LazyMotion features={domAnimation}>
        <Card card={k} size="field" draft />
      </LazyMotion>
    );
    const { container } = render(draft);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.opacity).toBe('');
    expect(root).toHaveClass('opacity-70');
    expect((render(at(null)).container.firstElementChild as HTMLElement).style.opacity).toBe('');
  });
});

describe('o verso que entra esmaecendo (a mão do oponente)', () => {
  it('termina de aparecer quando a entrada some no meio do esmaecer', async () => {
    const back = (enter: number | null) => (
      <LazyMotion features={domAnimation}>
        <CardBack enter={enter} />
      </LazyMotion>
    );
    const { container, rerender } = render(back(0.02));
    await new Promise((done) => setTimeout(done, 80));
    rerender(back(null));
    await waitFor(() => expect(opacityOf(container)).toBe(1), { timeout: 2000 });
  });
});
