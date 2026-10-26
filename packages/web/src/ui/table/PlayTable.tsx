// A mesa jogável (spec §1.5, §3.4 a §3.8, §7): liga a `Table` (só vista) à `Session`. Em cada fase o painel de baixo é um:
// a barra de ação (fase principal e janela de reação), o painel do Equipar carta a carta ou a escolha da ordem.
//
// Na barra, guarda a escolha da mão em estado local, `{ época, carta, jogada }`, e monta as jogadas de `tablePlays` com a
// MESMA `view` e a lista legal do último `state` (`snapshot.legal`). A escolha só vale na época em que foi feita e enquanto
// a carta estiver na mão; a jogada escolhida é sempre reencontrada pela chave nas jogadas do `state` atual, nunca guardada
// (o `make` dela fecha sobre a `view` velha). O envio é `session.play(...)`, sem `await`, e só sai se a jogada ainda é
// legal pelo papel (`isLegal`, a última linha de defesa).
//
// Controles desligados (`locked`): jogada em voo (`pending`), conexão caída (`reconnecting`, spec §6.2), prazo do jogador
// esgotado até chegar o `state` seguinte (spec §3.8) e batidas em curso (`useBoardBusy`, spec §4.1: no máximo ~1 s quando
// há uma decisão esperando; um toque na mesa ou Esc termina as batidas).
//
// Teclado e foco (spec §7): quando chega o `state` da sua vez (época nova), o foco vai para o painel, sem roubar de um
// campo de texto nem de um diálogo aberto. Escolher uma carta leva o foco à primeira jogada, e escolher uma jogada com
// alvo, ao primeiro alvo. Esc ou Cancelar devolvem o foco à carta que abriu a escolha. Não há atalhos de uma tecla. O foco
// que a própria mesa move não conta como interação do jogador (não cancela a ordem automática nem aponta/apaga marcas).
import type { SpecialCard } from '@coringa/engine';
import type { Deadline, PlayerAction, StateMessage } from '@coringa/protocol';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { navigate } from '../../app/router.ts';
import { rowKey } from '../../model/effects.ts';
import type { TrainingLevel } from '../../model/local-room.ts';
import { isLegal, tablePlays, type CardPlay } from '../../model/plays.ts';
import type { Session, SessionSnapshot } from '../../model/session.ts';
import { savePrefs, type KeyValueStore, type Prefs } from '../../model/storage.ts';
import { useAnim, useBoardBusy } from '../anim/context.ts';
import { Stage } from '../anim/Stage.tsx';
import { useReducedMotion } from '../anim/useReducedMotion.ts';
import { useSound } from '../sound-context.ts';
import { useSession } from '../useSession.ts';
import { ActionBar } from './ActionBar.tsx';
import { EndPanel } from './EndPanel.tsx';
import { EquipPanel } from './EquipPanel.tsx';
import { GameMenu } from './GameMenu.tsx';
import { GraveyardDialog, type GraveyardMode } from './GraveyardDialog.tsx';
import { PC_QUERY } from './History.tsx';
import { tableNames } from './labels.ts';
import { OrderPanel } from './OrderPanel.tsx';
import { Table } from './Table.tsx';
import { useDeadlineExpired } from './useClock.ts';
import { useRecordPastGame } from './useRecordPastGame.ts';

export interface PlayTableProps {
  session: Session;
  /** Onde o menu grava as preferências (`coringa:prefs`). Sem ele, elas valem só nesta sessão. */
  store?: KeyValueStore;
  /** O link da sala, para "Copiar link da sala" no menu. Sem ele (treino) o botão não existe. */
  inviteLink?: string;
  /** Busca a versão publicada ao abrir o menu. Tem que ser estável entre renderizações; sem ele a linha não existe. */
  loadVersion?: () => Promise<string | null>;
  /** "Nova sala" no painel de fim: fecha a conexão e volta ao início. Sem ele o botão não existe. */
  onNewRoom?: () => void;
  /** O rótulo desse botão (padrão "Nova sala"); o treino diz "Voltar ao início". */
  newRoomLabel?: string;
  /** Treino contra o bot, e o nível dele (spec §2.6): a faixa central e o menu dizem o nível, a faixa diz que não há relógio, e a vez do jogador é anunciada sem prazo. */
  training?: TrainingLevel;
  /** "Sair do treino", no menu da partida. Sem ele o item não existe. */
  onExit?: () => void;
  /** O aviso da confirmação de Desistir (padrão: perder por W.O.); o treino não tem W.O. */
  concedeWarning?: string;
}

/** Sem `state` ainda não há o que desenhar. */
export function PlayTable(props: PlayTableProps) {
  const { session } = props;
  const snapshot = useSession(session);
  const reducedMotion = useReducedMotion(snapshot.prefs.reduceMotion);
  // Enquanto a mesa está aberta, o som segue a preferência da sessão (a que o menu muda e o armazenamento guarda).
  const sound = useSound();
  const soundOn = snapshot.prefs.sound;
  useEffect(() => {
    sound.setEnabled(soundOn);
  }, [sound, soundOn]);
  if (snapshot.state === null) return null;
  return (
    <Stage snapshot={snapshot} reducedMotion={reducedMotion}>
      <PlayTableView {...props} snapshot={snapshot} state={snapshot.state} />
    </Stage>
  );
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

/** As teclas com que o próprio jogador rola os campos. */
const SCROLL_KEYS: ReadonlySet<string> = new Set(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ']);

/** O elemento está inteiro na janela dos campos (o contêiner que rola por dentro, `data-campos`), com 1 px de folga. */
function insideFields(el: Element): boolean {
  const fields = el.closest('[data-campos]');
  if (!fields) return true;
  const box = el.getBoundingClientRect();
  const port = fields.getBoundingClientRect();
  return box.top >= port.top - 1 && box.bottom <= port.bottom + 1;
}

/** O botão da carta da mão com esse id, ou `null` se ela já saiu da mão. */
function handButton(id: string | null): HTMLElement | null {
  if (id === null) return null;
  const el = [...document.querySelectorAll<HTMLElement>('[data-card-id]')].find((candidate) => candidate.dataset.cardId === id);
  return el instanceof HTMLButtonElement ? el : null;
}

interface ViewProps extends PlayTableProps {
  snapshot: SessionSnapshot;
  state: StateMessage;
}

function PlayTableView({
  session,
  snapshot,
  state,
  store,
  inviteLink,
  loadVersion,
  onNewRoom,
  newRoomLabel,
  training,
  onExit,
  concedeWarning,
}: ViewProps) {
  const { view } = state;
  const sound = useSound();
  const { legal, pending, room } = snapshot;
  const phase = view.phase.kind;
  const names = tableNames(room, view.me);
  const remainingMs = useCallback((deadline: Deadline) => session.remainingMs(deadline), [session]);
  const now = useCallback(() => session.now(), [session]);
  const timedOut = useDeadlineExpired(state.deadline, remainingMs);
  const busy = useBoardBusy();
  const locked = pending || snapshot.status === 'reconnecting' || timedOut || busy;
  // O painel de fim (spec §2.5) só vem com a sala em FINISHED e a mesa quieta: não cobre o golpe final nem a cena da Exódia.
  const outcome = room?.status === 'FINISHED' ? room.outcome : undefined;
  const showEnd = room !== null && outcome !== undefined && !busy;
  // A partida terminada fica na lista local assim que a sala vira FINISHED; com o replay (o treino já o traz, e online ele é
  // acrescentado à linha quando chega), o painel oferece "Rever a partida".
  const pastGame = useRecordPastGame(snapshot, view, names, store, training);

  // A barra existe nas fases de jogada; o Equipar e a escolha da ordem têm painéis próprios.
  const barPhase = phase === 'ATTACK_MAIN' || phase === 'REACTION';
  const acting = barPhase && legal.length > 0;
  const equipping = phase === 'EQUIP' && snapshot.equipConfirmed === 'none' && legal.some((a) => a.type === 'EQUIP');
  const ordering = phase === 'ORDER_CHOICE' && legal.some((a) => a.type === 'CHOOSE_ORDER');
  const plays = useMemo(() => tablePlays(view, legal), [view, legal]);

  const [selection, setSelection] = useState<Selection | null>(null);
  const [pointedId, setPointedId] = useState<string | null>(null);
  const [graveyard, setGraveyard] = useState<GraveyardMode | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  // O painel de fim chega sozinho (a partida acabou) por cima de um menu que estava aberto: o menu sai, para ficar um diálogo
  // só (o Esc recolheria o painel e deixaria o menu para trás). Só a chegada conta; depois de recolher o painel, o menu abre.
  const [endShown, setEndShown] = useState(showEnd);
  if (showEnd !== endShown) {
    setEndShown(showEnd);
    if (showEnd) setMenuOpen(false);
  }
  /** Época em que o jogador mandou o PASS: o servidor segura o passe e recusa o resto da janela. */
  const [passedEpoch, setPassedEpoch] = useState<number | null>(null);
  /** O painel de baixo (barra, Equipar ou ordem), para a mesa levar o foco a ele quando chega a sua vez. */
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
  // Depois do passe (manual, ou o automático) o servidor recusa o resto da janela: a mão não escolhe mais.
  const passed = phase === 'REACTION' && (passedEpoch === state.epoch || snapshot.notice?.kind === 'autoPass');

  const moveFocus = useCallback((el: HTMLElement | null, options?: FocusOptions) => {
    if (!el) return;
    programmatic.current = true;
    try {
      el.focus(options);
    } finally {
      programmatic.current = false;
    }
  }, []);
  const focusBar = useCallback(() => moveFocus(barRef.current), [moveFocus]);
  /** Esc e Cancelar: o foco volta à carta da mão que abriu a escolha; se ela já saiu, à barra. */
  const focusCard = useCallback((id: string | null) => moveFocus(handButton(id) ?? barRef.current), [moveFocus]);

  // Um pulo, ou um `state` novo no meio das batidas, remonta as cartas que a linha do tempo velha mexia (`anim.remounted`), e o
  // foco que uma delas tinha cai no corpo da página. Ele volta para ela (ou para o painel de baixo, se ela deixou de ser
  // botão) pelo mesmo `moveFocus` da mesa, então não conta como interação do jogador: não cancela a ordem automática nem
  // apaga a marca "novo". Só vale para as cartas remontadas por ESTE encerramento, só se o foco foi mesmo perdido, e sem
  // rolar a mesa. O foco que o jogador tirou da carta (a carta ainda na página) apaga o registro: nada a devolver depois.
  const anim = useAnim();
  const focusedCard = useRef<string | null>(null);
  useEffect(() => {
    const onFocusIn = (event: FocusEvent) => {
      const card = event.target instanceof Element ? event.target.closest<HTMLElement>('[data-card-id]') : null;
      focusedCard.current = card?.dataset.cardId ?? null;
    };
    const onFocusOut = (event: FocusEvent) => {
      if (event.target instanceof Element && event.target.isConnected) focusedCard.current = null;
    };
    document.addEventListener('focusin', onFocusIn);
    document.addEventListener('focusout', onFocusOut);
    return () => {
      document.removeEventListener('focusin', onFocusIn);
      document.removeEventListener('focusout', onFocusOut);
    };
  }, []);
  const restoredSerial = useRef(anim.remounted.serial);
  useLayoutEffect(() => {
    if (restoredSerial.current === anim.remounted.serial) return;
    restoredSerial.current = anim.remounted.serial;
    const id = focusedCard.current;
    if (id === null || !anim.remounted.ids.has(id)) return;
    focusedCard.current = null;
    if (document.activeElement && document.activeElement !== document.body) return;
    moveFocus(handButton(id) ?? barRef.current, { preventScroll: true });
  }, [anim.remounted, moveFocus]);

  const clear = useCallback(() => {
    setSelection(null);
    setPointedId(null);
  }, []);

  /** O jogador mexeu na mesa (clique, foco, mouse no painel da ordem). O foco que a mesa move não conta. */
  const interact = () => {
    if (!programmatic.current) session.interact();
  };

  /** Manda a jogada e leva o foco à barra (a carta em que ele estava vai sumir), salvo se `refocus` for falso. */
  const send = (action: PlayerAction, refocus = true) => {
    if (locked) return;
    // A última linha de defesa: a jogada ainda vale pelo papel na lista legal deste `state`.
    if (!isLegal(action, legal, view)) return;
    clear();
    if (refocus) focusBar();
    const isPass = action.type === 'PASS';
    if (isPass) setPassedEpoch(state.epoch);
    // Um passe recusado (devagar, regra) devolve os controles; as recusas "esperar o state" mantêm o passe.
    void session.play(action).then(
      () => {
        const notice = session.snapshot().notice;
        if (isPass && (notice?.kind === 'rate' || notice?.kind === 'rule')) setPassedEpoch(null);
      },
      () => {
        if (isPass) setPassedEpoch(null);
      },
    );
  };

  const selectCard = (id: string) => {
    if (locked || passed) return;
    setPointedId(null);
    setSelection(cardId === id ? null : { epoch: state.epoch, cardId: id, playKey: null });
  };

  const choosePlay = (option: CardPlay) => {
    if (locked || card === null) return;
    if (option.targets === null) send(option.make());
    else setSelection({ epoch: state.epoch, cardId: card.id, playKey: option.key });
  };

  const chooseTarget = (targetId: string) => {
    if (play) send(play.make(targetId));
  };

  const cancel = () => {
    const id = cardId;
    clear();
    focusCard(id);
  };

  // Esc cancela a escolha (e só ela). O ouvinte é do documento: depois de escolher, o foco pode estar no corpo da página.
  // O Esc já tratado por um diálogo ou pela gaveta do histórico (`defaultPrevented`) não chega a cancelar nada.
  useEffect(() => {
    if (cardId === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || document.querySelector('dialog[open]')) return;
      clear();
      focusCard(cardId);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [cardId, clear, focusCard]);

  // Escolher a carta leva o foco à primeira jogada; escolher uma jogada com alvo, ao primeiro alvo.
  useEffect(() => {
    if (cardId === null) return;
    const step = hasTargets ? 'targets' : 'plays';
    moveFocus(barRef.current?.querySelector<HTMLElement>(`[data-step="${step}"] button:not(:disabled)`) ?? null);
  }, [cardId, playKey, hasTargets, moveFocus]);

  // Chegou a sua vez de jogar (época nova): o foco vai para o painel, sem roubar de quem digita ou de um diálogo. Na revanche
  // o `state` novo pode chegar antes de o painel de fim sair: quando ele sai (`showEnd`), a vez conta de novo.
  const turnEpoch = acting || equipping || ordering ? state.epoch : null;
  useEffect(() => {
    if (turnEpoch === null) return;
    if (document.querySelector('dialog[open]') || isTextEntry(document.activeElement)) return;
    focusBar();
  }, [turnEpoch, showEnd, focusBar]);

  // No celular e no tablet os campos rolam por dentro (spec §3.2) e não cabem numa tela baixa. Na sua vez de atacar, depois de as
  // batidas pararem (o mesmo `state` pode trazer o ataque do oponente, e a sua vida e a sua Defesa precisam ficar à vista enquanto
  // o dano conta), se a sua fileira de Ataque ou a Defesa do oponente (o alvo) não está inteira na janela dos campos, a sua fileira
  // desce até o pé dela, com a fileira de Ataque do oponente, a faixa e a Defesa dele acima. No PC a mesa cabe, e a vida do
  // oponente tem de ficar à vista na sua vez: nada rola. Uma vez por época, como o foco, e sem brigar com o jogador: se ele mesmo
  // rolou os campos nesta época (roda, toque arrastado, teclas de rolagem), nada rola. A rolagem é sempre instantânea (nunca suave,
  // nem sem movimento reduzido) e não mexe no foco, que segue no painel de baixo.
  const attackEpoch = acting && phase === 'ATTACK_MAIN' ? state.epoch : null;
  const scrolledEpoch = useRef<number | null>(null);
  const userScrolledEpoch = useRef<number | null>(null);
  const me = view.me;
  const opponent = view.opponent.id;
  useEffect(() => {
    const fields = document.querySelector('[data-campos]');
    if (attackEpoch === null || !fields) return;
    const mark = () => {
      userScrolledEpoch.current = attackEpoch;
    };
    const onKey = (event: Event) => {
      if (SCROLL_KEYS.has((event as KeyboardEvent).key)) mark();
    };
    fields.addEventListener('wheel', mark, { passive: true });
    fields.addEventListener('touchmove', mark, { passive: true });
    fields.addEventListener('keydown', onKey);
    return () => {
      fields.removeEventListener('wheel', mark);
      fields.removeEventListener('touchmove', mark);
      fields.removeEventListener('keydown', onKey);
    };
  }, [attackEpoch]);
  useEffect(() => {
    if (attackEpoch === null || busy || scrolledEpoch.current === attackEpoch) return;
    scrolledEpoch.current = attackEpoch;
    if (userScrolledEpoch.current === attackEpoch || window.matchMedia?.(PC_QUERY).matches) return;
    const mine = document.querySelector(`[data-fileira="${rowKey(me, 'ATK')}"]`);
    const target = document.querySelector(`[data-fileira="${rowKey(opponent, 'DEF')}"]`);
    if (!mine || (insideFields(mine) && (target === null || insideFields(target)))) return;
    mine.scrollIntoView?.({ block: 'end', behavior: 'auto' });
  }, [attackEpoch, busy, me, opponent]);

  // Depois de ressuscitar pelo diálogo, o foco vai para a barra: o botão que abriu pode já nem existir.
  useEffect(() => {
    if (graveyard !== null || !closedByPick.current) return;
    closedByPick.current = false;
    focusBar();
  }, [graveyard, focusBar]);

  const targetIds = useMemo(() => new Set(play?.targets?.map((t) => t.id) ?? []), [play]);

  /** O menu troca as preferências: vão para o armazenamento (se há), para o som e para a sessão, que as aplica já. */
  const changePrefs = useCallback(
    (prefs: Prefs) => {
      if (store) savePrefs(store, prefs);
      // Já, e não só pelo efeito da mesa: o clique na chave "Som" chega ao ouvinte do documento depois do React, e é
      // esse ouvinte que ativa o áudio. Não depende de o React esvaziar os efeitos antes de o clique chegar lá.
      sound.setEnabled(prefs.sound);
      session.setPrefs(prefs);
    },
    [store, session, sound],
  );

  let panel: ReactNode;
  if (barPhase) {
    panel = (
      <ActionBar
        view={view}
        names={names}
        plays={plays}
        acting={acting}
        pending={pending}
        disabled={locked}
        passed={passed}
        events={state.events}
        card={card}
        play={play}
        pointedId={pointedId}
        notice={snapshot.notice}
        marked={snapshot.marks.cards}
        // O foco que a própria mesa leva ao primeiro alvo não aponta nem apaga a marca: só o do jogador.
        onSeen={(id) => {
          if (!programmatic.current) session.markSeen(id);
        }}
        onPoint={(id) => {
          if (!programmatic.current) setPointedId(id);
        }}
        onPlay={choosePlay}
        onTarget={chooseTarget}
        onSend={send}
        onResurrect={() => setGraveyard('resurrect')}
        onCancel={cancel}
        barRef={barRef}
      />
    );
  } else if (phase === 'EQUIP') {
    panel = (
      <EquipPanel
        view={view}
        names={names}
        legal={legal}
        draft={snapshot.equipDraft}
        confirmed={snapshot.equipConfirmed}
        pending={pending}
        notice={snapshot.notice}
        disabled={locked}
        onChoose={(destination) => {
          if (!locked) session.equipChoose(destination);
        }}
        onUndo={() => {
          if (!locked) session.equipUndo();
        }}
        onReset={() => {
          if (!locked) session.equipReset();
        }}
        onConfirm={() => {
          if (!locked) void session.equipConfirm().catch(noop);
        }}
        panelRef={barRef}
      />
    );
  } else if (phase === 'ORDER_CHOICE') {
    panel = (
      <OrderPanel
        view={view}
        names={names}
        choosing={ordering}
        autoAt={snapshot.orderAutoAt}
        now={now}
        disabled={locked}
        notice={snapshot.notice}
        onChoose={(first) => send({ type: 'CHOOSE_ORDER', first })}
        onInteract={interact}
        panelRef={barRef}
      />
    );
  }

  return (
    <>
      <Table
        snapshot={snapshot}
        remainingMs={remainingMs}
        locked={locked}
        selectedCardId={cardId}
        targetIds={targetIds}
        onSelectCard={acting && !passed ? selectCard : undefined}
        onSelectTarget={hasTargets ? chooseTarget : undefined}
        // O foco que a própria mesa move (incluindo o que ela devolve depois de um pulo) não apaga marca.
        onSeen={(key) => {
          if (!programmatic.current) session.markSeen(key);
        }}
        onOpenGraveyard={() => setGraveyard('view')}
        onOpenMenu={() => setMenuOpen(true)}
        onInteract={interact}
        actionBar={panel}
        training={training}
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
      <GameMenu
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
        prefs={snapshot.prefs}
        onPrefs={changePrefs}
        inviteLink={inviteLink}
        loadVersion={loadVersion}
        onExit={onExit}
        // No treino o passe automático não se aplica (spec §2.6): a sessão não o manda, e o menu não oferece a chave.
        showAutoPass={training === undefined}
        trainingLevel={training}
        concedeWarning={concedeWarning}
        canConcede={room?.status === 'PLAYING' && phase !== 'GAME_OVER'}
        concedeDisabled={snapshot.status === 'reconnecting'}
        onConcede={() => void session.concede().catch(noop)}
      />
      {showEnd ? (
        <EndPanel
          // O recolhimento ("Ver a mesa") vale para uma partida só.
          key={outcome.gameNo}
          outcome={outcome}
          score={room.score}
          me={view.me}
          names={names}
          mineWants={room.seats.find((seat) => seat.playerId === view.me)?.wantsRematch ?? false}
          theirsWants={room.seats.find((seat) => seat.playerId !== view.me)?.wantsRematch ?? false}
          away={room.seats.find((seat) => seat.playerId !== view.me)?.connected === false}
          disabled={snapshot.status === 'reconnecting'}
          onRematch={(want) => session.rematch(want)}
          onNewRoom={onNewRoom}
          newRoomLabel={newRoomLabel}
          onReview={pastGame?.replay === undefined ? undefined : () => navigate(`/partidas/${pastGame.id}`)}
        />
      ) : null}
    </>
  );
}
