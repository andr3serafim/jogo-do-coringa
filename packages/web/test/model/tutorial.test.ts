// As dicas do tutorial (plano da fatia 4, tarefa 2). Estados de verdade: o builder do motor (`setup`) e a partida da semente do
// tutorial; os eventos saem do `applyAction`, redigidos para quem vê (`viewEvents`), como chegam na mensagem `state`.
import {
  applyAction,
  createGame,
  DEFAULT_CONFIG,
  legalActions,
  viewEvents,
  viewFor,
  type Action,
  type GameEvent,
  type GameState,
  type PlayerId,
} from '@coringa/engine';
import { act, P1, P2, setup, type Setup } from '@coringa/engine/testing';
import { TUTORIAL_SEED } from '@coringa/sim/tutorial';
import { describe, expect, it } from 'vitest';
import {
  acknowledgeHint,
  advanceHint,
  hintHolding,
  NO_HINT,
  tutorialHint,
  type Hint,
  type HintFlow,
  type HintId,
} from '../../src/model/tutorial.ts';

const ALL: readonly HintId[] = [
  'equip',
  'quad',
  'order',
  'firstAttack',
  'buffs',
  'steal',
  'trap',
  'wild',
  'devastation',
  'reflect',
  'limit',
  'end',
];

/** A dica de P1 (ou de `me`) para o estado, com os eventos da última jogada e as já vistas. */
function hintFor(
  state: GameState,
  { events = [], seen = [], me = P1 }: { events?: GameEvent[]; seen?: readonly HintId[]; me?: PlayerId } = {},
): Hint | null {
  return tutorialHint(viewFor(state, me), viewEvents(events, me), new Set(seen));
}

/** As dicas na ordem em que aparecem num mesmo estado, marcando cada uma como vista ("Entendi"), até não sobrar nenhuma. */
function drain(state: GameState, events: GameEvent[] = []): Hint[] {
  const seen = new Set<HintId>();
  const shown: Hint[] = [];
  // Limitado ao total de dicas: uma dica que voltasse depois de vista reprova o teste em vez de travar.
  for (let i = 0; i <= ALL.length; i += 1) {
    const hint = tutorialHint(viewFor(state, P1), viewEvents(events, P1), seen);
    if (hint === null) break;
    shown.push(hint);
    seen.add(hint.id);
  }
  return shown;
}

/** Vez do oponente, nada de especial na mesa: nenhuma dica vale. */
const quiet = (extra: Setup = {}): GameState =>
  setup({ phase: { kind: 'ATTACK_MAIN', player: P2 }, p1: { attack: [5, 6] }, p2: { attack: [7] }, ...extra });

const equipRound = (extra: Setup = {}): GameState =>
  setup({ roundKind: 'EQUIP', round: 2, phase: { kind: 'EQUIP' }, ...extra });

describe('tutorialHint: cada dica na sua situação', () => {
  it('uma mesa quieta (vez do oponente, sem nada de novo) não tem dica', () => {
    expect(hintFor(quiet())).toBeNull();
  });

  it('equip: no Equipar, com numéricas pendentes e sem ter confirmado', () => {
    expect(hintFor(equipRound({ p1: { pending: [4, 5, 6] } }))).toEqual({ id: 'equip', zone: 'equip' });
  });

  it('equip: não depois de confirmar, nem sem numéricas pendentes, nem fora do Equipar', () => {
    const state = equipRound({ p1: { pending: [4, 5, 6] }, p2: { pending: [7] } });
    const confirmed = act(state, P1, { type: 'EQUIP', destinations: ['ATK', 'ATK', 'DEF'] }).state;
    expect(hintFor(confirmed)).toBeNull();
    expect(hintFor(equipRound({ p1: { pending: [] } }))).toBeNull();
    expect(hintFor(setup({ p1: { pending: [4] } }))?.id).not.toBe('equip');
  });

  it('quad: uma quadra no seu campo', () => {
    expect(hintFor(quiet({ p1: { attack: [5, 5, 5, 5] } }))).toEqual({ id: 'quad', zone: 'rows' });
  });

  it('quad: o QuadFormed do oponente, nos eventos, também vale; a quadra dele no campo, sem o evento, não', () => {
    const state = equipRound({ p1: { equipSubmitted: true }, p2: { pending: [5], attack: [5, 5, 5] } });
    const { state: next, events } = act(state, P2, { type: 'EQUIP', destinations: ['ATK'] });
    expect(events.some((e) => e.type === 'QuadFormed' && e.player === P2)).toBe(true);
    expect(hintFor(next, { events })).toEqual({ id: 'quad', zone: 'rows' });
    // O mesmo estado sem os eventos (a quadra do oponente não está no seu campo): só a escolha da ordem.
    expect(hintFor(next)?.id).toBe('order');
  });

  it('order: a escolha da ordem é sua', () => {
    const state = setup({ phase: { kind: 'ORDER_CHOICE', player: P1 } });
    expect(hintFor(state)).toEqual({ id: 'order', zone: 'order' });
    expect(hintFor(setup({ phase: { kind: 'ORDER_CHOICE', player: P2 } }))).toBeNull();
  });

  it('firstAttack: sua vez, com cartas no Ataque (DECLARE_ATTACK legal)', () => {
    expect(hintFor(setup({ p1: { attack: [5] } }))).toEqual({ id: 'firstAttack', zone: 'actionBar' });
  });

  it('firstAttack: não com o Ataque vazio (só dá para passar a vez), nem na vez do oponente', () => {
    expect(hintFor(setup({ p1: { attack: [] } }))).toBeNull();
    expect(hintFor(quiet())).toBeNull();
  });

  it('buffs: sua vez, com J, Q ou K jogável', () => {
    for (const card of ['J', 'Q', 'K'] as const) {
      expect(hintFor(setup({ p1: { hand: [card] } }))).toEqual({ id: 'buffs', zone: 'hand' });
    }
  });

  it('buffs: só pelo que as ações legais deixam jogar (limite de J atingido, vez do oponente, só A na mão)', () => {
    const jLimit = setup({ config: { buffLimit: 1 }, p1: { hand: ['J'], attackBuffs: ['J'] } });
    expect(hintFor(jLimit)).toBeNull();
    expect(hintFor(quiet({ p1: { attack: [5], hand: ['J', 'Q', 'K'] } }))).toBeNull();
    expect(hintFor(setup({ p1: { hand: ['A'] } }))).toBeNull();
  });

  it('trap: janela de reação com um A que pode destruir algo do oponente', () => {
    const state = setup({
      phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' },
      p1: { hand: ['A'] },
      p2: { attack: [5], attackBuffs: ['J'] },
    });
    expect(hintFor(state)).toEqual({ id: 'trap', zone: 'reaction' });
    const guardOnly = setup({
      phase: { kind: 'REACTION', responder: P1, trigger: 'K_PLAYED' },
      p1: { hand: ['A'] },
      p2: { guard: 1 },
    });
    expect(hintFor(guardOnly)?.id).toBe('trap');
  });

  it('trap: não sem A, sem alvo, contra Defesa Absoluta, nem no Reflect do oponente', () => {
    const reaction = { kind: 'REACTION', responder: P1, trigger: 'ATTACK' } as const;
    expect(hintFor(setup({ phase: reaction, p2: { attackBuffs: ['J'] } }))).toBeNull();
    expect(hintFor(setup({ phase: reaction, p1: { hand: ['A'] } }))).toBeNull();
    expect(hintFor(setup({ phase: reaction, p1: { hand: ['A'] }, p2: { attackBuffs: ['J'], absoluteDefense: true } }))).toBeNull();
    const reflectPlayed = { kind: 'REACTION', responder: P1, trigger: 'REFLECT_PLAYED' } as const;
    expect(hintFor(setup({ phase: reflectPlayed, p1: { hand: ['A'] }, p2: { attackBuffs: ['J'] } }))).toBeNull();
  });

  it('trap: o A na sua vez não é a dica da reação', () => {
    expect(hintFor(setup({ p1: { hand: ['A'] }, p2: { attackBuffs: ['J'] } }))).toBeNull();
  });

  it('steal: na sua vez, com um A e uma numérica do oponente (o Roubo jogável)', () => {
    expect(hintFor(setup({ p1: { hand: ['A'] }, p2: { attack: [5] } }))).toEqual({ id: 'steal', zone: 'hand' });
  });

  it('steal: não na vez do oponente, nem sem numérica do oponente para roubar', () => {
    expect(hintFor(quiet({ p1: { attack: [5], hand: ['A'] } }))).toBeNull();
    expect(hintFor(setup({ p1: { hand: ['A'] } }))).toBeNull();
  });

  it('devastation: na sua vez, com K + A + J na mão e a fileira de Ataque do oponente com carta', () => {
    const state = setup({ p1: { hand: ['K', 'A', 'J'] }, p2: { attack: [5] } });
    expect(hintFor(state, { seen: ['buffs', 'steal'] })).toEqual({ id: 'devastation', zone: 'actionBar' });
    expect(hintFor(setup({ p1: { hand: ['K', 'A', 'J'] } }), { seen: ['buffs'] })).toBeNull();
  });

  it('limit: uma especial sua queimada pela BURN (o evento é seu); a do oponente não', () => {
    const burned = (player: PlayerId): GameEvent[] => [
      { type: 'HandLimitPenalty', player, penalty: 'BURN', cards: [{ id: 'k9', kind: 'K', suit: 'copas' }], fewer: 0 },
    ];
    const state = equipRound({ p1: { pending: [3] } });
    expect(hintFor(state, { events: burned(P1), seen: ['equip'] })).toEqual({ id: 'limit', zone: 'hand' });
    expect(hintFor(state, { events: burned(P2), seen: ['equip'] })).toBeNull();
  });

  it('wild: o Coringa Selvagem na mão, na sua vez', () => {
    expect(hintFor(setup({ p1: { hand: ['W'] } }))).toEqual({ id: 'wild', zone: 'hand' });
  });

  it('wild: não na vez do oponente', () => {
    expect(hintFor(quiet({ p1: { attack: [5], hand: ['W'] } }))).toBeNull();
  });

  it('buffs: o Selvagem jogável como J ou Q não basta, só a carta de verdade; com as duas, buffs vem antes de wild', () => {
    // Só o Selvagem e um A (que não é J, Q nem K): a dica é a do Selvagem, e só ela.
    expect(hintFor(setup({ p1: { hand: ['W', 'A'] } }))).toEqual({ id: 'wild', zone: 'hand' });
    expect(drain(setup({ p1: { hand: ['W', 'A'] } })).map((h) => h.id)).toEqual(['wild']);
    // Com um J de verdade além do Selvagem: J/Q/K primeiro, depois o Selvagem.
    expect(drain(setup({ p1: { hand: ['J', 'W'] } })).map((h) => h.id)).toEqual(['buffs', 'wild']);
    // Com o limite de J atingido o J da mão não é jogável (o Selvagem ainda joga como Q, mas não conta): só a do Selvagem.
    const jLimit = setup({ config: { buffLimit: 1 }, p1: { hand: ['J', 'W'], attackBuffs: ['J'] } });
    expect(drain(jLimit).map((h) => h.id)).toEqual(['wild']);
  });

  it('reflect: na janela do ataque, com K + J + Q na mão (o Reflect jogável)', () => {
    const state = setup({
      p1: { hand: ['K', 'J', 'Q'] },
      p2: { attack: [5] },
      phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' },
      turnOrder: [P2, P1],
    });
    expect(hintFor(state, { seen: ['buffs'] })).toEqual({ id: 'reflect', zone: 'hand' });
  });

  it('reflect: não na fase principal (o Reflect só responde a um ataque)', () => {
    const main = setup({ p1: { hand: ['K', 'J', 'Q'] } });
    expect(hintFor(main, { seen: ['buffs'] })).toBeNull();
  });

  it('reflect: o ReflectPlayed do oponente, nos eventos, vale; o seu não', () => {
    // P1 ataca e P2 responde com o Reflect: a resposta é de P1.
    const attacked = act(setup({ p2: { hand: ['K', 'J', 'Q'] }, p1: { attack: [5] } }), P1, { type: 'DECLARE_ATTACK' }).state;
    const { state: next, events } = act(attacked, P2, { type: 'REFLECT', ...reflectIds(attacked, P2) });
    expect(next.phase).toEqual({ kind: 'REACTION', responder: P1, trigger: 'REFLECT_PLAYED' });
    expect(hintFor(next, { events })).toEqual({ id: 'reflect', zone: 'hand' });
    // Sem os eventos a janela do Reflect não tem dica (não há TRAP nem REFLECT legal): o evento é o que vale.
    expect(hintFor(next)).toBeNull();

    const mine = act(
      setup({ p1: { hand: ['K', 'J', 'Q'] }, p2: { attack: [5] }, turnOrder: [P2, P1], phase: { kind: 'ATTACK_MAIN', player: P2 } }),
      P2,
      { type: 'DECLARE_ATTACK' },
    ).state;
    const played = act(mine, P1, { type: 'REFLECT', ...reflectIds(mine, P1) });
    expect(played.events.some((e) => e.type === 'ReflectPlayed' && e.player === P1)).toBe(true);
    expect(hintFor(played.state, { events: played.events })).toBeNull();
  });

  it('o turno de ataque comum não chama dica: a do anti-travamento saiu com a regra (E1 do sub-projeto 5)', () => {
    expect(hintFor(quiet())).toBeNull();
    expect(hintFor(quiet({ round: 9 }))).toBeNull();
  });

  it('end: partida encerrada', () => {
    const over = setup({ phase: { kind: 'GAME_OVER', result: { kind: 'WIN', winner: P1, reason: 'HP' } } });
    expect(hintFor(over)).toEqual({ id: 'end', zone: 'end' });
    expect(hintFor(over, { me: P2 })).toEqual({ id: 'end', zone: 'end' });
  });
});

/** Os ids de K, J e Q da mão de quem joga o Reflect. */
function reflectIds(state: GameState, who: PlayerId): { kId: string; jId: string; qId: string } {
  const hand = state.players.find((p) => p.id === who)!.hand;
  const id = (kind: 'K' | 'J' | 'Q'): string => hand.find((c) => c.kind === kind)!.id;
  return { kId: id('K'), jId: id('J'), qId: id('Q') };
}

describe('tutorialHint: ordem, "vista" e situação que passou', () => {
  it('no fim da partida a dica do fim vem antes de qualquer outra ainda não vista', () => {
    const result = { kind: 'WIN', winner: P1, reason: 'HP' } as const;
    // Quadra no seu campo: sem o fim, seria a dica `quad`.
    const over = setup({ phase: { kind: 'GAME_OVER', result }, p1: { attack: [5, 5, 5, 5] } });
    expect(hintFor(over)).toEqual({ id: 'end', zone: 'end' });
    expect(drain(over).map((h) => h.id)).toEqual(['end', 'quad']);
    // Com o QuadFormed do oponente nos eventos: o fim também vem primeiro.
    const finished = setup({ phase: { kind: 'GAME_OVER', result } });
    const events: GameEvent[] = [{ type: 'QuadFormed', player: P2, quad: { row: 'ATK', value: 4 } }];
    expect(hintFor(finished, { events })).toEqual({ id: 'end', zone: 'end' });
    expect(hintFor(finished)).toEqual({ id: 'end', zone: 'end' });
  });

  it('fora do fim a lista segue a ordem de sempre', () => {
    expect(drain(quiet({ p1: { attack: [5, 5, 5, 5] } })).map((h) => h.id)).toEqual(['quad']);
  });

  it('a primeira da lista ganha quando duas valem (o primeiro ataque com J na mão: firstAttack, depois buffs)', () => {
    const state = setup({ p1: { attack: [5], hand: ['J'] } });
    expect(hintFor(state)?.id).toBe('firstAttack');
    expect(hintFor(state, { seen: ['firstAttack'] })?.id).toBe('buffs');
  });

  it('no Equipar com uma quadra no campo: equip antes de quad', () => {
    const state = equipRound({ p1: { pending: [3], attack: [5, 5, 5, 5] } });
    expect(drain(state).map((h) => h.id)).toEqual(['equip', 'quad']);
  });

  it('com várias situações valendo, as dicas saem na ordem da lista', () => {
    // O Reflect só responde a um ataque (F2): na fase principal, a dica dele não vale.
    const state = setup({ p1: { attack: [5, 5, 5, 5], hand: ['K', 'J', 'Q', 'W'] } });
    expect(drain(state).map((h) => h.id)).toEqual(['quad', 'firstAttack', 'buffs', 'wild']);
  });

  it('uma dica vista não volta, e o que sobra aparece; sem sobra, nada', () => {
    const state = setup({ p1: { attack: [5], hand: ['J'] } });
    expect(hintFor(state, { seen: ['buffs'] })?.id).toBe('firstAttack');
    expect(hintFor(state, { seen: ['firstAttack', 'buffs'] })).toBeNull();
  });

  it('nada depois de todas vistas, em qualquer situação', () => {
    const states = [
      equipRound({ p1: { pending: [4, 5] } }),
      quiet({ p1: { attack: [5, 5, 5, 5] } }),
      setup({ phase: { kind: 'ORDER_CHOICE', player: P1 } }),
      setup({ p1: { attack: [5, 5, 5, 5], hand: ['K', 'J', 'Q', 'W'] } }),
      setup({ phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' }, p1: { hand: ['A'] }, p2: { attackBuffs: ['J'] } }),
      setup({ phase: { kind: 'GAME_OVER', result: { kind: 'WIN', winner: P2, reason: 'EXODIA' } } }),
    ];
    for (const state of states) {
      expect(hintFor(state)).not.toBeNull();
      expect(hintFor(state, { seen: ALL })).toBeNull();
    }
  });

  it('uma dica cuja situação passou não aparece depois, mesmo sem ter sido vista', () => {
    // O jogador demorou no "Entendi" do Equipar: já é a escolha da ordem, depois o ataque, e a dica do Equipar não volta.
    for (const state of [
      setup({ phase: { kind: 'ORDER_CHOICE', player: P1 } }),
      setup({ p1: { attack: [5] } }),
      quiet(),
      setup({ phase: { kind: 'GAME_OVER', result: { kind: 'WIN', winner: P2, reason: 'HP' } } }),
    ]) {
      expect(hintFor(state)?.id).not.toBe('equip');
      expect(hintFor(state, { seen: ['order'] })?.id).not.toBe('equip');
    }
    // E a do Reflect do oponente some quando o evento não vem mais.
    expect(hintFor(setup({ phase: { kind: 'REACTION', responder: P1, trigger: 'REFLECT_PLAYED' } }))).toBeNull();
  });

  it('é pura: não muda a view, os eventos nem o conjunto de vistas', () => {
    const state = setup({ p1: { attack: [5, 5, 5, 5], hand: ['K', 'J', 'Q', 'W'] } });
    const view = viewFor(state, P1);
    const events: GameEvent[] = [{ type: 'QuadFormed', player: P2, quad: { row: 'ATK', value: 4 } }];
    const seen = new Set<HintId>(['quad']);
    const before = JSON.stringify([view, events, [...seen]]);
    const first = tutorialHint(view, events, seen);
    expect(tutorialHint(view, events, seen)).toEqual(first);
    expect(JSON.stringify([view, events, [...seen]])).toBe(before);
  });
});

/** Uma partida da semente do tutorial, jogada como a tela vai ler: `p1` com a `view` e os eventos da última jogada. */
describe('tutorialHint na semente do tutorial', () => {
  const created = (): GameState => {
    const result = createGame(DEFAULT_CONFIG, TUTORIAL_SEED, [P1, P2]);
    if (!result.ok) throw new Error(result.error.message);
    return result.state;
  };

  const play = (state: GameState, who: PlayerId, pick: (actions: Action[]) => Action): { state: GameState; events: GameEvent[] } => {
    const action = pick(legalActions(viewFor(state, who)));
    const result = applyAction(state, who, action);
    if (!result.ok) throw new Error(`${result.error.code}: ${result.error.message}`);
    return { state: result.state, events: result.events };
  };
  const first = (actions: Action[]): Action => actions[0]!;
  const ofType = (type: Action['type']) => (actions: Action[]): Action => actions.find((a) => a.type === type)!;

  it('a partida abre com a dica do Equipar; depois de confirmar, nada até a próxima situação', () => {
    const start = created();
    expect(hintFor(start)).toEqual({ id: 'equip', zone: 'equip' });
    const mine = play(start, P1, first);
    expect(hintFor(mine.state, { events: mine.events })).toBeNull();
  });

  it('do 1º Equipar ao primeiro ataque: equip, order, firstAttack, buffs, steal, wild, devastation, uma por vez e sem voltar', () => {
    const seen = new Set<HintId>();
    const shown: HintId[] = [];
    /** Como a tela: a cada `state`, a dica nova (se houver) é mostrada, e "Entendi" a marca vista. */
    const read = (state: GameState, events: GameEvent[]): void => {
      for (let i = 0; i <= ALL.length; i += 1) {
        const hint = tutorialHint(viewFor(state, P1), viewEvents(events, P1), seen);
        if (hint === null) return;
        shown.push(hint.id);
        seen.add(hint.id);
      }
    };

    let { state, events } = { state: created(), events: [] as GameEvent[] };
    read(state, events);
    // Equipar 1 e 2: cada lado confirma a primeira montagem.
    for (let equip = 0; equip < 2; equip += 1) {
      ({ state, events } = play(state, P1, first));
      read(state, events);
      ({ state, events } = play(state, P2, first));
      read(state, events);
    }
    // Rodada 3 de Ataque: a iniciativa é de p1, que escolhe atacar primeiro.
    expect(state.phase).toEqual({ kind: 'ORDER_CHOICE', player: P1 });
    ({ state, events } = play(state, P1, ofType('CHOOSE_ORDER')));
    read(state, events);
    expect(state.phase).toEqual({ kind: 'ATTACK_MAIN', player: P1 });
    expect(shown).toEqual(['equip', 'order', 'firstAttack', 'buffs', 'steal', 'wild', 'devastation']);
  });
});


// ---------------------------------------------------------------------------------------------
// O painel: a dica que fica na tela entre um `state` e o seguinte (`advanceHint`, `acknowledgeHint`)

describe('hintHolding: a dica de um id ainda vale agora', () => {
  it('devolve a dica (com a zona) quando a situação vale, e null quando não', () => {
    const attack = viewFor(setup({ p1: { attack: [5] } }), P1);
    expect(hintHolding(attack, [], 'firstAttack')).toEqual({ id: 'firstAttack', zone: 'actionBar' });
    expect(hintHolding(attack, [], 'equip')).toBeNull();
    expect(hintHolding(attack, [], 'end')).toBeNull();
  });

  it('vale mesmo com uma dica de prioridade maior valendo junto (é a situação dela que se olha)', () => {
    const view = viewFor(setup({ p1: { attack: [5], hand: ['J'] } }), P1);
    expect(tutorialHint(view, [], new Set())?.id).toBe('firstAttack');
    expect(hintHolding(view, [], 'buffs')).toEqual({ id: 'buffs', zone: 'hand' });
  });
});

describe('advanceHint e acknowledgeHint', () => {
  const viewOf = (state: GameState, events: GameEvent[] = []): [ReturnType<typeof viewFor>, GameEvent[]] => [
    viewFor(state, P1),
    viewEvents(events, P1),
  ];
  const advance = (flow: HintFlow, state: GameState, events: GameEvent[] = [], epoch = 1): HintFlow =>
    advanceHint(flow, ...viewOf(state, events), epoch);
  const acknowledge = (flow: HintFlow, state: GameState, events: GameEvent[] = [], epoch = 1): HintFlow =>
    acknowledgeHint(flow, ...viewOf(state, events), epoch);
  const over = (extra: Setup = {}): GameState =>
    setup({ phase: { kind: 'GAME_OVER', result: { kind: 'WIN', winner: P1, reason: 'HP' } }, ...extra });

  it('a primeira situação que vale entra no painel; sem situação, o painel fica vazio', () => {
    expect(advance(NO_HINT, quiet()).current).toBeNull();
    expect(advance(NO_HINT, equipRound({ p1: { pending: [4, 5] } })).current).toBe('equip');
  });

  it('a dica fica no painel até o "Entendi", mesmo depois de a situação passar (e não volta depois)', () => {
    const equip = advance(NO_HINT, equipRound({ p1: { pending: [4, 5] } }));
    // O Equipar passou, e nada de novo vale: a dica segue lá, mas já conta como vista.
    const later = advance(equip, quiet());
    expect(later.current).toBe('equip');
    expect(later.seen.has('equip')).toBe(true);
    const cleared = acknowledge(later, quiet());
    expect(cleared.current).toBeNull();
    // Outro Equipar: a dica não volta.
    expect(advance(cleared, equipRound({ p1: { pending: [4, 5] } })).current).toBeNull();
  });

  it('uma dica que saiu sem "Entendi" (outra tomou o painel) é vista: não volta quando a situação se repete', () => {
    const equip = advance(NO_HINT, equipRound({ p1: { pending: [4, 5] } }));
    const order = advance(equip, setup({ phase: { kind: 'ORDER_CHOICE', player: P1 } }));
    expect(order.current).toBe('order');
    expect(order.seen.has('equip')).toBe(true);
    const next = acknowledge(order, quiet());
    expect(advance(next, equipRound({ p1: { pending: [4, 5] } })).current).toBeNull();
  });

  it('uma dica de prioridade maior toma o painel de uma que ainda vale, e a que saiu não é dada por vista', () => {
    // Sua vez de atacar com um J: firstAttack, que o jogador já viu; fica a dos buffs.
    const attack = setup({ p1: { attack: [5], hand: ['J'] } });
    const buffs = acknowledge(advance(NO_HINT, attack), attack);
    expect(buffs.current).toBe('buffs');
    // Chega a quadra do oponente (o evento dela, com a sua mão ainda em condição de J): ela toma o painel, e os buffs, que ainda
    // valem, seguem por ver.
    const formed = equipRound({ p1: { equipSubmitted: true }, p2: { pending: [5], attack: [5, 5, 5] } });
    const { events } = act(formed, P2, { type: 'EQUIP', destinations: ['ATK'] });
    expect(events.some((e) => e.type === 'QuadFormed')).toBe(true);
    const quad = advance(buffs, attack, events);
    expect(quad.current).toBe('quad');
    expect(quad.seen.has('buffs')).toBe(false);
  });

  it('o "Entendi" troca para a próxima que vale no mesmo estado, e o painel esvazia quando não sobra nenhuma', () => {
    const attack = setup({ p1: { attack: [5], hand: ['J'] } });
    const first = advance(NO_HINT, attack);
    expect(first.current).toBe('firstAttack');
    const second = acknowledge(first, attack);
    expect(second.current).toBe('buffs');
    expect(second.seen).toEqual(new Set(['firstAttack']));
    const third = acknowledge(second, attack);
    expect(third.current).toBeNull();
    expect(third.seen).toEqual(new Set(['firstAttack', 'buffs']));
    // Sem dica no painel, "Entendi" não muda nada.
    expect(acknowledge(third, attack)).toEqual(third);
  });

  it('uma dica só de evento (a quadra do oponente) fica no painel depois de o evento passar', () => {
    const state = equipRound({ p1: { equipSubmitted: true }, p2: { pending: [5], attack: [5, 5, 5] } });
    const { state: next, events } = act(state, P2, { type: 'EQUIP', destinations: ['ATK'] });
    const quad = advance(NO_HINT, next, events);
    expect(quad.current).toBe('quad');
    expect(advance(quad, quiet()).current).toBe('quad');
  });

  it('no fim da partida a dica do fim toma o painel; depois do "Entendi" a tela para de pedir dicas', () => {
    const attack = setup({ p1: { attack: [5], hand: ['J'] } });
    const ended = advance(advance(NO_HINT, attack), over());
    expect(ended.current).toBe('end');
    const done = acknowledge(ended, over());
    expect(done.current).toBeNull();
    expect(done.seen.has('end')).toBe(true);
    // Nem a da quadra, que ainda vale no fim, volta; nem uma partida nova.
    expect(advance(done, over({ p1: { attack: [5, 5, 5, 5] } })).current).toBeNull();
    expect(advance(done, equipRound({ p1: { pending: [4, 5] } })).current).toBeNull();
  });

  it('a dica do fim que sai sem "Entendi" (a revanche começa) encerra o tutorial: nenhuma dica depois dela', () => {
    const ended = advance(NO_HINT, over());
    expect(ended.current).toBe('end');
    const rematch = advance(ended, equipRound({ p1: { pending: [4, 5] } }));
    expect(rematch.current).toBeNull();
    expect(rematch.seen.has('end')).toBe(true);
  });

  it('a época em que a dica chegou: guardada na chegada, mantida enquanto ela segue no painel, trocada quando outra a toma', () => {
    expect(NO_HINT.epoch).toBeNull();
    const equipState = equipRound({ p1: { pending: [4, 5] } });
    const equip = advance(NO_HINT, equipState, [], 3);
    expect(equip).toMatchObject({ current: 'equip', epoch: 3 });
    // A mesma dica, vista num state de outra época (o painel não mudou): segue chegada na 3.
    expect(advance(equip, equipState, [], 4)).toBe(equip);
    // Outra toma o painel: a época é a do state em que ela chegou.
    const order = advance(equip, setup({ phase: { kind: 'ORDER_CHOICE', player: P1 } }), [], 5);
    expect(order).toMatchObject({ current: 'order', epoch: 5 });
    // A situação passou, e a dica fica no painel até o "Entendi": a época de chegada não anda.
    expect(advance(order, quiet(), [], 6)).toMatchObject({ current: 'order', epoch: 5 });
    // Sem dica no painel, sem época.
    expect(advance(NO_HINT, quiet(), [], 7)).toMatchObject({ current: null, epoch: null });
  });

  it('"Entendi" que traz a próxima no mesmo state a marca com a época dele, e o painel vazio não tem época', () => {
    const attack = setup({ p1: { attack: [5], hand: ['J'] } });
    const first = advance(NO_HINT, attack, [], 8);
    expect(first).toMatchObject({ current: 'firstAttack', epoch: 8 });
    const second = acknowledge(first, attack, [], 8);
    expect(second).toMatchObject({ current: 'buffs', epoch: 8 });
    // Os buffs seguem por ver: o state da vez de atacar seguinte (outra época) não os traz de volta à época dele.
    expect(advance(second, attack, [], 12)).toMatchObject({ current: 'buffs', epoch: 8 });
    expect(acknowledge(second, attack, [], 12)).toMatchObject({ current: null, epoch: null });
  });

  it('com a dica do fim vista, o painel esvazia e não tem época', () => {
    const ended = advance(advance(NO_HINT, over(), [], 2), over(), [], 2);
    expect(ended.current).toBe('end');
    expect(acknowledge(ended, over(), [], 2)).toMatchObject({ current: null, epoch: null });
  });

  it('é pura: não muda o fluxo recebido nem o conjunto de vistas', () => {
    const attack = setup({ p1: { attack: [5], hand: ['J'] } });
    const flow = advance(NO_HINT, attack);
    const before = { current: flow.current, seen: [...flow.seen] };
    acknowledge(flow, attack);
    advance(flow, quiet());
    expect({ current: flow.current, seen: [...flow.seen] }).toEqual(before);
    expect(NO_HINT.seen.size).toBe(0);
  });

  it('na semente do tutorial, com "Entendi" em cada uma, as dicas saem na ordem e uma só vez', () => {
    const created = createGame(DEFAULT_CONFIG, TUTORIAL_SEED, [P1, P2]);
    if (!created.ok) throw new Error(created.error.message);
    const shown: HintId[] = [];
    let flow: HintFlow = NO_HINT;
    const read = (state: GameState, events: GameEvent[]): void => {
      flow = advance(flow, state, events);
      for (let i = 0; i <= ALL.length && flow.current !== null; i += 1) {
        shown.push(flow.current);
        flow = acknowledge(flow, state, events);
      }
    };
    const step = (state: GameState, who: PlayerId, pick: (actions: Action[]) => Action): { state: GameState; events: GameEvent[] } => {
      const applied = applyAction(state, who, pick(legalActions(viewFor(state, who))));
      if (!applied.ok) throw new Error(applied.error.message);
      return { state: applied.state, events: applied.events };
    };
    let state = created.state;
    read(state, []);
    for (let equip = 0; equip < 2; equip += 1) {
      for (const who of [P1, P2]) {
        const stepped = step(state, who, (actions) => actions[0]!);
        state = stepped.state;
        read(state, stepped.events);
      }
    }
    const ordered = step(state, P1, (actions) => actions.find((a) => a.type === 'CHOOSE_ORDER')!);
    read(ordered.state, ordered.events);
    expect(shown).toEqual(['equip', 'order', 'firstAttack', 'buffs', 'steal', 'wild', 'devastation']);
  });
});
