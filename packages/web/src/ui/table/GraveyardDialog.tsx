// O cemitério num `<dialog>` nativo (spec §3.4 e §7): com o foco preso dentro e devolvido a quem abriu, ao fechar.
// Dois modos. `view` (o botão do cemitério na faixa central): todas as cartas, só para ver, a de cima primeiro.
// `resurrect` (o botão Ressuscitar da barra): só as numéricas que a lista legal oferece, depois a fileira, e só as
// que têm vaga. A mesa manda a jogada; o diálogo só escolhe.
//
// O diálogo fica sempre montado e `showModal()`/`close()` seguem o `mode`: o navegador cuida do foco preso e de
// devolver o foco. O Esc também é tratado aqui (`preventDefault` + `onClose`), para valer igual onde o diálogo nativo
// não fecha sozinho, e marca o evento como tratado para o Esc da escolha da mão não agir junto.
import type { Card as EngineCard, RowName } from '@coringa/engine';
import { useEffect, useId, useRef, useState, type KeyboardEvent } from 'react';
import {
  BACK_LABEL,
  CLOSE_LABEL,
  GRAVEYARD_EMPTY_TEXT,
  GRAVEYARD_TITLE,
  graveyardListText,
  NO_RESURRECT_TEXT,
  RESURRECT_PICK_TEXT,
  RESURRECT_TITLE,
  resurrectRowDetail,
  resurrectRowText,
  ROW_NAME,
} from '../../model/copy.ts';
import type { TablePlays } from '../../model/plays.ts';
import { Card } from '../cards/Card.tsx';

export type GraveyardMode = 'view' | 'resurrect';

export interface GraveyardDialogProps {
  /** `null`: fechado. */
  mode: GraveyardMode | null;
  /** O cemitério inteiro, a carta de cima por último (como na `view`). */
  graveyard: readonly EngineCard[];
  /** O que a lista legal oferece para ressuscitar, um item por valor, com as fileiras que têm vaga. */
  options: TablePlays['resurrect'];
  /** Quantas cartas há em cada fileira sua e o limite, para dizer "3 de 7". */
  rowCounts: Record<RowName, number>;
  rowLimit: number;
  onPick: (cardId: string, row: RowName) => void;
  /** O diálogo fechou (Esc, Fechar ou o próprio navegador). */
  onClose: () => void;
}

const BUTTON = 'min-h-11 border-2 border-tinta bg-papel px-4 py-1.5 text-left font-bold text-tinta';

export function GraveyardDialog({ mode, graveyard, options, rowCounts, rowLimit, onPick, onClose }: GraveyardDialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  /** O item escolhido no passo da carta, à espera da fileira. */
  const [picked, setPicked] = useState<string | null>(null);

  // `showModal()` leva o foco ao primeiro botão de dentro; trocar de passo leva ao primeiro do passo novo.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (mode === null) {
      if (el.open) el.close();
    } else if (!el.open) {
      el.showModal();
    } else {
      el.querySelector<HTMLElement>('[data-step] button')?.focus();
    }
  }, [mode, picked]);

  // Desmontar com o diálogo aberto o fecha, para o navegador devolver o foco e soltar o fundo.
  useEffect(
    () => () => {
      if (ref.current?.open) ref.current.close();
    },
    [],
  );

  const close = () => {
    setPicked(null);
    onClose();
  };

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    event.preventDefault();
    close();
  };

  const item = options.find((option) => option.cardId === picked) ?? null;
  const pickedCard = item ? (graveyard.find((card) => card.id === item.cardId) ?? null) : null;

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={close}
      onKeyDown={onKeyDown}
      className="m-auto max-h-[85dvh] w-[min(92vw,34rem)] overflow-y-auto border-4 border-tinta bg-papel p-5 text-tinta backdrop:bg-tinta/70"
    >
      {mode === null ? null : (
        <div className="flex flex-col gap-4">
          <h2 id={titleId} className="textura font-madeira text-2xl uppercase leading-tight">
            {mode === 'view' ? GRAVEYARD_TITLE : RESURRECT_TITLE}
          </h2>

          {mode === 'view' ? (
            <ViewBody graveyard={graveyard} />
          ) : item && pickedCard ? (
            <div data-step className="flex flex-col gap-3">
              <p>{resurrectRowText(pickedCard)}</p>
              <ul role="list" aria-label="Fileiras" className="flex list-none flex-wrap gap-2 p-1.5">
                {item.rows.map((row) => (
                  <li key={row}>
                    <RowButton
                      row={row}
                      count={rowCounts[row]}
                      limit={rowLimit}
                      onClick={() => {
                        setPicked(null);
                        onPick(item.cardId, row);
                      }}
                    />
                  </li>
                ))}
              </ul>
              <button type="button" onClick={() => setPicked(null)} className={`${BUTTON} self-start`}>
                {BACK_LABEL}
              </button>
            </div>
          ) : (
            <div data-step className="flex flex-col gap-3">
              {options.length === 0 ? (
                <p>{NO_RESURRECT_TEXT}</p>
              ) : (
                <>
                  <p>{RESURRECT_PICK_TEXT}</p>
                  <ul
                    role="list"
                    aria-label="Cartas que podem voltar"
                    className="flex list-none flex-wrap gap-2.5 p-1.5 [--mini-h:67px] [--mini-w:48px]"
                  >
                    {options.map((option) => {
                      const card = graveyard.find((c) => c.id === option.cardId);
                      return card ? (
                        <li key={option.cardId}>
                          <Card card={card} size="mini" animated={false} onSelect={() => setPicked(option.cardId)} />
                        </li>
                      ) : null;
                    })}
                  </ul>
                </>
              )}
            </div>
          )}

          <button type="button" onClick={close} className={`${BUTTON} self-end`}>
            {CLOSE_LABEL}
          </button>
        </div>
      )}
    </dialog>
  );
}

/** Todas as cartas, só para ver: a de cima primeiro. */
function ViewBody({ graveyard }: { graveyard: readonly EngineCard[] }) {
  if (graveyard.length === 0) return <p>{GRAVEYARD_EMPTY_TEXT}</p>;
  const topFirst = [...graveyard].reverse();
  return (
    <>
      <p>{graveyardListText(graveyard.length)}</p>
      <ul role="list" aria-label="Cartas do cemitério" className="flex max-h-[50dvh] list-none flex-wrap gap-2.5 overflow-y-auto p-1.5 [--mini-h:67px] [--mini-w:48px]">
        {topFirst.map((card) => (
          <li key={card.id}>
            <Card card={card} size="mini" animated={false} />
          </li>
        ))}
      </ul>
    </>
  );
}

function RowButton({ row, count, limit, onClick }: { row: RowName; count: number; limit: number; onClick: () => void }) {
  const titleId = useId();
  const detailId = useId();
  return (
    <button type="button" aria-labelledby={titleId} aria-describedby={detailId} onClick={onClick} className={`${BUTTON} flex flex-col items-start`}>
      <span id={titleId}>{ROW_NAME[row]}</span>
      <span id={detailId} className="text-xs font-normal tabular-nums">
        {resurrectRowDetail(count, limit)}
      </span>
    </button>
  );
}
