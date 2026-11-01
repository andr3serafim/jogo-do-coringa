// A cena da Defesa Absoluta (sub-projeto 6 §7.2), desenhada a partir do protótipo aprovado:
// 1. uma muralha de tijolos com ameias sobe do chão;
// 2. o escudo-fortaleza (ameias, aro de ouro gravado, campo esquartelado em papel e vermelho) despenca do alto e crava no chão
//    (`shieldLandsAt`): achata com o peso, levanta poeira dos dois lados e racha o chão;
// 3. os 4 Q vêm voando e cravam um em cada quarto do brasão (`queensAt`);
// 4. a trava (`lockAt`): os 22 rebites acendem em sequência na borda, o emblema da coroa crava no centro, um lampejo corre pelo
//    escudo, sai uma onda de choque e raios suaves de ouro abrem por trás. A inversão é da linha do tempo, nesse instante.
//    Sem a cúpula (o autor a recusou);
// 5. o nome carimba (a moldura); no fim (`insigniaAt`), o escudo encolhe e voa até o retrato do dono, onde vira a insígnia do
//    placar (que aparece quando a cena acaba).
//
// O escudo fica no meio da faixa dos dois lados; o lado de quem joga aparece no voo da insígnia. Com movimento reduzido, as peças
// aparecem no lugar e somem, sem queda, voo, poeira nem lampejo.
import { useEffect, useId, useRef, useState } from 'react';
import { SCENE_MOMENTS } from '../../model/scene-moments.ts';
import type { ScenePoint } from '../anim/scene-box.ts';
import type { SceneProps } from '../anim/scenes-loader.ts';
import { FORT_FIELD, FORT_SHIELD, Insignia } from '../table/Insignia.tsx';
import { SceneFrame, stageFit } from './SceneFrame.tsx';

const M = SCENE_MOMENTS.ABSOLUTE_DEFENSE;
/** O escudo despenca em 340 ms até cravar. */
const FALL_MS = 340;
/** Cada Q voa 170 ms até cravar no quarto dele. */
const QUEEN_FLIGHT_MS = 170;
/** Os 22 rebites acendem um a cada 16 ms, terminando antes da trava. */
const RIVET_GAP_MS = 16;
const RIVET_COUNT = 22;
export const RIVETS_LEAD_MS = RIVET_COUNT * RIVET_GAP_MS;
/** O voo da insígnia até o retrato. */
const INSIGNIA_FLIGHT_MS = 420;

/** O escudo no quadro de 1000 × 360: o centro e o tamanho (o desenho dele é de 200 × 250, com margem de 10). */
const SHIELD_CENTER = { x: 500, y: 185 };
const SHIELD_W = 290;
const SHIELD_H = 344;
/** O centro de cada quarto do brasão, no desenho do escudo. */
const QUARTERS: ReadonlyArray<readonly [number, number]> = [
  [62, 76],
  [138, 76],
  [66, 166],
  [134, 166],
];
/** De onde cada Q vem voando, no quadro. */
const QUEEN_FROM: ReadonlyArray<readonly [number, number]> = [
  [-160, 60],
  [1160, 80],
  [-120, 640],
  [1120, 660],
];

type Point = { x: number; y: number };

/** Pontos do contorno do escudo, amostrados (as retas pelas pontas, as curvas em 40 passos). */
function outline(): Point[] {
  const points: Point[] = [{ x: 20, y: 125 }];
  const line = (x: number, y: number) => points.push({ x, y });
  for (const [x, y] of [
    [20, 14], [42, 14], [42, 32], [66, 32], [66, 14], [88, 14], [88, 32], [112, 32], [112, 14], [134, 14], [134, 32],
    [158, 32], [158, 14], [180, 14], [180, 125],
  ] as const) line(x, y);
  const cubic = (p0: Point, p1: Point, p2: Point, p3: Point) => {
    for (let i = 1; i <= 40; i++) {
      const t = i / 40;
      const u = 1 - t;
      line(
        u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
        u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y,
      );
    }
  };
  cubic({ x: 180, y: 125 }, { x: 180, y: 178 }, { x: 142, y: 212 }, { x: 100, y: 234 });
  cubic({ x: 100, y: 234 }, { x: 58, y: 212 }, { x: 20, y: 178 }, { x: 20, y: 125 });
  return points;
}

/** Os 22 rebites: igualmente espaçados no contorno do escudo, a 90% dele (dentro do aro), como no protótipo. */
export function rivetPoints(): Point[] {
  const path = outline();
  const lengths = [0];
  for (let i = 1; i < path.length; i++) {
    lengths.push(lengths[i - 1]! + Math.hypot(path[i]!.x - path[i - 1]!.x, path[i]!.y - path[i - 1]!.y));
  }
  const total = lengths.at(-1)!;
  return Array.from({ length: RIVET_COUNT }, (_, k) => {
    const at = (k / RIVET_COUNT) * total;
    const i = Math.max(1, lengths.findIndex((length) => length >= at));
    const span = lengths[i]! - lengths[i - 1]!;
    const f = span === 0 ? 0 : (at - lengths[i - 1]!) / span;
    const x = path[i - 1]!.x + (path[i]!.x - path[i - 1]!.x) * f;
    const y = path[i - 1]!.y + (path[i]!.y - path[i - 1]!.y) * f;
    return { x: 100 + (x - 100) * 0.9, y: 124 + (y - 124) * 0.9 };
  });
}

/** As fendas pretas do chão onde o escudo crava: três de cada lado, sempre as mesmas. */
function cracks(): string[] {
  const lines: string[] = [];
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      let x = 500 + dir * 60;
      let y = 352 - k * 3;
      let d = `M${x} ${y}`;
      for (let i = 0; i < 7; i++) {
        x += dir * (26 + ((i * 13 + k * 7) % 30));
        y += ((i * 5 + k * 3) % 10) - 5;
        d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
      }
      lines.push(d);
    }
  }
  return lines;
}

/** A muralha: tijolos com ameias a cada 100 unidades. */
function wallPath(): string {
  let d = 'M0 150 V40';
  for (let x = 0; x < 1000; x += 100) d += ` H${x + 10} V14 H${x + 60} V40 H${x + 100}`;
  return `${d} V150 Z`;
}

export function AbsoluteDefense({ beat, me, reduced, box }: SceneProps) {
  const mine = beat.event.type === 'AbsoluteDefenseStarted' && beat.event.player === me;
  const [shield, setShield] = useState<'off' | 'falling' | 'landed'>('off');
  const [queens, setQueens] = useState(0);
  const [flying, setFlying] = useState<number | null>(null);
  const [rivets, setRivets] = useState(0);
  const [locked, setLocked] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const wall = useRef<HTMLDivElement>(null);
  const shieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ids: number[] = [];
    const at = (ms: number, action: () => void) => ids.push(window.setTimeout(action, ms));
    if (!reduced) at(M.shieldLandsAt - FALL_MS, () => setShield('falling'));
    at(M.shieldLandsAt, () => setShield('landed'));
    M.queensAt.forEach((ms, i) => {
      if (!reduced) at(ms - QUEEN_FLIGHT_MS, () => setFlying(i));
      at(ms, () => {
        setFlying(null);
        setQueens(i + 1);
      });
    });
    for (let i = 0; i < RIVET_COUNT; i++) at(M.lockAt - RIVETS_LEAD_MS + i * RIVET_GAP_MS, () => setRivets(i + 1));
    at(M.lockAt, () => setLocked(true));
    at(M.insigniaAt, () => setLeaving(true));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [reduced]);

  // A muralha sobe; o escudo despenca, achata ao cravar e pulsa na trava.
  useEffect(() => {
    if (reduced) return;
    const motion = wall.current?.animate?.(
      [{ transform: 'translateY(160px)' }, { transform: 'translateY(-6px)', offset: 0.8 }, { transform: 'translateY(0)' }],
      { duration: 520, delay: M.barsIn, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' },
    );
    return () => motion?.cancel();
  }, [reduced]);
  useEffect(() => {
    const el = shieldRef.current;
    if (reduced || el === null) return;
    const motion =
      shield === 'falling'
        ? el.animate?.([{ transform: 'translateY(-520px) scale(1.15)' }, { transform: 'none' }], {
            duration: FALL_MS,
            easing: 'cubic-bezier(.55,0,1,.6)',
            fill: 'both',
          })
        : shield === 'landed'
          ? el.animate?.([{ transform: 'scale(1.06, .92)' }, { transform: 'scale(.98, 1.03)' }, { transform: 'none' }], { duration: 260, easing: 'ease-out' })
          : undefined;
    return () => motion?.cancel();
  }, [shield, reduced]);
  useEffect(() => {
    if (reduced || !locked) return;
    const motion = shieldRef.current?.animate?.([{ transform: 'scale(1.1)' }, { transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.2,.9,.3,1.4)' });
    return () => motion?.cancel();
  }, [locked, reduced]);

  const fit = stageFit(box.band.w, box.band.h);
  const center: ScenePoint = { x: box.band.x + fit.x + SHIELD_CENTER.x * fit.scale, y: box.band.y + fit.y + SHIELD_CENTER.y * fit.scale };
  const owner = mine ? 'voce' : 'oponente';
  return (
    <>
      <SceneFrame kind="ABSOLUTE_DEFENSE" box={box} reduced={reduced}>
        {/* Os raios suaves de ouro abrem por trás na trava (até 35%: nada acende acima de 25% da tela fora da inversão). */}
        <div
          data-raios-luz
          className="absolute size-[1200px] rounded-full transition-[opacity,rotate] duration-[900ms] ease-out"
          style={{
            left: `${SHIELD_CENTER.x - 600}px`,
            top: `${340 - 600}px`,
            background: 'repeating-conic-gradient(var(--color-ouro) 0deg 5deg, transparent 5deg 18deg)',
            maskImage: 'radial-gradient(circle, black 15%, transparent 60%)',
            opacity: locked ? 0.35 : 0,
            rotate: locked || reduced ? '0deg' : '-8deg',
          }}
        />
        <div ref={wall} data-muralha className="absolute inset-x-0 bottom-0 h-[150px]">
          <svg viewBox="0 0 1000 150" preserveAspectRatio="none" className="block size-full">
            <path d={wallPath()} fill="color-mix(in oklab, var(--color-tinta), var(--color-papel) 18%)" stroke="var(--color-tinta)" strokeWidth="4" />
            <path d="M0 74 H1000 M0 108 H1000" stroke="var(--color-tinta)" strokeWidth="4" />
          </svg>
        </div>
        {shield !== 'off' && !reduced ? (
          <svg viewBox="0 0 1000 360" className="absolute inset-0 size-full">
            {cracks().map((d, i) => (
              <path key={d} d={d} fill="none" stroke="var(--color-tinta)" strokeWidth={5 - (i % 3)} opacity={shield === 'landed' ? 1 : 0} />
            ))}
          </svg>
        ) : null}
        {shield !== 'off' ? (
          <div
            ref={shieldRef}
            data-escudo
            data-pousado={shield === 'landed' ? '' : undefined}
            className="absolute"
            style={{ left: `${SHIELD_CENTER.x - SHIELD_W / 2}px`, top: `${SHIELD_CENTER.y - SHIELD_H / 2}px`, width: `${SHIELD_W}px`, height: `${SHIELD_H}px` }}
          >
            <FortShield queens={queens} rivets={rivets} locked={locked} reduced={reduced} />
          </div>
        ) : null}
        {flying !== null ? <FlyingQueen index={flying} /> : null}
        {locked && !reduced ? (
          <svg viewBox="0 0 1000 360" className="absolute inset-0 size-full overflow-visible">
            <circle cx={SHIELD_CENTER.x} cy={SHIELD_CENTER.y} r="20" fill="none" stroke="var(--color-ouro)" strokeWidth="10" className="origin-center animate-[onda-cena_900ms_cubic-bezier(.1,.8,.3,1)_forwards] [transform-box:fill-box]" />
          </svg>
        ) : null}
      </SceneFrame>
      {leaving ? <FlyingInsignia from={center} to={box.portrait[owner]} target={owner} scale={fit.scale} reduced={reduced} /> : null}
    </>
  );
}

/** O escudo-fortaleza: aro de ouro gravado, campo esquartelado, as letras Q, os rebites e o emblema da coroa. */
function FortShield({ queens, rivets, locked, reduced }: { queens: number; rivets: number; locked: boolean; reduced: boolean }) {
  const id = useId();
  const sheen = useRef<SVGRectElement>(null);
  const points = rivetPoints();
  useEffect(() => {
    if (reduced || !locked) return;
    const motion = sheen.current?.animate?.([{ transform: 'skewX(-18deg) translateX(0)' }, { transform: 'skewX(-18deg) translateX(440px)' }], { duration: 650, easing: 'ease-in-out' });
    return () => motion?.cancel();
  }, [locked, reduced]);
  return (
    <svg viewBox="-10 -10 220 260" className="size-full overflow-visible">
      <defs>
        <clipPath id={`${id}-escudo`}>
          <path d={FORT_SHIELD} />
        </clipPath>
        <clipPath id={`${id}-campo`}>
          <path d={FORT_SHIELD} transform={FORT_FIELD} />
        </clipPath>
        <linearGradient id={`${id}-metal`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="color-mix(in oklab, var(--color-ouro), var(--color-papel) 55%)" />
          <stop offset=".45" stopColor="var(--color-ouro)" />
          <stop offset="1" stopColor="color-mix(in oklab, var(--color-ouro), var(--color-tinta) 25%)" />
        </linearGradient>
        <pattern id={`${id}-gravura`} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
          <rect width="1.3" height="5" fill="var(--color-tinta)" />
        </pattern>
      </defs>
      <path d={FORT_SHIELD} fill={`url(#${id}-metal)`} />
      <g clipPath={`url(#${id}-escudo)`}>
        <rect width="200" height="250" fill={`url(#${id}-gravura)`} opacity=".22" />
      </g>
      <g clipPath={`url(#${id}-campo)`}>
        <rect width="200" height="250" fill="var(--color-papel)" />
        <rect x="100" y="0" width="100" height="118" fill="var(--color-vermelho)" />
        <rect x="0" y="118" width="100" height="140" fill="var(--color-vermelho)" />
      </g>
      <path d="M100 38 V222 M36 118 H164" stroke="var(--color-tinta)" strokeWidth="7" />
      <path d={FORT_SHIELD} transform={FORT_FIELD} fill="none" stroke="var(--color-tinta)" strokeWidth="5" />
      {QUARTERS.map(([x, y], i) => (
        <text
          key={i}
          data-quarto={i}
          data-aceso={i < queens ? '' : undefined}
          x={x}
          y={y + 13}
          textAnchor="middle"
          className="font-madeira"
          fontSize="34"
          fill={i === 1 || i === 2 ? 'var(--color-papel)' : 'var(--color-tinta)'}
          stroke="var(--color-tinta)"
          strokeWidth={i === 1 || i === 2 ? 1.5 : 0}
          opacity={i < queens ? 1 : 0}
        >
          Q
        </text>
      ))}
      <g data-emblema data-aceso={locked ? '' : undefined} opacity={locked ? 1 : 0}>
        <circle cx="100" cy="118" r="25" fill={`url(#${id}-metal)`} stroke="var(--color-tinta)" strokeWidth="5" />
        <path d="M84 128 L86 106 L93 116 L100 101 L107 116 L114 106 L116 128 Z" fill="var(--color-tinta)" />
      </g>
      {points.map(({ x, y }, i) => (
        <circle
          key={i}
          data-rebite
          data-aceso={i < rivets ? '' : undefined}
          cx={x.toFixed(1)}
          cy={y.toFixed(1)}
          r="4"
          fill="var(--color-papel)"
          stroke="var(--color-tinta)"
          strokeWidth="2"
          opacity={i < rivets ? 1 : 0}
        />
      ))}
      <g clipPath={`url(#${id}-escudo)`}>
        <rect ref={sheen} x="-150" y="-20" width="70" height="300" fill="var(--color-papel)" opacity={reduced ? 0 : 0.7} transform="skewX(-18)" />
      </g>
      <path d={FORT_SHIELD} fill="none" stroke="var(--color-tinta)" strokeWidth="9" strokeLinejoin="round" />
    </svg>
  );
}

/** Um Q que vem voando de um canto e crava no quarto dele. */
function FlyingQueen({ index }: { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [qx, qy] = QUARTERS[index]!;
  const kx = SHIELD_W / 220;
  const ky = SHIELD_H / 260;
  const tx = SHIELD_CENTER.x - SHIELD_W / 2 + (qx + 10) * kx;
  const ty = SHIELD_CENTER.y - SHIELD_H / 2 + (qy + 10) * ky;
  const [ox, oy] = QUEEN_FROM[index]!;
  useEffect(() => {
    const motion = ref.current?.animate?.(
      [{ transform: `translate(${ox - tx}px, ${oy - ty}px) rotate(${index % 2 ? 200 : -200}deg) scale(1.8)` }, { transform: 'none' }],
      { duration: QUEEN_FLIGHT_MS, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'both' },
    );
    return () => motion?.cancel();
  }, [index, ox, oy, tx, ty]);
  return (
    <div
      ref={ref}
      data-carta-cena="Q"
      className={`absolute -ml-[15px] -mt-[21px] grid h-[42px] w-[30px] place-items-center rounded-[2px] border-[2.5px] border-tinta bg-papel font-madeira text-[15px] ${index === 1 || index === 2 ? 'text-vermelho' : 'text-tinta'}`}
      style={{ left: `${tx}px`, top: `${ty}px` }}
    >
      Q
    </div>
  );
}

/** O escudo encolhe e voa até o retrato do dono; lá vira a insígnia do placar. Com movimento reduzido, só aparece no retrato. */
function FlyingInsignia({
  from,
  to,
  target,
  scale,
  reduced,
}: {
  from: ScenePoint;
  to: ScenePoint;
  target: 'voce' | 'oponente';
  scale: number;
  reduced: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const size = 30;
  useEffect(() => {
    const start = (SHIELD_H * scale) / size;
    const motion = ref.current?.animate?.(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [
            { transform: `translate(${from.x - to.x}px, ${from.y - to.y}px) scale(${start})`, opacity: 1 },
            { transform: 'none', opacity: 1 },
          ],
      { duration: INSIGNIA_FLIGHT_MS, easing: 'cubic-bezier(.3,.9,.3,1.25)', fill: 'both' },
    );
    return () => motion?.cancel();
  }, [from, to, scale, reduced]);
  return (
    <div
      ref={ref}
      data-insignia-voa
      data-alvo={target}
      className="pointer-events-none absolute z-20"
      style={{ left: `${to.x - (size * 0.85) / 2}px`, top: `${to.y - size / 2}px`, width: `${size * 0.85}px`, height: `${size}px` }}
    >
      <Insignia className="size-full" />
    </div>
  );
}
