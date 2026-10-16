import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  actingPlayers,
  applyAction,
  createGame,
  legalActions,
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
import { askChoice, type Io } from './io.ts';
import { actionText, cardText, DESTINATION_TEXT, eventText, namesFor, resultText } from './text.ts';

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
  result: GameResult;
  replay: Replay;
  savedTo: string | null;
}

type Equip = Extract<Action, { type: 'EQUIP' }>;

/** Equipar carta a carta: só oferece destinos que levam a uma combinação legal (com as fileiras cheias seriam até 81). */
async function askEquip(io: Io, view: PlayerView, legal: Action[]): Promise<Action> {
  const options = legal.filter((a): a is Equip => a.type === 'EQUIP');
  const chosen: Destination[] = [];
  for (const [i, card] of view.self.pending.entries()) {
    const fits = options.filter((a) => chosen.every((d, j) => a.destinations[j] === d));
    const destinations = [...new Set(fits.map((a) => a.destinations[i]))];
    if (destinations.length === 1) {
      io.print(`Carta ${i + 1}/${view.self.pending.length}: ${cardText(card)} → ${DESTINATION_TEXT[destinations[0]]} (única opção)`);
      chosen.push(destinations[0]);
      continue;
    }
    const pick = await askChoice(io, `Carta ${i + 1}/${view.self.pending.length}: ${cardText(card)}`, destinations.map((d) => DESTINATION_TEXT[d]));
    chosen.push(destinations[pick]);
  }
  const action = options.find((a) => a.destinations.every((d, j) => d === chosen[j]));
  if (!action) throw new Error('combinação de Equipar fora da lista legal');
  return action;
}

async function askHuman(io: Io, view: PlayerView, legal: Action[], names: ReturnType<typeof namesFor>): Promise<Action> {
  io.print(`\n${renderBoard(view, names)}`);
  if (view.phase.kind === 'EQUIP') return askEquip(io, view, legal);
  return legal[await askChoice(io, 'Ações legais:', legal.map((a) => actionText(a, view)))];
}

function save(replay: Replay, dir: string): string {
  mkdirSync(dir, { recursive: true });
  const path = join(dir, `${replay.seed}.json`);
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
  while (state.phase.kind !== 'GAME_OVER') {
    const actor = actingPlayers(state)[0];
    const view = viewFor(state, actor);
    const legal = legalActions(view);
    const action = actor === HUMAN ? await askHuman(io, view, legal, names) : bot(view, legal, rng);
    const result = applyAction(state, actor, action);
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
    steps.push({ player: actor, action });
    for (const e of viewEvents(result.events, HUMAN)) {
      const line = eventText(e, names);
      if (line !== null) io.print(line);
    }
    state = result.state;
  }
  const finalResult = state.phase.result;
  io.print(`\n${renderBoard(viewFor(state, HUMAN), names)}\n${resultText(finalResult, names)}`);
  const replay: Replay = { name: `play-${seed}`, config, seed, players: [HUMAN, BOT], steps };
  const dir = options.saveDir === undefined ? REPLAYS_DIR : options.saveDir;
  const savedTo = dir === null ? null : save(replay, dir);
  if (savedTo) io.print(`Partida salva em ${savedTo}`);
  return { result: finalResult, replay, savedTo };
}
