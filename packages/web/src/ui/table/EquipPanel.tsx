// O painel do Equipar (spec §3.5), no lugar da barra de ação. Desde a E2 do sub-projeto 5 (Equipar livre), todas as numéricas
// recebidas aparecem juntas ("Faltam 3 cartas"), e o jogador as põe em qualquer ordem: toca numa carta (a escolhida sobe, como na
// mão; sem toque, é a primeira que falta, na ordem de compra) e depois no destino. Os destinos são os que a lista legal permite
// (`nextDestinations`, o mesmo filtro do terminal), nos rótulos do terminal e, na troca, com a carta que sai ("sai 9♠"); eles só
// dependem de quantas cartas cada fileira tem, então valem para qualquer carta. A escolha vai para a fileira como rascunho
// (quem desenha é a `Table`, com `draftBoard`), e o painel diz a quadra que o rascunho forma. Desfazer volta um passo,
// Recomeçar volta ao início, e Confirmar só aparece com todas as cartas posicionadas.
//
// Sem texto à vista (decisoes.md 2026-11-25 (3) a (6); spec 2026-11-25-equipar-abertura-niveis §3): os botões são figuras (o nome no
// `aria-label`), o que era texto é arte (`EquipArt.tsx`) e o texto segue para o leitor de tela (`sr-only`). No celular, sempre duas linhas
// (as cartas em cima, os botões embaixo). No PC, uma: as cartas à esquerda e os botões presos à direita, centrados na vertical, numa vaga de
// largura fixa (os destinos centrados nela, ou o Confirmar do tamanho do Atacar): nada anda quando as cartas saem (decisoes.md 2026-11-26 (7),
// pontos 1 e 2; substitui a linha centrada da Y).
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
  equipWaitingText,
  leavingText,
  placedText,
  RESET_LABEL,
  UNDO_LABEL,
} from '../../model/copy.ts';
import { equipDropZones, type DropKey } from '../../model/drag.ts';
import { draftBoard, nextDestinations, remainingCards, type EquipPick } from '../../model/equip.ts';
import type { Notice, SessionSnapshot } from '../../model/session.ts';
import { useAnim } from '../anim/context.ts';
import { useDealIn } from '../anim/useDealIn.ts';
import { Card } from '../cards/Card.tsx';
import { MAIN_ICON, MainButton, ResetIcon, Seal, UndoIcon } from './controls.tsx';
import { DragGhost } from './DragGhost.tsx';
import { ConfirmedArt, MiniCard, NoCardsArt, QuadBadge, RejectedNotice, SendingDots } from './EquipArt.tsx';
import { SELECTED_FRONT } from './Hand.tsx';
import { AttackIcon, ConfirmIcon, DefenseIcon, DiscardIcon, SwapIcon } from './icons.tsx';
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
  const figure = 'size-8 pc:size-9';
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
 * Um destino do Equipar (decisoes.md 2026-11-23 (1) e 2026-11-25 (4)): um carimbo quadrado de tamanho fixo, só com a figura (na troca, a carta
 * que sai, pequena, no canto). O nome inteiro (o do terminal, com a carta que sai) fica no `aria-label` e na dica.
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
      {leaving ? <MiniCard card={leaving} /> : null}
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
        <NoCardsArt waiting={!view.opponent.equipSubmitted} waitingText={equipWaitingText(opponent)} />
      </Panel>
    );
  }
  if (confirmed === 'earlier') {
    return (
      <Panel panelRef={panelRef}>
        <ConfirmedArt text={equipConfirmedText(opponent)} sending={false} />
      </Panel>
    );
  }
  if (confirmed === 'thisPage') {
    return (
      <Panel panelRef={panelRef}>
        <ConfirmedArt text={equipWaitingText(opponent)} sending={props.pending} />
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
      // Sem espaço, a escolhida sobe e fica na frente das vizinhas, inteira à vista (decisoes.md 2026-11-26 (7), ponto 5; substitui "só sobe",
      // de 2026-11-25 (2)). O `SELECTED_FRONT` é o mesmo da mão de especiais.
      className={`relative flex-none ${selected ? SELECTED_FRONT : ''}`}
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

  const width = `calc(${remaining.length} * var(--hand-w) + ${Math.max(0, remaining.length - 1)} * 8px)`;
  const rejected = notice !== null && (notice.kind === 'rate' || notice.kind === 'rule') ? notice.text : null;

  return (
    <Panel panelRef={panelRef}>
      {/* Para o leitor de tela: quantas faltam e, com tudo posto, a montagem (à vista, as cartas já estão nas fileiras como rascunho). */}
      <p aria-live="polite" className="sr-only">
        {complete ? EQUIP_READY_TEXT : equipLeftText(remaining.length)}
      </p>
      {complete ? (
        <ol role="list" aria-label="Sua montagem" data-step="resumo" className="sr-only">
          {draft.map((pick, i) => (
            <li key={pick.cardId}>
              {placedText(cards.find((c) => c.id === pick.cardId)!, destinationLabel(view, draft.slice(0, i), pick.destination))}
            </li>
          ))}
        </ol>
      ) : null}

      <div data-disposicao className="relative flex flex-col items-center gap-3 pc:flex-row pc:gap-5">
        {complete ? null : (
          // A largura natural das cartas (sem vão), até o painel inteiro; elas só se sobrepõem quando não cabem. O espaço de cima é o da carta
          // escolhida, que sobe como na mão.
          <ul
            role="list"
            aria-label="Suas numéricas"
            data-step="cartas"
            className="flex min-w-0 max-w-full flex-[0_1_auto] list-none justify-center p-0 pt-3.5"
            style={{ width }}
          >
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
        )}
        {/* No celular, com o Confirmar, a linha toma a largura (o Confirmar se estica entre os selos, como o Atacar). */}
        <div
          data-botoes-principais
          className={`flex flex-none items-center justify-center pc:ml-auto pc:w-auto pc:gap-4 ${complete ? 'w-full gap-1.5' : 'gap-4'}`}
        >
          <Seal label={UNDO_LABEL} icon={<UndoIcon />} disabled={disabled || draft.length === 0} onClick={onUndo} />
          {complete ? (
            <MainButton
              tone="ouro"
              icon={<ConfirmIcon className={MAIN_ICON} />}
              label={CONFIRM_LABEL}
              data-foco=""
              disabled={disabled}
              onClick={onConfirm}
              className="flex-1 pc:w-[300px] pc:flex-none"
            />
          ) : (
            <ul
              role="list"
              aria-label="Destinos"
              data-step="destinos"
              className="flex flex-none list-none items-center justify-center gap-3 p-0 pc:w-[300px]"
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
          )}
          <Seal label={RESET_LABEL} icon={<ResetIcon />} disabled={disabled || draft.length === 0} onClick={onReset} />
        </div>

        {/* O que flutua, sem empurrar nada: a quadra que o rascunho forma (região viva), acima do painel, fora das cartas (no canto dele, a
            360 px, tapava o índice da carta da direita); no PC, à esquerda das cartas, no vão entre a mão e o painel (à direita, cobria o histórico). E o envio ou a recusa. */}
        <div aria-live="polite" className="pointer-events-none absolute bottom-full right-0 z-10 mb-2 flex flex-col items-end gap-1 pc:bottom-auto pc:right-full pc:top-1/2 pc:mb-0 pc:mr-4 pc:-translate-y-1/2">
          {board.newQuads.map((quad) => (
            <QuadBadge key={`${quad.row}:${quad.value}`} value={quad.value} />
          ))}
        </div>
        {pending || rejected !== null ? (
          <div className="absolute -top-1 left-0">{pending ? <SendingDots /> : <RejectedNotice text={rejected!} />}</div>
        ) : null}
      </div>
    </Panel>
  );
}
