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
  return { firstEquipWithSpecial: { J: 1, Q: 1, K: 2, A: 2, WILD: 3, ...overrides }, reflectByEquip };
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
    for (const kind of ['J', 'Q', 'K', 'A'] as const) {
      expect(result.firstEquipWithSpecial[kind], `${kind} chega`).not.toBeNull();
      expect(result.firstEquipWithSpecial[kind], `${kind} até o 2º Equipar`).toBeLessThanOrEqual(2);
    }
    expect(result.firstEquipWithSpecial.WILD, 'Selvagem chega').not.toBeNull();
    expect(result.firstEquipWithSpecial.WILD, 'Selvagem até o 3º Equipar').toBeLessThanOrEqual(3);
    expect(result.reflectByEquip, 'K + J + Q chegam').not.toBeNull();
    expect(result.reflectByEquip, 'K + J + Q até o 3º Equipar').toBeLessThanOrEqual(3);
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
  it('aceita J, Q, K e A até o 2º Equipar, o Selvagem até o 3º e K + J + Q até o 3º', () => {
    expect(meetsTutorialCriterion(deal())).toBe(true);
    expect(meetsTutorialCriterion(deal({ J: 2, Q: 2, K: 2, A: 2, WILD: 1 }, 3))).toBe(true);
  });

  it('recusa especial tardia, ausente ou sem o trio do Reflect', () => {
    for (const kind of ['J', 'Q', 'K', 'A'] as const) {
      expect(meetsTutorialCriterion(deal({ [kind]: 3 })), `${kind} no 3º`).toBe(false);
      expect(meetsTutorialCriterion(deal({ [kind]: null })), `${kind} ausente`).toBe(false);
    }
    expect(meetsTutorialCriterion(deal({ WILD: null }))).toBe(false);
    expect(meetsTutorialCriterion(deal({ WILD: 4 }))).toBe(false);
    expect(meetsTutorialCriterion(deal({}, null))).toBe(false);
    expect(meetsTutorialCriterion(deal({}, 4))).toBe(false);
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

  it('o Reflect conta K, J e Q de verdade (sem o Selvagem no lugar de um deles)', () => {
    for (const seed of seeds) {
      const { reflectByEquip } = tutorialDeal(seed);
      if (reflectByEquip === null) continue;
      for (const holder of ['p1', 'p2'] as const) {
        const hand = tutorialHand(seed, reflectByEquip as 1 | 2 | 3, holder);
        expect(['K', 'J', 'Q'].every((kind) => hand.includes(kind as SpecialKind)), `${seed} ${holder}`).toBe(true);
      }
    }
  });
});
