import { DEFAULT_CONFIG, createGame } from '@coringa/engine';
import type { GameEvent } from '@coringa/engine';
import type { StateMessage } from '@coringa/protocol';
import { hex } from './tokens.ts';
import type { CoreDeps, RoomRecord, SeatId } from './types.ts';
import { stateFor } from './views.ts';

/** Um passo do jogo: o `seq` dele, os eventos sem redação e a mensagem `state` de cada assento, montada na hora. */
export interface StateStep {
  seq: number;
  events: GameEvent[];
  messages: Record<SeatId, StateMessage>;
}

/**
 * Monta as mensagens `state` de um passo logo que ele acontece. Um estouro seguido de passos automáticos
 * gera vários passos, e cada um leva a visão daquele instante (`viewFor` clona o estado).
 */
export function makeStep(record: RoomRecord, events: GameEvent[], now: number): StateStep {
  return {
    seq: record.seq,
    events,
    messages: {
      p1: stateFor(record, 'p1', events, now),
      p2: stateFor(record, 'p2', events, now),
    },
  };
}

/**
 * Começa uma partida na sala (primeira ou revanche): semente nova, estado novo, `ready`/`wantsRematch`/`outcome`
 * zerados. `seq` e `epoch` só sobem, nunca voltam (spec §4.5). Muda o registro e devolve o primeiro passo.
 */
export function startGame(record: RoomRecord, deps: CoreDeps, now: number): StateStep {
  const seed = deps.newSeed ? deps.newSeed() : hex(deps.randomBytes(16));
  const created = createGame(DEFAULT_CONFIG, seed, ['p1', 'p2']);
  if (!created.ok) throw new Error(`configuração inválida: ${created.error.message}`);

  record.gameNo += 1;
  record.status = 'PLAYING';
  record.outcome = null;
  for (const seat of record.seats) {
    seat.ready = false;
    seat.wantsRematch = false;
  }
  record.seq += 1;
  record.epoch += 1;
  record.game = {
    gameNo: record.gameNo,
    seed,
    state: created.state,
    startedAt: now,
    steps: [],
    recent: [{ seq: record.seq, events: [] }],
    phaseStartedAt: now,
    phaseDeadlineAt: null,
    pausedTurnMs: null,
    heldPass: null,
    strikes: { p1: 0, p2: 0 },
    acks: { p1: [], p2: [] },
    cause: null,
  };
  return makeStep(record, [], now);
}
