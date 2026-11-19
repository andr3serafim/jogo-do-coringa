// Gera a prévia HyperFrames da abertura LUSACAN nova (decisoes.md 2026-11-19 (1)): `prototipo/index.html` e
// `prototipo/compositions/logo.html`. Rode da raiz do repositório:
//
//   node docs/superpowers/specs/2026-11-19-intro-lusacan/gerar-prototipo.ts
//
// As letras (Cinzel, SIL OFL) e a silhueta de perfil do voo vêm da logo de hoje (`lusacan-shapes.ts`); o dragão de frente, do
// `dragao-frente.ts`. O voo é amostrado aqui, quadro a quadro (30 por segundo), em poses de deslocamento, giro e escala: a mesma
// forma que a Web Animations do jogo (`dragon-flight.ts`) usa, para a prévia passar ao código sem reinterpretar o movimento.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BODY, CRATERS, MOON, SHOULDER, TAG, TAIL, WING, WORD, flourishPath, type TextLine } from '../../../../packages/web/src/ui/intro/lusacan-shapes.ts';
import { FRONT_BODY, FRONT_PALETTE as F, FRONT_SHOULDER, FRONT_TAIL, FRONT_WING } from './dragao-frente.ts';

const OUT = join(dirname(fileURLToPath(import.meta.url)), 'prototipo');
const FPS = 30;

/** Os instantes da prévia, em segundos. A logo inteira cabe em ~3 s (a escolha do autor); depois, o esmaecer. */
const T = {
  skyIn: 0.45,
  flyIn: 0.15,
  /** O dragão de perfil vira de frente para quem olha (a troca de desenho, no meio de um movimento rápido). */
  turn: 2.06,
  turnMs: 0.066,
  /** As asas abrem de uma vez. */
  wings: 2.12,
  open: 0.28,
  settle: 0.3,
  name: 2.3,
  tag: 2.62,
  out: 3.0,
  outMs: 0.3,
  total: 3.5,
} as const;

/** O quadro: a lua, o peito do dragão na pose e a linha do nome. */
const STAGE = { moon: { x: 960, y: 400, r: 270 }, chest: { x: 960, y: 500 }, scale: 0.92 } as const;

// ---------------------------------------------------------------- o voo de perfil

/** Um ponto de passagem do voo: o instante, o lugar e o tamanho (1 = a logo de hoje com `SPRITE` px por unidade). */
interface Waypoint {
  t: number;
  x: number;
  y: number;
  s: number;
}

/**
 * O caminho: entra pelo alto à direita, mergulha na frente da metade de baixo da lua (a silhueta contra a luz), passa à esquerda, sobe
 * pelo lado esquerdo (rolando o corpo, para não voar de costas), cruza por cima da lua e desce no meio, onde vira de frente.
 */
const PATH: readonly Waypoint[] = [
  { t: T.flyIn - 0.1, x: 2200, y: -160, s: 0.5 },
  { t: T.flyIn, x: 2060, y: -60, s: 0.55 },
  { t: 0.55, x: 1520, y: 320, s: 0.85 },
  { t: 0.95, x: 1010, y: 585, s: 1.05 },
  { t: 1.25, x: 610, y: 515, s: 0.85 },
  { t: 1.5, x: 540, y: 255, s: 0.58 },
  { t: 1.75, x: 840, y: 130, s: 0.46 },
  { t: 1.94, x: 1070, y: 170, s: 0.5 },
  { t: T.turn + T.turnMs, x: 978, y: 392, s: 0.62 },
  { t: T.turn + 0.3, x: 960, y: 500, s: 0.9 },
];
const SPRITE = 2.1;

/** Catmull-Rom no segmento i (de PATH[i] a PATH[i + 1]), em u de 0 a 1. */
function catmull(i: number, u: number, key: 'x' | 'y' | 's'): number {
  const p0 = PATH[Math.max(i - 1, 0)][key];
  const p1 = PATH[i][key];
  const p2 = PATH[i + 1][key];
  const p3 = PATH[Math.min(i + 2, PATH.length - 1)][key];
  const u2 = u * u;
  const u3 = u2 * u;
  return 0.5 * (2 * p1 + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
}

function at(t: number): { x: number; y: number; s: number } {
  let i = 0;
  while (i < PATH.length - 2 && t > PATH[i + 1].t) i++;
  const u = Math.min(Math.max((t - PATH[i].t) / (PATH[i + 1].t - PATH[i].t), 0), 1);
  return { x: catmull(i, u, 'x'), y: catmull(i, u, 'y'), s: catmull(i, u, 's') };
}

const smooth = (a: number, b: number, x: number): number => {
  const k = Math.min(Math.max((x - a) / (b - a), 0), 1);
  return k * k * (3 - 2 * k);
};
const round = (n: number, d = 2): number => Number(n.toFixed(d));

interface Pose {
  x: number;
  y: number;
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/** As poses do corpo de perfil, quadro a quadro, do começo do voo até a troca. O giro segue a direção do voo, sem saltos. */
function flightPoses(): Pose[] {
  const start = T.flyIn - 0.1;
  const end = T.turn + T.turnMs;
  const poses: Pose[] = [];
  let last = 0;
  for (let f = 0; start + f / FPS <= end + 1e-9; f++) {
    const t = start + f / FPS;
    const p = at(t);
    const q = at(t + 1 / FPS);
    let turn = (Math.atan2(q.y - p.y, q.x - p.x) * 180) / Math.PI;
    while (turn - last > 180) turn -= 360;
    while (turn - last < -180) turn += 360;
    last = turn;
    // A rolagem: voando para a esquerda, o desenho (que olha para a direita) gira de cabeça para baixo; o `scaleY` negativo o
    // endireita. Ela vira na subida pelo lado esquerdo, com as asas de lado, e no mergulho final fica de pé.
    const heading = (q.x - p.x) / (Math.hypot(q.x - p.x, q.y - p.y) || 1);
    const roll = t > 1.9 ? 1 : -1 + 2 * smooth(-0.35, 0.35, heading);
    poses.push({ x: round(p.x), y: round(p.y), rotation: round(turn), scaleX: round(p.s * SPRITE, 3), scaleY: round(p.s * SPRITE * roll, 3) });
  }
  return poses;
}

interface WingPose {
  rotation: number;
  scaleX: number;
  scaleY: number;
}

/** As asas de perfil: batem enquanto ele chega e sobe (cada batida um pouco mais lenta), e recolhem no mergulho final. */
function flightWings(): WingPose[] {
  const start = T.flyIn - 0.1;
  const end = T.turn + T.turnMs;
  const poses: WingPose[] = [];
  let phase = 0;
  for (let f = 0; start + f / FPS <= end + 1e-9; f++) {
    const t = start + f / FPS;
    const period = 0.3 + 0.1 * smooth(0.2, 1.8, t);
    phase += (2 * Math.PI) / (period * FPS);
    const fold = smooth(1.82, T.turn, t);
    const beat = Math.sin(phase);
    poses.push({
      rotation: round((4 + 26 * beat) * (1 - fold) + 60 * fold),
      scaleX: round(1 - 0.66 * fold, 3),
      scaleY: round((0.84 + 0.12 * beat) * (1 - fold) + 0.84 * fold, 3),
    });
  }
  return poses;
}

// ---------------------------------------------------------------- o céu

/** Um sorteio com semente, para as estrelas saírem iguais em toda renderização. */
function seeded(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

function stars(): string {
  const rand = seeded(2026);
  const out: string[] = [];
  while (out.length < 46) {
    const x = rand() * 1920;
    const y = rand() * 640;
    const d = Math.hypot(x - STAGE.moon.x, y - STAGE.moon.y);
    if (d < STAGE.moon.r + 140) continue;
    out.push(`<circle cx="${round(x, 1)}" cy="${round(y, 1)}" r="${round(0.7 + rand() * 1.3, 2)}" opacity="${round(0.25 + rand() * 0.6, 2)}"/>`);
  }
  return out.join('');
}

// ---------------------------------------------------------------- o desenho

function line(text: TextLine, id: string): string {
  return text.glyphs
    .map((g, i) => `<g id="${id}-${i}" class="${id}"><path transform="translate(${g.x} 0)" d="${g.d}"/></g>`)
    .join('');
}

const rim = `fill="#120d20" stroke="#5c4a9c" stroke-width="1.8" stroke-linejoin="round" vector-effect="non-scaling-stroke"`;

function profileWing(side: 'e' | 'd'): string {
  const place = side === 'e' ? `translate(${-SHOULDER} 0)` : `translate(${SHOULDER} 0) scale(-1 1)`;
  return `<g transform="${place}"><g id="voo-asa-${side}" class="voo-asa"><path d="${WING.membrane}" ${rim} fill="${F.flightWing}"/><path d="${WING.bones}" fill="none" stroke="#3a2d63" stroke-width="1.6"/></g></g>`;
}

function frontWing(side: 'e' | 'd'): string {
  const mirror = side === 'd' ? ' scale(-1 1)' : '';
  const x = side === 'd' ? -FRONT_SHOULDER.x : FRONT_SHOULDER.x;
  return `<g transform="translate(${x} ${FRONT_SHOULDER.y})${mirror} rotate(${FRONT_SHOULDER.rest})"><g id="frente-asa-${side}">
      <path d="${FRONT_WING.membrane}" fill="url(#membrana)" stroke="${F.membraneRim}" stroke-width="2.4" stroke-linejoin="round"/>
      <path d="${FRONT_WING.fingers}" fill="none" stroke="${F.bone}" stroke-width="5" stroke-linecap="round"/>
      <path d="${FRONT_WING.arm}" fill="none" stroke="${F.bone}" stroke-width="13" stroke-linecap="round"/>
      <path d="${FRONT_WING.arm}" fill="none" stroke="${F.membraneRim}" stroke-width="2" stroke-linecap="round" opacity=".7" transform="translate(0 -5)"/>
      <path d="${FRONT_WING.thumb}" fill="${F.horn}" stroke="${F.bodyRim}" stroke-width="1.5"/>
      <g class="veios"><path d="${FRONT_WING.veins}" fill="none" stroke="${F.veinGlow}" stroke-width="7" stroke-opacity=".35" stroke-linejoin="round"/><path d="${FRONT_WING.veins}" fill="none" stroke="${F.vein}" stroke-width="2" stroke-linejoin="round"/></g>
    </g></g>`;
}

/** Uma peça do corpo e o espelho dela. */
function pair(d: string, attrs: string): string {
  return `<path d="${d}" ${attrs}/><path d="${d}" ${attrs} transform="scale(-1 1)"/>`;
}

const bodyAttrs = `fill="url(#couro)" stroke="${F.bodyRim}" stroke-width="2" stroke-linejoin="round"`;

function frontDragon(): string {
  const B = FRONT_BODY;
  return `<g id="frente-cauda"><path d="${FRONT_TAIL.body}" ${bodyAttrs}/><path class="cristal" d="${FRONT_TAIL.crystal}" fill="${F.crystal}" stroke="#efe4ff" stroke-width="1.5"/></g>
    ${frontWing('e')}
    ${frontWing('d')}
    ${pair(B.leg, bodyAttrs)}
    ${pair(B.shoulder, bodyAttrs)}
    <path d="${B.torso}" ${bodyAttrs}/>
    <path d="${B.belly}" fill="${F.plate}" stroke="${F.bodyRim}" stroke-width="1.2" stroke-opacity=".6"/>
    <path d="${B.bellyJoints}" fill="none" stroke="${F.hideBottom}" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    ${pair(B.arm, bodyAttrs)}
    <path d="${B.neck}" ${bodyAttrs}/>
    <g id="frente-cabeca">
      ${pair(B.horn, `fill="${F.horn}" stroke="${F.bodyRim}" stroke-width="2" stroke-linejoin="round"`)}
      <path d="${B.head}" ${bodyAttrs}/>
      ${pair(B.cheek, `fill="${F.horn}"`)}
      <path d="${B.snout}" stroke="${F.plate}" stroke-width="3" stroke-linecap="round"/>
      ${pair(B.brow, `fill="${F.horn}"`)}
      <g id="frente-olhos">${pair(B.eye, `fill="${F.eye}"`)}${pair(B.eye, `fill="none" stroke="${F.eyeGlow}" stroke-width="6" stroke-opacity=".45"`)}</g>
      <ellipse cx="${B.nostril.cx}" cy="${B.nostril.cy}" rx="${B.nostril.rx}" ry="${B.nostril.ry}" fill="#000"/>
      <ellipse cx="${-B.nostril.cx}" cy="${B.nostril.cy}" rx="${B.nostril.rx}" ry="${B.nostril.ry}" fill="#000"/>
    </g>`;
}

// ---------------------------------------------------------------- os arquivos

const TEXT_K = 2.15;
const textPlace = `translate(${round(960 - 210 * TEXT_K)} ${round(868 - WORD.y * TEXT_K)}) scale(${TEXT_K})`;
const moonK = STAGE.moon.r / MOON.r;
const craters = CRATERS.map(
  (c) => `<circle cx="${round(STAGE.moon.x + (c.cx - MOON.cx) * moonK)}" cy="${round(STAGE.moon.y + (c.cy - MOON.cy) * moonK)}" r="${round(c.r * moonK)}"/>`,
).join('');

/** Uma pose como o atributo `transform` do SVG: desloca, gira e escala na origem do desenho (o peito, o ombro). */
const tf = (p: { x?: number; y?: number; rotation: number; scaleX: number; scaleY: number }): string =>
  `translate(${p.x ?? 0} ${p.y ?? 0}) rotate(${p.rotation}) scale(${p.scaleX} ${p.scaleY})`;
const flight = flightPoses().map(tf);
const wings = flightWings().map(tf);
const frame = round(1 / FPS, 4);

const scene = `<template>
  <style>
    #root { position: absolute; inset: 0; background: #04070d; overflow: hidden; }
    #logo-svg { position: absolute; inset: 0; width: 100%; height: 100%; }
  </style>
  <div id="root" data-composition-id="logo" data-width="1920" data-height="1080" data-layout-allow-overflow>
    <svg id="logo-svg" viewBox="0 0 1920 1080" aria-label="LUSACAN productions">
      <defs>
        <radialGradient id="ceu" cx="${STAGE.moon.x}" cy="${STAGE.moon.y}" r="1200" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#22425a"/><stop offset=".35" stop-color="#132a3d"/><stop offset="1" stop-color="#050a12"/>
        </radialGradient>
        <radialGradient id="lua" cx=".42" cy=".38" r=".7">
          <stop offset="0" stop-color="#fbfdff"/><stop offset=".6" stop-color="#e3eef5"/><stop offset="1" stop-color="#b9cdda"/>
        </radialGradient>
        <radialGradient id="halo">
          <stop offset=".45" stop-color="#d6ecff" stop-opacity=".5"/><stop offset=".62" stop-color="#9cc3e6" stop-opacity=".2"/><stop offset="1" stop-color="#6d98c0" stop-opacity="0"/>
        </radialGradient>
        <radialGradient id="luz-nuvem" cx="${STAGE.moon.x}" cy="${STAGE.moon.y}" r="900" gradientUnits="userSpaceOnUse">
          <stop offset=".22" stop-color="#b8cede"/><stop offset=".42" stop-color="#4d6a83"/><stop offset="1" stop-color="#142233"/>
        </radialGradient>
        <radialGradient id="anel" cx="${STAGE.moon.x}" cy="${STAGE.moon.y}" r="1000" gradientUnits="userSpaceOnUse">
          <stop offset=".2" stop-color="#fff" stop-opacity="0"/><stop offset=".3" stop-color="#fff" stop-opacity=".75"/><stop offset="1" stop-color="#fff" stop-opacity="1"/>
        </radialGradient>
        <linearGradient id="baixo" x1="0" y1="0" x2="0" y2="1">
          <stop offset=".45" stop-color="#fff" stop-opacity="0"/><stop offset=".8" stop-color="#fff" stop-opacity=".9"/>
        </linearGradient>
        <mask id="mascara-anel" maskUnits="userSpaceOnUse" x="-200" y="-200" width="2320" height="1480"><rect x="-200" y="-200" width="2320" height="1480" fill="url(#anel)"/></mask>
        <mask id="mascara-baixo" maskUnits="userSpaceOnUse" x="-200" y="-200" width="2320" height="1480"><rect x="-200" y="-200" width="2320" height="1480" fill="url(#baixo)"/></mask>
        <filter id="nuvem-a" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.0026 0.0052" numOctaves="5" seed="7" result="n"/>
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -1.05" result="a"/>
          <feComposite in="SourceGraphic" in2="a" operator="in"/>
        </filter>
        <filter id="nuvem-b" x="0" y="0" width="1" height="1" filterUnits="objectBoundingBox">
          <feTurbulence type="fractalNoise" baseFrequency="0.0038 0.009" numOctaves="4" seed="31" result="n"/>
          <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  3.2 0 0 0 -1.5" result="a"/>
          <feComposite in="SourceGraphic" in2="a" operator="in"/>
        </filter>
        <radialGradient id="membrana" gradientUnits="userSpaceOnUse" cx="-300" cy="-230" r="620">
          <stop offset="0" stop-color="${F.membraneLight}"/><stop offset=".5" stop-color="${F.membraneMid}"/><stop offset="1" stop-color="${F.membraneDark}"/>
        </radialGradient>
        <linearGradient id="couro" gradientUnits="userSpaceOnUse" x1="0" y1="-260" x2="0" y2="280">
          <stop offset="0" stop-color="${F.hideTop}"/><stop offset="1" stop-color="${F.hideBottom}"/>
        </linearGradient>
        <linearGradient id="prata" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#ffffff"/><stop offset="1" stop-color="#b9c4d4"/>
        </linearGradient>
      </defs>

      <rect width="1920" height="1080" fill="url(#ceu)"/>
      <g fill="#dfeaff">${stars()}</g>
      <g id="nuvens-fundo" mask="url(#mascara-anel)"><rect x="-120" y="-60" width="2160" height="1200" fill="url(#luz-nuvem)" filter="url(#nuvem-a)"/></g>
      <g id="lua">
        <circle id="lua-halo" cx="${STAGE.moon.x}" cy="${STAGE.moon.y}" r="${STAGE.moon.r * 1.9}" fill="url(#halo)"/>
        <circle cx="${STAGE.moon.x}" cy="${STAGE.moon.y}" r="${STAGE.moon.r}" fill="url(#lua)"/>
        <g fill="#9fb3c4" opacity=".28">${craters}</g>
      </g>
      <g id="nuvens-frente" mask="url(#mascara-baixo)"><rect x="-160" y="300" width="2240" height="820" fill="url(#luz-nuvem)" filter="url(#nuvem-b)" opacity=".9"/></g>

      <g id="voo">
        <path d="${TAIL}" ${rim}/>
        ${profileWing('e')}
        ${profileWing('d')}
        <path d="${BODY.horns}" ${rim}/>
        <path d="${BODY.spikes}" ${rim}/>
        <path d="${BODY.trunk}" ${rim}/>
        <circle cx="${BODY.eye.cx}" cy="${BODY.eye.cy}" r="${BODY.eye.r}" fill="#d2b4ff"/>
      </g>

      <g id="frente">
        ${frontDragon()}
      </g>

      <g transform="${textPlace}">
        <g fill="url(#prata)">
          <g transform="translate(${WORD.x} ${WORD.y}) scale(${WORD.scale})">${line(WORD, 'letra')}</g>
        </g>
        <g id="tag" fill="#c9cfe0">
          <g transform="translate(${TAG.x} ${TAG.y}) scale(${TAG.scale})">${line(TAG, 'tag-letra')}</g>
        </g>
        <path id="filete" d="${flourishPath()}" fill="#aab4c8" stroke="#aab4c8" stroke-width=".8" opacity=".8"/>
      </g>

      <rect id="escuro" width="1920" height="1080" fill="#000"/>
    </svg>
  </div>
  <script>
    const tl = gsap.timeline({ paused: true });
    const FLIGHT = ${JSON.stringify(flight)};
    const WINGS = ${JSON.stringify(wings)};
    const FRAME = ${frame};
    const T = ${JSON.stringify(T)};

    // Toda peça se move pelo atributo transform do SVG: desloca, gira e escala na origem do próprio desenho (o peito, o ombro), como
    // no jogo; o GSAP só interpola os números da string.
    const tf = (x, y, r, sx, sy = sx) => 'translate(' + x + ' ' + y + ') rotate(' + r + ') scale(' + sx + ' ' + sy + ')';
    const move = (el, from, to, duration, ease, pos) =>
      tl.fromTo(el, { attr: { transform: from } }, { attr: { transform: to }, duration, ease, immediateRender: false }, pos);

    // O céu sai do escuro; a lua acende devagar.
    tl.fromTo('#escuro', { opacity: 1 }, { opacity: 0, duration: T.skyIn, ease: 'power2.out' }, 0);
    tl.fromTo('#lua-halo', { opacity: 0.35 }, { opacity: 1, duration: 0.7, ease: 'power1.out' }, 0.05);
    // As nuvens derivam, em sentidos opostos (só deslocamento, nada de refazer o ruído).
    tl.fromTo('#nuvens-fundo', { attr: { transform: tf(0, 0, 0, 1) } }, { attr: { transform: tf(-36, 0, 0, 1) }, duration: T.total, ease: 'none' }, 0);
    tl.fromTo('#nuvens-frente', { attr: { transform: tf(0, 0, 0, 1) } }, { attr: { transform: tf(70, 0, 0, 1) }, duration: T.total, ease: 'none' }, 0);

    // O voo de perfil, quadro a quadro.
    const start = T.flyIn - 0.1;
    tl.set('#voo', { attr: { transform: FLIGHT[0] }, opacity: 1 }, 0);
    tl.to('#voo', { keyframes: FLIGHT.slice(1).map((p) => ({ attr: { transform: p }, duration: FRAME, ease: 'none' })) }, start);
    tl.set('.voo-asa', { attr: { transform: WINGS[0] } }, 0);
    tl.to('.voo-asa', { keyframes: WINGS.slice(1).map((p) => ({ attr: { transform: p }, duration: FRAME, ease: 'none' })) }, start);

    // A virada: o perfil some e o dragão de frente aparece, de asas recolhidas, no meio do mergulho.
    const chest = [${STAGE.chest.x}, ${STAGE.chest.y}, ${STAGE.scale}];
    tl.set('#frente', { opacity: 0, attr: { transform: tf(978, 392, 0, 0.4) } }, 0);
    tl.fromTo('#voo', { opacity: 1 }, { opacity: 0, duration: T.turnMs, ease: 'none', immediateRender: false }, T.turn);
    tl.fromTo('#frente', { opacity: 0 }, { opacity: 1, duration: T.turnMs, ease: 'none', immediateRender: false }, T.turn);
    move('#frente', tf(978, 392, 0, 0.4), tf(chest[0], chest[1] + 8, 0, chest[2] * 1.05), 0.3, 'power3.out', T.turn);
    move('#frente', tf(chest[0], chest[1] + 8, 0, chest[2] * 1.05), tf(chest[0], chest[1], 0, chest[2]), 0.26, 'power2.inOut', T.turn + 0.3);

    // As asas se abrem de uma vez, passam um pouco do ponto e assentam; a direita um quadro depois da esquerda.
    [['#frente-asa-e', 0], ['#frente-asa-d', 0.034]].forEach(([wing, lag]) => {
      tl.set(wing, { attr: { transform: tf(0, 0, 62, 0.3, 0.86) } }, 0);
      move(wing, tf(0, 0, 62, 0.3, 0.86), tf(0, 0, -7, 1.07, 1.04), T.open, 'power3.out', T.wings + lag);
      move(wing, tf(0, 0, -7, 1.07, 1.04), tf(0, 0, 0, 1, 1), T.settle, 'power2.inOut', T.wings + T.open + lag);
    });
    // A cabeça vem na frente do corpo (gira no pescoço); a cauda acompanha atrasada (gira no quadril).
    const neck = (y, r) => 'translate(0 ' + y + ') translate(0 -124) rotate(' + r + ') translate(0 124)';
    tl.set('#frente-cabeca', { attr: { transform: neck(-12, 0) } }, 0);
    move('#frente-cabeca', neck(-12, 0), neck(4, -3), 0.24, 'power2.out', T.turn);
    move('#frente-cabeca', neck(4, -3), neck(0, 0), 0.34, 'power2.inOut', T.turn + 0.24);
    const hip = (r) => 'translate(14 206) rotate(' + r + ') translate(-14 -206)';
    tl.set('#frente-cauda', { attr: { transform: hip(16) } }, 0);
    move('#frente-cauda', hip(16), hip(-5), 0.42, 'power2.out', T.turn);
    move('#frente-cauda', hip(-5), hip(0), 0.4, 'power2.inOut', T.turn + 0.42);
    // Os olhos e os veios acendem com as asas; a lua responde num brilho local (sem clarear a tela).
    tl.fromTo('#frente-olhos', { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' }, T.wings + 0.14);
    tl.fromTo('.veios', { opacity: 0.12 }, { opacity: 1, duration: 0.3, ease: 'power2.out' }, T.wings + 0.12);
    tl.to('.veios', { opacity: 0.55, duration: 0.45, ease: 'power2.inOut' }, T.wings + 0.42);
    const halo = ${STAGE.moon.r * 1.9};
    tl.fromTo('#lua-halo', { attr: { r: halo } }, { attr: { r: halo * 1.1 }, duration: 0.32, ease: 'power2.out', immediateRender: false }, T.wings);
    tl.to('#lua-halo', { attr: { r: halo }, duration: 0.5, ease: 'power2.inOut' }, T.wings + 0.32);

    // O nome sobe letra a letra; "PRODUCTIONS" e os filetes vêm no fim.
    gsap.utils.toArray('.letra').forEach((letter, i) => {
      tl.fromTo(
        letter,
        { opacity: 0, attr: { transform: 'translate(0 220)' } },
        { opacity: 1, attr: { transform: 'translate(0 0)' }, duration: 0.34, ease: 'power3.out' },
        T.name + i * 0.045,
      );
    });
    tl.fromTo('#tag', { opacity: 0 }, { opacity: 1, duration: 0.24, ease: 'power2.out' }, T.tag);
    const flourish = (k) => 'translate(210 0) scale(' + k + ' 1) translate(-210 0)';
    tl.fromTo('#filete', { attr: { transform: flourish(0) } }, { attr: { transform: flourish(1) }, duration: 0.3, ease: 'power3.out' }, T.tag);

    // A saída: o quadro esmaece para o escuro (no jogo, aqui entram as cartas).
    tl.to('#escuro', { opacity: 1, duration: T.outMs, ease: 'power2.in' }, T.out);
    window.__timelines['logo'] = tl;
  </script>
</template>
`;

const root = `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=1920, height=1080" />
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.15.0/dist/gsap.min.js"></script>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      html, body { margin: 0; width: 1920px; height: 1080px; overflow: hidden; background: #000; }
      #root { position: relative; width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <div id="root" data-composition-id="main" data-start="0" data-duration="${T.total}" data-width="1920" data-height="1080">
      <div
        id="logo"
        data-composition-id="logo"
        data-composition-src="compositions/logo.html"
        data-start="0"
        data-duration="${T.total}"
        data-track-index="1"
        data-track-kind="graphics"
        data-width="1920"
        data-height="1080"
      ></div>
    </div>
    <script>
      window.__timelines["main"] = gsap.timeline({ paused: true });
    </script>
  </body>
</html>
`;

mkdirSync(join(OUT, 'compositions'), { recursive: true });
writeFileSync(join(OUT, 'index.html'), root);
writeFileSync(join(OUT, 'compositions', 'logo.html'), scene);
console.log(`prévia gravada: ${flight.length} poses de voo, ${wings.length} de asa`);
