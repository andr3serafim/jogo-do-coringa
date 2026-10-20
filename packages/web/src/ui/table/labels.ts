// Textos da mesa em pt-BR (spec §3.1). Só frases; o que é regra vem do motor.
import type { PlayerView, SpecialCard } from '@coringa/engine';

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

const plural = (n: number, one: string, many: string): string => (n === 1 ? one : many);

/** "Mão de Duda: 3 cartas". */
export const handCountText = (name: string, count: number): string =>
  `Mão de ${name}: ${count === 0 ? 'sem cartas' : `${count} ${plural(count, 'carta', 'cartas')}`}`;

export const resurrectionsText = (count: number): string =>
  `${count} ${plural(count, 'Ressurreição disponível', 'Ressurreições disponíveis')}`;

export const streakText = (count: number): string => `${count} ${plural(count, 'rodada', 'rodadas')} sem dano`;

/** Faltando 2 rodadas ou menos para o anti-travamento (spec §3.1). */
export const stallWarning = (remaining: number): string =>
  `${plural(remaining, 'falta', 'faltam')} ${remaining} ${plural(remaining, 'rodada', 'rodadas')} sem dano para o fim por anti-travamento`;

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

/** O nome acessível do botão do histórico, com a contagem do que é novo. */
export const historyButtonName = (news: number): string =>
  news === 0 ? 'Histórico' : `Histórico, ${news} ${plural(news, 'novo', 'novos')}`;

/** O nome acessível do cemitério. */
export const graveyardName = (count: number, top: string | null): string =>
  top === null ? 'Cemitério vazio' : `Ver o cemitério: ${count} ${plural(count, 'carta', 'cartas')}, a de cima é ${top}`;
