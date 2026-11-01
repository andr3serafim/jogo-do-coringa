// A desolação (sub-projeto 6 §7.4): a fileira devastada fica desolada enquanto estiver vazia; quando uma carta volta, a fenda se
// fecha. Puro: as chaves vêm dos eventos e da `view`.
import type { GameEvent, NumCard, PlayerView } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { desolationAfter } from '../../src/model/desolation.ts';
import { scenarioAt } from '../fixtures.ts';

const num = (id: string): NumCard => ({ id, kind: 'NUM', value: 5, suit: 'copas' });
const fell = (player: 'p1' | 'p2', row: 'ATK' | 'DEF', reflected = false): GameEvent => ({ type: 'RowDevastated', player, row, cards: [num('n1')], reflected });
const EMPTY: ReadonlySet<string> = new Set();

/** A mesa com as fileiras vazias, menos as que o teste encher. */
const viewWith = (spec: { self?: { attackRow?: number[]; defenseRow?: number[] }; opponent?: { attackRow?: number[]; defenseRow?: number[] } } = {}): PlayerView =>
  scenarioAt({
    self: { attackRow: [], defenseRow: [], ...spec.self },
    opponent: { attackRow: [], defenseRow: [], ...spec.opponent },
  } as Parameters<typeof scenarioAt>[0]).view;

describe('desolationAfter', () => {
  it('o RowDevastated acrescenta a fileira dele, sua ou do oponente', () => {
    expect([...desolationAfter(EMPTY, [fell('p2', 'DEF')], viewWith())]).toEqual(['p2:DEF']);
    expect([...desolationAfter(EMPTY, [fell('p1', 'ATK')], viewWith())]).toEqual(['p1:ATK']);
  });

  it('a refletida acrescenta a fileira de quem lançou: o evento já diz', () => {
    expect([...desolationAfter(EMPTY, [fell('p1', 'DEF', true)], viewWith())]).toEqual(['p1:DEF']);
  });

  it('a carta que volta tira a fileira (CardsPlaced, Resurrected ou CardStolen: quem diz é a view)', () => {
    const before = new Set(['p2:DEF']);
    const placed: GameEvent = { type: 'CardsPlaced', player: 'p2', placements: [{ card: num('n2'), destination: 'DEF' }] };
    expect([...desolationAfter(before, [placed], viewWith({ opponent: { defenseRow: [5] } }))]).toEqual([]);
    const revived: GameEvent = { type: 'Resurrected', player: 'p2', card: num('n2'), row: 'DEF' };
    expect([...desolationAfter(before, [revived], viewWith({ opponent: { defenseRow: [5] } }))]).toEqual([]);
    const stolen: GameEvent = { type: 'CardStolen', player: 'p2', from: 'p1', card: num('n2'), fromRow: 'ATK', toRow: 'DEF', ace: { id: 'a', kind: 'A', suit: 'paus' } };
    expect([...desolationAfter(before, [stolen], viewWith({ opponent: { defenseRow: [5] } }))]).toEqual([]);
  });

  it('a outra fileira do mesmo dono não muda', () => {
    const before = new Set(['p2:DEF']);
    expect([...desolationAfter(before, [], viewWith({ opponent: { attackRow: [5] } }))]).toEqual(['p2:DEF']);
    expect([...desolationAfter(before, [fell('p2', 'ATK')], viewWith())].sort()).toEqual(['p2:ATK', 'p2:DEF']);
  });

  it('o resync (sem eventos) mantém só as que seguem vazias', () => {
    const before = new Set(['p1:ATK', 'p2:DEF']);
    expect([...desolationAfter(before, [], viewWith({ self: { attackRow: [5] } }))]).toEqual(['p2:DEF']);
  });

  it('nada mudou: devolve o mesmo conjunto', () => {
    const before = new Set(['p2:DEF']);
    expect(desolationAfter(before, [], viewWith())).toBe(before);
  });
});
