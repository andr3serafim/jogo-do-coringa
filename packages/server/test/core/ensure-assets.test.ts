import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { ensureAssets } from '../../scripts/ensure-assets.ts';

const roots: string[] = [];
function tmp(): string {
  const root = mkdtempSync(join(tmpdir(), 'coringa-assets-'));
  roots.push(root);
  return root;
}
afterEach(() => {
  for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true });
});

describe('scripts/ensure-assets.ts', () => {
  it('reserva a pasta ausente com um index.html mínimo', () => {
    const dir = join(tmp(), 'web', 'dist');
    expect(ensureAssets(dir)).toBe(true);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toContain('pnpm --filter @coringa/web build');
  });

  it('não mexe numa pasta que já tem index.html (a web construída)', () => {
    const dir = tmp();
    writeFileSync(join(dir, 'index.html'), '<p>web de verdade</p>');
    expect(ensureAssets(dir)).toBe(false);
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toBe('<p>web de verdade</p>');
  });
});
