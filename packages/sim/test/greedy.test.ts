import { describe, expect, it } from 'vitest';
import { legalActions, makeConfig, viewFor, type Action, type GameState, type PlayerId } from '@coringa/engine';
// Builder de cenários do motor: monta estados reais sem inventar cartas.
import { P1, P2, setup, type PlayerSetup } from '@coringa/engine/testing';
import { GREEDY, greedyBot, prefersFirst } from '../src/bots/greedy.ts';
import type { Bot } from '../src/bots/types.ts';
import { runGame } from '../src/match.ts';
import { createRng } from '../src/rng.ts';

const decide = (bot: Bot, s: GameState, who: PlayerId = P1): Action => {
  const view = viewFor(s, who);
  return bot(view, legalActions(view), createRng('teste'));
};

describe('greedy', () => {
  it('só joga ações legais e a partida termina (20 partidas)', () => {
    const checked: Bot = (view, legal, rng) => {
      const action = greedyBot(view, legal, rng);
      expect(legal).toContainEqual(action);
      return action;
    };
    for (let i = 0; i < 20; i += 1) {
      expect(runGame({ config: makeConfig(), seed: `legal-greedy-${i}`, bots: [checked, checked] }).result).not.toBeNull();
    }
  });

  it('completa a Exódia jogando todos os K de uma vez', () => {
    const s = setup({ p1: { hand: ['K', 'K'], guard: 2, attack: [5] } });
    const action = decide(greedyBot, s);
    expect(action.type).toBe('PLAY_K');
    expect(action.type === 'PLAY_K' && action.cardIds).toHaveLength(2);
  });

  it('quebra um K com A na janela da jogada que completaria a Exódia', () => {
    const s = setup({
      p1: { hand: ['A'] },
      p2: { guard: 4 },
      phase: { kind: 'REACTION', responder: P1, trigger: 'K_PLAYED' },
    });
    const action = decide(greedyBot, s);
    expect(action.type).toBe('TRAP');
  });

  it('no Equipar, manda a numérica para a fileira que mais rende (J no Ataque → Ataque; 2 Q na Defesa → Defesa)', () => {
    const opponent: PlayerSetup = { attack: [10, 10], attackBuffs: ['J'] };
    const base = { phase: { kind: 'EQUIP' } as const, roundKind: 'EQUIP' as const, p2: opponent };
    const comJ = setup({ ...base, p1: { pending: [9], attack: [2], attackBuffs: ['J'] } });
    expect(decide(greedyBot, comJ)).toEqual({ type: 'EQUIP', destinations: ['ATK'] });
    const comQ = setup({ ...base, p1: { pending: [9], defense: [2], defenseBuffs: ['Q', 'Q'] } });
    expect(decide(greedyBot, comQ)).toEqual({ type: 'EQUIP', destinations: ['DEF'] });
  });

  it('lança Reflect quando o ataque do oponente é alto', () => {
    const s = setup({ p1: { hand: ['K', 'J', 'Q'], attack: [2] }, p2: { attack: [10, 10, 10], attackBuffs: ['J', 'J'] } });
    expect(decide(greedyBot, s).type).toBe('REFLECT');
  });

  it('sacrifica J quando o J do oponente vale mais que o próprio', () => {
    const s = setup({ p1: { hand: ['J'], attack: [2] }, p2: { attack: [10, 9, 8], attackBuffs: ['J'] } });
    expect(decide(greedyBot, s).type).toBe('SACRIFICE');
  });

  it('na reação a um ataque, usa A no J que mais reduz o dano', () => {
    const s = setup({
      p1: { hand: ['A'], defense: [10] },
      p2: { attack: [10, 10], attackBuffs: ['J'] },
      phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' },
      turnOrder: [P2, P1],
    });
    const view = viewFor(s, P1);
    const action = decide(greedyBot, s);
    expect(action.type).toBe('TRAP');
    expect(action.type === 'TRAP' && view.opponent.attackBuffs.map((c) => c.id)).toContain(action.type === 'TRAP' && action.targetId);
    expect(GREEDY.trapReaction).toBe(10);
  });

  it('passa na reação quando a Armadilha evitaria pouco dano', () => {
    const s = setup({
      p1: { hand: ['A'], defense: [10] },
      p2: { attack: [3, 2], attackBuffs: ['J'] },
      phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' },
      turnOrder: [P2, P1],
    });
    expect(decide(greedyBot, s)).toEqual({ type: 'PASS' });
  });

  it('Escolha da ordem: 1º com dano letal; 2º quando à frente sem letal; 1º quando atrás', () => {
    const order = { phase: { kind: 'ORDER_CHOICE', player: P1 } as const };
    expect(prefersFirst(viewFor(setup({ ...order, p1: { attack: [10, 10] }, p2: { hp: 15 } }), P1))).toBe(true);
    expect(prefersFirst(viewFor(setup({ ...order, p1: { hp: 90, attack: [2] }, p2: { hp: 80 } }), P1))).toBe(false);
    expect(prefersFirst(viewFor(setup({ ...order, p1: { hp: 50, attack: [2] }, p2: { hp: 80 } }), P1))).toBe(true);
  });

  it('é determinístico para a mesma semente de bot', () => {
    const a = runGame({ config: makeConfig(), seed: 'det', bots: [greedyBot, greedyBot] });
    const b = runGame({ config: makeConfig(), seed: 'det', bots: [greedyBot, greedyBot] });
    expect(b.finalState).toEqual(a.finalState);
  });
});

