import { describe, expect, it } from 'vitest';
import { previewAttack, previewBetween, type AttackOutcome, type AttackPreview } from '../src/preview.ts';
import { viewFor } from '../src/view.ts';
import type { Action, GameEvent, PlayerId } from '../src/types.ts';
import { P1, setup } from './helpers.ts';
import { playout } from './playout.ts';

const preview = (spec: Parameters<typeof setup>[0]): AttackPreview => previewAttack(viewFor(setup(spec), P1), 'self');

describe('previewAttack: exemplos da spec 1 §1.13', () => {
  it('exemplo 1: dano direto', () => {
    const p = preview({ p1: { attack: [3, 7, 9], attackBuffs: ['J'] }, p2: { defense: [5, 8] } });
    expect(p).toMatchObject({ outcome: 'DAMAGE', attack: 38, defense: 13, net: 25, damage: 25, reflected: 0, absolute: false });
    expect(p.breaks).toEqual({ defenderGuard: 0, attackerGuard: 0, attackerQueens: 0 });
  });

  it('exemplo 2: o K absorve o golpe', () => {
    const p = preview({ p1: { attack: [10, 10, 10] }, p2: { defense: [10, 10], guard: 2 } });
    expect(p.outcome).toBe('GUARD_ABSORBS');
    expect(p.damage).toBe(0);
    expect(p.net).toBeGreaterThan(0);
    expect(p.breaks.defenderGuard).toBe(1);
  });

  it('exemplo 3: Reflect devolve o golpe e quebra K e Q do atacante', () => {
    const p = preview({
      p1: { attack: [6, 8, 9], attackBuffs: ['J'], defense: [4, 10], defenseBuffs: ['Q'], guard: 2 },
      p2: { reflect: true },
    });
    expect(p).toMatchObject({ outcome: 'REFLECTED', attack: 46, defense: 7, reflected: 39, damage: 0 });
    expect(p.breaks).toEqual({ attackerGuard: 2, attackerQueens: 1, defenderGuard: 0 });
  });

  it('exemplo 5: Ataque Absoluto fura a Defesa Absoluta e quebra os K', () => {
    const p = preview({
      p1: { attack: [5, 6, 7], attackBuffs: ['J', 'J', 'J', 'J'] },
      p2: { defense: [8, 9], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true, guard: 1 },
    });
    expect(p).toMatchObject({ outcome: 'DAMAGE', attack: 90, defense: 85, damage: 5, absolute: true });
    expect(p.breaks.defenderGuard).toBe(1);
  });

  it('exemplo 6: só os J entram no multiplicador', () => {
    expect(preview({ p1: { attack: [4, 6], attackBuffs: ['J'] } }).attack).toBe(20);
  });
});

describe('previewAttack: outros desfechos', () => {
  it('Defesa Absoluta sem Ataque Absoluto não leva dano', () => {
    const p = preview({ p1: { attack: [10, 10] }, p2: { defense: [2], absoluteDefense: true, guard: 1 } });
    expect(p.outcome).toBe('ABSOLUTE_DEFENSE');
    expect(p.damage).toBe(0);
    expect(p.breaks.defenderGuard).toBe(0);
  });

  it('ataque vazio: NO_ATTACK com tudo zerado', () => {
    const p = preview({ p2: { defense: [5], guard: 1 } });
    expect(p).toEqual({
      outcome: 'NO_ATTACK',
      attack: 0,
      defense: 0,
      net: 0,
      damage: 0,
      reflected: 0,
      absolute: false,
      breaks: { defenderGuard: 0, attackerGuard: 0, attackerQueens: 0 },
    });
  });

  it('atacante sob Defesa Absoluta contra Reflect: não perde Q nem leva dano, mas perde os K', () => {
    const p = preview({
      p1: { attack: [9, 9], defense: [4], defenseBuffs: ['Q', 'Q'], guard: 3, absoluteDefense: true },
      p2: { reflect: true },
    });
    expect(p.outcome).toBe('REFLECTED');
    expect(p.reflected).toBe(0);
    expect(p.breaks).toEqual({ attackerGuard: 3, attackerQueens: 0, defenderGuard: 0 });
  });

  it('ataque que não vence a defesa causa dano 0 e não gasta K', () => {
    const p = preview({ p1: { attack: [2] }, p2: { defense: [9], guard: 1 } });
    expect(p).toMatchObject({ outcome: 'DAMAGE', net: 0, damage: 0 });
    expect(p.breaks.defenderGuard).toBe(0);
  });

  it('Defesa Absoluta do defensor contra Ataque Absoluto: DAMAGE com a conta cheia', () => {
    const p = preview({
      p1: { attack: [5, 5], attackBuffs: ['J', 'J', 'J', 'J'] },
      p2: { defense: [2], absoluteDefense: true },
    });
    expect(p).toMatchObject({ outcome: 'DAMAGE', absolute: true, attack: 50, defense: 2, damage: 48 });
  });

  it("previewAttack(view, 'opponent') é a ameaça do oponente sobre a sua Defesa", () => {
    const s = setup({
      p1: { defense: [7, 8], defenseBuffs: ['Q'], guard: 1 },
      p2: { attack: [9, 9], attackBuffs: ['J'] },
    });
    const view = viewFor(s, P1);
    const threat = previewAttack(view, 'opponent');
    const direct = previewBetween(view.opponent, view.self, view.config);
    expect(threat).toEqual(direct);
    expect(threat.attack).toBe(18 * 2);
    expect(threat.defense).toBe(30);
    expect(threat.outcome).toBe('GUARD_ABSORBS');
  });
});

describe('preview bate com a resolução', () => {
  it('em 40 partidas, a prévia de cada ataque bate com os eventos reais', () => {
    const counts: Record<AttackOutcome, number> = { NO_ATTACK: 0, DAMAGE: 0, GUARD_ABSORBS: 0, ABSOLUTE_DEFENSE: 0, REFLECTED: 0 };
    let checked = 0;
    for (let game = 0; game < 40; game += 1) {
      // Escolhas pseudo-aleatórias fixas por partida (LCG), sem Math.random.
      let x = game * 2654435761 + 12345;
      const choices = Array.from({ length: 97 }, () => {
        x = (Math.imul(x, 1103515245) + 12345) >>> 0;
        return x >>> 8;
      });
      let pending: { attacker: PlayerId; preview: AttackPreview } | null = null;
      playout({
        seed: `preview-${game}`,
        choices,
        chooser: (legal: Action[], view, step) => {
          if (view.phase.kind === 'REACTION' && view.phase.trigger === 'ATTACK') {
            return legal.find((a) => a.type === 'PASS') ?? legal[0];
          }
          const action = legal[choices[step % choices.length] % legal.length];
          if (action.type === 'DECLARE_ATTACK') pending = { attacker: view.me, preview: previewAttack(view, 'self') };
          return action;
        },
        onStep: (_before, _after, events: GameEvent[]) => {
          if (!events.some((e) => e.type === 'ReactionWindowClosed' && e.trigger === 'ATTACK')) return;
          if (!pending) throw new Error('janela de ataque fechada sem prévia guardada');
          const { preview: p } = pending;
          pending = null;
          const dealt = events.find((e) => e.type === 'DamageDealt');
          const reflected = events.find((e) => e.type === 'ReflectTriggered');
          if (p.outcome === 'REFLECTED') {
            expect(reflected?.type === 'ReflectTriggered' ? reflected.damage : -1).toBe(p.reflected);
            expect(dealt).toBeUndefined();
          } else {
            expect(dealt?.type === 'DamageDealt' ? dealt.damage : -1).toBe(p.damage);
            expect(dealt?.type === 'DamageDealt' ? dealt.attack : -1).toBe(p.attack);
            expect(reflected).toBeUndefined();
          }
          const brokenCards = events.reduce((total, e) => total + (e.type === 'GuardBroken' ? e.cards.length : 0), 0);
          expect(brokenCards).toBe(p.breaks.defenderGuard + p.breaks.attackerGuard);
          counts[p.outcome] += 1;
          checked += 1;
        },
      });
    }
    expect(checked).toBeGreaterThanOrEqual(100);
    expect(counts.DAMAGE).toBeGreaterThanOrEqual(1);
    expect(counts.GUARD_ABSORBS).toBeGreaterThanOrEqual(1);
    expect(counts.REFLECTED).toBeGreaterThanOrEqual(1);
  });
});
