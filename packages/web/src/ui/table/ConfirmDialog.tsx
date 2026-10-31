// A confirmação de uma ação sem volta: desistir da partida (o menu) e apagar partidas guardadas (`/partidas`). Um `Modal` com o
// título, o texto do que se perde e dois botões. O "Cancelar" vem primeiro: é nele que o foco cai ao abrir (o gesto seguro), e o
// de confirmar é o vermelho cheio.
import { useId } from 'react';
import { CANCEL_LABEL } from '../../model/copy.ts';
import { Modal } from './Modal.tsx';

const BASE = 'min-h-11 border-2 px-4 py-1.5 text-left font-bold disabled:opacity-60';
const CANCEL = `${BASE} border-tinta bg-papel text-tinta`;
const CONFIRM = `${BASE} border-vermelho bg-vermelho text-papel`;

export interface ConfirmDialogProps {
  open: boolean;
  title: string;
  /** O que se perde ao confirmar; lido junto com o título ao abrir. */
  text: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDialog({ open, title, text, confirmLabel, onCancel, onConfirm }: ConfirmDialogProps) {
  const titleId = useId();
  const textId = useId();
  return (
    <Modal open={open} onClose={onCancel} labelledBy={titleId} describedBy={textId} className="w-[min(92vw,26rem)]">
      <div className="flex flex-col gap-4">
        <h2 id={titleId} className="textura font-madeira text-2xl uppercase leading-tight">
          {title}
        </h2>
        <p id={textId}>{text}</p>
        <div className="flex flex-wrap justify-end gap-3">
          <button type="button" className={CANCEL} onClick={onCancel}>
            {CANCEL_LABEL}
          </button>
          <button type="button" className={CONFIRM} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
