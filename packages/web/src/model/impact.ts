// O peso de um golpe (sub-projeto 6 §5): leve, médio ou forte pelo dano. Vale para o som do golpe e para o que a mesa mostra (o
// tremor, os respingos de tinta). Puro: sem React, DOM nem Audio.

export type ImpactForce = 'leve' | 'medio' | 'forte';

/** Onde o golpe muda de peso, em pontos de dano: abaixo de `medio` é leve; de `medio` até `forte`, médio; de `forte` em diante, forte. */
export const DAMAGE_BANDS = { medio: 40, forte: 100 } as const;

/** O peso do golpe de `damage` pontos; dano zero (a defesa segurou tudo) não é golpe. */
export function impactForce(damage: number): ImpactForce | null {
  if (damage <= 0) return null;
  if (damage >= DAMAGE_BANDS.forte) return 'forte';
  if (damage >= DAMAGE_BANDS.medio) return 'medio';
  return 'leve';
}
