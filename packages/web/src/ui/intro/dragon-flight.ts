// O voo do dragão da logo (decisoes.md 2026-11-17 (3)): ele entra pequeno e longe batendo as asas, gira em parafuso em volta da lua,
// volta mergulhando de asas recolhidas na direção de quem olha, abre as asas de uma vez e para na pose da logo. São duas animações
// (Web Animations, que o `Intro.tsx` liga): uma no grupo do dragão inteiro e uma em cada asa, que gira no ombro (a direita é a esquerda
// espelhada, então a mesma animação serve às duas). Os instantes saem do `model/intro.ts`; aqui moram só as poses.
//
// As coordenadas são as da caixa da logo (`lusacan-shapes.ts`), a partir da pose: o peito na pose é 0 0, com escala 1 e sem giro. A
// última pose de cada animação é a da logo parada (a identidade), então, quando a animação acaba, o desenho fica como está no SVG.
import { INTRO } from '../../model/intro.ts';

export interface DragonAnimation {
  /** Quando começa, em ms desde que a abertura aparece. */
  delay: number;
  duration: number;
  keyframes: Keyframe[];
}

/** Onde o dragão inteiro está num instante: o deslocamento, a escala e o giro (em graus), a partir da pose. */
interface BodyPose {
  at: number;
  x: number;
  y: number;
  scale: number;
  turn: number;
  opacity?: number;
}

/** Como uma asa está num instante: o giro no ombro (positivo levanta a ponta) e o quanto ela está aberta (`sx`) e alta (`sy`). */
interface WingPose {
  at: number;
  turn: number;
  sx: number;
  sy: number;
}

/** Quanto dura cada batida de asa enquanto ele chega (três batidas). */
const BEAT = (INTRO.spinAt - INTRO.flyAt) / 3;
/** O fim do voo: as asas abertas e o corpo assentado na pose. */
const LANDED = INTRO.wingsAt + INTRO.settleMs;
const SPIN = INTRO.returnAt - INTRO.spinAt;

// O giro é uma volta inteira (de -360 a 0 graus), para a pose final não ter giro nenhum. A lua fica 28 acima do peito.
const BODY_POSES: readonly BodyPose[] = [
  { at: INTRO.flyAt, x: -330, y: -170, scale: 0.14, turn: -385, opacity: 0 },
  { at: INTRO.flyAt + 60, x: -270, y: -168, scale: 0.17, turn: -382, opacity: 1 },
  // cruza por cima da lua
  { at: INTRO.flyAt + BEAT * 1.5, x: -40, y: -178, scale: 0.28, turn: -368 },
  { at: INTRO.spinAt, x: 190, y: -112, scale: 0.36, turn: -345 },
  // o parafuso: desce pela direita da lua e passa na frente dela, da direita para a esquerda (a silhueta contra a luz)
  { at: INTRO.spinAt + SPIN / 3, x: 205, y: -12, scale: 0.44, turn: -250 },
  { at: INTRO.spinAt + (SPIN * 2) / 3, x: 40, y: 8, scale: 0.52, turn: -130 },
  // e volta: vira para o meio, crescendo na direção de quem olha
  { at: INTRO.returnAt, x: -110, y: -12, scale: 0.56, turn: -20 },
  // o mergulho: cresce na direção de quem olha, um pouco além da pose, e assenta
  { at: INTRO.wingsAt, x: 0, y: -8, scale: 1.14, turn: 0 },
  { at: INTRO.wingsAt + INTRO.settleMs * 0.5, x: 0, y: 3, scale: 0.97, turn: 0 },
  { at: LANDED, x: 0, y: 0, scale: 1, turn: 0 },
];

const WING_POSES: readonly WingPose[] = [
  // três batidas: a ponta desce no meio de cada uma (onde o som põe a batida, no `synth.ts`)
  ...[0, 1, 2].flatMap((i) => [
    { at: INTRO.flyAt + BEAT * i, turn: 24, sx: 1, sy: 0.72 },
    { at: INTRO.flyAt + BEAT * (i + 0.5), turn: -22, sx: 1, sy: 0.95 },
  ]),
  { at: INTRO.spinAt, turn: 12, sx: 0.9, sy: 0.85 },
  { at: INTRO.spinAt + SPIN / 2, turn: 32, sx: 0.7, sy: 0.8 },
  // recolhidas no mergulho
  { at: INTRO.returnAt, turn: 58, sx: 0.38, sy: 0.85 },
  { at: INTRO.wingsAt - 40, turn: 64, sx: 0.3, sy: 0.82 },
  // abertas de uma vez, um pouco além, e assentadas
  { at: INTRO.wingsAt + INTRO.settleMs * 0.45, turn: -8, sx: 1.08, sy: 1.05 },
  { at: LANDED, turn: 0, sx: 1, sy: 1 },
];

/** A posição de um instante entre o começo e o fim do voo (0 a 1), que a Web Animations chama de `offset`. */
const offset = (at: number): number => (at - INTRO.flyAt) / (LANDED - INTRO.flyAt);

/** O voo do dragão inteiro. */
export function flightAnimation(): DragonAnimation {
  return {
    delay: INTRO.flyAt,
    duration: LANDED - INTRO.flyAt,
    keyframes: BODY_POSES.map((pose) => ({
      offset: offset(pose.at),
      transform: `translate(${pose.x}px, ${pose.y}px) rotate(${pose.turn}deg) scale(${pose.scale})`,
      ...(pose.opacity === undefined ? {} : { opacity: pose.opacity }),
      easing: 'ease-in-out',
    })),
  };
}

/** O bater, o recolher e o abrir de uma asa (a mesma nas duas). */
export function wingAnimation(): DragonAnimation {
  return {
    delay: INTRO.flyAt,
    duration: LANDED - INTRO.flyAt,
    keyframes: WING_POSES.map((pose) => ({
      offset: offset(pose.at),
      transform: `rotate(${pose.turn}deg) scale(${pose.sx}, ${pose.sy})`,
      easing: 'ease-in-out',
    })),
  };
}
