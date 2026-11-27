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
import { MAIN_ICON, NoticeLine, SECONDARY, SPECIAL, SPECIAL_TITLE, TwoLine } from './controls.tsx';
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
    <section
      ref={panelRef}
      data-painel
      tabIndex={-1}
      aria-label={LABEL}
      className="flex flex-col gap-2.5 text-papel pc:flex-row pc:items-center pc:gap-5"
    >
      <div className="pc:min-w-0 pc:flex-1">
        <p className="font-bold leading-snug">{RESURRECTION_WINDOW_TITLE}</p>
        <p className="text-sm leading-snug">{RESURRECTION_WINDOW_TEXT}</p>
      </div>
      {/* No PC, os botões presos à direita, centrados na vertical (decisoes.md 2026-11-26 (7), ponto 1); o aviso fica entre o texto e eles. */}
      <div data-botoes-principais className="flex flex-wrap gap-2 pc:order-last pc:ml-auto pc:flex-none pc:flex-nowrap">
        <TwoLine
          title={RESURRECT_LABEL}
          titleClass={SPECIAL_TITLE}
          icon={<ResurrectIcon className={MAIN_ICON} />}
          disabled={disabled}
          onClick={onResurrect}
          // A tinta das jogadas especiais (decisoes.md 2026-11-27 (1)); o Guardar segue o pequeno de papel.
          className={`${SPECIAL} flex-1 pc:flex-none`}
        />
        <button type="button" disabled={disabled} onClick={onKeep} className={`${SECONDARY} min-h-14 pc:min-h-12`}>
          {KEEP_RESURRECTION_LABEL}
        </button>
      </div>
      <NoticeLine notice={notice} />
    </section>
  );
}
