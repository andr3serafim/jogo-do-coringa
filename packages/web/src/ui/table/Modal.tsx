// O `<dialog>` modal nativo que o menu, o resumo das regras, a confirmação de desistir e o painel de fim usam (spec §7):
// o navegador prende o foco dentro, deixa o resto da página inerte e devolve o foco a quem o tinha ao fechar.
//
// Fica sempre montado, e `showModal()`/`close()` seguem `open`. O conteúdo só existe aberto (como no cemitério), para a
// árvore de acessibilidade e os testes não verem diálogo fechado. O Esc também é tratado aqui (`preventDefault` + `onClose`),
// para valer igual onde o diálogo nativo não fecha sozinho, e marca o evento como tratado para o Esc da escolha da mão não
// agir junto. Vários diálogos empilhados (menu → regras) são irmãos na árvore, nunca filhos: o Esc de um não chega ao outro.
import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';

export interface ModalProps {
  open: boolean;
  /** O diálogo fechou (Esc, botão ou o próprio navegador). Deve ser idempotente: também roda quando `open` já é falso. */
  onClose: () => void;
  /** O id do título. */
  labelledBy: string;
  /** O id do texto que descreve o diálogo (lido junto com o título ao abrir). */
  describedBy?: string;
  className?: string;
  children: ReactNode;
}

const BASE = 'm-auto max-h-[85dvh] overflow-y-auto border-4 border-tinta bg-papel p-5 text-tinta backdrop:bg-tinta/70';

export function Modal({ open, onClose, labelledBy, describedBy, className = 'w-[min(92vw,34rem)]', children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) el.showModal();
    else if (!open && el.open) el.close();
  }, [open]);

  // Desmontar com o diálogo aberto o fecha, para o navegador soltar o fundo. O elemento é guardado aqui: na limpeza
  // o React já soltou a `ref`.
  useEffect(() => {
    const el = ref.current;
    return () => {
      if (el?.open) el.close();
    };
  }, []);

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    onClose();
  };

  return (
    <dialog
      ref={ref}
      aria-labelledby={labelledBy}
      aria-describedby={describedBy}
      onClose={onClose}
      onKeyDown={onKeyDown}
      className={`${BASE} ${className}`}
    >
      {open ? children : null}
    </dialog>
  );
}
