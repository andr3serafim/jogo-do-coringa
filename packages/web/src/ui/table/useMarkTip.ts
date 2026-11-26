// O comportamento da dica das figuras da mesa (as marcas do Coringa, decisoes.md 2026-11-23 (8); o disco da jogada recusada no Equipar,
// 2026-11-25 (6)): abre ao passar o mouse, ao focar pelo teclado e ao tocar; uma por vez (`mark-tip.ts`); fecha ao tocar fora, no Esc (que
// ela marca, para não pular a cena nem abrir o menu), ao rolar o que contém a figura e ao redimensionar. Extraído da `MarkFigure`, sem mudar.
import { useEffect, useRef, type FocusEvent, type PointerEvent, type RefObject } from 'react';
import { currentTip, openTip, useOpenTip } from './mark-tip.ts';

export interface MarkTipHandlers {
  onPointerEnter: (event: PointerEvent<HTMLElement>) => void;
  onPointerLeave: (event: PointerEvent<HTMLElement>) => void;
  onPointerDown: () => void;
  onFocus: (event: FocusEvent<HTMLElement>) => void;
  onBlur: (event: FocusEvent<HTMLElement>) => void;
  onClick: () => void;
}

/** A dica da figura `id`, presa ao botão `button`: se está aberta, e os tratadores que o botão leva. */
export function useMarkTip(id: string, button: RefObject<HTMLElement | null>): { open: boolean; handlers: MarkTipHandlers } {
  const open = useOpenTip() === id;
  /** Como a dica abriu: o mouse que passou a fecha ao sair; o toque e o foco, não. */
  const how = useRef<'hover' | 'focus' | 'tap' | null>(null);
  /** O foco que veio de um toque ou clique (o clique decide sozinho, e o foco não abre de novo). */
  const pressed = useRef(false);

  // A figura que sai com a dica aberta a fecha.
  useEffect(
    () => () => {
      if (currentTip() === id) openTip(null);
    },
    [id],
  );

  useEffect(() => {
    if (!open) return;
    const outside = (event: globalThis.PointerEvent) => {
      if (!button.current?.contains(event.target as Node)) openTip(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      openTip(null);
    };
    const close = () => openTip(null);
    // Só o rolar que mexe a figura (a página, ou o campo que a contém) solta a dica dela; o histórico, que desce sozinho a cada batida,
    // não a fecha.
    const scrolled = (event: Event) => {
      const target = event.target;
      if (target === document || (target instanceof Node && button.current !== null && target.contains(button.current))) openTip(null);
    };
    // Na captura: o Esc chega aqui antes dos ouvintes da mesa (o pulo das batidas, o menu), que ignoram o evento já marcado.
    document.addEventListener('pointerdown', outside, true);
    document.addEventListener('keydown', escape, true);
    document.addEventListener('scroll', scrolled, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('pointerdown', outside, true);
      document.removeEventListener('keydown', escape, true);
      document.removeEventListener('scroll', scrolled, true);
      window.removeEventListener('resize', close);
    };
  }, [open, button]);

  const handlers: MarkTipHandlers = {
    onPointerEnter: (event) => {
      if (event.pointerType !== 'mouse') return;
      how.current = 'hover';
      openTip(id);
    },
    onPointerLeave: (event) => {
      if (event.pointerType === 'mouse' && how.current === 'hover' && currentTip() === id) openTip(null);
    },
    onPointerDown: () => {
      pressed.current = true;
    },
    onFocus: () => {
      if (!pressed.current) {
        how.current = 'focus';
        openTip(id);
      }
      pressed.current = false;
    },
    onBlur: () => {
      if (how.current === 'focus' && currentTip() === id) openTip(null);
    },
    onClick: () => {
      // A dica que o mouse abriu fica no clique (agora presa); senão, o toque alterna.
      if (open && how.current === 'hover') {
        how.current = 'tap';
        return;
      }
      if (open) openTip(null);
      else {
        how.current = 'tap';
        openTip(id);
      }
    },
  };
  return { open, handlers };
}
