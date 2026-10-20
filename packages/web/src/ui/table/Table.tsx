// A mesa da Peleja desenhada a partir da `view` do último `state` (spec §3.1, §3.2, §3.3, §10): o oponente na
// capa verde, em cima; a faixa central de tinta; você na capa rosa, embaixo, com a mão; e a coluna do histórico no
// PC. É só vista: as interações chegam por props (`onSelectCard`, `onSelectTarget`, `onSeen`, `onOpenGraveyard`,
// `onInteract`) e a barra de ação entra pelo `actionBar`. Quem liga isso à sessão é a `PlayTable`. A textura de xilogravura vai só nos títulos e no grão do papel, por baixo
// do conteúdo (spec §10.7).
import type { PlayerId } from '@coringa/engine';
import type { Deadline, StateMessage } from '@coringa/protocol';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { equipOpponentText } from '../../model/copy.ts';
import { completeDraft, draftBoard } from '../../model/equip.ts';
import { newLineCount } from '../../model/history.ts';
import type { SessionSnapshot } from '../../model/session.ts';
import { Banners } from './Banners.tsx';
import { CenterBand } from './CenterBand.tsx';
import { TableUiContext, type TableUi } from './context.ts';
import { Hand } from './Hand.tsx';
import { HistoryButton, HistoryPanel } from './History.tsx';
import { tableNames, type TableNames } from './labels.ts';
import { PlayerField } from './PlayerField.tsx';

export interface TableProps {
  snapshot: SessionSnapshot;
  /** Tempo que falta para um prazo, pelo relógio do servidor (`Session.remainingMs`). */
  remainingMs: (deadline: Deadline) => number;
  /** A carta da mão que está escolhida. */
  selectedCardId?: string | null;
  /** Ids das cartas que são alvo possível da jogada em andamento. */
  targetIds?: ReadonlySet<string>;
  onSelectCard?: (id: string) => void;
  onSelectTarget?: (id: string) => void;
  /** O jogador viu uma carta ou uma zona (`zone:<nome>`) marcada: a sessão apaga a marca. */
  onSeen?: (key: string) => void;
  /** Sem ele, o cemitério é só informação. */
  onOpenGraveyard?: () => void;
  /** Um clique ou foco em qualquer parte da mesa (a sessão cancela a confirmação automática da ordem). */
  onInteract?: () => void;
  /** Avisos acima da mesa ("Reconectando…"). */
  banner?: ReactNode;
  /** A barra de ação, embaixo da mão. */
  actionBar?: ReactNode;
}

const NO_TARGETS: ReadonlySet<string> = new Set();
const NO_DRAFT: ReadonlySet<string> = new Set();

/** Sem `state` ainda não há o que desenhar. */
export function Table(props: TableProps) {
  const { state } = props.snapshot;
  if (state === null) return null;
  return <TableView {...props} state={state} />;
}

function TableView({
  snapshot,
  state,
  remainingMs,
  selectedCardId = null,
  targetIds = NO_TARGETS,
  onSelectCard,
  onSelectTarget,
  onSeen,
  onOpenGraveyard,
  onInteract,
  banner,
  actionBar,
}: TableProps & { state: StateMessage }) {
  const { room, marks, marksBaseSeq, history } = snapshot;
  const { view } = state;
  const me = view.me;
  const panelId = useId();
  const [historyOpen, setHistoryOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);

  // Enquanto a mesa está montada, o puxar-para-atualizar da página não recarrega a partida (spec §3.2).
  useEffect(() => {
    document.documentElement.classList.add('mesa-ativa');
    return () => document.documentElement.classList.remove('mesa-ativa');
  }, []);

  // Equipar (spec §3.5): o que já foi escolhido entra na sua fileira como rascunho, e os totais e a quadra seguem o motor
  // (`draftBoard`). Depois de confirmar, o que foi mandado (o rascunho mais a regra de estouro) fica à vista até a revelação.
  const equipping = view.phase.kind === 'EQUIP';
  const moves = !equipping
    ? []
    : snapshot.equipConfirmed === 'thisPage'
      ? completeDraft(view, snapshot.equipDraft)
      : snapshot.equipConfirmed === 'none'
        ? snapshot.equipDraft
        : [];
  const board = moves.length > 0 ? draftBoard(view, moves) : null;
  const self = board ? { ...view.self, attackRow: board.attackRow, defenseRow: board.defenseRow } : view.self;
  const draftIds = board ? new Set(view.self.pending.slice(0, moves.length).map((card) => card.id)) : NO_DRAFT;

  // No celular a mesa rola por dentro e a sua fileira pode estar fora da vista: a última carta posta vem para a vista.
  const draftKey = moves.join(',');
  useEffect(() => {
    if (draftKey === '') return;
    const drafts = document.querySelectorAll('[data-rascunho]');
    drafts[drafts.length - 1]?.scrollIntoView?.({ block: 'nearest' });
  }, [draftKey]);

  const ui: TableUi = {
    marked: marks.cards,
    zones: marks.zones,
    targetIds,
    selectedCardId,
    draftIds,
    onSelectCard,
    onSelectTarget,
    onSeen,
  };

  const theirs = room?.seats.find((seat) => seat.playerId !== me);
  const names = tableNames(room, me);

  const closeHistory = () => {
    setHistoryOpen(false);
    toggleRef.current?.focus();
  };

  return (
    <TableUiContext value={ui}>
      <main
        aria-label="Mesa"
        onPointerDownCapture={onInteract}
        onClickCapture={onInteract}
        onFocusCapture={onInteract}
        className="relative isolate flex h-dvh flex-col overflow-y-auto overflow-x-hidden overscroll-none bg-capa-voce pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)] pt-[env(safe-area-inset-top)] text-tinta pc:flex-row pc:justify-center pc:bg-tinta"
      >
        <svg width="0" height="0" aria-hidden="true" focusable="false" className="absolute">
          <defs>
            <filter id="textura-aspera">
              <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves="2" result="ruido" />
              <feDisplacementMap in="SourceGraphic" in2="ruido" scale="2.4" />
            </filter>
          </defs>
        </svg>
        <span
          aria-hidden="true"
          data-grao
          className="grao pointer-events-none absolute inset-0 -z-10 opacity-20 pc:hidden"
        />
        <h1 className="sr-only">Mesa da partida</h1>

        <div className="flex min-h-0 flex-1 flex-col pc:flex-[0_1_1100px]">
          <Banners snapshot={snapshot} remainingMs={remainingMs} />
          {banner}
          {/* No celular os campos e a faixa rolam por dentro, em telas baixas; a mão e a barra de ação ficam sempre à vista. */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-none pc:flex-none pc:overflow-visible [&>*]:flex-none">
            <PlayerField
              side="opponent"
              view={view}
              player={view.opponent}
              name={names.opponent}
              away={theirs?.connected === false}
              equip={equipping ? equipOpponentText(view.opponent.pendingCount, view.opponent.equipSubmitted) : undefined}
              tool={
                <HistoryButton
                  panelId={panelId}
                  open={historyOpen}
                  count={newLineCount(history, marksBaseSeq)}
                  onToggle={() => (historyOpen ? closeHistory() : setHistoryOpen(true))}
                  buttonRef={toggleRef}
                />
              }
            />
            <CenterBand
              view={view}
              names={names}
              deadline={state.deadline}
              remainingMs={remainingMs}
              pausedTurnMs={state.pausedTurnMs}
              onOpenGraveyard={onOpenGraveyard}
            />
            <PlayerField side="self" view={view} player={self} name={names.self} />
          </div>
          <div className="flex flex-none flex-col pb-[env(safe-area-inset-bottom)] pc:flex-1 pc:flex-row pc:items-center pc:gap-7 pc:px-6 pc:pb-0 pc:text-papel">
            <Hand cards={view.self.hand} />
            {actionBar ? (
              <div className="bg-tinta px-3 pb-3.5 pt-2.5 text-papel pc:min-w-0 pc:flex-1 pc:bg-transparent pc:px-0 pc:pb-0 pc:pt-0">
                {actionBar}
              </div>
            ) : null}
          </div>
        </div>

        <HistoryPanel
          id={panelId}
          open={historyOpen}
          onClose={closeHistory}
          lines={history.lines}
          baseSeq={marksBaseSeq}
          footer={room ? <RoomFooter room={room} me={me} names={names} /> : null}
        />
      </main>
    </TableUiContext>
  );
}

function RoomFooter({
  room,
  me,
  names,
}: {
  room: NonNullable<SessionSnapshot['room']>;
  me: PlayerId;
  names: TableNames;
}) {
  const [mine, theirs] = me === 'p1' ? [room.score.p1, room.score.p2] : [room.score.p2, room.score.p1];
  const draws = room.score.draws > 0 ? ` · ${room.score.draws} ${room.score.draws === 1 ? 'empate' : 'empates'}` : '';
  return (
    <>
      <p>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em]">Sala</span>{' '}
        <span data-numero className="font-texto font-bold tabular-nums">
          {room.code}
        </span>
      </p>
      <p>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em]">Placar</span>{' '}
        <span data-numero className="font-texto tabular-nums">
          {names.self} {mine} × {theirs} {names.opponent}
          {draws}
        </span>
      </p>
    </>
  );
}
