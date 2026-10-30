// A mesa da Peleja desenhada a partir da `view` do último `state` (spec §3.1, §3.2, §3.3, §10): o oponente na
// capa verde, em cima; a faixa central de tinta; você na capa rosa, embaixo, com a mão; e a coluna do histórico no
// PC. É só vista: as interações chegam por props (`onSelectCard`, `onSelectTarget`, `onSeen`, `onOpenGraveyard`,
// `onOpenMenu`, `onInteract`) e a barra de ação entra pelo `actionBar`. Quem liga isso à sessão é a `PlayTable`. A textura de xilogravura vai só nos títulos e no grão do papel, por baixo
// do conteúdo (spec §10.7). No tutorial, o `hint` traz o painel da dica (no alto da coluna do histórico no PC, no alto dos campos no
// celular e no tablet) e a zona de que ela fala, que ganha o contorno parado (`data-dica`, desenhado em `styles.css`).
import type { PlayerId } from '@coringa/engine';
import type { Deadline, StateMessage } from '@coringa/protocol';
import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react';
import { turnCue } from '../../model/clock.ts';
import { equipOpponentText, scoreText } from '../../model/copy.ts';
import { completeDraft, draftBoard } from '../../model/equip.ts';
import { newLineCount, type HistoryLine } from '../../model/history.ts';
import type { TrainingLevel } from '../../model/local-room.ts';
import type { SessionSnapshot } from '../../model/session.ts';
import type { HintZone } from '../../model/tutorial.ts';
import { useMediaQuery } from '../useMediaQuery.ts';
import { Banners } from './Banners.tsx';
import { CenterBand } from './CenterBand.tsx';
import { TableUiContext, type HandDrag, type TableUi } from './context.ts';
import { MenuButton } from './GameMenu.tsx';
import { Hand } from './Hand.tsx';
import { HistoryButton, HistoryPanel, PC_QUERY } from './History.tsx';
import { tableNames, type TableNames } from './labels.ts';
import { PlayerField } from './PlayerField.tsx';

/** A dica do tutorial: o painel (a tela o monta) e a zona de que ela fala, que ganha o contorno parado (`null`: sem contorno). */
export interface TableHint {
  zone: HintZone | null;
  panel: ReactNode;
  /**
   * O painel mostra uma dica que acabou de chegar: a situação dela ainda vale e ela tomou o painel na época (`state.epoch`) em curso.
   * Uma que ficou lá de épocas anteriores (ninguém a marcou, e a situação voltou a valer) não conta. No celular e no tablet o painel
   * mora no alto dos campos, que rolam: a rolagem da vez de atacar (`PlayTable`) espera a dica recém-chegada fechar, para o texto
   * não sair da vista justo quando chega.
   */
  open?: boolean;
}

/** As zonas da dica que moram no painel de baixo (Equipar, ordem, barra de ação e a janela de reação): o contorno vai no recipiente dele. */
const BAR_ZONES: ReadonlySet<HintZone | null> = new Set(['equip', 'order', 'actionBar', 'reaction']);

export interface TableProps {
  snapshot: SessionSnapshot;
  /** Tempo que falta para um prazo, pelo relógio do servidor (`Session.remainingMs`). */
  remainingMs: (deadline: Deadline) => number;
  /** Os controles estão travados (batida, jogada em voo, conexão caída): as cartas que são botão ficam apagadas. */
  locked?: boolean;
  /** A carta da mão que está escolhida. */
  selectedCardId?: string | null;
  /** Ids das cartas que são alvo possível da jogada em andamento. */
  targetIds?: ReadonlySet<string>;
  onSelectCard?: (id: string) => void;
  /** Fora da sua vez, o toque na carta da mão explica por que ela não tem jogada (`handNote`). */
  onExplainCard?: (id: string) => void;
  handNote?: { cardId: string; text: string } | null;
  onSelectTarget?: (id: string) => void;
  /** Arrastar as cartas da mão até a zona da jogada (um caminho a mais que o toque; sem ele, a mão só toca). */
  handDrag?: HandDrag;
  /** O jogador viu uma carta ou uma zona (`zone:<nome>`) marcada: a sessão apaga a marca. */
  onSeen?: (key: string) => void;
  /** Sem ele, o cemitério é só informação. */
  onOpenGraveyard?: () => void;
  /** Abre o menu da partida. Sem ele, a mesa não tem botão de menu. */
  onOpenMenu?: () => void;
  /** Um clique ou foco em qualquer parte da mesa (a sessão cancela a confirmação automática da ordem). */
  onInteract?: () => void;
  /** A barra de ação, embaixo da mão. */
  actionBar?: ReactNode;
  /** Treino contra o bot, e o nível dele: a faixa central diz "Treino · Médio, sem relógio" e a vez do jogador é anunciada sem prazo. */
  training?: TrainingLevel;
  /** A mesa do replay (só de vista): a faixa central diz "Revendo a partida" no lugar do relógio. */
  replay?: true;
  /** O tutorial (um treino guiado): a faixa central diz "Tutorial, sem relógio", e não o nível do bot. */
  tutorial?: true;
  /**
   * A dica do tutorial. O painel vai no alto da coluna do histórico no PC e, no celular e no tablet, no fluxo acima dos campos
   * (dentro do contêiner que rola: empurra os campos, nunca é camada sobre a mão ou a barra, nem tem z-index); um só, nunca
   * os dois. A zona ganha o contorno parado, sem animação.
   */
  hint?: TableHint;
  /** O título da mesa (só para leitor de tela): com a ref, ele fica focável por código, e a tela leva o foco a ele ao abrir. */
  titleRef?: RefObject<HTMLHeadingElement | null>;
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
  locked = false,
  selectedCardId = null,
  targetIds = NO_TARGETS,
  onSelectCard,
  onExplainCard,
  handNote = null,
  onSelectTarget,
  handDrag,
  onSeen,
  onOpenGraveyard,
  onOpenMenu,
  onInteract,
  actionBar,
  training,
  replay,
  tutorial,
  hint,
  titleRef,
}: TableProps & { state: StateMessage }) {
  const { room, marks, marksBaseSeq, history } = snapshot;
  const { view } = state;
  const me = view.me;
  const panelId = useId();
  const [historyOpen, setHistoryOpen] = useState(false);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const pc = useMediaQuery(PC_QUERY);
  const hintZone = hint?.zone ?? null;

  // Abrir a gaveta conta como ver as linhas (spec §10.5, "quando você toca, foca…"): o contador do botão só conta as que chegam
  // depois da última vez em que ela esteve aberta. Conta pela posição da linha, e não pelo `seq`: uma nota ("Duda voltou") chega
  // sem `state` novo e repete o `seq` da última linha. A partida nova (histórico zerado, outra primeira linha) começa do zero. As
  // marcas "novo" dentro da lista seguem a regra das marcas.
  const [seen, setSeen] = useState<{ first: HistoryLine | undefined; count: number }>({ first: undefined, count: 0 });
  if (historyOpen && (seen.count !== history.lines.length || seen.first !== history.lines[0])) {
    setSeen({ first: history.lines[0], count: history.lines.length });
  }
  const seenCount = seen.first === history.lines[0] ? seen.count : 0;

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
  const draftIds = board ? new Set(moves.map((pick) => pick.cardId)) : NO_DRAFT;

  // No celular a mesa rola por dentro e a sua fileira pode estar fora da vista: a última carta posta vem para a vista.
  const draftKey = moves.map((pick) => `${pick.cardId}:${pick.destination}`).join(',');
  useEffect(() => {
    if (draftKey === '') return;
    const drafts = document.querySelectorAll('[data-rascunho]');
    drafts[drafts.length - 1]?.scrollIntoView?.({ block: 'nearest' });
  }, [draftKey]);

  const ui: TableUi = {
    marked: marks.cards,
    zones: marks.zones,
    targetIds,
    locked,
    selectedCardId,
    draftIds,
    onSelectCard,
    onExplainCard,
    handNote,
    onSelectTarget,
    handDrag,
    onSeen,
    hintZone,
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
        <h1 ref={titleRef} tabIndex={-1} className="sr-only">
          Mesa da partida
        </h1>

        <div className="flex min-h-0 flex-1 flex-col pc:flex-[0_1_1100px]">
          <Banners snapshot={snapshot} remainingMs={remainingMs} />
          {/* Em telas baixas os campos e a faixa rolam por dentro; a mão e a barra de ação ficam sempre à vista, e a sua vez (o foco
              no painel de baixo) não rola nada. No PC eles não crescem além do que pedem (a sobra fica com a mão, centrada), e a
              coluna do histórico, com o menu, nunca rola junto. */}
          <div data-campos className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-none pc:flex-initial [&>*]:flex-none">
            {pc ? null : hint?.panel}
            <PlayerField
              side="opponent"
              view={view}
              player={view.opponent}
              name={names.opponent}
              away={theirs?.connected === false}
              equip={equipping ? equipOpponentText(view.opponent.pendingCount, view.opponent.equipSubmitted) : undefined}
              tool={
                <div className="flex items-center gap-2">
                  <HistoryButton
                    panelId={panelId}
                    open={historyOpen}
                    count={newLineCount(history, marksBaseSeq, seenCount)}
                    onToggle={() => (historyOpen ? closeHistory() : setHistoryOpen(true))}
                    buttonRef={toggleRef}
                  />
                  {onOpenMenu ? <MenuButton onClick={onOpenMenu} className="pc:hidden" /> : null}
                </div>
              }
            />
            <CenterBand
              view={view}
              names={names}
              deadline={state.deadline}
              remainingMs={remainingMs}
              pausedTurnMs={state.pausedTurnMs}
              turn={turnCue(state, snapshot.legal)}
              training={training}
              replay={replay}
              tutorial={tutorial}
              onOpenGraveyard={onOpenGraveyard}
            />
            <PlayerField side="self" view={view} player={self} name={names.self} />
          </div>
          <div className="flex flex-none flex-col pb-[env(safe-area-inset-bottom)] pc:flex-1 pc:flex-row pc:items-center pc:gap-7 pc:px-6 pc:pb-0 pc:text-papel">
            <Hand cards={view.self.hand} />
            {actionBar ? (
              <div
                data-dica={BAR_ZONES.has(hintZone) ? hintZone : undefined}
                className="bg-tinta px-3 pb-3.5 pt-2.5 text-papel pc:min-w-0 pc:flex-1 pc:bg-transparent pc:px-0 pc:pb-0 pc:pt-0"
              >
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
          tool={onOpenMenu ? <MenuButton onClick={onOpenMenu} tone="papel" className="max-pc:hidden" /> : undefined}
          baseSeq={marksBaseSeq}
          top={pc ? hint?.panel : undefined}
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
          {scoreText(room.score, me, names)}
        </span>
      </p>
    </>
  );
}
