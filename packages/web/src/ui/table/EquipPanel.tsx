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
  DESTINATION_SHORT,
  equipConfirmedText,
  equipLeftText,
  EQUIP_READY_TEXT,
  equipQuadText,
  equipWaitingText,
  leavingShort,
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
import { useAnim } from '../anim/context.ts';
import { useDealIn } from '../anim/useDealIn.ts';
import { Card } from '../cards/Card.tsx';
import { NoticeLine, PRIMARY, PRIMARY_TITLE, ResetIcon, Seal, TwoLine, UndoIcon } from './controls.tsx';
import { DragGhost } from './DragGhost.tsx';
import { AttackIcon, DefenseIcon, DiscardIcon, SwapIcon } from './icons.tsx';
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

/** A figura do destino (decisoes.md 2026-11-01 (1) e 2026-11-23 (1)): a fileira; na troca, a fileira com o disco da troca; o descarte, a lápide. */
function DestinationIcon({ destination }: { destination: Destination }) {
  const figure = 'size-6 pc:size-7';
  if (destination === 'DISCARD') return <DiscardIcon className={figure} />;
  const row = destination === 'ATK' || destination === 'REPLACE_LAST_ATK' ? <AttackIcon className={figure} /> : <DefenseIcon className={figure} />;
  if (destination === 'ATK' || destination === 'DEF') return row;
  return (
    <span className="relative">
      {row}
      <SwapIcon className="absolute -bottom-1 -right-2 size-3.5 pc:size-4" />
    </span>
  );
}

/** A carta que sai na troca: a última da fileira do rascunho até aqui. */
function leavingCard(view: PlayerView, chosen: EquipPick[], destination: Destination): NumCard | undefined {
  if (destination !== 'REPLACE_LAST_ATK' && destination !== 'REPLACE_LAST_DEF') return undefined;
  const board = draftBoard(view, chosen);
  return (destination === 'REPLACE_LAST_ATK' ? board.attackRow : board.defenseRow).at(-1);
}

/**
 * Um destino do Equipar (decisoes.md 2026-11-23 (1)): um carimbo de tamanho fixo, a figura e uma palavra (na troca, a carta que sai). O
 * tamanho não depende de quantas cartas faltam: no PC, a lista das cartas é que quebra linha. O nome inteiro de hoje (o do terminal, com a
 * carta que sai) fica no `aria-label` e na dica.
 */
function DestinationStamp({
  view,
  draft,
  destination,
  first,
  disabled,
  onClick,
}: {
  view: PlayerView;
  draft: EquipPick[];
  destination: Destination;
  first: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  const label = destinationLabel(view, draft, destination);
  const leaving = leavingCard(view, draft, destination);
  return (
    <button
      type="button"
      data-foco={first ? '' : undefined}
      data-destino={destination}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="carimbo carimbo-papel carimbo-destino disabled:cursor-wait disabled:opacity-60"
    >
      <DestinationIcon destination={destination} />
      <span aria-hidden="true" data-numero={leaving ? '' : undefined} className={leaving ? 'font-texto tabular-nums normal-case tracking-normal' : undefined}>
        {leaving ? leavingShort(leaving) : DESTINATION_SHORT[destination]}
      </span>
    </button>
  );
}

/** O rótulo do terminal para o destino e, na troca, a carta que sai: a última da fileira do rascunho até aqui. */
function destinationLabel(view: PlayerView, chosen: EquipPick[], destination: Destination): string {
  const leaving = leavingCard(view, chosen, destination);
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
  index,
  count,
  selected,
  enabled,
  locked,
  zones,
  onSelect,
  onDrop,
}: {
  card: NumCard;
  /** A posição e quantas faltam: sem largura, as cartas se sobrepõem como as da mão (o valor, no canto esquerdo, segue à vista). */
  index: number;
  count: number;
  selected: boolean;
  enabled: boolean;
  /** Mesa travada (jogada em voo, reconexão, prazo esgotado): a carta apaga como a da mão, e o toque não a escolhe. */
  locked: boolean;
  zones: () => ReadonlySet<DropKey>;
  onSelect: () => void;
  onDrop: (key: DropKey | null) => void;
}) {
  const { bind, dragging, ghost } = useCardDrag({ enabled, zones, onDrop, onTap: onSelect });
  // A compra chega em leque do monte (sub-projeto 6 §8): esta carta não é do Motion, então o item esmaece e voa pela Web Animations. Com
  // movimento reduzido (ou no `catchUp`), só esmaece, no tempo da batida.
  const anim = useAnim();
  const flight = anim.dealAt(card.id);
  const enter = anim.enterDelay(card.id);
  const item = useRef<HTMLLIElement>(null);
  useDealIn(item, flight ?? enter, { fly: flight !== null, fade: true });
  return (
    <li
      ref={item}
      data-entra={enter === null ? undefined : String(enter)}
      // A escolhida fica por cima das vizinhas que a cobririam.
      className={`relative flex-none ${selected ? 'z-[1]' : ''}`}
      style={
        index > 0
          ? { marginLeft: `clamp(calc(var(--hand-w) * -0.6), calc((100% - ${count} * var(--hand-w)) / ${count - 1}), 8px)` }
          : undefined
      }
    >
      {/* No ar, a de origem esmaece (esta carta não é animada, então o Motion não põe `opacity` inline nela). */}
      <Card
        card={card}
        size="hand"
        animated={false}
        selected={selected}
        disabled={locked}
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
          <Seal label={UNDO_LABEL} icon={<UndoIcon />} disabled={disabled || draft.length === 0} onClick={onUndo} />
          <Seal label={RESET_LABEL} icon={<ResetIcon />} disabled={disabled || draft.length === 0} onClick={onReset} />
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
        // Os destinos são carimbos de tamanho fixo (decisoes.md 2026-11-23 (1)): nunca encolhem. As cartas ficam com o espaço que sobra e
        // se sobrepõem como as da mão quando falta largura. Os carimbos ficam ao lado das cartas quando cabem e descem para a linha de
        // baixo quando não (no celular com 3 destinos; no PC só com 5 cartas e 3 destinos).
        <div className="flex flex-wrap items-start gap-x-3 gap-y-2">
          {/* O espaço de cima é o da carta escolhida, que sobe como na mão. */}
          <ul role="list" aria-label="Suas numéricas" data-step="cartas" className="flex min-w-0 flex-auto list-none p-0 pt-3.5">
            {remaining.map((card, index) => (
              <PendingCard
                key={card.id}
                index={index}
                count={remaining.length}
                card={card}
                selected={card.id === selected?.id}
                enabled={!disabled && options.length > 0}
                locked={disabled}
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
            className="flex flex-none list-none gap-2 p-0 pt-3.5"
          >
            {options.map((destination, i) => (
              <li key={destination} className="flex-none">
                <DestinationStamp
                  view={view}
                  draft={draft}
                  destination={destination}
                  first={i === 0}
                  disabled={disabled}
                  onClick={() => onChoose(destination, selected?.id)}
                />
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
