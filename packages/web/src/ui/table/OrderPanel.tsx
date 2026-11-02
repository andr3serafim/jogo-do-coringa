// A escolha da ordem (spec §3.6), no lugar da barra de ação. Quem tem a iniciativa vê "atacar primeiro ou em segundo?", com "Atacar
// primeiro" pré-selecionado, e escolhe quando quiser: a ordem não sai mais sozinha (decisoes.md 2026-11-02 (9), ponto 7). Online vale o
// prazo do servidor, e a frase o diz; no treino e no tutorial não há prazo. O outro jogador vê "Duda está escolhendo a ordem…".
import type { PlayerView } from '@coringa/engine';
import { actionText } from '@coringa/sim/text';
import type { RefObject } from 'react';
import { ORDER_MANUAL_NO_CLOCK_TEXT, ORDER_MANUAL_TEXT, ORDER_QUESTION, orderWaitingText } from '../../model/copy.ts';
import type { Notice } from '../../model/session.ts';
import { NoticeLine, PRIMARY, PRIMARY_TITLE, SECONDARY, TwoLine } from './controls.tsx';
import { orderReasonText, type TableNames } from './labels.ts';

export interface OrderPanelProps {
  view: PlayerView;
  names: TableNames;
  /** É a sua vez de escolher (a lista legal tem `CHOOSE_ORDER`). */
  choosing: boolean;
  /** O estado tem prazo do servidor. Sem ele (treino e tutorial), a frase da escolha manual não fala em prazo. */
  hasDeadline: boolean;
  /** Controles desligados: jogada em voo, reconexão ou prazo esgotado. */
  disabled: boolean;
  /** O aviso de uma jogada recusada (devagar, regra do motor). */
  notice: Notice | null;
  onChoose: (first: boolean) => void;
  panelRef: RefObject<HTMLElement | null>;
}

export function OrderPanel({ view, names, choosing, hasDeadline, disabled, notice, onChoose, panelRef }: OrderPanelProps) {
  if (!choosing) {
    return (
      <section aria-label="Escolha da ordem" className="flex flex-col gap-2 text-papel">
        <p className="text-sm leading-snug">{orderWaitingText(names.opponent)}</p>
      </section>
    );
  }
  return (
    <section
      ref={panelRef}
      data-painel
      tabIndex={-1}
      aria-label="Escolha da ordem"
      className="flex flex-col gap-2.5 text-papel"
    >
      <div>
        <p className="text-sm leading-snug">{ORDER_QUESTION}</p>
        <p data-numero className="font-texto text-xs leading-snug tabular-nums">
          {orderReasonText(view)}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <TwoLine
          title={actionText({ type: 'CHOOSE_ORDER', first: true }, view)}
          titleClass={PRIMARY_TITLE}
          data-preselecionada=""
          disabled={disabled}
          onClick={() => onChoose(true)}
          className={`${PRIMARY} flex-1 pc:min-w-[220px] pc:flex-none`}
        />
        <button type="button" disabled={disabled} onClick={() => onChoose(false)} className={`${SECONDARY} min-h-14 pc:min-h-12`}>
          {actionText({ type: 'CHOOSE_ORDER', first: false }, view)}
        </button>
      </div>
      <NoticeLine notice={notice} />
      <p className="text-xs leading-snug">{hasDeadline ? ORDER_MANUAL_TEXT : ORDER_MANUAL_NO_CLOCK_TEXT}</p>
    </section>
  );
}
