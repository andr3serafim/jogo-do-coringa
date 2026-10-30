import { describe, expect, it } from 'vitest';
import { DEFAULT_CONFIG, makeConfig } from '../src/config.ts';
import { createGame } from '../src/create-game.ts';
import { totalCards } from '../src/deck.ts';
import { startRound } from '../src/flow.ts';
import { draw } from '../src/state.ts';
import type { GameEvent } from '../src/types.ts';
import { P1, P2, allCards, setup } from './helpers.ts';

describe('createGame', () => {
  it('rejeita config inválida e jogadores repetidos', () => {
    expect(createGame(makeConfig({ hp: 0 }), 's', [P1, P2]).ok).toBe(false);
    const same = createGame(makeConfig(), 's', [P1, P1]);
    expect(same.ok ? null : same.error.code).toBe('INVALID_PLAYERS');
  });

  it('config sem baralho volta como erro, sem lançar', () => {
    const withoutDeck: Partial<typeof DEFAULT_CONFIG> = { ...DEFAULT_CONFIG };
    delete withoutDeck.deck;
    const result = createGame(withoutDeck as unknown as typeof DEFAULT_CONFIG, 's', [P1, P2]);
    expect(result.ok ? null : result.error.code).toBe('INVALID_CONFIG');
  });

  it("rejeita 'system' como id de jogador (revisão final M2)", () => {
    const reserved = createGame(makeConfig(), 's', ['system', P2]);
    expect(reserved.ok ? null : reserved.error.code).toBe('INVALID_PLAYERS');
  });

  it('começa na rodada 1 de Equipar com 4 cartas para cada', () => {
    const result = createGame(makeConfig(), 'abc', [P1, P2]);
    if (!result.ok) throw new Error(result.error.message);
    const s = result.state;
    expect(s.round).toBe(1);
    expect(s.roundKind).toBe('EQUIP');
    expect(s.phase).toEqual({ kind: 'EQUIP' });
    for (const p of s.players) {
      expect(p.hp).toBe(DEFAULT_CONFIG.hp);
      expect(p.hand.length + p.pending.length).toBe(4);
      expect(p.hand.some((c) => (c as { kind: string }).kind === 'NUM')).toBe(false);
      expect(p.pending.every((c) => c.kind === 'NUM')).toBe(true);
    }
    expect(s.deck).toHaveLength(totalCards(s.config) - 8);
    expect(allCards(s)).toHaveLength(totalCards(s.config));
    expect([P1, P2]).toContain(s.initiative);
  });

  it('é determinístico pela semente', () => {
    expect(createGame(makeConfig(), 'mesma', [P1, P2])).toEqual(createGame(makeConfig(), 'mesma', [P1, P2]));
  });
});

describe('monte', () => {
  it('reembaralha o cemitério quando o monte acaba', () => {
    const s = setup();
    s.graveyard = s.deck.splice(0);
    const before = s.graveyard.length;
    const ev: GameEvent[] = [];
    draw(s, ev);
    expect(ev).toEqual([{ type: 'DeckReshuffled', count: before }]);
    expect(s.graveyard).toHaveLength(0);
    expect(s.deck).toHaveLength(before - 1);
  });

  it('continua a distribuição quando o monte acaba no meio (review focus 4)', () => {
    const s = setup({ round: 3, roundKind: 'ATTACK' });
    s.graveyard = s.deck.splice(3);
    const ev: GameEvent[] = [];
    startRound(s, ev);
    expect(s.round).toBe(4);
    expect(s.phase).toEqual({ kind: 'EQUIP' });
    expect(ev.filter((e) => e.type === 'DeckReshuffled')).toHaveLength(1);
    expect(s.players.reduce((total, p) => total + p.hand.length + p.pending.length, 0)).toBe(8);
    expect(allCards(s)).toHaveLength(totalCards(s.config));
    expect(new Set(allCards(s).map((c) => c.id)).size).toBe(totalCards(s.config));
  });
});

describe('início da rodada de Ataque', () => {
  it('com Escolha da iniciativa, espera a escolha de quem tem a iniciativa', () => {
    const s = setup({ round: 2, roundKind: 'EQUIP', initiative: P2 });
    startRound(s, []);
    expect(s.roundKind).toBe('ATTACK');
    expect(s.phase).toEqual({ kind: 'ORDER_CHOICE', player: P2 });
  });

  it('sem a regra, quem tem a iniciativa ataca primeiro', () => {
    const s = setup({ round: 2, roundKind: 'EQUIP', initiative: P2, config: { initiativeChoice: false } });
    startRound(s, []);
    expect(s.turnOrder).toEqual([P2, P1]);
    expect(s.phase).toEqual({ kind: 'ATTACK_MAIN', player: P2 });
  });

  it('o estado não conta rodadas sem dano nem guarda Pressão (os dois saíram no sub-projeto 5)', () => {
    const s = setup({ round: 4, roundKind: 'EQUIP' });
    startRound(s, []);
    expect(s).not.toHaveProperty('noDamageStreak');
    expect(s).not.toHaveProperty('hpLostThisRound');
    expect(s).not.toHaveProperty('pressure');
  });

  it('segue o ciclo Equipar → Equipar → Ataque → Equipar', () => {
    const s = setup({ round: 0, roundKind: 'EQUIP' });
    const kinds: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      startRound(s, []);
      kinds.push(s.roundKind);
    }
    expect(kinds).toEqual(['EQUIP', 'EQUIP', 'ATTACK', 'EQUIP']);
  });
});
