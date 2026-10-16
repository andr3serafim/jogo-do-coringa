import { viewEvents, viewFor } from '@coringa/engine';
import type { StateMessage } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { Harness, replaySteps } from './harness.ts';
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

describe('partidas com bots pelo núcleo', () => {
  it.each(SEEDS)(
    'partida %s termina e o que sai para cada jogador é exatamente a redação do motor',
    async (seed) => {
      const trace = await chaosMatch(seed);
      expect(['GAME_OVER', 'ABANDONED']).toContain(trace.ended);
      expect(trace.finalRecord.status).toBe('FINISHED');
      const game = trace.finalRecord.game!;
      const replayed = replaySteps(game, trace.startSeq);
      for (const seat of SEATS) {
        const outbox = trace.outbox.get(seat)!;
        expect(outbox.some((m) => m.t === 'state')).toBe(true);
        for (const m of outbox) {
          expect(JSON.stringify(m)).not.toContain(game.seed);
          if (m.t !== 'state') continue;
          const at = replayed.get(m.seq);
          expect(at, `seq ${m.seq} existe no registro`).toBeDefined();
          expect(m.view).toEqual(viewFor(at!.state, seat));
          if (!m.catchUp && !m.resync) expect(m.events).toEqual(viewEvents(at!.events, seat));
        }
      }
      // O que o jogador viu na largada é o estado inicial, sem eventos.
      for (const seat of SEATS) expect(states(trace, seat)[0]!.seq).toBe(trace.startSeq);
    },
  );

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

  it.each(SEEDS)('reexecutar o registro no motor dá o mesmo estado final (%s)', async (seed) => {
    const trace = await chaosMatch(seed);
    const game = trace.finalRecord.game!;
    const replayed = replaySteps(game, trace.startSeq);
    expect(game.steps.length).toBe(trace.finalRecord.seq - trace.startSeq);
    expect(replayed.get(trace.finalRecord.seq)!.state).toEqual(game.state);
    // O replay que vai para o log (`game.replay`) é esse mesmo registro.
    const line = trace.logs.find((entry) => entry.evt === 'game.replay');
    expect(line).toMatchObject({ evt: 'game.replay', replay: { seed: game.seed, steps: game.steps } });
  });

  it('seq e epoch nunca decrescem por cliente; nenhum TIMEOUT recusado', async () => {
    const traces = [...(await Promise.all(SEEDS.map(chaosMatch))), ...(await Promise.all(SEEDS.slice(0, 6).map(idleMatch)))];
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
    const idles = (await Promise.all(SEEDS.slice(0, 6).map(idleMatch))).reduce((sum, t) => sum + t.chaos.idles, 0);
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
    // As sondas chegam às checagens de carta do motor (não morrem todas em fase errada) e cobrem as três origens.
    const codes = new Set(probes.map((p) => p.hiddenCode));
    expect(codes).toContain('CARD_NOT_IN_HAND');
    expect(codes).toContain('INVALID_TARGET');
    expect(new Set(probes.map((p) => p.hiddenIn))).toEqual(new Set(['hand', 'pending', 'deck']));
    for (const action of ['PLAY_J', 'TRAP', 'SACRIFICE', 'RESURRECT'] as const) {
      expect(probes.some((p) => p.action === action), action).toBe(true);
    }
  });

  it('cada chave gravada fica < 100 KiB na maior partida', async () => {
    const traces = [
      ...(await Promise.all(SEEDS.map(chaosMatch))),
      await match('tartaruga', { seed: 'prop-tartaruga', bots: ['turtle', 'turtle'] }),
    ];
    const biggest = Math.max(...traces.map((t) => t.maxPartBytes));
    console.log(`maior parte gravada: ${biggest} bytes`);
    expect(biggest).toBeGreaterThan(0);
    expect(biggest).toBeLessThan(100 * 1024);
    // A parte que mais cresce é o log de passos; os outros três são limitados por construção.
    for (const trace of traces) expect(trace.maxPartBytes).toBeLessThan(100 * 1024);
  });

  it('linhas gravadas por partida (estimativa da spec §9.4)', async () => {
    const trace = await match('linhas', { seed: 'prop-linhas', bots: ['greedy', 'greedy'] });
    const linhas = 4 * trace.persists + trace.alarmChanges;
    console.log(`linhas por partida: ${linhas} (passos ${trace.finalRecord.game!.steps.length}, gravações ${trace.persists}, alarmes ${trace.alarmChanges})`);
    expect(trace.persists).toBeGreaterThan(0);
    expect(linhas).toBeLessThan(1_500);
  });
});
