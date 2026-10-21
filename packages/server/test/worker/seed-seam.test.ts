import { env } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import { depsFor } from '../../src/worker/room.ts';

// A casca monta as dependências do núcleo com o `env` (Tarefa 25): `E2E_SEED` não vazio fixa só a semente da partida.
const withSeed = (value: string): Pick<Env, 'E2E_SEED'> => ({ E2E_SEED: value }) as Pick<Env, 'E2E_SEED'>;

describe('depsFor', () => {
  it('o Worker de teste carrega a configuração de produção: E2E_SEED vazio', () => {
    expect(env.E2E_SEED).toBe('');
  });

  it('sem E2E_SEED não há newSeed: a semente de cada partida sai do crypto', () => {
    const deps = depsFor(withSeed(''));
    expect(deps.newSeed).toBeUndefined();
    expect(deps.randomBytes(16)).toHaveLength(16);
  });

  it('com E2E_SEED a semente é "<texto>-<número da partida>" e os bytes seguem sorteados pelo crypto', () => {
    const deps = depsFor(withSeed('e2e-a'));
    expect(deps.newSeed?.(1)).toBe('e2e-a-1');
    expect(deps.newSeed?.(2)).toBe('e2e-a-2');
    // Os tokens de assento e os códigos de sala vêm de `randomBytes`: duas chamadas nunca repetem.
    expect(deps.randomBytes(32)).not.toEqual(deps.randomBytes(32));
  });
});
