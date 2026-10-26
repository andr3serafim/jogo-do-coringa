// As dicas do tutorial (plano da fatia 4). Puro: escolhe qual dica a tela mostra agora; quem guarda as vistas e escreve os
// textos é a tela. Nenhuma regra aqui: a situação de cada dica sai da `view`, dos eventos da mensagem `state` e das ações
// legais do motor (`legalActions`).
import { legalActions, type Action, type GameEvent, type PlayerView } from '@coringa/engine';

/** As dicas, na ordem de prioridade: com duas valendo ao mesmo tempo, a primeira da lista sai e a outra espera. */
export type HintId = 'equip' | 'quad' | 'order' | 'firstAttack' | 'buffs' | 'trap' | 'wild' | 'reflect' | 'pressure' | 'end';

/** A zona da mesa de que a dica fala (a tela a destaca). */
export type HintZone = 'equip' | 'rows' | 'order' | 'actionBar' | 'hand' | 'reaction' | 'center' | 'end';

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
    // O Selvagem também joga como J ou Q: só com ele na mão, esta vem antes da dica dele (que a explica em termos de J e Q).
    id: 'buffs',
    zone: 'hand',
    holds: (situation) => inMyTurn(situation) && canDo(situation.legal, 'PLAY_J', 'PLAY_Q', 'PLAY_K'),
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
  { id: 'pressure', zone: 'center', holds: ({ view }) => view.pressure >= 1 || view.noDamageStreak >= 1 },
  { id: 'end', zone: 'end', holds: ({ view }) => view.phase.kind === 'GAME_OVER' },
];

/**
 * A dica do momento: a primeira da lista cuja situação vale agora e que ainda não está em `seen`; `null` se não há. Uma dica
 * cuja situação passou não é devolvida depois, e uma já vista não volta. `events` são os do `state` atual, já redigidos
 * para `view.me`.
 */
export function tutorialHint(view: PlayerView, events: readonly GameEvent[], seen: ReadonlySet<HintId>): Hint | null {
  const situation: Situation = { view, events, legal: legalActions(view) };
  for (const hint of HINTS) {
    if (!seen.has(hint.id) && hint.holds(situation)) return { id: hint.id, zone: hint.zone };
  }
  return null;
}
