// O resumo das regras (spec §2.4): uma página estática e curta, num `<dialog>` modal. O texto está em `copy.ts` e sai da
// spec 1 §1.6 a §1.8. O "Fechar" fica no topo, ao lado do título: o diálogo é longo, e o foco inicial (o primeiro botão)
// não pode levar a leitura para o fim.
import { useId } from 'react';
import { CLOSE_LABEL, RULES_LABEL, RULES_SECTIONS } from '../../model/copy.ts';
import { Modal } from './Modal.tsx';

export interface RulesDialogProps {
  open: boolean;
  onClose: () => void;
}

export function RulesDialog({ open, onClose }: RulesDialogProps) {
  const titleId = useId();
  return (
    <Modal open={open} onClose={onClose} labelledBy={titleId}>
      <div className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <h2 id={titleId} className="textura font-madeira text-2xl uppercase leading-tight">
            {RULES_LABEL}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-11 shrink-0 border-2 border-tinta bg-papel px-4 py-1.5 font-bold text-tinta"
          >
            {CLOSE_LABEL}
          </button>
        </div>
        {RULES_SECTIONS.map((section) => (
          <section key={section.title} className="flex flex-col gap-1.5">
            <h3 className="font-madeira text-base uppercase tracking-wide text-vermelho">{section.title}</h3>
            <ul role="list" className="flex list-disc flex-col gap-1.5 pl-5">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
