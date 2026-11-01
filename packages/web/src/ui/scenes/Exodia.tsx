// A cena da Exódia (sub-projeto 6 §7.3), desenhada a partir do protótipo aprovado:
// 1. o Coringa de quem venceu no centro da faixa, com a aura vermelha e dourada (a técnica do Ataque, nas cores da Exódia), que
//    cresce;
// 2. os 4 K chegam um a um, girando, e cada um ergue o seu pilar de luz do chão (`kingsAt`); poeira sobe onde eles pousam, e
//    riscos de energia sobem até a coroa. Sem feixes dos K até o Coringa;
// 3. a coroa de metal desce e crava na cabeça dele (`crownAt`): os olhos acendem, a aura explode, os pilares estouram para os
//    lados, sai uma onda de choque e raios estalam em volta até o fim. A inversão é da linha do tempo, no mesmo instante;
// 4. o nome carimba (a moldura, `SceneFrame`). O retrato do perdedor racha no placar (`Anim.defeated`), não aqui.
//
// Desvios do protótipo, por regra: os raios seguem `boltTimes` (até 3 por segundo, entrando e saindo em 100 ms), cada pilar fica
// em até 45% de opacidade (spec 6 §1: nada acima de 25% da tela acende fora da inversão), a coroa tem a sombra desenhada (sem
// `drop-shadow`, que pesa no celular) e a tela não treme. As partículas (poeira, riscos e raios) são elementos soltos animados
// pelo navegador (Web Animations, só `transform` e `opacity`), fora do React, e cada uma sai sozinha no fim da vida dela. Com
// movimento reduzido: a aura parada, os K e a coroa aparecem no lugar, os pilares já erguidos, nenhuma partícula.
import { useEffect, useId, useRef, useState } from 'react';
import { SCENE_MOMENTS } from '../../model/scene-moments.ts';
import type { SceneProps } from '../anim/scenes-loader.ts';
import { Coringa } from '../cards/Coringa.tsx';
import { AURA_BOIL_MS, auraVariants, BOLT_FADE_MS, BOLT_HOLD_MS, boltTimes, EXODIA_AURA } from './aura.ts';
import { SceneFrame } from './SceneFrame.tsx';

const M = SCENE_MOMENTS.EXODIA;
/** O Coringa no centro da faixa, no quadro de 1000 × 360. */
const CX = 500;
const CY = 236;
const HERO_SIZE = 170;
/** A base de cada pilar (onde o K pousa) e de onde cada K vem, fora da faixa. */
const PILLARS = [
  { x: 250, y: 318, from: { x: -220, y: -160 } },
  { x: 380, y: 336, from: { x: 300, y: -420 } },
  { x: 620, y: 336, from: { x: 700, y: -420 } },
  { x: 750, y: 318, from: { x: 1220, y: -160 } },
] as const;
const PILLAR_W = 70;
const PILLAR_H = 440;
/** Cada K voa por 200 ms até pousar no instante dele. */
const KING_FLIGHT_MS = 200;
/** A coroa cai por 380 ms até cravar. */
const CROWN_FALL_MS = 380;
/** A coroa no alto da cabeça do Coringa: o centro e o tamanho (o desenho é de 220 × 150). */
const CROWN = { x: 500, y: 118, w: 190, h: 130 };

const SVG_NS = 'http://www.w3.org/2000/svg';
const AURA_FILL = ['var(--color-vermelho)', 'var(--color-ouro)', 'var(--color-papel)'];
const CROWN_SHAPE = 'M14 108 L24 34 L62 80 L86 14 L110 66 L134 14 L158 80 L196 34 L206 108 Z';

/** Solta uma partícula no `parent`: ela anima pelo navegador e sai sozinha no fim de `lifeMs` (o timer vai para `timers`). */
function spawn(timers: number[], parent: Element, node: Element, keyframes: Keyframe[], lifeMs: number, easing = 'ease-out') {
  node.setAttribute('data-particula', '');
  parent.appendChild(node);
  (node as HTMLElement).animate?.(keyframes, { duration: lifeMs, easing, fill: 'forwards' });
  timers.push(window.setTimeout(() => node.remove(), lifeMs));
}

/** O instante (fração da vida da aura, de `barsIn` a `bandOut`) de cada ms da cena. */
const auraOffset = (ms: number) => (ms - M.barsIn) / (M.bandOut - M.barsIn);

export function Exodia({ beat, me, reduced, box }: SceneProps) {
  const winner = beat.event.type === 'Exodia' ? beat.event.player : me;
  const [launched, setLaunched] = useState(0);
  const [landed, setLanded] = useState(0);
  const [falling, setFalling] = useState(false);
  const [crowned, setCrowned] = useState(false);
  const aura = useRef<SVGSVGElement>(null);
  const layers = useRef<Array<SVGPathElement | null>>([]);
  const kings = useRef<Array<HTMLDivElement | null>>([]);
  const pillars = useRef<Array<HTMLDivElement | null>>([]);
  const crown = useRef<HTMLDivElement>(null);
  const particles = useRef<HTMLDivElement>(null);
  const bolts = useRef<SVGSVGElement>(null);
  const variants = auraVariants(EXODIA_AURA, 401);
  const metal = useId();
  const hatch = useId();

  // Os instantes da cena: cada K sai e pousa, a coroa cai e crava.
  useEffect(() => {
    const at = (ms: number, action: () => void) => window.setTimeout(action, ms);
    const ids = M.kingsAt.flatMap((ms, i) => [
      at(reduced ? ms : ms - KING_FLIGHT_MS, () => setLaunched(i + 1)),
      at(ms, () => setLanded(i + 1)),
    ]);
    ids.push(at(reduced ? M.crownAt : M.crownAt - CROWN_FALL_MS, () => setFalling(true)), at(M.crownAt, () => setCrowned(true)));
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [reduced]);

  // A aura ferve (troca de forma, por atributo, fora do React) e cresce em três tempos: chega, cresce com os K e explode na coroa.
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      layers.current.forEach((path, i) => path?.setAttribute('d', variants[i]![frame % 4]!));
    }, AURA_BOIL_MS);
    const grow = aura.current?.animate?.(
      [
        { transform: 'scale(0.4)', opacity: 0 },
        { transform: 'scale(0.62)', opacity: 0.9, offset: auraOffset(M.barsIn + 900) },
        { transform: 'scale(0.62)', opacity: 0.9, offset: auraOffset(M.kingsAt[3] + 90) },
        { transform: 'scale(0.86)', opacity: 1, offset: auraOffset(M.crownAt - CROWN_FALL_MS) },
        { transform: 'scale(0.86)', opacity: 1, offset: auraOffset(M.crownAt) },
        { transform: 'scale(1.25)', opacity: 1, offset: auraOffset(M.crownAt + 210) },
        { transform: 'scale(1.08)', opacity: 1, offset: auraOffset(M.crownAt + 520) },
        { transform: 'scale(1.08)', opacity: 1 },
      ],
      { duration: M.bandOut - M.barsIn, delay: M.barsIn, easing: 'ease-out', fill: 'both' },
    );
    return () => {
      window.clearInterval(id);
      grow?.cancel();
    };
  }, [reduced, variants]);

  // O voo de cada K, e o pilar dele que sobe quando ele pousa.
  useEffect(() => {
    if (reduced || launched === 0) return;
    const i = launched - 1;
    const { x, y, from } = PILLARS[i]!;
    const spin = i % 2 ? 300 : -300;
    const motion = kings.current[i]?.animate?.(
      [{ transform: `translate(${from.x - x}px, ${from.y - y}px) rotate(${spin}deg) scale(2)` }, { transform: 'none' }],
      { duration: KING_FLIGHT_MS, easing: 'cubic-bezier(.5,0,.9,.6)', fill: 'backwards' },
    );
    return () => motion?.cancel();
  }, [launched, reduced]);
  useEffect(() => {
    if (reduced || landed === 0) return;
    const motion = pillars.current[landed - 1]?.animate?.([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], {
      duration: 260,
      easing: 'cubic-bezier(.2,.9,.3,1)',
    });
    return () => motion?.cancel();
  }, [landed, reduced]);

  // A coroa cai e crava; os pilares estouram para os lados e somem.
  useEffect(() => {
    if (!falling) return;
    const motion = crown.current?.animate?.(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ transform: 'translateY(-380px) scale(1.4) rotate(-8deg)' }, { transform: 'none' }],
      { duration: reduced ? 100 : CROWN_FALL_MS, easing: 'cubic-bezier(.55,0,1,.6)', fill: 'backwards' },
    );
    return () => motion?.cancel();
  }, [falling, reduced]);
  useEffect(() => {
    if (!crowned) return;
    const keyframes = reduced
      ? [{ opacity: 1 }, { opacity: 0 }]
      : [
          { transform: 'scaleY(1) scaleX(1)', opacity: 1 },
          { transform: 'scaleY(1.1) scaleX(2.4)', opacity: 1, offset: 0.3 },
          { transform: 'scaleY(1.1) scaleX(0.2)', opacity: 0 },
        ];
    const motions = pillars.current.map((pillar) => pillar?.animate?.(keyframes, { duration: 700, fill: 'forwards' }));
    return () => motions.forEach((motion) => motion?.cancel());
  }, [crowned, reduced]);

  // As partículas: a poeira onde cada K pousa, os riscos que sobem até a coroa e os raios em volta da aura depois dela.
  useEffect(() => {
    const parent = particles.current;
    const svg = bolts.current;
    if (reduced || parent === null || svg === null) return;
    const ids: number[] = [];
    const at = (ms: number, action: () => void) => ids.push(window.setTimeout(action, ms));
    for (const [k, ms] of M.kingsAt.entries()) {
      at(ms, () => {
        const { x, y } = PILLARS[k]!;
        for (let i = 0; i < 5; i++) {
          const dust = document.createElement('div');
          const size = 12 + ((i * 7 + k * 5) % 20);
          dust.className = 'absolute rounded-full';
          Object.assign(dust.style, {
            left: `${x - size / 2 + (((i * 23 + k * 11) % 60) - 30)}px`,
            top: `${y + 12 - size / 2}px`,
            width: `${size}px`,
            height: `${size}px`,
            background: 'color-mix(in oklab, var(--color-papel), var(--color-tinta) 45%)',
          });
          const dx = (((i * 41 + k * 17) % 100) / 100 - 0.5) * 220;
          const dy = -20 - ((i * 29 + k * 13) % 60);
          spawn(ids, parent, dust, [
            { transform: 'translate(0, 0) scale(0.4)', opacity: 0.9 },
            { transform: `translate(${dx.toFixed(0)}px, ${dy}px) scale(1.7)`, opacity: 0 },
          ], 650 + ((i * 97 + k * 31) % 400));
        }
      });
    }
    for (let t = M.kingsAt[3] + 90, i = 0; t < M.crownAt; t += 45, i++) {
      const n = i;
      at(t, () => {
        const node = document.createElement('div');
        node.className = 'absolute w-[3px] rounded-sm';
        Object.assign(node.style, {
          left: `${CX + (((n * 41) % 100) / 100 - 0.5) * 300}px`,
          top: `${330 - ((n * 37) % 140)}px`,
          height: `${30 + ((n * 23) % 90)}px`,
          background: n % 2 ? 'var(--color-ouro)' : 'var(--color-papel)',
        });
        spawn(ids, parent, node, [
          { transform: 'translateY(0) scaleY(0.4)', opacity: 0 },
          { transform: `translateY(-${80 + ((n * 19) % 60)}px) scaleY(1)`, opacity: 0.95, offset: 0.3 },
          { transform: `translateY(-${240 + ((n * 29) % 120)}px) scaleY(1.3)`, opacity: 0 },
        ], 380 + ((n * 13) % 200), 'ease-in');
      });
    }
    // Raios em volta da aura: até 3 por segundo, entrando e saindo em 100 ms.
    for (const [n, t] of boltTimes(M.crownAt, M.bandOut).entries()) {
      at(t, () => {
        const angle = -Math.PI / 2 + (((n * 37) % 100) / 100 - 0.5) * 2.6;
        const r0 = 80 + ((n * 17) % 50);
        let x = CX + Math.cos(angle) * r0;
        let y = CY + Math.sin(angle) * r0 * 1.1;
        let points = `${x.toFixed(0)},${y.toFixed(0)}`;
        for (let i = 0; i < 6; i++) {
          x += Math.cos(angle) * 18 + (((n * 7 + i * 13) % 28) - 14);
          y += Math.sin(angle) * 18 + (((n * 11 + i * 5) % 28) - 14);
          points += ` ${x.toFixed(0)},${y.toFixed(0)}`;
        }
        const g = document.createElementNS(SVG_NS, 'g');
        for (const [stroke, width, opacity] of [['var(--color-vermelho)', '8', '.7'], ['var(--color-papel)', '3', '1']] as const) {
          const line = document.createElementNS(SVG_NS, 'polyline');
          for (const [name, value] of Object.entries({ points, fill: 'none', stroke, 'stroke-width': width, 'stroke-linejoin': 'round', opacity })) {
            line.setAttribute(name, value);
          }
          g.appendChild(line);
        }
        const life = BOLT_FADE_MS * 2 + BOLT_HOLD_MS;
        const fade = BOLT_FADE_MS / life;
        spawn(ids, svg, g, [{ opacity: 0 }, { opacity: 1, offset: fade }, { opacity: 1, offset: 1 - fade }, { opacity: 0 }], life, 'linear');
      });
    }
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      parent.replaceChildren();
      svg.replaceChildren();
    };
  }, [reduced]);

  return (
    <SceneFrame kind="EXODIA" box={box} reduced={reduced}>
      {PILLARS.map(({ x, y }, i) => (
        <div
          key={`pilar-${x}`}
          ref={(node) => {
            pillars.current[i] = node;
          }}
          data-pilar
          data-aceso={landed > i ? '' : undefined}
          className="absolute origin-bottom"
          style={{
            left: `${x - PILLAR_W / 2}px`,
            top: `${y - 16 - PILLAR_H}px`,
            width: `${PILLAR_W}px`,
            height: `${PILLAR_H}px`,
            // No máximo 45% (spec 6 §1): o miolo de papel do protótipo, apagado.
            opacity: 0.45,
            transform: landed > i ? 'none' : 'scaleY(0)',
            background:
              'linear-gradient(90deg, transparent, color-mix(in oklab, var(--color-ouro) 45%, transparent) 22%, var(--color-papel) 50%, color-mix(in oklab, var(--color-ouro) 45%, transparent) 78%, transparent)',
          }}
        />
      ))}
      <svg
        ref={aura}
        data-aura
        viewBox="-300 -300 600 600"
        className="absolute size-[600px]"
        style={{ left: `${CX - 300}px`, top: `${CY - 300}px`, transformOrigin: '300px 385px', ...(reduced ? { transform: 'scale(1.08)' } : null) }}
      >
        {AURA_FILL.map((fill, i) => (
          <path
            key={fill}
            ref={(path) => {
              layers.current[i] = path;
            }}
            d={variants[i]![0]}
            fill={fill}
            stroke={i < 2 ? 'var(--color-tinta)' : undefined}
            strokeWidth={i === 0 ? 3 : i === 1 ? 2 : undefined}
            strokeLinejoin="round"
          />
        ))}
      </svg>
      <div ref={particles} data-particulas className="absolute inset-0" />
      <div
        data-heroi
        data-vencedor={winner === me ? 'voce' : 'oponente'}
        className="absolute"
        style={{ left: `${CX - HERO_SIZE / 2}px`, top: `${CY - HERO_SIZE / 2}px`, width: `${HERO_SIZE}px`, height: `${HERO_SIZE}px` }}
      >
        <Coringa className="size-full" />
        <svg
          viewBox="0 0 64 64"
          data-olhos
          data-aceso={crowned ? '' : undefined}
          className={`absolute inset-0 size-full ${crowned ? 'opacity-100' : 'opacity-0'}`}
        >
          <path d="M25.5 37.8l4-2.6M34.5 35.2l4 2.6" stroke="var(--color-ouro)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
        </svg>
      </div>
      {PILLARS.map(({ x, y }, i) =>
        launched > i ? (
          <div
            key={`k-${x}`}
            ref={(node) => {
              kings.current[i] = node;
            }}
            data-carta-cena="K"
            data-chegou={landed > i ? '' : undefined}
            data-voo={reduced ? undefined : ''}
            className={`absolute grid h-[64px] w-[46px] place-items-center rounded-[2px] border-[2.5px] border-tinta bg-papel font-madeira text-[26px] shadow-[0_0_18px_4px_color-mix(in_oklab,var(--color-ouro)_70%,transparent)] ${i % 2 ? 'text-vermelho' : 'text-tinta'}`}
            style={{ left: `${x - 23}px`, top: `${y - 52}px` }}
          >
            K
          </div>
        ) : null,
      )}
      {falling ? (
        <div
          ref={crown}
          data-coroa
          data-cravada={crowned ? '' : undefined}
          className="absolute"
          style={{ left: `${CROWN.x - CROWN.w / 2}px`, top: `${CROWN.y - CROWN.h / 2}px`, width: `${CROWN.w}px`, height: `${CROWN.h}px` }}
        >
          <svg viewBox="0 0 220 150" className="size-full overflow-visible">
            <defs>
              <linearGradient id={metal} x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="color-mix(in oklab, var(--color-ouro), var(--color-papel) 55%)" />
                <stop offset=".45" stopColor="var(--color-ouro)" />
                <stop offset="1" stopColor="color-mix(in oklab, var(--color-ouro), var(--color-tinta) 25%)" />
              </linearGradient>
              <pattern id={hatch} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)">
                <rect width="1.3" height="5" fill="var(--color-tinta)" />
              </pattern>
            </defs>
            {/* A sombra chapada, desenhada (sem filtro). */}
            <g transform="translate(5 6)" fill="var(--color-tinta)">
              <path d={CROWN_SHAPE} />
              <rect x="8" y="102" width="204" height="40" rx="5" />
            </g>
            <path d={CROWN_SHAPE} fill={`url(#${metal})`} stroke="var(--color-tinta)" strokeWidth="6" strokeLinejoin="round" />
            <path d={CROWN_SHAPE} fill={`url(#${hatch})`} opacity=".2" />
            <rect x="8" y="102" width="204" height="40" rx="5" fill={`url(#${metal})`} stroke="var(--color-tinta)" strokeWidth="6" />
            {[[24, 30], [86, 10], [134, 10], [196, 30], [110, 62]].map(([x, y]) => (
              <circle key={`${x}-${y}`} cx={x} cy={y} r="9" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="4" />
            ))}
            {[55, 110, 165].map((x) => (
              <circle key={x} cx={x} cy="122" r="10" fill="var(--color-vermelho)" stroke="var(--color-tinta)" strokeWidth="4" />
            ))}
          </svg>
        </div>
      ) : null}
      <svg viewBox="0 0 1000 360" className="absolute inset-0 size-full overflow-visible">
        {crowned && !reduced ? (
          <circle
            data-onda
            cx={CX}
            cy={CY - 36}
            r="20"
            fill="none"
            stroke="var(--color-ouro)"
            strokeWidth="18"
            className="origin-center animate-[onda-cena_1000ms_cubic-bezier(.1,.8,.3,1)_forwards] [transform-box:fill-box]"
          />
        ) : null}
        <g ref={bolts} />
      </svg>
    </SceneFrame>
  );
}
