// O painel do Equipar carta a carta (spec §3.5), no lugar da barra de ação. As numéricas pendentes viram uma fila ("Carta 1 de
// 3"): a carta da vez aparece grande, com os destinos que a lista legal permite (`nextDestinations`, o mesmo filtro do
// terminal), nos rótulos do terminal e, na troca, com a carta que sai ("sai 9♠"). A escolha vai para a fileira como
// rascunho (quem desenha é a `Table`, com `draftBoard`), e o painel diz a quadra que o rascunho forma. Desfazer volta um
// passo, Recomeçar volta ao início, e Confirmar só aparece com todas as cartas posicionadas.
//
// Nenhuma regra mora aqui: o rascunho e a regra de estouro são da sessão (`equipChoose`, `equipConfirm`) e do modelo
// (`equip.ts`). O painel é só vista: as jogadas chegam por props.
//
// Arrastar (fatia 5): a carta da vez também se arrasta até a zona do destino (`data-soltar` na fileira, na última carta dela ou no
// cemitério, as chaves de `equipDropZones`). A soltura escolhe o destino pelo mesmo `onChoose` dos botões, que seguem como sempre.
import type { Destination, NumCard, PlayerView } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { DESTINATION_TEXT } from '@coringa/sim/text';
import { useEffect, useRef, type ReactNode, type RefObject } from 'react';
import {
  CONFIRM_LABEL,
  equipCardText,
  equipConfirmedText,
  EQUIP_READY_TEXT,
  equipQuadText,
  equipWaitingText,
  leavingText,
  NO_PENDING_TEXT,
  placedText,
  RESET_LABEL,
  SENDING_TEXT,
  UNDO_LABEL,
} from '../../model/copy.ts';
import { equipDropZones, type DropKey } from '../../model/drag.ts';
import { draftBoard, nextDestinations, remainingCards, type EquipPick } from '../../model/equip.ts';
import type { Notice, SessionSnapshot } from '../../model/session.ts';
import { Card } from '../cards/Card.tsx';
import { NoticeLine, PRIMARY, PRIMARY_TITLE, SECONDARY, TwoLine } from './controls.tsx';
import { DragGhost } from './DragGhost.tsx';
import type { TableNames } from './labels.ts';
import { useCardDrag } from './useCardDrag.ts';

export interface EquipPanelProps {
  view: PlayerView;
  names: TableNames;
  legal: PlayerAction[];
  /** As escolhas feitas (carta e destino), na ordem em que entram (`snapshot.equipDraft`). */
  draft: EquipPick[];
  confirmed: SessionSnapshot['equipConfirmed'];
  /** Uma jogada em voo: o painel diz "Enviando…". */
  pending: boolean;
  /** O aviso de uma jogada recusada (devagar, regra do motor). */
  notice: Notice | null;
  /** Controles desligados: jogada em voo, reconexão ou prazo esgotado. */
  disabled: boolean;
  onChoose: (destination: Destination) => void;
  onUndo: () => void;
  onReset: () => void;
  onConfirm: () => void;
  /** O próprio painel, para a mesa levar o foco a ele quando a rodada abre. */
  panelRef: RefObject<HTMLElement | null>;
}

/** O rótulo do terminal para o destino e, na troca, a carta que sai: a última da fileira do rascunho até aqui. */
function destinationLabel(view: PlayerView, chosen: EquipPick[], destination: Destination): string {
  const board = draftBoard(view, chosen);
  const leaving =
    destination === 'REPLACE_LAST_ATK'
      ? board.attackRow.at(-1)
      : destination === 'REPLACE_LAST_DEF'
        ? board.defenseRow.at(-1)
        : undefined;
  return `${DESTINATION_TEXT[destination]}${leaving ? leavingText(leaving) : ''}`;
}

export function EquipPanel(props: EquipPanelProps) {
  const { view, names, confirmed, panelRef } = props;
  const opponent = names.opponent;
  const total = view.self.pending.length;

  // Sem numéricas o servidor envia o Equipar por você: não há o que montar (spec §3.5).
  if (total === 0) {
    return (
      <Panel panelRef={panelRef}>
        <p role="status" className="text-sm font-bold leading-snug">
          {NO_PENDING_TEXT}
        </p>
        {view.opponent.equipSubmitted ? null : <p className="text-sm leading-snug">{equipWaitingText(opponent)}</p>}
      </Panel>
    );
  }
  if (confirmed === 'earlier') {
    return (
      <Panel panelRef={panelRef}>
        <p role="status" className="text-sm font-bold leading-snug">
          {equipConfirmedText(opponent)}
        </p>
      </Panel>
    );
  }
  if (confirmed === 'thisPage') {
    return (
      <Panel panelRef={panelRef}>
        <p role="status" className="text-sm font-bold leading-snug">
          {props.pending ? SENDING_TEXT : equipWaitingText(opponent)}
        </p>
      </Panel>
    );
  }
  return <Choosing {...props} total={total} />;
}

function Panel({ panelRef, children }: { panelRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  return (
    <section ref={panelRef} data-painel tabIndex={-1} aria-label="Equipar" className="flex flex-col gap-2 text-papel">
      {children}
    </section>
  );
}

const noop = (): void => undefined;

/** A carta da vez, grande: arrastável até o destino, sem efeito no toque (os destinos ao lado são os botões). */
function EquipCard({
  card,
  enabled,
  zones,
  onDrop,
}: {
  card: NumCard;
  enabled: boolean;
  zones: () => ReadonlySet<DropKey>;
  onDrop: (key: DropKey | null) => void;
}) {
  const { bind, dragging, ghost } = useCardDrag({ enabled, zones, onDrop, onTap: noop });
  return (
    <>
      {/* No ar, a de origem esmaece (esta carta não é animada, então o Motion não põe `opacity` inline nela). */}
      <Card card={card} size="hand" animated={false} dragRef={bind} grabbable={enabled} className={dragging ? 'opacity-40' : ''} />
      <DragGhost ghost={ghost} />
    </>
  );
}

function Choosing({ view, legal, draft, pending, notice, disabled, onChoose, onUndo, onReset, onConfirm, panelRef, total }: EquipPanelProps & { total: number }) {
  const cards = view.self.pending;
  const current = remainingCards(view, draft)[0];
  const index = draft.length;
  const complete = index >= total;
  const board = draftBoard(view, draft);
  const options = complete ? [] : nextDestinations(view, legal, draft);
  /** As zonas do destino da próxima carta, na hora (a soltura confere de novo com a lista de agora). */
  const dropZones = () => new Set(equipDropZones(view, legal, draft).keys());
  const dropCard = (key: DropKey | null) => {
    const destination = key === null ? undefined : equipDropZones(view, legal, draft).get(key);
    if (destination !== undefined) onChoose(destination);
  };

  // Depois de cada escolha (ou de desfazer) o foco vai ao primeiro passo útil: o primeiro destino, ou o Confirmar.
  const lastLength = useRef(index);
  useEffect(() => {
    if (lastLength.current === index) return;
    lastLength.current = index;
    panelRef.current?.querySelector<HTMLElement>('[data-foco]:not(:disabled)')?.focus();
  }, [index, panelRef]);

  return (
    <Panel panelRef={panelRef}>
      {/* O cabeçalho leva o Desfazer e o Recomeçar: a altura do painel é curta no celular, e a mesa rola por cima dele. */}
      <div className="flex items-center justify-between gap-2">
        <p data-numero className="font-texto text-base font-extrabold leading-tight tabular-nums">
          {complete ? EQUIP_READY_TEXT : equipCardText(index + 1, total)}
        </p>
        <div className="flex flex-none gap-2">
          <button type="button" disabled={disabled || draft.length === 0} onClick={onUndo} className={SECONDARY}>
            {UNDO_LABEL}
          </button>
          <button type="button" disabled={disabled || draft.length === 0} onClick={onReset} className={SECONDARY}>
            {RESET_LABEL}
          </button>
        </div>
      </div>

      {complete ? (
        <ol role="list" aria-label="Sua montagem" data-step="resumo" className="flex list-none flex-col gap-1 p-0 text-sm">
          {draft.map((pick, i) => (
            <li key={pick.cardId} data-numero className="font-texto tabular-nums">
              {placedText(cards.find((c) => c.id === pick.cardId)!, destinationLabel(view, draft.slice(0, i), pick.destination))}
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex items-start gap-3">
          <EquipCard key={current!.id} card={current!} enabled={!disabled && options.length > 0} zones={dropZones} onDrop={dropCard} />
          <ul role="list" aria-label="Destinos" data-step="destinos" className="flex min-w-0 flex-1 list-none flex-col gap-2 p-1.5">
            {options.map((destination, i) => (
              <li key={destination}>
                <button
                  type="button"
                  data-foco={i === 0 ? '' : undefined}
                  disabled={disabled}
                  onClick={() => onChoose(destination)}
                  className={`${SECONDARY} w-full`}
                >
                  {destinationLabel(view, draft, destination)}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Região viva fixa: o efeito da escolha na quadra é lido quando muda. */}
      <div aria-live="polite" className="text-sm font-bold leading-snug text-ouro">
        {board.newQuads.map((quad) => (
          <p key={`${quad.row}:${quad.value}`} data-numero data-quadra-nova className="font-texto tabular-nums">
            {equipQuadText(quad.value)}
          </p>
        ))}
      </div>

      {pending ? (
        <p role="status" className="text-sm font-bold leading-snug">
          {SENDING_TEXT}
        </p>
      ) : (
        <NoticeLine notice={notice} />
      )}

      {complete ? (
        <TwoLine
          title={CONFIRM_LABEL}
          titleClass={PRIMARY_TITLE}
          data-foco=""
          disabled={disabled}
          onClick={onConfirm}
          className={`${PRIMARY} w-full pc:w-auto pc:min-w-[220px]`}
        />
      ) : null}
    </Panel>
  );
}
