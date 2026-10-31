import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { applyAction } from '../src/apply-action.ts';
import { noPlayReason } from '../src/no-play.ts';
import { viewFor } from '../src/view.ts';
import type { Action, GameState, PlayerId, SpecialCard, SpecialKind } from '../src/types.ts';
import { act, handId, P1, P2, setup, type Setup } from './helpers.ts';
import { playout } from './playout.ts';

const reasonOf = (s: GameState, who: PlayerId, kind: SpecialKind) => {
  const view = viewFor(s, who);
  const card = view.self.hand.find((c) => c.kind === kind);
  if (!card) throw new Error(`sem ${kind} na mão de ${who}`);
  return noPlayReason(view, card);
};

const reason = (spec: Setup, kind: SpecialKind, who: PlayerId = P1) => reasonOf(setup(spec), who, kind);

describe('noPlayReason: por que a carta da mão não tem jogada (B2)', () => {
  it('com jogada, nenhum motivo: J, Q e K na fase principal; A com alvo', () => {
    const spec: Setup = { p1: { hand: ['J', 'Q', 'K', 'A', 'W'] }, p2: { guard: 1 } };
    for (const kind of ['J', 'Q', 'K', 'A', 'WILD'] as const) expect(reason(spec, kind)).toBeNull();
  });

  it('Equipar, escolha da ordem e fim da partida', () => {
    const hand: Setup['p1'] = { hand: ['J', 'K'] };
    expect(reason({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: hand }, 'K')).toBe('EQUIP_ROUND');
    expect(reason({ phase: { kind: 'ORDER_CHOICE', player: P1 }, p1: hand }, 'J')).toBe('ORDER_CHOICE');
    expect(reason({ phase: { kind: 'ORDER_CHOICE', player: P2 }, p1: hand }, 'J')).toBe('ORDER_CHOICE');
    const over = { kind: 'GAME_OVER' as const, result: { kind: 'WIN' as const, winner: P2, reason: 'HP' as const } };
    expect(reason({ phase: over, p1: hand }, 'K')).toBe('GAME_OVER');
  });

  it('a vez do oponente: o turno dele e a janela de reação dele', () => {
    expect(reason({ phase: { kind: 'ATTACK_MAIN', player: P2 }, p1: { hand: ['K'] } }, 'K')).toBe('OPPONENT_TURN');
    const s = setup({ p1: { attack: [5], guard: 1 }, p2: { hand: ['A'] } });
    const declared = act(s, P1, { type: 'DECLARE_ATTACK' }).state;
    expect(reasonOf(declared, P2, 'A')).toBeNull();
    expect(reasonOf(setup({ p1: { attack: [5] }, p2: { hand: ['A'] } }), P2, 'A')).toBe('OPPONENT_TURN');
    const back = setup({ phase: { kind: 'REACTION', responder: P2, trigger: 'ATTACK' }, p1: { hand: ['A'] }, p2: { guard: 1 } });
    expect(reasonOf(back, P1, 'A')).toBe('OPPONENT_TURN');
  });

  it('limite de buffs: J e Q no limite, sem alvo de Sacrifício', () => {
    expect(reason({ p1: { hand: ['J'], attackBuffs: ['J', 'J', 'J', 'J'] } }, 'J')).toBe('BUFF_LIMIT');
    expect(reason({ p1: { hand: ['Q'], defenseBuffs: ['Q', 'Q', 'Q', 'Q'] } }, 'Q')).toBe('BUFF_LIMIT');
    // No limite, mas com um J do oponente para abater, o J ainda tem o Sacrifício.
    expect(reason({ p1: { hand: ['J'], attackBuffs: ['J', 'J', 'J', 'J'] }, p2: { attackBuffs: ['J'] } }, 'J')).toBeNull();
  });

  it('A sem alvo: o oponente sem J, Q e K, ou só com as cartas do Reflect; sob Defesa Absoluta, protegido', () => {
    expect(reason({ p1: { hand: ['A'] } }, 'A')).toBe('NO_TARGET');
    expect(reason({ p1: { hand: ['A'] }, p2: { reflect: true } }, 'A')).toBe('NO_TARGET');
    expect(reason({ p1: { hand: ['A'] }, p2: { guard: 1, absoluteDefense: true, defenseBuffs: ['Q', 'Q', 'Q', 'Q'] } }, 'A')).toBe(
      'TARGET_PROTECTED',
    );
  });

  it('Selvagem sem papel: J e Q no limite e o A sem alvo', () => {
    const full: Setup['p1'] = { hand: ['W'], attackBuffs: ['J', 'J', 'J', 'J'], defenseBuffs: ['Q', 'Q', 'Q', 'Q'], absoluteDefense: true };
    expect(reason({ p1: full }, 'WILD')).toBe('NO_ROLE');
    expect(reason({ p1: full, p2: { guard: 1 } }, 'WILD')).toBeNull();
  });

  it('na janela de reação: só o A responde; contra K jogado ele só mira a Guarda; contra o Reflect, nenhuma carta sozinha', () => {
    const attack = setup({ phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' }, p1: { hand: ['J', 'Q', 'K', 'A'] }, p2: { attackBuffs: ['J'] } });
    for (const kind of ['J', 'Q', 'K'] as const) expect(reasonOf(attack, P1, kind)).toBe('REACTION_TRAP_ONLY');
    expect(reasonOf(attack, P1, 'A')).toBeNull();

    const kPlayed = setup({ phase: { kind: 'REACTION', responder: P1, trigger: 'K_PLAYED' }, p1: { hand: ['A', 'W'] }, p2: { attackBuffs: ['J'] } });
    expect(reasonOf(kPlayed, P1, 'A')).toBe('NO_GUARD_TARGET');
    expect(reasonOf(kPlayed, P1, 'WILD')).toBe('NO_GUARD_TARGET');

    const protectedOpponent = setup({
      phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' },
      p1: { hand: ['A'] },
      p2: { guard: 1, absoluteDefense: true, defenseBuffs: ['Q', 'Q', 'Q', 'Q'] },
    });
    expect(reasonOf(protectedOpponent, P1, 'A')).toBe('TARGET_PROTECTED');

    // P1 ataca e P2 responde com Reflect: na resposta de P1, nenhuma carta sozinha joga (só outro Reflect, de três).
    const s = setup({ p1: { hand: ['K', 'J', 'Q', 'A'], attack: [5], guard: 1 }, p2: { hand: ['K', 'J', 'Q'] } });
    const declared = act(s, P1, { type: 'DECLARE_ATTACK' }).state;
    const cast = act(declared, P2, { type: 'REFLECT', kId: handId(s, P2, 'K'), jId: handId(s, P2, 'J'), qId: handId(s, P2, 'Q') }).state;
    for (const kind of ['K', 'J', 'Q', 'A'] as const) expect(reasonOf(cast, P1, kind)).toBe('REACTION_REFLECT');
  });

  it('propriedade: sem motivo ⇔ o motor aceita alguma jogada de uma carta só com ela (independente de `legalActions`)', () => {
    // Os alvos são as cartas dos dois campos (e do Reflect): o motor é quem recusa as do próprio campo.
    const candidates = (s: GameState, card: SpecialCard): Action[] => {
      const targets = s.players
        .flatMap((p) => [...p.attackBuffs, ...p.defenseBuffs, ...p.guard, ...(p.reflect ? [p.reflect.k, p.reflect.j, p.reflect.q] : [])])
        .map((c) => c.id);
      return [
        { type: 'PLAY_J', cardId: card.id },
        { type: 'PLAY_Q', cardId: card.id },
        { type: 'PLAY_K', cardIds: [card.id] },
        ...targets.map((targetId): Action => ({ type: 'TRAP', cardId: card.id, targetId })),
        ...targets.map((targetId): Action => ({ type: 'SACRIFICE', cardId: card.id, targetId })),
        // O Roubo (E3): as numéricas dos dois campos, para as duas fileiras do ladrão.
        ...s.players
          .flatMap((p) => [...p.attackRow, ...p.defenseRow])
          .flatMap((c): Action[] => [
            { type: 'STEAL', cardId: card.id, targetId: c.id, row: 'ATK' },
            { type: 'STEAL', cardId: card.id, targetId: c.id, row: 'DEF' },
          ]),
      ];
    };
    let checked = 0;
    fc.assert(
      fc.property(fc.string(), fc.array(fc.nat(), { minLength: 1, maxLength: 64 }), (seed, choices) => {
        playout({
          seed,
          choices,
          maxSteps: 800,
          onStep: (before) => {
            for (const who of before.players.map((p) => p.id)) {
              const view = viewFor(before, who);
              for (const card of view.self.hand) {
                const accepted = candidates(before, card).some((action) => applyAction(before, who, action).ok);
                expect(noPlayReason(view, card) === null).toBe(accepted);
                checked += 1;
              }
            }
          },
        });
      }),
      { numRuns: 12 },
    );
    expect(checked).toBeGreaterThan(500);
  });
});
