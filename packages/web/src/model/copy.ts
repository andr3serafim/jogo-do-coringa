// Textos das jogadas da mesa, em pt-BR (spec §3.4). Fora da meta de cobertura: é só texto.
import type { AttackPreview, Card, NoPlayReason, PlayerId, RowName, SpecialCard } from '@coringa/engine';
import type { DeadlineKind, Outcome, Score } from '@coringa/protocol';
import { cardText, ROW_NAME } from '@coringa/sim/text';
import type { TrainingLevel } from './local-room.ts';
import { previewChanged, type Lives, type Previews } from './preview.ts';
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
export const RESURRECT_LABEL = 'Ressuscitar';

export const PICK_CARD_TEXT = 'Toque numa carta da mão para ver as jogadas.';
export const chooseCardText = (card: SpecialCard): string => `${cardText(card)}: escolha a jogada`;
/**
 * Por que a carta não tem jogada agora (B2 do sub-projeto 5). O motivo é do motor (`noPlayReason`); aqui só o texto. O limite
 * de buffs vem da config da partida.
 */
export function noPlayReasonText(card: SpecialCard, reason: NoPlayReason | null, opponent: string, buffLimit: number): string {
  switch (reason) {
    case 'GAME_OVER':
      return 'a partida acabou';
    case 'EQUIP_ROUND':
      return 'no Equipar as especiais esperam na mão; elas se jogam nas rodadas de Ataque, no seu turno';
    case 'ORDER_CHOICE':
      return 'espere a escolha de quem ataca primeiro';
    case 'OPPONENT_TURN':
      return `espere a sua vez (agora é a de ${opponent})`;
    case 'REACTION_TRAP_ONLY':
      return 'na janela de reação só o A (ou o Selvagem como A) responde';
    case 'REACTION_REFLECT':
      return 'contra o Reflect, só outro Reflect (K + J + Q da mão)';
    case 'BUFF_LIMIT':
      return card.kind === 'Q'
        ? `seus Buffs de defesa já têm ${buffLimit} Q, o limite`
        : `seus Buffs de ataque já têm ${buffLimit} J, o limite`;
    case 'NO_TARGET':
      return `${opponent} não tem J, Q nem K para a Armadilha (as cartas do Reflect não contam)`;
    case 'NO_GUARD_TARGET':
      return `contra K jogado a Armadilha só mira a Guarda, e a de ${opponent} está vazia`;
    case 'TARGET_PROTECTED':
      return `${opponent} está sob Defesa Absoluta: nada de Armadilha nem Sacrifício`;
    case 'NO_ROLE':
      return `os seus buffs estão no limite e ${opponent} não tem alvo para a Armadilha`;
    case null:
      return 'nenhuma jogada possível agora';
  }
}

/** "J♥: seus Buffs de ataque já têm 4 J, o limite". */
export const noPlaysText = (card: SpecialCard, reason: NoPlayReason | null, opponent: string, buffLimit: number): string =>
  `${cardText(card)}: ${noPlayReasonText(card, reason, opponent, buffLimit)}`;
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

/**
 * " · derruba Duda" quando o `damage` que o motor calculou zera a `life` que resta (dano igual à vida derruba; dano 0, da Guarda
 * ou da Defesa Absoluta que absorvem, nunca). Nunca se deduz de ATK − DEF: o dano já vem depois da Guarda, da Defesa Absoluta e do Reflect.
 */
const knockoutText = (damage: number, life: number, who: string): string =>
  damage > 0 && damage >= life ? ` · derruba ${who}` : '';

/** O que o seu ataque derruba: o oponente (dano) ou você (o que o Reflect dele devolve); os dois nunca juntos. */
const myKnockoutText = (p: AttackPreview, opponent: string, lives: Lives): string =>
  knockoutText(p.damage, lives.opponent, opponent) + knockoutText(p.reflected, lives.self, 'você');

/** O que o ataque do oponente derruba: você (dano) ou ele (o que o seu Reflect devolve). */
const threatKnockoutText = (p: AttackPreview, opponent: string, lives: Lives): string =>
  knockoutText(p.damage, lives.self, 'você') + knockoutText(p.reflected, lives.opponent, opponent);

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

/** "152 × 42 · o K de Duda absorve, dano 0": o texto do botão Atacar. Acrescenta "· derruba Duda" (ou "· derruba você", contra o Reflect). */
export const attackPreviewText = (p: AttackPreview, opponent: string, lives: Lives): string =>
  `${p.attack} × ${p.defense} · ${attackOutcomeText(p, opponent)}${myKnockoutText(p, opponent, lives)}`;

/** O ataque do oponente contra a sua Defesa: "84 × sua Defesa 46 · seu K absorve, dano 0", ou "· dano 38 · derruba você". */
export function threatPreviewText(p: AttackPreview, opponent: string, lives: Lives): string {
  switch (p.outcome) {
    case 'NO_ATTACK':
      return 'sem ataque';
    // Com Reflect o motor usa metade da DEF base de quem ataca, e não a sua Defesa.
    case 'REFLECTED':
      return `${p.attack} × ${p.defense} · ${
        p.reflected > 0
          ? `seu Reflect devolve ${p.reflected} de dano a ${opponent}${threatKnockoutText(p, opponent, lives)}`
          : 'seu Reflect anula o ataque, dano 0'
      }`;
    case 'GUARD_ABSORBS':
      return `${p.attack} × sua Defesa ${p.defense} · seu K absorve, dano 0`;
    case 'ABSOLUTE_DEFENSE':
      return `${p.attack} × sua Defesa ${p.defense} · sua Defesa Absoluta anula, dano 0`;
    case 'DAMAGE':
      return `${p.attack} × sua Defesa ${p.defense} · ${p.absolute ? 'Ataque Absoluto, ' : ''}dano ${p.damage}${threatKnockoutText(p, opponent, lives)}`;
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
    parts.push(form === 'long' ? attackPreviewText(after.mine, opponent, after.lives) : attackEffectText(after.mine, opponent));
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

/** Quantas numéricas faltam pôr (E2: todas à vista, em qualquer ordem): "Faltam 3 cartas", "Falta 1 carta". */
export const equipLeftText = (left: number): string => (left === 1 ? 'Falta 1 carta' : `Faltam ${left} cartas`);
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
/** Sem relógio (treino e tutorial) não há prazo a que se referir. */
export const ORDER_MANUAL_NO_CLOCK_TEXT = 'Escolha quando quiser.';
export const orderWaitingText = (opponent: string): string => `${opponent} está escolhendo a ordem…`;

// ---------------------------------------------------------------------------------------------
// Janela de reação (spec §3.7)

export const PASS_LABEL = 'Passar';
export const PASSED_TEXT = 'Você passou; esperando a janela fechar…';

/** O gatilho e a prévia, para quem responde. A conta é do motor (`previewAttack`); aqui só a frase. */
export function attackDeclaredText(p: AttackPreview, opponent: string, lives: Lives): string {
  const head = `${opponent} declarou ataque:`;
  switch (p.outcome) {
    case 'NO_ATTACK':
      return `${head} sem cartas no Ataque`;
    // Com Reflect a conta não é contra a sua Defesa: o motor usa metade da DEF base de quem ataca.
    case 'REFLECTED':
      return `${head} ${p.attack} → ${
        p.reflected > 0
          ? `seu Reflect devolve ${p.reflected} de dano a ${opponent}${threatKnockoutText(p, opponent, lives)}`
          : 'seu Reflect anula o ataque'
      }`;
    case 'GUARD_ABSORBS':
      return `${head} ${p.attack} contra sua Defesa ${p.defense} → seu K absorve`;
    case 'ABSOLUTE_DEFENSE':
      return `${head} ${p.attack} contra sua Defesa ${p.defense} → sua Defesa Absoluta anula`;
    case 'DAMAGE':
      return `${head} ${p.attack} contra sua Defesa ${p.defense} → ${p.absolute ? 'Ataque Absoluto, ' : ''}dano ${p.damage}${threatKnockoutText(p, opponent, lives)}`;
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

/** O mesmo anúncio sem os segundos, para quando não há prazo (treino): "Sua vez", "Sua reação". */
export const turnCueText = (kind: DeadlineKind): string => CLOCK_START_TEXT[kind];

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

// ---------------------------------------------------------------------------------------------
// Fim da partida e revanche (spec §2.5)

/** Os apelidos da sala, do ponto de vista de quem olha (`tableNames`). */
export interface OutcomeNames {
  self: string;
  opponent: string;
}

export const END_EYEBROW = 'Fim da partida';
/** O nome da faixa em que o painel de fim se recolhe. */
export const END_RESULT_LABEL = 'Resultado da partida';
export const REMATCH_LABEL = 'Revanche';
export const VIEW_TABLE_LABEL = 'Ver a mesa';
export const NEW_ROOM_LABEL = 'Nova sala';
export const SHOW_RESULT_LABEL = 'Mostrar o resultado';
export const SCORE_LABEL = 'Placar';
/** No painel de fim, quando a partida ficou guardada com replay: leva ao visualizador. */
export const REVIEW_GAME_LABEL = 'Rever a partida';

/** Quem é o jogador `id` na frase: "Você" ou o apelido do oponente. */
const whoText = (id: PlayerId, me: PlayerId, names: OutcomeNames): string => (id === me ? 'Você' : names.opponent);

export const DURATION_LABEL = 'Duração';

/** A escolha da vida inicial, na criação da sala e no treino (sub-projeto 5, R3). */
export const HP_CHOICE_LABEL = 'Vida inicial';
export const hpChoiceText = (hp: number, isDefault: boolean): string => (isDefault ? `${hp} · padrão` : String(hp));

/** O tempo de partida no painel de fim (U5): "12:34", ou "1:02:03" passando de uma hora. */
export function durationText(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = String(total % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

/** O título do painel de fim termina em exclamação quando tem resultado ("Duda venceu!"); sem resultado, não. */
export const resultShouts = (outcome: Outcome): boolean => outcome.result !== null;

/** "Você venceu", "Duda venceu" ou "Partida sem resultado". */
export function resultTitle(outcome: Outcome, me: PlayerId, names: OutcomeNames): string {
  const { result } = outcome;
  if (result === null) return 'Partida sem resultado';
  return `${whoText(result.winner, me, names)} venceu`;
}

/**
 * Por que a partida acabou. Uma `cause` diferente de `NORMAL` vem do servidor (W.O.) e vale mais que o motivo do motor,
 * que nesses casos é só `FORFEIT`. Nos W.O., quem perdeu é o outro jogador, e a frase muda de pessoa ("Você" ou o apelido).
 */
export function reasonText(outcome: Outcome, me: PlayerId, names: OutcomeNames): string {
  const { result, cause } = outcome;
  if (result === null) return 'Os dois saíram da sala';
  const won = result.winner === me;
  const loser = won ? names.opponent : 'Você';
  if (cause === 'RECONNECT_TIMEOUT') return `${loser} caiu e não voltou em 60 s`;
  if (cause === 'AFK') return `${loser} estourou o tempo três vezes seguidas`;
  if (cause === 'CONCEDE') return `${loser} desistiu`;
  switch (result.reason) {
    case 'HP':
      return won ? `A vida de ${names.opponent} chegou a 0` : 'Sua vida chegou a 0';
    case 'EXODIA':
      return `${won ? 'Você' : names.opponent} montou a Exódia`;
    case 'FORFEIT':
      return `${loser} perdeu por W.O.`;
  }
}

/** "André 1 × 0 Duda": o placar da sala do ponto de vista de quem olha. */
export function scoreText(score: Score, me: PlayerId, names: OutcomeNames): string {
  const [mine, theirs] = me === 'p1' ? [score.p1, score.p2] : [score.p2, score.p1];
  return `${names.self} ${mine} × ${theirs} ${names.opponent}`;
}

/** O estado da revanche sob o botão; `null` quando nenhum dos dois pediu e o oponente está na sala. */
export function rematchStatusText(opponent: string, mine: boolean, theirs: boolean, away: boolean): string | null {
  if (mine) return away ? `esperando ${opponent} voltar` : theirs ? 'começando a revanche…' : `esperando ${opponent}`;
  if (theirs) return `${opponent} quer revanche`;
  return away ? `${opponent} saiu da sala` : null;
}

// ---------------------------------------------------------------------------------------------
// Menu da partida (spec §2.4)

export const MENU_LABEL = 'Menu da partida';
export const COPY_LINK_LABEL = 'Copiar link da sala';
export const AUTO_PASS_LABEL = 'Passar sozinho quando não tenho resposta';
export const REDUCE_MOTION_LABEL = 'Reduzir animações';
export const REDUCE_MOTION_SYSTEM_HINT = 'Ligada porque o seu sistema pede menos movimento.';
export const SOUND_LABEL = 'Som';
export const SWITCH_ON = 'Ligado';
export const SWITCH_OFF = 'Desligado';
export const RULES_LABEL = 'Resumo das regras';
export const CONCEDE_LABEL = 'Desistir';
export const CONCEDE_TITLE = 'Desistir da partida?';
export const CONCEDE_WARNING = 'Você perde esta partida por W.O.';
export const versionText = (version: string): string => `Versão publicada: ${version}`;

// ---------------------------------------------------------------------------------------------
// Treino contra o bot (spec §2.6)

/** Os níveis do bot (spec da fatia 1, §3): o nome, nos botões da escolha, na faixa central e no menu da partida. */
export const LEVEL_NAME: Record<TrainingLevel, string> = { facil: 'Fácil', medio: 'Médio', dificil: 'Difícil' };
/** A linha de cada nível na escolha. O Fácil joga ao acaso em boa parte das decisões; o Médio é o `greedy`; o Difícil busca. */
export const LEVEL_LINE: Record<TrainingLevel, string> = {
  facil: 'Erra bastante: bom para aprender',
  medio: 'Pensa só na jogada da vez',
  dificil: 'Pensa nas próximas rodadas',
};
export const TRAINING_CHOICE_TITLE = 'Treino';
export const TRAINING_CHOICE_HINT = 'Escolha o nível do bot.';
export const TRAINING_CHOICE_LABEL = 'Nível do bot';
/** No menu da partida, e a primeira parte da faixa central. */
export const trainingLevelText = (level: TrainingLevel): string => `Treino · ${LEVEL_NAME[level]}`;
/** Na faixa central, no lugar do relógio. */
export const trainingBandText = (level: TrainingLevel): string => `${trainingLevelText(level)}, sem relógio`;
/** O tutorial (`/tutorial`, spec do polimento, fatia 4): o nome do botão da tela inicial e o aviso de quando o pedaço dele não chega. */
export const LEARN_LABEL = 'Aprender jogando';
/** Na faixa central do tutorial, no lugar do relógio e do nível do bot. */
export const TUTORIAL_BAND_TEXT = 'Tutorial, sem relógio';
/** No menu da partida do tutorial. */
export const TUTORIAL_MENU_TEXT = 'Tutorial';
/** No menu da partida: sai do treino na hora, sem resultado. */
export const EXIT_TRAINING_LABEL = 'Sair do treino';
/** No painel de fim do treino, no lugar de "Nova sala". */
export const BACK_HOME_LABEL = 'Voltar ao início';
/** Desistir no treino não tem W.O.: não há quem dê a vitória por ausência. */
export const TRAINING_CONCEDE_WARNING = 'Você perde esta partida.';
export const TRAINING_LOADING_TEXT = 'Preparando o treino…';
export const TRAINING_FAILED_TITLE = 'Não deu para carregar o treino';
export const TRAINING_FAILED_TEXT = 'Confira a internet e tente de novo.';

// ---------------------------------------------------------------------------------------------
// Partidas anteriores (spec do polimento §4.3): a lista local e o replay, telas que chegam sob demanda

/** O botão da tela inicial e o título da lista. */
export const PAST_GAMES_LABEL = 'Partidas anteriores';
/** Do visualizador de volta à lista. */
export const BACK_TO_LIST_LABEL = 'Voltar à lista';
/** Enquanto o pedaço de uma tela carregada sob demanda não chega. */
export const SCREEN_LOADING_TEXT = 'Carregando…';
/**
 * Quando o pedaço de uma tela carregada sob demanda não chega (a rede caiu, o deploy novo tirou o arquivo velho) e o botão que
 * recarrega a página. Moram aqui, e não no `past-games-copy.ts`: quem os mostra é a casca, e o pedaço que falhou não chegaria.
 */
export const SCREEN_LOAD_FAILED_TEXT = 'Não deu para abrir esta tela. Atualize a página.';
export const REFRESH_LABEL = 'Atualizar';
/** Na faixa central da mesa do replay, no lugar do relógio (a mesa é a de sempre, só de vista). Mora aqui porque a `CenterBand` está no JavaScript inicial. */
export const REPLAY_BAND_TEXT = 'Revendo a partida';

// ---------------------------------------------------------------------------------------------
// Resumo das regras (spec 1 §1.6 a §1.8; revisado pela sessão principal em 2026-10-21, por delegação do autor)

export interface RulesSection {
  title: string;
  items: readonly string[];
}

export const RULES_SECTIONS: readonly RulesSection[] = [
  {
    title: 'Objetivo',
    items: ['Zere a vida do Coringa do oponente (cada um começa com 500, ou com a vida que a sala escolheu) ou monte a Exódia.'],
  },
  {
    title: 'Rodadas',
    items: [
      'O ciclo é Equipar, Equipar, Ataque, Equipar, Ataque, e assim por diante.',
      'Equipar: cada jogador recebe 4 cartas. As especiais (J, Q, K, A e Coringa Selvagem) vão para a mão. As numéricas vão para o campo: você vê todas de uma vez e você escolhe a fileira e a ordem de cada uma, Ataque ou Defesa (8 cartas no máximo em cada); a primeira que você põe numa fileira fica na frente da fila. Com as duas cheias, a nova carta substitui a última de uma fileira (a antiga vai para o cemitério) ou é descartada. Os dois montam ao mesmo tempo, em segredo.',
      'Ataque: quem tem a iniciativa escolhe atacar primeiro ou em segundo. Cada jogador tem um turno: joga as especiais que quiser e declara o ataque, que é obrigatório se a fileira de Ataque tiver cartas.',
      'Iniciativa: começa sorteada. No fim de cada rodada de Ataque, fica com quem causou mais dano nela (o dano devolvido por um Reflect conta para quem o lançou). No empate, inclusive 0 a 0, não muda.',
    ],
  },
  {
    title: 'O ataque',
    items: [
      'ATK = (soma da fileira de Ataque + bônus de quadra) × (1 + número de J).',
      'DEF = (soma da fileira de Defesa + bônus de quadra) × (1 + número de Q).',
      'O dano é ATK menos DEF, no mínimo 0. Depois, a primeira carta da fileira de Ataque de quem atacou e a primeira da fileira de Defesa de quem defendeu vão para o cemitério.',
      'Se o ataque causaria dano e o alvo tem K na Guarda, 1 K absorve todo o dano e quebra.',
    ],
  },
  {
    title: 'Cartas especiais',
    items: [
      'J (Buff de Ataque) e Q (Buff de Defesa): cada um soma 1 ao multiplicador de ataque ou de defesa. Cabem 4 de cada.',
      'K (Guarda): absorve o dano, como acima. Você pode jogar vários K de uma vez; o oponente ganha uma janela de reação.',
      'A (Armadilha): destrói 1 J, Q ou K do campo do oponente. Vale no seu turno ou na janela de reação. Não alcança um Reflect ativo nem quem está sob Defesa Absoluta.',
      'Sacrifício: no seu turno, descarte um J da mão para destruir um J do oponente, ou um Q para destruir um Q. Não funciona contra Defesa Absoluta.',
      'Coringa Selvagem: assume o papel de J, Q ou A, nunca o de K.',
      'Reflect (K + J + Q da mão, no seu turno): fica ativo até o fim do próximo turno de ataque do oponente. Se ele atacar, perde todos os K e Q que tiver e leva de volta o próprio ataque, com o multiplicador, menos metade (arredondada para baixo) da Defesa base dele, sem o multiplicador (o dano nunca fica abaixo de 0). Você não leva nada. Se ele estiver sob Defesa Absoluta, perde só os K e não leva dano. Para anular o Reflect, o oponente joga K + J + Q da mão, na janela de reação do lançamento, ou sacrifica J + Q + K do próprio campo, nessa janela ou no próprio turno, antes de atacar.',
    ],
  },
  {
    title: 'Janela de reação',
    items: [
      'Abre para o oponente quando você declara ataque, joga K ou lança um Reflect, mesmo que ele não tenha resposta.',
      'Quem responde pode usar A quantas vezes quiser e depois passa: contra o ataque, o A destrói um J, Q ou K de quem atacou; contra um K jogado, só um K da Guarda. Contra um Reflect, pode anulá-lo ou se proteger, e isso fecha a janela na hora. Não há resposta a uma resposta.',
    ],
  },
  {
    title: 'Combos',
    items: [
      'Quadra: 4 ou mais numéricas do mesmo valor na mesma fileira, seguidas ou não, somam esse valor à fileira e dão 1 Ressurreição. Uma fileira pode ter duas quadras de valores diferentes, e cada uma conta.',
      'Ressurreição: no seu turno, traz 1 numérica do cemitério para o fim de uma fileira com vaga. Vale uma vez por quadra e fica disponível enquanto a quadra existir, com garantia de 3 rodadas depois de formada.',
      'Defesa Absoluta (4 Q): até o oponente atacar, você é imune a dano, a Armadilha e a Sacrifício, e a fileira de Defesa não perde cartas. Só o Ataque Absoluto fura a imunidade a dano: quebra os seus K e causa o dano normal. Depois do primeiro ataque do oponente, ela acaba e 1 Q vai para o cemitério.',
      'Ataque Absoluto (4 J): multiplicador 5× e quebra todos os K do alvo. Depois do ataque, 1 J vai para o cemitério.',
      'Exódia (4 K na Guarda): vence na hora, depois da janela de reação.',
    ],
  },
  {
    title: 'Fim da partida',
    items: [
      'Vida em 0 perde na hora.',
      'Não há limite de rodadas: a partida só acaba pela vida, pela Exódia ou por W.O.',
      'W.O.: perde quem fica mais de 1 minuto fora da sala ou estoura o tempo três vezes seguidas.',
    ],
  },
];
