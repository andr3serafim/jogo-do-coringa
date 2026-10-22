// Toca as batidas do último `state` (spec §4.1): uma "máquina" por `state` (a linha do tempo, a batida de agora e se já
// acabou), a inversão da tela inteira e a cortina escura das cenas, que são do palco, não da linha do tempo de um `state`.
//
// A máquina nasce durante a renderização, no mesmo desenho em que a `view` nova chega, porque as cartas precisam do
// atraso da transição (e os controles, de saber que há batida) nesse desenho e não no seguinte. Os timers saem do efeito.
//
// A inversão (`filter: invert(1)`) e a cortina (o escurecimento de tela inteira da cena) seguem outra regra: depois de
// ligadas, só o seu próprio timer as desliga. Um `state` novo que chega no meio delas (o bot responde em ~600 ms) troca
// a linha do tempo, mas não as corta nem as esquece. As duas passam pela MESMA `FlashLock` (spec §10.4: o limite de
// 3 trocas claro ↔ escuro em 1 s vale para a tela e soma tudo o que muda a luminância dela):
// - a inversão pede licença na hora de ligar; sem ela, a cena segue sem inversão;
// - a cortina sobe se a regra deixa (sem ela, a cena mostra só o painel) e desce quando nenhuma cena a segura, mas nunca
//   antes de 1 s no ar e nunca antes de a regra deixar: se a descida quebraria o limite, ela espera.
//
// Terminar na hora (pulo, ou um `state` novo no meio das batidas) também precisa terminar as transições de layout que o
// Motion deixou no ar, com o atraso que ainda faltava: a carta ficaria no lugar velho enquanto a mesa já mostra a `view`
// nova. O Motion não encerra uma transição em andamento quando a medida muda (o alvo é o mesmo), então as cartas que a
// linha do tempo velha mexia são remontadas (`marks`, que entram na `key` da carta) com transição de duração zero
// (`instant`): o elemento novo retoma de onde o velho estava e chega na hora.
//
// O pulo cancela os timers da linha do tempo (nenhuma inversão, cortina ou batida chega depois dele), e a inversão confere
// o movimento reduzido na hora de ligar: ligá-lo com a linha do tempo no ar também vale.
import type { StateMessage } from '@coringa/protocol';
import { useCallback, useEffect, useRef, useState } from 'react';
import { damageBeatIndex, dealsOf, delaysOf, pressureBeatIndex, type Deals } from '../../model/effects.ts';
import { FLASH_WINDOW_MS, FlashLock } from '../../model/flash.ts';
import { buildTimeline, timelineMs, type Beat, type TimelineOptions } from '../../model/timeline.ts';

/** A cortina fica no ar pelo menos 1 s: a subida e a descida não cabem numa janela de 1 s com a inversão no meio. */
export const CURTAIN_MIN_HOLD_MS = FLASH_WINDOW_MS;

export interface Run {
  state: StateMessage | null;
  beats: Beat[];
  /** Os eventos vieram de uma reconexão (`catchUp`): a faixa fica no ar da primeira à última faixa, sem subir e descer a cada batida. */
  catchUp: boolean;
  totalMs: number;
  /** Atraso (ms) de cada `layoutId` que as batidas mexem. */
  delays: ReadonlyMap<string, number>;
  /** Índice da batida do dano (onde a vida e os totais contam), ou -1. */
  damageIndex: number;
  /** Índice da batida em que o número da pressão muda, ou -1. */
  pressureIndex: number;
  /** As cartas que entram na batida do `CardsDealt`. */
  deals: Deals;
}

interface Machine {
  run: Run;
  /** Batida de agora (índice em `run.beats`), ou -1 sem batida com duração. */
  index: number;
  done: boolean;
}

/**
 * Os `layoutId` cujas transições foram encerradas na hora. `marks` só cresce (cada encerramento muda a `key` do elemento,
 * que remonta); `instant` são os que chegam sem animar, até o próximo `state`.
 */
export interface Released {
  marks: ReadonlyMap<string, number>;
  instant: ReadonlySet<string>;
  /** Quantos encerramentos houve (a mesa devolve o foco uma vez por encerramento). */
  serial: number;
  /** As cartas remontadas por ESTE encerramento (o último). */
  batch: ReadonlySet<string>;
}

const NO_RELEASE: Released = { marks: new Map(), instant: new Set(), serial: 0, batch: new Set() };

/** Encerra as transições da linha do tempo `ended` (se havia batida em curso); `next` é a que a substitui, se houver. */
function release(prev: Released, ended: Run | null, next: Run | null): Released {
  if (ended === null) return prev.instant.size === 0 ? prev : { ...prev, instant: new Set() };
  const marks = new Map(prev.marks);
  const instant = new Set<string>();
  for (const id of ended.delays.keys()) {
    marks.set(id, (marks.get(id) ?? 0) + 1);
    // O que a linha nova também mexe se anima de verdade, a partir de onde a velha o deixou.
    if (!next?.delays.has(id)) instant.add(id);
  }
  return { marks, instant, serial: prev.serial + 1, batch: new Set(ended.delays.keys()) };
}

function makeMachine(state: StateMessage | null, options: TimelineOptions | null): Machine {
  const beats = state !== null && options !== null ? buildTimeline(state.events, options) : [];
  const run: Run = {
    state,
    beats,
    catchUp: options?.mode === 'catchUp',
    totalMs: timelineMs(beats),
    delays: delaysOf(beats),
    damageIndex: damageBeatIndex(beats),
    pressureIndex: pressureBeatIndex(beats),
    deals: dealsOf(beats),
  };
  return { run, index: beats.findIndex((beat) => beat.durationMs > 0), done: run.totalMs === 0 };
}

/** O relógio da trava de flash: monotônico, em ms. */
const clock = (): number => performance.now();

export interface BeatPlayer {
  run: Run;
  /** Batida de agora, ou `null` fora das batidas. */
  beat: Beat | null;
  /** Índice dela em `run.beats` (-1 fora das batidas). */
  index: number;
  busy: boolean;
  inverted: boolean;
  /** A cortina escura da cena está no ar (ela segura um pouco além da batida, e a regra de flash pode segurá-la mais). */
  curtain: boolean;
  /** As transições de layout que acabaram na hora (pulo, ou `state` novo no meio das batidas). */
  released: Released;
  /** Termina as batidas na hora (toque na mesa, Esc): a `view` já é a de depois. */
  skip(): void;
}

export interface BeatPlayerOptions {
  reducedMotion: boolean;
  /** Há uma decisão do jogador esperando (spec §4.1): tudo cabe em 1 s. */
  decisionPending: boolean;
}

export function useBeatPlayer(
  state: StateMessage | null,
  { reducedMotion, decisionPending }: BeatPlayerOptions,
  onSettled?: () => void,
): BeatPlayer {
  // O `state` com que a mesa abre (recarregar a página, entrar na partida) já está feito: não há de onde animar.
  const [machine, setMachine] = useState(() => makeMachine(state, null));
  const [released, setReleased] = useState(NO_RELEASE);
  let current = machine;
  if (machine.run.state !== state) {
    const mode = state?.resync ? 'resync' : state?.catchUp ? 'catchUp' : 'live';
    current = makeMachine(state, { mode, reducedMotion, decisionPending });
    setMachine(current);
    // Um `state` novo no meio das batidas encerra as transições que a linha velha ainda tinha no ar.
    const ended = machine.done ? null : machine.run;
    setReleased((prev) => release(prev, ended, current.run));
  }
  const { run } = current;

  // O movimento reduzido vale na hora de ligar a inversão, não só quando a linha do tempo nasceu.
  const reduced = useRef(reducedMotion);
  useEffect(() => {
    reduced.current = reducedMotion;
  }, [reducedMotion]);

  const [lock] = useState(() => new FlashLock());

  // --- Inversão da tela inteira ---
  const [inverted, setInverted] = useState(false);
  const offTimer = useRef<number | null>(null);

  const invert = useCallback(
    (holdMs: number) => {
      if (reduced.current || offTimer.current !== null || !lock.request(clock(), holdMs)) return;
      setInverted(true);
      offTimer.current = window.setTimeout(() => {
        offTimer.current = null;
        setInverted(false);
      }, holdMs);
    },
    [lock],
  );

  /**
   * Corta a inversão no ar (pulo): desliga agora, se a trava deixa, e o resfriamento conta daqui. Se desligar agora faria a
   * quarta troca numa janela de 1 s (a cortina de uma cena anterior já gastou trocas), a inversão fica ligada até o
   * instante em que a conta deixa: a mesa já está livre, só o visual demora.
   */
  const cutInversion = useCallback(() => {
    if (offTimer.current === null) return;
    window.clearTimeout(offTimer.current);
    const now = clock();
    const off = lock.release(now);
    if (off > now) {
      offTimer.current = window.setTimeout(() => {
        offTimer.current = null;
        setInverted(false);
      }, off - now);
      return;
    }
    offTimer.current = null;
    setInverted(false);
  }, [lock]);

  // --- Cortina da cena ---
  const [curtain, setCurtain] = useState(false);
  const curtainUp = useRef(false);
  const curtainSince = useRef(0);
  const fallTimer = useRef<number | null>(null);

  /** Uma cena começa: a cortina sobe (se a regra deixa) ou, se já está no ar, fica (cancela a descida marcada). */
  const raiseCurtain = useCallback(() => {
    if (fallTimer.current !== null) window.clearTimeout(fallTimer.current);
    fallTimer.current = null;
    if (curtainUp.current) return;
    const now = clock();
    if (!lock.toggle(now)) return;
    curtainUp.current = true;
    curtainSince.current = now;
    setCurtain(true);
  }, [lock]);

  /** Nenhuma cena segura a cortina: ela desce depois de `minHoldMs` no ar, e só quando a regra de flash deixa. */
  const lowerCurtain = useCallback(
    (minHoldMs: number) => {
      if (!curtainUp.current) return;
      if (fallTimer.current !== null) window.clearTimeout(fallTimer.current);
      const attempt = (at: number) => {
        fallTimer.current = window.setTimeout(() => {
          fallTimer.current = null;
          const now = clock();
          if (!lock.toggle(now)) {
            attempt(lock.nextAllowed(now));
            return;
          }
          curtainUp.current = false;
          setCurtain(false);
        }, Math.max(0, at - clock()));
      };
      attempt(lock.nextAllowed(Math.max(clock(), curtainSince.current + minHoldMs)));
    },
    [lock],
  );

  // --- Batidas ---
  const timers = useRef<number[]>([]);
  /** A linha do tempo cujos timers ainda valem: o pulo a solta, e o que ela agendou deixa de acontecer. */
  const live = useRef<Run | null>(null);
  useEffect(() => {
    if (run.totalMs === 0) return;
    live.current = run;
    const mine: number[] = [];
    const at = (ms: number, action: () => void) =>
      mine.push(
        window.setTimeout(() => {
          if (live.current === run) action();
        }, ms),
      );
    run.beats.forEach((beat, i) => {
      if (beat.durationMs > 0 && beat.startMs > 0) {
        at(beat.startMs, () => setMachine((m) => (m.run === run && !m.done ? { ...m, index: i } : m)));
      }
      if (beat.invert) {
        const { atMs, holdMs } = beat.invert;
        at(atMs, () => invert(holdMs));
      }
      if (beat.kind === 'scene' && beat.scene !== null) {
        at(beat.startMs, raiseCurtain);
        at(beat.startMs + beat.durationMs, () => lowerCurtain(CURTAIN_MIN_HOLD_MS));
      }
    });
    at(run.totalMs, () => setMachine((m) => (m.run === run && !m.done ? { ...m, done: true } : m)));
    timers.current = mine;
    return () => {
      mine.forEach((timer) => window.clearTimeout(timer));
      if (live.current === run) live.current = null;
    };
  }, [run, invert, raiseCurtain, lowerCurtain]);

  // Um `state` novo trocou a linha do tempo no meio de uma cena: a cortina que ficou no ar desce, a não ser que a nova
  // linha também tenha cena (a cena dela a segura, e o fim dela a baixa). A descida respeita a espera mínima e a trava.
  const hasScene = run.beats.some((beat) => beat.kind === 'scene' && beat.scene !== null);
  useEffect(() => {
    if (!hasScene) lowerCurtain(CURTAIN_MIN_HOLD_MS);
  }, [run, hasScene, lowerCurtain]);

  // Ao sair da mesa, nenhum timer de inversão ou de cortina fica para trás.
  useEffect(
    () => () => {
      if (offTimer.current !== null) window.clearTimeout(offTimer.current);
      if (fallTimer.current !== null) window.clearTimeout(fallTimer.current);
    },
    [],
  );

  const skip = useCallback(() => {
    if (!current.done) setReleased((prev) => release(prev, current.run, null));
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
    live.current = null;
    setMachine((m) => (m.done ? m : { ...m, done: true }));
    cutInversion();
    // Sem a espera mínima da cena: o jogador pulou. A regra de flash ainda vale, e a cortina só desce quando ela deixa.
    lowerCurtain(0);
  }, [current, cutInversion, lowerCurtain]);

  // Avisa quem espera o fim das batidas (o painel de fim de partida), no fim natural ou no pulo.
  const settled = useRef(onSettled);
  useEffect(() => {
    settled.current = onSettled;
  }, [onSettled]);
  const notified = useRef<Run | null>(null);
  useEffect(() => {
    if (!current.done || run.totalMs === 0 || notified.current === run) return;
    notified.current = run;
    settled.current?.();
  }, [current.done, run]);

  return {
    run,
    beat: current.done ? null : (run.beats[current.index] ?? null),
    index: current.done ? -1 : current.index,
    busy: !current.done,
    inverted,
    curtain,
    released,
    skip,
  };
}
