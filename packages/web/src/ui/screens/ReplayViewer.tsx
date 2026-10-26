// O visualizador do replay (spec do polimento §4.3): a mesa de sempre, só de vista, no passo `frame` da trilha, e os controles
// na barra de baixo. Quem monta a trilha é a `ReplayScreen`; aqui só se navega por ela.
//
// A mesa não tem regra: a `view` de cada passo vem da trilha (o motor re-executado, `replay-track.ts`), e a mesa a desenha.
// - No Equipar, as suas numéricas recebidas aparecem num bloco só de leitura acima dos controles (`ReplayEquip`), e o botão do
//   cemitério abre o diálogo de sempre, em modo só de ver (abri-lo pausa o "Tocar").
// - Os avisos da partida (outra versão das regras, resultado que não bate com o guardado, replay que parou) vão ao alto dos
//   controles. O foco vai ao título da mesa ao abrir.
// - Avançar um passo entrega a mensagem `state` do passo, com os eventos, e o `Stage` toca as batidas como ao vivo. Voltar,
//   "Início" e a rodada entregam o mesmo estado em `resync`, que troca a mesa de uma vez, sem batidas.
// - A mensagem do passo é calculada UMA vez por navegação, no clique ou no timer, e fica no estado junto com o passo. Pedi-la
//   no desenho, com o passo anterior já atualizado, a transformaria em `resync` no desenho seguinte e cortaria as batidas.
// - Cada clique parte do passo de agora (um redutor, com o estado anterior): cliques seguidos nunca empilham transições velhas.
// - Um `Stage` só, montado do começo ao fim: a `FlashLock` dele guarda as trocas claro ↔ escuro da tela inteira, e remontá-lo
//   por passo a esqueceria, e a regra de flash não valeria entre os passos.
// - "Tocar" avança um passo quando passaram 700 ms E o palco assentou. Um passo sem batida (o Equipar do oponente, um Equipar
//   vazio) nunca avisa que assentou, então a pergunta "está ocupado?" é feita ao palco quando os 700 ms acabam: se não está,
//   avança; se está, espera o `onSettled`. Pausar, navegar na mão ou sair da tela cancelam o timer e a espera.
import type { RoomMessage, SeatInfo, StateMessage } from '@coringa/protocol';
import { RULES_VERSION, type PlayerId } from '@coringa/engine';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { DIVERGED_TEXT, myName, opponentName, OTHER_RULES_VERSION_TEXT, replayStoppedText } from '../../model/past-games-copy.ts';
import type { PastGame } from '../../model/past-games.ts';
import { diverges, frameMessage, replaySnapshot, type ReplayTrack } from '../../model/replay-track.ts';
import type { Prefs } from '../../model/storage.ts';
import { Stage } from '../anim/Stage.tsx';
import { useReducedMotion } from '../anim/useReducedMotion.ts';
import { GraveyardDialog } from '../table/GraveyardDialog.tsx';
import { Table } from '../table/Table.tsx';
import { ReplayControls } from './ReplayControls.tsx';
import { ReplayEquip } from './ReplayEquip.tsx';

/** Quanto "Tocar" espera entre um passo e o seguinte (além de o palco assentar). */
const PLAY_STEP_MS = 700;

/** A mesa do replay não tem relógio: nenhum prazo chega a ela. */
const remainingMs = (): number => 0;

/** O cemitério do replay é só para ver: nada a ressuscitar. */
const NO_RESURRECT: [] = [];
const noop = (): void => undefined;

export interface ReplayViewerProps {
  game: PastGame;
  /** A trilha do replay. Tem que ter ao menos o quadro 0 (a `ReplayScreen` não abre o visualizador sem ele). */
  track: ReplayTrack;
  prefs: Prefs;
}

/** O passo de agora, a mensagem que a mesa recebeu ao chegar nele e se "Tocar" está ligado. */
interface Nav {
  frame: number;
  message: StateMessage;
  playing: boolean;
}

type NavAction =
  | { kind: 'to'; frame: number }
  | { kind: 'by'; delta: number }
  | { kind: 'play' }
  | { kind: 'pause' }
  | { kind: 'tick' };

/**
 * Vai ao passo pedido, dentro da trilha. `jump`: o salto de "Início" e da rodada, que troca a mesa de uma vez, sem batidas, até
 * quando o destino é o passo seguinte (o `frameMessage` só devolve o salto quando o destino não é o passo seguinte do de partida).
 * Os outros movimentos, um passo à frente, tocam as batidas do passo.
 */
function move(track: ReplayTrack, nav: Nav, requested: number, playing: boolean, jump = false): Nav {
  const last = track.frames.length - 1;
  const to = Number.isFinite(requested) ? Math.min(Math.max(Math.trunc(requested), 0), last) : nav.frame;
  if (to === nav.frame) return playing === nav.playing ? nav : { ...nav, playing };
  return { frame: to, message: frameMessage(track, jump ? to : nav.frame, to), playing };
}

function reduce(track: ReplayTrack, nav: Nav, action: NavAction): Nav {
  const last = track.frames.length - 1;
  switch (action.kind) {
    // Navegar na mão pausa.
    case 'to':
      return move(track, nav, action.frame, false, true);
    case 'by':
      return move(track, nav, nav.frame + action.delta, false);
    case 'play':
      return nav.frame >= last || nav.playing ? nav : { ...nav, playing: true };
    case 'pause':
      return nav.playing ? { ...nav, playing: false } : nav;
    // O passo do "Tocar": só vale se ainda está tocando (um pause já pode ter chegado), e para ao chegar no último.
    case 'tick':
      return nav.playing ? move(track, nav, nav.frame + 1, nav.frame + 1 < last) : nav;
  }
}

/** A sala que a mesa lê: a partida em curso (para o painel de fim nunca aparecer), com os apelidos nos assentos certos. */
function replayRoom(game: PastGame): RoomMessage {
  const seat = (playerId: PlayerId, nickname: string): SeatInfo => ({
    playerId,
    nickname,
    connected: true,
    ready: true,
    wantsRematch: false,
  });
  const mine = seat(game.seat, myName(game.names.me));
  const theirs = seat(game.seat === 'p1' ? 'p2' : 'p1', opponentName(game.names.opponent));
  return {
    t: 'room',
    code: game.mode.kind === 'online' ? game.mode.code : 'TREINO',
    status: 'PLAYING',
    seats: game.seat === 'p1' ? [mine, theirs] : [theirs, mine],
    score: game.score,
    gameNo: game.outcome.gameNo,
    expiresAt: 0,
  };
}

export function ReplayViewer(props: ReplayViewerProps) {
  // Uma trilha sem quadro nenhum (a partida nem foi criada) não tem o que mostrar: a `ReplayScreen` diz por quê.
  if (props.track.frames.length === 0) return null;
  return <Playback {...props} />;
}

function Playback({ game, track, prefs }: ReplayViewerProps) {
  const last = track.frames.length - 1;
  const [nav, setNav] = useState<Nav>(() => ({ frame: 0, message: track.frames[0]!.state, playing: false }));
  const dispatch = useCallback((action: NavAction) => setNav((prev) => reduce(track, prev, action)), [track]);

  const room = useMemo(() => replayRoom(game), [game]);
  const snapshot = useMemo(
    () => replaySnapshot(track, nav.message, nav.frame, room, prefs),
    [track, nav.message, nav.frame, room, prefs],
  );
  const reducedMotion = useReducedMotion(prefs.reduceMotion);

  const notices = useMemo(() => {
    const out: string[] = [];
    if (game.rulesVersion !== RULES_VERSION) out.push(OTHER_RULES_VERSION_TEXT);
    // A trilha foi até o fim e a partida terminou diferente do que ficou guardado: vale também com a mesma versão das regras.
    if (diverges(track, game.outcome.result)) out.push(DIVERGED_TEXT);
    if (track.stoppedAt !== null) out.push(replayStoppedText(track.stoppedAt.step, track.stoppedAt.message));
    return out;
  }, [game.rulesVersion, game.outcome.result, track]);

  // Ao abrir, o foco vai ao título da mesa (só ao montar: os passos nunca o devolvem para lá).
  const title = useRef<HTMLHeadingElement>(null);
  useEffect(() => title.current?.focus({ preventScroll: true }), []);

  // O cemitério, só para ver. Abri-lo pausa o "Tocar": a mesa de trás seguiria andando com os controles inertes sob o diálogo.
  const [graveyardOpen, setGraveyardOpen] = useState(false);
  const openGraveyard = useCallback(() => {
    setGraveyardOpen(true);
    dispatch({ kind: 'pause' });
  }, [dispatch]);

  // --- "Tocar" ---
  const root = useRef<HTMLDivElement>(null);
  /** Os 700 ms passaram com o palco ainda ocupado: o próximo `onSettled` avança. */
  const waitingForStage = useRef(false);
  const { playing, frame } = nav;
  useEffect(() => {
    if (!playing) return;
    const timer = window.setTimeout(() => {
      const stageBusy = root.current?.querySelector('[data-palco]')?.hasAttribute('data-ocupado') ?? false;
      if (stageBusy) waitingForStage.current = true;
      else dispatch({ kind: 'tick' });
    }, PLAY_STEP_MS);
    return () => {
      window.clearTimeout(timer);
      waitingForStage.current = false;
    };
  }, [playing, frame, dispatch]);

  const onSettled = useCallback(() => {
    if (!waitingForStage.current) return;
    waitingForStage.current = false;
    dispatch({ kind: 'tick' });
  }, [dispatch]);

  const controls = (
    <ReplayControls
      frame={frame}
      total={last}
      playing={playing}
      rounds={track.rounds}
      round={track.frames[frame]!.round}
      notices={notices}
      onStart={() => dispatch({ kind: 'to', frame: 0 })}
      onPrevious={() => dispatch({ kind: 'by', delta: -1 })}
      onNext={() => dispatch({ kind: 'by', delta: 1 })}
      onToggle={() => dispatch({ kind: playing ? 'pause' : 'play' })}
      onRound={(first) => dispatch({ kind: 'to', frame: first })}
    />
  );

  const { view } = nav.message;
  const bar = (
    <div className="flex flex-col gap-3">
      <ReplayEquip view={view} />
      {controls}
    </div>
  );

  return (
    <div ref={root} className="contents">
      <Stage snapshot={snapshot} reducedMotion={reducedMotion} onSettled={onSettled}>
        <Table
          snapshot={snapshot}
          remainingMs={remainingMs}
          replay
          actionBar={bar}
          onOpenGraveyard={openGraveyard}
          titleRef={title}
        />
        <GraveyardDialog
          mode={graveyardOpen ? 'view' : null}
          graveyard={view.graveyard}
          options={NO_RESURRECT}
          rowCounts={{ ATK: view.self.attackRow.length, DEF: view.self.defenseRow.length }}
          rowLimit={view.config.rowLimit}
          onPick={noop}
          onClose={() => setGraveyardOpen(false)}
        />
      </Stage>
    </div>
  );
}
