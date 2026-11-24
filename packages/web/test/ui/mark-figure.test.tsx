// As marcas do Coringa só com a figura (decisoes.md 2026-11-23 (8) a (10); spec da cura §5): o medalhão é um botão com o nome e a linha do
// que a marca faz no nome acessível; a dica (o nome e a linha, num cartão de papel) abre ao passar o mouse, ao focar pelo teclado e ao tocar,
// uma por vez, e fecha ao tocar fora, no Esc (sem deixar o Esc chegar à mesa), ao rolar e ao redimensionar.
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { HealIcon, ReflectIcon } from '../../src/ui/table/icons.tsx';
import { MarkFigure } from '../../src/ui/table/MarkFigure.tsx';
import { openTip } from '../../src/ui/table/mark-tip.ts';

afterEach(() => {
  act(() => openTip(null));
});

const tip = () => document.querySelector('[data-dica-marca]');

function Two() {
  return (
    <ul>
      <li>
        <MarkFigure kind="cura" id="p1-cura" name="Cura passiva" does="a sua Defesa que cai vira vida" icon={<HealIcon />} />
      </li>
      <li>
        <MarkFigure kind="reflect" id="p2-reflect" name="Reflect ativo" does="o seu próximo golpe volta para você" icon={<ReflectIcon />} />
      </li>
    </ul>
  );
}

const cura = () => screen.getByRole('button', { name: 'Cura passiva: a sua Defesa que cai vira vida' });
const reflect = () => screen.getByRole('button', { name: 'Reflect ativo: o seu próximo golpe volta para você' });

describe('<MarkFigure />', () => {
  it('é um botão com o nome e a linha no nome acessível, e a dica fechada', () => {
    render(<Two />);
    expect(cura()).toHaveAttribute('data-marca', 'cura');
    expect(cura()).toHaveAttribute('aria-expanded', 'false');
    expect(tip()).toBeNull();
  });

  it('o medalhão tem o tamanho do disco de ouro do ataque (decisoes.md 2026-11-23 (11)), e a cura o acabamento dele, em verde', () => {
    render(<Two />);
    for (const button of [cura(), reflect()]) {
      expect(button).toHaveClass('size-6', 'pc:size-8');
      expect(button).not.toHaveClass('size-9');
    }
    expect(cura()).toHaveClass('marca-cura');
  });

  it('passar o mouse abre a dica com o nome e a linha; sair fecha', () => {
    render(<Two />);
    fireEvent.pointerEnter(cura(), { pointerType: 'mouse' });
    expect(tip()).toHaveTextContent('Cura passiva');
    expect(tip()).toHaveTextContent('a sua Defesa que cai vira vida');
    expect(tip()).toHaveAttribute('aria-hidden', 'true');
    expect(cura()).toHaveAttribute('aria-expanded', 'true');
    fireEvent.pointerLeave(cura(), { pointerType: 'mouse' });
    expect(tip()).toBeNull();
  });

  it('o foco pelo teclado abre; sair do foco fecha', async () => {
    const user = userEvent.setup();
    render(<Two />);
    await user.tab();
    expect(cura()).toHaveFocus();
    expect(tip()).toHaveTextContent('Cura passiva');
    await user.tab();
    expect(tip()).toHaveTextContent('Reflect ativo');
  });

  it('o toque alterna; abrir uma fecha a outra; tocar fora fecha', async () => {
    const user = userEvent.setup();
    render(<Two />);
    await user.pointer({ keys: '[TouchA]', target: cura() });
    expect(tip()).toHaveTextContent('Cura passiva');
    await user.pointer({ keys: '[TouchA]', target: reflect() });
    expect(document.querySelectorAll('[data-dica-marca]')).toHaveLength(1);
    expect(tip()).toHaveTextContent('Reflect ativo');
    await user.pointer({ keys: '[TouchA]', target: reflect() });
    expect(tip()).toBeNull();
    await user.pointer({ keys: '[TouchA]', target: cura() });
    expect(tip()).not.toBeNull();
    fireEvent.pointerDown(document.body);
    expect(tip()).toBeNull();
  });

  it('o Esc fecha a dica e marca o evento, para não pular a cena nem abrir o menu', () => {
    render(<Two />);
    fireEvent.pointerEnter(cura(), { pointerType: 'mouse' });
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(tip()).toBeNull();
    // Sem dica aberta, o Esc segue para a mesa.
    const free = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      document.dispatchEvent(free);
    });
    expect(free.defaultPrevented).toBe(false);
  });

  it('rolar outra área (o histórico que desce sozinho a cada batida) não fecha a dica; rolar o que contém a figura fecha', () => {
    render(
      <>
        <div data-testid="historico" />
        <div data-testid="campo">
          <Two />
        </div>
      </>,
    );
    fireEvent.pointerEnter(cura(), { pointerType: 'mouse' });
    fireEvent.scroll(screen.getByTestId('historico'));
    expect(tip()).not.toBeNull();
    fireEvent.scroll(screen.getByTestId('campo'));
    expect(tip()).toBeNull();
  });

  it('rolar ou redimensionar fecha a dica (ela fica presa à tela, e os campos rolam por dentro)', () => {
    render(<Two />);
    fireEvent.pointerEnter(cura(), { pointerType: 'mouse' });
    fireEvent.scroll(document);
    expect(tip()).toBeNull();
    fireEvent.pointerEnter(cura(), { pointerType: 'mouse' });
    fireEvent(window, new Event('resize'));
    expect(tip()).toBeNull();
  });

  it('a Ressurreição mostra o número num selo escondido do leitor de tela', () => {
    render(<MarkFigure kind="res" id="p1-res" name="2 Ressurreições disponíveis" does="traz 1 numérica do cemitério" icon={<HealIcon />} count={2} />);
    const button = screen.getByRole('button', { name: '2 Ressurreições disponíveis: traz 1 numérica do cemitério' });
    expect(button.querySelector('[data-selo]')).toHaveTextContent('2');
    expect(button.querySelector('[data-selo]')).toHaveAttribute('aria-hidden', 'true');
  });

  it('desmontar a figura com a dica aberta fecha a dica', () => {
    const view = render(<Two />);
    fireEvent.pointerEnter(cura(), { pointerType: 'mouse' });
    view.unmount();
    expect(tip()).toBeNull();
  });
});
