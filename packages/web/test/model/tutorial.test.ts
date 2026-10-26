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
import { tutorialHint, type Hint, type HintId } from '../../src/model/tutorial.ts';

const ALL: readonly HintId[] = ['equip', 'quad', 'order', 'firstAttack', 'buffs', 'trap', 'wild', 'reflect', 'pressure', 'end'];

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

  it('reflect: K + J + Q na mão e o Reflect jogável', () => {
    const state = setup({ p1: { hand: ['K', 'J', 'Q'] } });
    expect(hintFor(state, { seen: ['buffs'] })).toEqual({ id: 'reflect', zone: 'hand' });
  });

  it('reflect: não com o seu Reflect já armado', () => {
    const armed = setup({ p1: { hand: ['K', 'J', 'Q'], reflect: true } });
    expect(hintFor(armed, { seen: ['buffs'] })).toBeNull();
  });

  it('reflect: o ReflectPlayed do oponente, nos eventos, vale; o seu não', () => {
    const state = setup({ p2: { hand: ['K', 'J', 'Q'] }, phase: { kind: 'ATTACK_MAIN', player: P2 }, p1: { attack: [5] } });
    const { state: next, events } = act(state, P2, { type: 'REFLECT', ...reflectIds(state, P2) });
    expect(next.phase).toEqual({ kind: 'REACTION', responder: P1, trigger: 'REFLECT_PLAYED' });
    expect(hintFor(next, { events })).toEqual({ id: 'reflect', zone: 'hand' });
    // Sem os eventos a janela do Reflect não tem dica (não há TRAP nem REFLECT legal): o evento é o que vale.
    expect(hintFor(next)).toBeNull();

    const mine = setup({ p1: { hand: ['K', 'J', 'Q'], attack: [5] } });
    const played = act(mine, P1, { type: 'REFLECT', ...reflectIds(mine, P1) });
    expect(played.events.some((e) => e.type === 'ReflectPlayed' && e.player === P1)).toBe(true);
    expect(hintFor(played.state, { events: played.events })).toBeNull();
  });

  it('pressure: a Pressão da mesa ligada', () => {
    expect(hintFor(quiet({ pressure: 1 }))).toEqual({ id: 'pressure', zone: 'center' });
  });

  it('pressure: uma rodada de Ataque sem dano já basta (sem Pressão da mesa na config)', () => {
    const state = quiet({ config: { tablePressure: false }, noDamageStreak: 1 });
    expect(hintFor(state)).toEqual({ id: 'pressure', zone: 'center' });
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
    // Quadra no seu campo e Pressão ligada: sem o fim, seriam as dicas `quad` e `pressure`.
    const over = setup({ pressure: 1, phase: { kind: 'GAME_OVER', result }, p1: { attack: [5, 5, 5, 5] } });
    expect(hintFor(over)).toEqual({ id: 'end', zone: 'end' });
    expect(drain(over).map((h) => h.id)).toEqual(['end', 'quad', 'pressure']);
    // Com o QuadFormed do oponente nos eventos, ou só a sequência sem dano: o fim também vem primeiro.
    const stalled = setup({ noDamageStreak: 2, phase: { kind: 'GAME_OVER', result } });
    const events: GameEvent[] = [{ type: 'QuadFormed', player: P2, quad: { row: 'ATK', value: 4 } }];
    expect(hintFor(stalled, { events })).toEqual({ id: 'end', zone: 'end' });
    expect(hintFor(stalled)).toEqual({ id: 'end', zone: 'end' });
  });

  it('fora do fim a lista segue a ordem de sempre', () => {
    expect(drain(quiet({ pressure: 1, p1: { attack: [5, 5, 5, 5] } })).map((h) => h.id)).toEqual(['quad', 'pressure']);
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
    const state = setup({ pressure: 1, p1: { attack: [5, 5, 5, 5], hand: ['K', 'J', 'Q', 'W'] } });
    expect(drain(state).map((h) => h.id)).toEqual(['quad', 'firstAttack', 'buffs', 'wild', 'reflect', 'pressure']);
  });

  it('uma dica vista não volta, e o que sobra aparece; sem sobra, nada', () => {
    const state = setup({ p1: { attack: [5], hand: ['J'] } });
    expect(hintFor(state, { seen: ['buffs'] })?.id).toBe('firstAttack');
    expect(hintFor(state, { seen: ['firstAttack', 'buffs'] })).toBeNull();
  });

  it('nada depois de todas vistas, em qualquer situação', () => {
    const states = [
      equipRound({ p1: { pending: [4, 5] } }),
      quiet({ p1: { attack: [5, 5, 5, 5] }, pressure: 2 }),
      setup({ phase: { kind: 'ORDER_CHOICE', player: P1 } }),
      setup({ pressure: 1, p1: { attack: [5, 5, 5, 5], hand: ['K', 'J', 'Q', 'W'] } }),
      setup({ phase: { kind: 'REACTION', responder: P1, trigger: 'ATTACK' }, p1: { hand: ['A'] }, p2: { attackBuffs: ['J'] } }),
      setup({ phase: { kind: 'GAME_OVER', result: { kind: 'DRAW', reason: 'ANTI_STALL' } } }),
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
      quiet({ pressure: 1 }),
      setup({ phase: { kind: 'GAME_OVER', result: { kind: 'WIN', winner: P2, reason: 'HP' } } }),
    ]) {
      expect(hintFor(state)?.id).not.toBe('equip');
      expect(hintFor(state, { seen: ['order'] })?.id).not.toBe('equip');
    }
    // E a do Reflect do oponente some quando o evento não vem mais.
    expect(hintFor(setup({ phase: { kind: 'REACTION', responder: P1, trigger: 'REFLECT_PLAYED' } }))).toBeNull();
  });

  it('é pura: não muda a view, os eventos nem o conjunto de vistas', () => {
    const state = setup({ pressure: 1, p1: { attack: [5, 5, 5, 5], hand: ['K', 'J', 'Q', 'W'] } });
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

  it('do 1º Equipar ao primeiro ataque: equip, order, firstAttack, buffs, wild, reflect, uma por vez e sem voltar', () => {
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
    expect(shown).toEqual(['equip', 'order', 'firstAttack', 'buffs', 'wild', 'reflect']);
  });
});
