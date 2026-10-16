import { describe, expect, it } from 'vitest';
import * as engine from '../src/index.ts';
import { attackPower, defensePower } from '../src/combat.ts';
import { viewFor } from '../src/view.ts';
import type { GameState } from '../src/types.ts';
import { act, P1, P2, setup } from './helpers.ts';
import { playout } from './playout.ts';

describe('API para bots e interface', () => {
  it('exporta PRNG, quem age agora e o cálculo de ATK/DEF', () => {
    for (const name of ['seedRng', 'nextFloat', 'nextInt', 'shuffle', 'actingPlayers', 'attackPower', 'defensePower', 'attackBase', 'defenseBase']) {
      expect(typeof (engine as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('attackPower e defensePower funcionam sobre a visão pública (exemplo 1 da §1.13)', () => {
    const s = setup({ p1: { attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { defense: [5, 8] } });
    const view = viewFor(s, P1);
    expect(attackPower(view.self, view.pressure)).toBe(38);
    expect(defensePower(view.opponent)).toBe(13);
  });

  it('a pressão entra no multiplicador de ataque (exemplo 6) e a quadra soma antes dele (exemplo 4)', () => {
    const s = setup({ pressure: 2, p1: { attack: [4, 6], attackBuffs: ['J'] }, p2: { defense: [10, 3, 10, 10, 10], defenseBuffs: ['Q'] } });
    const view = viewFor(s, P2);
    expect(attackPower(view.opponent, view.pressure)).toBe(40);
    expect(defensePower(view.self)).toBe(106);
  });

  it('actingPlayers: os dois no Equipar, depois só quem falta; ninguém após o fim', () => {
    const s = setup({ phase: { kind: 'EQUIP' }, roundKind: 'EQUIP', p1: { pending: [5] }, p2: { pending: [6] } });
    expect(engine.actingPlayers(s)).toEqual([P1, P2]);
    const after = act(s, P1, { type: 'EQUIP', destinations: ['ATK'] }).state;
    expect(engine.actingPlayers(after)).toEqual([P2]);
    const over = act(after, 'system', { type: 'FORFEIT', loser: P2 }).state;
    expect(engine.actingPlayers(over)).toEqual([]);
  });

  it('a prévia de ATK/DEF bate com o DamageDealt de partidas reais', () => {
    let checked = 0;
    for (let i = 0; i < 30; i += 1) {
      playout({
        seed: `previa-${i}`,
        choices: [i, 7, 3, 11, 2],
        onStep: (before: GameState, _after, events) => {
          for (const e of events) {
            if (e.type !== 'DamageDealt') continue;
            const view = viewFor(before, e.attacker);
            expect(attackPower(view.self, view.pressure)).toBe(e.attack);
            expect(defensePower(view.opponent)).toBe(e.defense);
            checked += 1;
          }
        },
      });
    }
    expect(checked).toBeGreaterThan(30);
  });
});
