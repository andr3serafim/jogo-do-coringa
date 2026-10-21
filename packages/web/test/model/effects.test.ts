import type { GameEvent, NumCard, SpecialCard } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import {
  bannerText,
  damageBeatIndex,
  dealsOf,
  delaysOf,
  effectsOf,
  INITIATIVE_ID,
  NO_EFFECTS,
  pressureBeatIndex,
  rowKey,
  sceneText,
} from '../../src/model/effects.ts';
import { roomNames } from '../../src/model/history.ts';
import { buildTimeline, type Beat } from '../../src/model/timeline.ts';
import { scenarioAt } from '../fixtures.ts';

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
        { type: 'ReflectPlayed', player: 'p1', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') } },
      ),
    );
    expect(delays.get('k1')).toBe(400);
  });

  it('a marca da iniciativa espera a batida em que ela troca de lado', () => {
    const delays = delaysOf(beatsOf({ type: 'TurnStarted', player: 'p1' }, { type: 'InitiativeChanged', player: 'p2' }));
    expect(delays.get(INITIATIVE_ID)).toBe(400);
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

describe('pressureBeatIndex: onde o número da pressão muda', () => {
  it('é a batida do PressureChanged, ou -1', () => {
    expect(pressureBeatIndex(beatsOf({ type: 'TurnStarted', player: 'p1' }, { type: 'PressureChanged', pressure: 2 }))).toBe(1);
    expect(pressureBeatIndex(beatsOf({ type: 'TurnStarted', player: 'p1' }))).toBe(-1);
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

  it('o escudo do Reflect do dono quebra ao ser anulado, protegido ou expirar', () => {
    expect(fx({ type: 'ReflectCanceled', player: 'p1', owner: 'p2' }).shieldBreak).toBe('p2');
    expect(fx({ type: 'ReflectProtected', player: 'p2', owner: 'p1' }).shieldBreak).toBe('p1');
    expect(fx({ type: 'ReflectExpired', owner: 'p2' }).shieldBreak).toBe('p2');
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
      { type: 'PressureChanged', pressure: 2 },
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

  it('janela de reação, pressão, iniciativa e quadra', () => {
    expect(bannerText({ type: 'ReactionWindowOpened', responder: 'p1', trigger: 'ATTACK' }, names)).toBe(
      'Você pode reagir',
    );
    expect(bannerText({ type: 'ReactionWindowOpened', responder: 'p2', trigger: 'K_PLAYED' }, names)).toBe(
      'Duda pode reagir',
    );
    expect(bannerText({ type: 'PressureChanged', pressure: 2 }, names)).toBe('Pressão da mesa: +2');
    expect(bannerText({ type: 'InitiativeChanged', player: 'p2' }, names)).toBe('Duda ficou com a iniciativa');
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
      bannerText({ type: 'ReflectPlayed', player: 'p1', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') } }, names),
    ).toBe('Você lançou um Reflect!');
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
        beat({ type: 'ReflectPlayed', player: 'p1', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') } }),
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
        beat({ type: 'ReflectPlayed', player: 'p2', reflect: { k: face('k1'), j: face('j1', 'J'), q: face('q1', 'Q') } }),
        names,
      ).detail,
    ).toBe('Duda armou o escudo');
    expect(sceneText(beat({ type: 'AbsoluteAttack', player: 'p2' }), names).detail).toBe('Duda');
    expect(sceneText(beat({ type: 'Exodia', player: 'p2' }), names).detail).toBe('Duda reuniu os quatro K');
    expect(sceneText(beat({ type: 'ReflectTriggered', owner: 'p2', attacker: 'p1', damage: 5 }), names).detail).toBe(
      'O ataque voltou: 5 de dano em você',
    );
  });

  it('sem cena, devolve um texto vazio', () => {
    expect(sceneText(beat({ type: 'TurnStarted', player: 'p1' }), names)).toEqual({ title: '', detail: '' });
  });
});
