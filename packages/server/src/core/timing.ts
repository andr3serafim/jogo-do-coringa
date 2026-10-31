import type { GameEvent, Phase } from '@coringa/engine';
import { sceneAllowanceMs } from '@coringa/protocol';
import { withItem, withoutKinds } from './agenda.ts';
import { phaseKey } from './epoch.ts';
import { TIMERS } from './timers.ts';
import type { RoomRecord } from './types.ts';

/** O que a fase era antes do passo: a chave (para saber se a época muda), a fase e o prazo que ela tinha. */
export interface PhaseSnapshot {
  key: string;
  phase: Phase;
  deadlineAt: number | null;
}

/**
 * Prazos de fase (spec §6.2 e §6.4). Chamado depois de cada passo e na largada da partida, com o retrato de
 * antes do passo. Época sem mudança (a confirmação de um dos dois no Equipar, J seguido de Q, um Ás na reação)
 * mantém o prazo. Época nova: `phaseStartedAt = now`, o PASS guardado e os itens `phase`/`reactionMin` velhos
 * saem da agenda e o prazo da fase nova entra, junto com a `epoch` em que nasceu.
 *
 * - `EQUIP` 40 s; `ORDER_CHOICE` 10 s; `REACTION` 8 s.
 * - `ATTACK_MAIN` com `TurnStarted` começa com 30 s cheios; sem ele, é a volta de uma janela de K ou de Reflect e
 *   o turno retoma o que sobrou (`pausedTurnMs`), sem piso. Sem nenhum dos dois (cenário montado de fora), 30 s.
 * - A janela aberta por K ou Reflect no turno do oponente guarda o que sobrou do turno; a de um ataque, não
 *   (o turno acaba junto com ela).
 * - `GAME_OVER` não tem prazo.
 *
 * Folga de cena (sub-projeto 6 §9): o passo com cena rara (`sceneAllowanceMs` dos eventos) soma a cena ao prazo, e o relógio
 * fica parado até `clockRunsFrom`. Na mesma época (a Defesa Absoluta no próprio turno), o prazo que já existia cresce e o
 * alarme o acompanha; numa época nova, a folga entra na duração da fase.
 */
export function schedulePhase(record: RoomRecord, prev: PhaseSnapshot, events: GameEvent[], now: number): void {
  const game = record.game;
  if (!game) throw new Error('schedulePhase sem partida');
  const allowance = sceneAllowanceMs(events);
  if (phaseKey(game.state) === prev.key) {
    if (allowance > 0 && game.phaseDeadlineAt !== null) {
      game.phaseDeadlineAt += allowance;
      game.clockRunsFrom = Math.max(now, game.clockRunsFrom ?? now) + allowance;
      armPhaseAlarm(record, game.phaseDeadlineAt);
    }
    return;
  }

  const phase = game.state.phase;
  game.phaseStartedAt = now;
  game.heldPass = null;
  record.agenda = withoutKinds(record.agenda, ['phase', 'reactionMin']);

  let durationMs: number | null = null;
  switch (phase.kind) {
    case 'EQUIP':
      durationMs = TIMERS.equipMs;
      break;
    case 'ORDER_CHOICE':
      durationMs = TIMERS.orderMs;
      break;
    case 'ATTACK_MAIN': {
      const newTurn = events.some((event) => event.type === 'TurnStarted');
      durationMs = !newTurn && game.pausedTurnMs !== null ? game.pausedTurnMs : TIMERS.turnMs;
      game.pausedTurnMs = null;
      break;
    }
    case 'REACTION':
      durationMs = TIMERS.reactionMs;
      // De uma reação para outra (a Devastação respondida com Reflect, F3), o tempo guardado do turno fica para quando ele voltar.
      if (prev.phase.kind !== 'REACTION') {
        game.pausedTurnMs =
          prev.phase.kind === 'ATTACK_MAIN' && phase.trigger !== 'ATTACK' && prev.deadlineAt !== null
            ? Math.max(0, prev.deadlineAt - now)
            : null;
      }
      break;
    case 'GAME_OVER':
      game.pausedTurnMs = null;
      break;
  }

  if (durationMs === null) {
    game.phaseDeadlineAt = null;
    game.clockRunsFrom = null;
    return;
  }
  game.phaseDeadlineAt = now + durationMs + allowance;
  game.clockRunsFrom = allowance > 0 ? now + allowance : null;
  armPhaseAlarm(record, game.phaseDeadlineAt);
}

/** O prazo mostrado é `deadlineAt`; o `TIMEOUT` só vale depois da margem de rede (spec §6.6). Troca o item `phase` que houver. */
function armPhaseAlarm(record: RoomRecord, deadlineAt: number): void {
  record.agenda = withItem(withoutKinds(record.agenda, ['phase']), {
    kind: 'phase',
    at: deadlineAt + TIMERS.graceMs,
    epoch: record.epoch,
  });
}
