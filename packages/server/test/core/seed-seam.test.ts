import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { RoomCore } from '../../src/core/room-core.ts';
import type { CoreDeps } from '../../src/core/types.ts';
import { CODE, Harness } from './harness.ts';

// A costura da semente da partida (E2E, Tarefa 25): `newSeed(gameNo)` deixa o sorteio de cada partida fixo sem tocar nos
// tokens de assento nem nos códigos de sala, que seguem no `randomBytes` (crypto).

const cryptoBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

/** Deps com a semente derivada do número da partida, guardando os números que o núcleo pediu. */
function seamDeps(asked: number[]): CoreDeps {
  return {
    randomBytes: cryptoBytes,
    newSeed: (gameNo) => {
      asked.push(gameNo);
      return `e2e-${gameNo}`;
    },
  };
}

describe('newSeed(gameNo)', () => {
  it('recebe o número da partida que começa: 1 na primeira e 2 na revanche, e a semente fica no registro', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    const asked: number[] = [];
    h.core = new RoomCore(h.core.record, seamDeps(asked));
    await h.send(p1, { t: 'ready', ready: true });
    await h.send(p2, { t: 'ready', ready: true });
    expect(asked).toEqual([1]);
    expect(h.core.record!.game!.seed).toBe('e2e-1');

    await h.send(p2, { t: 'concede', id: 'c1' });
    await h.send(p1, { t: 'rematch', want: true });
    await h.send(p2, { t: 'rematch', want: true });
    expect(asked).toEqual([1, 2]);
    expect(h.core.record).toMatchObject({ gameNo: 2, status: 'PLAYING' });
    expect(h.core.record!.game!.seed).toBe('e2e-2');
  });

  it('vem do gameNo gravado, não de um contador da instância: o núcleo reconstruído dá a mesma semente na revanche', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    h.core = new RoomCore(h.core.record, seamDeps([]));
    await h.send(p1, { t: 'ready', ready: true });
    await h.send(p2, { t: 'ready', ready: true });
    await h.send(p2, { t: 'concede', id: 'c1' });

    // O Durable Object hiberna e volta sem memória nenhuma: só o registro sobrevive.
    const asked: number[] = [];
    h.core = new RoomCore(h.core.record, seamDeps(asked));
    await h.send(p1, { t: 'rematch', want: true });
    await h.send(p2, { t: 'rematch', want: true });
    expect(asked).toEqual([2]);
    expect(h.core.record!.game!.seed).toBe('e2e-2');
  });

  it('o mesmo newSeed em duas salas dá o mesmo sorteio, mas os tokens dos assentos seguem todos diferentes', async () => {
    const created = async () => {
      const core = new RoomCore(null, seamDeps([]));
      const ana = await core.create(CODE, 'Ana', 1_000_000);
      if (!ana.ok) throw new Error(`create falhou: ${ana.error}`);
      const bia = await core.join('Bia', [], 1_000_000);
      if (!bia.ok) throw new Error(`join falhou: ${bia.error}`);
      return { core, tokens: [ana.value.token, bia.value.token] };
    };
    const first = await created();
    const second = await created();
    const tokens = [...first.tokens, ...second.tokens];
    expect(new Set(tokens).size).toBe(4);
    for (const token of tokens) expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/);
  });
});

describe('sem newSeed (produção)', () => {
  it('cada partida nova, inclusive a revanche, pede randomBytes(16) para a semente e não a deriva da anterior', async () => {
    const { h, p1, p2 } = await Harness.lobby();
    // Os tokens pedem 32 bytes; só as chamadas de 16 são de semente. Cada chamada devolve bytes sem relação com a anterior.
    const seedDraws: Uint8Array[] = [];
    let calls = 0;
    const spy: CoreDeps = {
      randomBytes: (n) => {
        calls += 1;
        const bytes = Uint8Array.from({ length: n }, (_, i) => (calls * 53 + i * 7 + 3) % 256);
        if (n === 16) seedDraws.push(bytes);
        return bytes;
      },
    };
    h.core = new RoomCore(h.core.record, spy);
    const hexOf = (bytes: Uint8Array): string => Buffer.from(bytes).toString('hex');

    await h.send(p1, { t: 'ready', ready: true });
    await h.send(p2, { t: 'ready', ready: true });
    expect(seedDraws).toHaveLength(1);
    const first = h.core.record!.game!.seed;
    expect(first).toBe(hexOf(seedDraws[0]!));
    expect(first).toMatch(/^[0-9a-f]{32}$/);

    await h.send(p2, { t: 'concede', id: 'c1' });
    expect(seedDraws).toHaveLength(1); // acabar a partida não sorteia nada
    await h.send(p1, { t: 'rematch', want: true });
    await h.send(p2, { t: 'rematch', want: true });
    expect(seedDraws).toHaveLength(2);
    const second = h.core.record!.game!.seed;
    expect(second).toBe(hexOf(seedDraws[1]!));
    expect(second).not.toBe(first);

    // O replay de cada partida leva a semente dos bytes daquela chamada.
    await h.send(p1, { t: 'concede', id: 'c2' });
    const seeds = h.messages(p1, 'replay').map((message) => [message.gameNo, message.replay.seed]);
    expect(seeds).toEqual([
      [1, first],
      [2, second],
    ]);
  });
});

describe('wrangler.jsonc', () => {
  it('a var E2E_SEED existe e é vazia: a semente fixa nunca vai para a produção', () => {
    const text = readFileSync(new URL('../../wrangler.jsonc', import.meta.url), 'utf8');
    const wrangler = JSON.parse(text.replace(/^\s*\/\/.*$/gm, '')) as { vars?: Record<string, unknown> };
    expect(wrangler.vars).toHaveProperty('E2E_SEED', '');
  });
});
