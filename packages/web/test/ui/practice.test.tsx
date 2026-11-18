// Treinar (`/treinar`, spec 2026-11-18-menus-folheto-design.md §2): jogar com o bot ou aprender jogando; o ouro e o selo só com o tutorial
// por fazer.
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { Practice } from '../../src/ui/screens/Practice.tsx';
import { memoryStore, seriousViolations } from './support.tsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/treinar');
});

function setup(state: string | null = null) {
  const store = memoryStore();
  if (state !== null) store.set('coringa:tutorial', state);
  const user = userEvent.setup();
  const view = render(<Practice store={store} />);
  return { store, user, ...view };
}

describe('treinar', () => {
  it('o título com o foco, o Início e as duas escolhas, com as rotas', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Treinar' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: /^Jogar com o bot/ })).toHaveAttribute('href', '/treino');
    expect(screen.getByRole('link', { name: /^Aprender jogando/ })).toHaveAttribute('href', '/tutorial');
    expect(screen.getByRole('link', { name: 'Jogar com o bot Fácil, Médio ou Difícil' })).toBeInTheDocument();
  });

  it.each([
    ['Jogar com o bot', '/treino'],
    ['Aprender jogando', '/tutorial'],
    ['Início', '/'],
  ])('"%s" navega para %s', async (name, path) => {
    const { user } = setup();
    await user.click(screen.getByRole('link', { name: new RegExp(`^${name}`) }));
    expect(window.location.pathname).toBe(path);
  });

  it('com o tutorial por fazer, "Aprender jogando" vem em ouro e com o selo', () => {
    setup();
    const learn = screen.getByRole('link', { name: /^Aprender jogando/ });
    expect(learn).toHaveAttribute('data-tom', 'gold');
    expect(learn.querySelector('[data-selo-tutorial]')).not.toBeNull();
    expect(screen.getByRole('link', { name: /^Jogar com o bot/ })).toHaveAttribute('data-tom', 'paper');
  });

  it.each(['done', 'skipped'])('com coringa:tutorial = %s, de papel e sem selo', (state) => {
    setup(state);
    const learn = screen.getByRole('link', { name: /^Aprender jogando/ });
    expect(learn).toHaveAttribute('data-tom', 'paper');
    expect(learn.querySelector('[data-selo-tutorial]')).toBeNull();
  });

  it('axe: sem violações sérias', async () => {
    const { container } = setup();
    expect(await seriousViolations(container)).toEqual([]);
  });
});
