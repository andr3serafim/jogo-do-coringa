// Textos das jogadas da mesa, em pt-BR (spec §3.4). Fora da meta de cobertura: é só texto.
import type { AttackPreview, Card, RowName, SpecialCard } from '@coringa/engine';
import { cardText, ROW_NAME } from '@coringa/sim/text';
import { previewChanged, type Previews } from './preview.ts';

export { cardText, ROW_NAME };

/** Onde fica uma carta do oponente que pode ser alvo. */
export type TargetZone = 'attackBuffs' | 'defenseBuffs' | 'guard';

const ZONE_TEXT: Record<TargetZone, string> = {
  attackBuffs: 'Buff de ataque',
  defenseBuffs: 'Buff de defesa',
  guard: 'Guarda',
};

/** "K♥ (Guarda)": o alvo na lista da barra de ação. */
export const targetText = (card: SpecialCard, zone: TargetZone): string => `${cardText(card)} (${ZONE_TEXT[zone]})`;

export const PLAY_TEXT = {
  PLAY_J: 'Buff de ataque',
  PLAY_Q: 'Buff de defesa',
  TRAP: 'Armadilha',
  SACRIFICE: 'Sacrifício',
} as const;

/** Papel que o Selvagem assume: "como J: Buff de ataque". */
export const asRoleText = (role: 'J' | 'Q' | 'A', play: string): string => `como ${role}: ${play}`;

/** "Pôr na Guarda" com um K só na mão; com vários, "Pôr 1 K", "Pôr 2 K"… */
export const guardText = (count: number, kingsInHand: number): string =>
  kingsInHand === 1 ? 'Pôr na Guarda' : `Pôr ${count} K`;

export const RESURRECT_ROW_TEXT: Record<RowName, string> = {
  ATK: `fileira de ${ROW_NAME.ATK}`,
  DEF: `fileira de ${ROW_NAME.DEF}`,
};

/** Aviso do ack `RATE_LIMITED` (spec §6.4). */
export const RATE_NOTICE = 'Devagar: muitas jogadas seguidas.';

/** Aviso do passe automático (spec §3.7). */
export const AUTO_PASS_NOTICE = 'Sem resposta possível; passando';

// ---------------------------------------------------------------------------------------------
// Barra de ação (spec §3.4)

export const SENDING_TEXT = 'Enviando…';
export const ATTACK_LABEL = 'Atacar';
export const END_TURN_LABEL = 'Encerrar turno';
/** Sob o "Encerrar turno": por que o botão principal não é "Atacar". */
export const EMPTY_ATTACK_TEXT = 'Sua fileira de Ataque está vazia';
export const CANCEL_LABEL = 'Cancelar';
export const REFLECT_LABEL = 'Lançar Reflect';
export const CANCEL_REFLECT_LABEL = 'Anular o Reflect';
export const PROTECT_LABEL = 'Proteger-se do Reflect';
export const RESURRECT_LABEL = 'Ressuscitar';

export const PICK_CARD_TEXT = 'Toque numa carta da mão para ver as jogadas.';
export const chooseCardText = (card: SpecialCard): string => `${cardText(card)}: escolha a jogada`;
export const noPlaysText = (card: SpecialCard): string => `${cardText(card)}: nenhuma jogada possível agora`;
export const chooseTargetText = (play: string, card: SpecialCard, opponent: string): string =>
  `${play} (${cardText(card)}): escolha o alvo de ${opponent}`;
export const waitingText = (opponent: string): string => `Esperando ${opponent} jogar…`;
export const reactingText = (opponent: string): string => `${opponent} pode reagir…`;

/** Quais cartas saem numa jogada de várias: "sai J♥ + Q♣ + K♥ do seu campo". */
export const leavesText = (cards: SpecialCard[], from: 'hand' | 'field'): string =>
  `sai ${cards.map(cardText).join(' + ')} ${from === 'hand' ? 'da sua mão' : 'do seu campo'}`;

const TARGET_PLACE: Record<TargetZone, string> = {
  guard: 'da Guarda de',
  attackBuffs: 'dos Buffs de Ataque de',
  defenseBuffs: 'dos Buffs de Defesa de',
};

const TARGET_ROLE: Record<TargetZone, 'K' | 'J' | 'Q'> = { guard: 'K', attackBuffs: 'J', defenseBuffs: 'Q' };

/** O papel da carta do oponente que é alvo: o Selvagem nos buffs conta como J ou Q. */
export const targetRole = (zone: TargetZone): 'K' | 'J' | 'Q' => TARGET_ROLE[zone];

/** O alvo como botão grande da barra: "K♣ da Guarda de Duda", "J♠ dos Buffs de Ataque de Duda". */
export function targetButtonText(card: SpecialCard, zone: TargetZone, owner: string): string {
  const who = card.kind === 'WILD' ? `Selvagem como ${TARGET_ROLE[zone]}` : cardText(card);
  return `${who} ${TARGET_PLACE[zone]} ${owner}`;
}

// Prévias: a conta é do motor (`previewAttack`); aqui só ficam as frases de cada desfecho.

/** O que acontece com o seu ataque, depois da conta "ATK × DEF". */
function attackOutcomeText(p: AttackPreview, opponent: string): string {
  switch (p.outcome) {
    case 'NO_ATTACK':
      return 'sem ataque';
    case 'GUARD_ABSORBS':
      return `o K de ${opponent} absorve, dano 0`;
    case 'ABSOLUTE_DEFENSE':
      return `Defesa Absoluta de ${opponent}, dano 0`;
    case 'REFLECTED':
      return `Reflect de ${opponent}: ${p.reflected > 0 ? `${p.reflected} de dano volta para você` : 'nada volta para você'}`;
    case 'DAMAGE':
      return `${p.absolute ? 'Ataque Absoluto, ' : ''}dano ${p.damage}`;
  }
}

/** "152 × 42 · o K de Duda absorve, dano 0": o texto do botão Atacar. */
export const attackPreviewText = (p: AttackPreview, opponent: string): string =>
  `${p.attack} × ${p.defense} · ${attackOutcomeText(p, opponent)}`;

/** O ataque do oponente contra a sua Defesa: "84 × sua Defesa 46 · seu K absorve, dano 0". */
export function threatPreviewText(p: AttackPreview, opponent: string): string {
  switch (p.outcome) {
    case 'NO_ATTACK':
      return 'sem ataque';
    // Com Reflect o motor usa metade da DEF base de quem ataca, e não a sua Defesa.
    case 'REFLECTED':
      return `${p.attack} × ${p.defense} · ${
        p.reflected > 0 ? `seu Reflect devolve ${p.reflected} de dano a ${opponent}` : 'seu Reflect anula o ataque, dano 0'
      }`;
    case 'GUARD_ABSORBS':
      return `${p.attack} × sua Defesa ${p.defense} · seu K absorve, dano 0`;
    case 'ABSOLUTE_DEFENSE':
      return `${p.attack} × sua Defesa ${p.defense} · sua Defesa Absoluta anula, dano 0`;
    case 'DAMAGE':
      return `${p.attack} × sua Defesa ${p.defense} · ${p.absolute ? 'Ataque Absoluto, ' : ''}dano ${p.damage}`;
  }
}

export const threatLabel = (opponent: string): string => `Ameaça de ${opponent}`;
export const brokenLabel = (role: 'K' | 'J' | 'Q'): string => `Quebrando o ${role} antes`;

/** O desfecho do seu ataque na frase curta do alvo ("110 de dano"). */
function attackEffectText(p: AttackPreview, opponent: string): string {
  return p.outcome === 'DAMAGE' ? `${p.absolute ? 'Ataque Absoluto, ' : ''}${p.damage} de dano` : attackOutcomeText(p, opponent);
}

/**
 * O que muda na conta se a carta do alvo sair: o seu ataque, se mudou, e a ameaça do oponente, se mudou. Na forma
 * `short` é a frase do botão do alvo ("110 de dano"); na `long`, a linha inteira da prévia ("152 × 42 · dano 110").
 */
export function brokenEffectText(before: Previews, after: Previews, opponent: string, form: 'short' | 'long'): string {
  const parts: string[] = [];
  if (previewChanged(before.mine, after.mine)) {
    parts.push(form === 'long' ? attackPreviewText(after.mine, opponent) : attackEffectText(after.mine, opponent));
  }
  if (previewChanged(before.threat, after.threat)) {
    parts.push(`ameaça de ${opponent} cai de ${before.threat.attack} para ${after.threat.attack}`);
  }
  return parts.length > 0 ? parts.join(' · ') : 'sem mudança na conta';
}

/** A frase sob o botão do alvo: "quebrando o K: 110 de dano". */
export const targetEffectText = (role: 'K' | 'J' | 'Q', effect: string): string => `quebrando o ${role}: ${effect}`;

// Cemitério (spec §3.4, §7)

export const GRAVEYARD_TITLE = 'Cemitério';
export const RESURRECT_TITLE = 'Ressuscitar';
export const GRAVEYARD_EMPTY_TEXT = 'O cemitério está vazio.';
export const graveyardListText = (count: number): string =>
  `${count} ${count === 1 ? 'carta' : 'cartas'}, a de cima primeiro.`;
export const RESURRECT_PICK_TEXT = 'Escolha a carta numérica que volta ao jogo.';
export const NO_RESURRECT_TEXT = 'Nenhuma carta pode ser ressuscitada agora.';
export const resurrectRowText = (card: Card): string => `Em qual fileira entra ${cardText(card)}?`;
export const resurrectRowDetail = (count: number, limit: number): string => `no fim da fileira · ${count} de ${limit}`;
export const CLOSE_LABEL = 'Fechar';
export const BACK_LABEL = 'Voltar';
