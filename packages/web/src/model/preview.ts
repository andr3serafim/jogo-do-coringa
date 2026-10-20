// Prévias da barra de ação (spec §3.4). Puro: sem React nem DOM. Nenhuma conta mora aqui: tudo sai de `previewAttack`
// do motor. O "e se a Armadilha quebrar este alvo" é o mesmo cálculo sobre uma cópia da `view` sem a carta.
import { previewAttack, type AttackPreview, type PlayerView } from '@coringa/engine';

export interface Previews {
  /** O seu ataque contra o oponente. */
  mine: AttackPreview;
  /** O ataque do oponente contra a sua Defesa. */
  threat: AttackPreview;
}

export function previewsOf(view: PlayerView): Previews {
  return { mine: previewAttack(view, 'self'), threat: previewAttack(view, 'opponent') };
}

/** Uma cópia da `view` sem a carta `targetId` do oponente (Guarda ou buffs); a `view` original não muda. */
export function viewWithout(view: PlayerView, targetId: string): PlayerView {
  const { opponent } = view;
  const keep = <T extends { id: string }>(cards: T[]): T[] => cards.filter((card) => card.id !== targetId);
  return {
    ...view,
    opponent: {
      ...opponent,
      attackBuffs: keep(opponent.attackBuffs),
      defenseBuffs: keep(opponent.defenseBuffs),
      guard: keep(opponent.guard),
    },
  };
}

/** As prévias com o alvo destruído (Armadilha ou Sacrifício). */
export function previewsWithout(view: PlayerView, targetId: string): Previews {
  return previewsOf(viewWithout(view, targetId));
}

/** As duas prévias diferem no que o jogador lê: desfecho ou algum número da conta. */
export function previewChanged(a: AttackPreview, b: AttackPreview): boolean {
  return (
    a.outcome !== b.outcome ||
    a.attack !== b.attack ||
    a.defense !== b.defense ||
    a.damage !== b.damage ||
    a.reflected !== b.reflected ||
    a.absolute !== b.absolute
  );
}
