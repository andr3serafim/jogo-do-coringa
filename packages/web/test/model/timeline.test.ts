import { describe, expect, it } from 'vitest';
import type { GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import {
  BEAT_MS,
  CATCH_UP_CAP_MS,
  DECISION_CAP_MS,
  INVERT_COOLDOWN_MS,
  INVERT_MIN_HOLD_MS,
  RARE_SCENE_MS,
  buildTimeline,
  luminanceSwitches,
  timelineMs,
  type Beat,
  type SceneKind,
  type TimelineOptions,
} from '../../src/model/timeline.ts';
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
    event: { type: 'ReflectPlayed', player: 'p1', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') } },
    kind: 'scene',
    scene: 'REFLECT_PLAYED',
    cards: ['k1', 'j1', 'q1'],
  },
  { event: { type: 'ReflectCanceled', player: 'p2', owner: 'p1' }, kind: 'move' },
  { event: { type: 'ReflectProtected', player: 'p2', owner: 'p1' }, kind: 'move' },
  { event: { type: 'ReflectExpired', owner: 'p1' }, kind: 'move' },
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
  { event: { type: 'Resurrected', player: 'p1', card: num('n4'), row: 'ATK' }, kind: 'move', cards: ['n4'] },
  { event: { type: 'AbsoluteDefenseStarted', player: 'p2' }, kind: 'scene', scene: 'ABSOLUTE_DEFENSE' },
  { event: { type: 'AbsoluteDefenseEnded', player: 'p2' }, kind: 'move' },
  { event: { type: 'InitiativeChanged', player: 'p2' }, kind: 'banner' },
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
};
const REFLECT_TRIGGERED: GameEvent = { type: 'ReflectTriggered', owner: 'p1', attacker: 'p2', damage: 30 };

/** A soma das cenas raras, que não contam no teto de decisão. */
const rareMs = (beats: Beat[]): number =>
  beats.filter((b) => b.scene !== null && b.scene in RARE_SCENE_MS).reduce((sum, b) => sum + b.durationMs, 0);

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
    expect(new Set(SAMPLES.map((s) => s.event.type)).size).toBe(32);
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
      expect(beat!.durationMs).toBe(kind === 'quiet' ? 0 : (rare ?? BEAT_MS[kind]));
      expect(beat!.invert !== null).toBe(kind === 'scene');
    });
  }
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

  it('Exodia gera uma cena longa (a rara, U3) com uma inversão de pelo menos 300 ms, na chegada do quarto K', () => {
    const beats = buildTimeline([EXODIA], LIVE);
    expect(beats).toHaveLength(1);
    const [beat] = beats;
    expect(beat!.kind).toBe('scene');
    expect(beat!.scene).toBe('EXODIA');
    expect(beat!.durationMs).toBe(RARE_SCENE_MS.EXODIA);
    expect(beat!.invert!.atMs).toBe(1_400);
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

  it('resync: nenhuma batida', () => {
    expect(buildTimeline(SAMPLES.map((s) => s.event), { ...LIVE, mode: 'resync' })).toEqual([]);
  });

  it('decisionPending com ReflectPlayed: tudo em até 1000 ms e a inversão fica', () => {
    const beats = buildTimeline([REFLECT_PLAYED], { ...LIVE, decisionPending: true });
    expect(timelineMs(beats)).toBeLessThanOrEqual(DECISION_CAP_MS);
    expect(beats[0]!.scene).toBe('REFLECT_PLAYED');
    expect(beats[0]!.invert).not.toBeNull();
    expect(beats[0]!.invert!.holdMs).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
    expectPhotosafe(beats, false);
  });

  it('decisionPending, Reflect e a janela de reação que ele abre: cabe em 1000 ms com a inversão', () => {
    const beats = buildTimeline(
      [REFLECT_PLAYED, { type: 'ReactionWindowOpened', responder: 'p2', trigger: 'REFLECT_PLAYED' }],
      { ...LIVE, decisionPending: true },
    );
    expect(timelineMs(beats)).toBeLessThanOrEqual(DECISION_CAP_MS);
    expect(beats[0]!.invert!.holdMs).toBeGreaterThanOrEqual(INVERT_MIN_HOLD_MS);
  });

  it('decisionPending: inversão que ficaria com menos de 300 ms é descartada, a cena continua', () => {
    const beats = buildTimeline([REFLECT_PLAYED, DAMAGE, REFLECT_TRIGGERED], { ...LIVE, decisionPending: true });
    expect(timelineMs(beats)).toBeLessThanOrEqual(DECISION_CAP_MS);
    expect(beats.filter((b) => b.kind === 'scene')).toHaveLength(2);
    expect(beats.every((b) => b.invert === null)).toBe(true);
  });

  it('decisionPending: as cenas raras não encolhem nem contam no teto; o resto encolhe para caber nele', () => {
    const events: GameEvent[] = [...ATTACK, ABS_ATTACK, DAMAGE, { type: 'TurnStarted', player: 'p2' }];
    const beats = buildTimeline(events, { ...LIVE, decisionPending: true });
    const rare = beats.find((b) => b.scene === 'ABSOLUTE_ATTACK')!;
    expect(rare.durationMs).toBe(RARE_SCENE_MS.ABSOLUTE_ATTACK);
    expect(rare.invert).toEqual({ atMs: rare.startMs + 700, holdMs: 600 });
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

describe('fotossensibilidade (spec §10.4)', () => {
  it('sintético: [ReflectPlayed, DamageDealt, ReflectTriggered] — a segunda cena perde a inversão', () => {
    const beats = buildTimeline([REFLECT_PLAYED, DAMAGE, REFLECT_TRIGGERED], LIVE);
    const scenes = beats.filter((b) => b.kind === 'scene');
    expect(scenes).toHaveLength(2);
    expect(scenes[0]!.invert).not.toBeNull();
    expect(scenes[1]!.invert).toBeNull();
    expect(scenes[1]!.scene).toBe('REFLECT_TRIGGERED');
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
    const beats = buildTimeline([REFLECT_PLAYED, REFLECT_TRIGGERED, REFLECT_PLAYED], LIVE);
    expect(beats.map((b) => b.invert !== null)).toEqual([true, false, true]);
    const [first, , third] = beats.map((b) => b.invert!);
    expect(third!.atMs - (first!.atMs + first!.holdMs)).toBeGreaterThanOrEqual(INVERT_COOLDOWN_MS);
    expectPhotosafe(beats, false);
  });

  it('cenas coladas em sequência longa: nunca duas inversões a menos de 2 s uma da outra', () => {
    const beats = buildTimeline(Array.from({ length: 12 }, () => REFLECT_PLAYED), LIVE);
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
