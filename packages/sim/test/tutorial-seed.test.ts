import { applyAction, createGame, DEFAULT_CONFIG, type GameState, type SpecialKind } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import {
  meetsTutorialCriterion,
  TUTORIAL_SEED,
  tutorialDeal,
  tutorialHand,
  tutorialSeedAt,
  type TutorialDeal,
} from '../src/tutorial-seed.ts';

const KINDS: readonly SpecialKind[] = ['J', 'Q', 'K', 'A', 'WILD'];

/** Uma distribuição com tudo cedo; cada teste muda só o campo que quer provar. */
function deal(overrides: Partial<TutorialDeal['firstEquipWithSpecial']> = {}, reflectByEquip: number | null = 2): TutorialDeal {
  return {
    firstEquipWithSpecial: { J: 1, Q: null, K: 2, A: 2, WILD: 2, ...overrides },
    reflectByEquip,
    burnedByEquip2: 0,
    numericsInEquip1: 2,
    initiativeIsMine: true,
  };
}

/** Joga a partida só com o TIMEOUT do sistema (Equipar automático, ordem, ataque e janelas fechadas) até o 3º Equipar. */
function playUntilThirdEquip(seed: string): { afterEquip1: GameState; afterEquip2: GameState; afterEquip3: GameState } {
  const created = createGame(DEFAULT_CONFIG, seed, ['p1', 'p2']);
  if (!created.ok) throw new Error(created.error.message);
  const afterEquip1 = created.state;
  let state = afterEquip1;
  const timeout = (): void => {
    const result = applyAction(state, 'system', { type: 'TIMEOUT' });
    if (!result.ok) throw new Error(result.error.message);
    state = result.state;
  };
  timeout();
  const afterEquip2 = state;
  while (state.round < 4 && state.phase.kind !== 'GAME_OVER') timeout();
  return { afterEquip1, afterEquip2, afterEquip3: state };
}

const handKinds = (state: GameState): SpecialKind[] => state.players.find((p) => p.id === 'p1')!.hand.map((c) => c.kind).sort();

describe('a semente do tutorial', () => {
  it('a semente do tutorial cumpre o critério', () => {
    const result = tutorialDeal(TUTORIAL_SEED);
    for (const kind of ['K', 'A', 'WILD'] as const) {
      expect(result.firstEquipWithSpecial[kind], `${kind} chega`).not.toBeNull();
      expect(result.firstEquipWithSpecial[kind], `${kind} até o 2º Equipar`).toBeLessThanOrEqual(2);
    }
    const buff = Math.min(result.firstEquipWithSpecial.J ?? Infinity, result.firstEquipWithSpecial.Q ?? Infinity);
    expect(buff, 'um J ou um Q até o 2º Equipar').toBeLessThanOrEqual(2);
    expect(result.reflectByEquip, 'o Reflect até o 2º Equipar').toBeLessThanOrEqual(2);
    expect(result.burnedByEquip2, 'nenhuma especial queimada até o 2º Equipar').toBe(0);
    expect(result.numericsInEquip1, 'ao menos uma numérica no 1º Equipar (a dica do Equipar)').toBeGreaterThanOrEqual(1);
    expect(result.initiativeIsMine, 'a iniciativa com o jogador (a dica da ordem)').toBe(true);
    expect(meetsTutorialCriterion(result)).toBe(true);
  });

  it('é a de menor índice em tutorial-0, tutorial-1, … que passa no critério', () => {
    const index = Number(TUTORIAL_SEED.replace('tutorial-', ''));
    expect(TUTORIAL_SEED).toBe(tutorialSeedAt(index));
    for (let i = 0; i < index; i += 1) {
      expect(meetsTutorialCriterion(tutorialDeal(tutorialSeedAt(i))), tutorialSeedAt(i)).toBe(false);
    }
  });

  it('tutorialDeal é determinística', () => {
    const first = tutorialDeal(TUTORIAL_SEED);
    tutorialDeal('outra-semente');
    expect(tutorialDeal(TUTORIAL_SEED)).toEqual(first);
    expect(tutorialDeal('outra-semente')).toEqual(tutorialDeal('outra-semente'));
  });
});

describe('o critério da procura', () => {
  it('aceita K, A, o Selvagem e um J ou um Q até o 2º Equipar, com o Reflect e sem queimar nada', () => {
    expect(meetsTutorialCriterion(deal())).toBe(true);
    expect(meetsTutorialCriterion(deal({ J: null, Q: 1, K: 1, A: 2, WILD: 1 }, 1))).toBe(true);
  });

  it('recusa especial tardia, ausente ou sem o trio do Reflect', () => {
    for (const kind of ['K', 'A', 'WILD'] as const) {
      expect(meetsTutorialCriterion(deal({ [kind]: 3 })), `${kind} no 3º`).toBe(false);
      expect(meetsTutorialCriterion(deal({ [kind]: null })), `${kind} ausente`).toBe(false);
    }
    expect(meetsTutorialCriterion(deal({ J: null, Q: null })), 'sem J nem Q').toBe(false);
    expect(meetsTutorialCriterion(deal({ J: 3, Q: 3 })), 'J e Q só no 3º').toBe(false);
    expect(meetsTutorialCriterion(deal({}, null))).toBe(false);
    expect(meetsTutorialCriterion(deal({}, 3))).toBe(false);
    expect(meetsTutorialCriterion({ ...deal(), burnedByEquip2: 1 }), 'uma queimada').toBe(false);
  });
});

describe('tutorialDeal e o motor', () => {
  const seeds = Array.from({ length: 80 }, (_, i) => `motor-${i}`);

  it('a mão de p1 bate com a do motor em cada Equipar, com a iniciativa que o 3º Equipar realmente teve', () => {
    const holders = new Set<string>();
    let flips = 0;
    for (const seed of seeds) {
      const { afterEquip1, afterEquip2, afterEquip3 } = playUntilThirdEquip(seed);
      expect(afterEquip3.round, seed).toBe(4);
      expect(afterEquip3.roundKind, seed).toBe('EQUIP');
      // As rodadas 1 e 2 não têm ataque no meio: a iniciativa é a da criação e só depende da semente.
      expect(afterEquip2.initiative, seed).toBe(afterEquip1.initiative);
      expect(tutorialHand(seed, 1, afterEquip1.initiative), seed).toEqual(handKinds(afterEquip1));
      expect(tutorialHand(seed, 2, afterEquip2.initiative), seed).toEqual(handKinds(afterEquip2));
      expect(tutorialHand(seed, 3, afterEquip3.initiative), seed).toEqual(handKinds(afterEquip3));
      holders.add(afterEquip3.initiative);
      if (afterEquip3.initiative !== afterEquip1.initiative) flips += 1;
    }
    // O ataque da rodada 3 troca a iniciativa de verdade: sem os dois casos, o teste não provaria o ramo do 3º Equipar.
    expect([...holders].sort()).toEqual(['p1', 'p2']);
    expect(flips).toBeGreaterThan(0);
  });

  it('o 3º Equipar só conta o especial que vale com qualquer das duas iniciativas', () => {
    let counted = 0;
    for (const seed of seeds) {
      const result = tutorialDeal(seed);
      for (const kind of KINDS) {
        const first = result.firstEquipWithSpecial[kind];
        const inHand = (equip: 1 | 2 | 3, holder: 'p1' | 'p2'): boolean => tutorialHand(seed, equip, holder).includes(kind);
        if (first === null) {
          expect(inHand(3, 'p1') && inHand(3, 'p2'), `${seed} ${kind}`).toBe(false);
        } else {
          counted += 1;
          expect(inHand(first as 1 | 2 | 3, 'p1') && inHand(first as 1 | 2 | 3, 'p2'), `${seed} ${kind}`).toBe(true);
          if (first > 1) expect(inHand((first - 1) as 1 | 2, 'p1') && inHand((first - 1) as 1 | 2, 'p2'), `${seed} ${kind}`).toBe(false);
        }
      }
    }
    expect(counted).toBeGreaterThan(0);
  });

  it('o Reflect conta o K e o J e o Q, com o Selvagem no lugar de um deles (ou dos dois)', () => {
    let withWild = 0;
    for (const seed of seeds) {
      const { reflectByEquip } = tutorialDeal(seed);
      if (reflectByEquip === null) continue;
      for (const holder of ['p1', 'p2'] as const) {
        const hand = tutorialHand(seed, reflectByEquip as 1 | 2 | 3, holder);
        const count = (kind: SpecialKind): number => hand.filter((k) => k === kind).length;
        const missing = (count('J') > 0 ? 0 : 1) + (count('Q') > 0 ? 0 : 1);
        expect(count('K') > 0 && missing <= count('WILD'), `${seed} ${holder}`).toBe(true);
        if (missing > 0) withWild += 1;
      }
    }
    expect(withWild).toBeGreaterThan(0);
  });

  it('a queimada até o 2º Equipar bate com a BURN do motor (sem jogada no meio, a conta é exata)', () => {
    let burnedSome = 0;
    for (const seed of seeds) {
      const created = createGame(DEFAULT_CONFIG, seed, ['p1', 'p2']);
      if (!created.ok) throw new Error(created.error.message);
      const result = applyAction(created.state, 'system', { type: 'TIMEOUT' });
      if (!result.ok) throw new Error(result.error.message);
      expect(result.state.round, seed).toBe(2);
      const burned = result.events.reduce((n, e) => (e.type === 'HandLimitPenalty' && e.player === 'p1' ? n + e.cards.length : n), 0);
      expect(tutorialDeal(seed).burnedByEquip2, seed).toBe(burned);
      if (burned > 0) burnedSome += 1;
    }
    expect(burnedSome).toBeGreaterThan(0);
  });
});
