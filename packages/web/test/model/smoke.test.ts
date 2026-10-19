// Prova que o motor e o protocolo resolvem dentro da web (Vitest no Node, sem DOM), pelos mesmos
// especificadores que o `src/model` vai usar.
import { createGame, legalActions, makeConfig, viewFor } from '@coringa/engine';
import { normalizeCode } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';

describe('pacotes do workspace na web', () => {
  it('o motor monta as jogadas de uma partida com semente fixa', () => {
    const created = createGame(makeConfig(), 'web-smoke', ['ana', 'duda']);
    if (!created.ok) throw new Error(created.error.message);
    const actions = legalActions(viewFor(created.state, 'ana'));
    expect(actions.length).toBeGreaterThan(0);
    expect(actions.every((action) => action.type === 'EQUIP')).toBe(true);
  });

  it('o protocolo normaliza o código da sala', () => {
    expect(normalizeCode(' 7kq2md ')).toBe('7KQ2MD');
    expect(normalizeCode('7KQ2M0')).toBeNull();
  });
});
