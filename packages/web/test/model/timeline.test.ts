import { describe, expect, it } from 'vitest';
import type { GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import { SCENE_MS } from '@coringa/protocol';
import {
  BEAT_MS,
  CATCH_UP_CAP_MS,
  DECISION_CAP_MS,
  FIELD_SCENES,
  INVERT_COOLDOWN_MS,
  INITIATIVE_BANNER_MS,
  INVERT_MIN_HOLD_MS,
  NO_INVERT,
  RARE_SCENE_MS,
  SCENE_INVERT_LEAD_MS,
  buildTimeline,
  luminanceSwitches,
  quietOnly,
  timelineMs,
  type Beat,
  type SceneKind,
  type TimelineOptions,
} from '../../src/model/timeline.ts';
import { SCENE_MOMENTS } from '../../src/model/scene-moments.ts';
import { damageBeatIndex } from '../../src/model/effects.ts';
import { BOTS, type BotName } from '@coringa/sim/bots';
import { createRng } from '@coringa/sim/rng';
import { seededSteps } from '../fixtures.ts';

const num = (id: string): NumCard => ({ id, kind: 'NUM', value: 5, suit: 'copas' });
const face = (id: string, kind: 'J' | 'Q' | 'K' | 'A' = 'K'): SpecialCard => ({ id, kind, suit: 'ouros' });

const LIVE: TimelineOptions = { mode: 'live', reducedMotion: false, decisionPending: false };
const MODES: TimelineOptions['mode'][] = ['live', 'catchUp', 'resync'];

/** Um evento de cada tipo do motor, com o tipo de batida esperado (spec §4.2). */
const SAMPLES: { event: GameEvent; kind: Beat['kind']; scene?: SceneKind; cards?: string[] }[] = [
  { event: { type: 'RoundStarted', round: 1, kind: 'EQUIP' }, kind: 'banner' },
  { event: { type: 'DeckReshuffled', count: 9 }, kind: 'move' },
  { event: { type: 'CardsDealt', player: 'p1', count: 2, cards: [num('n1'), num('n2')] }, kind: 'move', cards: ['n1', 'n2'] },
  { event: { type: 'CardsDealt', player: 'p2', count: 2 }, kind: 'move', cards: [] },
  { event: { type: 'EquipSubmitted', player: 'p1' }, kind: 'quiet' },
  {
    event: {
      type: 'CardsPlaced',
      player: 'p1',
      placements: [
        { card: num('n1'), destination: 'ATK' },
        { card: num('n2'), destination: 'REPLACE_LAST_DEF', replaced: num('n3') },
      ],
    },
    kind: 'move',
    cards: ['n1', 'n2', 'n3'],
  },
  { event: { type: 'OrderChosen', player: 'p1', first: true, turnOrder: ['p1', 'p2'] }, kind: 'banner' },
  { event: { type: 'TurnStarted', player: 'p1' }, kind: 'banner' },
  { event: { type: 'BuffPlayed', player: 'p1', card: face('j1', 'J'), as: 'J' }, kind: 'move', cards: ['j1'] },
  { event: { type: 'GuardPlayed', player: 'p1', cards: [face('k1'), face('k2')] }, kind: 'move', cards: ['k1', 'k2'] },
  {
    event: { type: 'TrapUsed', player: 'p1', card: face('a1', 'A'), target: face('k1'), targetOwner: 'p2' },
    kind: 'move',
    cards: ['a1', 'k1'],
  },
  {
    event: { type: 'Sacrificed', player: 'p1', card: face('q1', 'Q'), target: face('k1'), targetOwner: 'p2' },
    kind: 'move',
    cards: ['q1', 'k1'],
  },
  {
    event: { type: 'ReflectPlayed', player: 'p1', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') }, against: 'ATTACK' },
    kind: 'scene',
    scene: 'REFLECT_PLAYED',
    cards: ['k1', 'j1', 'q1'],
  },
  { event: { type: 'ReflectCanceled', player: 'p2', owner: 'p1' }, kind: 'scene', scene: 'REFLECT_CANCELED' },
  {
    event: { type: 'DevastationCast', player: 'p1', target: 'p2', row: 'ATK', k: face('k1'), a: face('a1', 'A'), x: face('j1', 'J') },
    kind: 'banner',
    cards: ['k1', 'a1', 'j1'],
  },
  {
    event: { type: 'RowDevastated', player: 'p2', row: 'ATK', cards: [num('n1')], reflected: false },
    kind: 'scene',
    scene: 'DEVASTATION',
    cards: [],
  },
  {
    event: { type: 'DevastationCanceled', player: 'p1', reason: 'REFLECT_CLASH' },
    kind: 'scene',
    scene: 'DEVASTATION_CANCELED',
    cards: [],
  },
  { event: { type: 'HandLimitPenalty', player: 'p1', penalty: 'BURN', cards: [face('k1')], fewer: 0 }, kind: 'banner', cards: ['k1'] },
  {
    event: { type: 'CardStolen', player: 'p1', from: 'p2', card: num('n1'), fromRow: 'ATK', toRow: 'DEF', ace: face('a1', 'A') },
    kind: 'banner',
    cards: ['n1', 'a1'],
  },
  { event: { type: 'StealDamage', player: 'p1', victim: 'p2', value: 7, damage: 7, blocked: false }, kind: 'damage' },
  { event: { type: 'Healed', player: 'p1', amount: 5, source: 'STEAL', card: num('n1') }, kind: 'damage' },
  {
    event: { type: 'ReflectTriggered', owner: 'p1', attacker: 'p2', damage: 4 },
    kind: 'scene',
    scene: 'REFLECT_TRIGGERED',
  },
  { event: { type: 'ReactionWindowOpened', responder: 'p2', trigger: 'ATTACK' }, kind: 'banner' },
  { event: { type: 'ReactionWindowClosed', responder: 'p2', trigger: 'ATTACK' }, kind: 'quiet' },
  { event: { type: 'AttackDeclared', player: 'p1' }, kind: 'move' },
  { event: { type: 'AbsoluteAttack', player: 'p1' }, kind: 'scene', scene: 'ABSOLUTE_ATTACK' },
  {
    event: { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 9, defense: 4, damage: 5 },
    kind: 'damage',
  },
  { event: { type: 'GuardBroken', player: 'p2', cards: [face('k1')] }, kind: 'move', cards: ['k1'] },
  { event: { type: 'BuffRemoved', player: 'p2', cards: [face('j1', 'J')] }, kind: 'move', cards: ['j1'] },
  { event: { type: 'CardsRemovedFromRow', player: 'p2', row: 'DEF', cards: [num('n9')] }, kind: 'move', cards: ['n9'] },
  { event: { type: 'QuadFormed', player: 'p1', quad: { row: 'ATK', value: 7 } }, kind: 'banner' },
  { event: { type: 'QuadBroken', player: 'p1', quad: { row: 'ATK', value: 7 } }, kind: 'banner' },
  { event: { type: 'Resurrected', player: 'p1', card: num('n4'), row: 'ATK' }, kind: 'scene', scene: 'RESURRECTED', cards: ['n4'] },
  { event: { type: 'AbsoluteDefenseStarted', player: 'p2' }, kind: 'scene', scene: 'ABSOLUTE_DEFENSE' },
  { event: { type: 'AbsoluteDefenseEnded', player: 'p2' }, kind: 'move' },
  { event: { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 } }, kind: 'banner' },
  { event: { type: 'Exodia', player: 'p1' }, kind: 'scene', scene: 'EXODIA' },
  { event: { type: 'GameOver', result: { kind: 'WIN', winner: 'p1', reason: 'EXODIA' } }, kind: 'banner' },
];

const ATTACK: GameEvent[] = [
  { type: 'AttackDeclared', player: 'p1' },
  { type: 'ReactionWindowOpened', responder: 'p2', trigger: 'ATTACK' },
  { type: 'ReactionWindowClosed', responder: 'p2', trigger: 'ATTACK' },
  { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 9, defense: 4, damage: 5 },
  { type: 'CardsRemovedFromRow', player: 'p1', row: 'ATK', cards: [num('n1')] },
  { type: 'CardsRemovedFromRow', player: 'p2', row: 'DEF', cards: [num('n2')] },
];

const ABS_ATTACK: GameEvent = { type: 'AbsoluteAttack', player: 'p1' };
const DAMAGE: GameEvent = { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 9, defense: 4, damage: 5 };
const EXODIA: GameEvent = { type: 'Exodia', player: 'p1' };
const REFLECT_PLAYED: GameEvent = {
  type: 'ReflectPlayed',
  player: 'p1',
  reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') },
  against: 'ATTACK',
};
const REFLECT_TRIGGERED: GameEvent = { type: 'ReflectTriggered', owner: 'p1', attacker: 'p2', damage: 30 };
const REFLECT_CANCELED: GameEvent = { type: 'ReflectCanceled', player: 'p2', owner: 'p1' };
const ROW_DEVASTATED: GameEvent = { type: 'RowDevastated', player: 'p2', row: 'DEF', cards: [num('n1')], reflected: false };

/** A soma das cenas raras, que não contam no teto de decisão. */
/** O que fica fora do teto de decisão: as cenas raras e a faixa da iniciativa (fora do `catchUp`). */
const rareMs = (beats: Beat[]): number =>
  beats
    .filter((b) => (b.scene !== null && b.scene in RARE_SCENE_MS) || (b.event.type === 'InitiativeDecided' && b.durationMs === INITIATIVE_BANNER_MS))
    .reduce((sum, b) => sum + b.durationMs, 0);

/** Maior número de trocas dentro de uma janela fechada de 1000 ms. */
function maxSwitchesPerSecond(switches: number[]): number {
  let max = 0;
  for (let i = 0; i < switches.length; i++) {
    let n = 0;
    for (let j = i; j < switches.length && switches[j]! - switches[i]! <= 1_000; j++) n++;
    max = Math.max(max, n);
  }
  return max;
}

function expectPhotosafe(beats: Beat[], reducedMotion: boolean): void {
  const switches = luminanceSwitches(beats);
  expect(maxSwitchesPerSecond(switches)).toBeLessThanOrEqual(3);
  for (const beat of beats) {
    if (beat.kind !== 'scene') expect(beat.invert).toBeNull();
    if (beat.invert) {
      expect(beat.invert.holdMs).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
      expect(beat.invert.atMs).toBeGreaterThanOrEqual(beat.startMs);
      expect(beat.invert.atMs + beat.invert.holdMs).toBeLessThanOrEqual(beat.startMs + beat.durationMs);
    }
  }
  if (reducedMotion) expect(switches).toEqual([]);
  expect(switches).toEqual([...switches].sort((a, b) => a - b));
}

describe('mapeamento evento → batida (spec §4.2)', () => {
  it('cobre todos os tipos de evento do motor', () => {
    expect(new Set(SAMPLES.map((s) => s.event.type)).size).toBe(37);
  });

  for (const { event, kind, scene, cards } of SAMPLES) {
    it(`${event.type} → ${kind}${scene ? ` (cena ${scene})` : ''}`, () => {
      const [beat, ...rest] = buildTimeline([event], LIVE);
      expect(rest).toEqual([]);
      expect(beat!.event).toBe(event);
      expect(beat!.kind).toBe(kind);
      expect(beat!.scene).toBe(scene ?? null);
      if (cards) expect(beat!.cards).toEqual(cards);
      const rare = scene !== undefined && scene in RARE_SCENE_MS ? RARE_SCENE_MS[scene as keyof typeof RARE_SCENE_MS] : null;
      const held = event.type === 'InitiativeDecided' ? INITIATIVE_BANNER_MS : null;
      expect(beat!.durationMs).toBe(kind === 'quiet' ? 0 : (rare ?? held ?? BEAT_MS[kind as 'move']));
      expect(beat!.invert !== null).toBe(kind === 'scene' && !NO_INVERT.has(scene!));
    });
  }

  it('quietOnly: só eventos de batida quieta, e ao menos um (decisoes.md 2026-11-03 (1), ponto 17)', () => {
    const quiet = SAMPLES.filter((s) => s.kind === 'quiet').map((s) => s.event);
    expect(quiet.length).toBeGreaterThan(0);
    for (const event of quiet) expect(quietOnly([event])).toBe(true);
    for (const { event } of SAMPLES.filter((s) => s.kind !== 'quiet')) expect(quietOnly([event])).toBe(false);
    expect(quietOnly(quiet)).toBe(true);
    // A cura que não curou nada passa quieta; a que curou tem número.
    expect(quietOnly([{ type: 'Healed', player: 'p1', amount: 0, source: 'DEFENSE', card: num('n9') }])).toBe(true);
    expect(quietOnly([{ type: 'EquipSubmitted', player: 'p1' }, { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 9, defense: 3, damage: 6 }])).toBe(false);
    // Sem evento nenhum não é quieto: é o começo de uma partida (a revanche), que troca a mesa inteira.
    expect(quietOnly([])).toBe(false);
  });
});

describe('as cenas raras (U3 do sub-projeto 5)', () => {
  it('as cenas raras com os tempos do protótipo (sub-projeto 6: os Absolutos na fatia 2, a Exódia e a Devastação na 3)', () => {
    expect(RARE_SCENE_MS).toEqual({
      EXODIA: 5_800,
      ABSOLUTE_ATTACK: 4_500,
      ABSOLUTE_DEFENSE: 4_800,
      DEVASTATION: 3_100,
      DEVASTATION_CANCELED: 1_400,
      REFLECT_PLAYED: 1_500,
      REFLECT_TRIGGERED: 3_800,
      REFLECT_CANCELED: 1_400,
      RESURRECTED: 4_600,
    });
  });

  it('os tempos das cenas são os da tabela do protocolo, a mesma que o servidor usa na folga (sub-projeto 6 §9)', () => {
    expect(RARE_SCENE_MS).toEqual({
      EXODIA: SCENE_MS.Exodia,
      ABSOLUTE_ATTACK: SCENE_MS.AbsoluteAttack,
      ABSOLUTE_DEFENSE: SCENE_MS.AbsoluteDefenseStarted,
      DEVASTATION: SCENE_MS.RowDevastated,
      DEVASTATION_CANCELED: SCENE_MS.DevastationCanceled,
      REFLECT_PLAYED: SCENE_MS.ReflectPlayed,
      REFLECT_TRIGGERED: SCENE_MS.ReflectTriggered,
      REFLECT_CANCELED: SCENE_MS.ReflectCanceled,
      RESURRECTED: SCENE_MS.Resurrected,
    });
  });

  it('a cura que não curou nada (a vida já cheia) passa quieta', () => {
    const [beat] = buildTimeline([{ type: 'Healed', player: 'p1', amount: 0, source: 'STEAL', card: num('n1') }], LIVE);
    expect(beat!.kind).toBe('quiet');
    expect(beat!.durationMs).toBe(0);
  });

  it('nos Absolutos, a inversão é no impacto do feixe (3,2 s) e na trava do escudo (2,7 s), e acaba antes do fim da cena', () => {
    expect(SCENE_INVERT_LEAD_MS.ABSOLUTE_ATTACK).toBe(SCENE_MOMENTS.ABSOLUTE_ATTACK.hitAt);
    expect(SCENE_INVERT_LEAD_MS.ABSOLUTE_ATTACK).toBe(3_200);
    expect(SCENE_INVERT_LEAD_MS.ABSOLUTE_DEFENSE).toBe(SCENE_MOMENTS.ABSOLUTE_DEFENSE.lockAt);
    expect(SCENE_INVERT_LEAD_MS.ABSOLUTE_DEFENSE).toBe(2_700);
    expect(SCENE_INVERT_LEAD_MS.ABSOLUTE_ATTACK + 600).toBeLessThan(RARE_SCENE_MS.ABSOLUTE_ATTACK);
    expect(SCENE_INVERT_LEAD_MS.ABSOLUTE_DEFENSE + 600).toBeLessThan(RARE_SCENE_MS.ABSOLUTE_DEFENSE);
  });

  it('a Defesa Absoluta inverte na trava', () => {
    const [beat] = buildTimeline([{ type: 'AbsoluteDefenseStarted', player: 'p1' }], LIVE);
    expect(beat!.invert).toEqual({ atMs: beat!.startMs + 2_700, holdMs: 600 });
  });
});

describe('a Exódia e a Devastação (sub-projeto 6 §7.3, §7.4)', () => {
  const cast: GameEvent = { type: 'DevastationCast', player: 'p1', target: 'p2', row: 'DEF', k: face('k1'), a: face('a1', 'A'), x: face('q1', 'Q') };
  const fell: GameEvent = { type: 'RowDevastated', player: 'p2', row: 'DEF', cards: [num('n1'), num('n2')], reflected: false };

  it('a Exódia dura 5,8 s e inverte quando a coroa crava', () => {
    expect(SCENE_INVERT_LEAD_MS.EXODIA).toBe(SCENE_MOMENTS.EXODIA.crownAt);
    const [beat] = buildTimeline([EXODIA], LIVE);
    expect(beat!.durationMs).toBe(5_800);
    expect(beat!.invert).toEqual({ atMs: SCENE_MOMENTS.EXODIA.crownAt, holdMs: 600 });
  });

  it('a fileira que cai é a cena da Devastação: 3,1 s, sem cartas de movimento, e inverte quando o chão se abre', () => {
    expect(SCENE_INVERT_LEAD_MS.DEVASTATION).toBe(SCENE_MOMENTS.DEVASTATION.openAt);
    const [beat] = buildTimeline([fell], { ...LIVE, decisionPending: true });
    expect(beat!).toMatchObject({ kind: 'scene', scene: 'DEVASTATION', durationMs: 3_100, cards: [] });
    expect(beat!.invert).toEqual({ atMs: SCENE_MOMENTS.DEVASTATION.openAt, holdMs: 600 });
    const [reduced] = buildTimeline([fell], { ...LIVE, reducedMotion: true });
    expect(reduced!.invert).toBeNull();
  });

  it('o lançamento é uma faixa que leva as três cartas: o alvo fica sabendo, e a reação segue na barra', () => {
    const [beat] = buildTimeline([cast], LIVE);
    expect(beat!).toMatchObject({ kind: 'banner', scene: null, cards: ['k1', 'a1', 'q1'], invert: null });
  });

  it('a cancelada é uma cena curta de 1,4 s, sem inversão', () => {
    for (const reason of ['REFLECT_CLASH', 'ABSOLUTE_DEFENSE'] as const) {
      const [beat] = buildTimeline([{ type: 'DevastationCanceled', player: 'p1', reason }], LIVE);
      expect(beat!).toMatchObject({ kind: 'scene', scene: 'DEVASTATION_CANCELED', durationMs: 1_400, invert: null });
    }
    expect(NO_INVERT.has('DEVASTATION_CANCELED')).toBe(true);
  });

  it('as duas e a anulação dos Reflects são cenas de campo (sem cortina nem faixa); as outras, não', () => {
    expect([...FIELD_SCENES].sort()).toEqual(['DEVASTATION', 'DEVASTATION_CANCELED', 'REFLECT_CANCELED']);
  });

  it('a refletida: a cena do Reflect e depois a fileira de quem lançou, as duas inversões dentro da regra', () => {
    const reflected: GameEvent[] = [
      { type: 'ReflectPlayed', player: 'p2', reflect: { k: face('k2'), j: face('j2', 'J'), q: face('q2', 'Q') }, against: 'DEVASTATION' },
      { type: 'ReactionWindowClosed', responder: 'p2', trigger: 'DEVASTATION' },
      { type: 'RowDevastated', player: 'p1', row: 'DEF', cards: [num('n3')], reflected: true },
    ];
    for (const reducedMotion of [false, true]) {
      const beats = buildTimeline(reflected, { ...LIVE, reducedMotion });
      expectPhotosafe(beats, reducedMotion);
      expect(beats.at(-1)!.scene).toBe('DEVASTATION');
    }
  });
});

describe('o golpe dentro do Ataque Absoluto (sub-projeto 6 §7.1)', () => {
  const HIT: GameEvent = { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 200, defense: 46, damage: 154 };
  const REMOVED: GameEvent = { type: 'CardsRemovedFromRow', player: 'p1', row: 'ATK', cards: [num('n1')] };

  it('o DamageDealt logo depois vira o golpe da cena: quieto, sem duração, e a cena o guarda no instante do impacto', () => {
    const beats = buildTimeline([ABS_ATTACK, HIT, REMOVED], LIVE);
    const [scene, absorbed, removed] = beats;
    expect(scene!.hit).toEqual({ event: HIT, atMs: scene!.startMs + SCENE_MOMENTS.ABSOLUTE_ATTACK.hitAt });
    expect(absorbed).toMatchObject({ kind: 'quiet', durationMs: 0, absorbed: true, hit: null });
    expect(removed!.absorbed).toBe(false);
    expect(timelineMs(beats)).toBe(RARE_SCENE_MS.ABSOLUTE_ATTACK + BEAT_MS.move);
  });

  it('a inversão é no impacto', () => {
    const [scene] = buildTimeline([ABS_ATTACK, HIT], LIVE);
    expect(scene!.invert!.atMs).toBe(scene!.hit!.atMs);
  });

  it('a Guarda quebrada no meio não impede: o golpe é absorvido e a quebra fica como batida depois da cena', () => {
    const broken: GameEvent = { type: 'GuardBroken', player: 'p2', cards: [face('k1'), face('k2')] };
    const beats = buildTimeline([ABS_ATTACK, broken, HIT], LIVE);
    expect(beats[0]!.hit?.event).toEqual(HIT);
    expect(beats[1]).toMatchObject({ kind: 'move', absorbed: false });
    expect(beats[2]).toMatchObject({ kind: 'quiet', absorbed: true });
  });

  it('Ataque Absoluto refletido: não há golpe para absorver', () => {
    const triggered: GameEvent = { type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 40 };
    const beats = buildTimeline([ABS_ATTACK, { type: 'GuardBroken', player: 'p1', cards: [] }, triggered], LIVE);
    expect(beats[0]!.hit).toBeNull();
    expect(beats.some((b) => b.absorbed)).toBe(false);
    expectPhotosafe(beats, false);
  });

  it('no catchUp nada é absorvido: a cena vira faixa e o golpe volta a ser batida de dano', () => {
    const beats = buildTimeline([ABS_ATTACK, HIT], { ...LIVE, mode: 'catchUp' });
    expect(beats.map((b) => [b.kind, b.absorbed, b.hit])).toEqual([
      ['banner', false, null],
      ['damage', false, null],
    ]);
  });

  it('outro atacante não é absorvido', () => {
    const theirs: GameEvent = { type: 'DamageDealt', attacker: 'p2', defender: 'p1', attack: 50, defense: 10, damage: 40 };
    const beats = buildTimeline([ABS_ATTACK, theirs], LIVE);
    expect(beats[0]!.hit).toBeNull();
    expect(beats[1]).toMatchObject({ kind: 'damage', absorbed: false });
  });

  it('com movimento reduzido o golpe também é absorvido (a informação é a mesma), sem inversão', () => {
    const [scene, absorbed] = buildTimeline([ABS_ATTACK, HIT], { ...LIVE, reducedMotion: true });
    expect(scene!.hit?.event).toEqual(HIT);
    expect(scene!.invert).toBeNull();
    expect(absorbed!.absorbed).toBe(true);
  });

  it('a batida que conta os totais não é a do golpe absorvido', () => {
    const beats = buildTimeline([ABS_ATTACK, HIT, REMOVED], LIVE);
    expect(damageBeatIndex(beats)).toBe(-1);
  });
});

describe('buildTimeline', () => {
  it('sem eventos: linha do tempo vazia, 0 ms', () => {
    expect(buildTimeline([], LIVE)).toEqual([]);
    expect(timelineMs([])).toBe(0);
    expect(luminanceSwitches([])).toEqual([]);
  });

  it('as batidas são contíguas: início da seguinte = início + duração da anterior', () => {
    const beats = buildTimeline(SAMPLES.map((s) => s.event), LIVE);
    expect(beats[0]!.startMs).toBe(0);
    for (let i = 1; i < beats.length; i++) {
      expect(beats[i]!.startMs).toBe(beats[i - 1]!.startMs + beats[i - 1]!.durationMs);
    }
    const last = beats.at(-1)!;
    expect(timelineMs(beats)).toBe(last.startMs + last.durationMs);
  });

  it('um ataque comum fica em até 2000 ms', () => {
    const beats = buildTimeline(ATTACK, LIVE);
    expect(beats).toHaveLength(ATTACK.length);
    expect(timelineMs(beats)).toBeLessThanOrEqual(2_000);
    expect(luminanceSwitches(beats)).toEqual([]);
  });

  it('Exodia gera uma cena longa (a rara, U3) com uma inversão de pelo menos 300 ms, quando a coroa crava (sub-projeto 6 §7.3)', () => {
    const beats = buildTimeline([EXODIA], LIVE);
    expect(beats).toHaveLength(1);
    const [beat] = beats;
    expect(beat!.kind).toBe('scene');
    expect(beat!.scene).toBe('EXODIA');
    expect(beat!.durationMs).toBe(RARE_SCENE_MS.EXODIA);
    expect(beat!.invert!.atMs).toBe(SCENE_MOMENTS.EXODIA.crownAt);
    expect(beat!.invert!.holdMs).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
    expect(luminanceSwitches(beats)).toEqual([beat!.invert!.atMs, beat!.invert!.atMs + beat!.invert!.holdMs]);
  });

  it('catchUp: 60 eventos cabem em 3000 ms, sem cena e sem inversão', () => {
    const events = Array.from({ length: 60 }, (_, i) => SAMPLES[i % SAMPLES.length]!.event);
    expect(events.some((e) => e.type === 'Exodia')).toBe(true);
    const beats = buildTimeline(events, { ...LIVE, mode: 'catchUp' });
    expect(beats).toHaveLength(60);
    expect(timelineMs(beats)).toBeLessThanOrEqual(CATCH_UP_CAP_MS);
    expect(beats.every((b) => b.kind !== 'scene' && b.scene === null && b.invert === null)).toBe(true);
    expect(luminanceSwitches(beats)).toEqual([]);
  });

  it('catchUp: velocidade dobrada quando cabe no teto; cenas viram faixa', () => {
    const beats = buildTimeline([{ type: 'TurnStarted', player: 'p1' }, EXODIA], { ...LIVE, mode: 'catchUp' });
    expect(beats.map((b) => [b.kind, b.durationMs])).toEqual([
      ['banner', BEAT_MS.banner / 2],
      ['banner', BEAT_MS.banner / 2],
    ]);
  });

  it('a faixa da iniciativa segura 1,2 s fora do teto de decisão (o Equipar que vem logo depois a espremia); no catchUp, anda como as outras', () => {
    const decided: GameEvent = { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 } };
    const events: GameEvent[] = [...ATTACK, DAMAGE, decided, { type: 'RoundStarted', round: 4, kind: 'EQUIP' }];
    const beats = buildTimeline(events, { ...LIVE, decisionPending: true });
    const banner = beats.find((b) => b.event.type === 'InitiativeDecided')!;
    expect(banner.kind).toBe('banner');
    expect(banner.durationMs).toBe(INITIATIVE_BANNER_MS);
    expect(INITIATIVE_BANNER_MS).toBe(1_200);
    expect(timelineMs(beats) - banner.durationMs).toBeLessThanOrEqual(DECISION_CAP_MS);
    const caught = buildTimeline(events, { ...LIVE, mode: 'catchUp' }).find((b) => b.event.type === 'InitiativeDecided')!;
    expect(caught.durationMs).toBeLessThan(INITIATIVE_BANNER_MS);
  });

  it('resync: nenhuma batida', () => {
    expect(buildTimeline(SAMPLES.map((s) => s.event), { ...LIVE, mode: 'resync' })).toEqual([]);
  });

  it('decisionPending: as cenas do Reflect não encolhem, porque o servidor dá a folga delas', () => {
    for (const [event, ms] of [
      [REFLECT_PLAYED, 1_500],
      [REFLECT_TRIGGERED, 3_800],
      [REFLECT_CANCELED, 1_400],
    ] as const) {
      const beats = buildTimeline([event], { ...LIVE, decisionPending: true });
      expect(beats[0]!.durationMs).toBe(ms);
      expectPhotosafe(beats, false);
    }
  });

  it('decisionPending, o Reflect e a janela de reação que ele abre: só a faixa conta no teto', () => {
    const beats = buildTimeline(
      [REFLECT_PLAYED, { type: 'ReactionWindowOpened', responder: 'p2', trigger: 'REFLECT_PLAYED' }],
      { ...LIVE, decisionPending: true },
    );
    expect(timelineMs(beats)).toBe(1_500 + BEAT_MS.banner);
    expect(beats[0]!.invert).toBeNull();
  });

  it('decisionPending: entre duas cenas, só o dano encolhe, e a inversão do gatilho fica inteira', () => {
    const beats = buildTimeline([REFLECT_PLAYED, DAMAGE, REFLECT_TRIGGERED], { ...LIVE, decisionPending: true });
    expect(beats.filter((b) => b.kind === 'scene').map((b) => b.durationMs)).toEqual([1_500, 3_800]);
    expect(beats[2]!.invert!.holdMs).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
    expectPhotosafe(beats, false);
  });

  it('decisionPending: as cenas raras não encolhem nem contam no teto; o resto encolhe para caber nele', () => {
    const events: GameEvent[] = [...ATTACK, ABS_ATTACK, DAMAGE, { type: 'TurnStarted', player: 'p2' }];
    const beats = buildTimeline(events, { ...LIVE, decisionPending: true });
    const rare = beats.find((b) => b.scene === 'ABSOLUTE_ATTACK')!;
    expect(rare.durationMs).toBe(RARE_SCENE_MS.ABSOLUTE_ATTACK);
    expect(rare.invert).toEqual({ atMs: rare.startMs + SCENE_INVERT_LEAD_MS.ABSOLUTE_ATTACK, holdMs: 600 });
    expect(timelineMs(beats) - rare.durationMs).toBeLessThanOrEqual(DECISION_CAP_MS);
    expect(beats.filter((b) => b !== rare && b.durationMs > 0).every((b) => b.durationMs < BEAT_MS[b.kind as 'move'])).toBe(true);
    expectPhotosafe(beats, false);
  });

  it('decisionPending sem nada a comprimir não mexe nos tempos', () => {
    const events: GameEvent[] = [
      { type: 'EquipSubmitted', player: 'p2' },
      { type: 'TurnStarted', player: 'p1' },
    ];
    const beats = buildTimeline(events, { ...LIVE, decisionPending: true });
    expect(beats.map((b) => b.durationMs)).toEqual([0, BEAT_MS.banner]);
  });

  it('decisionPending com só batidas quietas: 0 ms', () => {
    const beats = buildTimeline([{ type: 'EquipSubmitted', player: 'p2' }], { ...LIVE, decisionPending: true });
    expect(timelineMs(beats)).toBe(0);
  });

  it('movimento reduzido: as cenas continuam, sem nenhuma inversão', () => {
    const beats = buildTimeline([ABS_ATTACK, EXODIA], { ...LIVE, reducedMotion: true });
    expect(beats.map((b) => b.scene)).toEqual(['ABSOLUTE_ATTACK', 'EXODIA']);
    expect(beats.every((b) => b.invert === null)).toBe(true);
    expect(luminanceSwitches(beats)).toEqual([]);
  });
});

describe('as cenas do Reflect (sub-projeto 6 §7.5)', () => {
  it('o lançamento e a anulação não invertem; a inversão é a do gatilho, na batida do cometa no espelho', () => {
    expect(buildTimeline([REFLECT_PLAYED], LIVE)[0]!.invert).toBeNull();
    expect(buildTimeline([REFLECT_CANCELED], LIVE)[0]!.invert).toBeNull();
    const beats = buildTimeline([DAMAGE, REFLECT_TRIGGERED], LIVE);
    expect(beats[1]!.invert!.atMs).toBe(beats[1]!.startMs + SCENE_MOMENTS.REFLECT_TRIGGERED.mirrorHitAt);
  });

  it('o gatilho com dano acende o golpe na volta dourada, na própria batida; sem dano, não há golpe', () => {
    const beats = buildTimeline([DAMAGE, REFLECT_TRIGGERED], LIVE);
    expect(beats[1]!.hit).toEqual({ event: REFLECT_TRIGGERED, atMs: beats[1]!.startMs + SCENE_MOMENTS.REFLECT_TRIGGERED.returnHitAt });
    expect(beats[1]!.absorbed).toBe(false);
    const held: GameEvent = { type: 'ReflectTriggered', owner: 'p1', attacker: 'p2', damage: 0 };
    expect(buildTimeline([held], LIVE)[0]!.hit).toBeNull();
  });

  it('a anulação é cena de campo, sem cortina', () => {
    expect(FIELD_SCENES.has('REFLECT_CANCELED')).toBe(true);
    expect(NO_INVERT.has('REFLECT_CANCELED')).toBe(true);
    expect(NO_INVERT.has('REFLECT_PLAYED')).toBe(true);
    expect(NO_INVERT.has('REFLECT_TRIGGERED')).toBe(false);
  });

  it('o Ataque Absoluto que bate num Reflect é interceptado (o feixe não dispara); o comum, não', () => {
    const beats = buildTimeline([ABS_ATTACK, { type: 'GuardBroken', player: 'p2', cards: [] }, REFLECT_TRIGGERED], LIVE);
    expect(beats.map((b) => b.intercepted)).toEqual([true, false, false]);
    expect(buildTimeline([ABS_ATTACK, DAMAGE], LIVE)[0]!.intercepted).toBe(false);
  });

  it('no catchUp as três viram faixa, sem golpe nem interceptação', () => {
    const beats = buildTimeline([ABS_ATTACK, REFLECT_PLAYED, REFLECT_TRIGGERED, REFLECT_CANCELED], { ...LIVE, mode: 'catchUp' });
    expect(beats.every((b) => b.kind === 'banner' && b.scene === null && b.hit === null && !b.intercepted)).toBe(true);
  });

  it('muitos gatilhos seguidos ficam dentro dos limites de fotossensibilidade', () => {
    expectPhotosafe(buildTimeline(Array.from({ length: 12 }, () => REFLECT_TRIGGERED), LIVE), false);
  });
});

describe('a Ressurreição (sub-projeto 6 §7.6)', () => {
  const REVIVED: GameEvent = { type: 'Resurrected', player: 'p1', card: num('n4'), row: 'ATK' };

  it('é uma cena de 4,6 s, com a carta que volta, sem inversão nem cortina negada pelo teto', () => {
    const [beat] = buildTimeline([REVIVED], LIVE);
    expect(beat).toMatchObject({ kind: 'scene', scene: 'RESURRECTED', durationMs: 4_600, cards: ['n4'], invert: null, hit: null });
    expect(NO_INVERT.has('RESURRECTED')).toBe(true);
    expect(FIELD_SCENES.has('RESURRECTED')).toBe(false);
  });

  it('com uma decisão esperando, ela não encolhe', () => {
    expect(buildTimeline([REVIVED], { ...LIVE, decisionPending: true })[0]!.durationMs).toBe(4_600);
  });

  it('no catchUp vira faixa', () => {
    expect(buildTimeline([REVIVED], { ...LIVE, mode: 'catchUp' })[0]).toMatchObject({ kind: 'banner', scene: null });
  });

  it('muitas seguidas não trocam claro e escuro, com ou sem movimento reduzido', () => {
    for (const reducedMotion of [false, true]) {
      const beats = buildTimeline(Array.from({ length: 12 }, () => REVIVED), { ...LIVE, reducedMotion });
      expect(luminanceSwitches(beats)).toEqual([]);
      expectPhotosafe(beats, reducedMotion);
    }
  });
});

describe('fotossensibilidade (spec §10.4)', () => {
  it('sintético: [AbsoluteAttack, RowDevastated] — as inversões ficariam a menos de 2 s, e a segunda cena perde a dela', () => {
    const beats = buildTimeline([ABS_ATTACK, ROW_DEVASTATED], LIVE);
    const scenes = beats.filter((b) => b.kind === 'scene');
    expect(scenes).toHaveLength(2);
    expect(scenes[0]!.invert).not.toBeNull();
    expect(scenes[1]!.invert).toBeNull();
    expect(scenes[1]!.scene).toBe('DEVASTATION');
    expect(luminanceSwitches(beats)).toHaveLength(2);
    expectPhotosafe(beats, false);
  });

  it('sintético: [AbsoluteAttack, DamageDealt, Exodia] — as cenas raras, longas, ficam a mais de 2 s e invertem as duas', () => {
    const beats = buildTimeline([ABS_ATTACK, DAMAGE, EXODIA], LIVE);
    const [first, second] = beats.filter((b) => b.kind === 'scene').map((b) => b.invert!);
    expect(second!.atMs - (first!.atMs + first!.holdMs)).toBeGreaterThanOrEqual(INVERT_COOLDOWN_MS);
    expect(luminanceSwitches(beats)).toHaveLength(4);
    expectPhotosafe(beats, false);
  });

  it('Ataque Absoluto contra um Reflect: a inversão fica com o Reflect que devolve o golpe (o desfecho), e não com o anúncio', () => {
    const triggered: GameEvent = { type: 'ReflectTriggered', owner: 'p1', attacker: 'p2', damage: 90 };
    const beats = buildTimeline([ABS_ATTACK, { type: 'GuardBroken', player: 'p2', cards: [] }, triggered], LIVE);
    const scenes = beats.filter((b) => b.kind === 'scene');
    expect(scenes.map((b) => b.scene)).toEqual(['ABSOLUTE_ATTACK', 'REFLECT_TRIGGERED']);
    expect(scenes[0]!.invert).toBeNull();
    expect(scenes[1]!.invert).not.toBeNull();
    expect(luminanceSwitches(beats)).toHaveLength(2);
    expectPhotosafe(beats, false);
    // Sem Reflect depois, o Ataque Absoluto segue invertendo.
    expect(buildTimeline([ABS_ATTACK, DAMAGE], LIVE).find((b) => b.kind === 'scene')!.invert).not.toBeNull();
  });

  it('cenas coladas: a segunda perde, a terceira volta a inverter depois do intervalo', () => {
    const beats = buildTimeline([ABS_ATTACK, ROW_DEVASTATED, ROW_DEVASTATED], LIVE);
    expect(beats.map((b) => b.invert !== null)).toEqual([true, false, true]);
    const [first, , third] = beats.map((b) => b.invert!);
    expect(third!.atMs - (first!.atMs + first!.holdMs)).toBeGreaterThanOrEqual(INVERT_COOLDOWN_MS);
    expectPhotosafe(beats, false);
  });

  it('cenas coladas em sequência longa: nunca duas inversões a menos de 2 s uma da outra', () => {
    const beats = buildTimeline(Array.from({ length: 12 }, (_, i) => (i % 2 ? ROW_DEVASTATED : ABS_ATTACK)), LIVE);
    const inverted = beats.filter((b) => b.invert).map((b) => b.invert!);
    expect(inverted.length).toBeGreaterThan(1);
    expect(inverted.length).toBeLessThan(12);
    for (let i = 1; i < inverted.length; i++) {
      expect(inverted[i]!.atMs - (inverted[i - 1]!.atMs + inverted[i - 1]!.holdMs)).toBeGreaterThanOrEqual(
        INVERT_COOLDOWN_MS,
      );
    }
    expectPhotosafe(beats, false);
  });

  it('cenas bem separadas invertem as duas, uma de cada vez', () => {
    const gap: GameEvent[] = Array.from({ length: 8 }, () => ({ type: 'TurnStarted', player: 'p1' }));
    const beats = buildTimeline([ABS_ATTACK, ...gap, EXODIA], LIVE);
    const scenes = beats.filter((b) => b.kind === 'scene');
    expect(scenes.every((b) => b.invert !== null)).toBe(true);
    expect(luminanceSwitches(beats)).toHaveLength(4);
    expectPhotosafe(beats, false);
  });

  it('uma inversão por cena: a lista de trocas tem no máximo 2 instantes por cena', () => {
    const beats = buildTimeline(SAMPLES.map((s) => s.event), LIVE);
    const scenes = beats.filter((b) => b.kind === 'scene').length;
    expect(luminanceSwitches(beats).length).toBeLessThanOrEqual(2 * scenes);
    expectPhotosafe(beats, false);
  });

  /** Aplica a propriedade a uma sequência de eventos, em todo modo e soma no placar. */
  function checkAllModes(events: GameEvent[], tally: { sequences: number; withScene: number; inversions: number }): void {
    for (const mode of MODES) {
      for (const reducedMotion of [false, true]) {
        for (const decisionPending of [false, true]) {
          const beats = buildTimeline(events, { mode, reducedMotion, decisionPending });
          tally.sequences++;
          expectPhotosafe(beats, reducedMotion);
          if (mode === 'resync') expect(beats).toEqual([]);
          else expect(beats).toHaveLength(events.length);
          // As cenas raras ficam fora do teto (U3): o resto cabe nele.
          if (decisionPending) expect(timelineMs(beats) - rareMs(beats)).toBeLessThanOrEqual(DECISION_CAP_MS);
          if (mode === 'catchUp') expect(timelineMs(beats)).toBeLessThanOrEqual(CATCH_UP_CAP_MS);
          if (mode === 'live' && !reducedMotion && !decisionPending) {
            if (beats.some((b) => b.kind === 'scene')) tally.withScene++;
            tally.inversions += luminanceSwitches(beats).length / 2;
          }
        }
      }
    }
  }

  it('propriedade: partidas com semente, em todo modo, nunca passam de 3 trocas por segundo', () => {
    const tally = { sequences: 0, withScene: 0, inversions: 0 };
    const names = Object.keys(BOTS) as BotName[];
    for (const seed of ['luz-0', 'luz-1', 'luz-2', 'luz-3', 'luz-4']) {
      // greedy × greedy é o caso da spec; as outras duplas existem porque os bots gananciosos quase
      // nunca chegam a cenas (Exodia, Ataque Absoluto, Reflect).
      for (const a of names) {
        for (const b of names) {
          const steps = seededSteps(seed, 400, [a, b]);
          expect(steps.length).toBeGreaterThan(20);
          // Cada jogada sozinha e a partida inteira numa sequência só (o pior caso: cenas coladas).
          for (const events of [...steps.map((s) => s.events), steps.flatMap((s) => s.events)]) {
            checkAllModes(events, tally);
          }
        }
      }
    }
    // Garante que a propriedade exerceu cenas e inversões de verdade.
    expect(tally.sequences).toBeGreaterThan(10_000);
    expect(tally.withScene).toBeGreaterThan(0);
    expect(tally.inversions).toBeGreaterThan(0);
  });

  it('propriedade: sequências sintéticas cheias de cenas, com semente', () => {
    const tally = { sequences: 0, withScene: 0, inversions: 0 };
    const rng = createRng('luz-cenas');
    const scenes = SAMPLES.filter((s) => s.kind === 'scene').map((s) => s.event);
    const others = SAMPLES.filter((s) => s.kind !== 'scene').map((s) => s.event);
    for (let n = 0; n < 200; n++) {
      const length = 1 + rng.int(40);
      const sceneRatio = rng.next();
      const events = Array.from({ length }, () => rng.pick(rng.next() < sceneRatio ? scenes : others));
      checkAllModes(events, tally);
    }
    expect(tally.sequences).toBe(200 * 12);
    expect(tally.inversions).toBeGreaterThan(100);
  });
});
