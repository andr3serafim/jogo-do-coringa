// Apoio dos testes de animação: a mesa jogável sobre uma `Session` de verdade com `FakeConnection`, timers falsos, os
// `state`s de cada cenário e os observadores do palco (inversão, batida, cena, faixa).
import type { GameEvent } from '@coringa/engine';
import type { StateMessage } from '@coringa/protocol';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { expect, vi } from 'vitest';
import { FLASH_MAX_SWITCHES, FLASH_WINDOW_MS } from '../../src/model/flash.ts';
import { Session } from '../../src/model/session.ts';
import { DEFAULT_PREFS, type Prefs } from '../../src/model/storage.ts';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { FakeConnection, scenarioAt, stateMessage, type ViewSpec } from '../fixtures.ts';
import { roomMessage } from './support.tsx';

export const seatOf = (playerId: 'p1' | 'p2', nickname: string, extra: { connected?: boolean; woAt?: number } = {}) => ({
  playerId,
  nickname,
  connected: true,
  ready: true,
  wantsRematch: false,
  ...extra,
});

/** A minha vez de atacar: ATK 152 contra a DEF 42 de Duda, com a mão e a barra de ação à vista. */
export const MINE: ViewSpec = {
  round: 7,
  self: {
    hp: 187,
    hand: ['K', 'A', 'Q'],
    attackRow: [8, 4, 10, 7, 9],
    defenseRow: [3, 6, 9, 5],
    attackBuffs: ['J', 'WILD'],
    defenseBuffs: ['Q'],
    guard: ['K'],
  },
  opponent: {
    hp: 214,
    hand: ['A', 'K', 'WILD'],
    attackRow: [6, 9, 3, 10],
    defenseRow: [5, 7, 2],
    attackBuffs: ['J'],
    defenseBuffs: ['Q', 'Q'],
    guard: ['K'],
  },
  graveyard: [3, 5, 8],
};

/** A vez de Duda: eu não tenho decisão esperando, então a linha do tempo toca inteira (sem o teto de 1 s). */
export const THEIRS: ViewSpec = { ...MINE, phase: 'WAITING' };

export const EXODIA_OVER: ViewSpec = {
  ...THEIRS,
  phase: { kind: 'GAME_OVER', result: { kind: 'WIN', winner: 'p2', reason: 'EXODIA' } },
};

export const EXODIA: GameEvent = { type: 'Exodia', player: 'p2' };
export const ABSOLUTE: GameEvent = { type: 'AbsoluteAttack', player: 'p2' };
export const TURN: GameEvent = { type: 'TurnStarted', player: 'p2' };
export const ATTACK: GameEvent = { type: 'AttackDeclared', player: 'p2' };
export const HIT: GameEvent = { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 100, defense: 50, damage: 50 };

const sessions: Session[] = [];
let seq = 1;

/** Para o `afterEach` de cada arquivo de teste: descarta as sessões e devolve os timers e os globais. */
export function cleanup() {
  for (const session of sessions.splice(0)) session.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
}

export interface MountOptions {
  prefs?: Partial<Prefs>;
  /** Eventos do `state` com que a mesa abre. */
  events?: GameEvent[];
  room?: Parameters<typeof roomMessage>[0];
}

export function connect(spec: ViewSpec, options: MountOptions = {}) {
  vi.useFakeTimers();
  vi.setSystemTime(10_000);
  // A Testing Library só avança os timers falsos de um `jest` global; sem ele, o `await user.click` espera para sempre.
  // O `act` embrulha o avanço: um timer da mesa que dispara no meio de um `user.click` atualiza o estado dentro do `act`
  // (fora dele o React deixa a atualização na fila e, com os timers falsos, ela nunca sai).
  const advanceInAct = (ms: number) => {
    act(() => {
      vi.advanceTimersByTime(ms);
    });
  };
  vi.stubGlobal('jest', { advanceTimersByTime: advanceInAct });
  const { state: game, view } = scenarioAt(spec);
  const room = roomMessage({
    status: 'PLAYING',
    seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda')],
    score: { p1: 0, p2: 0, draws: 0 },
    ...options.room,
  });
  seq = 1;
  const connection = new FakeConnection({
    playerId: 'p1',
    room,
    state: stateMessage(view, { seq, events: options.events ?? [] }),
    now: 0,
  });
  const session = new Session(
    connection,
    {
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    },
    { ...DEFAULT_PREFS, ...options.prefs },
  );
  sessions.push(session);
  const user = userEvent.setup({ advanceTimers: advanceInAct });
  return { game, view, connection, session, user };
}

export function mount(spec: ViewSpec = THEIRS, options: MountOptions = {}) {
  const base = connect(spec, options);
  const rendered = render(<PlayTable session={base.session} />);
  return { ...base, ...rendered };
}

export type Mounted = ReturnType<typeof mount>;

/** Entrega um `state` novo (o `seq` sobe a cada um). */
export function emit(m: Pick<Mounted, 'connection'>, spec: ViewSpec, events: GameEvent[], extra: Partial<Omit<StateMessage, 't' | 'view'>> = {}) {
  seq += 1;
  act(() => m.connection.emitState(stateMessage(scenarioAt(spec).view, { seq, events, ...extra })));
}

export function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}

export const stage = (container: HTMLElement) => container.querySelector<HTMLElement>('[data-palco]')!;
export const busy = (container: HTMLElement) => stage(container).hasAttribute('data-ocupado');
export const inverted = (container: HTMLElement) => stage(container).hasAttribute('data-invertido');
export const scene = (container: HTMLElement) => container.querySelector('[data-cena]');
/** A cortina escura da cena (a tela inteira escurecida) está no ar. */
export const curtainUp = (container: HTMLElement) => container.querySelector('[data-cortina][data-ativa]') !== null;
export const banner = (container: HTMLElement) => container.querySelector('[data-faixa]');

/** Anda o tempo de 10 em 10 ms e anota o instante de cada troca claro ↔ escuro do palco. */
export function watchInversion(container: HTMLElement) {
  return watchFlips(() => inverted(container));
}

/** Anda o tempo de 10 em 10 ms e anota o instante em que `probe` muda de valor. */
export function watchFlips(probe: () => boolean) {
  const flips: number[] = [];
  let was = probe();
  let elapsed = 0;
  const sample = () => {
    const now = probe();
    if (now !== was) flips.push(elapsed);
    was = now;
  };
  return {
    flips,
    /** Confere agora, sem andar o tempo (depois de um clique). */
    sample,
    run(ms: number) {
      for (let i = 0; i < ms / 10; i++) {
        advance(10);
        elapsed += 10;
        sample();
      }
    },
  };
}

/**
 * Como `watchFlips`, para vários observadores no mesmo relógio: `flips[i]` são as trocas de `probes[i]` e `all`, as de todos
 * juntos, em ordem (a spec §10.4 soma tudo o que estiver na tela).
 */
export function watchMany(probes: Array<() => boolean>) {
  const flips: number[][] = probes.map(() => []);
  const all: number[] = [];
  const was = probes.map((probe) => probe());
  let elapsed = 0;
  const sample = () => {
    probes.forEach((probe, i) => {
      const now = probe();
      if (now !== was[i]) {
        flips[i]!.push(elapsed);
        all.push(elapsed);
      }
      was[i] = now;
    });
  };
  return {
    flips,
    all,
    sample,
    run(ms: number) {
      for (let i = 0; i < ms / 10; i++) {
        advance(10);
        elapsed += 10;
        sample();
      }
    },
  };
}

/** O observador amostra de 10 em 10 ms: um instante anotado pode estar até 10 ms depois do real. */
export const SAMPLE_MS = 10;

/** Nenhuma janela de 1 s tem mais de 3 trocas (spec §10.4): a quarta troca seguida fica a ≥ 1 s da primeira. */
export function expectFlashSafe(flips: number[]) {
  for (let i = 0; i + FLASH_MAX_SWITCHES < flips.length; i++) {
    expect(flips[i + FLASH_MAX_SWITCHES]! - flips[i]!).toBeGreaterThanOrEqual(FLASH_WINDOW_MS - SAMPLE_MS);
  }
}

export const bar = () => screen.getByRole('region', { name: 'Ações' });
export const handList = () => within(screen.getByRole('list', { name: 'Sua mão' }));

