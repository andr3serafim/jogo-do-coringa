// A cena da Devastação (sub-projeto 6 §7.4), no campo, sobre a fileira atingida (`field`), desenhada a partir do protótipo aprovado:
// 1. a terra ronca: o campo do alvo escurece um pouco e treme cada vez mais, pedrinhas pulam, as cartas sacodem e o retrato de quem
//    lançou brilha em vermelho;
// 2. a fenda corre ao longo da fileira (`crackAt`);
// 3. o chão se abre (`openAt`): o abismo de bordas irregulares, a parede do fundo iluminada, as rachaduras pelo campo (recortadas no
//    campo do alvo: nenhuma passa para o do outro), e as cartas tombam para dentro; sobem poeira e entulho. A inversão é da linha do
//    tempo, no mesmo instante;
// 4. o nome carimba (`titleAt`).
// Na **cancelada**, a terra ronca, a fenda começa e para (`stopAt`) e o tremor morre: sem abismo nem nome. A fita diz o motivo.
//
// As cartas de verdade já foram para o cemitério (a `view` é a de depois): as da cena são cópias, nas vagas da fileira. Sem tarjas nem
// cortina (desvio da letra do §7, como no protótipo: escurecer a mesa esconderia o que cai).
//
// Desempenho (§11): só `transform` e `opacity` animam. O abismo é um `<svg>` próprio: o filtro (`feTurbulence` e `feDisplacementMap`)
// é desenhado uma vez, e o que anima é o elemento de fora, no compositor. A fenda corre por escala, e não por `stroke-dashoffset`; a
// poeira não tem `blur`, e a mesa treme por `transform`. As partículas são elementos soltos, fora do React, e cada uma sai sozinha no
// fim da vida dela. Com movimento reduzido: nenhum tremor, queda nem partícula; a fenda e o abismo aparecem, e as cópias somem.
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SCENE_MOMENTS } from '../../model/scene-moments.ts';
import { RARE_SCENE_MS } from '../../model/timeline.ts';
import { revealRow, type SceneRect, type SceneRow } from '../anim/scene-box.ts';
import type { SceneProps } from '../anim/scenes-loader.ts';
import { Card } from '../cards/Card.tsx';
import { chasmBranches, chasmEdges, chasmPaths } from './chasm.ts';
import { Stamp } from './SceneFrame.tsx';
import { rng, shakeFrames, spawn } from '../anim/particles.ts';

const M = SCENE_MOMENTS.DEVASTATION;
const C = SCENE_MOMENTS.DEVASTATION_CANCELED;
const EDGE_SEED = 31;
const BRANCH_SEED = 77;
/** A fenda passa um pouco das pontas da fileira. */
const OVERHANG = 40;
/** Cada carta cai por 1 s, uma depois da outra. */
const FALL_MS = 1_000;
const FALL_DELAY_MS = 80;
const FALL_STAGGER_MS = 90;
/** O tremor grande do chão que se abre. */
const OPEN_SHAKE_MS = 950;
/** A altura que o nome carimbado ocupa, no máximo. */
const STAMP_ROOM = 88;
const STAMP_LOOK = 'border-vermelho px-4 text-3xl -rotate-[4deg] bg-tinta text-papel [text-shadow:4px_4px_0_var(--color-vermelho)] pc:px-6 pc:text-6xl';

export function Devastation({ beat, me, reduced, box, field }: SceneProps) {
  const { event } = beat;
  const canceled = event.type === 'DevastationCanceled';
  const reflected = event.type === 'RowDevastated' && event.reflected;
  // Quem lançou: quem perdeu a fileira só se a Devastação voltou; na cancelada, o evento já diz.
  const casterIsMe = event.type === 'RowDevastated' && !reflected ? event.player !== me : 'player' in event && event.player === me;
  const cards = event.type === 'RowDevastated' ? event.cards : [];
  const lastFall = FALL_DELAY_MS + Math.max(0, cards.length - 1) * FALL_STAGGER_MS + FALL_MS;
  const owner = field?.player ?? null;
  const rowName = field?.row ?? null;

  const root = useRef<HTMLDivElement>(null);
  const anchor = useRef<HTMLSpanElement>(null);
  const [row, setRow] = useState<SceneRow | null>(null);
  const [crack, setCrack] = useState(false);
  const [stopped, setStopped] = useState(false);
  const [open, setOpen] = useState(false);
  const [stamp, setStamp] = useState(false);
  const [fallen, setFallen] = useState(false);
  const [lit, setLit] = useState(true);

  const fenda = useRef<SVGSVGElement>(null);
  const abyss = useRef<SVGSVGElement>(null);
  const branchesRef = useRef<SVGSVGElement>(null);
  const dim = useRef<HTMLDivElement>(null);
  const copies = useRef<HTMLDivElement>(null);
  const particles = useRef<HTMLDivElement>(null);
  const glow = useRef<HTMLDivElement>(null);
  const rough = useId();
  const pit = useId();
  const clip = useId();

  // A fileira à vista (no celular, os campos rolam até ela) e medida. A caixa muda quando o palco muda de tamanho.
  useLayoutEffect(() => {
    if (owner === null || rowName === null) return;
    const palco = anchor.current?.closest<HTMLElement>('[data-palco]') ?? null;
    const measure = () => {
      if (palco !== null) revealRow(palco, owner, rowName);
      setRow(box.row(owner, rowName));
    };
    measure();
  }, [owner, rowName, box]);

  // Os instantes da cena.
  useEffect(() => {
    const at = (ms: number, action: () => void) => window.setTimeout(action, ms);
    const ids = canceled
      ? [at(C.crackAt, () => setCrack(true)), at(C.stopAt, () => setStopped(true)), at(C.rumbleUntil, () => setLit(false))]
      : [
          at(M.crackAt, () => setCrack(true)),
          at(M.openAt, () => setOpen(true)),
          at(M.titleAt, () => setStamp(true)),
          at(M.rumbleUntil, () => setLit(false)),
          at(reduced ? M.openAt : M.openAt + lastFall, () => setFallen(true)),
        ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [canceled, reduced, lastFall]);

  // A terra ronca: o campo do alvo treme, cada vez mais, até o fim do ronco (na cancelada, até a fenda parar). `data-tremendo` marca o
  // campo; o movimento é por `transform`. O chão que se abre sacode os campos inteiros, de 18 px até parar.
  useEffect(() => {
    if (reduced || owner === null) return;
    const palco = anchor.current?.closest<HTMLElement>('[data-palco]');
    const target = palco?.querySelector<HTMLElement>(`[data-campo="${owner}"]`);
    if (!palco || !target) return;
    const until = canceled ? C.stopAt : M.rumbleUntil;
    target.setAttribute('data-tremendo', '');
    const rumble = target.animate?.(canceled ? shakeFrames(1, 5) : shakeFrames(1, 7), { duration: until, easing: 'linear' });
    const ids = [window.setTimeout(() => target.removeAttribute('data-tremendo'), until)];
    let big: Animation | undefined;
    if (!canceled) {
      ids.push(
        window.setTimeout(() => {
          big = palco.querySelector('[data-campos]')?.animate?.(shakeFrames(18, 0), { duration: OPEN_SHAKE_MS, easing: 'linear' });
        }, M.openAt),
      );
    }
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      target.removeAttribute('data-tremendo');
      rumble?.cancel();
      big?.cancel();
    };
  }, [reduced, owner, canceled]);

  // O campo escurece e o retrato de quem lançou brilha, durante o ronco.
  useEffect(() => {
    if (reduced) return;
    const motions = [
      glow.current?.animate?.([{ opacity: 0 }, { opacity: 0.9, offset: 0.4 }, { opacity: 0 }], { duration: M.rumbleUntil, fill: 'both' }),
    ];
    return () => motions.forEach((motion) => motion?.cancel());
  }, [reduced]);
  const measured = row !== null;
  useEffect(() => {
    if (reduced || !measured) return;
    const end = canceled ? RARE_SCENE_MS.DEVASTATION_CANCELED : RARE_SCENE_MS.DEVASTATION;
    const motion = dim.current?.animate?.([{ opacity: 0 }, { opacity: 0.2, offset: M.rumbleUntil / end }, { opacity: 0.2, offset: 0.9 }, { opacity: 0 }], {
      duration: end,
      fill: 'both',
    });
    return () => motion?.cancel();
  }, [reduced, measured, canceled]);

  // As cartas sacodem no ronco e tombam para dentro do abismo quando ele abre.
  useEffect(() => {
    if (reduced || !measured) return;
    const motions = [...(copies.current?.querySelectorAll<HTMLElement>('[data-carta-caindo]') ?? [])].map((copy, i) =>
      copy.animate?.(
        [
          { transform: 'none' },
          { transform: 'translate(-2px, 1px) rotate(-1.5deg)' },
          { transform: 'translate(2px, -1px) rotate(1.5deg)' },
          { transform: 'none' },
        ],
        { duration: 100, iterations: Math.floor(M.rumbleUntil / 100), delay: i * 20 },
      ),
    );
    return () => motions.forEach((motion) => motion?.cancel());
  }, [reduced, measured]);

  const layout = useMemo(() => {
    if (row === null) return null;
    const { x: ox, y: oy } = box.band;
    const inner = (rect: SceneRect): SceneRect => ({ ...rect, x: rect.x - ox, y: rect.y - oy });
    const rect = inner(row.rect);
    const slots = row.slots.map(inner);
    const first = slots[0] ?? rect;
    const last = slots.at(-1) ?? rect;
    const x0 = first.x - OVERHANG;
    const x1 = last.x + last.w + OVERHANG;
    const yc = rect.y + rect.h / 2;
    const edges = chasmEdges(x0, x1, yc, EDGE_SEED, Math.min(60, Math.max(18, rect.h * 0.42)));
    return { slots, x0, x1, yc, field: inner(row.field), paths: chasmPaths(edges, x0, x1, yc), branches: chasmBranches(edges, BRANCH_SEED) };
  }, [row, box.band]);

  // A fenda corre por escala, a partir da ponta; na cancelada, para no meio e some.
  const originX = layout?.x0 ?? 0;
  useEffect(() => {
    if (!crack || reduced) return;
    const node = fenda.current;
    if (!node) return;
    const motion = canceled
      ? node.animate?.([{ transform: 'scaleX(0)' }, { transform: 'scaleX(0.55)' }], { duration: C.stopAt - C.crackAt, easing: 'ease-out', fill: 'forwards' })
      : node.animate?.([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 200, easing: 'cubic-bezier(.6,0,.3,1)', fill: 'backwards' });
    return () => motion?.cancel();
  }, [crack, reduced, canceled]);
  useEffect(() => {
    if (!stopped) return;
    const motion = fenda.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], {
      duration: RARE_SCENE_MS.DEVASTATION_CANCELED - C.stopAt,
      easing: 'ease-in',
      fill: 'forwards',
    });
    return () => motion?.cancel();
  }, [stopped]);

  // O chão se abre: o abismo cresce, as rachaduras acendem uma a uma, as cartas caem, a poeira e o entulho sobem.
  useEffect(() => {
    if (!open || reduced) return;
    const motions: Array<Animation | undefined> = [
      abyss.current?.animate?.([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1.18)', offset: 0.55 }, { transform: 'none' }], {
        duration: 360,
        easing: 'cubic-bezier(.2,.9,.3,1)',
        fill: 'backwards',
      }),
    ];
    for (const [i, path] of [...(branchesRef.current?.querySelectorAll('[data-rachadura]') ?? [])].entries()) {
      motions.push(path.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 160, delay: i * 30, fill: 'backwards' }));
    }
    const yc = layout?.yc ?? 0;
    for (const [i, copy] of [...(copies.current?.querySelectorAll<HTMLElement>('[data-carta-caindo]') ?? [])].entries()) {
      const center = copy.offsetTop + copy.offsetHeight / 2;
      const dy = yc - center;
      const turn = (i % 2 ? 1 : -1) * (14 + ((i * 13) % 20));
      const timing = { duration: FALL_MS, delay: FALL_DELAY_MS + i * FALL_STAGGER_MS, easing: 'cubic-bezier(.5,0,.9,.5)', fill: 'forwards' } as const;
      motions.push(
        copy.animate?.(
          [
            { transform: 'none', opacity: 1 },
            { transform: `translateY(${dy - 8}px) rotate(${turn * 0.4}deg) scale(1.04)`, opacity: 1, offset: 0.2 },
            { transform: `translateY(${dy + 4}px) rotate(${turn}deg) scale(0.6)`, opacity: 1, offset: 0.6 },
            { transform: `translateY(${dy + 10}px) rotate(${turn * 1.5}deg) scale(0.12)`, opacity: 0 },
          ],
          timing,
        ),
        // A carta escurece ao cair: uma camada de tinta por cima, para não animar `filter`.
        copy.querySelector('[data-sombra-queda]')?.animate?.(
          [{ opacity: 0 }, { opacity: 0.1, offset: 0.2 }, { opacity: 0.65, offset: 0.6 }, { opacity: 1 }],
          timing,
        ),
      );
    }
    return () => motions.forEach((motion) => motion?.cancel());
  }, [open, reduced, layout]);

  // As partículas: as pedrinhas do ronco, a poeira e o entulho da abertura.
  const x0 = layout?.x0 ?? 0;
  const x1 = layout?.x1 ?? 0;
  const yc = layout?.yc ?? 0;
  useEffect(() => {
    const parent = particles.current;
    if (reduced || !measured || parent === null) return;
    const r = rng(101);
    const ids: number[] = [];
    const at = (ms: number, action: () => void) => ids.push(window.setTimeout(action, ms));
    const until = canceled ? C.stopAt : M.rumbleUntil;
    for (let t = 0; t < until; t += 50) {
      const size = 3 + r() * 6;
      const left = x0 + r() * (x1 - x0);
      const top = yc + (r() - 0.5) * 90;
      const jump = 4 + r() * 12;
      at(t, () => {
        const pebble = document.createElement('div');
        pebble.className = 'absolute rounded-[30%] border-[1.5px] border-[#2a211a] bg-[#5d4c3d]';
        Object.assign(pebble.style, { left: `${left}px`, top: `${top}px`, width: `${size}px`, height: `${size}px` });
        spawn(ids, parent, pebble, [
          { transform: 'translateY(0)' },
          { transform: `translateY(-${jump.toFixed(0)}px)`, offset: 0.25 },
          { transform: 'translateY(0)', offset: 0.5 },
          { transform: `translateY(-${(jump / 2).toFixed(0)}px)`, offset: 0.75 },
          { transform: 'translateY(0)' },
        ], 320, 'linear');
      });
    }
    if (!canceled) {
      for (let i = 0; i < 16; i++) {
        const size = 60 + r() * 120;
        const left = x0 + 30 + r() * Math.max(0, x1 - x0 - 60);
        const lift = 30 + r() * 50;
        const end = { x: (r() - 0.5) * 140, y: 80 + r() * 90 };
        const drift = (r() - 0.5) * 60;
        const delay = r() * 250;
        const life = 1_300 + r() * 600;
        at(M.openAt + delay, () => {
          const cloud = document.createElement('div');
          cloud.className = 'absolute rounded-full';
          Object.assign(cloud.style, {
            left: `${left - size / 2}px`,
            top: `${yc - size / 2}px`,
            width: `${size}px`,
            height: `${size}px`,
            background: 'radial-gradient(circle, rgb(176 156 130 / .8), rgb(138 118 96 / .5) 45%, transparent 70%)',
          });
          spawn(ids, parent, cloud, [
            { transform: 'translate(0, 0) scale(0.3)', opacity: 0 },
            { transform: `translate(${drift.toFixed(0)}px, -${lift.toFixed(0)}px) scale(1.2)`, opacity: 0.95, offset: 0.25 },
            { transform: `translate(${end.x.toFixed(0)}px, -${end.y.toFixed(0)}px) scale(2.4)`, opacity: 0 },
          ], life, 'cubic-bezier(.2,.6,.3,1)');
        });
      }
      for (let i = 0; i < 14; i++) {
        const size = 6 + r() * 14;
        const ratio = 0.6 + r() * 0.5;
        const left = x0 + r() * (x1 - x0);
        const dx = (r() - 0.5) * 260;
        const up = 60 + r() * 120;
        const down = 20 + r() * 60;
        const spin = r() * 360;
        const life = 900 + r() * 400;
        at(M.openAt, () => {
          const chunk = document.createElement('div');
          chunk.className = 'absolute border-[1.5px] border-[#241b14]';
          Object.assign(chunk.style, {
            left: `${left}px`,
            top: `${yc}px`,
            width: `${size}px`,
            height: `${size * ratio}px`,
            background: 'linear-gradient(135deg, #7a6450, #3f3227)',
            clipPath: 'polygon(12% 18%, 64% 0, 100% 42%, 78% 100%, 18% 88%, 0 48%)',
          });
          spawn(ids, parent, chunk, [
            { transform: 'translate(0, 0) rotate(0deg)' },
            { transform: `translate(${(dx * 0.5).toFixed(0)}px, -${up.toFixed(0)}px) rotate(${spin.toFixed(0)}deg)`, offset: 0.45 },
            { transform: `translate(${dx.toFixed(0)}px, ${down.toFixed(0)}px) rotate(${(spin * 2).toFixed(0)}deg)`, opacity: 0.9 },
          ], life, 'cubic-bezier(.3,.5,.6,1)');
        });
      }
    }
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      parent.replaceChildren();
    };
  }, [reduced, measured, canceled, x0, x1, yc]);

  const casterSide = casterIsMe ? 'voce' : 'oponente';
  const portrait = box.portrait[casterSide];
  // O nome carimba ao lado da fileira, sem cobrir as cartas que caem: embaixo dela, ou em cima se não couber.
  const rowTop = layout?.slots[0]?.y ?? yc;
  const rowBottom = rowTop + (layout?.slots[0]?.h ?? 0);
  const stampTop = rowBottom + 8 + STAMP_ROOM <= box.band.h ? rowBottom + 8 : Math.max(8, rowTop - 8 - STAMP_ROOM);
  return (
    <>
      <span ref={anchor} hidden />
      {lit && !reduced ? (
        <div
          ref={glow}
          data-brilho-lancador={casterSide}
          className="pointer-events-none absolute z-10 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-0 pc:size-24"
          style={{
            left: `${portrait.x}px`,
            top: `${portrait.y}px`,
            boxShadow: '0 0 0 5px color-mix(in oklab, var(--color-vermelho) 90%, transparent), 0 0 26px 8px color-mix(in oklab, var(--color-vermelho) 70%, transparent)',
          }}
        />
      ) : null}
      {layout ? (
        <div
          ref={root}
          data-campo-cena={beat.scene ?? undefined}
          className="pointer-events-none absolute overflow-hidden"
          style={{ left: `${box.band.x}px`, top: `${box.band.y}px`, width: `${box.band.w}px`, height: `${box.band.h}px` }}
        >
          <div
            ref={dim}
            data-escurece
            className={`absolute bg-tinta ${reduced ? 'opacity-20' : 'opacity-0'}`}
            style={{ left: `${layout.field.x}px`, top: `${layout.field.y}px`, width: `${layout.field.w}px`, height: `${layout.field.h}px` }}
          />
          {open ? (
            <svg ref={branchesRef} className="absolute inset-0 size-full" aria-hidden="true">
              <defs>
                <clipPath id={clip}>
                  <rect x={layout.field.x} y={layout.field.y} width={layout.field.w} height={layout.field.h} />
                </clipPath>
              </defs>
              <g clipPath={`url(#${clip})`}>
                {layout.branches.map((d) => (
                  <g key={d} data-rachadura>
                    <path d={d} fill="none" stroke="#c9b79c" strokeWidth="1.4" transform="translate(1.2 1.2)" opacity=".7" />
                    <path d={d} fill="none" stroke="#1c140f" strokeWidth="2.6" strokeLinecap="round" />
                  </g>
                ))}
              </g>
            </svg>
          ) : null}
          {open ? (
            <svg
              ref={abyss}
              data-abismo
              className="absolute inset-0 size-full"
              style={{ transformOrigin: `${(layout.x0 + layout.x1) / 2}px ${layout.yc}px` }}
              aria-hidden="true"
            >
              <defs>
                <filter id={rough} x="-10%" y="-30%" width="120%" height="160%">
                  <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="3" seed="4" result="n" />
                  <feDisplacementMap in="SourceGraphic" in2="n" scale="7" />
                </filter>
                <linearGradient id={pit} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor="#5a4130" />
                  <stop offset=".22" stopColor="#1a110b" />
                  <stop offset=".6" stopColor="#050302" />
                  <stop offset="1" stopColor="#2e2017" />
                </linearGradient>
              </defs>
              <g filter={`url(#${rough})`}>
                <path d={layout.paths.abyss} fill={`url(#${pit})`} />
                <path d={layout.paths.backWall} fill="#7a5c45" opacity=".75" />
                <path d={layout.paths.topEdge} fill="none" stroke="#b39a7c" strokeWidth="3" />
                <path d={layout.paths.bottomEdge} fill="none" stroke="#120c08" strokeWidth="5" />
              </g>
            </svg>
          ) : null}
          {fallen ? null : (
            <div ref={copies}>
              {cards.map((card, i) => {
                const slot = layout.slots[i];
                if (slot === undefined) return null;
                return (
                  <div
                    key={card.id}
                    data-carta-caindo
                    className="absolute"
                    style={{ left: `${slot.x}px`, top: `${slot.y}px`, width: `${slot.w}px` }}
                  >
                    <Card card={{ ...card, id: `cena-${card.id}` }} size="field" animated={false} />
                    <div data-sombra-queda className="absolute inset-0 rounded-[3px] bg-tinta opacity-0" />
                  </div>
                );
              })}
            </div>
          )}
          {/* A fenda corre por cima das cartas, e o abismo toma o lugar dela. */}
          {crack && !open ? (
            <svg
              ref={fenda}
              data-fenda
              data-parada={stopped ? '' : undefined}
              className="absolute inset-0 size-full"
              style={{ transformOrigin: `${originX}px ${layout.yc}px`, transform: canceled && reduced ? 'scaleX(0.55)' : undefined }}
              aria-hidden="true"
            >
              <path d={layout.paths.crack} fill="none" stroke="#120c08" strokeWidth="3" />
            </svg>
          ) : null}
          <div ref={particles} data-particulas className="absolute inset-0" />
          {stamp ? <Stamp kind="DEVASTATION" reduced={reduced} className={STAMP_LOOK} top={stampTop} /> : null}
        </div>
      ) : null}
    </>
  );
}
