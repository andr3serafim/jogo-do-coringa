// O painel da dica sozinho (plano da fatia 4, tarefa 4): texto por dica (a do anti-travamento saiu na E1 do sub-projeto 5), os botões,
// a região viva sempre montada (e vazia no primeiro desenho), a dica nova à vista e o foco que não cai na página quando o painel
// esvazia. A dica do fim mora no painel de fim (`EndHintNote`).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderToString } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { hintParagraphs } from '../../src/model/tutorial-copy.ts';
import type { HintId } from '../../src/model/tutorial.ts';
import { EndHintNote, HintPanel, type HintPanelProps } from '../../src/ui/table/HintPanel.tsx';
import { seriousViolations } from './support.tsx';

/** As dicas que o painel mostra: a do fim vai dentro do painel de fim (`EndHintNote`), porque o diálogo modal deixa a página inerte. */
const IDS: readonly Exclude<HintId, 'end'>[] = ['equip', 'quad', 'order', 'firstAttack', 'buffs', 'trap', 'wild', 'reflect'];

function mount(props: Partial<HintPanelProps> = {}) {
  const onGotIt = vi.fn();
  const onSkip = vi.fn();
  const all: HintPanelProps = { hint: 'equip', onGotIt, onSkip, ...props };
  const view = render(<HintPanel {...all} />);
  const rerender = (next: Partial<HintPanelProps>) => view.rerender(<HintPanel {...all} {...next} />);
  return { ...view, onGotIt, onSkip, rerender };
}

const panel = () => screen.getByRole('region', { name: 'Dica' });
const noop = () => undefined;

describe('<HintPanel />', () => {
  it.each(IDS)('a dica %s mostra o texto dela, com "Entendi" e "Pular o tutorial"', (id) => {
    mount({ hint: id });
    for (const paragraph of hintParagraphs(id)) expect(within(panel()).getByText(paragraph)).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Entendi' })).toBeInTheDocument();
    expect(within(panel()).getByRole('button', { name: 'Pular o tutorial' })).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
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

  it('a região viva monta vazia e a primeira dica entra depois do primeiro desenho (uma região criada já preenchida pode não ser lida)', () => {
    // Sem efeitos (o servidor): o primeiro desenho que o navegador veria. A região viva está lá, vazia, e sem botões.
    const html = renderToString(<HintPanel hint="equip" onGotIt={noop} onSkip={noop} />);
    expect(html).toContain('aria-live="polite"');
    expect(html).not.toContain('Suas numéricas');
    expect(html).not.toContain('Entendi');
    // Com os efeitos (o navegador, depois do primeiro desenho): o texto entra na mesma região.
    mount({ hint: 'equip' });
    expect(panel().querySelector('[aria-live]')).toHaveTextContent('Suas numéricas vão para o campo');
    expect(panel()).not.toHaveClass('sr-only');
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

  describe('a dica nova vem à vista (os campos rolam por dentro no celular e no tablet)', () => {
    type ScrollIntoView = (this: Element, arg?: boolean | ScrollIntoViewOptions) => void;
    let spy: ReturnType<typeof vi.fn<ScrollIntoView>>;
    const track = () => {
      spy = vi.fn<ScrollIntoView>();
      Element.prototype.scrollIntoView = spy;
    };
    afterEach(() => {
      delete (Element.prototype as { scrollIntoView?: unknown }).scrollIntoView;
    });

    it('rola o painel até a vista quando uma dica nova toma o painel, uma vez por dica, e não com o painel vazio', () => {
      track();
      const view = mount({ hint: 'firstAttack' });
      expect(spy).toHaveBeenCalledOnce();
      expect(spy.mock.contexts[0]).toBe(panel());
      // Instantânea, nunca suave, e só o que falta: o painel já à vista não mexe nos campos.
      expect(spy).toHaveBeenLastCalledWith({ block: 'nearest', behavior: 'auto' });
      // Um desenho novo com a mesma dica não rola de novo.
      view.rerender({ hint: 'firstAttack' });
      expect(spy).toHaveBeenCalledOnce();
      view.rerender({ hint: 'buffs' });
      expect(spy).toHaveBeenCalledTimes(2);
      // Esvaziar não rola; a próxima dica, sim.
      view.rerender({ hint: null });
      expect(spy).toHaveBeenCalledTimes(2);
      view.rerender({ hint: 'wild' });
      expect(spy).toHaveBeenCalledTimes(3);
    });

    it('sem scrollIntoView (jsdom) não quebra', () => {
      expect(() => mount({ hint: 'equip' })).not.toThrow();
    });
  });

  it('esvaziar o painel com o foco nele leva o foco ao painel de baixo da mesa', () => {
    const view = render(
      <>
        <HintPanel hint="equip" onGotIt={noop} onSkip={noop} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    screen.getByRole('button', { name: 'Entendi' }).focus();
    view.rerender(
      <>
        <HintPanel hint={null} onGotIt={noop} onSkip={noop} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    expect(screen.getByRole('region', { name: 'Painel de baixo' })).toHaveFocus();
  });

  it('sem painel de baixo na página (a vez do oponente na ordem, o fim da partida), o foco vai ao título da mesa, e não à página', () => {
    const tree = (hint: HintPanelProps['hint']) => (
      <main aria-label="Mesa">
        <h1 tabIndex={-1}>Mesa da partida</h1>
        <HintPanel hint={hint} onGotIt={noop} onSkip={noop} />
      </main>
    );
    const view = render(tree('equip'));
    screen.getByRole('button', { name: 'Entendi' }).focus();
    view.rerender(tree(null));
    expect(screen.getByRole('heading', { name: 'Mesa da partida' })).toHaveFocus();
  });

  it('com os dois na página, o painel de baixo vem antes do título da mesa', () => {
    const tree = (hint: HintPanelProps['hint']) => (
      <main aria-label="Mesa">
        <h1 tabIndex={-1}>Mesa da partida</h1>
        <HintPanel hint={hint} onGotIt={noop} onSkip={noop} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </main>
    );
    const view = render(tree('equip'));
    screen.getByRole('button', { name: 'Entendi' }).focus();
    view.rerender(tree(null));
    expect(screen.getByRole('region', { name: 'Painel de baixo' })).toHaveFocus();
  });

  it('esvaziar o painel sem o foco nele não mexe no foco', () => {
    const view = render(
      <>
        <button type="button">outro</button>
        <HintPanel hint="equip" onGotIt={noop} onSkip={noop} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    screen.getByRole('button', { name: 'outro' }).focus();
    view.rerender(
      <>
        <button type="button">outro</button>
        <HintPanel hint={null} onGotIt={noop} onSkip={noop} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    expect(screen.getByRole('button', { name: 'outro' })).toHaveFocus();
  });

  it('o painel que sai inteiro com o foco nele ("Pular") também leva o foco ao painel de baixo', () => {
    const view = render(
      <>
        <HintPanel hint="equip" onGotIt={noop} onSkip={noop} />
        <section data-painel tabIndex={-1} aria-label="Painel de baixo" />
      </>,
    );
    screen.getByRole('button', { name: 'Pular o tutorial' }).focus();
    view.rerender(<section data-painel tabIndex={-1} aria-label="Painel de baixo" />);
    expect(screen.getByRole('region', { name: 'Painel de baixo' })).toHaveFocus();
  });

  it('axe: sem violações sérias, com e sem dica', async () => {
    const { container, rerender } = mount({ hint: 'reflect' });
    expect(await seriousViolations(container)).toEqual([]);
    rerender({ hint: null });
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('<EndHintNote />', () => {
  it('a dica do fim e o link "Jogar com um amigo" para o início, sem "Entendi" nem "Pular"', async () => {
    const user = userEvent.setup();
    render(<EndHintNote onShown={noop} />);
    const note = document.querySelector<HTMLElement>('[data-dica-nota]')!;
    expect(note).toHaveTextContent(hintParagraphs('end')[0]!);
    const link = within(note).getByRole('link', { name: 'Jogar com um amigo' });
    expect(link).toHaveAttribute('href', '/');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
    window.history.replaceState(null, '', '/tutorial');
    await user.click(link);
    expect(window.location.pathname).toBe('/');
  });

  it('avisa que apareceu uma vez por montagem (é aí que o tutorial fica concluído)', () => {
    const onShown = vi.fn();
    const view = render(<EndHintNote onShown={onShown} />);
    expect(onShown).toHaveBeenCalledOnce();
    view.rerender(<EndHintNote onShown={onShown} />);
    expect(onShown).toHaveBeenCalledOnce();
  });

  it('axe: sem violações sérias', async () => {
    const { container } = render(<EndHintNote onShown={noop} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
