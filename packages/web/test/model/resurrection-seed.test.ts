// A semente do E2E da janela da Ressurreição (ponto 16, plano do bloco E, Tarefa 7). Com o jogador jogando como o `playOnce` do E2E
// (`e2e/helpers.ts`: o primeiro destino de cada numérica, atacar primeiro, passar a reação, atacar), a partida de treino contra o
// Médio abre a janela para ele cedo: é o que o `resurrection.spec.ts` mostra. O teste confere a semente; se uma regra ou o bot mudar e
// ela deixar de valer, procure outra com `findResurrectionSeed`.
//
// A troca da última carta não aparece no E2E: o jogador do `playOnce` põe toda numérica no Ataque e ataca em todo turno, então o
// Ataque perde a carta da frente a cada rodada e nunca fica cheio junto com a Defesa (em 200 sementes, nenhuma janela com as duas
// fileiras cheias). A troca e a fileira protegida ficam nos testes da mesa (`test/ui/resurrection-window.test.tsx`).
import { legalActions, nextEquipDestinations, type Action, type Destination, type PlayerView } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { RESURRECTION_E2E_SEED } from '../../e2e/seeds.ts';
import { LOCAL_ME, LocalRoom } from '../../src/model/local-room.ts';
import { tablePlays } from '../../src/model/plays.ts';

/** Timers e relógio de mentira: `runNext` dispara o timer mais cedo. */
class FakeTimers {
  now = 1_000;
  readonly pending = new Map<number, { at: number; fn: () => void }>();
  #id = 0;
  readonly setTimer = (fn: () => void, ms: number): unknown => {
    const id = ++this.#id;
    this.pending.set(id, { at: this.now + ms, fn });
    return id;
  };
  readonly clearTimer = (handle: unknown): void => {
    this.pending.delete(handle as number);
  };
  runNext(): boolean {
    let best: [number, { at: number; fn: () => void }] | null = null;
    for (const entry of this.pending) if (best === null || entry[1].at < best[1].at) best = entry;
    if (best === null) return false;
    this.pending.delete(best[0]);
    this.now = Math.max(this.now, best[1].at);
    best[1].fn();
    return true;
  }
}

/** A jogada do `playOnce` do E2E na vez do jogador; `null` fora dela (ou no Equipar vazio, que a sala manda sozinha). */
function e2eMove(view: PlayerView): Action | null {
  const legal = legalActions(view);
  if (legal.length === 0) return null;
  switch (view.phase.kind) {
    case 'EQUIP': {
      if (view.self.pending.length === 0) return null;
      const chosen: Destination[] = [];
      for (let i = 0; i < view.self.pending.length; i += 1) chosen.push(nextEquipDestinations(view, chosen)[0]!);
      return { type: 'EQUIP', destinations: chosen };
    }
    case 'ORDER_CHOICE':
      return { type: 'CHOOSE_ORDER', first: true };
    case 'ATTACK_MAIN':
      return legal.find((a) => a.type === 'DECLARE_ATTACK' || a.type === 'END_TURN') ?? null;
    case 'REACTION':
      return { type: 'PASS' };
    default:
      return null;
  }
}

interface WindowFound {
  round: number;
  /** As duas fileiras cheias e ao menos uma fileira que troca a última. */
  swap: boolean;
}

/** Joga a semente até a janela da Ressurreição abrir para o jogador (ou a partida acabar): onde ela abriu. */
async function firstWindow(seed: string): Promise<WindowFound | null> {
  const timers = new FakeTimers();
  const room = new LocalRoom({ seed, setTimer: timers.setTimer, clearTimer: timers.clearTimer, now: () => timers.now });
  room.connect();
  for (let i = 0; i < 6000 && room.room?.status !== 'FINISHED'; i += 1) {
    const view = room.state!.view;
    if (view.phase.kind === 'RESURRECTION' && view.phase.player === LOCAL_ME) {
      const plays = tablePlays(view, legalActions(view) as PlayerAction[]);
      const full = view.self.attackRow.length >= view.config.rowLimit && view.self.defenseRow.length >= view.config.rowLimit;
      const swap = full && plays.resurrect.some((item) => item.rows.some((row) => row.leaving !== null));
      return { round: view.round, swap };
    }
    const move = e2eMove(view);
    if (move === null) {
      if (!timers.runNext()) break;
      continue;
    }
    // O jogador espera a mesa (5 s) antes de jogar, se o bot não jogar antes.
    const next = Math.min(...[...timers.pending.values()].map((entry) => entry.at));
    if (next < timers.now + 5_000) {
      timers.runNext();
      continue;
    }
    timers.now += 5_000;
    await room.act(move as PlayerAction);
  }
  return null;
}

/** A procura que achou a semente (rodada à mão): a `e2e-quadra-<n>` em que a janela abre mais cedo, entre as `tries` primeiras. */
export async function findResurrectionSeed(tries: number): Promise<string | null> {
  let best: { seed: string; round: number } | null = null;
  for (let n = 0; n < tries; n += 1) {
    const found = await firstWindow(`e2e-quadra-${n}`);
    if (found && (best === null || found.round < best.round)) best = { seed: `e2e-quadra-${n}`, round: found.round };
  }
  return best?.seed ?? null;
}

describe('a semente do E2E da janela da Ressurreição', () => {
  it(`${RESURRECTION_E2E_SEED}: a janela abre para o jogador na rodada 4, a primeira revelação depois do 1º ataque`, async () => {
    expect(await firstWindow(RESURRECTION_E2E_SEED)).toEqual({ round: 4, swap: false });
  });
});

