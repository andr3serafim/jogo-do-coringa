import { attackPower, defensePower, type PlayerView, type PublicPlayer } from '@coringa/engine';
import { cardsText, cardText, type Names } from './text.ts';

const TRIGGER_TEXT = { ATTACK: 'o oponente declarou ataque', K_PLAYED: 'o oponente jogou K', REFLECT_PLAYED: 'o oponente lançou Reflect' } as const;

/** O que o jogador precisa decidir agora. */
export function phaseText(view: PlayerView): string {
  const phase = view.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return 'Sua vez: Equipar (as numéricas vão para o campo na ordem de compra)';
    case 'ORDER_CHOICE':
      return 'Sua vez: Escolha da iniciativa';
    case 'ATTACK_MAIN':
      return 'Sua vez: fase principal do turno de ataque';
    case 'REACTION':
      return `Janela de reação: ${TRIGGER_TEXT[phase.trigger]}`;
    case 'GAME_OVER':
      return 'Fim de jogo';
  }
}

function playerBlock(label: string, p: PublicPlayer, pressure: number, hand: string): string[] {
  const status = [p.reflect ? 'Reflect ativo' : '', p.absoluteDefense ? 'Defesa Absoluta' : '', p.resurrectionCount > 0 ? `Ressurreições: ${p.resurrectionCount}` : '']
    .filter(Boolean)
    .join(' · ');
  return [
    `${label.padEnd(5)} Vida ${p.hp}   Guarda: ${p.guard.length === 0 ? '—' : `${p.guard.length} K`}   Mão: ${hand}${status ? `   [${status}]` : ''}`,
    `      Buffs de Ataque: ${cardsText(p.attackBuffs)}   Buffs de Defesa: ${cardsText(p.defenseBuffs)}`,
    `      Ataque: ${cardsText(p.attackRow).padEnd(28)} ATK ${attackPower(p, pressure)}`,
    `      Defesa: ${cardsText(p.defenseRow).padEnd(28)} DEF ${defensePower(p)}`,
  ];
}

/** A mesa vista por quem joga no terminal: tudo o que a visão pública mostra + a própria mão. */
export function renderBoard(view: PlayerView, names: Names): string {
  const recent = view.graveyard.slice(-5).map(cardText).join(' ');
  const header = [
    `Rodada ${view.round} (${view.roundKind === 'EQUIP' ? 'Equipar' : 'Ataque'})`,
    `Pressão +${view.pressure} (${view.noDamageStreak} sem dano)`,
    `Monte ${view.deckCount}`,
    `Cemitério ${view.graveyard.length}${recent ? ` (últimas: ${recent})` : ''}`,
    `Iniciativa: ${names.of(view.initiative)}`,
  ].join(' · ');
  return [
    header,
    ...playerBlock(names.of(view.opponent.id).toUpperCase(), view.opponent, view.pressure, `${view.opponent.handCount} cartas`),
    ...playerBlock('VOCÊ', view.self, view.pressure, cardsText(view.self.hand)),
    phaseText(view),
  ].join('\n');
}
