// Os instantes das cenas raras refeitas no sub-projeto 6 (fatia 2: o Ataque e a Defesa Absolutos; fatia 3: a Exódia e a
// Devastação; fatia 4: o Reflect), em ms desde o começo da cena. Medidos no protótipo aprovado
// (`docs/superpowers/specs/2026-10-31-direcao-visual-prototipo.html`) e arredondados. É a fonte única: a linha do tempo (a
// inversão e o golpe), o palco, os desenhos e os sons leem daqui, para o pico de cada um cair no mesmo instante. Puro: sem React
// nem DOM.

/** O Ataque Absoluto (spec 6 §7.1): 4,5 s no total (`SCENE_MS.AbsoluteAttack`). */
export interface AttackMoments {
  /** As tarjas de cinema terminam de entrar. */
  barsIn: number;
  /** Os 4 J entram no Coringa: os olhos acendem, a aura explode, o chão racha. */
  transformAt: number;
  /** O nome carimba. */
  titleAt: number;
  /** A bola de energia começa a se formar. */
  ballAt: number;
  /** O feixe acerta o retrato do alvo: a inversão, o número, os respingos e a vida que desce. */
  hitAt: number;
  /** A faixa da cena começa a sair. */
  bandOut: number;
}

/** A Defesa Absoluta (spec 6 §7.2): 4,8 s no total (`SCENE_MS.AbsoluteDefenseStarted`). */
export interface DefenseMoments {
  barsIn: number;
  /** O escudo crava no chão. */
  shieldLandsAt: number;
  /** Cada um dos 4 Q crava no seu quarto do brasão. */
  queensAt: readonly [number, number, number, number];
  /** A trava: os rebites já acesos, o emblema crava, a inversão. */
  lockAt: number;
  titleAt: number;
  /** O escudo encolhe e voa até o retrato do dono, onde vira a insígnia. */
  insigniaAt: number;
}

/** A Exódia (spec 6 §7.3): 5,8 s no total (`SCENE_MS.Exodia`). Cada K leva 200 ms para entrar e mais 90 ms até o seguinte. */
export interface ExodiaMoments {
  barsIn: number;
  /** Cada um dos 4 K chega à cruz e ergue o seu pilar de luz. */
  kingsAt: readonly [number, number, number, number];
  /** A coroa crava no Coringa (cai em 380 ms até aqui): os olhos acendem, a inversão. */
  crownAt: number;
  titleAt: number;
  /** A vida do perdedor escorre até zero. */
  drainAt: number;
  /** O retrato do perdedor racha. */
  crackAt: number;
  bandOut: number;
}

/** A Devastação (spec 6 §7.4): 3,1 s no campo, sobre a fileira atingida (`SCENE_MS.RowDevastated`). */
export interface DevastationMoments {
  /** Até aqui a terra ronca: o campo do alvo treme. */
  rumbleUntil: number;
  /** A fenda corre pela fileira. */
  crackAt: number;
  /** O chão se abre e as cartas caem no abismo: a inversão. */
  openAt: number;
  titleAt: number;
  /** A poeira assenta: a fileira fica desolada. */
  settleAt: number;
}

/** A Devastação cancelada (spec 6 §7.4): 1,4 s; a terra ronca, a fenda começa e para, sem abismo, nome nem inversão. */
export interface CanceledMoments {
  rumbleUntil: number;
  crackAt: number;
  /** A fenda para e o tremor acaba. */
  stopAt: number;
}

/** O Reflect jogado (spec 6 §7.5): 1,5 s (`SCENE_MS.ReflectPlayed`). Cada carta voa por 220 ms até a sua ponta. */
export interface ReflectPlayedMoments {
  /** O K, o J e o Q saem, um a um. */
  cardsAt: readonly [number, number, number];
  /** O espelho começa a se formar: faíscas nas três pontas. */
  mirrorAt: number;
  /** O espelho assentou. */
  settledAt: number;
  /** Ele começa a encolher até a zona "Reflect ativo". */
  shrinkAt: number;
  /** Ele já está na zona. */
  doneAt: number;
}

/** O ataque que bate no Reflect (spec 6 §7.5): 3,8 s (`SCENE_MS.ReflectTriggered`). Até `launchAt`, a esfera junta energia. */
export interface ReflectTriggeredMoments {
  /** O cometa parte. */
  launchAt: number;
  /** O tempo quase para: o cometa se arrasta. */
  slowAt: number;
  /** O tempo volta. */
  slowUntil: number;
  /** O cometa bate no espelho: a inversão, a ondulação, e ele volta dourado (ou se desfaz, sem dano). */
  mirrorHitAt: number;
  /** A volta acerta o retrato de quem atacou: o número, a vida, os cacos. */
  returnHitAt: number;
  titleAt: number;
}

/** Reflect contra Reflect (spec 6 §7.5): 1,4 s (`SCENE_MS.ReflectCanceled`), sem cometa, nome nem inversão. */
export interface ReflectCanceledMoments {
  /** Os dois espelhos trincam. */
  crackAt: number;
  /** Eles somem. */
  fadeAt: number;
}

export const SCENE_MOMENTS: {
  ABSOLUTE_ATTACK: AttackMoments;
  ABSOLUTE_DEFENSE: DefenseMoments;
  EXODIA: ExodiaMoments;
  DEVASTATION: DevastationMoments;
  DEVASTATION_CANCELED: CanceledMoments;
  REFLECT_PLAYED: ReflectPlayedMoments;
  REFLECT_TRIGGERED: ReflectTriggeredMoments;
  REFLECT_CANCELED: ReflectCanceledMoments;
} = {
  ABSOLUTE_ATTACK: { barsIn: 280, transformAt: 1_430, titleAt: 1_700, ballAt: 2_740, hitAt: 3_200, bandOut: 4_050 },
  ABSOLUTE_DEFENSE: {
    barsIn: 280,
    shieldLandsAt: 1_180,
    queensAt: [1_630, 1_850, 2_070, 2_290],
    lockAt: 2_700,
    titleAt: 3_000,
    insigniaAt: 4_300,
  },
  EXODIA: { barsIn: 280, kingsAt: [480, 770, 1_060, 1_350], crownAt: 2_550, titleAt: 2_850, drainAt: 3_800, crackAt: 4_300, bandOut: 5_200 },
  DEVASTATION: { rumbleUntil: 950, crackAt: 950, openAt: 1_170, titleAt: 1_520, settleAt: 1_600 },
  DEVASTATION_CANCELED: { rumbleUntil: 950, crackAt: 950, stopAt: 1_100 },
  REFLECT_PLAYED: { cardsAt: [0, 120, 240], mirrorAt: 440, settledAt: 740, shrinkAt: 1_100, doneAt: 1_400 },
  REFLECT_TRIGGERED: { launchAt: 540, slowAt: 840, slowUntil: 1_890, mirrorHitAt: 1_980, returnHitAt: 2_300, titleAt: 2_300 },
  REFLECT_CANCELED: { crackAt: 500, fadeAt: 900 },
};

/** Quanto o nome carimbado fica na tela: entra (escala 3 → 1 com quique), segura ~1,2 s e sai crescendo (spec 6 §7). */
export const TITLE_MS = 1_500;
