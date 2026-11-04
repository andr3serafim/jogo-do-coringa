import type { GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import { MOMENT_TAIL_MS } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { dustPerCard, healsOf, landingsOf, leavingOf, recoilsOf, shardsPerCard, shiftDelaysOf, TABLE_MOTION } from '../../src/model/table-motion.ts';
import { delaysOf } from '../../src/model/effects.ts';
import { BEAT_MS, buildTimeline, DECISION_CAP_MS, timelineMs, type Beat } from '../../src/model/timeline.ts';
import { scenarioAt } from '../fixtures.ts';

const num = (id: string, value: NumCard['value'] = 5): NumCard => ({ id, kind: 'NUM', value, suit: 'copas' });
const face = (id: string, kind: 'J' | 'Q' | 'K' | 'A' = 'K'): SpecialCard => ({ id, kind, suit: 'ouros' });

const LIVE = { mode: 'live', reducedMotion: false, decisionPending: false } as const;
const beatsOf = (...events: GameEvent[]): Beat[] => buildTimeline(events, LIVE);
/** Uma faixa antes, para a batida da jogada não começar em 0. */
const TURN: GameEvent = { type: 'TurnStarted', player: 'p1' };
const buff = (player: 'p1' | 'p2', id = 'j1'): GameEvent => ({ type: 'BuffPlayed', player, card: face(id, 'J'), as: 'J' });

describe('o recuo das cartas que saem da sua mão (§8)', () => {
  it('o seu J: o id no início da batida dele', () => {
    const beats = beatsOf(TURN, buff('p1'));
    expect([...recoilsOf(beats, 'p1')]).toEqual([['j1', beats[1]!.startMs]]);
  });

  it('o J do Bot não recua: a mão dele são versos', () => {
    expect(recoilsOf(beatsOf(buff('p2')), 'p1').size).toBe(0);
  });

  it('a sua Devastação: as três cartas recuam', () => {
    const cast: GameEvent = { type: 'DevastationCast', player: 'p1', target: 'p2', row: 'ATK', k: face('k1', 'K'), a: face('a1', 'A'), x: face('x1', 'J') };
    expect([...recoilsOf(beatsOf(cast), 'p1').keys()]).toEqual(['k1', 'a1', 'x1']);
  });
});

describe('o pouso (§8)', () => {
  it('o seu J pousa depois do recuo e da mola, sem queda', () => {
    const beats = beatsOf(TURN, buff('p1'));
    expect(landingsOf(beats, 'p1', false).get('j1')).toMatchObject({ atMs: beats[1]!.startMs + 510, drop: false });
  });

  it('o J do Bot cai no destino na batida dele', () => {
    const beats = beatsOf(TURN, buff('p2'));
    expect(landingsOf(beats, 'p1', false).get('j1')).toMatchObject({ atMs: beats[1]!.startMs + TABLE_MOTION.dropMs, drop: true });
  });

  it('as suas do Equipar só achatam com o rascunho à vista, e caem sem ele', () => {
    const placed: GameEvent = { type: 'CardsPlaced', player: 'p1', placements: [{ card: num('n1'), destination: 'ATK' }] };
    const beats = beatsOf(TURN, placed);
    const at = beats[1]!.startMs + TABLE_MOTION.dropMs;
    expect(landingsOf(beats, 'p1', true).get('n1')).toMatchObject({ atMs: at, drop: false });
    expect(landingsOf(beats, 'p1', false).get('n1')).toMatchObject({ atMs: at, drop: true });
  });

  it('as do Bot no Equipar caem', () => {
    const placed: GameEvent = { type: 'CardsPlaced', player: 'p2', placements: [{ card: num('n2'), destination: 'DEF' }] };
    expect(landingsOf(beatsOf(placed), 'p1', true).get('n2')).toMatchObject({ atMs: TABLE_MOTION.dropMs, drop: true });
  });

  it('a numérica roubada voa da fileira do outro e pousa depois da mola, sem recuo', () => {
    const stolen: GameEvent = { type: 'CardStolen', player: 'p1', from: 'p2', card: num('n3'), fromRow: 'ATK', toRow: 'ATK', ace: face('a1', 'A') };
    expect(landingsOf(beatsOf(stolen), 'p1', false).get('n3')).toMatchObject({ atMs: TABLE_MOTION.landAfterMs, drop: false });
  });
});

describe('a poeira do pouso cabe num teto por batida (§11)', () => {
  it('uma carta sozinha solta 5 puffs; as quatro do Equipar, que pousam juntas, 2 cada', () => {
    expect(landingsOf(beatsOf(TURN, buff('p1')), 'p1', false).get('j1')).toMatchObject({ dust: 5 });
    const placements = ['n1', 'n2', 'n3', 'n4'].map((id) => ({ card: num(id), destination: 'ATK' as const }));
    const landings = landingsOf(beatsOf({ type: 'CardsPlaced', player: 'p2', placements }), 'p1', false);
    expect(['n1', 'n2', 'n3', 'n4'].map((id) => landings.get(id)!.dust)).toEqual([2, 2, 2, 2]);
    expect(dustPerCard(4) * 4).toBeLessThanOrEqual(TABLE_MOTION.dustBudget);
  });
});

describe('as cartas que saem para o cemitério (E2, E5)', () => {
  it('4 K da Guarda quebrada: os 4 estouram', () => {
    const ks = ['k1', 'k2', 'k3', 'k4'].map((id) => face(id, 'K'));
    const leaving = leavingOf(beatsOf({ type: 'GuardBroken', player: 'p2', cards: ks }));
    expect([...leaving.values()].map((l) => l.shatter)).toEqual([true, true, true, true]);
  });

  it('a Armadilha: o A sai sem estourar, o alvo estoura', () => {
    const trap: GameEvent = { type: 'TrapUsed', player: 'p1', card: face('a1', 'A'), target: face('j9', 'J'), targetOwner: 'p2' };
    const leaving = leavingOf(beatsOf(TURN, trap));
    expect(leaving.get('a1')).toMatchObject({ shatter: false });
    expect(leaving.get('j9')).toMatchObject({ shatter: true });
  });

  it('a fileira gasta sai sem estourar, na batida dela', () => {
    const beats = beatsOf(TURN, { type: 'CardsRemovedFromRow', player: 'p1', row: 'ATK', cards: [num('n1'), num('n2')] });
    expect(leavingOf(beats).get('n2')).toEqual({ startMs: beats[1]!.startMs, shatter: false });
  });

  it('as cenas desenham as delas: a Devastação e o Reflect não dão cópias', () => {
    const fallen: GameEvent = { type: 'RowDevastated', player: 'p2', row: 'ATK', cards: [num('n1')], reflected: false };
    const reflect: GameEvent = { type: 'ReflectPlayed', player: 'p2', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') }, against: 'ATTACK' };
    expect(leavingOf(beatsOf(fallen, reflect)).size).toBe(0);
  });
});

describe('as vizinhas esperam a batida da carta que sai', () => {
  it('a carta da frente da Defesa sai: as outras da Defesa esperam, as do Ataque não', () => {
    const { view } = scenarioAt({ self: { defenseRow: [4, 6], attackRow: [9] } });
    const beats = beatsOf(TURN, { type: 'CardsRemovedFromRow', player: 'p1', row: 'DEF', cards: [num('fora')] });
    const shifts = shiftDelaysOf(beats, view);
    expect(shifts.get('x-p1-DEF-0')).toBe(beats[1]!.startMs);
    expect(shifts.get('x-p1-DEF-1')).toBe(beats[1]!.startMs);
    expect(shifts.has('x-p1-ATK-0')).toBe(false);
  });

  it('o seu J sai da mão: as outras da mão esperam', () => {
    const { view } = scenarioAt({ self: { hand: ['Q', 'A'] } });
    const beats = beatsOf(TURN, buff('p1'));
    const shifts = shiftDelaysOf(beats, view);
    expect(view.self.hand.map((card) => shifts.get(card.id))).toEqual([beats[1]!.startMs, beats[1]!.startMs]);
  });

  it('2 K de 4 quebram: os 2 que ficam na Guarda esperam', () => {
    const { view } = scenarioAt({ opponent: { guard: ['K', 'K'] } });
    const beats = beatsOf(TURN, { type: 'GuardBroken', player: 'p2', cards: [face('k8'), face('k9')] });
    const shifts = shiftDelaysOf(beats, view);
    expect(view.opponent.guard.map((card) => shifts.get(card.id))).toEqual([beats[1]!.startMs, beats[1]!.startMs]);
  });
});

describe('os cacos por carta', () => {
  it('cabem no teto de 40 por batida', () => {
    expect([1, 4, 5].map(shardsPerCard)).toEqual([10, 10, 8]);
  });
});

describe('o teto de decisão não muda (§8)', () => {
  it('uma jogada seguida do golpe tem as durações de antes e cabe em 1 s', () => {
    const events: GameEvent[] = [
      buff('p1'),
      { type: 'AttackDeclared', player: 'p1' },
      { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 50, defense: 10, damage: 40 },
      { type: 'CardsRemovedFromRow', player: 'p1', row: 'ATK', cards: [num('n1')] },
      { type: 'TurnStarted', player: 'p2' },
    ];
    const beats = buildTimeline(events, { ...LIVE, decisionPending: true });
    expect(beats.map((beat) => beat.durationMs)).toEqual([157, 157, 315, 157, 210]);
    expect(timelineMs(beats)).toBeLessThanOrEqual(DECISION_CAP_MS);
  });
});

describe('o momento da especial do oponente na mesa (bloco A do playtest, ponto 1)', () => {
  const seen = (...events: GameEvent[]): Beat[] => buildTimeline(events, { ...LIVE, viewer: 'p1' });

  it('a Guarda do Bot aparece no impacto, de uma vez: a cópia do momento chega nela', () => {
    const beats = seen({ type: 'GuardPlayed', player: 'p2', cards: [face('k1'), face('k2')] });
    const landings = landingsOf(beats, 'p1', false);
    expect(landings.get('k1')).toMatchObject({ atMs: 1_600, drop: false, snap: true });
    expect(landings.get('k2')).toMatchObject({ atMs: 1_600, drop: false, snap: true });
    expect(delaysOf(beats).get('k1')).toBe(1_600);
  });

  it('a Armadilha do Bot no seu J: o J sai no impacto, com estouro; o A dele não está na mesa', () => {
    const trap: GameEvent = { type: 'TrapUsed', player: 'p2', card: face('a1', 'A'), target: face('j9', 'J'), targetOwner: 'p1' };
    const leaving = leavingOf(seen(TURN, trap));
    expect(leaving.get('j9')).toEqual({ startMs: BEAT_MS.banner + 1_600, shatter: true });
    expect(leaving.has('a1')).toBe(false);
  });

  it('o Roubo do Bot: a numérica espera o impacto para voar, e pousa depois da mola', () => {
    const stolen: GameEvent = { type: 'CardStolen', player: 'p2', from: 'p1', card: num('n3'), fromRow: 'DEF', toRow: 'ATK', ace: face('a1', 'A') };
    const beats = seen(stolen);
    expect(delaysOf(beats).get('n3')).toBe(1_600);
    expect(landingsOf(beats, 'p1', false).get('n3')).toMatchObject({ atMs: 1_600 + TABLE_MOTION.landAfterMs, drop: false });
    expect(leavingOf(beats).has('a1')).toBe(false);
    // O Ás dele, no topo do cemitério, só aparece quando a cópia do momento chega lá (a revisão final achou dois Ás à vista).
    expect(landingsOf(beats, 'p1', false).get('a1')).toMatchObject({ atMs: 1_600 + TABLE_MOTION.exitMs, drop: false, snap: true });
  });

  it('a cauda do impacto que o protocolo dá a quem age logo depois cobre o racha, o tremor e a ida da carta ao cemitério', () => {
    expect(MOMENT_TAIL_MS).toBeGreaterThanOrEqual(TABLE_MOTION.crackShakeMs + TABLE_MOTION.exitMs);
  });

  it('as vizinhas do alvo esperam o impacto', () => {
    const { view } = scenarioAt({ self: { attackBuffs: ['J'] } });
    const trap: GameEvent = { type: 'TrapUsed', player: 'p2', card: face('a1', 'A'), target: face('j9', 'J'), targetOwner: 'p1' };
    const shifts = shiftDelaysOf(seen(trap), view);
    expect(view.self.attackBuffs.map((card) => shifts.get(card.id))).toEqual([1_600]);
  });

  it('a sua jogada segue igual: o J voa da mão e pousa depois do recuo e da mola', () => {
    const beats = seen(TURN, buff('p1'));
    expect(landingsOf(beats, 'p1', false).get('j1')).toMatchObject({ atMs: beats[1]!.startMs + 510, drop: false });
    expect(landingsOf(beats, 'p1', false).get('j1')?.snap).toBeUndefined();
  });
});

describe('a essência da cura passiva (bloco A do playtest, ponto 9)', () => {
  it('a carta que sai da Defesa e cura: da batida da saída à batida da cura', () => {
    const six = num('n6', 6);
    const beats = beatsOf(
      { type: 'CardsRemovedFromRow', player: 'p1', row: 'DEF', cards: [six] },
      { type: 'Healed', player: 'p1', amount: 18, source: 'DEFENSE', card: six },
    );
    expect([...healsOf(beats)]).toEqual([['n6', { fromMs: 0, atMs: beats[1]!.startMs, player: 'p1' }]]);
  });

  it('a cura do Roubo e a que não curou nada não têm essência', () => {
    const six = num('n6', 6);
    const beats = beatsOf(
      { type: 'Healed', player: 'p1', amount: 5, source: 'STEAL', card: six },
      { type: 'Healed', player: 'p2', amount: 0, source: 'DEFENSE', card: num('n2', 2) },
    );
    expect(healsOf(beats).size).toBe(0);
  });
});
