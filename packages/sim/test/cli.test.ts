import { join, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { positiveInt } from '../src/cli/args.ts';
import { replayPath } from '../src/play/game.ts';

describe('argumentos das CLIs', () => {
  it('--partidas aceita só inteiro positivo, com mensagem clara', () => {
    expect(positiveInt('500', '--partidas')).toBe(500);
    for (const bad of ['abc', '0', '-3', '1.5', '', '10x']) {
      expect(() => positiveInt(bad, '--partidas')).toThrow(`--partidas deve ser um inteiro positivo (recebi "${bad}")`);
    }
  });
});

describe('o arquivo do replay do pnpm play', () => {
  const dir = join('pasta', 'replays');

  it('fica sempre dentro da pasta de replays, qualquer que seja a semente', () => {
    for (const seed of ['../x', '..\\x', '/etc/passwd', 'C:\\Windows\\x', 'a/../../b', '..', '']) {
      const path = replayPath(dir, seed);
      expect(resolve(path).startsWith(resolve(dir) + sep), `${seed} → ${path}`).toBe(true);
      expect(path.endsWith('.json')).toBe(true);
    }
  });

  it('a semente comum vira o nome do arquivo como antes', () => {
    expect(replayPath(dir, 'lw3k9-abc_1')).toBe(join(dir, 'lw3k9-abc_1.json'));
    expect(replayPath(dir, '../x')).toBe(join(dir, '___x.json'));
  });
});
