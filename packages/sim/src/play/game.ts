import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  actingPlayers,
  applyAction,
  createGame,
  legalActions,
  nextEquipDestinations,
  viewEvents,
  viewFor,
  type Action,
  type Destination,
  type GameResult,
  type PlayerId,
  type PlayerView,
  type RulesConfig,
} from '@coringa/engine';
import { BOTS, type BotName } from '../bots/index.ts';
import type { ReplayStep } from '../match.ts';
import type { Replay } from '../replay.ts';
import { createRng } from '../rng.ts';
import { renderBoard } from './board.ts';
import { askChoice, QuitSignal, type Io } from './io.ts';
import { actionText, cardText, DESTINATION_TEXT, eventText, namesFor, resultText, type Names } from './text.ts';

export const HUMAN: PlayerId = 'voce';
export const BOT: PlayerId = 'bot';
export const REPLAYS_DIR = fileURLToPath(new URL('../../replays/', import.meta.url));

export interface PlayOptions {
  io: Io;
  seed: string;
  bot: BotName;
  config: RulesConfig;
  /** Pasta onde salvar o replay; null = não salvar. Padrão: packages/sim/replays/. */
  saveDir?: string | null;
}

export interface PlayOutcome {
  /** null = quem joga saiu no meio (Ctrl+C ou fim da entrada). */
  result: GameResult | null;
  replay: Replay;
  savedTo: string | null;
}

type Equip = Extract<Action, { type: 'EQUIP' }>;

/**
 * Equipar carta a carta: oferece os destinos que a regra deixa para cada carta (`nextEquipDestinations`). A lista legal traz
 * uma montagem por resultado; a escolha do jogador pode ser outra montagem válida (trocar duas vezes a mesma fileira).
 */
async function askEquip<A extends Action>(io: Io, view: PlayerView, legal: A[], signal?: AbortSignal): Promise<A> {
  const equip = legal.find((a): a is A & Equip => a.type === 'EQUIP');
  if (!equip) throw new Error('Equipar sem EQUIP na lista legal');
  const chosen: Destination[] = [];
  for (const [i, card] of view.self.pending.entries()) {
    const destinations = nextEquipDestinations(view, chosen);
    if (destinations.length === 1) {
      io.print(`Carta ${i + 1}/${view.self.pending.length}: ${cardText(card)} → ${DESTINATION_TEXT[destinations[0]!]} (única opção)`);
      chosen.push(destinations[0]!);
      continue;
    }
    const pick = await askChoice(io, `Carta ${i + 1}/${view.self.pending.length}: ${cardText(card)}`, destinations.map((d) => DESTINATION_TEXT[d]), signal);
    chosen.push(destinations[pick]!);
  }
  return { ...equip, destinations: chosen };
}

/** Mostra a mesa e pergunta a jogada (no Equipar, carta a carta). O `signal` cancela a pergunta pendente com `AbortError`. */
export async function askAction<A extends Action>(io: Io, view: PlayerView, legal: A[], names: Names, signal?: AbortSignal): Promise<A> {
  signal?.throwIfAborted();
  io.print(`\n${renderBoard(view, names)}`);
  if (view.phase.kind === 'EQUIP') return askEquip(io, view, legal, signal);
  return legal[await askChoice(io, 'Ações legais:', legal.map((a) => actionText(a, view)), signal)];
}

/**
 * O arquivo do replay de uma semente, sempre dentro de `dir`: o nome sai da semente com só letras, números, `-` e `_` (o resto
 * vira `_`), então `--semente ../x` não grava fora da pasta. Quando o saneamento muda a semente, o nome ganha um sufixo curto
 * dela, para "a.b" e "a_b" não caírem no mesmo arquivo.
 */
export function replayPath(dir: string, seed: string): string {
  const safe = seed.replace(/[^A-Za-z0-9_-]/g, '_');
  const name = safe === seed && safe !== '' ? safe : `${safe || 'semente'}-${createHash('sha256').update(seed).digest('hex').slice(0, 8)}`;
  const path = join(dir, `${name}.json`);
  if (!resolve(path).startsWith(resolve(dir) + sep)) throw new Error(`replay fora da pasta: ${path}`);
  return path;
}

function save(replay: Replay, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const path = replayPath(dir, replay.seed);
  writeFileSync(path, `${JSON.stringify(replay, null, 1)}\n`);
  return path;
}

/** Partida no terminal contra um bot, sem timers (spec §4). */
export async function playGame(options: PlayOptions): Promise<PlayOutcome> {
  const { io, seed, config } = options;
  const created = createGame(config, seed, [HUMAN, BOT]);
  if (!created.ok) throw new Error(created.error.message);
  let state = created.state;
  const bot = BOTS[options.bot];
  const rng = createRng(`${seed}/bot`);
  const names = namesFor(HUMAN, `Bot (${options.bot})`);
  const steps: ReplayStep[] = [];
  io.print(`Jogo do Coringa — você contra o bot ${options.bot} · semente "${seed}"`);
  io.print(`Iniciativa inicial: ${names.of(state.initiative)}`);
  for (const p of state.players) {
    if (p.id === HUMAN) io.print(`Você recebeu: ${[...p.hand, ...p.pending].map(cardText).join(' ')}`);
  }
  try {
    while (state.phase.kind !== 'GAME_OVER') {
      const actor = actingPlayers(state)[0];
      const view = viewFor(state, actor);
      const legal = legalActions(view);
      const action = actor === HUMAN ? await askAction(io, view, legal, names) : bot(view, legal, rng);
      const result = applyAction(state, actor, action);
      if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
      steps.push({ player: actor, action });
      for (const e of viewEvents(result.events, HUMAN)) {
        const line = eventText(e, names);
        if (line !== null) io.print(line);
      }
      state = result.state;
    }
  } catch (e) {
    if (!(e instanceof QuitSignal)) throw e;
  }
  const finalResult = state.phase.kind === 'GAME_OVER' ? state.phase.result : null;
  io.print(
    finalResult
      ? `\n${renderBoard(viewFor(state, HUMAN), names)}\n${resultText(finalResult, names)}`
      : `\nPartida interrompida na rodada ${state.round}.`,
  );
  const replay: Replay = { name: `play-${seed}`, config, seed, players: [HUMAN, BOT], steps };
  const dir = options.saveDir === undefined ? REPLAYS_DIR : options.saveDir;
  const savedTo = dir === null ? null : save(replay, dir);
  if (savedTo) io.print(`Partida salva em ${savedTo}`);
  return { result: finalResult, replay, savedTo };
}
