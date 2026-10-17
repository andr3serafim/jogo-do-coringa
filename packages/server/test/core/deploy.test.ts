import { describe, expect, it } from 'vitest';
import { deployArgs } from '../../scripts/deploy.ts';

describe('scripts/deploy.ts', () => {
  it('carimba a versão com o hash do commit', () => {
    expect(deployArgs('818f5c8')).toEqual(['deploy', '--var', 'VERSION:818f5c8']);
  });

  it('recusa o que não é hash de git, para nada estranho chegar ao shell', () => {
    for (const bad of ['', 'xyz', '818f5c8; rm -rf /', '--var', 'ABC123']) {
      expect(() => deployArgs(bad)).toThrow(/hash/);
    }
  });
});
