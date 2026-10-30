// Rascunho do Equipar (spec §3.5). Puro: sem React nem DOM. Desde a E2 do sub-projeto 5 (Equipar livre), cada escolha diz a carta e
// o destino, em qualquer ordem: a ordem das escolhas é a ordem em que as cartas entram (`order` da ação `EQUIP`).
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

/** Uma escolha do rascunho: a numérica pendente e o destino dela. */
export interface EquipPick {
  cardId: string;
  destination: Destination;
}

/** Quando faltam até 1,5 s, o Equipar com escolhas feitas segue sozinho (spec §3.5). */
export const EQUIP_AUTO_SEND_MS = 1_500;

/**
 * Os destinos possíveis da próxima carta, dado o que já foi escolhido: os que a regra do motor deixa, se a lista legal traz um
 * `EQUIP` (é a sua vez de montar). Não sai da lista legal: ela traz uma montagem por resultado, e trocar duas vezes a mesma
 * fileira, que a regra aceita, não estaria nela. Sem carta restante, não sobra destino. Os destinos só dependem de quantas
 * cartas cada fileira tem, então valem para qualquer carta que falte.
 */
export function nextDestinations(view: PlayerView, legal: PlayerAction[], picks: readonly EquipPick[]): Destination[] {
  if (!legal.some((a) => a.type === 'EQUIP')) return [];
  return nextEquipDestinations(
    view,
    validPicks(view, picks).map((pick) => pick.destination),
  );
}

/** As escolhas que valem: cada uma de uma numérica pendente diferente (as outras são ignoradas). */
function validPicks(view: PlayerView, picks: readonly EquipPick[]): Array<{ card: NumCard; destination: Destination }> {
  const seen = new Set<string>();
  const valid: Array<{ card: NumCard; destination: Destination }> = [];
  for (const { cardId, destination } of picks) {
    const card = view.self.pending.find((c) => c.id === cardId);
    if (!card || seen.has(cardId)) continue;
    seen.add(cardId);
    valid.push({ card, destination });
  }
  return valid;
}

/** As numéricas pendentes ainda sem destino, na ordem de compra. */
export function remainingCards(view: PlayerView, picks: readonly EquipPick[]): NumCard[] {
  const chosen = new Set(validPicks(view, picks).map(({ card }) => card.id));
  return view.self.pending.filter((card) => !chosen.has(card.id));
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

/** A mesa depois de aplicar as escolhas, na ordem delas, sem mexer na `view`. */
export function draftBoard(view: PlayerView, picks: readonly EquipPick[]): DraftBoard {
  const attackRow = [...view.self.attackRow];
  const defenseRow = [...view.self.defenseRow];
  const toGraveyard: NumCard[] = [];
  validPicks(view, picks).forEach(({ card, destination }) => {
    switch (destination) {
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

/**
 * As escolhas feitas e, depois delas, as cartas que faltam, na ordem de compra, com a regra de estouro do motor (spec §1.12).
 */
export function completeDraft(view: PlayerView, picks: readonly EquipPick[]): EquipPick[] {
  const made = validPicks(view, picks).map(({ card, destination }): EquipPick => ({ cardId: card.id, destination }));
  const draft = draftBoard(view, made);
  const rest = remainingCards(view, made);
  const auto = autoDestinations(view.config, { attack: draft.attackRow.length, defense: draft.defenseRow.length }, rest.length);
  return [...made, ...rest.map((card, i): EquipPick => ({ cardId: card.id, destination: auto[i]! }))];
}

/** A jogada do Equipar: os destinos e a ordem das cartas (`order`), na ordem das escolhas. */
export function equipAction(picks: readonly EquipPick[]): PlayerAction {
  return { type: 'EQUIP', destinations: picks.map((pick) => pick.destination), order: picks.map((pick) => pick.cardId) };
}

/** Envio antecipado: só com ≤ 1500 ms, ao menos uma escolha, sem confirmar e sem ter enviado. */
export function shouldAutoSendEquip(input: { remainingMs: number; chosen: number; submitted: boolean; sent: boolean }): boolean {
  return input.remainingMs <= EQUIP_AUTO_SEND_MS && input.chosen >= 1 && !input.submitted && !input.sent;
}
