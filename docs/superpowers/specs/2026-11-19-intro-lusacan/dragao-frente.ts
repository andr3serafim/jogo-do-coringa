// O dragão de frente da logo LUSACAN nova (decisoes.md 2026-11-19 (1)): simétrico, de asas abertas, olhando para quem vê. Desenho
// original do projeto, em vetor feito à mão; o vídeo de referência do autor foi guia de pose e de ritmo, nada decalcado (spec §10.6).
//
// Só a metade esquerda é desenhada: a direita é a mesma peça espelhada (`scale(-1 1)`). As unidades são pixels de um quadro de
// 1920 × 1080 com o dragão na escala 1; o peito é a origem. Cada asa tem o pivô no ombro (a origem do desenho dela), e quem a põe no
// lugar é um `<g transform>` de fora, como na logo de hoje (`lusacan-shapes.ts`): a animação gira a asa no ombro sem `transform-origin`.
//
// Quando a prévia for aprovada, esta geometria vai para o `packages/web/src/ui/intro/lusacan-shapes.ts` (numa caixa de logo nova).

/** Onde fica o ombro esquerdo, a partir do peito (o direito é o espelho), e o quanto a asa em repouso sobe (graus; positivo levanta a ponta). */
export const FRONT_SHOULDER = { x: -60, y: -46, rest: 12 } as const;

/** A asa esquerda, com o ombro na origem. */
export const FRONT_WING = {
  /** A membrana: do ombro ao pulso (a garra do polegar em cima), daí à ponta de fora, e as bordas em arco entre os dedos até o flanco. */
  membrane:
    'M0 0C-56 -44 -168 -172 -290 -240L-312 -282L-298 -236C-440 -244 -620 -204 -800 -96Q-664 -36 -706 100Q-584 66 -536 206Q-450 118 -340 244Q-262 152 -50 184Q-34 92 0 0Z',
  /** O braço (do ombro ao pulso), mais grosso. */
  arm: 'M0 0C-56 -44 -168 -172 -290 -240',
  /** Os dedos, do pulso a cada ponta. */
  fingers:
    'M-290 -240Q-548 -200 -800 -96M-290 -240Q-520 -98 -706 100M-290 -240Q-416 -24 -536 206M-290 -240Q-322 4 -340 244',
  /** A garra do polegar, no pulso. */
  thumb: 'M-294 -234L-318 -290L-282 -244Z',
  /** Os veios de raio na membrana (a marca da logo de hoje), um entre cada par de dedos. */
  veins:
    'M-334 -218L-378 -200L-392 -210L-448 -184L-470 -194L-530 -164M-330 -184L-372 -144L-386 -152L-428 -98L-454 -100L-490 -40M-320 -152L-350 -98L-364 -102L-388 -36L-404 -34L-430 42M-304 -122L-314 -60L-302 -50L-310 12L-322 22L-318 94',
} as const;

/** O corpo, com o peito na origem. */
export const FRONT_BODY = {
  /** O pescoço grosso entre a cabeça e o peito. */
  neck: 'M-42 -132C-50 -92 -62 -56 -82 -26L82 -26C62 -56 50 -92 42 -132Z',
  /** Os ombros, as massas de onde saem as asas e as patas. */
  shoulder: 'M-66 -38C-100 -50 -126 -28 -126 6C-124 32 -104 46 -82 40Z',
  /** O tronco: do peito largo ao quadril, afinando. */
  torso: 'M-74 -32C-122 -2 -126 84 -98 152C-80 198 -44 226 0 230C44 226 80 198 98 152C126 84 122 -2 74 -32Z',
  /** O ventre: uma faixa de placas mais clara, do peito ao quadril, e as juntas entre as placas. */
  belly: 'M-46 -14C-60 60 -50 150 0 214C50 150 60 60 46 -14Q0 -2 -46 -14Z',
  bellyJoints: [14, 42, 70, 98, 126, 154, 182]
    .map((y, i) => {
      const w = 50 - i * 5.4;
      return `M${-w} ${y}Q0 ${y + 10} ${w} ${y}`;
    })
    .join(''),
  /** A cabeça de frente: o crânio largo entre os chifres, as maçãs salientes, afinando até o focinho. */
  head: 'M0 -254C38 -254 68 -238 76 -210C82 -186 74 -164 60 -146C48 -128 34 -108 24 -92C18 -82 -18 -82 -24 -92C-34 -108 -48 -128 -60 -146C-74 -164 -82 -186 -76 -210C-68 -238 -38 -254 0 -254Z',
  /** O sulco do focinho. */
  snout: 'M0 -156L0 -98',
  /** As sobrancelhas em lâmina, por cima dos olhos (a esquerda; a direita é o espelho). */
  brow: 'M-66 -204L-14 -192L-18 -182L-60 -190Z',
  /** O olho esquerdo, em amêndoa inclinada. */
  eye: 'M-54 -184L-20 -174L-46 -166Z',
  /** As narinas. */
  nostril: { cx: -10, cy: -102, rx: 4.5, ry: 2.8 },
  /** O chifre: nasce no alto da testa, sobe e varre para trás e para fora, afinando. */
  horn: 'M-30 -246C-52 -284 -92 -314 -150 -330C-104 -304 -76 -272 -58 -226Z',
  /** As escamas em espinho na bochecha, curtas. */
  cheek: 'M-74 -178L-98 -170L-76 -162L-90 -150L-68 -152Z',
  /** A pata da frente, pendurada do ombro, com três garras. */
  arm: 'M-82 0C-108 34 -118 80 -112 122L-128 150L-110 142L-104 160L-92 140L-80 154L-82 122C-82 88 -70 54 -52 26Z',
  /** A pata de trás, da coxa ao pé, com três garras. */
  leg: 'M-80 138C-120 158 -132 208 -120 248L-142 278L-120 270L-112 288L-100 268L-86 282L-90 248C-94 214 -84 186 -56 168Z',
} as const;

/** A cauda: sai do quadril, enrola para a direita por baixo e acaba num cristal que brilha. */
export const FRONT_TAIL = {
  body: 'M14 214C36 262 100 294 170 280C216 270 242 238 234 204C230 188 214 178 200 184L204 196C216 202 218 222 204 236C176 262 110 264 60 228C44 216 32 208 24 204Z',
  crystal: 'M198 192L182 152L206 124L222 158Z',
} as const;

/** As cores do dragão de frente, na noite da abertura. */
export const FRONT_PALETTE = {
  hideTop: '#2c2150',
  hideBottom: '#100b1d',
  bodyRim: '#7e66cc',
  plate: '#3a2c6a',
  membraneLight: '#7a52c6',
  membraneMid: '#3f277a',
  membraneDark: '#1c1038',
  membraneRim: '#b49cf0',
  bone: '#170e30',
  vein: '#cdb2ff',
  veinGlow: '#8a5cff',
  eye: '#efe4ff',
  eyeGlow: '#a77bff',
  crystal: '#c4a2ff',
  horn: '#3a2d5c',
  flightWing: '#2e1f5c',
} as const;
