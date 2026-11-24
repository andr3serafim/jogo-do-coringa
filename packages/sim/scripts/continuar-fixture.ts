// Ferramenta de quem muda uma regra e precisa das fixtures do E2E (`packages/web/e2e/fixtures/*.json`) na regra nova. O replay de uma
// fixture é a partida da regra antiga; na nova, os passos seguem legais até um ponto (a partida pode já ter mudado antes dele: a vida, a
// mesa). Esta ferramenta guarda os passos legais, continua a partida com os bots pedidos até o fim, procura entre sementes de bot uma
// continuação que satisfaça o critério e grava a fixture com a `RULES_VERSION` de agora. Ela lista as cenas a partir do passo pedido
// (`--desde`), para recontar os pontos que os specs conferem depois da primeira mudança.
//
// Uso: node packages/sim/scripts/continuar-fixture.ts <fixture> <bot do p1> <bot do p2> <critério> [desde] [guardar]
//   critério: `vence-p1`, `vence-p2`, `exodia-p2`. desde: o passo a partir do qual as cenas são listadas (padrão 0). guardar: no
//   máximo quantos passos da partida antiga ficam (padrão: todos os que a regra nova aceita).
import { readFileSync, writeFileSync } from 'node:fs';
import { applyAction, createGame, RULES_VERSION, type GameEvent, type GameState, type Replay, type ReplayStep } from '@coringa/engine';
import { BOTS, type BotName } from '../src/bots/index.ts';
import { runGame } from '../src/match.ts';

const [name, botA, botB, criterion, fromArg, keepArg] = process.argv.slice(2);
if (!name || !botA || !botB || !criterion) throw new Error('uso: <fixture> <bot do p1> <bot do p2> <critério> [desde]');
const bots = [BOTS[botA as BotName], BOTS[botB as BotName]] as const;
if (!bots[0] || !bots[1]) throw new Error(`bot desconhecido: ${botA} ou ${botB}`);
const from = Number(fromArg ?? 0);
const file = new URL(`../../web/e2e/fixtures/${name}.json`, import.meta.url);
const games = JSON.parse(readFileSync(file, 'utf8')) as Array<Record<string, unknown> & { replay: Replay; outcome: object }>;
const game = games[0]!;
const { replay } = game;

const won = (s: GameState, winner: 'p1' | 'p2', reason?: string): boolean =>
  s.phase.kind === 'GAME_OVER' &&
  s.phase.result.kind === 'WIN' &&
  s.phase.result.winner === winner &&
  (reason === undefined || s.phase.result.reason === reason);
const accepts: Record<string, (s: GameState) => boolean> = {
  'vence-p1': (s) => won(s, 'p1'),
  'vence-p2': (s) => won(s, 'p2'),
  'exodia-p2': (s) => won(s, 'p2', 'EXODIA'),
};
const accept = accepts[criterion];
if (!accept) throw new Error(`critério desconhecido: ${criterion}`);

function initial(): GameState {
  const created = createGame(replay.config, replay.seed, replay.players);
  if (!created.ok) throw new Error(created.error.message);
  return created.state;
}

/** Aplica `steps` a partir do começo; devolve o estado e os eventos de cada passo. Para no primeiro passo que a regra recusa. */
function play(steps: readonly ReplayStep[]): { state: GameState; kept: ReplayStep[]; events: Array<{ step: number; event: GameEvent }> } {
  let state = initial();
  const kept: ReplayStep[] = [];
  const events: Array<{ step: number; event: GameEvent }> = [];
  for (const step of steps) {
    const result = applyAction(state, step.player, step.action);
    if (!result.ok) break;
    for (const event of result.events) events.push({ step: kept.length, event });
    state = result.state;
    kept.push(step);
  }
  return { state, kept, events };
}

const legal = play(keepArg === undefined ? replay.steps : replay.steps.slice(0, Number(keepArg)));
console.log(`${name}: ${legal.kept.length} de ${replay.steps.length} passos legais na regra ${RULES_VERSION} (fase ${legal.state.phase.kind})`);
const firstChange = legal.events.find(({ event }) => event.type === 'AbsoluteDefenseEnded' || event.type === 'ReflectTriggered');
console.log(`primeiro evento da regra nova: ${firstChange ? `passo ${firstChange.step}, ${firstChange.event.type}` : 'nenhum'}`);

for (let i = 0; i < 500; i++) {
  const record = runGame({
    config: replay.config,
    seed: replay.seed,
    initial: legal.state,
    botSeed: `${replay.seed}/regra-${RULES_VERSION}-${i}`,
    bots: [bots[0], bots[1]],
    record: true,
  });
  if (!accept(record.finalState)) continue;
  const steps = [...legal.kept, ...(record.replay ?? [])];
  const { state, events } = play(steps);
  if (state.phase.kind !== 'GAME_OVER' || steps.length !== play(steps).kept.length) throw new Error('continuação que não fecha');
  const out = { ...game, rulesVersion: RULES_VERSION, rounds: state.round, outcome: { ...game.outcome, result: state.phase.result }, replay: { ...replay, steps } };
  writeFileSync(file, `${JSON.stringify([out, ...games.slice(1)])}\n`);
  console.log(`continuação ${i}: ${steps.length} passos, rodada ${state.round}, ${JSON.stringify(state.phase.result)}`);
  const rare = new Set([
    'AbsoluteAttack',
    'AbsoluteDefenseStarted',
    'AbsoluteDefenseEnded',
    'ReflectTriggered',
    'RowDevastated',
    'Exodia',
    'Resurrected',
    'CardStolen',
    'TrapUsed',
    'GameOver',
  ]);
  for (const { step, event } of events) {
    if (step >= from && rare.has(event.type)) console.log(`  passo ${step} → ${step + 1}: ${JSON.stringify(event)}`);
  }
  process.exit(0);
}
throw new Error('nenhuma continuação em 500 sementes satisfez o critério');
