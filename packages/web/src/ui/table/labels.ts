// Textos da mesa em pt-BR (spec §3.1). Só frases; o que é regra vem do motor.
import type { PlayerId, PlayerView, SpecialCard } from '@coringa/engine';
import type { RoomMessage } from '@coringa/protocol';

/** O papel escrito em cada carta da mão (spec §3.1). */
export const HAND_ROLE: Record<SpecialCard['kind'], string> = {
  K: 'Guarda',
  J: 'Buff de ataque',
  Q: 'Buff de defesa',
  A: 'Armadilha',
  WILD: 'Selvagem',
};

export interface TableNames {
  self: string;
  opponent: string;
}

/** Os apelidos da sala: o seu e o do oponente ("Você" e "Oponente" enquanto a sala não chegou). */
export function tableNames(room: RoomMessage | null, me: PlayerId): TableNames {
  const mine = room?.seats.find((seat) => seat.playerId === me);
  const theirs = room?.seats.find((seat) => seat.playerId !== me);
  return { self: mine?.nickname ?? 'Você', opponent: theirs?.nickname ?? 'Oponente' };
}

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** "Mão de Duda: 3 cartas". */
export const handCountText = (name: string, count: number): string =>
  `Mão de ${name}: ${count === 0 ? 'sem cartas' : `${count} ${plural(count, 'carta', 'cartas')}`}`;

export const resurrectionsText = (count: number): string =>
  `${count} ${plural(count, 'Ressurreição disponível', 'Ressurreições disponíveis')}`;

/** A segunda linha do botão Ressuscitar (U2): de onde a Ressurreição vem e o que há para trazer. */
export const resurrectDetailText = (count: number, numerics: number): string =>
  `${count} ${plural(count, 'Ressurreição da quadra', 'Ressurreições das quadras')} · ${numerics} ${plural(numerics, 'numérica', 'numéricas')} no cemitério`;

/** De quem é a vez, na faixa central (o tipo da rodada vem na frente). */
export function turnText(view: PlayerView, names: TableNames): string {
  const kind = view.roundKind === 'EQUIP' ? 'Equipar' : 'Ataque';
  const { phase } = view;
  switch (phase.kind) {
    case 'EQUIP':
      return `${kind} · os dois montam`;
    case 'ORDER_CHOICE':
      return `${kind} · ${phase.player === view.me ? 'você escolhe' : `${names.opponent} escolhe`} a ordem`;
    case 'ATTACK_MAIN':
      return `${kind} · ${phase.player === view.me ? 'sua vez' : `vez de ${names.opponent}`}`;
    case 'REACTION':
      return `${kind} · ${phase.responder === view.me ? 'sua reação' : `${names.opponent} pode reagir`}`;
    case 'GAME_OVER':
      return 'Fim de jogo';
  }
}

/** "Você, atacando primeiro": quem tem a iniciativa e, depois da escolha, a ordem da rodada. */
export function initiativeText(view: PlayerView, names: TableNames): string {
  const holder = view.initiative === view.me ? 'Você' : names.opponent;
  const { phase } = view;
  if (phase.kind === 'ORDER_CHOICE') return `${holder}, escolhendo a ordem`;
  if (view.roundKind === 'EQUIP' || phase.kind === 'EQUIP' || phase.kind === 'GAME_OVER') return holder;
  return `${holder}, atacando ${view.turnOrder[0] === view.initiative ? 'primeiro' : 'em segundo'}`;
}

/**
 * O placar da iniciativa (autor, 2026-10-31: "eu tenho iniciativa e eu não sei por quê"): na rodada de Ataque, o dano de cada um
 * até agora, que decide a próxima; fora dela (Equipar, escolha da ordem, fim), o motivo de quem a tem. Os números são do motor
 * (`damageThisRound`, `lastInitiative`).
 */
export function initiativeScoreText(view: PlayerView, names: TableNames): string {
  const { phase } = view;
  if (view.roundKind === 'ATTACK' && (phase.kind === 'ATTACK_MAIN' || phase.kind === 'REACTION')) {
    return `Dano na rodada: você ${view.self.damageThisRound} · ${names.opponent} ${view.opponent.damageThisRound}`;
  }
  return initiativeReasonText(view);
}

/** "sorteada no início", "mais dano na última rodada (14 × 9)", "empate na última rodada (5 × 5)": a última decisão do motor. */
export function initiativeReasonText(view: PlayerView): string {
  const last = view.lastInitiative;
  if (last === null) return 'sorteada no início';
  const [holder, other] = lastInitiativeDamage(view);
  return `${last.changed || holder !== other ? 'mais dano' : 'empate'} na última rodada (${holder} × ${other})`;
}

/** O dano de quem ficou com a iniciativa e o do outro, na última rodada de Ataque. */
export function lastInitiativeDamage(view: PlayerView): [number, number] {
  const last = view.lastInitiative;
  if (last === null) return [0, 0];
  const other = last.player === view.me ? view.opponent.id : view.me;
  return [last.damage[last.player] ?? 0, last.damage[other] ?? 0];
}

/** Sob a pergunta da ordem (só quem tem a iniciativa a vê): por que ela é sua. */
export function orderReasonText(view: PlayerView): string {
  const last = view.lastInitiative;
  if (last === null) return 'Ela foi sorteada no início da partida.';
  const [holder, other] = lastInitiativeDamage(view);
  return last.changed || holder !== other
    ? `Você causou mais dano na última rodada de Ataque (${holder} × ${other}).`
    : `Empate em dano na última rodada de Ataque (${holder} × ${other}): ela não mudou.`;
}

/** O nome acessível do botão do histórico, com a contagem do que é novo. */
export const historyButtonName = (news: number): string =>
  news === 0 ? 'Histórico' : `Histórico, ${news} ${plural(news, 'novo', 'novos')}`;

/**
 * O nome acessível do cemitério. Começa pelo texto visível do botão ("Cemitério 3", e "novo" quando o chip aparece): o axe exige
 * que o texto visível seja trecho contínuo do nome (WCAG 2.5.3).
 */
export const graveyardName = (count: number, top: string | null, isNew = false): string =>
  top === null ? 'Cemitério vazio' : `Cemitério ${count}${isNew ? ', novo' : ''}, a de cima é ${top}`;
