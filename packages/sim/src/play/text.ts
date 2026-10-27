import type { Action, Card, Destination, GameEvent, GameResult, PlayerId, PlayerView, RowName } from '@coringa/engine';
import { attackPower, defensePower } from '@coringa/engine';

const SUIT: Record<string, string> = { copas: '♥', ouros: '♦', espadas: '♠', paus: '♣' };

/** "7♥", "J♠", "Selvagem". */
export function cardText(card: Card): string {
  if (card.kind === 'WILD') return 'Selvagem';
  const symbol = SUIT[card.suit];
  return card.kind === 'NUM' ? `${card.value}${symbol}` : `${card.kind}${symbol}`;
}

export const cardsText = (cards: Card[]): string => (cards.length === 0 ? '—' : cards.map(cardText).join(' '));

export const ROW_NAME: Record<RowName, string> = { ATK: 'Ataque', DEF: 'Defesa' };

/** Nomes exibidos: "Você" / "Bot (greedy)", e a forma com "de" ("de você" / "do Bot (greedy)"). */
export interface Names {
  me: PlayerId;
  of(id: PlayerId): string;
  de(id: PlayerId): string;
}

export function namesFor(me: PlayerId, botLabel = 'Bot'): Names {
  return { me, of: (id) => (id === me ? 'Você' : botLabel), de: (id) => (id === me ? 'de você' : `do ${botLabel}`) };
}

/** Procura uma carta pelo id em tudo que a visão mostra. */
export function findCard(view: PlayerView, id: string): Card | undefined {
  const zones: Card[][] = [
    view.self.hand,
    view.self.pending,
    view.graveyard,
    ...[view.self, view.opponent].flatMap((p) => [p.attackRow, p.defenseRow, p.attackBuffs, p.defenseBuffs, p.guard]),
  ];
  return zones.flat().find((c) => c.id === id);
}

const idText = (view: PlayerView, id: string): string => {
  const card = findCard(view, id);
  return card ? cardText(card) : id;
};

export const DESTINATION_TEXT: Record<Destination, string> = {
  ATK: 'Fileira de Ataque',
  DEF: 'Fileira de Defesa',
  REPLACE_LAST_ATK: 'Trocar a última carta do Ataque',
  REPLACE_LAST_DEF: 'Trocar a última carta da Defesa',
  DISCARD: 'Descartar no cemitério',
};

/** Texto de uma ação legal, em pt-BR, como aparece no menu numerado. */
export function actionText(action: Action, view: PlayerView): string {
  const t = (id: string) => idText(view, id);
  switch (action.type) {
    case 'EQUIP':
      return `Equipar: ${view.self.pending.map((c, i) => `${cardText(c)} → ${DESTINATION_TEXT[action.destinations[i]]}`).join(', ')}`;
    case 'CHOOSE_ORDER':
      return action.first ? 'Atacar primeiro' : 'Atacar em segundo';
    case 'PLAY_J':
      return `Jogar ${t(action.cardId)} como J nos Buffs de Ataque`;
    case 'PLAY_Q':
      return `Jogar ${t(action.cardId)} como Q nos Buffs de Defesa`;
    case 'PLAY_K':
      return `Pôr ${action.cardIds.length} K na Guarda (${action.cardIds.map(t).join(' ')})`;
    case 'TRAP':
      return `Armadilha com ${t(action.cardId)}: destruir ${t(action.targetId)} do oponente`;
    case 'SACRIFICE':
      return `Sacrificar ${t(action.cardId)} para destruir ${t(action.targetId)} do oponente`;
    case 'REFLECT':
      return `Lançar Reflect (${t(action.kId)} + ${t(action.jId)} + ${t(action.qId)})`;
    case 'CANCEL_REFLECT':
      return `Anular o Reflect com ${t(action.kId)} + ${t(action.jId)} + ${t(action.qId)} da mão`;
    case 'PROTECT_FROM_REFLECT':
      return `Proteger-se do Reflect sacrificando ${t(action.jId)} + ${t(action.qId)} + ${t(action.kId)} do campo`;
    case 'RESURRECT':
      return `Ressuscitar ${t(action.cardId)} no fim da fileira de ${ROW_NAME[action.row]}`;
    case 'DECLARE_ATTACK':
      return `Declarar o ataque (ATK ${attackPower(view.self)} contra DEF ${defensePower(view.opponent)})`;
    case 'END_TURN':
      return 'Encerrar o turno (Ataque vazio, sem ataque)';
    case 'PASS':
      return 'Passar';
    case 'TIMEOUT':
      return 'Tempo esgotado';
    case 'FORFEIT':
      return 'Desistir';
  }
}

const REASON_TEXT: Record<Extract<GameResult, { kind: 'WIN' }>['reason'], string> = {
  HP: 'vida do oponente chegou a 0',
  EXODIA: 'Exódia',
  ANTI_STALL: 'anti-travamento, com mais vida',
  FORFEIT: 'W.O.',
};

export function resultText(result: GameResult, names: Names): string {
  if (result.kind === 'DRAW') return 'Fim de jogo: empate (anti-travamento, vidas iguais)';
  return `Fim de jogo: ${names.of(result.winner)} venceu (${REASON_TEXT[result.reason]})`;
}

const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);

/** Uma linha de log por evento, já redigido por `viewEvents`. null = evento sem interesse no terminal. */
export function eventText(e: GameEvent, names: Names): string | null {
  const who = (id: PlayerId) => names.of(id);
  const de = (id: PlayerId) => names.de(id);
  switch (e.type) {
    case 'RoundStarted':
      return `\n══ Rodada ${e.round}: ${e.kind === 'EQUIP' ? 'Equipar' : 'Ataque'} ══`;
    case 'DeckReshuffled':
      return `O cemitério (${e.count} cartas) foi embaralhado e virou o novo monte`;
    case 'CardsDealt':
      return e.cards ? `${who(e.player)} recebeu: ${cardsText(e.cards)}` : `${who(e.player)} recebeu ${e.count} cartas`;
    case 'EquipSubmitted':
      return `${who(e.player)} confirmou o Equipar`;
    case 'CardsPlaced': {
      const parts = e.placements.map((p) => {
        const card = cardText(p.card);
        if (p.destination === 'DISCARD') return `${card} descartada`;
        const row = p.destination === 'ATK' || p.destination === 'REPLACE_LAST_ATK' ? 'Ataque' : 'Defesa';
        return p.replaced ? `${card} no lugar de ${cardText(p.replaced)} (${row})` : `${card} → ${row}`;
      });
      return `${who(e.player)} equipou: ${parts.length === 0 ? 'nada' : parts.join(', ')}`;
    }
    case 'OrderChosen':
      return `${who(e.player)} escolheu atacar ${e.first ? 'primeiro' : 'em segundo'}`;
    case 'TurnStarted':
      return `→ Turno de ataque: ${who(e.player)}`;
    case 'BuffPlayed':
      return `${who(e.player)} jogou ${cardText(e.card)}${e.card.kind === 'WILD' ? ` como ${e.as}` : ''} nos Buffs de ${e.as === 'J' ? 'Ataque' : 'Defesa'}`;
    case 'GuardPlayed':
      return `${who(e.player)} pôs ${e.cards.length} K na Guarda`;
    case 'TrapUsed': {
      const used = e.as ? `com ${cardText(e.card)} (como ${e.as})` : `(${cardText(e.card)})`;
      return `${who(e.player)} usou Armadilha ${used} e destruiu ${cardText(e.target)} ${de(e.targetOwner)}`;
    }
    case 'Sacrificed':
      return `${who(e.player)} sacrificou ${cardText(e.card)}${e.as ? ` (como ${e.as})` : ''} e destruiu ${cardText(e.target)} ${de(e.targetOwner)}`;
    case 'ReflectPlayed':
      return `${who(e.player)} lançou um Reflect!`;
    case 'ReflectCanceled':
      return `${who(e.player)} anulou o Reflect ${de(e.owner)}`;
    case 'ReflectProtected':
      return `${who(e.player)} se protegeu do Reflect ${de(e.owner)}`;
    case 'ReflectExpired':
      return `O Reflect ${de(e.owner)} expirou`;
    case 'ReflectTriggered':
      return `O Reflect ${de(e.owner)} devolveu ${e.damage} de dano`;
    case 'ReactionWindowOpened':
    case 'ReactionWindowClosed':
      return null;
    case 'AttackDeclared':
      return `${who(e.player)} declarou o ataque`;
    case 'AbsoluteAttack':
      return `ATAQUE ABSOLUTO ${de(e.player)}!`;
    case 'DamageDealt':
      return `Ataque ${de(e.attacker)}: ${e.attack} contra ${e.defense} → ${e.damage} de dano`;
    case 'GuardBroken':
      return `${e.cards.length} ${plural(e.cards.length, 'K quebrou', 'K quebraram')} na Guarda ${de(e.player)}`;
    case 'BuffRemoved':
      return `${who(e.player)} perdeu ${cardsText(e.cards)} dos buffs`;
    case 'CardsRemovedFromRow':
      return e.cards.length === 0 ? null : `Saiu ${cardsText(e.cards)} do ${ROW_NAME[e.row]} ${de(e.player)}`;
    case 'QuadFormed':
      return `${who(e.player)} formou uma quadra de ${e.quad.value} no ${ROW_NAME[e.quad.row]}: +${e.quad.value} e 1 Ressurreição`;
    case 'QuadBroken':
      return `A quadra de ${e.quad.value} ${de(e.player)} se desfez`;
    case 'Resurrected':
      return `${who(e.player)} ressuscitou ${cardText(e.card)} na fileira de ${ROW_NAME[e.row]}`;
    case 'AbsoluteDefenseStarted':
      return `DEFESA ABSOLUTA ${de(e.player)}!`;
    case 'AbsoluteDefenseEnded':
      return `A Defesa Absoluta ${de(e.player)} terminou`;
    case 'InitiativeChanged':
      return `${who(e.player)} ficou com a iniciativa`;
    case 'Exodia':
      return `EXÓDIA ${de(e.player)}!`;
    case 'GameOver':
      return resultText(e.result, names);
  }
}
