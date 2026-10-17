import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { makeConfig } from '@coringa/engine';
import { BOTS } from '../src/bots/index.ts';
import { PLAYERS, runGame } from '../src/match.ts';
import { toReplay, type Replay } from '../src/replay.ts';
import { replayFile } from '../src/cli/replay.ts';

function recorded(): { replay: Replay; steps: number } {
  const config = makeConfig();
  const record = runGame({ config, seed: 'replay-cli', bots: [BOTS.greedy, BOTS.greedy], record: true });
  if (!record.result) throw new Error('a partida de teste não terminou');
  return { replay: toReplay('replay-cli', config, PLAYERS, record), steps: record.steps };
}

function writeTmp(content: unknown): string {
  const path = join(mkdtempSync(join(tmpdir(), 'coringa-replay-')), 'partida.json');
  writeFileSync(path, JSON.stringify(content));
  return path;
}

describe('pnpm sim:replay', () => {
  it('reexecuta uma linha game.replay até o fim', () => {
    const config = makeConfig();
    const record = runGame({ config, seed: 'replay-cli', bots: [BOTS.greedy, BOTS.greedy], record: true });
    const replay = toReplay('sala-ABC234-1', config, PLAYERS, record);
    const path = writeTmp({ evt: 'game.replay', code: 'ABC234', gameNo: 1, replay });
    const out = replayFile(path);
    expect(out).toEqual({ ok: true, result: record.result, steps: record.steps });
  });

  it('aceita um Replay puro, como os salvos pelo pnpm play', () => {
    const { replay, steps } = recorded();
    const out = replayFile(writeTmp(replay));
    expect(out.ok).toBe(true);
    if (out.ok) expect(out.steps).toBe(steps);
  });

  it('aponta o passo exato que falha', () => {
    const { replay } = recorded();
    const steps = replay.steps.map((s) => ({ ...s }));
    steps[5] = { player: steps[5].player, action: { type: 'PLAY_J', cardId: 'carta-que-nao-existe' } };
    const out = replayFile(writeTmp({ evt: 'game.replay', replay: { ...replay, steps } }));
    expect(out).toMatchObject({ ok: false, step: 5 });
    if (!out.ok) {
      expect(out.code).toMatch(/^[A-Z_]+$/);
      expect(out.message.length).toBeGreaterThan(0);
    }
  });

  it('recusa arquivo que não é partida gravada', () => {
    expect(() => replayFile(writeTmp({ foo: 1 }))).toThrow(/replay/i);
  });

  it('avisa quando a partida gravada não chega ao fim', () => {
    const { replay } = recorded();
    expect(() => replayFile(writeTmp({ ...replay, steps: replay.steps.slice(0, 10) }))).toThrow(/não terminou|incompleta/i);
  });
});

describe('pnpm sim:replay (linha de comando)', () => {
  const cli = fileURLToPath(new URL('../src/cli/replay.ts', import.meta.url));
  const run = (...args: string[]) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });

  it('imprime o resultado e sai com 0', () => {
    const { replay, steps } = recorded();
    const out = run(writeTmp({ evt: 'game.replay', replay }));
    expect(out.status).toBe(0);
    expect(out.stdout).toContain(`ok: ${steps} passos`);
  });

  it('imprime "falhou no passo N: CODE — mensagem" e sai com 1', () => {
    const { replay } = recorded();
    const steps = replay.steps.map((s) => ({ ...s }));
    steps[5] = { player: steps[5].player, action: { type: 'PLAY_J', cardId: 'carta-que-nao-existe' } };
    const out = run(writeTmp({ ...replay, steps }));
    expect(out.status).toBe(1);
    expect(out.stderr).toMatch(/^falhou no passo 5: [A-Z_]+ — .+/);
  });

  it('sem argumento mostra o uso e sai com 1', () => {
    const out = run();
    expect(out.status).toBe(1);
    expect(out.stderr).toMatch(/uso: pnpm sim:replay/);
  });
});
