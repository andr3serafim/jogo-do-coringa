// As artes do painel do Equipar no lugar dos textos (decisoes.md 2026-11-25 (4) e (6); spec 2026-11-25-equipar-abertura-niveis §3.3): cada
// uma diz o que o texto dizia, e o texto segue para o leitor de tela. O motivo da jogada recusada abre ao tocar no disco (o iPhone não mostra
// a dica do mouse), como as marcas do Coringa, e o toque é só da dica (`data-sem-pulo`).
import type { NumCard } from '@coringa/engine';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { ConfirmedArt, MiniCard, NoCardsArt, QuadBadge, RejectedNotice, SendingDots } from '../../src/ui/table/EquipArt.tsx';
import { openTip } from '../../src/ui/table/mark-tip.ts';

afterEach(() => {
  act(() => openTip(null));
});

const NINE: NumCard = { kind: 'NUM', id: 'n9', value: 9, suit: 'espadas' } as NumCard;
const tip = () => document.querySelector('[data-dica-marca]');

describe('as artes do Equipar', () => {
  it('a quadra do rascunho: o leque com o valor, "+7" e o texto para o leitor', () => {
    const { container } = render(<QuadBadge value={7} />);
    expect(container.querySelector('[data-quadra-nova]')).not.toBeNull();
    expect(screen.getByText('+7')).toBeInTheDocument();
    expect(screen.getByText('forma quadra de 7: +7 e 1 Ressurreição')).toHaveClass('sr-only');
  });

  it('a carta pequena da troca mostra o valor e é só desenho', () => {
    const { container } = render(<MiniCard card={NINE} />);
    const mini = container.firstElementChild!;
    expect(mini).toHaveAttribute('aria-hidden', 'true');
    expect(mini.textContent).toContain('9');
  });

  it('enviando: um status com "Enviando…" e três pontos que pulsam', () => {
    const { container } = render(<SendingDots />);
    expect(screen.getByRole('status')).toHaveTextContent('Enviando…');
    expect(container.querySelectorAll('.ponto-enviando')).toHaveLength(3);
  });

  it('sem numéricas: a figura e, se o outro ainda monta, a ampulheta; os dois textos para o leitor', () => {
    const { container, rerender } = render(<NoCardsArt waiting waitingText="Esperando Bot montar…" />);
    expect(screen.getByRole('status')).toHaveTextContent('Você não recebeu numéricas nesta rodada');
    expect(screen.getByRole('status')).toHaveTextContent('Esperando Bot montar…');
    expect(container.querySelector('[data-arte="sem-numericas"]')).not.toBeNull();
    expect(container.querySelector('[data-arte="espera"]')).not.toBeNull();
    rerender(<NoCardsArt waiting={false} waitingText="Esperando Bot montar…" />);
    expect(container.querySelector('[data-arte="espera"]')).toBeNull();
    expect(screen.getByRole('status')).not.toHaveTextContent('Esperando');
  });

  it('confirmado: o visto e a ampulheta; enviando, os pontos', () => {
    const { container, rerender } = render(<ConfirmedArt text="Você já confirmou; esperando Bot" sending={false} />);
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Você já confirmou; esperando Bot');
    expect(container.querySelector('[data-arte="confirmar"]')).not.toBeNull();
    expect(container.querySelector('[data-arte="espera"]')).not.toBeNull();
    rerender(<ConfirmedArt text="Você já confirmou; esperando Bot" sending />);
    expect(screen.getAllByRole('status')[0]).toHaveTextContent('Enviando…');
    expect(container.querySelector('[data-arte="espera"]')).toBeNull();
  });
});

describe('a jogada recusada', () => {
  const disc = () => screen.getByRole('button', { name: 'Calma: uma jogada por vez' });

  it('é um status com o motivo para o leitor, e o disco é só da dica (data-sem-pulo)', () => {
    render(<RejectedNotice text="Calma: uma jogada por vez" />);
    expect(screen.getByRole('status')).toHaveTextContent('Calma: uma jogada por vez');
    expect(disc()).toHaveAttribute('data-sem-pulo');
    expect(disc().querySelector('[data-arte="recusada"]')).not.toBeNull();
    expect(tip()).toBeNull();
  });

  it('o toque abre a dica com o motivo; tocar fora fecha', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <RejectedNotice text="Calma: uma jogada por vez" />
        <p>fora</p>
      </div>,
    );
    await user.click(disc());
    expect(tip()).toHaveTextContent('Calma: uma jogada por vez');
    await user.click(screen.getByText('fora'));
    expect(tip()).toBeNull();
  });

  it('o Esc fecha a dica e marca o evento, para não pular a cena nem abrir o menu', async () => {
    const user = userEvent.setup();
    render(<RejectedNotice text="Calma: uma jogada por vez" />);
    await user.click(disc());
    const event = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true });
    act(() => {
      document.body.dispatchEvent(event);
    });
    expect(event.defaultPrevented).toBe(true);
    expect(tip()).toBeNull();
  });

  it('o foco pelo teclado abre a dica', () => {
    render(<RejectedNotice text="Calma: uma jogada por vez" />);
    fireEvent.focus(disc());
    expect(tip()).toHaveTextContent('Calma: uma jogada por vez');
  });
});
