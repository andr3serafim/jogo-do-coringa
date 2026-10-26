// O painel da dica sozinho (plano da fatia 4, tarefa 4): texto por dica, a dica 9 em duas frases com o número da partida, o link da
// dica do fim, os botões, a região viva sempre montada e o foco que não cai na página quando o painel esvazia.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { hintParagraphs } from '../../src/model/tutorial-copy.ts';
import type { HintId } from '../../src/model/tutorial.ts';
import { HintPanel, type HintPanelProps } from '../../src/ui/table/HintPanel.tsx';
import { seriousViolations } from './support.tsx';

const IDS: readonly HintId[] = ['equip', 'quad', 'order', 'firstAttack', 'buffs', 'trap', 'wild', 'reflect', 'pressure', 'end'];

function mount(props: Partial<HintPanelProps> = {}) {
  const onGotIt = vi.fn();
  const onSkip = vi.fn();
  const all: HintPanelProps = { hint: 'equip', antiStallRounds: 5, onGotIt, onSkip, ...props };
  const view = render(<HintPanel {...all} />);
  const rerender = (next: Partial<HintPanelProps>) => view.rerender(<HintPanel {...all} {...next} />);
  return { ...view, onGotIt, onSkip, rerender };
}

const panel = () => screen.getByRole('region', { name: 'Dica' });

describe('<HintPanel />', () => {
  it.each(IDS)('a dica %s mostra o texto dela, com "Entendi"', (id) => {
    mount({ hint: id });
    for (const paragraph of hintParagraphs(id, 5)) expect(within(panel()).getByText(paragraph)).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Entendi' })).toBeInTheDocument();
  });

  it('a dica 9 tem a frase da Pressão num elemento só dela, e a do anti-travamento com o número da partida', () => {
    mount({ hint: 'pressure', antiStallRounds: 7 });
    const pressure = screen.getByText(/^Pressão da mesa:/);
    const stall = screen.getByText(/^Anti-travamento:/);
    expect(pressure).not.toBe(stall);
    expect(pressure.tagName).toBe('P');
    expect(pressure.textContent).not.toMatch(/Anti-travamento/);
    expect(stall).toHaveTextContent('Anti-travamento: 7 rodadas de Ataque seguidas sem ninguém perder vida encerram a partida.');
  });

  it('o número do anti-travamento acompanha a partida', () => {
    const view = mount({ hint: 'pressure', antiStallRounds: 3 });
    expect(screen.getByText(/^Anti-travamento:/)).toHaveTextContent('Anti-travamento: 3 rodadas');
    view.rerender({ antiStallRounds: 9 });
    expect(screen.getByText(/^Anti-travamento:/)).toHaveTextContent('Anti-travamento: 9 rodadas');
  });

  it('"Entendi" e "Pular o tutorial" chamam o que lhes cabe', async () => {
    const user = userEvent.setup();
    const { onGotIt, onSkip } = mount();
    await user.click(screen.getByRole('button', { name: 'Entendi' }));
    expect(onGotIt).toHaveBeenCalledOnce();
    expect(onSkip).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Pular o tutorial' }));
    expect(onSkip).toHaveBeenCalledOnce();
  });

  it('a dica do fim tem o link "Jogar com um amigo" para o início, e não o "Pular o tutorial"', async () => {
    const user = userEvent.setup();
    mount({ hint: 'end' });
    const link = screen.getByRole('link', { name: 'Jogar com um amigo' });
    expect(link).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button', { name: 'Pular o tutorial' })).not.toBeInTheDocument();
    window.history.replaceState(null, '', '/tutorial');
    await user.click(link);
    expect(window.location.pathname).toBe('/');
  });

  it('só as dicas do fim têm o link', () => {
    mount({ hint: 'wild' });
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('o painel é uma região "Dica", não modal, e só o texto está na região viva polite', () => {
    mount();
    const live = panel().querySelector('[aria-live]')!;
    expect(live).toHaveAttribute('aria-live', 'polite');
    expect(live).toHaveAttribute('aria-atomic', 'true');
    expect(live).not.toContainElement(screen.getByRole('button', { name: 'Entendi' }));
    expect(panel()).not.toHaveAttribute('aria-modal');
    expect(panel().closest('dialog')).toBeNull();
    // Toques nele são só dele (o palco não os usa para pular as batidas).
    expect(panel()).toHaveAttribute('data-sem-pulo');
  });

  it('sem dica, a mesma região viva segue montada, vazia e fora da vista, sem botões', () => {
    const view = mount();
    const live = panel().querySelector('[aria-live]')!;
    view.rerender({ hint: null });
    expect(panel().querySelector('[aria-live]')).toBe(live);
    expect(live).toBeEmptyDOMElement();
    expect(panel()).toHaveClass('sr-only');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('trocar uma dica pela outra mantém os mesmos botões (o foco em "Entendi" fica lá)', () => {
    const view = mount({ hint: 'firstAttack' });
    const gotIt = screen.getByRole('button', { name: 'Entendi' });
    gotIt.focus();
    view.rerender({ hint: 'buffs' });
    expect(screen.getByRole('button', { name: 'Entendi' })).toBe(gotIt);
    expect(gotIt).toHaveFocus();
  });

  it('esvaziar o painel com o foco nele leva o foco ao painel de baixo da mesa', () => {
    const view = render(
      <>
        <HintPanel hint="equip" antiStallRounds={5} onGotIt={() => undefined} onSkip={() => undefined} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    screen.getByRole('button', { name: 'Entendi' }).focus();
    view.rerender(
      <>
        <HintPanel hint={null} antiStallRounds={5} onGotIt={() => undefined} onSkip={() => undefined} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    expect(screen.getByRole('region', { name: 'Painel de baixo' })).toHaveFocus();
  });

  it('esvaziar o painel sem o foco nele não mexe no foco', () => {
    const view = render(
      <>
        <button type="button">outro</button>
        <HintPanel hint="equip" antiStallRounds={5} onGotIt={() => undefined} onSkip={() => undefined} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    screen.getByRole('button', { name: 'outro' }).focus();
    view.rerender(
      <>
        <button type="button">outro</button>
        <HintPanel hint={null} antiStallRounds={5} onGotIt={() => undefined} onSkip={() => undefined} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'outro' })).toHaveFocus();
  });

  it('o painel que sai inteiro com o foco nele ("Pular") também leva o foco ao painel de baixo', () => {
    const view = render(
      <>
        <HintPanel hint="equip" antiStallRounds={5} onGotIt={() => undefined} onSkip={() => undefined} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    screen.getByRole('button', { name: 'Pular o tutorial' }).focus();
    view.rerender(<section data-painel tabIndex={-1} aria-label="Painel de baixo" />);
    expect(screen.getByRole('region', { name: 'Painel de baixo' })).toHaveFocus();
  });

  it('axe: sem violações sérias, com e sem dica', async () => {
    const { container, rerender } = mount({ hint: 'pressure' });
    expect(await seriousViolations(container)).toEqual([]);
    rerender({ hint: 'end' });
    expect(await seriousViolations(container)).toEqual([]);
    rerender({ hint: null });
    expect(await seriousViolations(container)).toEqual([]);
  });
});
