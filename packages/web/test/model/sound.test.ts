import type { GameEvent, GameResult, NumCard, PlayerId, SpecialCard } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { DAMAGE_BANDS, cueOf, type Cue } from '../../src/model/sound.ts';
import { buildTimeline, type Beat, type TimelineOptions } from '../../src/model/timeline.ts';

const num = (id: string): NumCard => ({ id, kind: 'NUM', value: 5, suit: 'copas' });
const face = (id: string, kind: 'J' | 'Q' | 'K' | 'A' = 'K'): SpecialCard => ({ id, kind, suit: 'ouros' });

const LIVE: TimelineOptions = { mode: 'live', reducedMotion: false, decisionPending: false };
const beatOf = (event: GameEvent): Beat => buildTimeline([event], LIVE)[0]!;
/** A pista do evento para o jogador `p1` (o "eu" dos testes), passando pela linha do tempo como a interface faz. */
const cueFor = (event: GameEvent, me: PlayerId = 'p1'): Cue | null => cueOf(beatOf(event), me);

const damage = (amount: number): GameEvent => ({
  type: 'DamageDealt',
  attacker: 'p1',
  defender: 'p2',
  attack: 9,
  defense: 4,
  damage: amount,
});

/** Um evento de cada tipo do motor (a lista de `timeline.test.ts`). O tipo do mapa barra um tipo novo sem amostra. */
const SAMPLES: { [T in GameEvent['type']]: Extract<GameEvent, { type: T }> } = {
  RoundStarted: { type: 'RoundStarted', round: 1, kind: 'EQUIP' },
  DeckReshuffled: { type: 'DeckReshuffled', count: 9 },
  CardsDealt: { type: 'CardsDealt', player: 'p1', count: 2, cards: [num('n1'), num('n2')] },
  EquipSubmitted: { type: 'EquipSubmitted', player: 'p1' },
  CardsPlaced: { type: 'CardsPlaced', player: 'p1', placements: [{ card: num('n1'), destination: 'ATK' }] },
  OrderChosen: { type: 'OrderChosen', player: 'p1', first: true, turnOrder: ['p1', 'p2'] },
  TurnStarted: { type: 'TurnStarted', player: 'p1' },
  BuffPlayed: { type: 'BuffPlayed', player: 'p1', card: face('j1', 'J'), as: 'J' },
  GuardPlayed: { type: 'GuardPlayed', player: 'p1', cards: [face('k1'), face('k2')] },
  TrapUsed: { type: 'TrapUsed', player: 'p1', card: face('a1', 'A'), target: face('k1'), targetOwner: 'p2' },
  Sacrificed: { type: 'Sacrificed', player: 'p1', card: face('q1', 'Q'), target: face('k1'), targetOwner: 'p2' },
  ReflectPlayed: {
    type: 'ReflectPlayed',
    player: 'p1',
    reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') },
    against: 'ATTACK',
  },
  ReflectCanceled: { type: 'ReflectCanceled', player: 'p2', owner: 'p1' },
  ReflectTriggered: { type: 'ReflectTriggered', owner: 'p1', attacker: 'p2', damage: 4 },
  HandLimitPenalty: { type: 'HandLimitPenalty', player: 'p1', penalty: 'BURN', cards: [face('k1')], fewer: 0 },
  CardStolen: { type: 'CardStolen', player: 'p1', from: 'p2', card: num('n1'), fromRow: 'ATK', toRow: 'DEF', ace: face('a1', 'A') },
  StealDamage: { type: 'StealDamage', player: 'p1', victim: 'p2', value: 7, damage: 7, blocked: false },
  Healed: { type: 'Healed', player: 'p1', amount: 5, source: 'STEAL', card: num('n1') },
  DevastationCast: { type: 'DevastationCast', player: 'p1', target: 'p2', row: 'ATK', k: face('k1'), a: face('a1', 'A'), x: face('j1', 'J') },
  RowDevastated: { type: 'RowDevastated', player: 'p2', row: 'ATK', cards: [num('n1')], reflected: false },
  DevastationCanceled: { type: 'DevastationCanceled', player: 'p1', reason: 'REFLECT_CLASH' },
  ReactionWindowOpened: { type: 'ReactionWindowOpened', responder: 'p1', trigger: 'ATTACK' },
  ReactionWindowClosed: { type: 'ReactionWindowClosed', responder: 'p1', trigger: 'ATTACK' },
  AttackDeclared: { type: 'AttackDeclared', player: 'p1' },
  AbsoluteAttack: { type: 'AbsoluteAttack', player: 'p1' },
  DamageDealt: { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 9, defense: 4, damage: 5 },
  GuardBroken: { type: 'GuardBroken', player: 'p2', cards: [face('k1')] },
  BuffRemoved: { type: 'BuffRemoved', player: 'p2', cards: [face('j1', 'J')] },
  CardsRemovedFromRow: { type: 'CardsRemovedFromRow', player: 'p2', row: 'DEF', cards: [num('n9')] },
  QuadFormed: { type: 'QuadFormed', player: 'p1', quad: { row: 'ATK', value: 7 } },
  QuadBroken: { type: 'QuadBroken', player: 'p1', quad: { row: 'ATK', value: 7 } },
  Resurrected: { type: 'Resurrected', player: 'p1', card: num('n4'), row: 'ATK' },
  AbsoluteDefenseStarted: { type: 'AbsoluteDefenseStarted', player: 'p2' },
  AbsoluteDefenseEnded: { type: 'AbsoluteDefenseEnded', player: 'p2' },
  InitiativeChanged: { type: 'InitiativeChanged', player: 'p2' },
  Exodia: { type: 'Exodia', player: 'p1' },
  GameOver: { type: 'GameOver', result: { kind: 'WIN', winner: 'p1', reason: 'EXODIA' } },
};

const gameOver = (result: GameResult): GameEvent => ({ type: 'GameOver', result });

describe('cueOf: o mapa batida → pista dos sons', () => {
  it('a amostra cobre todos os 37 tipos de evento do motor', () => {
    expect(Object.keys(SAMPLES)).toHaveLength(37);
  });

  describe('carta', () => {
    it.each(['CardsPlaced', 'BuffPlayed', 'GuardPlayed', 'Resurrected'] as const)('%s', (type) => {
      expect(cueFor(SAMPLES[type])).toBe('carta');
    });
  });

  describe('quebra', () => {
    it.each(['GuardBroken', 'TrapUsed', 'Sacrificed'] as const)('%s', (type) => {
      expect(cueFor(SAMPLES[type])).toBe('quebra');
    });

    it('CardsRemovedFromRow da fileira de defesa quebra', () => {
      expect(cueFor({ type: 'CardsRemovedFromRow', player: 'p2', row: 'DEF', cards: [num('n9')] })).toBe('quebra');
    });

    it('CardsRemovedFromRow da fileira de ataque é mudo (é a limpeza do ataque, não uma quebra)', () => {
      expect(cueFor({ type: 'CardsRemovedFromRow', player: 'p1', row: 'ATK', cards: [num('n1')] })).toBeNull();
    });
  });

  describe('golpe, por faixa de dano', () => {
    it('as faixas são 40 e 100', () => {
      expect(DAMAGE_BANDS).toEqual({ medio: 40, forte: 100 });
    });

    it.each([
      [1, 'golpe-leve'],
      [39, 'golpe-leve'],
      [40, 'golpe-medio'],
      [99, 'golpe-medio'],
      [100, 'golpe-forte'],
      [250, 'golpe-forte'],
    ] as const)('dano %i → %s', (amount, cue) => {
      expect(cueFor(damage(amount))).toBe(cue);
    });

    it('dano 0 é mudo', () => {
      expect(cueFor(damage(0))).toBeNull();
    });

    it('não depende de quem sou eu: o golpe soa igual para os dois lados', () => {
      expect(cueFor(damage(50), 'p1')).toBe('golpe-medio');
      expect(cueFor(damage(50), 'p2')).toBe('golpe-medio');
    });
  });

  describe('escudo e absoluto', () => {
    it.each(['ReflectPlayed', 'ReflectTriggered', 'AbsoluteDefenseStarted'] as const)('%s → escudo', (type) => {
      expect(cueFor(SAMPLES[type])).toBe('escudo');
    });

    it.each(['AbsoluteAttack', 'Exodia'] as const)('%s → absoluto', (type) => {
      expect(cueFor(SAMPLES[type])).toBe('absoluto');
    });
  });

  describe('vez', () => {
    it('TurnStarted é a pista só quando a vez é minha', () => {
      expect(cueFor({ type: 'TurnStarted', player: 'p1' }, 'p1')).toBe('vez');
      expect(cueFor({ type: 'TurnStarted', player: 'p2' }, 'p1')).toBeNull();
      expect(cueFor({ type: 'TurnStarted', player: 'p2' }, 'p2')).toBe('vez');
    });

    it('ReactionWindowOpened é a pista só quando quem reage sou eu', () => {
      expect(cueFor({ type: 'ReactionWindowOpened', responder: 'p1', trigger: 'ATTACK' }, 'p1')).toBe('vez');
      expect(cueFor({ type: 'ReactionWindowOpened', responder: 'p2', trigger: 'ATTACK' }, 'p1')).toBeNull();
    });
  });

  describe('fim de partida', () => {
    it('vitória minha é vitoria; a do outro é derrota', () => {
      const win = gameOver({ kind: 'WIN', winner: 'p1', reason: 'EXODIA' });
      expect(cueFor(win, 'p1')).toBe('vitoria');
      expect(cueFor(win, 'p2')).toBe('derrota');
    });

  });

  describe('os outros eventos não têm pista', () => {
    // Os tipos que podem soar (alguns só em certa condição, testada acima). Todo o resto é mudo.
    const SOUNDING = new Set<GameEvent['type']>([
      'CardsPlaced',
      'BuffPlayed',
      'GuardPlayed',
      'Resurrected',
      'GuardBroken',
      'TrapUsed',
      'Sacrificed',
      'CardsRemovedFromRow',
      'DamageDealt',
      'ReflectPlayed',
      'ReflectTriggered',
      'AbsoluteDefenseStarted',
      'AbsoluteAttack',
      'Exodia',
      'TurnStarted',
      'ReactionWindowOpened',
      'GameOver',
    ]);
    const silent = (Object.keys(SAMPLES) as GameEvent['type'][]).filter((type) => !SOUNDING.has(type));

    it('a lista dos mudos tem os 20 tipos restantes', () => {
      expect(silent).toHaveLength(37 - SOUNDING.size);
    });

    it.each(silent)('%s', (type) => {
      expect(cueFor(SAMPLES[type], 'p1')).toBeNull();
      expect(cueFor(SAMPLES[type], 'p2')).toBeNull();
    });
  });
});
