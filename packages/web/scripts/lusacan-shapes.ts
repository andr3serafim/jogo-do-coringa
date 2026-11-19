// A geometria da logo "LUSACAN productions" (decisoes.md 2026-11-17 (3)): um dragão de asas abertas diante da lua cheia, o nome e
// "PRODUCTIONS". Desenho original do projeto, feito à mão em vetor; a imagem que o autor mandou foi inspiração, não molde (nada
// decalcado). As letras são os contornos da Cinzel (SIL OFL 1.1, `@fontsource/cinzel`, pesos 600 e 500), em unidades da fonte (1000 por
// eme): o SVG não depende de fonte instalada.
//
// Esta é a fonte única da logo. O `scripts/gerar-logo-lusacan.ts` grava com ela os SVG de `src/assets/lusacan/`, e o teste
// `lusacan-assets.test.ts` confere que eles não se afastam dela. O jogo não a mostra (a abertura saiu dela em 2026-11-19 (6)).
//
// O dragão se move por peças: cada uma tem o pivô na origem do próprio desenho (a asa, no ombro; o corpo, no peito), e quem a põe no
// lugar é um `<g transform>` de fora. Assim a animação (no `<g>` de dentro) gira a asa no ombro sem `transform-origin`.

/** A caixa do conjunto (o dragão e a lua em cima, o nome, "PRODUCTIONS" e a cauda embaixo). */
export const LOGO_BOX = { width: 420, height: 258 } as const;
/** A caixa do símbolo sozinho (a lua e o dragão, sem a cauda), para tamanhos pequenos: um recorte da caixa do conjunto. */
export const SYMBOL_BOX = { x: 0, y: 0, width: 420, height: 180 } as const;

/** A lua cheia, atrás do dragão, e o halo dela. */
export const MOON = { cx: 210, cy: 90, r: 62, halo: 104 } as const;
/** As crateras: discos claros e escuros quase apagados, para a lua não ser um círculo liso. */
export const CRATERS: readonly { cx: number; cy: number; r: number }[] = [
  { cx: 188, cy: 66, r: 11 },
  { cx: 232, cy: 104, r: 15 },
  { cx: 182, cy: 112, r: 7 },
  { cx: 246, cy: 70, r: 6 },
  { cx: 205, cy: 136, r: 5 },
];

/** O peito do dragão na caixa do conjunto: a origem do corpo e o meio entre os ombros. */
export const DRAGON = { x: 210, y: 118 } as const;
/** Onde fica o ombro de cada asa, a partir do peito (a direita é a esquerda espelhada). */
export const SHOULDER = 20;

/** A asa esquerda, com o ombro na origem: a membrana (com o braço e a garra do pulso), os ossos e os veios de raio. */
export const WING = {
  membrane:
    'M0 -6C-14 -20 -28 -34 -40 -40C-56 -50 -66 -62 -80 -68L-90 -84L-78 -71C-108 -86 -144 -104 -176 -112Q-152 -74 -196 -46Q-150 -24 -168 10Q-124 4 -118 40Q-62 8 -10 24L0 10Z',
  bones: 'M-80 -68Q-140 -62 -196 -46M-80 -68Q-128 -30 -168 10M-80 -68Q-102 -10 -118 40',
  veins:
    'M-96 -63L-112 -55L-119 -60L-140 -50L-152 -55L-174 -46M-92 -52L-106 -36L-115 -39L-128 -17L-141 -15L-150 2M-88 -42L-94 -22L-102 -20L-105 3L-113 7L-115 28M-62 -26L-70 -8L-61 0L-66 16',
} as const;

/** O corpo, com o peito na origem: o pescoço que sobe em gancho e a cabeça de focinho longo que olha para a direita, o peito e o tronco;
 * os chifres que varrem para trás, os espinhos da nuca e o olho. */
export const BODY = {
  trunk:
    'M-24 -2C-24 -16 -22 -34 -12 -50C-6 -60 0 -66 8 -70C16 -76 26 -78 32 -74C36 -72 38 -70 42 -68C52 -64 66 -60 78 -55L76 -51L62 -51L54 -50L68 -46C60 -42 46 -40 34 -42C24 -44 16 -46 12 -44C6 -38 4 -28 8 -18C12 -10 18 -6 26 -2C30 12 24 32 12 46C6 52 -6 52 -12 46C-24 32 -30 12 -24 -2Z',
  horns: 'M12 -72Q-2 -88 -24 -96Q-2 -82 18 -70ZM22 -76Q12 -96 -2 -112Q22 -96 30 -75ZM20 -46L4 -52L18 -54Z',
  spikes: 'M-23 -14L-34 -18L-24 -24ZM-20 -32L-32 -38L-18 -42ZM-11 -50L-20 -60L-4 -58Z',
  /** As placas do ventre: arcos finos no peito e no tronco. */
  belly: 'M-16 6Q0 13 18 6M-16 16Q0 23 16 16M-14 26Q0 33 14 26M-11 36Q0 42 10 36',
  eye: { cx: 44, cy: -64, r: 2.2 },
} as const;

/** A cauda, com o peito na origem: sai do quadril, enrola para a esquerda por baixo da asa e acaba em ponta de lança (acima do nome). */
export const TAIL =
  'M8 40C6 54 -16 60 -40 54C-56 50 -66 40 -66 28L-60 30C-58 40 -48 46 -36 47C-18 49 -4 46 -2 36ZM-66 28L-76 22L-62 18L-60 30Z';

/** Os filetes dos dois lados de "PRODUCTIONS", com um losango na ponta de fora. */
export const FLOURISH = { y: 238, outer: 46, gap: 12 } as const;

export interface Glyph {
  /** A letra (para a chave e para o teste). */
  char: string;
  /** O deslocamento dentro da linha, em unidades da fonte. */
  x: number;
  /** O contorno, em unidades da fonte, com a linha de base em 0. */
  d: string;
}

export interface TextLine {
  /** Quanto vale uma unidade da fonte na caixa do conjunto. */
  scale: number;
  /** Onde a linha começa e onde fica a linha de base, na caixa do conjunto. */
  x: number;
  y: number;
  glyphs: readonly Glyph[];
}

/** "LUSACAN": a Cinzel 600, com as letras um pouco abertas. */
export const WORD: TextLine = {
  scale: 0.0529,
  x: 60,
  y: 220,
  glyphs: [
    { char: 'L', x: 0, d: 'M582 -190L532 0L48 0L48 -10L61 -10Q87 -10 106 -28Q124 -47 125 -73L125 -627Q124 -653 106 -671Q87 -690 61 -690L48 -690L48 -700L324 -700L324 -690L311 -690Q285 -690 267 -671Q248 -653 247 -627L247 -39L381 -39Q432 -39 469 -57Q506 -76 531 -110Q556 -145 572 -190L582 -190Z' },
    { char: 'U', x: 708, d: 'M302 -700L302 -690L286 -690Q264 -690 249 -676Q233 -662 233 -640L233 -260Q233 -189 258 -136Q282 -83 327 -54Q372 -25 432 -25Q496 -25 542 -52Q588 -80 614 -129Q639 -179 639 -247L639 -640Q639 -662 624 -676Q608 -690 586 -690L570 -690L570 -700L771 -700L771 -690L755 -690Q733 -690 718 -676Q702 -662 702 -640L702 -251Q702 -171 668 -111Q634 -52 571 -19Q507 14 420 14Q322 14 253 -18Q183 -51 147 -110Q111 -170 111 -250L111 -640Q111 -662 96 -676Q80 -690 58 -690L42 -690L42 -700L302 -700Z' },
    { char: 'S', x: 1627, d: 'M268 -714Q287 -714 313 -712Q339 -710 366 -707Q375 -705 384 -704L443 -704L442 -683L441 -683L434 -565L424 -565Q424 -616 388 -646Q351 -676 293 -676Q235 -676 201 -646Q166 -616 165 -573Q163 -548 180 -524Q196 -501 224 -481L417 -338Q458 -311 477 -272Q496 -234 494 -186Q491 -94 428 -40Q364 14 255 14Q218 14 180 8Q141 1 109 -12Q77 -26 58 -45Q52 -65 53 -93Q54 -122 61 -152Q68 -183 78 -204L87 -204Q83 -153 104 -111Q125 -70 166 -46Q206 -23 261 -24Q323 -26 361 -59Q398 -92 398 -144Q398 -174 382 -198Q366 -223 332 -243L151 -380Q105 -410 86 -452Q66 -495 69 -541Q72 -589 96 -628Q120 -668 164 -691Q207 -714 268 -714Z' },
    { char: 'A', x: 2281, d: 'M356 -718L645 -68Q660 -38 683 -25Q707 -10 730 -10L738 -10L738 0L451 0L451 -10L460 -10Q479 -10 494 -27Q508 -42 499 -70L444 -212L197 -212L141 -73L141 -73Q133 -53 138 -39Q143 -25 155 -17Q167 -10 179 -10L188 -10L188 0L-22 0L-22 -10L-13 -10Q10 -10 35 -25Q56 -37 71 -65L302 -596Q304 -600 311 -615Q317 -631 326 -651Q334 -671 340 -689Q346 -708 347 -718L356 -718ZM323 -521L213 -250L429 -250L323 -521Z' },
    { char: 'C', x: 3106, d: 'M718 -292L720 -125Q697 -86 659 -54Q621 -23 567 -4Q512 14 439 14Q323 13 235 -31Q147 -75 99 -156Q50 -238 50 -351Q50 -462 98 -543Q146 -625 234 -669Q322 -714 443 -714Q521 -714 583 -696Q645 -679 688 -655L696 -494L687 -494Q662 -589 599 -632Q535 -676 450 -676Q368 -676 309 -636Q249 -597 217 -524Q184 -452 184 -353Q184 -254 216 -180Q247 -107 305 -66Q362 -26 439 -24Q514 -24 570 -49Q625 -75 661 -134Q696 -193 710 -292L718 -292Z' },
    { char: 'A', x: 3989, d: 'M356 -718L645 -68Q660 -38 683 -25Q707 -10 730 -10L738 -10L738 0L451 0L451 -10L460 -10Q479 -10 494 -27Q508 -42 499 -70L444 -212L197 -212L141 -73L141 -73Q133 -53 138 -39Q143 -25 155 -17Q167 -10 179 -10L188 -10L188 0L-22 0L-22 -10L-13 -10Q10 -10 35 -25Q56 -37 71 -65L302 -596Q304 -600 311 -615Q317 -631 326 -651Q334 -671 340 -689Q346 -708 347 -718L356 -718ZM323 -521L213 -250L429 -250L323 -521Z' },
    { char: 'N', x: 4814, d: 'M114 -715L633 -202L633 -629Q632 -655 615 -672Q597 -690 571 -690L552 -690L552 -700L822 -700L822 -690L804 -690Q779 -690 761 -672Q743 -655 742 -629L742 -114Q742 -78 745 -49Q748 -20 751 -3L753 14L744 14L225 -498L226 -71L226 -71Q226 -46 244 -28Q262 -10 287 -10L306 -10L306 0L35 0L35 -10L54 -10Q79 -10 97 -28Q115 -46 115 -71L115 -590Q115 -644 110 -680L104 -715L114 -715Z' },
  ],
};

/** "PRODUCTIONS": a Cinzel 500, bem espaçada. */
export const TAG: TextLine = {
  scale: 0.01474,
  x: 125.02,
  y: 242,
  glyphs: [
    { char: 'P', x: 0, d: 'M132 -73L132 -627Q132 -653 113 -671Q94 -690 68 -690L56 -690L55 -700L340 -700Q412 -700 461 -676Q509 -653 535 -609Q560 -566 560 -507Q561 -460 543 -421Q524 -383 493 -357Q462 -331 423 -318Q383 -306 341 -310Q299 -314 259 -337L259 -347L275 -346Q290 -344 315 -346Q339 -348 366 -358Q392 -368 416 -392Q439 -416 451 -457Q454 -469 456 -485Q458 -502 457 -517Q456 -584 422 -625Q387 -666 324 -666L225 -666L225 -73Q226 -47 245 -28Q263 -10 289 -10L302 -10L302 0L55 0L55 -10L68 -10Q94 -10 113 -28Q131 -47 132 -73Z' },
    { char: 'R', x: 983, d: 'M132 -73L132 -627Q131 -653 113 -671Q94 -690 68 -690L55 -690L55 -700L349 -700Q394 -700 433 -688Q472 -676 500 -652Q527 -629 543 -594Q559 -559 559 -512Q559 -466 538 -422Q517 -379 480 -351Q442 -323 391 -321Q413 -313 435 -290Q457 -267 473 -245Q473 -244 486 -226Q498 -208 517 -181Q536 -155 556 -129Q575 -103 590 -86Q610 -62 630 -45Q649 -29 672 -19Q694 -10 722 -10L722 0L652 0Q604 0 567 -12Q530 -25 503 -46Q476 -68 457 -93Q453 -100 441 -119Q428 -138 413 -162Q397 -187 382 -211Q367 -235 356 -252Q345 -270 342 -275Q325 -302 304 -321Q283 -341 258 -342L258 -352Q259 -352 273 -351Q286 -351 304 -352Q330 -353 360 -361Q389 -369 414 -392Q438 -415 450 -460Q453 -470 455 -485Q456 -500 455 -516Q454 -585 421 -623Q387 -662 333 -664Q310 -666 285 -665Q260 -665 242 -665L225 -665L225 -73Q225 -47 244 -28Q263 -10 289 -10L301 -10L301 0L55 0L55 -10L68 -10Q94 -10 113 -28Q131 -47 132 -73Z' },
    { char: 'O', x: 2063, d: 'M433 -714Q545 -714 629 -669Q712 -624 759 -542Q805 -460 805 -350Q805 -240 759 -158Q712 -76 629 -31Q545 14 433 14Q323 14 240 -31Q156 -76 110 -158Q63 -240 63 -350Q63 -460 110 -542Q156 -624 240 -669Q323 -714 433 -714ZM433 -20Q514 -20 573 -61Q632 -102 665 -176Q698 -250 698 -350Q698 -450 665 -524Q632 -598 573 -639Q514 -680 433 -680Q354 -680 295 -639Q235 -598 202 -524Q169 -450 169 -350Q169 -250 202 -176Q235 -102 295 -61Q354 -20 433 -20Z' },
    { char: 'D', x: 3295, d: 'M401 -700Q512 -700 594 -657Q676 -614 722 -535Q768 -456 768 -350Q768 -244 722 -165Q676 -87 594 -43Q512 0 401 0L54 0L54 -10L67 -10Q93 -10 112 -28Q130 -47 131 -73L131 -627Q131 -653 112 -671Q93 -690 67 -690L55 -690L54 -700L401 -700ZM224 -666L224 -34L397 -34Q478 -34 538 -73Q598 -112 631 -183Q664 -254 664 -350Q664 -446 631 -517Q598 -588 538 -627Q478 -666 397 -666L224 -666Z' },
    { char: 'U', x: 4489, d: 'M277 -700L277 -690L261 -690Q239 -690 224 -676Q208 -662 208 -640L208 -260Q208 -188 234 -134Q259 -80 306 -50Q352 -21 414 -21Q479 -21 528 -49Q576 -77 603 -128Q629 -179 629 -247L629 -640Q629 -662 614 -676Q598 -690 576 -690L560 -690L560 -700L753 -700L753 -690L737 -690Q715 -690 700 -676Q684 -662 684 -640L684 -249Q684 -170 651 -111Q617 -52 555 -19Q492 14 408 14Q317 14 251 -18Q185 -51 150 -110Q115 -169 115 -248L115 -640Q115 -662 100 -676Q84 -690 62 -690L46 -690L46 -700L277 -700Z' },
    { char: 'C', x: 5666, d: 'M714 -292L709 -130Q684 -89 646 -56Q607 -24 553 -5Q499 14 428 14Q318 13 234 -31Q149 -76 102 -157Q55 -239 55 -351Q55 -461 102 -542Q148 -624 233 -669Q317 -714 433 -714Q509 -714 570 -695Q631 -677 674 -650L688 -499L679 -499Q655 -591 590 -635Q524 -680 437 -680Q351 -680 289 -639Q227 -599 193 -525Q159 -452 159 -352Q159 -253 193 -179Q226 -105 287 -63Q347 -22 428 -20Q501 -20 559 -46Q617 -72 655 -131Q693 -191 706 -292L714 -292Z' },
    { char: 'T', x: 6813, d: 'M617 -719L617 -577L607 -578L607 -593Q607 -625 587 -645Q566 -666 534 -667L364 -667L364 -73Q365 -47 384 -28Q402 -10 428 -10L441 -10L441 0L194 0L194 -10L207 -10Q233 -10 252 -28Q270 -47 271 -73L271 -667L101 -667Q69 -666 49 -645Q28 -625 28 -593L28 -578L18 -577L18 -719Q28 -715 49 -711Q69 -707 94 -704Q119 -701 140 -701L495 -701Q517 -701 542 -704Q566 -707 587 -711Q608 -715 617 -719Z' },
    { char: 'I', x: 7827, d: 'M131 -73L131 -627Q130 -653 112 -671Q93 -690 67 -690L54 -690L54 -700L301 -700L301 -690L288 -690Q262 -690 244 -671Q225 -653 224 -627L224 -73Q225 -47 244 -28Q262 -10 288 -10L301 -10L301 0L54 0L54 -10L67 -10Q93 -10 112 -28Q130 -47 131 -73Z' },
    { char: 'O', x: 8561, d: 'M433 -714Q545 -714 629 -669Q712 -624 759 -542Q805 -460 805 -350Q805 -240 759 -158Q712 -76 629 -31Q545 14 433 14Q323 14 240 -31Q156 -76 110 -158Q63 -240 63 -350Q63 -460 110 -542Q156 -624 240 -669Q323 -714 433 -714ZM433 -20Q514 -20 573 -61Q632 -102 665 -176Q698 -250 698 -350Q698 -450 665 -524Q632 -598 573 -639Q514 -680 433 -680Q354 -680 295 -639Q235 -598 202 -524Q169 -450 169 -350Q169 -250 202 -176Q235 -102 295 -61Q354 -20 433 -20Z' },
    { char: 'N', x: 9793, d: 'M120 -715L652 -169L652 -629Q651 -655 634 -672Q616 -690 590 -690L571 -690L571 -700L809 -700L809 -690L791 -690Q766 -690 748 -672Q730 -655 729 -629L729 -114Q729 -80 732 -50Q734 -21 737 -4L739 14L730 14L197 -532L198 -71L198 -71Q198 -46 216 -28Q234 -10 259 -10L278 -10L278 0L40 0L40 -10L59 -10Q84 -10 102 -28Q120 -46 120 -71L120 -590Q120 -643 115 -679L110 -715L120 -715Z' },
    { char: 'S', x: 11022, d: 'M260 -714Q277 -714 299 -712Q321 -710 344 -707Q352 -705 359 -704L409 -704L409 -683L409 -683L405 -573L396 -573Q396 -622 361 -651Q326 -680 273 -680Q217 -680 183 -647Q148 -615 148 -571Q147 -549 160 -524Q172 -500 198 -479L393 -316Q428 -289 443 -253Q457 -218 456 -180Q454 -92 397 -39Q340 14 243 14Q212 14 177 8Q141 2 110 -10Q79 -23 60 -43Q55 -61 56 -87Q56 -114 62 -142Q67 -170 76 -192L85 -192Q80 -141 100 -101Q119 -61 157 -39Q194 -18 243 -20Q302 -22 341 -56Q379 -91 379 -147Q379 -176 366 -200Q353 -224 326 -243L140 -401Q102 -429 86 -467Q70 -505 72 -543Q74 -588 96 -627Q118 -667 160 -690Q201 -714 260 -714Z' },
  ],
};

/** Os filetes dos dois lados de "PRODUCTIONS": de `FLOURISH.outer` até perto da palavra, com um losango na ponta de fora. */
export function flourishPath(): string {
  const left = Math.round(TAG.x - FLOURISH.gap);
  const right = LOGO_BOX.width - left;
  const outerRight = LOGO_BOX.width - FLOURISH.outer;
  const y = FLOURISH.y;
  const diamond = (x: number) => `M${x - 5} ${y}L${x} ${y - 3}L${x + 5} ${y}L${x} ${y + 3}Z`;
  return `M${FLOURISH.outer} ${y}H${left}M${right} ${y}H${outerRight}${diamond(FLOURISH.outer)}${diamond(outerRight)}`;
}

/** As cores de cada versão. A escura é a da abertura; a clara serve para papel e fundo branco. */
export const PALETTES = {
  escuro: {
    moonLight: '#fbfaff',
    moonMid: '#d6d4e8',
    moonEdge: '#9f9dbd',
    crater: '#8f8db0',
    halo: '#cfc8ff',
    dragon: '#0d0a17',
    wing: '#1b1432',
    wingRim: '#4a3a86',
    bone: '#3a2d63',
    vein: '#b48cff',
    veinGlow: '#7c4dff',
    eye: '#d2b4ff',
    wordTop: '#f6f5fb',
    wordBottom: '#b3b0c8',
    tag: '#b8afdc',
  },
  claro: {
    moonLight: '#eeecf6',
    moonMid: '#e2dfef',
    moonEdge: '#cdc9e0',
    crater: '#bdb8d4',
    halo: '#e2dfef',
    dragon: '#17120f',
    wing: '#17120f',
    wingRim: '#17120f',
    bone: '#4a4060',
    vein: '#8a5cf0',
    veinGlow: '#8a5cf0',
    eye: '#8a5cf0',
    wordTop: '#17120f',
    wordBottom: '#17120f',
    tag: '#4b3299',
  },
} as const;

export type LogoPalette = (typeof PALETTES)[keyof typeof PALETTES];
