// Toca as batidas do último `state` (spec §4.1): uma "máquina" por `state` (a linha do tempo, a batida de agora e se já
// acabou) e a inversão da tela inteira, que é do palco, não da linha do tempo de um `state`.
//
// A máquina nasce durante a renderização, no mesmo desenho em que a `view` nova chega, porque as cartas precisam do
// atraso da transição (e os controles, de saber que há batida) nesse desenho e não no seguinte. Os timers saem do efeito.
//
// A inversão (`filter: invert(1)`) segue outra regra: depois de ligada, só o seu próprio timer a desliga. Um `state` novo
// que chega no meio dela (o bot responde em ~600 ms) troca a linha do tempo, mas não corta nem esquece a inversão no ar.
// Quem decide se ela liga é a `FlashLock`, na hora de ligar (spec §10.4: o limite vale para a tela, não para um `state`).
import type { StateMessage } from '@coringa/protocol';
import { useCallback, useEffect, useRef, useState } from 'react';
import { damageBeatIndex, delaysOf } from '../../model/effects.ts';
import { FlashLock } from '../../model/flash.ts';
import { buildTimeline, timelineMs, type Beat, type TimelineOptions } from '../../model/timeline.ts';

export interface Run {
  state: StateMessage | null;
  beats: Beat[];
  totalMs: number;
  /** Atraso (ms) de cada `layoutId` que as batidas mexem. */
  delays: ReadonlyMap<string, number>;
  /** Índice da batida do dano (onde a vida e os totais contam), ou -1. */
  damageIndex: number;
}

interface Machine {
  run: Run;
  /** Batida de agora (índice em `run.beats`), ou -1 sem batida com duração. */
  index: number;
  done: boolean;
}

function makeMachine(state: StateMessage | null, options: TimelineOptions | null): Machine {
  const beats = state !== null && options !== null ? buildTimeline(state.events, options) : [];
  const run: Run = {
    state,
    beats,
    totalMs: timelineMs(beats),
    delays: delaysOf(beats),
    damageIndex: damageBeatIndex(beats),
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
  let current = machine;
  if (machine.run.state !== state) {
    const mode = state?.resync ? 'resync' : state?.catchUp ? 'catchUp' : 'live';
    current = makeMachine(state, { mode, reducedMotion, decisionPending });
    setMachine(current);
  }
  const { run } = current;

  // --- Inversão da tela inteira ---
  const [lock] = useState(() => new FlashLock());
  const [inverted, setInverted] = useState(false);
  const offTimer = useRef<number | null>(null);

  const invert = useCallback(
    (holdMs: number) => {
      if (offTimer.current !== null || !lock.request(clock(), holdMs)) return;
      setInverted(true);
      offTimer.current = window.setTimeout(() => {
        offTimer.current = null;
        setInverted(false);
      }, holdMs);
    },
    [lock],
  );

  /** Corta a inversão no ar (pulo): o desligar vale agora, e a trava conta o resfriamento daqui. */
  const cutInversion = useCallback(() => {
    if (offTimer.current === null) return;
    window.clearTimeout(offTimer.current);
    offTimer.current = null;
    lock.release(clock());
    setInverted(false);
  }, [lock]);

  useEffect(
    () => () => {
      if (offTimer.current !== null) window.clearTimeout(offTimer.current);
    },
    [],
  );

  // --- Batidas ---
  useEffect(() => {
    if (run.totalMs === 0) return;
    const timers: number[] = [];
    run.beats.forEach((beat, i) => {
      if (beat.durationMs > 0 && beat.startMs > 0) {
        timers.push(
          window.setTimeout(() => setMachine((m) => (m.run === run && !m.done ? { ...m, index: i } : m)), beat.startMs),
        );
      }
      if (beat.invert) {
        const { atMs, holdMs } = beat.invert;
        timers.push(window.setTimeout(() => invert(holdMs), atMs));
      }
    });
    timers.push(window.setTimeout(() => setMachine((m) => (m.run === run && !m.done ? { ...m, done: true } : m)), run.totalMs));
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [run, invert]);

  const skip = useCallback(() => {
    setMachine((m) => (m.done ? m : { ...m, done: true }));
    cutInversion();
  }, [cutInversion]);

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
    skip,
  };
}
