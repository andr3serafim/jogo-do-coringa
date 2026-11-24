import { attackPower, defensePower, fullDefense, type PlayerView, type PublicPlayer, type RulesConfig } from '@coringa/engine';
import { cardsText, cardText, type Names } from './text.ts';

const TRIGGER_TEXT = {
  ATTACK: 'o oponente declarou ataque',
  K_PLAYED: 'o oponente jogou K',
  DEVASTATION: 'o oponente lançou uma Devastação',
  REFLECT_PLAYED: 'o oponente respondeu ao seu golpe com Reflect',
} as const;

/** O que o jogador precisa decidir agora. */
export function phaseText(view: PlayerView): string {
  const phase = view.phase;
  switch (phase.kind) {
    case 'EQUIP':
      return 'Sua vez: Equipar (as numéricas vão para o campo na ordem de compra)';
    case 'RESURRECTION':
      return 'Sua vez: Janela da Ressurreição (ressuscitar agora, antes do ataque, ou guardar)';
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

/** O escudo da Defesa Absoluta, ou os 4 Q depois dele, que seguram a frente da Defesa (regra 7). */
function defenseStatus(p: PublicPlayer, config: RulesConfig): string {
  if (p.absoluteDefense) return 'Defesa Absoluta (escudo)';
  return fullDefense(p, config) ? `Fortaleza (${config.buffLimit} Q): a Defesa não perde a frente` : '';
}

function playerBlock(label: string, p: PublicPlayer, hand: string, config: RulesConfig): string[] {
  const status = [p.reflect ? 'Reflect na mesa' : '', defenseStatus(p, config), p.resurrectionCount > 0 ? `Ressurreições: ${p.resurrectionCount}` : '']
    .filter(Boolean)
    .join(' · ');
  return [
    `${label.padEnd(5)} Vida ${p.hp}   Guarda: ${p.guard.length === 0 ? '—' : `${p.guard.length} K`}   Mão: ${hand}${status ? `   [${status}]` : ''}`,
    `      Bônus de Ataque: ${cardsText(p.attackBuffs)}   Bônus de Defesa: ${cardsText(p.defenseBuffs)}`,
    `      Ataque: ${cardsText(p.attackRow).padEnd(28)} ATK ${attackPower(p)}`,
    `      Defesa: ${cardsText(p.defenseRow).padEnd(28)} DEF ${defensePower(p)}`,
  ];
}

/** A mesa vista por quem joga no terminal: tudo o que a visão pública mostra + a própria mão. */
export function renderBoard(view: PlayerView, names: Names): string {
  const recent = view.graveyard.slice(-5).map(cardText).join(' ');
  const header = [
    `Rodada ${view.round} (${view.roundKind === 'EQUIP' ? 'Equipar' : 'Ataque'})`,
    `Monte ${view.deckCount}`,
    `Cemitério ${view.graveyard.length}${recent ? ` (últimas: ${recent})` : ''}`,
    `Iniciativa: ${names.of(view.initiative)}`,
  ].join(' · ');
  return [
    header,
    ...playerBlock(names.of(view.opponent.id).toUpperCase(), view.opponent, `${view.opponent.handCount} cartas`, view.config),
    ...playerBlock('VOCÊ', view.self, cardsText(view.self.hand), view.config),
    phaseText(view),
  ].join('\n');
}
