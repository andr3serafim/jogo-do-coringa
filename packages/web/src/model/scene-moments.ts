// Os instantes das cenas raras refeitas no sub-projeto 6 (fatia 2: o Ataque e a Defesa Absolutos), em ms desde o começo da
// cena. Medidos no protótipo aprovado (`docs/superpowers/specs/2026-10-31-direcao-visual-prototipo.html`) e arredondados. É a
// fonte única: a linha do tempo (a inversão e o golpe), o palco, os desenhos e os sons leem daqui, para o pico de cada um cair
// no mesmo instante. Puro: sem React nem DOM.

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

export const SCENE_MOMENTS: { ABSOLUTE_ATTACK: AttackMoments; ABSOLUTE_DEFENSE: DefenseMoments } = {
  ABSOLUTE_ATTACK: { barsIn: 280, transformAt: 1_430, titleAt: 1_700, ballAt: 2_740, hitAt: 3_200, bandOut: 4_050 },
  ABSOLUTE_DEFENSE: {
    barsIn: 280,
    shieldLandsAt: 1_180,
    queensAt: [1_630, 1_850, 2_070, 2_290],
    lockAt: 2_700,
    titleAt: 3_000,
    insigniaAt: 4_300,
  },
};

/** Quanto o nome carimbado fica na tela: entra (escala 3 → 1 com quique), segura ~1,2 s e sai crescendo (spec 6 §7). */
export const TITLE_MS = 1_500;
