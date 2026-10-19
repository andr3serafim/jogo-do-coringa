// Textos das jogadas da mesa, em pt-BR (spec §3.4). Fora da meta de cobertura: é só texto.
import type { RowName, SpecialCard } from '@coringa/engine';
import { cardText, ROW_NAME } from '@coringa/sim/text';

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
