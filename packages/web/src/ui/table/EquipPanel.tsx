// O painel do Equipar (spec §3.5), no lugar da barra de ação. Desde a E2 do sub-projeto 5 (Equipar livre), todas as numéricas
// recebidas aparecem juntas ("Faltam 3 cartas"), e o jogador as põe em qualquer ordem: toca numa carta (a escolhida sobe, como na
// mão; sem toque, é a primeira que falta, na ordem de compra) e depois no destino. Os destinos são os que a lista legal permite
// (`nextDestinations`, o mesmo filtro do terminal), nos rótulos do terminal e, na troca, com a carta que sai ("sai 9♠"); eles só
// dependem de quantas cartas cada fileira tem, então valem para qualquer carta. A escolha vai para a fileira como rascunho
// (quem desenha é a `Table`, com `draftBoard`), e o painel diz a quadra que o rascunho forma. Desfazer volta um passo,
// Recomeçar volta ao início, e Confirmar só aparece com todas as cartas posicionadas.
//
// Nenhuma regra mora aqui: o rascunho e a regra de estouro são da sessão (`equipChoose`, `equipConfirm`) e do modelo
// (`equip.ts`). O painel é só vista: as jogadas chegam por props.
//
// Arrastar (fatia 5): qualquer numérica que falta também se arrasta até a zona do destino (`data-soltar` na fileira, na última carta
// dela ou no cemitério, as chaves de `equipDropZones`). A soltura escolhe aquela carta e aquele destino pelo mesmo `onChoose` dos
// botões, que seguem como sempre.
import type { Destination, NumCard, PlayerView } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { DESTINATION_TEXT } from '@coringa/sim/text';
import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import {
  CONFIRM_LABEL,
  equipConfirmedText,
  equipLeftText,
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
  /** Põe a carta no destino (sem carta, a primeira que falta). */
  onChoose: (destination: Destination, cardId?: string) => void;
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
  return <Choosing {...props} />;
}

function Panel({ panelRef, children }: { panelRef: RefObject<HTMLElement | null>; children: ReactNode }) {
  return (
    <section ref={panelRef} data-painel tabIndex={-1} aria-label="Equipar" className="flex flex-col gap-2 text-papel">
      {children}
    </section>
  );
}

/** Uma numérica que falta pôr: o toque a escolhe (a escolhida sobe), e o arrasto a leva direto até a zona do destino. */
function PendingCard({
  card,
  selected,
  enabled,
  zones,
  onSelect,
  onDrop,
}: {
  card: NumCard;
  selected: boolean;
  enabled: boolean;
  zones: () => ReadonlySet<DropKey>;
  onSelect: () => void;
  onDrop: (key: DropKey | null) => void;
}) {
  const { bind, dragging, ghost } = useCardDrag({ enabled, zones, onDrop, onTap: onSelect });
  return (
    <li className="relative flex-none">
      {/* No ar, a de origem esmaece (esta carta não é animada, então o Motion não põe `opacity` inline nela). */}
      <Card
        card={card}
        size="hand"
        animated={false}
        selected={selected}
        onSelect={onSelect}
        dragRef={bind}
        grabbable={enabled}
        className={dragging ? 'opacity-40' : ''}
      />
      <DragGhost ghost={ghost} />
    </li>
  );
}

function Choosing({ view, legal, draft, pending, notice, disabled, onChoose, onUndo, onReset, onConfirm, panelRef }: EquipPanelProps) {
  const cards = view.self.pending;
  const remaining = remainingCards(view, draft);
  const complete = remaining.length === 0;
  // A carta escolhida pelo toque; sem toque (ou se ela já foi posta), a primeira que falta, na ordem de compra.
  const [pickedId, setPickedId] = useState<string | null>(null);
  const selected = remaining.find((card) => card.id === pickedId) ?? remaining[0];
  const board = draftBoard(view, draft);
  const options = complete ? [] : nextDestinations(view, legal, draft);
  const focusFirstStep = () => panelRef.current?.querySelector<HTMLElement>('[data-foco]:not(:disabled)')?.focus();
  /** As zonas do destino da próxima carta, na hora (a soltura confere de novo com a lista de agora). */
  const dropZones = () => new Set(equipDropZones(view, legal, draft).keys());
  const dropCard = (cardId: string) => (key: DropKey | null) => {
    const destination = key === null ? undefined : equipDropZones(view, legal, draft).get(key);
    if (destination !== undefined) onChoose(destination, cardId);
  };
  /** O toque na carta a escolhe e leva o foco ao primeiro destino, o passo seguinte. */
  const select = (cardId: string) => {
    if (disabled) return;
    setPickedId(cardId);
    focusFirstStep();
  };

  // Depois de cada escolha (ou de desfazer) o foco vai ao primeiro passo útil: o primeiro destino, ou o Confirmar.
  const lastLength = useRef(draft.length);
  useEffect(() => {
    if (lastLength.current === draft.length) return;
    lastLength.current = draft.length;
    panelRef.current?.querySelector<HTMLElement>('[data-foco]:not(:disabled)')?.focus();
  }, [draft.length, panelRef]);

  return (
    <Panel panelRef={panelRef}>
      {/* O cabeçalho leva o Desfazer e o Recomeçar: a altura do painel é curta no celular, e a mesa rola por cima dele. */}
      <div className="flex items-center justify-between gap-2">
        <p data-numero className="font-texto text-base font-extrabold leading-tight tabular-nums">
          {complete ? EQUIP_READY_TEXT : equipLeftText(remaining.length)}
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
        // No celular, as cartas em cima e os destinos embaixo, lado a lado; no PC, os destinos em coluna ao lado das cartas.
        <div className="flex flex-col gap-2 pc:flex-row pc:items-start pc:gap-3">
          {/* O espaço de cima é o da carta escolhida, que sobe como na mão. */}
          <ul role="list" aria-label="Suas numéricas" data-step="cartas" className="flex flex-none list-none flex-wrap gap-2 p-0 pt-3.5">
            {remaining.map((card) => (
              <PendingCard
                key={card.id}
                card={card}
                selected={card.id === selected?.id}
                enabled={!disabled && options.length > 0}
                zones={dropZones}
                onSelect={() => select(card.id)}
                onDrop={dropCard(card.id)}
              />
            ))}
          </ul>
          <ul
            role="list"
            aria-label="Destinos"
            data-step="destinos"
            className="flex min-w-0 flex-1 list-none flex-wrap gap-2 p-1.5 pc:flex-col pc:flex-nowrap"
          >
            {options.map((destination, i) => (
              // No celular, no máximo dois por linha (com as fileiras cheias, o terceiro destino desce e ocupa a linha toda).
              <li key={destination} className="min-w-[calc(50%-0.25rem)] flex-1 pc:min-w-0 pc:flex-none">
                <button
                  type="button"
                  data-foco={i === 0 ? '' : undefined}
                  disabled={disabled}
                  onClick={() => onChoose(destination, selected?.id)}
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
