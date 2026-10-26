import { applyAction, viewFor, type Destination, type NumCard, type PlayerView, type Rank, type SpecialCard } from '@coringa/engine';
import { describe, expect, it } from 'vitest';
import { cardDropKey, DROP, equipDropZones, playDropZones, resolvePlayDrop, ROW_DROP, type DropKey } from '../../src/model/drag.ts';
import { nextDestinations } from '../../src/model/equip.ts';
import { legalFor, tablePlays } from '../../src/model/plays.ts';
import { scenarioAt, type ViewSpec } from '../fixtures.ts';

function setup(spec: ViewSpec) {
  const { state, view } = scenarioAt(spec);
  return { state, view, plays: tablePlays(view, legalFor(view)) };
}

/** A carta da mão que está na posição `index` entre as de `kind`. */
function handCard(view: PlayerView, kind: SpecialCard['kind'], index = 0): SpecialCard {
  return view.self.hand.filter((c) => c.kind === kind)[index]!;
}

/** As zonas de uma carta, com as chaves das jogadas de cada uma (`PLAY_J`, `TRAP`, …). */
function zonesOf(view: PlayerView, plays: ReturnType<typeof tablePlays>, kind: SpecialCard['kind'], index = 0) {
  const zones = playDropZones(handCard(view, kind, index).id, plays);
  return new Map([...zones].map(([key, drops]): [DropKey, string[]] => [key, drops.map((d) => d.play.key)]));
}

describe('playDropZones: a zona de cada jogada da carta', () => {
  it('J vai ao buff de ataque; Q, ao de defesa; K, à guarda', () => {
    const { view, plays } = setup({ self: { hand: ['J', 'Q', 'K'] } });
    expect(zonesOf(view, plays, 'J')).toEqual(new Map([['buffs:ATK', ['PLAY_J']]]));
    expect(zonesOf(view, plays, 'Q')).toEqual(new Map([['buffs:DEF', ['PLAY_Q']]]));
    expect(zonesOf(view, plays, 'K')).toEqual(new Map([['guarda', ['PLAY_K:1']]]));
  });

  it('com dois K na mão, as duas jogadas caem na mesma zona (a escolha decide)', () => {
    const { view, plays } = setup({ self: { hand: ['K', 'K'] } });
    expect(zonesOf(view, plays, 'K', 1)).toEqual(new Map([['guarda', ['PLAY_K:1', 'PLAY_K:2']]]));
  });

  it('o A vai a cada alvo do oponente: uma zona `carta:<id>` por carta', () => {
    const { view, plays } = setup({
      self: { hand: ['A'] },
      opponent: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: ['K'] },
    });
    const [j, q, k] = [view.opponent.attackBuffs[0]!.id, view.opponent.defenseBuffs[0]!.id, view.opponent.guard[0]!.id];
    expect(zonesOf(view, plays, 'A')).toEqual(
      new Map([
        [`carta:${j}`, ['TRAP']],
        [`carta:${q}`, ['TRAP']],
        [`carta:${k}`, ['TRAP']],
      ]),
    );
  });

  it('cada jogada com alvo guarda o id do alvo da zona; as sem alvo, não', () => {
    const { view, plays } = setup({ self: { hand: ['A', 'J'] }, opponent: { guard: ['K'] } });
    const kingId = view.opponent.guard[0]!.id;
    const trap = playDropZones(handCard(view, 'A').id, plays).get(`carta:${kingId}`)!;
    expect(trap).toHaveLength(1);
    expect(trap[0]!.targetId).toBe(kingId);
    const buff = playDropZones(handCard(view, 'J').id, plays).get('buffs:ATK')!;
    expect(buff).toHaveLength(1);
    expect(buff[0]!.targetId).toBeUndefined();
  });

  it('o Selvagem vai a buffs:ATK (como J), buffs:DEF (como Q) e aos alvos (Armadilha e Sacrifício)', () => {
    const { view, plays } = setup({ self: { hand: ['WILD'] }, opponent: { attackBuffs: ['J'], defenseBuffs: ['Q'] } });
    const [j, q] = [view.opponent.attackBuffs[0]!.id, view.opponent.defenseBuffs[0]!.id];
    expect(zonesOf(view, plays, 'WILD')).toEqual(
      new Map([
        ['buffs:ATK', ['PLAY_J']],
        ['buffs:DEF', ['PLAY_Q']],
        [`carta:${j}`, ['TRAP', 'SACRIFICE:J']],
        [`carta:${q}`, ['TRAP', 'SACRIFICE:Q']],
      ]),
    );
  });

  it('o Selvagem nunca tem a zona da guarda', () => {
    const { view, plays } = setup({ self: { hand: ['K', 'WILD'] } });
    expect([...zonesOf(view, plays, 'WILD').keys()]).toEqual(['buffs:ATK', 'buffs:DEF']);
  });

  it('o J sobre um J do oponente: buff no próprio campo e Sacrifício no alvo', () => {
    const { view, plays } = setup({ self: { hand: ['J'] }, opponent: { attackBuffs: ['J'] } });
    const j = view.opponent.attackBuffs[0]!.id;
    expect(zonesOf(view, plays, 'J')).toEqual(
      new Map([
        ['buffs:ATK', ['PLAY_J']],
        [`carta:${j}`, ['SACRIFICE:J']],
      ]),
    );
  });

  it('carta sem jogada, ou que não é da mão: mapa vazio', () => {
    const { view, plays } = setup({ self: { hand: ['A'] } });
    expect(playDropZones(handCard(view, 'A').id, plays).size).toBe(0);
    expect(playDropZones('nao-esta-na-mao', plays).size).toBe(0);
    const waiting = setup({ phase: 'WAITING', self: { hand: ['J', 'K', 'WILD'] } });
    expect(playDropZones(handCard(waiting.view, 'J').id, waiting.plays).size).toBe(0);
  });
});

describe('resolvePlayDrop: soltar manda a jogada ou abre a escolha', () => {
  it('uma jogada só manda, com o `make` da carta tocada (e o alvo da zona)', () => {
    const { state, view, plays } = setup({ self: { hand: ['J', 'A'] }, opponent: { guard: ['K'] } });
    const j = handCard(view, 'J');
    const buff = resolvePlayDrop(playDropZones(j.id, plays).get('buffs:ATK'));
    expect(buff).toEqual({ kind: 'send', action: { type: 'PLAY_J', cardId: j.id } });

    const [a, kingId] = [handCard(view, 'A'), view.opponent.guard[0]!.id];
    const trap = resolvePlayDrop(playDropZones(a.id, plays).get(`carta:${kingId}`));
    expect(trap).toEqual({ kind: 'send', action: { type: 'TRAP', cardId: a.id, targetId: kingId } });
    for (const result of [buff, trap]) {
      expect(result?.kind === 'send' && applyAction(state, view.me, result.action).ok).toBe(true);
    }
  });

  it('um K só na mão manda "Pôr na Guarda"; dois K abrem a escolha', () => {
    const one = setup({ self: { hand: ['K'] } });
    const k = handCard(one.view, 'K');
    expect(resolvePlayDrop(playDropZones(k.id, one.plays).get('guarda'))).toEqual({
      kind: 'send',
      action: { type: 'PLAY_K', cardIds: [k.id] },
    });
    const two = setup({ self: { hand: ['K', 'K'] } });
    expect(resolvePlayDrop(playDropZones(handCard(two.view, 'K', 1).id, two.plays).get('guarda'))).toEqual({ kind: 'choose' });
  });

  it('o Selvagem sobre um J do oponente que é alvo de Armadilha e de Sacrifício: escolha', () => {
    const { view, plays } = setup({ self: { hand: ['WILD'] }, opponent: { attackBuffs: ['J'] } });
    const zones = playDropZones(handCard(view, 'WILD').id, plays);
    expect(resolvePlayDrop(zones.get(`carta:${view.opponent.attackBuffs[0]!.id}`))).toEqual({ kind: 'choose' });
    // As zonas do próprio campo têm uma jogada cada: mandam direto.
    expect(resolvePlayDrop(zones.get('buffs:ATK'))).toMatchObject({ kind: 'send', action: { type: 'PLAY_J' } });
    expect(resolvePlayDrop(zones.get('buffs:DEF'))).toMatchObject({ kind: 'send', action: { type: 'PLAY_Q' } });
  });

  it('sem zona (ou zona sem jogadas), não há o que fazer', () => {
    expect(resolvePlayDrop(undefined)).toBeNull();
    expect(resolvePlayDrop([])).toBeNull();
  });
});

describe('equipDropZones: onde cada destino do Equipar cai', () => {
  /** Fase de Equipar de `p1`, com as fileiras e as numéricas pendentes (em ordem de compra) dadas. */
  function equipView(options: { attackRow?: Rank[]; defenseRow?: Rank[]; pending: Rank[] }): PlayerView {
    const { state } = scenarioAt({
      phase: { kind: 'EQUIP' },
      self: { attackRow: options.attackRow, defenseRow: options.defenseRow },
    });
    const me = state.players.find((p) => p.id === 'p1')!;
    me.equipSubmitted = false;
    me.pending = options.pending.map((value, i): NumCard => ({ id: `pend-${i}`, kind: 'NUM', value, suit: 'copas' }));
    return viewFor(state, 'p1');
  }
  const zones = (view: PlayerView, chosen: Destination[] = []) => equipDropZones(view, legalFor(view), chosen);
  const FULL: Rank[] = [2, 3, 4, 5, 6, 7, 8];

  it('com vaga nas duas fileiras: fileira:ATK e fileira:DEF', () => {
    const view = equipView({ attackRow: [2], defenseRow: [3], pending: [5, 6] });
    expect(zones(view)).toEqual(
      new Map([
        ['fileira:ATK', 'ATK'],
        ['fileira:DEF', 'DEF'],
      ]),
    );
  });

  it('só com vaga no Ataque: a Defesa cheia não é zona', () => {
    const view = equipView({ attackRow: [2, 3, 4, 5, 6, 7], defenseRow: FULL, pending: [8, 9] });
    expect(zones(view)).toEqual(new Map([['fileira:ATK', 'ATK']]));
  });

  it('com as duas fileiras cheias: trocar a última de cada uma ou descartar no cemitério', () => {
    const view = equipView({ attackRow: FULL, defenseRow: FULL, pending: [8, 9] });
    expect(zones(view)).toEqual(
      new Map([
        ['ultima:ATK', 'REPLACE_LAST_ATK'],
        ['ultima:DEF', 'REPLACE_LAST_DEF'],
        ['cemiterio', 'DISCARD'],
      ]),
    );
  });

  it('a segunda carta segue o que a primeira escolheu', () => {
    const view = equipView({ attackRow: [2, 3, 4, 5, 6, 7], defenseRow: FULL, pending: [8, 9] });
    expect(zones(view, ['ATK'])).toEqual(
      new Map([
        ['ultima:ATK', 'REPLACE_LAST_ATK'],
        ['ultima:DEF', 'REPLACE_LAST_DEF'],
        ['cemiterio', 'DISCARD'],
      ]),
    );
  });

  it('sai de `nextDestinations`: um destino por zona, na mesma ordem', () => {
    const view = equipView({ attackRow: FULL, defenseRow: FULL, pending: [8, 9] });
    expect([...zones(view).values()]).toEqual(nextDestinations(view, legalFor(view), []));
  });

  it('sem carta restante, ou sem a vez de montar: nenhuma zona', () => {
    const view = equipView({ attackRow: [2], defenseRow: [3], pending: [5] });
    expect(zones(view, ['ATK']).size).toBe(0);
    expect(equipDropZones(view, [], []).size).toBe(0);
  });
});

describe('as chaves das zonas (o que a mesa põe em data-soltar)', () => {
  it('as fixas são as da spec, uma para cada zona', () => {
    expect(Object.values(DROP).sort()).toEqual(
      ['buffs:ATK', 'buffs:DEF', 'cemiterio', 'fileira:ATK', 'fileira:DEF', 'guarda', 'ultima:ATK', 'ultima:DEF'].sort(),
    );
    expect(new Set(Object.values(DROP)).size).toBe(Object.values(DROP).length);
  });

  it('a de uma carta do oponente é carta:<id>', () => {
    expect(cardDropKey('x-p2-J-3')).toBe('carta:x-p2-J-3');
  });

  it('cada fileira tem a zona dela inteira e a da última carta', () => {
    expect(ROW_DROP).toEqual({
      ATK: { row: 'fileira:ATK', last: 'ultima:ATK' },
      DEF: { row: 'fileira:DEF', last: 'ultima:DEF' },
    });
  });

  it('o que playDropZones devolve para as cartas da mão só usa essas chaves', () => {
    const { view, plays } = setup({
      self: { hand: ['J', 'Q', 'K', 'K', 'A', 'WILD'] },
      opponent: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: ['K'] },
    });
    const known = new Set<string>(Object.values(DROP));
    const targets = [...view.opponent.attackBuffs, ...view.opponent.defenseBuffs, ...view.opponent.guard].map((c) => cardDropKey(c.id));
    const keys = new Set<DropKey>(view.self.hand.flatMap((card) => [...playDropZones(card.id, plays).keys()]));
    expect(keys.size).toBeGreaterThan(0);
    for (const key of keys) expect(known.has(key) || targets.includes(key)).toBe(true);
  });
});
