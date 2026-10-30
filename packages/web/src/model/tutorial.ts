// As dicas do tutorial (plano da fatia 4). Puro: escolhe qual dica a tela mostra agora; quem guarda as vistas e escreve os
// textos é a tela. Nenhuma regra aqui: a situação de cada dica sai da `view`, dos eventos da mensagem `state` e das ações
// legais do motor (`legalActions`).
import { legalActions, type Action, type GameEvent, type PlayerView } from '@coringa/engine';

/** As dicas, na ordem de prioridade: com duas valendo ao mesmo tempo, a primeira da lista sai e a outra espera. */
export type HintId = 'equip' | 'quad' | 'order' | 'firstAttack' | 'buffs' | 'trap' | 'wild' | 'reflect' | 'end';

/** A zona da mesa de que a dica fala (a tela a destaca). */
export type HintZone = 'equip' | 'rows' | 'order' | 'actionBar' | 'hand' | 'reaction' | 'end';

export interface Hint {
  id: HintId;
  zone: HintZone;
}

/** O que a situação de uma dica pode olhar: a vista de quem joga, os eventos do `state` atual e as jogadas que ele tem. */
interface Situation {
  view: PlayerView;
  events: readonly GameEvent[];
  legal: readonly Action[];
}

const canDo = (legal: readonly Action[], ...types: Action['type'][]): boolean => legal.some((action) => types.includes(action.type));

/** A fase principal do ataque, na vez de quem vê (fora dela a lista de ações legais é vazia). */
const inMyTurn = ({ view }: Situation): boolean => view.phase.kind === 'ATTACK_MAIN' && view.phase.player === view.me;

/** Há um J, Q ou K da mão que as ações legais deixam jogar (o K é sempre de verdade; no J e no Q, o Selvagem não vale). */
const playsRealBuff = ({ view, legal }: Situation): boolean =>
  legal.some(
    (action) =>
      action.type === 'PLAY_K' ||
      ((action.type === 'PLAY_J' || action.type === 'PLAY_Q') &&
        view.self.hand.some((card) => card.id === action.cardId && card.kind !== 'WILD')),
  );

/**
 * Em ordem de prioridade. Cada situação vale só enquanto a coisa acontece: ao mudar de fase ou de vez, a dica de antes não
 * volta, mesmo sem ter sido vista.
 */
const HINTS: ReadonlyArray<Hint & { holds: (situation: Situation) => boolean }> = [
  {
    id: 'equip',
    zone: 'equip',
    holds: ({ view }) => view.phase.kind === 'EQUIP' && view.self.pending.length > 0 && !view.self.equipSubmitted,
  },
  {
    // Uma quadra que se formou agora (de qualquer lado) ou que já está no seu campo.
    id: 'quad',
    zone: 'rows',
    holds: ({ view, events }) => events.some((event) => event.type === 'QuadFormed') || view.self.quads.length > 0,
  },
  { id: 'order', zone: 'order', holds: ({ view, legal }) => view.phase.kind === 'ORDER_CHOICE' && canDo(legal, 'CHOOSE_ORDER') },
  { id: 'firstAttack', zone: 'actionBar', holds: (situation) => inMyTurn(situation) && canDo(situation.legal, 'DECLARE_ATTACK') },
  {
    // Só com um J, Q ou K de verdade jogável: o Selvagem que joga como J ou Q (o motor o oferece) não conta, a dica dele é a `wild`.
    id: 'buffs',
    zone: 'hand',
    holds: (situation) => inMyTurn(situation) && playsRealBuff(situation),
  },
  { id: 'trap', zone: 'reaction', holds: ({ view, legal }) => view.phase.kind === 'REACTION' && canDo(legal, 'TRAP') },
  {
    id: 'wild',
    zone: 'hand',
    holds: (situation) => inMyTurn(situation) && situation.view.self.hand.some((card) => card.kind === 'WILD'),
  },
  {
    // Você pode armar o seu, ou o oponente acabou de armar o dele (os eventos vêm redigidos para você).
    id: 'reflect',
    zone: 'hand',
    holds: ({ view, events, legal }) =>
      canDo(legal, 'REFLECT') || events.some((event) => event.type === 'ReflectPlayed' && event.player !== view.me),
  },
  { id: 'end', zone: 'end', holds: ({ view }) => view.phase.kind === 'GAME_OVER' },
];

/** No fim da partida a dica do fim vem antes das outras: é a que convida a jogar com um amigo e fecha o tutorial. */
const AT_GAME_OVER: typeof HINTS = [...HINTS.filter((hint) => hint.id === 'end'), ...HINTS.filter((hint) => hint.id !== 'end')];

/**
 * A dica do momento: a primeira da lista cuja situação vale agora e que ainda não está em `seen`; `null` se não há. Só no
 * fim da partida a do fim passa na frente. Uma dica cuja situação passou não é devolvida depois, e uma já vista não volta.
 * `events` são os do `state` atual, já redigidos para `view.me`.
 */
export function tutorialHint(view: PlayerView, events: readonly GameEvent[], seen: ReadonlySet<HintId>): Hint | null {
  const situation: Situation = { view, events, legal: legalActions(view) };
  for (const hint of view.phase.kind === 'GAME_OVER' ? AT_GAME_OVER : HINTS) {
    if (!seen.has(hint.id) && hint.holds(situation)) return { id: hint.id, zone: hint.zone };
  }
  return null;
}

/**
 * A dica `id` ainda vale nesta `view` e nestes eventos? Devolve a dica (com a zona) ou `null`. Olha só a situação dela: uma dica de
 * prioridade maior valendo junto não a esconde (`tutorialHint` é quem escolhe qual sai).
 */
export function hintHolding(view: PlayerView, events: readonly GameEvent[], id: HintId): Hint | null {
  const hint = HINTS.find((candidate) => candidate.id === id);
  if (!hint || !hint.holds({ view, events, legal: legalActions(view) })) return null;
  return { id: hint.id, zone: hint.zone };
}

/** O que o painel guarda entre uma mensagem `state` e a seguinte. */
export interface HintFlow {
  /** A dica que está no painel (`null`: nenhuma). Fica até o "Entendi" ou até outra tomar o lugar. */
  current: HintId | null;
  /** As que a pessoa já viu: com "Entendi", ou que saíram do painel depois de a situação passar (cada uma aparece uma vez). */
  seen: ReadonlySet<HintId>;
  /**
   * A época (`state.epoch`) do `state` em que `current` tomou o painel; `null` sem dica. Não anda enquanto a mesma dica segue lá:
   * a tela só a trata como "recém-chegada" (e segura a rolagem da vez de atacar) na época em que ela chegou.
   */
  epoch: number | null;
}

/** O começo do tutorial: nada no painel, nada visto. */
export const NO_HINT: HintFlow = { current: null, seen: new Set(), epoch: null };

const withSeen = (seen: ReadonlySet<HintId>, id: HintId): ReadonlySet<HintId> => (seen.has(id) ? seen : new Set([...seen, id]));

/**
 * Chegou um `state`. Duas coisas: a dica que está no painel e cuja situação passou conta como vista (ela fica na tela até o
 * "Entendi", mas não volta quando a situação se repetir); e, se vale uma dica nova, ela toma o painel. Se a dica do fim já foi vista
 * (com "Entendi", ou saindo do painel porque outra partida começou), o tutorial acabou e o painel esvazia: nada depois do fim. Uma
 * dica só de evento do oponente (a quadra dele) entra neste `state` e fica até o "Entendi": o modelo só a vê aqui. `epoch` é a do
 * `state`: a dica que toma o painel guarda a época em que chegou.
 */
export function advanceHint(flow: HintFlow, view: PlayerView, events: readonly GameEvent[], epoch: number): HintFlow {
  let seen = flow.seen;
  if (flow.current !== null && hintHolding(view, events, flow.current) === null) seen = withSeen(seen, flow.current);
  if (seen.has('end')) return { current: null, seen, epoch: null };
  const next = tutorialHint(view, events, seen);
  if (next === null || next.id === flow.current) return seen === flow.seen ? flow : { current: flow.current, seen, epoch: flow.epoch };
  return { current: next.id, seen, epoch };
}

/** "Entendi": a dica do painel fica vista, e o painel mostra a próxima que vale neste mesmo `state`, se houver. */
export function acknowledgeHint(flow: HintFlow, view: PlayerView, events: readonly GameEvent[], epoch: number): HintFlow {
  if (flow.current === null) return flow;
  return advanceHint({ current: null, seen: withSeen(flow.seen, flow.current), epoch: null }, view, events, epoch);
}
