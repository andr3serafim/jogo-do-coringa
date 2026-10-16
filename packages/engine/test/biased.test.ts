import { describe, expect, it } from 'vitest';
import type { GameEvent } from '../src/types.ts';
import { absolutesProfile, exodiaProfile, reflectExpiryProfile } from './biased.ts';
import { checkInvariants } from './invariants.ts';
import { playout, type Chooser } from './playout.ts';
import { P1 } from './helpers.ts';

const SEEDS = 40;

/** Joga SEEDS partidas com a política, checa as invariantes em todo passo e conta em quantas cada evento-alvo aconteceu. */
function reach(name: string, chooser: Chooser, targets: GameEvent['type'][]): Record<string, number> {
  const counts: Record<string, number> = Object.fromEntries(targets.map((t) => [t, 0]));
  for (let i = 0; i < SEEDS; i += 1) {
    const seen = new Set<string>();
    const { state } = playout({
      seed: `vies-${name}-${i}`,
      choices: [],
      chooser,
      onStep: (before, after, events) => {
        checkInvariants(before, after, events);
        for (const e of events) if (targets.includes(e.type)) seen.add(e.type);
      },
    });
    expect(state.phase.kind).toBe('GAME_OVER');
    for (const t of seen) counts[t] += 1;
  }
  return counts;
}

describe('playouts enviesados: caminhos raros sob as invariantes (spec §5)', () => {
  it('Exódia acontece e respeita as invariantes', () => {
    expect(reach('exodia', exodiaProfile, ['Exodia']).Exodia).toBeGreaterThan(0);
  });

  it('Ataque Absoluto e Defesa Absoluta acontecem e expiram', () => {
    const counts = reach('absolutos', absolutesProfile, ['AbsoluteAttack', 'AbsoluteDefenseStarted', 'AbsoluteDefenseEnded']);
    expect(counts.AbsoluteAttack).toBeGreaterThan(0);
    expect(counts.AbsoluteDefenseStarted).toBeGreaterThan(0);
    expect(counts.AbsoluteDefenseEnded).toBeGreaterThan(0);
  });

  it('Reflect expira quando o oponente não ataca', () => {
    expect(reach('reflect', reflectExpiryProfile(P1), ['ReflectExpired']).ReflectExpired).toBeGreaterThan(0);
  });
});
