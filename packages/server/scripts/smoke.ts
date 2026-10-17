// Smoke no Node puro, sem bundler: carrega o motor, o protocolo e o núcleo da sala pelos imports reais e joga uma
// partida inteira, com dois sockets falsos e a primeira ação legal de quem age. O empacotamento do Worker é
// conferido pelo `wrangler deploy --dry-run` que o script `smoke` roda depois deste.
import { actingPlayers, legalActions, viewFor } from '@coringa/engine';
import { PROTOCOL_VERSION } from '@coringa/protocol';
import type { PlayerAction } from '@coringa/protocol';
import { RoomCore } from '../src/core/room-core.ts';
import { TIMERS } from '../src/core/timers.ts';
import type { Effects, SeatId, SocketInfo } from '../src/core/types.ts';

const MAX_STEPS = 5_000;

function fail(message: string): never {
  throw new Error(`smoke do servidor falhou: ${message}`);
}

const core = new RoomCore(null, { randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)) });
const sockets: SocketInfo[] = [];
const errors: string[] = [];
let now = Date.now();
let nextSocket = 1;

/** Aplica o que o núcleo pediu, como a casca faria: `attach` põe o assento, `close` tira o socket. */
function apply(effects: Effects): Effects {
  for (const { socketId, seat } of effects.attach) {
    const socket = sockets.find((candidate) => candidate.socketId === socketId);
    if (socket) socket.seat = seat;
  }
  for (const { socketId } of effects.close) {
    const index = sockets.findIndex((candidate) => candidate.socketId === socketId);
    if (index >= 0) sockets.splice(index, 1);
  }
  for (const line of effects.logs) if (line.evt === 'error') errors.push(line.message);
  return effects;
}

async function connect(token: string): Promise<string> {
  const socket: SocketInfo = { socketId: `socket-${nextSocket++}`, seat: null, connectedAt: now, lastSeenAt: now };
  sockets.push(socket);
  apply(core.onOpen(socket, sockets, now));
  const hello = JSON.stringify({ t: 'hello', protocol: PROTOCOL_VERSION, token });
  apply(await core.onMessage(socket.socketId, hello, sockets, now));
  if (socket.seat === null) fail('o hello não autenticou o socket');
  return socket.socketId;
}

const created = await core.create('K7M2QX', 'Ana', now);
apply(created.effects);
if (!created.ok) fail(`create: ${created.error}`);
const joined = await core.join('Bia', sockets, now);
apply(joined.effects);
if (!joined.ok) fail(`join: ${joined.error}`);

const ids: Record<SeatId, string> = {
  p1: await connect(created.value.token),
  p2: await connect(joined.value.token),
};
for (const seat of ['p1', 'p2'] as const) {
  apply(await core.onMessage(ids[seat], JSON.stringify({ t: 'ready', ready: true }), sockets, now));
}
if (core.record?.status !== 'PLAYING') fail(`a partida não começou (status ${core.record?.status})`);

for (let step = 0; step < MAX_STEPS; step += 1) {
  const record = core.record!;
  if (record.status === 'FINISHED') break;
  const state = record.game!.state;
  const seat = actingPlayers(state)[0] as SeatId;
  const action = legalActions(viewFor(state, seat))[0] as PlayerAction | undefined;
  if (!action) fail(`sem ação legal para ${seat}`);
  // O balde da conexão repõe 10 fichas por segundo e o PASS só vale depois do piso da janela de reação.
  now += state.phase.kind === 'REACTION' ? 200 + TIMERS.reactionMinMs : 200;
  for (const socket of sockets) socket.lastSeenAt = now;
  const raw = JSON.stringify({ t: 'act', id: `smoke-${step}`, epoch: record.epoch, action });
  const effects = apply(await core.onMessage(ids[seat], raw, sockets, now));
  const ack = effects.send.find((entry) => entry.message.t === 'ack')?.message;
  if (ack?.t === 'ack' && !ack.ok) fail(`jogada recusada: ${ack.code} ${ack.message}`);
}

const record = core.record!;
if (record.status !== 'FINISHED' || !record.outcome) fail(`a partida não terminou em ${MAX_STEPS} passos`);
if (errors.length > 0) fail(`o núcleo registrou erro: ${errors[0]}`);
console.log('smoke do servidor ok: partida pelo núcleo no Node puro');
