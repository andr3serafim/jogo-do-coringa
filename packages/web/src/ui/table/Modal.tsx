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
  /** Quem usa quer fechar: o Esc, ou um fechamento que não foi nosso (o voltar do Android, o navegador). Os botões do conteúdo chamam o próprio. */
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
  /**
   * Quantos `close()` nossos ainda esperam o evento `close` correspondente. No navegador esse evento vem numa tarefa
   * depois de `close()`. Sob o `<StrictMode>` (o `pnpm dev`) o React monta, desmonta e monta de novo os efeitos: o
   * diálogo fecha na limpeza simulada e reabre logo em seguida, e o `close` atrasado chegaria com ele aberto de novo e
   * o fecharia pela mão do pai (o painel de fim se recolheria sozinho). O `close` que nós mesmos pedimos não é um
   * pedido de quem usa: só os que vêm de fora (o voltar do Android, o navegador) chamam `onClose`.
   */
  const ownCloses = useRef(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (open && !el.open) {
      el.showModal();
    } else if (!open && el.open) {
      ownCloses.current += 1;
      el.close();
    }
  }, [open]);

  // Desmontar com o diálogo aberto o fecha, para o navegador soltar o fundo. O elemento é guardado aqui: na limpeza
  // o React já soltou a `ref`.
  useEffect(() => {
    const el = ref.current;
    const own = ownCloses;
    return () => {
      if (el?.open) {
        own.current += 1;
        el.close();
      }
    };
  }, []);

  const onNativeClose = () => {
    if (ownCloses.current > 0) {
      ownCloses.current -= 1;
      return;
    }
    // Reaberto desde então (outro `showModal` antes de o evento chegar): não há o que fechar.
    if (ref.current?.open) return;
    onClose();
  };

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
      onClose={onNativeClose}
      onKeyDown={onKeyDown}
      className={`${BASE} ${className}`}
    >
      {open ? children : null}
    </dialog>
  );
}
