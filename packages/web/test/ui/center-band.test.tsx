// A faixa do centro (bloco D dos pontos do playtest, ponto 14; spec do playtest §6.2): o monte e o cemitério no meio, lado a lado, com a
// situação da rodada à esquerda e o treino à direita. O cemitério é uma lápide, com a carta do topo encostada; a que chega levanta poeira.
// A estrutura de acessibilidade do cemitério (o nome, o texto visível, o botão que cobre a caixa) segue testada no `table.test.tsx`.
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AnimContext, IDLE_ANIM } from '../../src/ui/anim/context.ts';
import { CenterBand, type CenterBandProps } from '../../src/ui/table/CenterBand.tsx';
import { scenarioAt, type ViewSpec } from '../fixtures.ts';

const DRAFT: ViewSpec = {
  round: 7,
  self: { hp: 187, hand: ['K'], attackRow: [8, 4], defenseRow: [3, 6] },
  opponent: { hp: 214, hand: ['A'], attackRow: [6, 9], defenseRow: [5, 7] },
  graveyard: [3, 5, 8],
};

const viewOf = (graveyard: ViewSpec['graveyard']) => scenarioAt({ ...DRAFT, graveyard }).view;

function band(extra: Partial<CenterBandProps> = {}, reduced = false) {
  const props: CenterBandProps = {
    view: viewOf(DRAFT.graveyard),
    names: { self: 'André', opponent: 'Duda' },
    face: null,
    live: { id: 0, text: '' },
    ...extra,
  };
  const wrap = (p: CenterBandProps) => <AnimContext value={{ ...IDLE_ANIM, reduced }}>{<CenterBand {...p} />}</AnimContext>;
  const view$ = render(wrap(props));
  return { props, ...view$, update: (next: Partial<CenterBandProps>) => view$.rerender(wrap({ ...props, ...next })) };
}

const region = () => screen.getByRole('region', { name: 'Situação da rodada' });
const grave = () => region().querySelector('[data-cemiterio]')!;

describe('faixa do centro: o arranjo', () => {
  it('três colunas: a situação da rodada, o monte e o cemitério no meio, e o treino à direita', () => {
    band({ training: 'medio' });
    const columns = [...region().children].filter((el) => !el.hasAttribute('data-anuncio'));
    expect(columns).toHaveLength(3);
    expect(columns[0]).toHaveTextContent('Ataque · sua vez');
    expect(columns[1]!.querySelector('[data-monte]')).not.toBeNull();
    expect(columns[1]!.querySelector('[data-cemiterio]')).not.toBeNull();
    expect(columns[2]).toHaveTextContent(/Treino · Médio/);
    // O monte vem antes do cemitério, lado a lado.
    const [first, second] = [...columns[1]!.children];
    expect(first).toHaveAttribute('data-monte');
    expect(second).toHaveAttribute('data-cemiterio');
  });

  it('online (sem treino nem replay), a coluna da direita fica vazia, e o centro segue no centro', () => {
    band();
    const columns = [...region().children].filter((el) => !el.hasAttribute('data-anuncio'));
    expect(columns).toHaveLength(3);
    expect(columns[2]!.textContent).toBe('');
  });
});

describe('faixa do centro: o monte', () => {
  const pile = () => region().querySelector('[data-monte]')!;

  it('é uma pilha de até três versos, só desenho, com o número na fonte de texto', () => {
    const { props } = band();
    expect(props.view.deckCount).toBeGreaterThan(3);
    expect(pile().querySelectorAll('[data-monte-verso]')).toHaveLength(3);
    expect(pile().querySelector('.monte-pilha')).toHaveAttribute('aria-hidden', 'true');
    const number = within(pile() as HTMLElement).getByText(String(props.view.deckCount));
    expect(number).toHaveAttribute('data-numero');
    expect(number.className).toContain('tabular-nums');
    expect(number.className).toContain('font-texto');
  });

  it('a pilha encolhe com o monte: duas, uma, e o contorno vazio', () => {
    const view = viewOf(DRAFT.graveyard);
    for (const [deckCount, layers] of [
      [2, 2],
      [1, 1],
      [0, 0],
    ] as const) {
      const { unmount } = band({ view: { ...view, deckCount } });
      expect(pile().querySelectorAll('[data-monte-verso]')).toHaveLength(layers);
      if (deckCount === 0) expect(pile().querySelector('[data-monte-vazio]')).not.toBeNull();
      else expect(pile().querySelector('[data-monte-vazio]')).toBeNull();
      unmount();
    }
  });
});

describe('faixa do centro: a lápide', () => {
  it('o cemitério é a lápide, com as rachas desenhadas e a carta do topo encostada (a primeira filha, só desenho com o botão)', () => {
    const { props } = band({ onOpenGraveyard: vi.fn() });
    expect(grave()).toHaveAttribute('data-lapide');
    expect(grave().className).toContain('lapide');
    expect(grave().querySelector('svg[data-rachas]')).toHaveAttribute('aria-hidden', 'true');
    const top = props.view.graveyard.at(-1)!;
    expect(grave().firstElementChild!.querySelector(`[data-card-id="${top.id}"]`)).not.toBeNull();
    expect(grave().firstElementChild).toHaveAttribute('aria-hidden', 'true');
    // Só a carta do topo é carta de verdade: os voos e as cenas procuram as cartas pelo `data-card-id`.
    expect(grave().querySelectorAll('[data-card-id]')).toHaveLength(1);
  });

  it('com duas ou mais cartas, um canto de papel aparece atrás da do topo; com uma ou nenhuma, não', () => {
    for (const [graveyard, corner] of [
      [[3, 5, 8], true],
      [[3, 5], true],
      [[3], false],
      [[], false],
    ] as const) {
      const { unmount } = band({ view: viewOf([...graveyard]) });
      const found = grave().querySelector('[data-segunda]');
      if (corner) expect(found).toHaveAttribute('aria-hidden', 'true');
      else expect(found).toBeNull();
      unmount();
    }
  });

  it('a conta é número de jogo: fonte de texto, algarismos tabulares, sem textura', () => {
    band();
    const count = within(grave() as HTMLElement).getByText('3');
    expect(count).toHaveAttribute('data-numero');
    expect(count.className).toContain('font-texto');
    expect(count.className).toContain('tabular-nums');
    expect(count.className).not.toMatch(/grao|textura/);
  });
});

describe('faixa do centro: a poeira da carta que chega', () => {
  const dust = () => grave().querySelector('[data-poeira]');

  it('na montagem não há poeira; quando a conta cresce, cinco grãos sobem do pé da lápide', () => {
    const { update } = band();
    expect(dust()).toBeNull();
    update({ view: viewOf([3, 5, 8, 9]) });
    expect(dust()).toHaveAttribute('aria-hidden', 'true');
    expect(dust()!.children).toHaveLength(5);
  });

  it('cada chegada toca a poeira de novo (um nó novo)', () => {
    const { update } = band();
    update({ view: viewOf([3, 5, 8, 9]) });
    const first = dust();
    update({ view: viewOf([3, 5, 8, 9, 2]) });
    expect(dust()).not.toBeNull();
    expect(dust()).not.toBe(first);
  });

  it('a conta que diminui (a Ressurreição) não levanta poeira', () => {
    const { update } = band();
    update({ view: viewOf([3, 5]) });
    expect(dust()).toBeNull();
  });

  it('com movimento reduzido, nenhuma poeira', () => {
    const { update } = band({}, true);
    update({ view: viewOf([3, 5, 8, 9]) });
    expect(dust()).toBeNull();
  });
});
