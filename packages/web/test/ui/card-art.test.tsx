// A face com arte da carta (decks e raças, fatia 1, Task 4): o valor e o naipe no metal, o anel e a aura da faixa, os estados de hoje, e o
// Cordel intocado sem provedor.
import type { Card as EngineCard } from '@coringa/engine';
import { DEFAULT_LOOK, type Look } from '@coringa/protocol';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Card, type CardSize } from '../../src/ui/cards/Card.tsx';
import { LooksProvider } from '../../src/ui/cards/LooksProvider.tsx';
import type { LooksValue } from '../../src/ui/cards/looks-context.ts';
import { seriousViolations } from './support.tsx';

const seven: EngineCard = { id: 'n7', kind: 'NUM', value: 7, suit: 'copas' };
const two: EngineCard = { id: 'n2', kind: 'NUM', value: 2, suit: 'paus' };
const ten: EngineCard = { id: 'n10', kind: 'NUM', value: 10, suit: 'ouros' };
const k: EngineCard = { id: 'k1', kind: 'K', suit: 'paus' };
const wild: EngineCard = { id: 'w1', kind: 'WILD' };

const PACKS: LooksValue['packs'] = {
  bestiario: { '02': '/arte/02-morcego.webp', '07': '/arte/07-fenix.webp', '10': '/arte/10-dragao.webp' },
  egipcio: { K: '/arte/k-mascara.webp', J: '/arte/j-khopesh.webp', WILD: '/arte/coringa-anubis.webp' },
};
const FANTASY: Look = { deck: 'bestiario', race: 'egipcio' };

function withLook(children: ReactNode, look: Look = FANTASY, packs: LooksValue['packs'] = PACKS) {
  return (
    <LooksProvider look={look} packs={packs}>
      {children}
    </LooksProvider>
  );
}

const root = (container: HTMLElement): HTMLElement => container.firstElementChild as HTMLElement;
const tokens = (el: Element): string[] => el.className.toString().split(/\s+/);

describe('a carta sem provedor é a de cordel de hoje', () => {
  it.each([
    ['a numérica', seven, 'bg-papel'],
    ['o K', k, 'bg-papel'],
    ['o Selvagem', wild, 'bg-ouro'],
  ] as const)('%s', (_, card, bg) => {
    const { container } = render(<Card card={card} size="field" as={card.kind === 'WILD' ? 'J' : undefined} />);
    expect(tokens(root(container)).filter((token) => token.startsWith('bg-'))).toEqual([bg]);
    expect(container.querySelector('[data-valor]')?.className).toContain('font-madeira');
    expect(container.querySelector('img')).toBeNull();
    expect(container.querySelector('[data-aura]')).toBeNull();
    expect(container.querySelector('[data-anel-arte]')).toBeNull();
  });
});

describe('a carta com arte', () => {
  it('a numérica: a imagem decorativa, o valor e o naipe no metal, o anel, a aura e o nome de hoje', () => {
    const { container } = render(withLook(<Card card={seven} size="field" />));
    const img = container.querySelector('img');
    expect(img).toHaveAttribute('src', '/arte/07-fenix.webp');
    expect(img).toHaveAttribute('alt', '');
    const value = container.querySelector<HTMLElement>('[data-valor]');
    expect(value).toHaveTextContent('7');
    expect(value).toHaveStyle({ color: '#ffe2b0' });
    expect(value?.className).toContain('font-cinzel');
    expect(value?.className).not.toContain('text-vermelho');
    const suit = container.querySelector<SVGElement>('svg');
    expect(suit).toHaveStyle({ color: '#ffe2b0' });
    expect(suit?.getAttribute('class')).not.toContain('text-vermelho');
    expect(container.querySelector('[data-anel-arte]')).not.toBeNull();
    expect(container.querySelector('[data-aura]')).not.toBeNull();
    expect(screen.getByRole('img', { name: '7 de copas' })).toBe(root(container));
  });

  it('um fundo só (o escuro) e nenhum utilitário de box-shadow na carta', () => {
    for (const size of ['field', 'mini', 'hand'] as const) {
      for (const props of [{}, { quad: true }, { selected: true, onSelect: () => undefined }, { target: true }]) {
        const { container, unmount } = render(withLook(<Card card={seven} size={size} {...props} />));
        const list = tokens(root(container));
        expect(list.filter((token) => token.startsWith('bg-')), size).toEqual(['bg-tinta']);
        expect(list.filter((token) => /(^|:)shadow-/.test(token))).toEqual([]);
        unmount();
      }
    }
  });

  it('a aura cresce com a faixa: nenhuma no 2, a da faixa 5 no 10, a da faixa 3 no K da raça', () => {
    const aura = (card: EngineCard) => {
      const { container, unmount } = render(withLook(<Card card={card} size="field" />));
      const style = container.querySelector<HTMLElement>('[data-aura]')?.style.boxShadow ?? null;
      unmount();
      return style;
    };
    expect(aura(two)).toBeNull();
    expect(aura(ten)).toContain('14px 3px');
    expect(aura(k)).toContain('8px 1px');
  });

  it.each([
    ['field', 'text-[length:40cqw]', 'size-[34cqw]'],
    ['mini', 'text-[length:calc(var(--mini-w)*0.4)]', 'size-[calc(var(--mini-w)*0.34)]'],
    ['hand', 'text-[length:calc(var(--hand-w)*0.31)]', 'size-[calc(var(--hand-w)*0.21)]'],
  ] as const)('o tamanho %s: o valor e o naipe da tabela', (size: CardSize, value, suit) => {
    const { container } = render(withLook(<Card card={seven} size={size} />));
    expect(container.querySelector('[data-valor]')?.className).toContain(value);
    expect(container.querySelector('svg')?.getAttribute('class')).toContain(suit);
  });

  it('os estados da carta valem sobre a arte', () => {
    const one = (props: object): HTMLElement => {
      const { container } = render(withLook(<Card card={seven} size="field" {...props} />));
      return container;
    };
    const quad = one({ quad: true });
    expect(quad.querySelector('[data-anel-quadra]')).not.toBeNull();
    expect(quad.querySelector('[data-veu-quadra]')).not.toBeNull();
    expect(root(one({ grave: true })).className).toContain('grayscale');
    expect(root(one({ draft: true })).className).toContain('border-dashed');
    expect(root(one({ selected: true, onSelect: () => undefined })).className).toContain('anel-ouro');
    expect(root(one({ target: true })).className).toContain('anel-ouro');
    expect(one({ marked: true }).querySelector('[data-marca-novo]')).not.toBeNull();
    expect(one({ front: true }).querySelector('[data-frente]')).not.toBeNull();
    expect(root(one({ disabled: true, onSelect: () => undefined }))).toHaveAttribute('aria-disabled', 'true');
  });

  it('sem quadra, sem véu', () => {
    const { container } = render(withLook(<Card card={seven} size="field" />));
    expect(container.querySelector('[data-veu-quadra]')).toBeNull();
  });

  it('o Selvagem egípcio: sem valor nem naipe na mão; em campo, a letra do papel', () => {
    const hand = render(withLook(<Card card={wild} size="hand" />));
    expect(hand.container.querySelector('img')).toHaveAttribute('src', '/arte/coringa-anubis.webp');
    expect(hand.container.querySelector('[data-valor]')).toBeNull();
    expect(hand.container.querySelector('svg')).toBeNull();
    hand.unmount();
    const { container } = render(withLook(<Card card={wild} size="field" as="J" />));
    expect(container.querySelector('[data-valor]')).toHaveTextContent('J');
    expect(container.querySelector('[data-valor]')).toHaveStyle({ color: '#ffd98a' });
    expect(screen.getByRole('img', { name: 'Coringa Selvagem como J' })).toBeInTheDocument();
  });

  it('o papel escrito na mão segue no nome acessível, no metal', () => {
    render(withLook(<Card card={k} size="hand" roleText="Guarda" onSelect={() => undefined} />));
    const button = screen.getByRole('button', { name: 'K, Guarda, de paus' });
    expect(button.querySelector('img')).toHaveAttribute('src', '/arte/k-mascara.webp');
  });

  it('a mistura: o deck e a raça vestem cada um as suas cartas', () => {
    const bufao = render(withLook(<Card card={seven} size="field" />, { deck: 'bestiario', race: 'bufao' }));
    expect(bufao.container.querySelector('img')).not.toBeNull();
    bufao.unmount();
    const bufaoK = render(withLook(<Card card={k} size="field" />, { deck: 'bestiario', race: 'bufao' }));
    expect(bufaoK.container.querySelector('img')).toBeNull();
    bufaoK.unmount();
    // O pacote do Celestial ainda não chegou: a numérica fica de cordel, e o K da raça já tem arte.
    const celestial = { deck: 'celestial', race: 'egipcio' } as const;
    const pending = render(withLook(<Card card={seven} size="field" />, celestial));
    expect(pending.container.querySelector('img')).toBeNull();
    expect(pending.container.querySelector('[data-valor]')?.className).toContain('font-madeira');
    pending.unmount();
    const raceK = render(withLook(<Card card={k} size="field" />, celestial));
    expect(raceK.container.querySelector('img')).toHaveAttribute('src', '/arte/k-mascara.webp');
  });

  it('trocar a aparência no provedor troca a face sem remontar a carta', () => {
    const { container, rerender } = render(withLook(<Card card={seven} size="field" />));
    const before = root(container);
    expect(before.querySelector('img')).not.toBeNull();
    rerender(withLook(<Card card={seven} size="field" />, DEFAULT_LOOK));
    expect(root(container)).toBe(before);
    expect(before.querySelector('img')).toBeNull();
    expect(before.querySelector('[data-valor]')?.className).toContain('font-madeira');
  });

  it('o axe limpo com as três espécies de carta', async () => {
    const { container } = render(
      withLook(
        <div>
          <Card card={seven} size="field" front quad />
          <Card card={k} size="mini" />
          <Card card={wild} size="field" as="J" />
          <Card card={ten} size="hand" roleText="Ataque" onSelect={() => undefined} />
        </div>,
      ),
    );
    expect(await seriousViolations(container)).toEqual([]);
  });
});
