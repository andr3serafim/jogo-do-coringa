// Limite de especiais na mão (E3 do sub-projeto 5), com a penalidade na compra. Três formas, para a medição (a escolhida volta ao
// autor): BURN (a especial que passa do limite vai direto ao cemitério), CHOOSE (o jogador descarta o excesso antes de confirmar o
// Equipar) e FEWER (quem passou do limite compra menos no Equipar seguinte).
import { describe, expect, it } from 'vitest';
import { discardsOwed } from '../src/config.ts';
import { legalActions } from '../src/legal-actions.ts';
import type { Card, GameEvent, GameState, PlayerId, RulesConfig } from '../src/types.ts';
import { viewFor } from '../src/view.ts';
import { P1, P2, act, actErr, handId, player, setup, type CardSpec, type PlayerSetup, type SpecialSpec } from './helpers.ts';

type Penalty = NonNullable<RulesConfig['specialLimit']>['penalty'];

const kind = (spec: CardSpec) => (c: Card): boolean =>
  typeof spec === 'number' ? c.kind === 'NUM' && c.value === spec : spec === 'W' ? c.kind === 'WILD' : c.kind === spec;

/**
 * Fim da rodada de Ataque (P2 fecha o turno com o Ataque vazio): a próxima é de Equipar, e a compra sai do topo do monte, uma carta
 * por vez a partir de P1 (a iniciativa). `deal` diz as 4 cartas de cada um, na ordem.
 */
function dealing(penalty: Penalty | null, p1: PlayerSetup, deal: { p1: CardSpec[]; p2: CardSpec[] }): { state: GameState; events: GameEvent[] } {
  const s = setup({
    config: { specialLimit: penalty ? { max: 4, penalty } : undefined },
    p1,
    turnOrder: [P1, P2],
    phase: { kind: 'ATTACK_MAIN', player: P2 },
  });
  const top: Card[] = [];
  for (let i = 0; i < 4; i += 1) {
    for (const spec of [deal.p1[i], deal.p2[i]]) {
      if (spec === undefined) continue;
      const index = s.deck.findIndex(kind(spec));
      top.push(s.deck.splice(index, 1)[0]!);
    }
  }
  s.deck.unshift(...top);
  return act(s, P2, { type: 'END_TURN' });
}

const penalties = (events: GameEvent[], who: PlayerId = P1) => events.filter((e) => e.type === 'HandLimitPenalty' && e.player === who);
const FOUR: SpecialSpec[] = ['K', 'K', 'J', 'Q'];

describe('limite de especiais: BURN', () => {
  it('com 4 na mão, a especial comprada vai ao cemitério; a numérica não', () => {
    const r = dealing('BURN', { hand: FOUR }, { p1: ['K', 5, 'A', 6], p2: [2, 3, 4, 7] });
    expect(r.state.phase).toEqual({ kind: 'EQUIP' });
    expect(player(r.state, P1).hand).toHaveLength(4);
    expect(player(r.state, P1).pending).toHaveLength(2);
    expect(penalties(r.events)).toEqual([expect.objectContaining({ penalty: 'BURN', fewer: 0 })]);
    const burned = penalties(r.events)[0];
    expect(burned?.type === 'HandLimitPenalty' ? burned.cards.map((c) => c.kind) : []).toEqual(['K', 'A']);
    expect(r.state.graveyard.map((c) => c.kind)).toEqual(['K', 'A']);
  });

  it('abaixo do limite, a especial entra até completar 4; as seguintes queimam', () => {
    const r = dealing('BURN', { hand: ['K', 'K', 'J'] }, { p1: ['A', 'Q', 5, 6], p2: [2, 3, 4, 7] });
    expect(player(r.state, P1).hand.map((c) => c.kind)).toEqual(['K', 'K', 'J', 'A']);
    expect(r.state.graveyard.map((c) => c.kind)).toEqual(['Q']);
  });
});

describe('limite de especiais: CHOOSE', () => {
  const over = () => dealing('CHOOSE', { hand: FOUR }, { p1: ['A', 'W', 5, 6], p2: [2, 3, 4, 7] }).state;

  it('a compra deixa passar; o EQUIP é recusado até descartar o excesso', () => {
    const s = over();
    expect(player(s, P1).hand).toHaveLength(6);
    expect(discardsOwed(s.config, 6)).toBe(2);
    expect(actErr(s, P1, { type: 'EQUIP', destinations: ['ATK', 'DEF'] })).toBe('HAND_LIMIT');
  });

  it('o DISCARD precisa ser exatamente o excesso, de cartas da mão, sem repetir', () => {
    const s = over();
    const k = handId(s, P1, 'K');
    expect(actErr(s, P1, { type: 'DISCARD', cardIds: [k] })).toBe('HAND_LIMIT');
    expect(actErr(s, P1, { type: 'DISCARD', cardIds: [k, k] })).toBe('DUPLICATE_CARDS');
    expect(actErr(s, P1, { type: 'DISCARD', cardIds: [k, 'nao-existe'] })).toBe('CARD_NOT_IN_HAND');
    const r = act(s, P1, { type: 'DISCARD', cardIds: [k, handId(s, P1, 'J')] });
    expect(player(r.state, P1).hand).toHaveLength(4);
    expect(r.events).toContainEqual(expect.objectContaining({ type: 'HandLimitPenalty', player: P1, penalty: 'CHOOSE' }));
    expect(act(r.state, P1, { type: 'EQUIP', destinations: ['ATK', 'DEF'] }).state.players[0]!.equipSubmitted).toBe(true);
  });

  it('no limite, o DISCARD é recusado', () => {
    const s = dealing('CHOOSE', { hand: ['K', 'K'] }, { p1: ['A', 5, 6, 7], p2: [2, 3, 4, 8] }).state;
    expect(actErr(s, P1, { type: 'DISCARD', cardIds: [handId(s, P1, 'K')] })).toBe('HAND_LIMIT');
  });

  it('as jogadas legais com a mão acima do limite são só os descartes; depois, o Equipar', () => {
    const s = over();
    const legal = legalActions(viewFor(s, P1));
    expect(legal.length).toBeGreaterThan(0);
    expect(legal.every((a) => a.type === 'DISCARD' && a.cardIds.length === 2)).toBe(true);
    const after = act(s, P1, legal[0]!).state;
    expect(legalActions(viewFor(after, P1)).every((a) => a.type === 'EQUIP')).toBe(true);
  });

  it('no tempo esgotado saem as especiais compradas por último ([I])', () => {
    const s = over();
    const r = act(s, 'system', { type: 'TIMEOUT' });
    const hand = r.state.players[0]!.hand.map((c) => c.kind);
    expect(hand).toEqual(['K', 'K', 'J', 'Q']);
    expect(r.state.graveyard.map((c) => c.kind)).toEqual(expect.arrayContaining(['A', 'WILD']));
  });
});

describe('limite de especiais: FEWER', () => {
  it('com 6 na mão e limite 4, compra 2 no Equipar ([I])', () => {
    const r = dealing('FEWER', { hand: ['K', 'K', 'J', 'Q', 'A', 'A'] }, { p1: [5, 6, 7, 8], p2: [2, 3, 4, 9] });
    const dealt = r.events.find((e) => e.type === 'CardsDealt' && e.player === P1);
    expect(dealt?.type === 'CardsDealt' ? dealt.count : -1).toBe(2);
    expect(penalties(r.events)).toEqual([expect.objectContaining({ penalty: 'FEWER', fewer: 2, cards: [] })]);
    const other = r.events.find((e) => e.type === 'CardsDealt' && e.player === P2);
    expect(other?.type === 'CardsDealt' ? other.count : -1).toBe(4);
  });

  it('no limite, compra as 4', () => {
    const r = dealing('FEWER', { hand: FOUR }, { p1: [5, 6, 7, 8], p2: [2, 3, 4, 9] });
    expect(penalties(r.events)).toEqual([]);
  });
});

describe('sem limite e jogadas de 3 cartas', () => {
  it('sem `specialLimit`, a mão passa de 4', () => {
    const r = dealing(null, { hand: FOUR }, { p1: ['A', 'W', 5, 6], p2: [2, 3, 4, 7] });
    expect(player(r.state, P1).hand).toHaveLength(6);
    expect(discardsOwed(r.state.config, 6)).toBe(0);
  });

  it('com 4 na mão, o Reflect e a Devastação continuam possíveis', () => {
    const attacked = setup({
      config: { specialLimit: { max: 4, penalty: 'BURN' } },
      p1: { hand: ['K', 'J', 'Q', 'A'] },
      p2: { attack: [5] },
      phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' },
      turnOrder: [P2, P1],
    });
    expect(legalActions(viewFor(attacked, P1)).some((a) => a.type === 'REFLECT')).toBe(true);
    const main = setup({ config: { specialLimit: { max: 4, penalty: 'BURN' } }, p1: { hand: ['K', 'A', 'J', 'Q'] }, p2: { attack: [5] } });
    expect(legalActions(viewFor(main, P1)).some((a) => a.type === 'DEVASTATE')).toBe(true);
  });
});
