// Textos das jogadas da mesa, em pt-BR (spec §3.4). Fora da meta de cobertura: é só texto.
import type { AttackPreview, Card, RowName, SpecialCard } from '@coringa/engine';
import type { DeadlineKind } from '@coringa/protocol';
import { cardText, ROW_NAME } from '@coringa/sim/text';
import { previewChanged, type Previews } from './preview.ts';
import type { SceneKind } from './timeline.ts';

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

// ---------------------------------------------------------------------------------------------
// Equipar (spec §3.5)

export const UNDO_LABEL = 'Desfazer';
export const RESET_LABEL = 'Recomeçar';
export const CONFIRM_LABEL = 'Confirmar';

/** A fila das numéricas pendentes: "Carta 1 de 3". */
export const equipCardText = (index: number, total: number): string => `Carta ${index} de ${total}`;
export const equipWaitingText = (opponent: string): string => `Esperando ${opponent} montar…`;
export const equipConfirmedText = (opponent: string): string => `Você já confirmou; esperando ${opponent}`;
export const NO_PENDING_TEXT = 'Você não recebeu numéricas nesta rodada';
export const EQUIP_READY_TEXT = 'Tudo no lugar: confira a montagem e confirme.';

/** A quadra que o rascunho forma: o bônus é o valor, e cada quadra nova dá uma Ressurreição. */
export const equipQuadText = (value: number): string => `forma quadra de ${value}: +${value} e 1 Ressurreição`;

/** O que sai da fileira numa troca: " (sai 9♠)". */
export const leavingText = (card: Card): string => ` (sai ${cardText(card)})`;

/** O que o oponente está fazendo no Equipar, no campo dele. */
export const equipOpponentText = (pendingCount: number, submitted: boolean): string =>
  submitted || pendingCount === 0 ? 'pronto' : `montando ${pendingCount} ${pendingCount === 1 ? 'carta' : 'cartas'}…`;

/** A carta já posicionada no resumo: "7♥ → Fileira de Ataque". */
export const placedText = (card: Card, destination: string): string => `${cardText(card)} → ${destination}`;

// ---------------------------------------------------------------------------------------------
// Escolha da ordem (spec §3.6)

export const ORDER_QUESTION = 'Você tem a iniciativa: atacar primeiro ou em segundo?';
export const ORDER_AUTO_TEXT = '"Atacar primeiro" sai sozinho; toque para escolher com calma.';
export const ORDER_MANUAL_TEXT = 'Escolha quando quiser, dentro do prazo.';
export const orderWaitingText = (opponent: string): string => `${opponent} está escolhendo a ordem…`;

// ---------------------------------------------------------------------------------------------
// Janela de reação (spec §3.7)

export const PASS_LABEL = 'Passar';
export const PASSED_TEXT = 'Você passou; esperando a janela fechar…';

/** O gatilho e a prévia, para quem responde. A conta é do motor (`previewAttack`); aqui só a frase. */
export function attackDeclaredText(p: AttackPreview, opponent: string): string {
  const head = `${opponent} declarou ataque:`;
  switch (p.outcome) {
    case 'NO_ATTACK':
      return `${head} sem cartas no Ataque`;
    // Com Reflect a conta não é contra a sua Defesa: o motor usa metade da DEF base de quem ataca.
    case 'REFLECTED':
      return `${head} ${p.attack} → ${
        p.reflected > 0 ? `seu Reflect devolve ${p.reflected} de dano a ${opponent}` : 'seu Reflect anula o ataque'
      }`;
    case 'GUARD_ABSORBS':
      return `${head} ${p.attack} contra sua Defesa ${p.defense} → seu K absorve`;
    case 'ABSOLUTE_DEFENSE':
      return `${head} ${p.attack} contra sua Defesa ${p.defense} → sua Defesa Absoluta anula`;
    case 'DAMAGE':
      return `${head} ${p.attack} contra sua Defesa ${p.defense} → ${p.absolute ? 'Ataque Absoluto, ' : ''}dano ${p.damage}`;
  }
}

/** "Duda pôs 2 K na Guarda"; sem os eventos (recarga, resync) não se sabe quantos: "Duda pôs K na Guarda". */
export const guardPlayedText = (opponent: string, count: number | null): string =>
  `${opponent} pôs ${count === null ? '' : `${count} `}K na Guarda`;

export const reflectPlayedText = (opponent: string): string => `${opponent} lançou um Reflect`;

/** O turno do jogador que espera, congelado durante a janela de reação. */
export const pausedTurnText = (seconds: number): string => `seu turno: ${seconds} s, pausado`;

// ---------------------------------------------------------------------------------------------
// Relógio e avisos (spec §3.8, §3.9, §6.2)

export const TIMES_UP_TEXT = 'Tempo esgotado';
export const CLOCK_LABEL = 'Tempo do prazo';
export const CLOCK_URGENT_LABEL = 'Tempo do prazo: pouco tempo';
export const RECONNECTING_TEXT = 'Reconectando…';
export const SLOW_RETRY_TEXT = 'Muitas mensagens; reconectando em 30 s…';

/** O anúncio (leitor de tela) do começo de um prazo do próprio jogador, por tipo de prazo. */
const CLOCK_START_TEXT: Record<DeadlineKind, string> = {
  TURN: 'Sua vez',
  REACTION: 'Sua reação',
  EQUIP: 'Monte suas cartas',
  ORDER: 'Escolha a ordem',
};

const secondsText = (seconds: number): string => `${seconds} ${seconds === 1 ? 'segundo' : 'segundos'}`;

export function clockAnnouncementText(kind: DeadlineKind, announcement: 'start' | 'ten' | 'five', seconds: number): string {
  if (announcement === 'start') return `${CLOCK_START_TEXT[kind]}: ${secondsText(seconds)}`;
  return announcement === 'ten' ? '10 segundos' : '5 segundos';
}

/** "m:ss", para a contagem do W.O. */
export function mmss(totalSeconds: number): string {
  const seconds = Math.max(0, totalSeconds);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

/** O aviso de queda; sem `woAt` ainda não há contagem. */
export const droppedText = (opponent: string, remaining: string | null): string =>
  remaining === null ? `${opponent} caiu.` : `${opponent} caiu. Se não voltar em ${remaining}, você vence por W.O.`;

/** A versão fixa do aviso, para a região viva do leitor de tela (a contagem não é anunciada). */
export const droppedAnnouncement = (opponent: string): string =>
  `${opponent} caiu. Se não voltar a tempo, você vence por W.O.`;

/** O título grande de cada cena (spec §10.1). */
export const SCENE_TITLE: Record<SceneKind, string> = {
  EXODIA: 'EXÓDIA!',
  ABSOLUTE_ATTACK: 'ATAQUE ABSOLUTO',
  ABSOLUTE_DEFENSE: 'DEFESA ABSOLUTA',
  REFLECT_PLAYED: 'REFLECT',
  REFLECT_TRIGGERED: 'REFLECT',
};
