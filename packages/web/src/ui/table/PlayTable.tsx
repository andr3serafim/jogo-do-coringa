// A mesa jogável (spec §1.5, §3.4, §7): liga a `Table` (só vista) à `Session` pela barra de ação. Guarda a escolha da
// mão em estado local, `{ época, carta, jogada }`, e monta as jogadas de `tablePlays` com a MESMA `view` e a lista
// legal do último `state` (`snapshot.legal`).
//
// A escolha só vale na época em que foi feita e enquanto a carta estiver na mão; a jogada escolhida é sempre
// reencontrada pela chave nas jogadas do `state` atual, nunca guardada (o `make` dela fecha sobre a `view` velha).
// O envio é `session.play(...)`, sem `await`: a mesa fica desligada pelo `pending` do snapshot até o `ack`.
//
// Teclado e foco (spec §7): quando chega o `state` da sua vez de jogar (época nova), o foco vai para a barra, sem
// roubar de um campo de texto nem de um diálogo aberto. Escolher uma carta leva o foco à primeira jogada, e escolher
// uma jogada com alvo, ao primeiro alvo. Esc cancela a escolha. Não há atalhos de uma tecla.
import type { SpecialCard } from '@coringa/engine';
import type { PlayerAction, StateMessage } from '@coringa/protocol';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { tablePlays, type CardPlay } from '../../model/plays.ts';
import type { Session, SessionSnapshot } from '../../model/session.ts';
import { useSession } from '../useSession.ts';
import { ActionBar } from './ActionBar.tsx';
import { GraveyardDialog, type GraveyardMode } from './GraveyardDialog.tsx';
import { tableNames } from './labels.ts';
import { Table } from './Table.tsx';

export interface PlayTableProps {
  session: Session;
  /** Avisos acima da mesa ("Reconectando…"). */
  banner?: ReactNode;
}

/** Sem `state` ainda não há o que desenhar. */
export function PlayTable({ session, banner }: PlayTableProps) {
  const snapshot = useSession(session);
  if (snapshot.state === null) return null;
  return <PlayTableView session={session} snapshot={snapshot} state={snapshot.state} banner={banner} />;
}

interface Selection {
  epoch: number;
  cardId: string;
  /** `CardPlay.key` da jogada que pede alvo; `null` enquanto só a carta foi escolhida. */
  playKey: string | null;
}

const noop = (): void => undefined;

/** Campo onde se digita: o foco que a mesa nunca rouba. */
function isTextEntry(el: Element | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.isContentEditable || el instanceof HTMLTextAreaElement || el instanceof HTMLSelectElement || el instanceof HTMLInputElement;
}

interface ViewProps extends PlayTableProps {
  snapshot: SessionSnapshot;
  state: StateMessage;
}

function PlayTableView({ session, snapshot, state, banner }: ViewProps) {
  const { view } = state;
  const { legal, pending } = snapshot;
  const names = tableNames(snapshot.room, view.me);
  // A barra existe nas fases de jogada. Equipar e a escolha da ordem têm painéis próprios (Tarefa 21).
  const barPhase = view.phase.kind === 'ATTACK_MAIN' || view.phase.kind === 'REACTION';
  const acting = barPhase && legal.length > 0;
  const plays = useMemo(() => tablePlays(view, legal), [view, legal]);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [pointedId, setPointedId] = useState<string | null>(null);
  const [graveyard, setGraveyard] = useState<GraveyardMode | null>(null);
  const barRef = useRef<HTMLElement>(null);
  /** Foco movido pela própria mesa: não conta como interação do jogador. */
  const programmatic = useRef(false);
  const closedByPick = useRef(false);

  // A escolha vale numa época só e enquanto a carta estiver na mão; a jogada, enquanto ainda for legal.
  const card: SpecialCard | null =
    selection !== null && selection.epoch === state.epoch
      ? (view.self.hand.find((c) => c.id === selection.cardId) ?? null)
      : null;
  const cardPlays = card ? (plays.byCard.get(card.id) ?? []) : [];
  const play = card && selection?.playKey ? (cardPlays.find((p) => p.key === selection.playKey) ?? null) : null;
  const cardId = card?.id ?? null;
  const playKey = play?.key ?? null;
  const hasTargets = play?.targets != null;

  const moveFocus = useCallback((el: HTMLElement | null) => {
    if (!el) return;
    programmatic.current = true;
    try {
      el.focus();
    } finally {
      programmatic.current = false;
    }
  }, []);
  const focusBar = useCallback(() => moveFocus(barRef.current), [moveFocus]);

  const clear = useCallback(() => {
    setSelection(null);
    setPointedId(null);
  }, []);

  /** Manda a jogada e leva o foco à barra (a carta em que ele estava vai sumir), salvo se `refocus` for falso. */
  const send = (action: PlayerAction, refocus = true) => {
    if (pending) return;
    clear();
    if (refocus) focusBar();
    void session.play(action).catch(noop);
  };

  const selectCard = (id: string) => {
    if (pending) return;
    setPointedId(null);
    setSelection(cardId === id ? null : { epoch: state.epoch, cardId: id, playKey: null });
  };

  const choosePlay = (option: CardPlay) => {
    if (pending || card === null) return;
    if (option.targets === null) send(option.make());
    else setSelection({ epoch: state.epoch, cardId: card.id, playKey: option.key });
  };

  const chooseTarget = (targetId: string) => {
    if (play) send(play.make(targetId));
  };

  const cancel = () => {
    clear();
    focusBar();
  };

  // Esc cancela a escolha (e só ela). O ouvinte é do documento: depois de escolher, o foco pode estar no corpo da página.
  // O Esc já tratado por um diálogo ou pela gaveta do histórico (`defaultPrevented`) não chega a cancelar nada.
  useEffect(() => {
    if (cardId === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      clear();
      focusBar();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cardId, clear, focusBar]);

  // Escolher a carta leva o foco à primeira jogada; escolher uma jogada com alvo, ao primeiro alvo.
  useEffect(() => {
    if (cardId === null) return;
    const step = hasTargets ? 'targets' : 'plays';
    moveFocus(barRef.current?.querySelector<HTMLElement>(`[data-step="${step}"] button:not(:disabled)`) ?? null);
  }, [cardId, playKey, hasTargets, moveFocus]);

  // Chegou a sua vez de jogar (época nova): o foco vai para a barra, sem roubar de quem digita ou de um diálogo.
  const turnEpoch = acting ? state.epoch : null;
  useEffect(() => {
    if (turnEpoch === null) return;
    if (document.querySelector('dialog[open]') || isTextEntry(document.activeElement)) return;
    focusBar();
  }, [turnEpoch, focusBar]);

  // Depois de ressuscitar pelo diálogo, o foco vai para a barra: o botão que abriu pode já nem existir.
  useEffect(() => {
    if (graveyard !== null || !closedByPick.current) return;
    closedByPick.current = false;
    focusBar();
  }, [graveyard, focusBar]);

  const targetIds = useMemo(() => new Set(play?.targets?.map((t) => t.id) ?? []), [play]);

  const bar = barPhase ? (
    <ActionBar
      view={view}
      names={names}
      plays={plays}
      acting={acting}
      pending={pending}
      card={card}
      play={play}
      pointedId={pointedId}
      notice={snapshot.notice}
      marked={snapshot.marks.cards}
      onSeen={(id) => session.markSeen(id)}
      onPoint={setPointedId}
      onPlay={choosePlay}
      onTarget={chooseTarget}
      onSend={send}
      onResurrect={() => setGraveyard('resurrect')}
      onCancel={cancel}
      barRef={barRef}
    />
  ) : undefined;

  return (
    <>
      <Table
        snapshot={snapshot}
        remainingMs={(deadline) => session.remainingMs(deadline)}
        selectedCardId={cardId}
        targetIds={targetIds}
        onSelectCard={acting ? selectCard : undefined}
        onSelectTarget={hasTargets ? chooseTarget : undefined}
        onSeen={(key) => session.markSeen(key)}
        onOpenGraveyard={() => setGraveyard('view')}
        onInteract={() => {
          if (!programmatic.current) session.interact();
        }}
        banner={banner}
        actionBar={bar}
      />
      <GraveyardDialog
        mode={graveyard}
        graveyard={view.graveyard}
        options={plays.resurrect}
        rowCounts={{ ATK: view.self.attackRow.length, DEF: view.self.defenseRow.length }}
        rowLimit={view.config.rowLimit}
        onPick={(id, row) => {
          // Com o diálogo ainda aberto o resto da página é inerte: o foco vai para a barra depois que ele fechar.
          closedByPick.current = true;
          setGraveyard(null);
          send({ type: 'RESURRECT', cardId: id, row }, false);
        }}
        onClose={() => setGraveyard(null)}
      />
    </>
  );
}
