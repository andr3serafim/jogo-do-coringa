// A barra de ação (spec §3.4): embaixo da mão, na tinta. Mostra, nesta ordem, o que fazer agora (a carta tocada →
// as jogadas dela → os alvos), as prévias (a ameaça do oponente e, apontando um alvo, o efeito de quebrá-lo), os botões
// próprios (Reflect, Anular, Proteger, Ressuscitar) e, por último e longe da mão, o botão principal: Atacar com a
// prévia, ou Encerrar turno com o Ataque vazio. É só vista: a escolha e o envio ficam na `PlayTable`.
//
// Alvo de toque ≥ 44 px (spec §3.2): as cartas da mesa são menores, então os alvos válidos também são listados aqui como
// botões grandes. O nome dos botões de duas linhas é o título e a segunda linha juntos (`aria-labelledby` nos dois, ver `TwoLine`):
// o axe (WCAG 2.5.3) exige que o texto visível do botão seja trecho contínuo do nome.
//
// Na janela de reação (spec §3.7) a barra ganha o gatilho com a prévia no alto e o botão Passar no lugar do principal. Depois
// de um passe (manual ou automático) o servidor recusa qualquer outra jogada da janela, então as respostas saem da barra.
// `disabled` desliga todos os controles (jogada em voo, reconexão, prazo esgotado); `pending` só diz "Enviando…".
import { noPlayReason, type GameEvent, type PlayerView, type SpecialCard } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { useMemo, type ReactNode, type RefObject } from 'react';
import {
  ATTACK_LABEL,
  attackPreviewText,
  brokenEffectText,
  brokenLabel,
  CANCEL_LABEL,
  CANCEL_REFLECT_LABEL,
  chooseCardText,
  chooseTargetText,
  EMPTY_ATTACK_TEXT,
  END_TURN_LABEL,
  leavesText,
  noPlaysText,
  PASSED_TEXT,
  PICK_CARD_TEXT,
  PROTECT_LABEL,
  reactingText,
  REFLECT_LABEL,
  RESURRECT_LABEL,
  SENDING_TEXT,
  targetButtonText,
  targetEffectText,
  targetRole,
  threatLabel,
  threatPreviewText,
  waitingText,
} from '../../model/copy.ts';
import { previewsOf, previewsWithout, type Previews } from '../../model/preview.ts';
import type { CardPlay, Target, TablePlays } from '../../model/plays.ts';
import type { Notice } from '../../model/session.ts';
import { PRIMARY, PRIMARY_TITLE, SECONDARY, TwoLine } from './controls.tsx';
import { resurrectionsText, type TableNames } from './labels.ts';
import { PassButton, ReactionNotice } from './ReactionPanel.tsx';

export interface ActionBarProps {
  view: PlayerView;
  names: TableNames;
  plays: TablePlays;
  /** É a sua vez de jogar ou de reagir: sem isso a barra só informa. */
  acting: boolean;
  /** Uma jogada em voo: a barra diz "Enviando…". */
  pending: boolean;
  /** Controles desligados: jogada em voo, reconexão ou prazo esgotado. */
  disabled: boolean;
  /** Um PASS já saiu nesta janela de reação (o seu ou o automático): o servidor recusa o resto, então só resta esperar. */
  passed: boolean;
  /** Os eventos do `state` atual (o gatilho do K precisa de quantos K entraram). */
  events: readonly GameEvent[];
  /** A carta da mão tocada. */
  card: SpecialCard | null;
  /** A jogada escolhida para essa carta (a que pede alvo). */
  play: CardPlay | null;
  /** O alvo que o mouse ou o foco apontam. */
  pointedId: string | null;
  /** Só os avisos de jogada (`rate`, `rule`) aparecem aqui. */
  notice: Notice | null;
  /** Ids de carta com a marca "novo". */
  marked: ReadonlySet<string>;
  onSeen: (id: string) => void;
  onPoint: (id: string | null) => void;
  onPlay: (play: CardPlay) => void;
  onTarget: (targetId: string) => void;
  onSend: (action: PlayerAction) => void;
  onResurrect: () => void;
  onCancel: () => void;
  /** A própria barra, para a mesa levar o foco a ela quando chega a sua vez. */
  barRef: RefObject<HTMLElement | null>;
}

/** As cartas de campo e de mão do jogador, por id: o Reflect e a Proteção nomeiam as que saem. */
function ownCardsById(view: PlayerView): Map<string, SpecialCard> {
  const { hand, attackBuffs, defenseBuffs, guard } = view.self;
  return new Map([...hand, ...attackBuffs, ...defenseBuffs, ...guard].map((c) => [c.id, c]));
}

/** As cartas dos ids, na ordem; `null` se alguma não estiver no campo nem na mão (a combinação não pode ser descrita). */
export function pickCards(own: Map<string, SpecialCard>, ids: string[]): SpecialCard[] | null {
  const cards: SpecialCard[] = [];
  for (const id of ids) {
    const found = own.get(id);
    if (!found) return null;
    cards.push(found);
  }
  return cards;
}

export function ActionBar(props: ActionBarProps) {
  const { view, names, plays, acting, pending, disabled, card, play, pointedId, notice, barRef } = props;
  const opponent = names.opponent;
  const previews = useMemo(() => previewsOf(view), [view]);
  const cardPlays = card ? (plays.byCard.get(card.id) ?? []) : [];
  const targets = play?.targets ?? null;
  const pointed = targets?.find((t) => t.id === pointedId) ?? null;
  const reacting = view.phase.kind === 'REACTION';
  // Depois do passe, manual ou automático, só resta esperar a janela fechar (a `PlayTable` já conta os dois).
  const { passed } = props;
  const open = acting && !passed;
  // O gatilho já traz a prévia do ataque: a ameaça não se repete.
  const triggered = reacting && open && view.phase.kind === 'REACTION' && view.phase.trigger === 'ATTACK';
  const canPass = reacting && open && plays.pass;

  return (
    <section ref={barRef} data-painel tabIndex={-1} aria-label="Ações" className="flex flex-col gap-2.5 text-papel pc:gap-1.5">
      {reacting && open ? <ReactionNotice view={view} names={names} threat={previews.threat} events={props.events} /> : null}

      <Status {...{ view, names, acting, pending, card, play, cardPlays, plays, notice, passed }} />

      {open && card && play === null && cardPlays.length > 0 ? (
        <ul role="list" aria-label="Jogadas" data-step="plays" className="flex list-none flex-wrap gap-2 p-1.5">
          {cardPlays.map((option) => (
            <li key={option.key}>
              <button type="button" disabled={disabled} onClick={() => props.onPlay(option)} className={SECONDARY}>
                {option.label}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open && targets ? (
        <TargetList
          view={view}
          names={names}
          targets={targets}
          before={previews}
          disabled={disabled}
          marked={props.marked}
          onSeen={props.onSeen}
          onPoint={props.onPoint}
          onTarget={props.onTarget}
        />
      ) : null}

      <div role="group" aria-label="Prévias" className="flex flex-col gap-1 text-[13px] leading-tight pc:flex-row pc:gap-6 pc:text-sm">
        {pointed ? (
          <PreviewRow label={brokenLabel(targetRole(pointed.zone))}>
            {brokenEffectText(previews, previewsWithout(view, pointed.id), opponent, 'long')}
          </PreviewRow>
        ) : null}
        {previews.threat.outcome !== 'NO_ATTACK' && !triggered ? (
          <PreviewRow label={threatLabel(opponent)}>{threatPreviewText(previews.threat, opponent, previews.lives)}</PreviewRow>
        ) : null}
      </div>

      {/* Com uma carta escolhida a conversa é sobre ela: os botões próprios (que não usam a escolha) voltam com o Cancelar. */}
      {open && card === null ? <OwnPlays {...props} /> : null}

      {open && (plays.finish || canPass || card) ? (
        <div className="flex gap-2">
          {canPass ? <PassButton disabled={disabled} onPass={() => props.onSend({ type: 'PASS' })} /> : null}
          {plays.finish ? (
            <TwoLine
              title={plays.finish.type === 'DECLARE_ATTACK' ? ATTACK_LABEL : END_TURN_LABEL}
              detail={
                plays.finish.type === 'DECLARE_ATTACK' ? attackPreviewText(previews.mine, opponent, previews.lives) : EMPTY_ATTACK_TEXT
              }
              titleClass={PRIMARY_TITLE}
              detailClass="text-xs font-semibold tabular-nums pc:text-[13px]"
              disabled={disabled}
              onClick={() => props.onSend(plays.finish!)}
              className={`${PRIMARY} flex-1 pc:min-w-[300px] pc:flex-none`}
            />
          ) : null}
          {card ? (
            <button
              type="button"
              onClick={props.onCancel}
              className={`${SECONDARY} ${plays.finish || canPass ? 'min-h-14 pc:min-h-12' : ''}`}
            >
              {CANCEL_LABEL}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

// ---------------------------------------------------------------------------------------------

function PreviewRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <p>
      <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.12em] text-ouro pc:text-[11px]">{label}</span>
      <span data-numero className="font-texto tabular-nums">
        {children}
      </span>
    </p>
  );
}

interface StatusProps {
  view: PlayerView;
  names: TableNames;
  acting: boolean;
  pending: boolean;
  card: SpecialCard | null;
  play: CardPlay | null;
  cardPlays: CardPlay[];
  plays: TablePlays;
  notice: Notice | null;
  /** Um passe saiu nesta janela. */
  passed: boolean;
}

/** A linha de cima: o passe automático, "Enviando…", o aviso de uma jogada recusada, ou o que fazer agora. */
function Status({ view, names, acting, pending, card, play, cardPlays, plays, notice, passed }: StatusProps) {
  if (notice?.kind === 'autoPass') {
    return (
      <p role="status" className="text-sm font-bold leading-snug">
        {notice.text}
      </p>
    );
  }
  if (pending) {
    return (
      <p role="status" className="text-sm font-bold leading-snug">
        {SENDING_TEXT}
      </p>
    );
  }
  if (notice && (notice.kind === 'rate' || notice.kind === 'rule')) {
    return (
      <p role="status" className="text-sm font-bold leading-snug text-ouro">
        {notice.text}
      </p>
    );
  }
  if (passed) {
    return (
      <p role="status" className="text-sm font-bold leading-snug">
        {PASSED_TEXT}
      </p>
    );
  }
  let text: string | null = null;
  if (!acting) {
    if (view.phase.kind === 'ATTACK_MAIN') text = waitingText(names.opponent);
    else if (view.phase.kind === 'REACTION') text = reactingText(names.opponent);
  } else if (card === null) {
    text = plays.byCard.size > 0 ? PICK_CARD_TEXT : null;
  } else if (play?.targets) {
    text = chooseTargetText(play.label, card, names.opponent);
  } else {
    text =
      cardPlays.length > 0
        ? chooseCardText(card)
        : noPlaysText(card, noPlayReason(view, card), names.opponent, view.config.buffLimit);
  }
  return text === null ? null : <p className="text-sm leading-snug">{text}</p>;
}

interface TargetListProps {
  view: PlayerView;
  names: TableNames;
  targets: Target[];
  before: Previews;
  disabled: boolean;
  marked: ReadonlySet<string>;
  onSeen: (id: string) => void;
  onPoint: (id: string | null) => void;
  onTarget: (targetId: string) => void;
}

/** Os alvos válidos como botões grandes, cada um com o efeito de quebrá-lo (o motor, sobre a `view` sem a carta). */
function TargetList({ view, names, targets, before, disabled, marked, onSeen, onPoint, onTarget }: TargetListProps) {
  const opponent = names.opponent;
  const cards = useMemo(() => {
    const { attackBuffs, defenseBuffs, guard } = view.opponent;
    return new Map<string, SpecialCard>([...attackBuffs, ...defenseBuffs, ...guard].map((c) => [c.id, c]));
  }, [view]);
  const effects = useMemo(
    () =>
      new Map(
        targets.map((t) => [t.id, brokenEffectText(before, previewsWithout(view, t.id), opponent, 'short')] as const),
      ),
    [view, targets, before, opponent],
  );

  return (
    <ul
      role="list"
      aria-label="Alvos"
      data-step="targets"
      className="flex max-h-[34dvh] list-none flex-col gap-2 overflow-y-auto p-1.5 pc:grid pc:max-h-[8.5rem] pc:grid-cols-2 pc:gap-1.5"
    >
      {targets.map((target) => {
        const targetCard = cards.get(target.id);
        if (!targetCard) return null;
        const seen = marked.has(target.id) ? () => onSeen(target.id) : undefined;
        const point = () => {
          onPoint(target.id);
          seen?.();
        };
        return (
          <li key={target.id} className="min-w-0">
            <TwoLine
              title={targetButtonText(targetCard, target.zone, opponent)}
              detail={targetEffectText(targetRole(target.zone), effects.get(target.id) ?? '')}
              titleClass="text-[15px] font-bold leading-tight pc:text-sm"
              detailClass="text-xs font-normal leading-tight tabular-nums pc:text-[11px]"
              disabled={disabled}
              onClick={() => onTarget(target.id)}
              onPointerEnter={point}
              onPointerDown={seen}
              onFocus={point}
              onPointerLeave={() => onPoint(null)}
              onBlur={() => onPoint(null)}
              className={`${SECONDARY} w-full gap-0.5 pc:px-2.5 pc:py-1`}
            />
          </li>
        );
      })}
    </ul>
  );
}

/** Reflect, Anular o Reflect, Proteger-se e Ressuscitar: as jogadas de várias cartas, quando são possíveis. */
function OwnPlays({ view, plays, disabled, onSend, onResurrect }: ActionBarProps) {
  const own = ownCardsById(view);
  const items: ReactNode[] = [];
  const add = (key: string, title: string, detail: string, onClick: () => void) =>
    items.push(
      <TwoLine
        key={key}
        title={title}
        detail={detail}
        titleClass="text-[15px] font-bold leading-tight"
        detailClass="text-xs font-normal leading-tight"
        disabled={disabled}
        onClick={onClick}
        className={`${SECONDARY} gap-0.5`}
      />,
    );

  const { reflect, cancelReflect, protect } = plays;
  // Uma carta que não está na mão nem no campo não pode ser descrita: sem a lista de quem sai, o botão não aparece.
  if (reflect?.type === 'REFLECT') {
    const cards = pickCards(own, [reflect.kId, reflect.jId, reflect.qId]);
    if (cards) add('reflect', REFLECT_LABEL, leavesText(cards, 'hand'), () => onSend(reflect));
  }
  if (cancelReflect?.type === 'CANCEL_REFLECT') {
    const cards = pickCards(own, [cancelReflect.kId, cancelReflect.jId, cancelReflect.qId]);
    if (cards) add('cancel', CANCEL_REFLECT_LABEL, leavesText(cards, 'hand'), () => onSend(cancelReflect));
  }
  if (protect?.type === 'PROTECT_FROM_REFLECT') {
    const cards = pickCards(own, [protect.jId, protect.qId, protect.kId]);
    if (cards) add('protect', PROTECT_LABEL, leavesText(cards, 'field'), () => onSend(protect));
  }
  if (plays.resurrect.length > 0) {
    add('resurrect', RESURRECT_LABEL, resurrectionsText(view.self.resurrectionCount), onResurrect);
  }
  if (items.length === 0) return null;
  return (
    <div role="group" aria-label="Outras jogadas" className="flex flex-wrap gap-2 p-1.5">
      {items}
    </div>
  );
}
