import { viewEvents, viewFor } from '@coringa/engine';
import type { ReplayMessage, ServerMessage, StateMessage } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { CODE, Harness, reexecute, replaySteps } from './harness.ts';
import type { MatchTrace, SimulateOptions } from './harness.ts';

/**
 * Propriedades (spec §11.3): partidas completas entre bots do simulador pelo núcleo, com JSON de verdade, quedas e
 * voltas, jogadas com época velha e mensagens repetidas. O que cada jogador recebeu é conferido contra uma
 * reexecução independente do registro no motor (`replaySteps`), nunca contra o que o núcleo guardou.
 */

const SEEDS = Array.from({ length: 12 }, (_, i) => `prop-${i}`);
const CHAOS = { dropEvery: 37, staleEvery: 23, duplicateEvery: 19 } as const;
const SEATS = ['p1', 'p2'] as const;

/** Cada partida roda uma vez só e serve a todos os testes que a usam. */
const cache = new Map<string, Promise<MatchTrace>>();
function match(key: string, options: SimulateOptions): Promise<MatchTrace> {
  let trace = cache.get(key);
  if (!trace) {
    trace = Harness.simulateMatch(options);
    cache.set(key, trace);
  }
  return trace;
}
const chaosMatch = (seed: string): Promise<MatchTrace> => match(`caos-${seed}`, { seed, bots: ['greedy', 'random'], chaos: CHAOS });
const idleMatch = (seed: string): Promise<MatchTrace> =>
  match(`ocioso-${seed}`, { seed, bots: ['random', 'greedy'], chaos: { ...CHAOS, idleEvery: 9 } });

const states = (trace: MatchTrace, seat: (typeof SEATS)[number]): StateMessage[] =>
  trace.outbox.get(seat)!.filter((m): m is StateMessage => m.t === 'state');
const replays = (messages: ServerMessage[]): ReplayMessage[] =>
  messages.filter((m): m is ReplayMessage => m.t === 'replay');

const FAMILIES = [
  ['com caos', chaosMatch],
  ['com estouros', idleMatch],
] as const;

/** O que cada jogador recebeu é a redação exata do motor sobre a reexecução independente do registro. */
function checkRedaction(trace: MatchTrace): void {
  expect(['GAME_OVER', 'ABANDONED']).toContain(trace.ended);
  expect(trace.finalRecord.status).toBe('FINISHED');
  const game = trace.finalRecord.game!;
  const replayed = replaySteps(game, trace.startSeq);
  for (const seat of SEATS) {
    const outbox = trace.outbox.get(seat)!;
    expect(outbox.some((m) => m.t === 'state')).toBe(true);
    for (const m of outbox) {
      // A semente só viaja na mensagem `replay` (que `checkReplay` confere, junto com a ordem em relação ao `room`).
      if (m.t !== 'replay') expect(JSON.stringify(m)).not.toContain(game.seed);
      if (m.t !== 'state') continue;
      const at = replayed.get(m.seq);
      expect(at, `seq ${m.seq} existe no registro`).toBeDefined();
      expect(m.view).toEqual(viewFor(at!.state, seat));
      if (!m.catchUp && !m.resync) expect(m.events).toEqual(viewEvents(at!.events, seat));
    }
    // O que o jogador viu na largada é o estado inicial, sem eventos.
    expect(states(trace, seat)[0]!.seq).toBe(trace.startSeq);
  }
  // A semente também não vai a socket nenhum, nem aos que fecharam (tudo o que o núcleo mandou), fora do `replay`.
  expect(trace.wire.length).toBeGreaterThan(0);
  for (const m of trace.wire) {
    if (m.t === 'replay') continue;
    expect(JSON.stringify(m)).not.toContain(game.seed);
    // O registro inteiro de passos também só viaja no `replay`.
    if (game.steps.length > 0) expect(JSON.stringify(m)).not.toContain(JSON.stringify(game.steps));
  }
}

/**
 * Replay online (spec 2 §8.4): a semente e o registro de passos saem só na mensagem `replay`, e um socket só a recebe
 * depois de ter recebido o `room` em `FINISHED` daquela partida. Quem estava conectado no fim a recebeu, uma vez, e o que
 * recebeu é a partida gravada.
 */
function checkReplay(trace: MatchTrace): void {
  const game = trace.finalRecord.game!;
  const bySocket = new Map<string, ServerMessage[]>();
  for (const { socketId, message } of trace.sent) bySocket.set(socketId, [...(bySocket.get(socketId) ?? []), message]);

  let delivered = 0;
  for (const [socketId, messages] of bySocket) {
    messages.forEach((message, index) => {
      if (message.t !== 'replay') return;
      delivered += 1;
      const finished = messages
        .slice(0, index)
        .some((earlier) => earlier.t === 'room' && earlier.status === 'FINISHED' && earlier.gameNo === message.gameNo);
      expect(finished, `${socketId} recebeu o replay da partida ${message.gameNo} antes do room FINISHED dela`).toBe(true);
    });
    // Um replay por socket: ele sai no fim da partida e, no hello, só quando a sala já estava terminada.
    expect(replays(messages).length).toBeLessThanOrEqual(1);
  }
  expect(delivered, 'o fim da partida chegou a algum socket com o replay').toBeGreaterThan(0);

  const expected: ReplayMessage = {
    t: 'replay',
    gameNo: trace.finalRecord.gameNo,
    replay: { name: `sala-${CODE}-${trace.finalRecord.gameNo}`, config: game.state.config, seed: game.seed, players: ['p1', 'p2'], steps: game.steps },
  };
  for (const seat of trace.connectedAtEnd) {
    const got = replays(trace.outbox.get(seat)!);
    expect(got, `${seat} estava conectado no fim e recebeu o replay`).toEqual([expected]);
    // Reexecutar no motor o que o jogador recebeu dá o estado final guardado.
    expect(reexecute(got[0]!.replay)).toEqual(game.state);
  }
  expect(trace.connectedAtEnd.length).toBeGreaterThan(0);
}

/** Reexecutar o registro dá o estado final e o replay do log é o próprio registro. */
function checkDeterminism(trace: MatchTrace): void {
  const game = trace.finalRecord.game!;
  const replayed = replaySteps(game, trace.startSeq);
  expect(game.steps.length).toBe(trace.finalRecord.seq - trace.startSeq);
  expect(replayed.get(trace.finalRecord.seq)!.state).toEqual(game.state);
  const line = trace.logs.find((entry) => entry.evt === 'game.replay');
  expect(line).toMatchObject({ evt: 'game.replay', replay: { seed: game.seed, steps: game.steps } });
}

describe('partidas com bots pelo núcleo', () => {
  describe.each(FAMILIES)('partidas %s', (_name, run) => {
    it.each(SEEDS)('partida %s termina e o que sai para cada jogador é exatamente a redação do motor', async (seed) => {
      checkRedaction(await run(seed));
    });

    it.each(SEEDS)('reexecutar o registro no motor dá o mesmo estado final (%s)', async (seed) => {
      checkDeterminism(await run(seed));
    });

    it.each(SEEDS)('a semente e os passos só saem no replay, depois do room FINISHED, uma vez por socket (%s)', async (seed) => {
      checkReplay(await run(seed));
    });
  });

  it('as partidas com estouros têm passos do sistema: TIMEOUT e Equipar automático', async () => {
    const traces = await Promise.all(SEEDS.map(idleMatch));
    const steps = traces.flatMap((t) => t.finalRecord.game!.steps);
    expect(steps.filter((step) => step.player === 'system' && step.action.type === 'TIMEOUT').length).toBeGreaterThan(SEEDS.length);
    expect(traces.reduce((sum, t) => sum + t.chaos.idles, 0)).toBeGreaterThan(SEEDS.length);
  });

  it('as perturbações rodaram de verdade: quedas, época velha e id repetido', async () => {
    const traces = await Promise.all(SEEDS.map(chaosMatch));
    const total = (key: 'drops' | 'stale' | 'duplicates'): number => traces.reduce((sum, t) => sum + t.chaos[key], 0);
    expect(total('drops')).toBeGreaterThan(SEEDS.length);
    expect(total('stale')).toBeGreaterThan(SEEDS.length);
    expect(total('duplicates')).toBeGreaterThan(SEEDS.length);
    // A volta de quem caiu usa o `catchUp` com os passos perdidos ou o `resync`.
    const flagged = traces.flatMap((t) => SEATS.flatMap((seat) => states(t, seat))).filter((m) => m.catchUp || m.resync);
    expect(flagged.length).toBeGreaterThan(0);
  });

  it('seq e epoch nunca decrescem por cliente; nenhum TIMEOUT recusado', async () => {
    const traces = [...(await Promise.all(SEEDS.map(chaosMatch))), ...(await Promise.all(SEEDS.map(idleMatch)))];
    let timeouts = 0;
    for (const trace of traces) {
      for (const seat of SEATS) {
        const list = states(trace, seat);
        list.forEach((m, i) => {
          if (i === 0) return;
          expect(m.seq).toBeGreaterThanOrEqual(list[i - 1]!.seq);
          expect(m.epoch).toBeGreaterThanOrEqual(list[i - 1]!.epoch);
        });
      }
      // `replaySteps` lança se o motor recusar qualquer passo do registro, os do sistema inclusive.
      const replayed = replaySteps(trace.finalRecord.game!, trace.startSeq);
      expect(replayed.size).toBe(trace.finalRecord.game!.steps.length + 1);
      expect(trace.logs.filter((entry) => entry.evt === 'error')).toEqual([]);
      timeouts += trace.finalRecord.game!.steps.filter((step) => step.action.type === 'TIMEOUT').length;
    }
    // As partidas com cliente ocioso estouram prazos de verdade: há TIMEOUT injetado e o motor o aceitou.
    expect(timeouts).toBeGreaterThan(0);
    const idles = (await Promise.all(SEEDS.map(idleMatch))).reduce((sum, t) => sum + t.chaos.idles, 0);
    expect(idles).toBeGreaterThan(0);
  });

  it('erro sem oráculo: id escondido (mão do oponente, pendentes, monte) recebe o mesmo código de id inexistente', async () => {
    const traces = await Promise.all(
      SEEDS.slice(0, 6).map((seed) =>
        match(`sonda-${seed}`, { seed, bots: ['greedy', 'greedy'], thinkMs: 1_000, probeEvery: 2 }),
      ),
    );
    const probes = traces.flatMap((t) => t.oracle);
    expect(probes.length).toBeGreaterThan(200);
    for (const probe of probes) {
      expect(probe.hiddenCode, `${probe.action}.${probe.slot} com id na ${probe.hiddenIn}`).toBe(probe.missingCode);
      expect(probe.hiddenCode).not.toBe('OK');
      expect(probe.hiddenCode).not.toBe('RATE_LIMITED');
    }
    // Uma sonda só prova algo se chegou à checagem do id: fase errada, carta própria de tipo errado e ressurreição
    // indisponível respondem antes de olhar o id, igual nos dois lados. Cada (jogada, campo) precisa de pares informativos.
    const shallow = new Set(['WRONG_PHASE', 'NOT_YOUR_TURN', 'INVALID_CARD', 'NO_RESURRECTION']);
    const deep = new Map<string, Set<string>>();
    for (const p of probes.filter((probe) => !shallow.has(probe.hiddenCode))) {
      const key = `${p.action}.${p.slot}`;
      deep.set(key, (deep.get(key) ?? new Set()).add(`${p.hiddenCode}/${p.hiddenIn}`));
    }
    for (const key of ['PLAY_J.cardId', 'PLAY_Q.cardId', 'PLAY_K.cardIds', 'TRAP.cardId', 'TRAP.targetId', 'SACRIFICE.cardId', 'SACRIFICE.targetId']) {
      expect(deep.has(key), `${key} chegou à checagem do id`).toBe(true);
    }
    // Os ids escondidos na mão do oponente e no monte chegam fundo; os pendentes só existem no Equipar, onde toda jogada de cartas é fora de fase.
    const origins = new Set([...deep.values()].flatMap((set) => [...set].map((entry) => entry.split('/')[1])));
    expect(origins).toContain('hand');
    expect(origins).toContain('deck');
    expect(new Set(probes.map((p) => p.hiddenIn))).toEqual(new Set(['hand', 'pending', 'deck']));
  });

  // O teto por chave do storage SQLite do Durable Object é de 2 MB (chave e valor juntos, doc da Cloudflare, 2026-10-30); os
  // 100 KiB de antes vinham do backend KV antigo (128 KiB). Sem o anti-travamento (E1 do sub-projeto 5) a partida não tem mais
  // limite de rodadas e o log de passos cresce com ela: o teste fica na metade do teto de verdade, com folga para partidas longas.
  const PART_BUDGET = 1024 * 1024;

  it('cada chave gravada fica < 1 MiB (metade do teto da plataforma) na maior partida', async () => {
    const traces = [
      ...(await Promise.all(SEEDS.map(chaosMatch))),
      await match('tartaruga', { seed: 'prop-tartaruga', bots: ['turtle', 'turtle'] }),
    ];
    const biggest = Math.max(...traces.map((t) => t.maxPartBytes));
    console.log(`maior parte gravada: ${biggest} bytes`);
    expect(biggest).toBeGreaterThan(0);
    expect(biggest).toBeLessThan(PART_BUDGET);
    // A parte que mais cresce é o log de passos; os outros três são limitados por construção.
    for (const trace of traces) expect(trace.maxPartBytes).toBeLessThan(PART_BUDGET);
  });

  it('linhas gravadas por partida (estimativa da spec §9.4)', async () => {
    const trace = await match('linhas', { seed: 'prop-linhas', bots: ['greedy', 'greedy'] });
    const linhas = 4 * trace.persists + trace.alarmChanges;
    console.log(`linhas por partida: ${linhas} (passos ${trace.finalRecord.game!.steps.length}, gravações ${trace.persists}, alarmes ${trace.alarmChanges})`);
    expect(trace.persists).toBeGreaterThan(0);
    expect(linhas).toBeLessThan(1_500);
  });
});
