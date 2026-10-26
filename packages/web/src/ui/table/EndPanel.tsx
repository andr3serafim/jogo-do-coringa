// O fim da partida (spec §2.5): um painel sobre a mesa final, que continua à vista e só para ver. Diz o resultado, o motivo
// (do motor, ou da `cause` do servidor nos W.O.) e o placar da sala, e tem **Revanche** (alterna), **Ver a mesa** (recolhe),
// **Rever a partida** (só quando ela ficou guardada com replay) e **Nova sala**. É um `<dialog>` modal; recolhido, vira uma
// faixa no pé da tela com o resultado, o estado da revanche e o botão que o abre de novo, para a revanche não ficar fora de
// alcance.
//
// A revanche mostrada é a que o servidor confirmou (`seats[].wantsRematch`), nunca um palpite local. Quem monta o painel
// o faz só enquanto a sala está em `FINISHED` (e com a mesa quieta); a nova partida desmonta tudo, e o recolhimento vale
// para uma partida só (`key` pelo `gameNo`, na `PlayTable`).
import type { PlayerId } from '@coringa/engine';
import type { Outcome, Score } from '@coringa/protocol';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  END_EYEBROW,
  END_RESULT_LABEL,
  NEW_ROOM_LABEL,
  REMATCH_LABEL,
  REVIEW_GAME_LABEL,
  rematchStatusText,
  reasonText,
  resultTitle,
  SCORE_LABEL,
  scoreText,
  SHOW_RESULT_LABEL,
  VIEW_TABLE_LABEL,
  type OutcomeNames,
} from '../../model/copy.ts';
import { Button } from '../parts.tsx';
import { Modal } from './Modal.tsx';

export interface EndPanelProps {
  outcome: Outcome;
  score: Score;
  me: PlayerId;
  names: OutcomeNames;
  /** Eu pedi a revanche (o que o servidor guardou). */
  mineWants: boolean;
  /** O oponente pediu. */
  theirsWants: boolean;
  /** O oponente está fora da sala: a revanche espera ele voltar. */
  away: boolean;
  /** Sem conexão o pedido se perderia. */
  disabled: boolean;
  onRematch: (want: boolean) => void;
  /** Fecha a sala e volta ao início. Sem ele o botão não existe. */
  onNewRoom?: () => void;
  /** O rótulo do botão (padrão "Nova sala"); o treino diz "Voltar ao início". */
  newRoomLabel?: string;
  /** Abre o replay da partida que acabou. Sem ele (partida sem replay guardado) o botão "Rever a partida" não existe. */
  onReview?: () => void;
  /**
   * Uma nota dentro do diálogo, entre o placar e os botões (o tutorial põe aqui a dica do fim). Tem que ser aqui: o diálogo é
   * modal, e uma dica fora dele fica inerte (sem clique, sem foco e fora da árvore de acessibilidade) atrás dele.
   */
  note?: ReactNode;
}

export function EndPanel({
  outcome,
  score,
  me,
  names,
  mineWants,
  theirsWants,
  away,
  disabled,
  onRematch,
  onNewRoom,
  newRoomLabel = NEW_ROOM_LABEL,
  onReview,
  note,
}: EndPanelProps) {
  const titleId = useId();
  const reasonId = useId();
  const [collapsed, setCollapsed] = useState(false);
  const showRef = useRef<HTMLButtonElement>(null);

  const title = resultTitle(outcome, me, names);
  const reason = reasonText(outcome, me, names);
  const status = rematchStatusText(names.opponent, mineWants, theirsWants, away);

  // Recolhido, o foco vai para a faixa (o diálogo fechado devolveria o foco a quem estava na página antes, que pode já
  // nem existir). Na abertura da partida o painel nasce aberto, então este efeito não roda.
  useEffect(() => {
    if (collapsed) showRef.current?.focus();
  }, [collapsed]);

  return (
    <>
      <Modal
        open={!collapsed}
        onClose={() => setCollapsed(true)}
        labelledBy={titleId}
        describedBy={reasonId}
        className="w-full tablet:w-[min(92vw,30rem)] max-tablet:mb-0 max-tablet:max-w-none max-tablet:border-x-0 max-tablet:border-b-0"
      >
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.12em]">{END_EYEBROW}</p>
            <h2 id={titleId} className="textura font-madeira text-4xl uppercase leading-tight">
              {title}
            </h2>
            <p id={reasonId} className="font-bold">
              {reason}
            </p>
          </div>

          <p className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{SCORE_LABEL}</span>
            <span data-numero className="font-texto tabular-nums">
              {scoreText(score, me, names)}
            </span>
          </p>

          {note}

          <div className="flex flex-col gap-2">
            <Button
              aria-pressed={mineWants}
              disabled={disabled}
              variant={mineWants ? 'secondary' : 'primary'}
              className="flex w-full items-center justify-center gap-2"
              onClick={() => onRematch(!mineWants)}
            >
              {mineWants ? <CheckIcon /> : null}
              {REMATCH_LABEL}
            </Button>
            <p role="status" className="min-h-6 text-center font-bold">
              {status}
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" className="flex-1" onClick={() => setCollapsed(true)}>
              {VIEW_TABLE_LABEL}
            </Button>
            {onReview ? (
              <Button variant="secondary" className="flex-1" onClick={onReview}>
                {REVIEW_GAME_LABEL}
              </Button>
            ) : null}
            {onNewRoom ? (
              <Button variant="secondary" className="flex-1" onClick={onNewRoom}>
                {newRoomLabel}
              </Button>
            ) : null}
          </div>
        </div>
      </Modal>

      {collapsed ? (
        <section
          aria-label={END_RESULT_LABEL}
          className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-4 border-ouro bg-tinta px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-papel"
        >
          <div className="min-w-0 flex-1">
            <p className="textura font-madeira text-xl uppercase leading-tight">{title}</p>
            <p role="status" className="text-sm font-bold text-ouro">
              {status}
            </p>
          </div>
          <button
            ref={showRef}
            type="button"
            onClick={() => setCollapsed(false)}
            className="min-h-11 border-2 border-papel bg-transparent px-4 py-1.5 font-bold text-papel"
          >
            {SHOW_RESULT_LABEL}
          </button>
        </section>
      ) : null}
    </>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="4">
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  );
}
