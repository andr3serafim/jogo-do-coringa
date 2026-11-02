import { applyAction, viewFor, type GameEvent, type NumCard, type SpecialCard } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import {
  bannerBeatAt,
  bannerRibbon,
  bannerText,
  damageBeatIndex,
  dealsOf,
  delaysOf,
  desolationShown,
  effectsOf,
  fieldTarget,
  insigniaShown,
  NO_EFFECTS,
  resurrectionInfo,
  rowKey,
  sceneText,
} from '../../src/model/effects.ts';
import { initiativeRibbon } from '../../src/model/copy.ts';
import { DAMAGE_BANDS, impactForce } from '../../src/model/impact.ts';
import { withinFlashLimit } from '../../src/model/flash.ts';
import { roomNames } from '../../src/model/history.ts';
import { buildTimeline, luminanceSwitches, timelineMs, type Beat } from '../../src/model/timeline.ts';
import { scenarioAt, seededSteps } from '../fixtures.ts';

const num = (id: string, value: NumCard['value'] = 5): NumCard => ({ id, kind: 'NUM', value, suit: 'copas' });
const face = (id: string, kind: 'J' | 'Q' | 'K' | 'A' = 'K'): SpecialCard => ({ id, kind, suit: 'ouros' });

const LIVE = { mode: 'live', reducedMotion: false, decisionPending: false } as const;
const beatsOf = (...events: GameEvent[]): Beat[] => buildTimeline(events, LIVE);
const names = roomNames('p1', [
  { playerId: 'p1', nickname: 'André' },
  { playerId: 'p2', nickname: 'Duda' },
]);
const view = scenarioAt({ self: { attackRow: [7, 7, 7, 7, 3], defenseRow: [4, 4] }, opponent: { attackRow: [9, 9] } }).view;

describe('a insígnia da Defesa Absoluta na linha do tempo (sub-projeto 6 §7.2)', () => {
  const LIVE_OPTS = { mode: 'live', reducedMotion: false, decisionPending: false } as const;
  const started = (player: 'p1' | 'p2'): GameEvent => ({ type: 'AbsoluteDefenseStarted', player });

  it('a Defesa começa nesta linha do tempo: não aparece até a batida dela passar', () => {
    const beats = buildTimeline([started('p1'), { type: 'TurnStarted', player: 'p2' }], LIVE_OPTS);
    expect(insigniaShown(beats, 0, 'p1', true)).toBe(false);
    expect(insigniaShown(beats, 1, 'p1', true)).toBe(true);
  });

  it('a Defesa já estava ativa: aparece', () => {
    const beats = buildTimeline([{ type: 'TurnStarted', player: 'p2' }], LIVE_OPTS);
    expect(insigniaShown(beats, 0, 'p1', true)).toBe(true);
  });

  it('ela termina nesta linha do tempo: aparece até a batida do fim, e some nela', () => {
    const beats = buildTimeline(
      [{ type: 'AttackDeclared', player: 'p2' }, { type: 'AbsoluteDefenseEnded', player: 'p1' }, { type: 'TurnStarted', player: 'p1' }],
      LIVE_OPTS,
    );
    expect(insigniaShown(beats, 0, 'p1', false)).toBe(true);
    expect(insigniaShown(beats, 1, 'p1', false)).toBe(false);
    expect(insigniaShown(beats, 2, 'p1', false)).toBe(false);
  });

  it('a Defesa do outro jogador não conta', () => {
    const beats = buildTimeline([started('p2')], LIVE_OPTS);
    expect(insigniaShown(beats, 0, 'p1', true)).toBe(true);
    expect(insigniaShown(beats, 0, 'p1', false)).toBe(false);
  });
});

describe('onde a cena de campo acontece (sub-projeto 6 §7.4)', () => {
  const cast = { player: 'p1', row: 'DEF', k: face('k1'), a: face('a1', 'A'), x: face('q1', 'Q') } as const;

  it('a fileira que cai é a do evento, sua ou do oponente, de Ataque ou de Defesa', () => {
    for (const player of ['p1', 'p2'] as const) {
      for (const row of ['ATK', 'DEF'] as const) {
        const event: GameEvent = { type: 'RowDevastated', player, row, cards: [], reflected: false };
        expect(fieldTarget(event, null, 'p1', 'p2')).toEqual({ player, row });
      }
    }
  });

  it('refletida, é a fileira de quem lançou: o evento já diz', () => {
    const event: GameEvent = { type: 'RowDevastated', player: 'p1', row: 'ATK', cards: [], reflected: true };
    expect(fieldTarget(event, cast, 'p1', 'p2')).toEqual({ player: 'p1', row: 'ATK' });
  });

  it('cancelada pelos Reflects: a fileira do alvo, com a fileira da Devastação em curso', () => {
    const event: GameEvent = { type: 'DevastationCanceled', player: 'p1', reason: 'REFLECT_CLASH' };
    expect(fieldTarget(event, cast, 'p1', 'p2')).toEqual({ player: 'p2', row: 'DEF' });
    expect(fieldTarget(event, cast, 'p2', 'p1')).toEqual({ player: 'p2', row: 'DEF' });
  });

  it('cancelada pela Defesa Absoluta: a de quem lançou, para onde ela tinha voltado', () => {
    const event: GameEvent = { type: 'DevastationCanceled', player: 'p1', reason: 'ABSOLUTE_DEFENSE' };
    expect(fieldTarget(event, cast, 'p1', 'p2')).toEqual({ player: 'p1', row: 'DEF' });
  });

  it('sem a Devastação em curso (a cancelada não diz a fileira), ou em outro evento, nada', () => {
    expect(fieldTarget({ type: 'DevastationCanceled', player: 'p1', reason: 'REFLECT_CLASH' }, null, 'p1', 'p2')).toBeNull();
    expect(fieldTarget({ type: 'Exodia', player: 'p1' }, cast, 'p1', 'p2')).toBeNull();
  });
});

describe('a desolação na linha do tempo (sub-projeto 6 §7.4)', () => {
  const fell: GameEvent = { type: 'RowDevastated', player: 'p2', row: 'DEF', cards: [num('n1')], reflected: false };
  const turn: GameEvent = { type: 'TurnStarted', player: 'p1' };

  it('fora da sessão, nada', () => {
    expect(desolationShown(beatsOf(fell), 0, 'p2:DEF', false, null)).toBe(false);
  });

  it('a fileira já estava desolada antes desta linha do tempo: aparece', () => {
    expect(desolationShown(beatsOf(turn), 0, 'p2:DEF', true, null)).toBe(true);
  });

  it('a cena dela está nesta linha do tempo: espera a batida e a poeira assentar', () => {
    const beats = beatsOf(turn, fell, turn);
    expect(desolationShown(beats, 0, 'p2:DEF', true, null)).toBe(false);
    expect(desolationShown(beats, 1, 'p2:DEF', true, null)).toBe(false);
    expect(desolationShown(beats, 1, 'p2:DEF', true, beats[1]!)).toBe(true);
    expect(desolationShown(beats, 2, 'p2:DEF', true, null)).toBe(true);
  });

  it('a queda de outra fileira não a segura', () => {
    expect(desolationShown(beatsOf(fell), 0, 'p1:ATK', true, null)).toBe(true);
  });

  it('no catchUp a queda é faixa, sem cena: vale na batida dela', () => {
    const beats = buildTimeline([fell], { mode: 'catchUp', reducedMotion: false, decisionPending: false });
    expect(desolationShown(beats, 0, 'p2:DEF', true, null)).toBe(true);
  });
});

describe('delaysOf: quando cada elemento com layoutId se mexe', () => {
  it('a carta espera o início da batida que a move', () => {
    const delays = delaysOf(
      beatsOf(
        { type: 'GuardPlayed', player: 'p1', cards: [face('k1')] },
        { type: 'BuffPlayed', player: 'p1', card: face('j1', 'J'), as: 'J' },
      ),
    );
    expect(delays.get('k1')).toBe(0);
    expect(delays.get('j1')).toBe(300);
  });

  it('a carta que se mexe em duas batidas espera a última', () => {
    const delays = delaysOf(
      beatsOf(
        { type: 'CardsDealt', player: 'p1', count: 1, cards: [num('n1')] },
        { type: 'GuardPlayed', player: 'p1', cards: [face('k1')] },
        { type: 'GuardBroken', player: 'p1', cards: [face('k1')] },
      ),
    );
    expect(delays.get('n1')).toBe(0);
    expect(delays.get('k1')).toBe(600);
  });

  it('as cartas de uma cena (o Reflect) também esperam a cena', () => {
    const delays = delaysOf(
      beatsOf(
        { type: 'TurnStarted', player: 'p1' },
        { type: 'ReflectPlayed', player: 'p1', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') }, against: 'ATTACK' },
      ),
    );
    expect(delays.get('k1')).toBe(400);
  });

  it('a decisão da iniciativa não atrasa nenhum layout (a espada troca de retrato pelo efeito da batida)', () => {
    const changed = { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 } } as const;
    expect(delaysOf(beatsOf({ type: 'TurnStarted', player: 'p1' }, changed)).size).toBe(0);
  });

  it('sem batidas, nada espera', () => {
    expect(delaysOf([]).size).toBe(0);
  });

  it('as cartas da fileira devastada não esperam: vão ao cemitério na hora, e a cena desenha as cópias caindo (sub-projeto 6 §7.4)', () => {
    const delays = delaysOf(
      beatsOf({ type: 'TurnStarted', player: 'p1' }, { type: 'RowDevastated', player: 'p2', row: 'ATK', cards: [num('n1'), num('n2')], reflected: false }),
    );
    expect(delays.has('n1')).toBe(false);
    expect(delays.has('n2')).toBe(false);
  });
});

describe('damageBeatIndex: onde a vida e os totais contam até o valor novo', () => {
  it('é a batida do dano', () => {
    const beats = beatsOf(
      { type: 'AttackDeclared', player: 'p1' },
      { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 30, defense: 10, damage: 20 },
    );
    expect(damageBeatIndex(beats)).toBe(1);
  });

  it('o dano do Reflect, que volta para o atacante, também conta', () => {
    expect(damageBeatIndex(beatsOf({ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 12 }))).toBe(0);
  });

  it('o dano e a cura do Roubo (E3) também contam: a vida dos dois lados conta na primeira batida deles', () => {
    const beats = beatsOf(
      { type: 'CardStolen', player: 'p1', from: 'p2', card: num('n1', 9), fromRow: 'ATK', toRow: 'DEF', ace: face('a1', 'A') },
      { type: 'StealDamage', player: 'p1', victim: 'p2', value: 9, damage: 9, blocked: false },
      { type: 'Healed', player: 'p1', amount: 9, source: 'STEAL', card: num('n1', 9) },
    );
    expect(damageBeatIndex(beats)).toBe(1);
    expect(damageBeatIndex(beatsOf({ type: 'Healed', player: 'p1', amount: 4, source: 'DEFENSE', card: num('n2') }))).toBe(0);
  });

  it('sem dano, é -1', () => {
    expect(damageBeatIndex(beatsOf({ type: 'TurnStarted', player: 'p1' }))).toBe(-1);
    expect(damageBeatIndex([])).toBe(-1);
  });
});

describe('dealsOf: as cartas que entram na batida do CardsDealt', () => {
  it('as cartas com id entram no início da batida; as sem id (a mão do oponente) entram por contagem', () => {
    const deals = dealsOf(
      beatsOf(
        { type: 'TurnStarted', player: 'p1' },
        { type: 'CardsDealt', player: 'p1', count: 2, cards: [num('n1'), num('n2')] },
        { type: 'CardsDealt', player: 'p2', count: 3 },
      ),
    );
    expect(deals.cards.get('n1')).toBe(400);
    expect(deals.cards.get('n2')).toBe(400);
    expect(deals.backs.get('p2')).toEqual({ count: 3, startMs: 700 });
    expect(deals.backs.has('p1')).toBe(false);
  });

  it('sem CardsDealt, nada entra', () => {
    const deals = dealsOf(beatsOf({ type: 'TurnStarted', player: 'p1' }));
    expect(deals.cards.size).toBe(0);
    expect(deals.backs.size).toBe(0);
  });
});

describe('Ataque Absoluto contra um Reflect (eventos do motor): o Reflect intercepta tudo e os K do dono ficam', () => {
  // Duda ataca com 4 J; você tem um Reflect e um K na Guarda, e passa na janela.
  const { state } = scenarioAt({
    phase: 'WAITING',
    self: { reflect: true, guard: ['K'], defenseRow: [4] },
    opponent: { attackRow: [5, 6, 7], attackBuffs: ['J', 'J', 'J', 'J'], guard: ['K'] },
  });
  const declared = applyAction(state, 'p2', { type: 'DECLARE_ATTACK' });
  if (!declared.ok) throw new Error(declared.error.message);
  const passed = applyAction(declared.state, 'p1', { type: 'PASS' });
  if (!passed.ok) throw new Error(passed.error.message);
  const after = viewFor(passed.state, 'p1');
  const beats = buildTimeline(passed.events, LIVE);
  const myGuard = state.players[0].guard.map((card) => card.id);

  it('a cena do Ataque Absoluto vem antes da do Reflect que o devolve', () => {
    const scenes = beats.filter((beat) => beat.scene !== null).map((beat) => beat.scene);
    expect(scenes).toEqual(['ABSOLUTE_ATTACK', 'REFLECT_TRIGGERED']);
  });

  it('nenhuma batida racha um K seu: a cena do Absoluto só acende o Ataque de quem ataca', () => {
    const absolute = beats.find((beat) => beat.scene === 'ABSOLUTE_ATTACK')!;
    expect(effectsOf(absolute, after)).toMatchObject({ rows: new Set([rowKey('p2', 'ATK')]), cards: new Map() });
    for (const beat of beats) {
      const cracked = [...effectsOf(beat, after).cards].filter(([, fx]) => fx === 'crack').map(([id]) => id);
      expect(cracked.filter((id) => myGuard.includes(id))).toEqual([]);
    }
    expect(after.self.guard.map((card) => card.id)).toEqual(myGuard);
  });
});

describe('o que a mesa diz da Ressurreição (sub-projeto 6 §7.6)', () => {
  type Side = { attackRow?: number[]; defenseRow?: number[] };
  const viewOf = (self: Side, opponent: Side = {}) =>
    scenarioAt({ self: { attackRow: [], defenseRow: [], ...self }, opponent: { attackRow: [], defenseRow: [], ...opponent } } as Parameters<typeof scenarioAt>[0]).view;
  const revive = (player: 'p1' | 'p2', row: 'ATK' | 'DEF', card: NumCard): GameEvent => ({ type: 'Resurrected', player, row, card });

  it('a quadra na fileira de destino: os 4 índices e as 4 cartas, e a carta pousa no fim da fileira', () => {
    const view = viewOf({ attackRow: [8, 8, 5, 8, 8, 3] });
    const info = resurrectionInfo(revive('p1', 'ATK', view.self.attackRow.at(-1)!), view)!;
    expect(info.landIndex).toBe(5);
    expect(info.quad).toEqual({ row: 'ATK', indices: [0, 1, 3, 4], cards: [0, 1, 3, 4].map((i) => view.self.attackRow[i]) });
  });

  it('a quadra na outra fileira: acende a de lá', () => {
    const view = viewOf({ attackRow: [3], defenseRow: [9, 9, 9, 9] });
    const info = resurrectionInfo(revive('p1', 'ATK', view.self.attackRow[0]!), view)!;
    expect(info.landIndex).toBe(0);
    expect(info.quad?.row).toBe('DEF');
    expect(info.quad?.indices).toEqual([0, 1, 2, 3]);
  });

  it('quadras nas duas fileiras: a da fileira de destino', () => {
    const view = viewOf({ attackRow: [6, 6, 6, 6], defenseRow: [9, 9, 9, 9, 3] });
    expect(resurrectionInfo(revive('p1', 'DEF', view.self.defenseRow.at(-1)!), view)!.quad?.row).toBe('DEF');
  });

  it('duas quadras na mesma fileira: a de maior valor', () => {
    const view = viewOf({ attackRow: [6, 6, 6, 6, 9, 9, 9, 9, 3] });
    const info = resurrectionInfo(revive('p1', 'ATK', view.self.attackRow.at(-1)!), view)!;
    expect(info.quad?.indices).toEqual([4, 5, 6, 7]);
  });

  it('nenhuma quadra na mesa (a Ressurreição vale mesmo com ela desfeita): nenhuma carta acende', () => {
    const view = viewOf({ attackRow: [2, 3] });
    expect(resurrectionInfo(revive('p1', 'ATK', view.self.attackRow[1]!), view)).toEqual({ landIndex: 1, quad: null });
  });

  it('a carta que volta não conta: três 8 e o quarto voltando não são a quadra que chamou o céu', () => {
    const view = viewOf({ attackRow: [8, 8, 8, 8] });
    expect(resurrectionInfo(revive('p1', 'ATK', view.self.attackRow[3]!), view)!.quad).toBeNull();
  });

  it('cinco iguais depois da volta: 4 índices, sem a que volta', () => {
    const view = viewOf({ attackRow: [8, 8, 8, 8, 8] });
    const info = resurrectionInfo(revive('p1', 'ATK', view.self.attackRow[4]!), view)!;
    expect(info.landIndex).toBe(4);
    expect(info.quad?.indices).toEqual([0, 1, 2, 3]);
  });

  it('a do oponente lê o campo dele', () => {
    const view = viewOf({ attackRow: [7, 7, 7, 7] }, { defenseRow: [2, 2, 2, 2, 5] });
    const info = resurrectionInfo(revive('p2', 'DEF', view.opponent.defenseRow.at(-1)!), view)!;
    expect(info.landIndex).toBe(4);
    expect(info.quad).toMatchObject({ row: 'DEF', indices: [0, 1, 2, 3] });
  });

  it('a carta que não está mais na fileira: não pousa em lugar nenhum', () => {
    const view = viewOf({ attackRow: [2] });
    expect(resurrectionInfo(revive('p1', 'DEF', view.self.attackRow[0]!), view)!.landIndex).toBe(-1);
  });

  it('outro evento: nada', () => {
    expect(resurrectionInfo({ type: 'TurnStarted', player: 'p1' }, viewOf({}))).toBeNull();
  });

  it('o texto: na faixa da reconexão e no painel de reserva', () => {
    const names = roomNames('p1', [{ playerId: 'p2', nickname: 'Duda', connected: true }] as never);
    const event = revive('p2', 'DEF', num('n9', 9));
    expect(bannerText(event, names)).toContain('ressuscitou');
    const [beat] = buildTimeline([event], { mode: 'live', reducedMotion: false, decisionPending: false });
    expect(sceneText(beat!, names)).toMatchObject({ title: 'RESSURREIÇÃO' });
    expect(sceneText(beat!, names).detail).toContain('ressuscitou');
  });
});

describe('os efeitos do Reflect (sub-projeto 6 §7.5)', () => {
  const trigger: GameEvent = { type: 'ReflectTriggered', owner: 'p1', attacker: 'p2', damage: 30 };
  const options = { mode: 'live', reducedMotion: false, decisionPending: false } as const;
  const view = scenarioAt({} as Parameters<typeof scenarioAt>[0]).view;

  it('o dano devolvido só vale depois de a volta dourada acertar', () => {
    const beat = buildTimeline([trigger], options)[0]!;
    expect(effectsOf(beat, view, false).damage).toBeNull();
    expect(effectsOf(beat, view, false).impact).toBeNull();
    expect(effectsOf(beat, view, true).damage).toEqual({ target: 'p2', amount: 30 });
    expect(effectsOf(beat, view, true).impact?.target).toBe('p2');
  });

  it('com a cena desenhada, o número é dela, e o placar não o repete', () => {
    const beat = buildTimeline([trigger], options)[0]!;
    expect(effectsOf(beat, view, true, true).damage).toBeNull();
  });

  it('a anulação desenhada não repete o escudo que quebra no placar; sem o desenho, ele fica', () => {
    const beat = buildTimeline([{ type: 'ReflectCanceled', player: 'p2', owner: 'p1' }], options)[0]!;
    expect(effectsOf(beat, view, false, true).shieldBreak).toBeNull();
    expect(effectsOf(beat, view, false, false).shieldBreak).toBe('p1');
  });

  it('a anulação tem fita com o motivo, no ar durante a cena', () => {
    const event: GameEvent = { type: 'ReflectCanceled', player: 'p2', owner: 'p1' };
    expect(bannerText(event, { me: 'p1', of: () => 'Bot' } as never)).toBe('Os Reflects se anularam');
    const beats = buildTimeline([event], options);
    expect(bannerBeatAt(beats, 0, false)).toBe(beats[0]);
  });
});

describe('effectsOf: o efeito de cada evento (spec §4.2)', () => {
  const fx = (event: GameEvent) => effectsOf(beatsOf(event)[0]!, view);

  it('sem batida, sem efeito', () => {
    expect(effectsOf(null, view)).toBe(NO_EFFECTS);
  });

  it('AttackDeclared acende a fileira de Ataque de quem atacou', () => {
    expect(fx({ type: 'AttackDeclared', player: 'p1' }).rows).toEqual(new Set([rowKey('p1', 'ATK')]));
  });

  it('AbsoluteAttack também acende a fileira de Ataque', () => {
    expect(fx({ type: 'AbsoluteAttack', player: 'p2' }).rows).toEqual(new Set([rowKey('p2', 'ATK')]));
  });

  it('DamageDealt põe ATK contra DEF e sobe o número do dano no Coringa que apanhou', () => {
    const effects = fx({ type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 30, defense: 10, damage: 20 });
    expect(effects.rows).toEqual(new Set([rowKey('p1', 'ATK'), rowKey('p2', 'DEF')]));
    expect(effects.damage).toEqual({ target: 'p2', amount: 20 });
  });

  it('o dano do Roubo sobe no Coringa de quem foi roubado; anulado pelo K, nada sobe', () => {
    expect(fx({ type: 'StealDamage', player: 'p1', victim: 'p2', value: 9, damage: 9, blocked: false }).damage).toEqual({ target: 'p2', amount: 9 });
    expect(fx({ type: 'StealDamage', player: 'p1', victim: 'p2', value: 9, damage: 0, blocked: true }).damage).toBeNull();
  });

  it('a cura (do Roubo ou da Defesa) sobe "+N" no Coringa de quem curou', () => {
    expect(fx({ type: 'Healed', player: 'p1', amount: 9, source: 'STEAL', card: num('n1', 9) }).damage).toEqual({ target: 'p1', amount: 9, heal: true });
    expect(fx({ type: 'Healed', player: 'p2', amount: 12, source: 'DEFENSE', card: num('n2', 4) }).damage).toEqual({ target: 'p2', amount: 12, heal: true });
  });

  it('dano zero não sobe número nenhum (o ataque foi barrado)', () => {
    const effects = fx({ type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 10, defense: 30, damage: 0 });
    expect(effects.damage).toBeNull();
    expect(effects.rows.size).toBe(2);
  });

  it('ReflectTriggered põe o dano no atacante', () => {
    const beat = beatsOf({ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 12 })[0]!;
    expect(effectsOf(beat, view, true).damage).toEqual({ target: 'p1', amount: 12 });
  });

  it('GuardBroken racha os K', () => {
    const effects = fx({ type: 'GuardBroken', player: 'p2', cards: [face('k1'), face('k2')] });
    expect(effects.cards).toEqual(
      new Map([
        ['k1', 'crack'],
        ['k2', 'crack'],
      ]),
    );
  });

  it('o escudo do Reflect do dono quebra no Reflect contra Reflect', () => {
    expect(fx({ type: 'ReflectCanceled', player: 'p1', owner: 'p2' }).shieldBreak).toBe('p2');
    expect(fx({ type: 'TurnStarted', player: 'p1' }).shieldBreak).toBeNull();
  });

  it('Armadilha e Sacrifício racham o alvo', () => {
    for (const type of ['TrapUsed', 'Sacrificed'] as const) {
      const effects = fx({ type, player: 'p1', card: face('a1', 'A'), target: face('k9'), targetOwner: 'p2' });
      expect(effects.cards).toEqual(new Map([['k9', 'crack']]));
    }
  });

  it('ReflectPlayed forma o escudo com as três cartas', () => {
    const effects = fx({
      type: 'ReflectPlayed',
      player: 'p1',
      reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') },
      against: 'ATTACK',
    });
    expect(effects.cards).toEqual(
      new Map([
        ['k1', 'shield'],
        ['j1', 'shield'],
        ['q1', 'shield'],
      ]),
    );
  });

  it('QuadFormed e QuadBroken acendem as cartas da quadra, na fileira dela', () => {
    for (const type of ['QuadFormed', 'QuadBroken'] as const) {
      const effects = fx({ type, player: 'p1', quad: { row: 'ATK', value: 7 } });
      const lit = [...effects.cards.entries()];
      expect(lit).toHaveLength(4);
      expect(new Set(lit.map(([, kind]) => kind))).toEqual(new Set(['light']));
      expect(lit.map(([id]) => id).sort()).toEqual(view.self.attackRow.filter((c) => c.value === 7).map((c) => c.id).sort());
    }
  });

  it('a quadra do oponente acende nas cartas do oponente', () => {
    const effects = fx({ type: 'QuadFormed', player: 'p2', quad: { row: 'ATK', value: 9 } });
    expect([...effects.cards.keys()].sort()).toEqual(view.opponent.attackRow.map((c) => c.id).sort());
  });

  it('eventos sem efeito de carta, fileira ou número devolvem o vazio', () => {
    for (const event of [
      { type: 'TurnStarted', player: 'p1' },
      { type: 'Exodia', player: 'p1' },
      { type: 'BuffPlayed', player: 'p1', card: face('j1', 'J'), as: 'J' },
    ] satisfies GameEvent[]) {
      const effects = fx(event);
      expect(effects.cards.size).toBe(0);
      expect(effects.rows.size).toBe(0);
      expect(effects.damage).toBeNull();
    }
  });
});

describe('bannerText: a faixa de cada evento', () => {
  it('rodada, vez e ordem', () => {
    expect(bannerText({ type: 'RoundStarted', round: 3, kind: 'ATTACK' }, names)).toBe('Rodada 3 · Ataque');
    expect(bannerText({ type: 'RoundStarted', round: 4, kind: 'EQUIP' }, names)).toBe('Rodada 4 · Equipar');
    expect(bannerText({ type: 'TurnStarted', player: 'p1' }, names)).toBe('Sua vez');
    expect(bannerText({ type: 'TurnStarted', player: 'p2' }, names)).toBe('Vez de Duda');
    expect(bannerText({ type: 'OrderChosen', player: 'p2', first: true, turnOrder: ['p2', 'p1'] }, names)).toBe(
      'Duda escolheu atacar primeiro',
    );
  });

  it('janela de reação, iniciativa e quadra', () => {
    expect(bannerText({ type: 'ReactionWindowOpened', responder: 'p1', trigger: 'ATTACK' }, names)).toBe(
      'Você pode reagir',
    );
    expect(bannerText({ type: 'ReactionWindowOpened', responder: 'p2', trigger: 'K_PLAYED' }, names)).toBe(
      'Duda pode reagir',
    );
    expect(bannerText({ type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 } }, names)).toBe('Duda causou mais dano (9 × 3) e ficou com a iniciativa');
    expect(bannerText({ type: 'InitiativeDecided', player: 'p1', changed: false, damage: { p1: 14, p2: 9 } }, names)).toBe(
      'Você causou mais dano (14 × 9) e segue com a iniciativa',
    );
    expect(bannerText({ type: 'InitiativeDecided', player: 'p1', changed: false, damage: { p1: 5, p2: 5 } }, names)).toBe(
      'Empate em dano (5 × 5): a iniciativa segue com você',
    );
    expect(bannerText({ type: 'QuadFormed', player: 'p1', quad: { row: 'ATK', value: 7 } }, names)).toContain(
      '+7 e 1 Ressurreição',
    );
    expect(bannerText({ type: 'QuadBroken', player: 'p2', quad: { row: 'DEF', value: 4 } }, names)).toContain(
      'quadra de 4',
    );
  });

  it('o cemitério que vira o monte', () => {
    expect(bannerText({ type: 'DeckReshuffled', count: 9 }, names)).toBe('O cemitério virou o monte');
  });

  it('o fim da partida diz o resultado', () => {
    expect(
      bannerText({ type: 'GameOver', result: { kind: 'WIN', winner: 'p1', reason: 'HP' } }, names),
    ).toContain('Você venceu');
  });

  it('as cenas viram faixa quando o catchUp as achata', () => {
    expect(bannerText({ type: 'Exodia', player: 'p2' }, names)).toBe('EXÓDIA de Duda!');
    expect(bannerText({ type: 'AbsoluteAttack', player: 'p1' }, names)).toBe('ATAQUE ABSOLUTO de você!');
    expect(bannerText({ type: 'AbsoluteDefenseStarted', player: 'p2' }, names)).toBe('DEFESA ABSOLUTA de Duda!');
    expect(bannerText({ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 5 }, names)).toContain('devolveu 5');
    expect(
      bannerText({ type: 'ReflectPlayed', player: 'p1', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') }, against: 'ATTACK' }, names),
    ).toBe('Você respondeu com um Reflect!');
  });

  it('o Roubo, a queimada da BURN e a Devastação viram faixa', () => {
    const nine = num('n1', 9);
    expect(bannerText({ type: 'CardStolen', player: 'p2', from: 'p1', card: nine, fromRow: 'ATK', toRow: 'DEF', ace: face('a1', 'A') }, names)).toBe(
      'Duda roubou o 9♥ do seu Ataque',
    );
    expect(bannerText({ type: 'CardStolen', player: 'p1', from: 'p2', card: nine, fromRow: 'DEF', toRow: 'ATK', ace: face('a1', 'A') }, names)).toBe(
      'Você roubou o 9♥ da Defesa de Duda',
    );
    expect(bannerText({ type: 'HandLimitPenalty', player: 'p1', penalty: 'BURN', cards: [face('k1')], fewer: 0 }, names)).toBe(
      'Sua mão já tem 4 especiais: K♦ foi para o cemitério',
    );
    expect(bannerText({ type: 'HandLimitPenalty', player: 'p2', penalty: 'BURN', cards: [face('k1'), face('q1', 'Q')], fewer: 0 }, names)).toBe(
      'A mão de Duda já tem 4 especiais: K♦ e Q♦ foram para o cemitério',
    );
    expect(bannerText({ type: 'RowDevastated', player: 'p2', row: 'ATK', cards: [nine], reflected: false }, names)).toBe(
      'O Ataque de Duda foi devastado',
    );
    expect(bannerText({ type: 'RowDevastated', player: 'p1', row: 'DEF', cards: [nine], reflected: true }, names)).toBe(
      'A Devastação voltou: a sua Defesa foi devastada',
    );
    expect(bannerText({ type: 'DevastationCanceled', player: 'p1', reason: 'REFLECT_CLASH' }, names)).toBe(
      'Os Reflects se anularam: a Devastação não aconteceu',
    );
    expect(bannerText({ type: 'DevastationCanceled', player: 'p2', reason: 'ABSOLUTE_DEFENSE' }, names)).toBe(
      'A Defesa Absoluta de Duda segurou a Devastação devolvida',
    );
    expect(bannerText({ type: 'DevastationCanceled', player: 'p1', reason: 'ABSOLUTE_DEFENSE' }, names)).toBe(
      'A sua Defesa Absoluta segurou a Devastação devolvida',
    );
  });

  it('um evento que não vira faixa devolve null', () => {
    expect(bannerText({ type: 'EquipSubmitted', player: 'p1' }, names)).toBeNull();
    expect(bannerText({ type: 'AttackDeclared', player: 'p1' }, names)).toBeNull();
  });
});

describe('sceneText: o título e a linha de baixo de cada cena', () => {
  const beat = (event: GameEvent): Beat => beatsOf(event)[0]!;

  it('cada cena tem o seu título', () => {
    expect(sceneText(beat({ type: 'Exodia', player: 'p1' }), names).title).toBe('EXÓDIA!');
    expect(sceneText(beat({ type: 'AbsoluteAttack', player: 'p1' }), names).title).toBe('ATAQUE ABSOLUTO');
    expect(sceneText(beat({ type: 'AbsoluteDefenseStarted', player: 'p1' }), names).title).toBe('DEFESA ABSOLUTA');
    expect(
      sceneText(
        beat({ type: 'ReflectPlayed', player: 'p1', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') }, against: 'ATTACK' }),
        names,
      ).title,
    ).toBe('REFLECT');
    expect(sceneText(beat({ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 5 }), names).title).toBe(
      'REFLECT',
    );
  });

  it('a cena da Devastação é a da fileira que cai: o título e qual fileira caiu (sub-projeto 6 §7.4)', () => {
    const fell = (player: 'p1' | 'p2', row: 'ATK' | 'DEF', reflected = false): GameEvent => ({ type: 'RowDevastated', player, row, cards: [num('n1')], reflected });
    expect(sceneText(beat(fell('p1', 'ATK')), names)).toEqual({ title: 'DEVASTAÇÃO!', detail: 'O seu Ataque foi devastado' });
    expect(sceneText(beat(fell('p2', 'DEF')), names)).toEqual({ title: 'DEVASTAÇÃO!', detail: 'A Defesa de Duda foi devastada' });
    expect(sceneText(beat(fell('p1', 'DEF', true)), names).detail).toBe('A Devastação voltou: a sua Defesa foi devastada');
  });

  it('a cancelada não carimba nome: o motivo vai na fita', () => {
    expect(sceneText(beat({ type: 'DevastationCanceled', player: 'p1', reason: 'REFLECT_CLASH' }), names)).toEqual({ title: '', detail: '' });
  });

  it('a linha de baixo diz de quem é, com "Você" ou o apelido', () => {
    expect(sceneText(beat({ type: 'AbsoluteAttack', player: 'p1' }), names).detail).toBe('Você');
    expect(
      sceneText(
        beat({ type: 'ReflectPlayed', player: 'p2', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') }, against: 'ATTACK' }),
        names,
      ).detail,
    ).toBe('Duda armou o escudo');
    expect(sceneText(beat({ type: 'AbsoluteAttack', player: 'p2' }), names).detail).toBe('Duda');
    expect(sceneText(beat({ type: 'Exodia', player: 'p2' }), names).detail).toBe('Duda reuniu os quatro K e vence!');
    expect(sceneText(beat({ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 5 }), names).detail).toBe(
      'O ataque voltou: 5 de dano em você',
    );
  });

  it('sem cena, devolve um texto vazio', () => {
    expect(sceneText(beat({ type: 'TurnStarted', player: 'p1' }), names)).toEqual({ title: '', detail: '' });
  });
});

describe('bannerBeatAt: a faixa que está no ar (spec §4.1, §10.4)', () => {
  const CATCH_UP = { mode: 'catchUp', reducedMotion: false, decisionPending: false } as const;
  const turn = (player: 'p1' | 'p2' = 'p2'): GameEvent => ({ type: 'TurnStarted', player });
  const move = (id: string): GameEvent => ({ type: 'CardsRemovedFromRow', player: 'p2', row: 'ATK', cards: [num(id)] });
  const textsAt = (beats: Beat[], catchUp: boolean) =>
    beats.map((_, i) => {
      const banner = bannerBeatAt(beats, i, catchUp);
      return banner === null ? null : bannerText(banner.event, names);
    });

  it('ao vivo: só a batida que tem faixa (a do `DeckReshuffled` também) mostra a dela', () => {
    const beats = beatsOf(move('n1'), turn(), move('n2'), { type: 'DeckReshuffled', count: 4 }, move('n3'));
    expect(textsAt(beats, false)).toEqual([null, 'Vez de Duda', null, 'O cemitério virou o monte', null]);
  });

  it('no catchUp: da primeira à última faixa, com o texto da última que passou; fora delas, nada', () => {
    const beats = buildTimeline([move('n1'), turn(), move('n2'), move('n3'), turn('p1'), move('n4')], CATCH_UP);
    expect(textsAt(beats, true)).toEqual([null, 'Vez de Duda', 'Vez de Duda', 'Vez de Duda', 'Sua vez', null]);
  });

  it('no catchUp com uma faixa só: ela vale só na própria batida', () => {
    const beats = buildTimeline([move('n1'), turn(), move('n2')], CATCH_UP);
    expect(textsAt(beats, true)).toEqual([null, 'Vez de Duda', null]);
  });

  it('sem faixa nenhuma, ou fora das batidas (índice -1 ou além do fim), nada', () => {
    const beats = buildTimeline([move('n1'), move('n2')], CATCH_UP);
    expect(textsAt(beats, true)).toEqual([null, null]);
    const withBanner = buildTimeline([turn()], CATCH_UP);
    expect(bannerBeatAt(withBanner, -1, true)).toBeNull();
    expect(bannerBeatAt(withBanner, 1, true)).toBeNull();
    expect(bannerBeatAt([], 0, false)).toBeNull();
  });

  it('ao vivo, a cena da Devastação cancelada tem a fita do motivo, nos dois motivos (sub-projeto 6 §7.4)', () => {
    for (const [reason, text] of [
      ['REFLECT_CLASH', 'Os Reflects se anularam: a Devastação não aconteceu'],
      ['ABSOLUTE_DEFENSE', 'A sua Defesa Absoluta segurou a Devastação devolvida'],
    ] as const) {
      const beats = beatsOf(move('n1'), { type: 'DevastationCanceled', player: 'p1', reason }, move('n2'));
      expect(beats[1]!.scene).toBe('DEVASTATION_CANCELED');
      expect(bannerBeatAt(beats, 1, false)).toBe(beats[1]);
      expect(textsAt(beats, false)).toEqual([null, text, null]);
    }
  });

  it('a cena da fileira que cai não tem fita: o nome carimba no campo', () => {
    const beats = beatsOf({ type: 'RowDevastated', player: 'p2', row: 'ATK', cards: [num('n1')], reflected: false });
    expect(bannerBeatAt(beats, 0, false)).toBeNull();
  });

  it('as cenas viram faixa no catchUp e entram na mesma subida', () => {
    const beats = buildTimeline([turn(), move('n1'), { type: 'Exodia', player: 'p2' }, move('n2')], CATCH_UP);
    expect(textsAt(beats, true)).toEqual(['Vez de Duda', 'Vez de Duda', 'EXÓDIA de Duda!', null]);
  });

  /**
   * Os instantes (ms) em que a camada da faixa sobe ou desce quando a linha do tempo toca: a camada acompanha a batida de
   * agora, e a que dura 0 ms (`quiet`) nunca é "a de agora". Se acaba com a faixa no ar, ela desce no fim da linha.
   */
  function bannerSwitches(beats: Beat[], catchUp: boolean): number[] {
    const switches: number[] = [];
    let up = false;
    beats.forEach((beat, i) => {
      if (beat.durationMs === 0) return;
      const now = bannerBeatAt(beats, i, catchUp) !== null;
      if (now !== up) switches.push(beat.startMs);
      up = now;
    });
    if (up) switches.push(timelineMs(beats));
    return switches;
  }

  it('propriedade: o catchUp de partidas greedy com semente sobe e desce a faixa uma vez, e nenhuma janela de 1 s passa de 3 trocas', () => {
    // Cada atraso (eventos que a reconexão devolve) é uma janela deslizante sobre os eventos da partida inteira. Os
    // eventos vêm redigidos para quem agiu (`viewEvents`), o que não muda a batida de nenhum deles.
    const tally = { backlogs: 0, withBanner: 0, perBeatRuleFails: 0, worstPerBeatRule: 0 };
    for (const seed of ['luz-0', 'luz-1', 'luz-2', 'luz-3', 'luz-4', 'faixa-0', 'faixa-1', 'faixa-2']) {
      const events = seededSteps(seed, 400).flatMap((step) => step.events);
      // Com o Roubo (E3) as partidas ficaram mais curtas: a menor das amostras tem ~100 eventos.
      expect(events.length).toBeGreaterThan(80);
      for (const delay of [6, 10, 15, 25]) {
        for (let from = 0; from + delay <= events.length; from++) {
          for (const decisionPending of [false, true]) {
            const beats = buildTimeline(events.slice(from, from + delay), { ...CATCH_UP, decisionPending });
            tally.backlogs++;
            // No catchUp as cenas viram faixa: não há cortina nem inversão, e a faixa é a única mudança de luminância.
            expect(luminanceSwitches(beats)).toEqual([]);
            const switches = bannerSwitches(beats, true);
            expect(withinFlashLimit([], [...switches, ...luminanceSwitches(beats)])).toBe(true);
            expect(switches.length).toBeLessThanOrEqual(2);
            if (switches.length > 0) tally.withBanner++;
            // A regra antiga (uma subida por batida) quebrava a de 3 por segundo em boa parte desses atrasos.
            const perBeat = bannerSwitches(beats, false);
            if (!withinFlashLimit([], perBeat)) tally.perBeatRuleFails++;
            tally.worstPerBeatRule = Math.max(tally.worstPerBeatRule, perBeat.length);
          }
        }
      }
    }
    expect(tally.backlogs).toBeGreaterThan(10_000);
    expect(tally.withBanner).toBeGreaterThan(tally.backlogs / 2);
    // Garante que a propriedade pegou o defeito: com a regra de uma faixa por batida, muitos atrasos passavam do limite.
    expect(tally.perBeatRuleFails).toBeGreaterThan(100);
    expect(tally.worstPerBeatRule).toBeGreaterThan(4);
  });
});

describe('a fita da iniciativa (sub-projeto 6 §4)', () => {
  const decided = (player: 'p1' | 'p2', changed: boolean, p1: number, p2: number) =>
    ({ type: 'InitiativeDecided', player, changed, damage: { p1, p2 } }) as const;

  it('mudou para você: "Você ataca primeiro", e o seu dano primeiro', () => {
    expect(initiativeRibbon(decided('p1', true, 50, 37), names)).toEqual({
      title: 'Você ataca primeiro',
      reason: 'causou mais dano na rodada · 50 × 37',
    });
  });

  it('mudou para o outro: o nome dele, e o dano dele primeiro', () => {
    expect(initiativeRibbon(decided('p2', true, 37, 50), names)).toEqual({
      title: 'Duda ataca primeiro',
      reason: 'causou mais dano na rodada · 50 × 37',
    });
  });

  it('não mudou: "segue atacando primeiro", com o mesmo motivo', () => {
    expect(initiativeRibbon(decided('p1', false, 50, 37), names)).toEqual({
      title: 'Você segue atacando primeiro',
      reason: 'causou mais dano na rodada · 50 × 37',
    });
    expect(initiativeRibbon(decided('p2', false, 37, 50), names).title).toBe('Duda segue atacando primeiro');
  });

  it('empate: o título de "não mudou" e o motivo do empate', () => {
    expect(initiativeRibbon(decided('p2', false, 40, 40), names)).toEqual({
      title: 'Duda segue atacando primeiro',
      reason: 'empate em dano · 40 × 40',
    });
  });

  it('as outras faixas são fitas sem motivo, com o texto de hoje', () => {
    const stolen = { type: 'CardStolen', player: 'p2', from: 'p1', card: num('n9', 9), fromRow: 'ATK', toRow: 'DEF', ace: face('a1', 'A') } as const;
    expect(bannerRibbon(stolen, names)).toEqual({ title: bannerText(stolen, names), reason: null });
    expect(bannerRibbon(decided('p2', true, 3, 9), names)).toEqual(initiativeRibbon(decided('p2', true, 3, 9), names));
    expect(bannerRibbon({ type: 'CardsDealt', player: 'p1', count: 2 }, names)).toBeNull();
  });

  it('a batida da iniciativa diz à espada quem ficou com ela e se mudou', () => {
    const [, beat] = beatsOf({ type: 'TurnStarted', player: 'p1' }, decided('p2', true, 3, 9));
    expect(effectsOf(beat!, view).initiative).toEqual({ holder: 'p2', changed: true });
    expect(effectsOf(beatsOf(decided('p1', false, 9, 3))[0]!, view).initiative).toEqual({ holder: 'p1', changed: false });
    expect(effectsOf(beatsOf({ type: 'TurnStarted', player: 'p1' })[0]!, view).initiative).toBeNull();
  });
});

describe('o peso do golpe (sub-projeto 6 §5)', () => {
  it('a força do golpe segue as faixas do som: leve, médio a partir de 40, forte a partir de 100; zero não é golpe', () => {
    expect(DAMAGE_BANDS).toEqual({ medio: 40, forte: 100 });
    expect(impactForce(0)).toBeNull();
    expect(impactForce(1)).toBe('leve');
    expect(impactForce(39)).toBe('leve');
    expect(impactForce(40)).toBe('medio');
    expect(impactForce(99)).toBe('medio');
    expect(impactForce(100)).toBe('forte');
  });

  it('o dano marca o impacto em quem apanhou, com a força dele', () => {
    const hit = (damage: number) =>
      effectsOf(beatsOf({ type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 0, defense: 0, damage })[0]!, view).impact;
    expect(hit(37)).toEqual({ target: 'p2', force: 'leve' });
    expect(hit(154)).toEqual({ target: 'p2', force: 'forte' });
    expect(hit(0)).toBeNull();
  });

  it('o Roubo e o ataque que volta pelo Reflect também batem; a cura não', () => {
    const fx = (event: GameEvent) => effectsOf(beatsOf(event)[0]!, view).impact;
    expect(fx({ type: 'StealDamage', player: 'p1', victim: 'p2', value: 9, damage: 9, blocked: false })).toEqual({ target: 'p2', force: 'leve' });
    // O dano devolvido acende dentro da cena, e o golpe de cena treme forte, como o do Ataque Absoluto.
    const reflected = beatsOf({ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 60 })[0]!;
    expect(effectsOf(reflected, view, true).impact).toEqual({ target: 'p1', force: 'forte' });
    expect(fx({ type: 'Healed', player: 'p1', amount: 9, source: 'STEAL', card: num('n9', 9) })).toBeNull();
  });
});
