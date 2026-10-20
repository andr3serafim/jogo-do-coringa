// A escolha da ordem (spec §3.6), no lugar da barra de ação. Quem tem a iniciativa vê "atacar primeiro ou em segundo?", com
// "Atacar primeiro" pré-selecionado e uma barra de 3 s que esvazia até `orderAutoAt` (o instante em que a sessão confirma
// sozinha, com a marca `auto`). Qualquer interação com o painel (toque, foco, mouse em cima) chama `onInteract`, e a sessão
// cancela a confirmação automática; aí vale o prazo do servidor. O outro jogador vê "Duda está escolhendo a ordem…".
//
// O mouse "em cima" é o `pointermove`, não o `pointerenter`: quando o painel nasce sob um cursor parado (o clique do
// Confirmar do Equipar estava no mesmo lugar), o Chrome dispara `pointerenter` sem ninguém ter mexido no mouse, e o
// automático nunca sairia. A barra é só decoração (`aria-hidden`); a frase ao lado diz o que ela mostra.
import type { PlayerView } from '@coringa/engine';
import { actionText } from '@coringa/sim/text';
import { useEffect, useState, type RefObject } from 'react';
import { ORDER_AUTO_MS } from '../../model/automation.ts';
import { ORDER_AUTO_TEXT, ORDER_MANUAL_TEXT, ORDER_QUESTION, orderWaitingText } from '../../model/copy.ts';
import type { Notice } from '../../model/session.ts';
import { NoticeLine, PRIMARY, PRIMARY_TITLE, SECONDARY, TwoLine } from './controls.tsx';
import type { TableNames } from './labels.ts';

export interface OrderPanelProps {
  view: PlayerView;
  names: TableNames;
  /** É a sua vez de escolher (a lista legal tem `CHOOSE_ORDER`). */
  choosing: boolean;
  /** Relógio local (`Session.now`) em que a ordem sai sozinha; `null` sem confirmação agendada. */
  autoAt: number | null;
  /** O relógio local da sessão, o mesmo de `autoAt`. */
  now: () => number;
  /** Controles desligados: jogada em voo, reconexão ou prazo esgotado. */
  disabled: boolean;
  /** O aviso de uma jogada recusada (devagar, regra do motor). */
  notice: Notice | null;
  onChoose: (first: boolean) => void;
  /** Toque, foco ou mouse sobre o painel. */
  onInteract: () => void;
  panelRef: RefObject<HTMLElement | null>;
}

export function OrderPanel({ view, names, choosing, autoAt, now, disabled, notice, onChoose, onInteract, panelRef }: OrderPanelProps) {
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
      tabIndex={-1}
      aria-label="Escolha da ordem"
      onPointerMove={onInteract}
      onPointerDown={onInteract}
      onFocus={onInteract}
      className="flex flex-col gap-2.5 text-papel"
    >
      <p className="text-sm leading-snug">{ORDER_QUESTION}</p>
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
      {autoAt === null ? (
        <p className="text-xs leading-snug">{ORDER_MANUAL_TEXT}</p>
      ) : (
        <>
          <AutoBar at={autoAt} now={now} />
          <p className="text-xs leading-snug">{ORDER_AUTO_TEXT}</p>
        </>
      )}
    </section>
  );
}

/** Quanto falta da confirmação automática: cheia nos últimos 3 s e vazia no instante em que a ordem sai. */
const BAR_TICK_MS = 100;

function AutoBar({ at, now }: { at: number; now: () => number }) {
  const [current, setCurrent] = useState(now);
  useEffect(() => {
    const id = setInterval(() => setCurrent(now()), BAR_TICK_MS);
    return () => clearInterval(id);
  }, [now]);
  const fraction = Math.min(1, Math.max(0, (at - current) / ORDER_AUTO_MS));
  return (
    <div aria-hidden="true" data-auto-barra className="h-2.5 border-2 border-papel">
      <div className="h-full bg-ouro" style={{ width: `${fraction * 100}%` }} />
    </div>
  );
}
