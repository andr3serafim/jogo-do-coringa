import { applyAction, viewFor, type GameEvent, type NumCard, type SpecialCard } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import {
  bannerBeatAt,
  bannerText,
  damageBeatIndex,
  dealsOf,
  delaysOf,
  effectsOf,
  INITIATIVE_ID,
  NO_EFFECTS,
  rowKey,
  sceneText,
} from '../../src/model/effects.ts';
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

  it('a marca da iniciativa espera a batida em que ela troca de lado', () => {
    const delays = delaysOf(beatsOf({ type: 'TurnStarted', player: 'p1' }, { type: 'InitiativeDecided', player: 'p2', changed: true, damage: { p1: 3, p2: 9 } }));
    expect(delays.get(INITIATIVE_ID)).toBe(400);
  });

  it('a decisão que não muda a iniciativa de mão não mexe na marca', () => {
    const kept = { type: 'InitiativeDecided', player: 'p2', changed: false, damage: { p1: 0, p2: 0 } } as const;
    expect(delaysOf(beatsOf({ type: 'TurnStarted', player: 'p1' }, kept)).has(INITIATIVE_ID)).toBe(false);
  });

  it('sem batidas, nada espera', () => {
    expect(delaysOf([]).size).toBe(0);
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

  it('dano zero não sobe número nenhum (o ataque foi barrado)', () => {
    const effects = fx({ type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 10, defense: 30, damage: 0 });
    expect(effects.damage).toBeNull();
    expect(effects.rows.size).toBe(2);
  });

  it('ReflectTriggered põe o dano no atacante', () => {
    expect(fx({ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 12 }).damage).toEqual({
      target: 'p1',
      amount: 12,
    });
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
