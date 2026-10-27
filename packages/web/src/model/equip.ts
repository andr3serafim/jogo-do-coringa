// Rascunho do Equipar carta a carta (spec §3.5). Puro: sem React nem DOM.
//
// Nenhuma regra do jogo mora aqui. Os destinos possíveis saem do motor (`nextEquipDestinations`, o mesmo
// do `askEquip` do terminal), quando a lista legal traz um `EQUIP`; os totais, de `attackPower`/`defensePower`;
// as quadras, de `quadValues`; o preenchimento do que falta, de `autoDestinations`. A mesa só aplica o que o
// motor já disse, para mostrar a prévia (a semântica dos destinos é a de `resolveEquip`).
import {
  attackPower,
  autoDestinations,
  defensePower,
  nextEquipDestinations,
  quadValues,
  type Destination,
  type NumCard,
  type PlayerView,
  type Rank,
  type RowName,
} from '@coringa/engine';
import type { PlayerAction } from '@coringa/protocol';

/** Quando faltam até 1,5 s, o Equipar com escolhas feitas segue sozinho (spec §3.5). */
export const EQUIP_AUTO_SEND_MS = 1_500;

/**
 * Os destinos possíveis da próxima carta, dado o que já foi escolhido: os que a regra do motor deixa, se a lista legal traz um
 * `EQUIP` (é a sua vez de montar). Não sai da lista legal: ela traz uma montagem por resultado, e trocar duas vezes a mesma
 * fileira, que a regra aceita, não estaria nela. Sem carta restante, não sobra destino.
 */
export function nextDestinations(view: PlayerView, legal: PlayerAction[], chosen: Destination[]): Destination[] {
  if (!legal.some((a) => a.type === 'EQUIP')) return [];
  return nextEquipDestinations(view, chosen);
}

export interface DraftBoard {
  /** Fileira de Ataque com as escolhas aplicadas (as cartas do rascunho são as pendentes, por id). */
  attackRow: NumCard[];
  defenseRow: NumCard[];
  /** Cartas que vão ao cemitério: as trocadas e as descartadas, na ordem das escolhas. */
  toGraveyard: NumCard[];
  attack: number;
  defense: number;
  /** Quadras que o rascunho forma e a mesa de agora ainda não tem. */
  newQuads: { row: RowName; value: Rank }[];
}

/** A mesa depois de aplicar as primeiras `chosen.length` cartas pendentes, sem mexer na `view`. */
export function draftBoard(view: PlayerView, chosen: Destination[]): DraftBoard {
  const attackRow = [...view.self.attackRow];
  const defenseRow = [...view.self.defenseRow];
  const toGraveyard: NumCard[] = [];
  view.self.pending.slice(0, chosen.length).forEach((card, i) => {
    switch (chosen[i]) {
      case 'ATK':
        attackRow.push(card);
        break;
      case 'DEF':
        defenseRow.push(card);
        break;
      case 'REPLACE_LAST_ATK':
        toGraveyard.push(attackRow.pop()!);
        attackRow.push(card);
        break;
      case 'REPLACE_LAST_DEF':
        toGraveyard.push(defenseRow.pop()!);
        defenseRow.push(card);
        break;
      case 'DISCARD':
        toGraveyard.push(card);
        break;
    }
  });
  const quadsOf = (row: RowName, before: NumCard[], after: NumCard[]) => {
    const had = new Set(quadValues(before));
    return quadValues(after)
      .filter((value) => !had.has(value))
      .map((value) => ({ row, value }));
  };
  return {
    attackRow,
    defenseRow,
    toGraveyard,
    attack: attackPower({ attackRow, attackBuffs: view.self.attackBuffs }),
    defense: defensePower({ defenseRow, defenseBuffs: view.self.defenseBuffs }),
    newQuads: [
      ...quadsOf('ATK', view.self.attackRow, attackRow),
      ...quadsOf('DEF', view.self.defenseRow, defenseRow),
    ],
  };
}

/** As escolhas feitas mais a regra de estouro do motor para as cartas que faltam (spec §1.12). */
export function completeDraft(view: PlayerView, chosen: Destination[]): Destination[] {
  const made = chosen.slice(0, view.self.pending.length);
  const draft = draftBoard(view, made);
  const rest = view.self.pending.length - made.length;
  return [...made, ...autoDestinations(view.config, { attack: draft.attackRow.length, defense: draft.defenseRow.length }, rest)];
}

/** Envio antecipado: só com ≤ 1500 ms, ao menos uma escolha, sem confirmar e sem ter enviado. */
export function shouldAutoSendEquip(input: { remainingMs: number; chosen: number; submitted: boolean; sent: boolean }): boolean {
  return input.remainingMs <= EQUIP_AUTO_SEND_MS && input.chosen >= 1 && !input.submitted && !input.sent;
}
