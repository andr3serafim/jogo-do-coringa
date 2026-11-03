// A janela da Ressurreição (ponto 16 do playtest), no lugar da barra de ação, logo depois da revelação do Equipar: quem formou quadra
// pode ressuscitar agora, antes do ataque, ou guardar a Ressurreição para depois. "Ressuscitar" abre o cemitério (o mesmo diálogo da
// fase principal, com a troca da última carta e a fileira protegida); "Guardar" passa. Quem espera vê "Duda formou quadra e decide…".
import type { RefObject } from 'react';
import { RESURRECT_LABEL } from '../../model/copy.ts';
import {
  KEEP_RESURRECTION_LABEL,
  RESURRECTION_WINDOW_TEXT,
  RESURRECTION_WINDOW_TITLE,
  resurrectionWaitingText,
} from '../../model/resurrection-copy.ts';
import type { Notice } from '../../model/session.ts';
import { NoticeLine, PRIMARY, PRIMARY_TITLE, SECONDARY, TwoLine } from './controls.tsx';
import type { TableNames } from './labels.ts';
import { ResurrectIcon } from './ResurrectIcon.tsx';

export interface ResurrectionPanelProps {
  names: TableNames;
  /** É a sua janela (a lista legal tem a Ressurreição e o passe). */
  deciding: boolean;
  /** Controles desligados: jogada em voo, reconexão ou prazo esgotado. */
  disabled: boolean;
  /** O aviso de uma jogada recusada (devagar, regra do motor). */
  notice: Notice | null;
  /** Abre o cemitério para escolher a carta e a fileira. */
  onResurrect: () => void;
  /** Passa a janela: a Ressurreição fica guardada. */
  onKeep: () => void;
  panelRef: RefObject<HTMLElement | null>;
}

const LABEL = 'Janela da Ressurreição';

export function ResurrectionPanel({ names, deciding, disabled, notice, onResurrect, onKeep, panelRef }: ResurrectionPanelProps) {
  if (!deciding) {
    return (
      <section aria-label={LABEL} className="flex flex-col gap-2 text-papel">
        <p className="text-sm leading-snug">{resurrectionWaitingText(names.opponent)}</p>
      </section>
    );
  }
  return (
    <section ref={panelRef} data-painel tabIndex={-1} aria-label={LABEL} className="flex flex-col gap-2.5 text-papel">
      <div>
        <p className="font-bold leading-snug">{RESURRECTION_WINDOW_TITLE}</p>
        <p className="text-sm leading-snug">{RESURRECTION_WINDOW_TEXT}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <TwoLine
          title={RESURRECT_LABEL}
          titleClass={PRIMARY_TITLE}
          icon={<ResurrectIcon />}
          disabled={disabled}
          onClick={onResurrect}
          className={`${PRIMARY} flex-1 pc:min-w-[220px] pc:flex-none`}
        />
        <button type="button" disabled={disabled} onClick={onKeep} className={`${SECONDARY} min-h-14 pc:min-h-12`}>
          {KEEP_RESURRECTION_LABEL}
        </button>
      </div>
      <NoticeLine notice={notice} />
    </section>
  );
}
