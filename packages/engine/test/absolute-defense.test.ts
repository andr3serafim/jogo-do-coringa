// A Defesa Absoluta em duas fases (decisoes.md 2026-11-24 (3) e (8); spec `2026-11-24-defesa-absoluta-reflect-design.md` §1.1):
// o 4º Q liga o escudo (a imunidade de sempre), que acaba no fim do primeiro turno do oponente com ataque **sem tirar Q**; enquanto
// houver 4 Q, a DEF segue × 5 e a carta da frente da Defesa não sai depois de ataques, mas os Q ficam ao alcance do oponente.
import { describe, expect, it } from 'vitest';
import { fullDefense } from '../src/combat.ts';
import { legalActions } from '../src/legal-actions.ts';
import type { GameState } from '../src/types.ts';
import { viewFor } from '../src/view.ts';
import { P1, P2, act, handId, player, setup, steps, values, type PlayerSetup } from './helpers.ts';

const QUEENS: PlayerSetup['defenseBuffs'] = ['Q', 'Q', 'Q', 'Q'];
/** Os 4 Q depois do escudo (a fase 2). */
const wall: PlayerSetup = { defenseBuffs: QUEENS, absoluteDefense: false };
/** Os 4 Q no escudo (a fase 1). */
const shield: PlayerSetup = { defenseBuffs: QUEENS, absoluteDefense: true };

/** Fecha a janela de reação que a jogada abriu, se abriu: quem responde passa. */
function settle(s: GameState): GameState {
  return s.phase.kind === 'REACTION' ? act(s, s.phase.responder, { type: 'PASS' }).state : s;
}

const attackAndPass = (s: GameState) =>
  steps(s, [
    [P1, { type: 'DECLARE_ATTACK' }],
    [P2, { type: 'PASS' }],
  ]);

describe('a fase 1, o escudo', () => {
  it('acaba no fim do turno do oponente com ataque, e os 4 Q ficam', () => {
    const r = attackAndPass(setup({ p1: { attack: [5] }, p2: { ...shield, defense: [8] } }));
    expect(r.events).toContainEqual({ type: 'AbsoluteDefenseEnded', player: P2 });
    expect(r.events.some((e) => e.type === 'BuffRemoved' && e.player === P2)).toBe(false);
    expect(player(r.state, P2).absoluteDefense).toBe(false);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(4);
    expect(values(player(r.state, P2).defenseRow)).toEqual([8]);
    expect(player(r.state, P2).hp).toBe(100);
  });

  it('o 4º Q que volta liga o escudo de novo', () => {
    const s = setup({ p1: { hand: ['Q'], defenseBuffs: ['Q', 'Q', 'Q'] } });
    const r = act(s, P1, { type: 'PLAY_Q', cardId: handId(s, P1, 'Q') });
    expect(r.events).toContainEqual({ type: 'AbsoluteDefenseStarted', player: P1 });
    expect(player(r.state, P1).absoluteDefense).toBe(true);
  });
});

describe('a fase 2, os 4 Q sem escudo', () => {
  it('o dano entra com a DEF × 5, e a carta da frente da Defesa fica', () => {
    // ATK (10 + 10 + 10) × 3 = 90; DEF (8 + 6) × 5 = 70.
    const r = attackAndPass(setup({ p1: { attack: [10, 10, 10], attackBuffs: ['J', 'J'] }, p2: { ...wall, defense: [8, 6] } }));
    expect(player(r.state, P2).hp).toBe(80);
    expect(values(player(r.state, P2).defenseRow)).toEqual([8, 6]);
    expect(values(player(r.state, P1).attackRow)).toEqual([10, 10]);
    expect(player(r.state, P2).defenseBuffs).toHaveLength(4);
  });

  it('a Armadilha e o Sacrifício alcançam os Q; com 3 Q a frente volta a sair no ataque', () => {
    const s = setup({ p1: { hand: ['A', 'Q'], attack: [10] }, p2: { ...wall, defense: [8, 6] } });
    const queen = player(s, P2).defenseBuffs[0]!.id;
    const legal = legalActions(viewFor(s, P1));
    expect(legal).toContainEqual({ type: 'TRAP', cardId: handId(s, P1, 'A'), targetId: queen });
    expect(legal).toContainEqual({ type: 'SACRIFICE', cardId: handId(s, P1, 'Q'), targetId: queen });

    const trapped = settle(act(s, P1, { type: 'TRAP', cardId: handId(s, P1, 'A'), targetId: queen }).state);
    expect(player(trapped, P2).defenseBuffs).toHaveLength(3);
    expect(fullDefense(player(trapped, P2), trapped.config)).toBe(false);
    const r = attackAndPass(trapped);
    expect(values(player(r.state, P2).defenseRow)).toEqual([6]);
  });

  it('a Devastação com Q esvazia a Defesa (sem curar)', () => {
    const s = setup({ p1: { hand: ['K', 'A', 'Q'] }, p2: { ...wall, defense: [8, 6], guard: 2 } });
    const devastate = { type: 'DEVASTATE', kId: handId(s, P1, 'K'), aId: handId(s, P1, 'A'), xId: handId(s, P1, 'Q'), row: 'DEF' } as const;
    const r = act(act(s, P1, devastate).state, P2, { type: 'PASS' });
    expect(player(r.state, P2).defenseRow).toEqual([]);
    expect(r.events.some((e) => e.type === 'Healed')).toBe(false);
  });

  it('o Roubo da Defesa tira de vida o valor × 5, e quem rouba cura o mesmo', () => {
    const s = setup({ p1: { hand: ['A'], hp: 40 }, p2: { ...wall, defense: [9, 4] } });
    const nine = player(s, P2).defenseRow[0]!.id;
    const r = settle(act(s, P1, { type: 'STEAL', cardId: handId(s, P1, 'A'), targetId: nine, row: 'ATK' }).state);
    expect(player(r, P2).hp).toBe(55);
    expect(player(r, P1).hp).toBe(85);
    expect(values(player(r, P2).defenseRow)).toEqual([4]);
  });

  it('o Ataque Absoluto quebra todos os K, o dano entra com a DEF × 5, a frente fica e 1 J sai', () => {
    // ATK (10 + 10 + 10) × 5 = 150; DEF (8 + 6) × 5 = 70.
    const r = attackAndPass(
      setup({ p1: { attack: [10, 10, 10], attackBuffs: ['J', 'J', 'J', 'J'] }, p2: { ...wall, defense: [8, 6], guard: 2 } }),
    );
    expect(player(r.state, P2).hp).toBe(20);
    expect(player(r.state, P2).guard).toHaveLength(0);
    expect(values(player(r.state, P2).defenseRow)).toEqual([8, 6]);
    expect(player(r.state, P1).attackBuffs).toHaveLength(3);
  });

  it('com 4 Q a frente não sai depois do ataque, então não cura', () => {
    const r = attackAndPass(
      setup({ p1: { attack: [10, 10, 10], attackBuffs: ['J', 'J'] }, p2: { ...wall, defense: [8, 6], guard: 3, hp: 50 } }),
    );
    expect(player(r.state, P2).guard).toHaveLength(2);
    expect(values(player(r.state, P2).defenseRow)).toEqual([8, 6]);
    expect(r.events.some((e) => e.type === 'Healed')).toBe(false);
    expect(player(r.state, P2).hp).toBe(50);
  });
});

describe('fullDefense', () => {
  it('é ter os Q do limite, com ou sem escudo', () => {
    const three = setup({ p1: { defenseBuffs: ['Q', 'Q', 'Q'] } });
    expect(fullDefense(player(three, P1), three.config)).toBe(false);
    // O Selvagem conta, como em todo bônus.
    const four = setup({ p2: { defenseBuffs: ['Q', 'Q', 'Q', 'W'] } });
    expect(fullDefense(player(four, P2), four.config)).toBe(true);
  });
});
