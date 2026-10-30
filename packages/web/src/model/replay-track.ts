// O replay de uma partida como uma trilha de quadros (polimento, fatia 2). Puro: sem React nem DOM. O `buildTrack` re-executa o
// replay no motor (`createGame` + `applyAction` por passo) e guarda, para cada passo, o `state` que a mesa teria ao vivo, a rodada
// e o histórico até ali. A interface não tem regra: o que a mesa mostra é a `view` do motor.
//
// Quem consome é a tela do replay (chunk preguiçoso): ela guarda a trilha, mantém um `Stage` montado entre os passos e pede a
// mensagem do salto ao `frameMessage` e o snapshot ao `replaySnapshot`.
import {
  applyAction,
  createGame,
  viewEvents,
  viewFor,
  type GameEvent,
  type GameResult,
  type GameState,
  type PlayerId,
  type Replay,
} from '@coringa/engine';
import type { RoomMessage, StateMessage } from '@coringa/protocol';
import type { Names } from '@coringa/sim/text';
import { appendHistory, EMPTY_HISTORY, forGame, type HistoryState } from './history.ts';
import { NO_MARKS } from './marks.ts';
import type { SessionSnapshot } from './session.ts';
import type { StoredResult } from './past-games.ts';
import type { Prefs } from './storage.ts';

export interface ReplayFrame {
  /** O `state` do quadro: `seq` = índice + 1, `epoch` = índice, sem prazo. O quadro 0 vem sem eventos. */
  state: StateMessage;
  /** A rodada em que a partida está neste quadro. */
  round: number;
  /** As linhas do histórico até este quadro, montadas passo a passo com o `state` ao vivo de cada um. */
  history: HistoryState;
}

export interface ReplayTrack {
  /**
   * O quadro 0 é o começo (sem eventos); o quadro `i` é o estado depois do passo `i`, com os eventos dele vistos do assento.
   * Vazio só quando a partida nem foi criada (`stoppedAt.step === 0`): quem usa a trilha confere o tamanho antes.
   */
  frames: ReplayFrame[];
  /**
   * Onde a trilha parou antes do fim do replay: o passo `step` (contado a partir de 1) que o motor recusou ou que falhou, ou
   * `0` para uma partida que não foi criada. Os quadros vão até o passo anterior. `null` quando o replay inteiro rodou.
   */
  stoppedAt: { step: number; message: string } | null;
  /** O primeiro quadro de cada rodada, na ordem. */
  rounds: { round: number; frame: number }[];
}

const MALFORMED_REPLAY = 'replay malformado';
const MALFORMED_STEP = 'jogada malformada';

/** Um quadro: o `state` ao vivo do passo (a vista e os eventos do assento `me`) e o histórico acrescido dele. */
function makeFrame(state: GameState, events: GameEvent[], index: number, before: HistoryState, me: PlayerId, names: Names): ReplayFrame {
  const view = viewFor(state, me);
  const message: StateMessage = {
    t: 'state',
    seq: index + 1,
    epoch: index,
    view,
    events: viewEvents(events, me),
    deadline: null,
    serverNow: 0,
  };
  return { state: message, round: view.round, history: appendHistory(before, message, names) };
}

/** O primeiro quadro de cada rodada. */
function firstFrames(frames: readonly ReplayFrame[]): ReplayTrack['rounds'] {
  const rounds: ReplayTrack['rounds'] = [];
  frames.forEach((frame, index) => {
    if (rounds.length === 0 || rounds[rounds.length - 1]!.round !== frame.round) rounds.push({ round: frame.round, frame: index });
  });
  return rounds;
}

/**
 * Re-executa o replay e devolve os quadros vistos do assento `me`. Nunca lança: o motor que recusa um passo (adulterado,
 * malformado) ou lança, ou uma partida que não se cria, viram `stoppedAt`, e a trilha vai até o passo anterior.
 */
export function buildTrack(replay: Replay, me: PlayerId, names: Names): ReplayTrack {
  const frames: ReplayFrame[] = [];
  const stop = (step: number, message: string): ReplayTrack => ({
    frames,
    stoppedAt: { step, message },
    rounds: firstFrames(frames),
  });

  let state: GameState;
  let steps: Replay['steps'];
  let total: number;
  try {
    steps = replay.steps;
    total = steps.length; // sem a lista de passos, lança aqui e a trilha nem começa
    const created = createGame(replay.config, replay.seed, replay.players);
    if (!created.ok) return stop(0, created.error.message);
    state = created.state;
    frames.push(makeFrame(state, [], 0, EMPTY_HISTORY, me, names));
  } catch {
    return stop(0, MALFORMED_REPLAY);
  }

  for (let step = 1; step <= total; step += 1) {
    try {
      const { player, action } = steps[step - 1]!;
      const result = applyAction(state, player, action);
      if (!result.ok) return stop(step, result.error.message);
      state = result.state;
      frames.push(makeFrame(state, result.events, step, frames[step - 1]!.history, me, names));
    } catch {
      return stop(step, MALFORMED_STEP);
    }
  }
  return { frames, stoppedAt: null, rounds: firstFrames(frames) };
}

function frameAt(track: ReplayTrack, index: number): ReplayFrame {
  const frame = track.frames[index];
  if (frame === undefined) throw new RangeError(`o quadro ${index} não existe (a trilha tem ${track.frames.length})`);
  return frame;
}

/** A mensagem de um salto, uma por quadro: o palco compara o `state` por identidade e refaz as batidas quando ele muda. */
const JUMPS = new WeakMap<StateMessage, StateMessage>();

/**
 * O `state` que a mesa recebe ao ir do quadro `from` ao quadro `to`:
 * - `to === from + 1`: o `state` do quadro, com os eventos do passo (a mesa toca as batidas, como ao vivo);
 * - qualquer outro salto (voltar, pular): o mesmo `state` sem eventos e com `resync`, que troca a mesa de uma vez, sem batidas
 *   (não é uma ressincronização de verdade: a nota do histórico vem pronta no quadro, sem "Mesa sincronizada").
 * `seq` = índice do quadro + 1. O mesmo quadro de chegada devolve sempre o mesmo objeto, mas a tela guarda a mensagem ao
 * navegar, em vez de pedi-la a cada render.
 */
export function frameMessage(track: ReplayTrack, from: number, to: number): StateMessage {
  const { state } = frameAt(track, to);
  if (to === from + 1) return state;
  let jump = JUMPS.get(state);
  if (jump === undefined) {
    jump = { ...state, events: [], resync: true };
    JUMPS.set(state, jump);
  }
  return jump;
}

/**
 * O snapshot que a mesa lê no replay: aberta, sem jogada possível nem em voo, sem aviso, sem marcas, com o histórico do
 * quadro `frame` (e não o da `message`, que pode ser um salto). `room` dá o número da partida e o placar; `me` é o assento da vista.
 */
export function replaySnapshot(track: ReplayTrack, message: StateMessage, frame: number, room: RoomMessage, prefs: Prefs): SessionSnapshot {
  return {
    status: 'open',
    stop: null,
    slowRetry: false,
    me: message.view.me,
    room,
    state: message,
    replay: null,
    legal: [],
    pending: false,
    notice: null,
    receivedAt: 0,
    equipDraft: [],
    equipConfirmed: 'none',
    orderAutoAt: null,
    marks: NO_MARKS,
    marksBaseSeq: null,
    history: forGame(frameAt(track, frame).history, room.gameNo),
    prefs,
  };
}

/** O resultado do fim de jogo do último quadro. `null` quando a trilha parou antes do fim ou a partida não acabou ali. */
export function trackResult(track: ReplayTrack): GameResult | null {
  if (track.stoppedAt !== null) return null;
  const phase = track.frames.at(-1)?.state.view.phase;
  return phase?.kind === 'GAME_OVER' ? phase.result : null;
}

/** Igualdade campo a campo (o JSON do armazenamento não garante a ordem das chaves; o guardado pode ser de regras antigas). */
function sameResult(a: GameResult, b: StoredResult): boolean {
  return b.kind === 'WIN' && a.reason === b.reason && a.winner === b.winner;
}

/**
 * A partida re-executada terminou diferente do que ficou guardado (as regras mudaram desde a gravação, mesmo com a mesma
 * `rulesVersion`)? Só confere quando a trilha foi até o fim e há resultado guardado: a parada tem o aviso próprio, e o abandono
 * (`stored` nulo) não tem resultado para conferir. Uma trilha que chegou ao fim sem a partida acabar diverge de qualquer resultado.
 */
export function diverges(track: ReplayTrack, stored: StoredResult | null): boolean {
  if (stored === null || track.stoppedAt !== null) return false;
  const result = trackResult(track);
  return result === null || !sameResult(result, stored);
}
