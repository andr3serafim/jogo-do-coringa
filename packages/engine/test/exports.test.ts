import { describe, expect, it } from 'vitest';
import * as engine from '../src/index.ts';
import { attackPower, defensePower } from '../src/combat.ts';
import { viewFor } from '../src/view.ts';
import type { GameState } from '../src/types.ts';
import { act, P1, P2, setup } from './helpers.ts';
import { playout } from './playout.ts';

describe('API para bots e interface', () => {
  it('exporta PRNG, quem age agora e o cálculo de ATK/DEF', () => {
    for (const name of ['seedRng', 'nextFloat', 'nextInt', 'shuffle', 'actingPlayers', 'attackPower', 'defensePower', 'attackBase', 'defenseBase', 'autoDestinations', 'quadValues', 'previewAttack', 'previewBetween']) {
      expect(typeof (engine as Record<string, unknown>)[name]).toBe('function');
    }
  });

  it('attackPower e defensePower funcionam sobre a visão pública (exemplo 1 da §1.13)', () => {
    const s = setup({ p1: { attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { defense: [5, 8] } });
    const view = viewFor(s, P1);
    expect(attackPower(view.self)).toBe(38);
    expect(defensePower(view.opponent)).toBe(13);
  });

  it('absoluteAttackArmed: buffLimit J (ou Selvagens no papel de J) armam o Ataque Absoluto, de cada lado, mesmo com o Ataque vazio', () => {
    const s = setup({ p1: { attackBuffs: ['J', 'J', 'J', 'W'] }, p2: { attack: [5], attackBuffs: ['J', 'J', 'J'] } });
    const view = viewFor(s, P1);
    expect(engine.absoluteAttackArmed(view.self, view.config)).toBe(true);
    expect(engine.absoluteAttackArmed(view.opponent, view.config)).toBe(false);
    expect(engine.absoluteAttackArmed(view.opponent, { buffLimit: 3 })).toBe(true);
    // A prévia usa a mesma regra.
    expect(engine.previewBetween({ ...view.self, attackRow: view.opponent.attackRow }, view.opponent, view.config).absolute).toBe(true);
  });

  it('defenseHealActive: a cura passiva liga com defenseHealGuard K na Guarda, de cada lado; sem o campo, nunca', () => {
    const s = setup({ p1: { guard: 2 }, p2: { guard: 1 } });
    const view = viewFor(s, P1);
    expect(engine.defenseHealActive(view.self, view.config)).toBe(true);
    expect(engine.defenseHealActive(view.opponent, view.config)).toBe(false);
    expect(engine.defenseHealActive(view.opponent, { defenseHealGuard: 1 })).toBe(true);
    expect(engine.defenseHealActive(view.self, {})).toBe(false);
  });

  it('o multiplicador de ataque é 1 + nJ (exemplo 6) e a quadra soma antes dele (exemplo 4)', () => {
    const s = setup({ p1: { attack: [4, 6], attackBuffs: ['J'] }, p2: { defense: [10, 3, 10, 10, 10], defenseBuffs: ['Q'] } });
    const view = viewFor(s, P2);
    expect(attackPower(view.opponent)).toBe(20);
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
            expect(attackPower(view.self)).toBe(e.attack);
            expect(defensePower(view.opponent)).toBe(e.defense);
            checked += 1;
          }
        },
      });
    }
    expect(checked).toBeGreaterThan(30);
  });
});
