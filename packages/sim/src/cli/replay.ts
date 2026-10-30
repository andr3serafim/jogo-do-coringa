/**
 * `pnpm sim:replay <arquivo>`: reexecuta no motor uma partida gravada (spec §10.3).
 * Aceita um `Replay` puro (como os salvos pelo `pnpm play`) ou uma linha de log `{ evt: 'game.replay', replay }`
 * (a linha que o servidor escreve no fim de cada partida).
 */
import { readFileSync } from 'node:fs';
import { applyAction, createGame, type GameResult } from '@coringa/engine';
import type { Replay } from '../replay.ts';

export type ReplayOutcome =
  /** `result` nulo = sem GAME_OVER: partida abandonada (spec §7.2) ou gravação incompleta. */
  | { ok: true; result: GameResult | null; steps: number }
  | { ok: false; step: number; code: string; message: string };

function isReplay(value: unknown): value is Replay {
  if (typeof value !== 'object' || value === null) return false;
  const r = value as Record<string, unknown>;
  return (
    typeof r.seed === 'string' &&
    typeof r.config === 'object' &&
    r.config !== null &&
    Array.isArray(r.players) &&
    r.players.length === 2 &&
    Array.isArray(r.steps)
  );
}

/** Tira o `Replay` do JSON do arquivo, seja ele puro ou embrulhado numa linha `game.replay`. */
export function extractReplay(json: unknown): Replay {
  const candidate = typeof json === 'object' && json !== null && (json as { evt?: unknown }).evt === 'game.replay' ? (json as { replay?: unknown }).replay : json;
  if (!isReplay(candidate)) {
    throw new Error('o arquivo não é um replay: esperava um Replay (seed, config, players, steps) ou uma linha { evt: "game.replay", replay }');
  }
  return candidate;
}

/** Reexecuta a partida. Uma ação recusada falha no passo exato (contado a partir de 0, como no log). */
export function replayFile(path: string): ReplayOutcome {
  const replay = extractReplay(JSON.parse(readFileSync(path, 'utf8')));
  const created = createGame(replay.config, replay.seed, replay.players);
  if (!created.ok) throw new Error(`replay com configuração inválida: ${created.error.message}`);
  let state = created.state;
  for (const [step, { player, action }] of replay.steps.entries()) {
    const applied = applyAction(state, player, action);
    if (!applied.ok) return { ok: false, step, code: applied.error.code, message: applied.error.message };
    state = applied.state;
  }
  return { ok: true, result: state.phase.kind === 'GAME_OVER' ? state.phase.result : null, steps: replay.steps.length };
}

function describeResult(result: GameResult | null): string {
  if (result === null) return 'sem resultado (partida abandonada ou incompleta)';
  return `${result.winner} venceu (${result.reason})`;
}

if (import.meta.main) {
  try {
    const path = process.argv[2];
    if (!path) throw new Error('uso: pnpm sim:replay <arquivo.json>');
    const out = replayFile(path);
    if (out.ok) {
      console.log(`ok: ${out.steps} passos, ${describeResult(out.result)}`);
    } else {
      console.error(`falhou no passo ${out.step}: ${out.code} — ${out.message}`);
      process.exitCode = 1;
    }
  } catch (e) {
    console.error(`erro: ${e instanceof Error ? e.message : String(e)}`);
    process.exitCode = 1;
  }
}
