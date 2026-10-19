import { isDeepStrictEqual } from 'node:util';
import { applyAction, legalActions, type PlayerView, type SpecialCard } from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { isLegal, legalFor, roleKey, tablePlays, type TablePlays } from '../../src/model/plays.ts';
import { scenarioAt, seededSteps, viewAt, type ViewSpec } from '../fixtures.ts';

function setup(spec: ViewSpec) {
  const { state, view } = scenarioAt(spec);
  const legal = legalFor(view);
  return { state, view, legal, plays: tablePlays(view, legal) };
}

const labels = (plays: TablePlays, cardId: string): string[] => (plays.byCard.get(cardId) ?? []).map((p) => p.label);

/** A carta da mão que está na posição `index` entre as de `kind`. */
function handCard(view: PlayerView, kind: SpecialCard['kind'], index = 0): SpecialCard {
  return view.self.hand.filter((c) => c.kind === kind)[index]!;
}

describe('tablePlays: jogadas por carta', () => {
  it('J dá "Buff de ataque"; o Selvagem dá um papel por entrada', () => {
    const { view, plays } = setup({ self: { hand: ['J', 'WILD'] } });
    expect(labels(plays, handCard(view, 'J').id)).toEqual(['Buff de ataque']);
    expect(labels(plays, handCard(view, 'WILD').id)).toEqual(['como J: Buff de ataque', 'como Q: Buff de defesa']);
  });

  it('com alvo, o Selvagem também dá "como A: Armadilha" e o J, Sacrifício', () => {
    const { view, plays } = setup({ self: { hand: ['J', 'WILD'] }, opponent: { attackBuffs: ['J'], guard: ['K'] } });
    expect(labels(plays, handCard(view, 'J').id)).toEqual(['Buff de ataque', 'Sacrifício']);
    expect(labels(plays, handCard(view, 'WILD').id)).toEqual([
      'como J: Buff de ataque',
      'como Q: Buff de defesa',
      'como A: Armadilha',
      'como J: Sacrifício',
    ]);
  });

  it('Sacrifício de Q com Selvagem mira só as Q do oponente', () => {
    const { view, plays } = setup({ self: { hand: ['WILD'] }, opponent: { defenseBuffs: ['Q'] } });
    const sacrifice = plays.byCard.get(handCard(view, 'WILD').id)!.find((p) => p.key === 'SACRIFICE:Q')!;
    expect(sacrifice.label).toBe('como Q: Sacrifício');
    expect(sacrifice.targets).toEqual([
      { id: view.opponent.defenseBuffs[0]!.id, zone: 'defenseBuffs', label: expect.stringMatching(/^Q. \(Buff de defesa\)$/) },
    ]);
  });

  it('as jogadas sem alvo têm `targets` nulo; Armadilha lista J, Q e K do oponente', () => {
    const { view, plays } = setup({
      self: { hand: ['J', 'A'] },
      opponent: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: ['K'] },
    });
    const buff = plays.byCard.get(handCard(view, 'J').id)!.find((p) => p.key === 'PLAY_J')!;
    expect(buff.targets).toBeNull();
    const trap = plays.byCard.get(handCard(view, 'A').id)!.find((p) => p.key === 'TRAP')!;
    expect(trap.targets!.map((t) => t.zone)).toEqual(['attackBuffs', 'defenseBuffs', 'guard']);
    expect(trap.targets!.map((t) => t.id)).toEqual([
      view.opponent.attackBuffs[0]!.id,
      view.opponent.defenseBuffs[0]!.id,
      view.opponent.guard[0]!.id,
    ]);
  });

  it('Armadilha com 2 A: a segunda (não canônica) também é legal e o `make` usa a carta tocada', () => {
    const { state, view, legal, plays } = setup({ self: { hand: ['A', 'A'] }, opponent: { guard: ['K'] } });
    const [first, second] = [handCard(view, 'A', 0), handCard(view, 'A', 1)];
    const targetId = view.opponent.guard[0]!.id;
    expect(legal.some((a) => a.type === 'TRAP' && a.cardId === second!.id)).toBe(false);
    const trap = plays.byCard.get(second!.id)!.find((p) => p.key === 'TRAP')!;
    const action = trap.make(targetId);
    expect(action).toEqual({ type: 'TRAP', cardId: second!.id, targetId });
    expect(isLegal(action, legal, view)).toBe(true);
    expect(applyAction(state, view.me, action).ok).toBe(true);
    expect(plays.byCard.get(first!.id)!.find((p) => p.key === 'TRAP')!.make(targetId)).toMatchObject({ cardId: first!.id });
  });

  it('2 K na mão: "Pôr 1 K" e "Pôr 2 K", com o tocado primeiro', () => {
    const { state, view, plays } = setup({ self: { hand: ['K', 'K'] } });
    const [k1, k2] = [handCard(view, 'K', 0), handCard(view, 'K', 1)];
    expect(labels(plays, k2!.id)).toEqual(['Pôr 1 K', 'Pôr 2 K']);
    const made = plays.byCard.get(k2!.id)!.map((p) => p.make());
    expect(made).toEqual([
      { type: 'PLAY_K', cardIds: [k2!.id] },
      { type: 'PLAY_K', cardIds: [k2!.id, k1!.id] },
    ]);
    for (const action of made) expect(applyAction(state, view.me, action).ok).toBe(true);
  });

  it('um K só: "Pôr na Guarda"', () => {
    const { view, plays } = setup({ self: { hand: ['K'] } });
    expect(labels(plays, handCard(view, 'K').id)).toEqual(['Pôr na Guarda']);
  });

  it('o Selvagem nunca vai para a Guarda', () => {
    const { view, plays } = setup({ self: { hand: ['K', 'WILD'] } });
    for (const p of plays.byCard.get(handCard(view, 'WILD').id)!) expect(p.make().type).not.toBe('PLAY_K');
  });

  it('limite de J atingido: o J só aparece em Sacrifício', () => {
    const { view, plays } = setup({
      self: { hand: ['J'], attackBuffs: ['J', 'J', 'J', 'J'] },
      opponent: { attackBuffs: ['J'] },
    });
    expect(labels(plays, handCard(view, 'J').id)).toEqual(['Sacrifício']);
  });

  it('Defesa Absoluta do oponente: sem Armadilha nem Sacrifício', () => {
    const { view, plays } = setup({
      self: { hand: ['A', 'J'] },
      opponent: { attackBuffs: ['J'], absoluteDefense: true },
    });
    expect(plays.byCard.has(handCard(view, 'A').id)).toBe(false);
    expect(labels(plays, handCard(view, 'J').id)).toEqual(['Buff de ataque']);
  });

  it('o alvo inválido ou a falta dele recusa o `make`', () => {
    const { view, plays } = setup({ self: { hand: ['A'] }, opponent: { guard: ['K'] } });
    const trap = plays.byCard.get(handCard(view, 'A').id)![0]!;
    expect(() => trap.make()).toThrow(/alvo/);
    expect(() => trap.make('nao-existe')).toThrow(/alvo/);
  });
});

describe('tablePlays: combinações', () => {
  it('Reflect com J, Q, K e Selvagem na mão usa o J e a Q reais', () => {
    const { state, view, plays } = setup({ self: { hand: ['WILD', 'K', 'Q', 'J'] } });
    expect(plays.reflect).toEqual({
      type: 'REFLECT',
      kId: handCard(view, 'K').id,
      jId: handCard(view, 'J').id,
      qId: handCard(view, 'Q').id,
    });
    expect(applyAction(state, view.me, plays.reflect!).ok).toBe(true);
  });

  it('sem J real, o Reflect usa o Selvagem no lugar do J', () => {
    const { state, view, plays } = setup({ self: { hand: ['K', 'Q', 'WILD'] } });
    expect(plays.reflect).toEqual({
      type: 'REFLECT',
      kId: handCard(view, 'K').id,
      jId: handCard(view, 'WILD').id,
      qId: handCard(view, 'Q').id,
    });
    expect(applyAction(state, view.me, plays.reflect!).ok).toBe(true);
  });

  it('só K e dois Selvagens: o Reflect usa os dois, em ids distintos', () => {
    const { state, view, plays } = setup({ self: { hand: ['K', 'WILD', 'WILD'] } });
    const action = plays.reflect as Extract<PlayerAction, { type: 'REFLECT' }>;
    expect(action.jId).not.toBe(action.qId);
    expect(applyAction(state, view.me, action).ok).toBe(true);
  });

  it('sem K, ou com Reflect já ativo, não há Reflect', () => {
    expect(setup({ self: { hand: ['J', 'Q'] } }).plays.reflect).toBeNull();
    expect(setup({ self: { hand: ['K', 'J', 'Q'], reflect: true } }).plays.reflect).toBeNull();
  });

  it('Anular o Reflect (janela de reação) prefere cartas reais', () => {
    const { state, view, plays } = setup({
      phase: 'REFLECT_PLAYED',
      self: { hand: ['WILD', 'K', 'Q', 'J'] },
      opponent: { reflect: true },
    });
    expect(plays.cancelReflect).toMatchObject({
      type: 'CANCEL_REFLECT',
      jId: handCard(view, 'J').id,
      qId: handCard(view, 'Q').id,
    });
    expect(plays.reflect).toBeNull();
    expect(plays.pass).toBe(true);
    expect(applyAction(state, view.me, plays.cancelReflect!).ok).toBe(true);
  });

  it('Proteger-se do Reflect usa J, Q e K do próprio campo', () => {
    const { state, view, plays } = setup({
      phase: 'REFLECT_PLAYED',
      self: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: ['K'] },
      opponent: { reflect: true },
    });
    expect(plays.protect).toEqual({
      type: 'PROTECT_FROM_REFLECT',
      jId: view.self.attackBuffs[0]!.id,
      qId: view.self.defenseBuffs[0]!.id,
      kId: view.self.guard[0]!.id,
    });
    expect(applyAction(state, view.me, plays.protect!).ok).toBe(true);
  });

  it('proteger na fase principal, com o Reflect do oponente ativo', () => {
    const { plays } = setup({
      self: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: ['K'] },
      opponent: { reflect: true },
    });
    expect(plays.protect).not.toBeNull();
  });

  it('Ressurreição: um item por valor no cemitério, só com fileiras de vaga', () => {
    const { state, view, plays } = setup({
      self: { attackRow: [2, 3, 4, 5, 6, 7, 8], resurrections: [{ row: 'ATK', value: 5 }] },
      graveyard: [5, 5, 7, 9],
    });
    expect(plays.resurrect.map((r) => [r.value, r.rows])).toEqual([
      [5, ['DEF']],
      [7, ['DEF']],
      [9, ['DEF']],
    ]);
    for (const item of plays.resurrect) {
      expect(view.graveyard.find((c) => c.id === item.cardId)).toMatchObject({ kind: 'NUM', value: item.value });
    }
    expect(applyAction(state, view.me, { type: 'RESURRECT', cardId: plays.resurrect[0]!.cardId, row: 'DEF' }).ok).toBe(true);
  });

  it('Ressurreição com as duas fileiras com vaga oferece as duas', () => {
    const { plays } = setup({ self: { resurrections: [{ row: 'DEF', value: 4 }] }, graveyard: [3] });
    expect(plays.resurrect).toEqual([{ cardId: expect.any(String), value: 3, rows: ['ATK', 'DEF'] }]);
  });

  it('sem direito a Ressurreição, a lista fica vazia', () => {
    expect(setup({ graveyard: [3, 4] }).plays.resurrect).toEqual([]);
  });
});

describe('tablePlays: fim de turno e reação', () => {
  it('Ataque vazio: encerrar o turno', () => {
    const { plays } = setup({ self: { hand: ['J'] } });
    expect(plays.finish).toEqual({ type: 'END_TURN' });
    expect(plays.pass).toBe(false);
  });

  it('Ataque com cartas: declarar o ataque', () => {
    expect(setup({ self: { attackRow: [5] } }).plays.finish).toEqual({ type: 'DECLARE_ATTACK' });
  });

  it('janela de reação ao ataque: passar, e Armadilha com qualquer alvo', () => {
    const { state, view, plays } = setup({
      phase: 'ATTACK',
      self: { hand: ['A'] },
      opponent: { attackBuffs: ['J'], guard: ['K'] },
    });
    expect(plays.pass).toBe(true);
    expect(plays.finish).toBeNull();
    const trap = plays.byCard.get(handCard(view, 'A').id)![0]!;
    expect(trap.targets!.map((t) => t.zone)).toEqual(['attackBuffs', 'guard']);
    expect(applyAction(state, view.me, trap.make(trap.targets![0]!.id)).ok).toBe(true);
  });

  it('reação a uma jogada de K: a Armadilha mira só a Guarda', () => {
    const { view, plays } = setup({
      phase: 'K_PLAYED',
      self: { hand: ['A', 'J'] },
      opponent: { attackBuffs: ['J'], guard: ['K'] },
    });
    const trap = plays.byCard.get(handCard(view, 'A').id)![0]!;
    expect(trap.targets!.map((t) => t.zone)).toEqual(['guard']);
    expect(plays.byCard.has(handCard(view, 'J').id)).toBe(false);
  });

  it('fora da vez, nada é jogável', () => {
    const { plays } = setup({ phase: 'WAITING', self: { hand: ['J', 'K', 'A', 'WILD'] } });
    expect(plays.byCard.size).toBe(0);
    expect(plays.reflect).toBeNull();
    expect(plays.cancelReflect).toBeNull();
    expect(plays.protect).toBeNull();
    expect(plays.resurrect).toEqual([]);
    expect(plays.finish).toBeNull();
    expect(plays.pass).toBe(false);
  });

  it('no Equipar ou na escolha da ordem, a mesa não tem jogadas por carta', () => {
    const { view } = scenarioAt({ phase: { kind: 'ORDER_CHOICE', player: 'p1' }, self: { hand: ['J'] } });
    const plays = tablePlays(view, legalFor(view));
    expect(plays.byCard.size).toBe(0);
    expect(plays.finish).toBeNull();
  });
});

describe('roleKey e isLegal', () => {
  const spec: ViewSpec = {
    self: { hand: ['A', 'A', 'K', 'WILD'], resurrections: [{ row: 'ATK', value: 5 }] },
    opponent: { guard: ['K'] },
    graveyard: [5, 6],
  };

  it('troca o id da mão pelo tipo e o do cemitério por NUM:<valor>', () => {
    const view = viewAt(spec);
    const a2 = handCard(view, 'A', 1);
    const wild = handCard(view, 'WILD');
    const target = view.opponent.guard[0]!.id;
    expect(roleKey({ type: 'TRAP', cardId: a2.id, targetId: target }, view)).toBe(
      roleKey({ type: 'TRAP', cardId: handCard(view, 'A', 0).id, targetId: target }, view),
    );
    expect(roleKey({ type: 'TRAP', cardId: a2.id, targetId: target }, view)).not.toBe(
      roleKey({ type: 'TRAP', cardId: wild.id, targetId: target }, view),
    );
    expect(roleKey({ type: 'TRAP', cardId: a2.id, targetId: target }, view)).toContain(target);
    expect(roleKey({ type: 'TRAP', cardId: a2.id, targetId: target }, view)).not.toContain(a2.id);
    const five = view.graveyard[0]!.id;
    expect(roleKey({ type: 'RESURRECT', cardId: five, row: 'ATK' }, view)).toContain('NUM:5');
    expect(roleKey({ type: 'RESURRECT', cardId: five, row: 'ATK' }, view)).not.toContain(five);
  });

  it('a ordem dos campos do objeto não muda a chave', () => {
    const view = viewAt({ self: { attackBuffs: ['J'], defenseBuffs: ['Q'], guard: ['K'] }, opponent: { reflect: true } });
    const [j, q, k] = [view.self.attackBuffs[0]!.id, view.self.defenseBuffs[0]!.id, view.self.guard[0]!.id];
    expect(roleKey({ type: 'PROTECT_FROM_REFLECT', kId: k, qId: q, jId: j }, view)).toBe(
      roleKey({ type: 'PROTECT_FROM_REFLECT', jId: j, qId: q, kId: k }, view),
    );
  });

  it('distingue o papel do Selvagem pela posição no Reflect', () => {
    const view = viewAt({ self: { hand: ['K', 'J', 'Q', 'WILD'] } });
    const [k, j, q, w] = [handCard(view, 'K').id, handCard(view, 'J').id, handCard(view, 'Q').id, handCard(view, 'WILD').id];
    expect(roleKey({ type: 'REFLECT', kId: k, jId: w, qId: q }, view)).not.toBe(
      roleKey({ type: 'REFLECT', kId: k, jId: j, qId: w }, view),
    );
    expect(roleKey({ type: 'REFLECT', kId: k, jId: j, qId: q }, view)).toBe(
      roleKey({ type: 'REFLECT', kId: k, jId: j, qId: q }, view),
    );
  });

  it('as ações sem carta têm chave própria', () => {
    const view = viewAt({});
    const keys = [
      roleKey({ type: 'END_TURN' }, view),
      roleKey({ type: 'DECLARE_ATTACK' }, view),
      roleKey({ type: 'PASS' }, view),
      roleKey({ type: 'CHOOSE_ORDER', first: true }, view),
      roleKey({ type: 'CHOOSE_ORDER', first: false }, view),
      roleKey({ type: 'EQUIP', destinations: ['ATK', 'DEF'] }, view),
      roleKey({ type: 'EQUIP', destinations: ['DEF', 'ATK'] }, view),
    ];
    expect(new Set(keys).size).toBe(keys.length);
  });

  it('recusa carta fora da mão, papel errado e ids repetidos', () => {
    const view = viewAt({ self: { hand: ['J', 'Q', 'K', 'K', 'WILD', 'WILD'] }, opponent: { guard: ['K'] } });
    const legal = legalFor(view);
    const [j, q] = [handCard(view, 'J').id, handCard(view, 'Q').id];
    expect(isLegal({ type: 'PLAY_J', cardId: j }, legal, view)).toBe(true);
    expect(isLegal({ type: 'PLAY_J', cardId: 'nao-esta-na-mao' }, legal, view)).toBe(false);
    expect(isLegal({ type: 'PLAY_J', cardId: q }, legal, view)).toBe(false);
    expect(isLegal({ type: 'PLAY_K', cardIds: [handCard(view, 'K', 1).id] }, legal, view)).toBe(true);
    const k1 = handCard(view, 'K', 0).id;
    expect(isLegal({ type: 'PLAY_K', cardIds: [k1, k1] }, legal, view)).toBe(false);
    const [w1, w2] = [handCard(view, 'WILD', 0).id, handCard(view, 'WILD', 1).id];
    expect(isLegal({ type: 'REFLECT', kId: k1, jId: w1, qId: w2 }, legal, view)).toBe(true);
    expect(isLegal({ type: 'REFLECT', kId: k1, jId: w1, qId: w1 }, legal, view)).toBe(false);
    expect(isLegal({ type: 'REFLECT', kId: w1, jId: j, qId: q }, legal, view)).toBe(false);
  });
});

describe('propriedade: toda jogada montada pela mesa é aceita pelo motor', () => {
  /** Todas as ações que a mesa pode montar: cada `make` com cada alvo, as combinações, o fim de turno e o passe. */
  function every(plays: TablePlays): PlayerAction[] {
    const actions: PlayerAction[] = [];
    for (const list of plays.byCard.values()) {
      for (const play of list) {
        if (play.targets === null) actions.push(play.make());
        else for (const target of play.targets) actions.push(play.make(target.id));
      }
    }
    for (const combo of [plays.reflect, plays.cancelReflect, plays.protect, plays.finish]) if (combo) actions.push(combo);
    for (const r of plays.resurrect) for (const row of r.rows) actions.push({ type: 'RESURRECT', cardId: r.cardId, row });
    if (plays.pass) actions.push({ type: 'PASS' });
    return actions;
  }

  const runs: Array<[string, ReturnType<typeof seededSteps>]> = [
    ...Array.from({ length: 10 }, (_, i): [string, ReturnType<typeof seededSteps>] => [
      `greedy plays-${i}`,
      seededSteps(`plays-${i}`, 400),
    ]),
    ...Array.from({ length: 10 }, (_, i): [string, ReturnType<typeof seededSteps>] => [
      `random plays-random-${i}`,
      seededSteps(`plays-random-${i}`, 400, ['random', 'random']),
    ]),
  ];

  it.each(runs)('%s', (_name, steps) => {
    expect(steps.length).toBeGreaterThan(0);
    for (const item of steps) {
      const legal = legalFor(item.view);
      const plays = tablePlays(item.view, legal);
      const actions = every(plays);
      for (const action of actions) {
        const result = applyAction(item.state, item.actor, action);
        expect(result.ok, `${JSON.stringify(action)}: ${result.ok ? '' : result.error.message}`).toBe(true);
        expect(isLegal(action, legal, item.view)).toBe(true);
      }
      // Nada que o motor oferece se perde: cada jogada canônica tem equivalente pelo papel. As
      // combinações de várias cartas são a exceção: a mesa mostra uma só (a de menos Selvagens).
      const keys = new Set(actions.map((a) => roleKey(a, item.view)));
      for (const canonical of legal) {
        if (canonical.type === 'EQUIP' || canonical.type === 'CHOOSE_ORDER') continue;
        if (canonical.type === 'REFLECT' || canonical.type === 'CANCEL_REFLECT' || canonical.type === 'PROTECT_FROM_REFLECT') {
          const offered = { REFLECT: 'reflect', CANCEL_REFLECT: 'cancelReflect', PROTECT_FROM_REFLECT: 'protect' } as const;
          expect(plays[offered[canonical.type]], JSON.stringify(canonical)).not.toBeNull();
          continue;
        }
        expect(keys.has(roleKey(canonical, item.view)), JSON.stringify(canonical)).toBe(true);
      }
    }
  });

  it('não é vazia: as 20 partidas geram jogadas de verdade, inclusive de cartas não canônicas', () => {
    let total = 0;
    let nonCanonical = 0;
    const types = new Set<string>();
    for (const [, steps] of runs) {
      for (const item of steps) {
        const legal = legalActions(item.view);
        for (const action of every(tablePlays(item.view, legalFor(item.view)))) {
          total += 1;
          types.add(action.type);
          if (!legal.some((l) => isDeepStrictEqual(l, action))) nonCanonical += 1;
        }
      }
    }
    expect(total).toBeGreaterThan(1500);
    expect(nonCanonical).toBeGreaterThan(50);
    for (const type of ['PLAY_J', 'PLAY_Q', 'PLAY_K', 'TRAP', 'SACRIFICE', 'DECLARE_ATTACK', 'END_TURN', 'PASS', 'REFLECT', 'RESURRECT']) {
      expect(types.has(type), type).toBe(true);
    }
  });
});
