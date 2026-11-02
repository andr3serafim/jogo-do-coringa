// A moldura comum das cenas refeitas no sub-projeto 6 (§7, "Gramática comum"): as tarjas pretas de cinema que entram em cima e
// embaixo da faixa, a faixa escura onde a cena acontece (com o corte diagonal do protótipo) e o nome carimbado. A cena é
// desenhada num quadro de 1000 × 360 unidades, o palco do protótipo, escalado para caber na faixa medida e centrado
// (`stageFit`). O nome não escala com o quadro: fica legível no celular.
//
// As entradas e saídas usam Web Animations (só `transform` e `opacity`, no compositor). Com movimento reduzido, nada se desloca
// nem cresce: a faixa e o nome só esmaecem, e as tarjas já estão no lugar.
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { SCENE_TITLE } from '../../model/copy.ts';
import { SCENE_MOMENTS, TITLE_MS } from '../../model/scene-moments.ts';
import { RARE_SCENE_MS, type SceneKind } from '../../model/timeline.ts';
import type { SceneBox } from '../anim/scene-box.ts';

export type FramedScene = 'ABSOLUTE_ATTACK' | 'ABSOLUTE_DEFENSE' | 'EXODIA';

/** O quadro do protótipo, em unidades. */
export const STAGE_W = 1000;
export const STAGE_H = 360;

/** Escala e deslocamento do quadro de 1000 × 360 para caber numa faixa de `w` × `h` px, centrado. */
export function stageFit(w: number, h: number): { scale: number; x: number; y: number } {
  const scale = Math.min(w / STAGE_W, h / STAGE_H);
  return { scale, x: (w - STAGE_W * scale) / 2, y: (h - STAGE_H * scale) / 2 };
}

/** O carimbo do nome: entra grande, assenta com um quique, segura e sai crescendo. Reduzido: só esmaece. */
export function stampKeyframes(reduced: boolean): Keyframe[] {
  if (reduced) return [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.85 }, { opacity: 0 }];
  return [
    { opacity: 0, transform: 'scale(3)' },
    { opacity: 1, transform: 'scale(0.94)', offset: 0.09 },
    { opacity: 1, transform: 'scale(1.02)', offset: 0.14 },
    { opacity: 1, transform: 'scale(1)', offset: 0.2 },
    { opacity: 1, transform: 'scale(1.03)', offset: 0.86 },
    { opacity: 0, transform: 'scale(1.25)' },
  ];
}

/** O tamanho e o contorno do carimbo das cenas; o da Exódia é maior, com filete de ouro (§7). */
export const STAMP_SIZE = 'border-tinta px-4 text-3xl pc:px-6 pc:text-6xl';

/**
 * O corte, o fundo (o brilho do meio, a mistura com o papel e com o vermelho), por onde a faixa entra, quando ela sai, e o carimbo
 * de cada cena (§7).
 */
const LOOK: Record<FramedScene, { clip: string; glow: string; warm: string; from: string; outAt: number; stamp: string }> = {
  ABSOLUTE_ATTACK: {
    clip: 'polygon(0 5%, 100% 0, 100% 95%, 0 100%)',
    glow: '50% 50%',
    warm: 'var(--color-papel) 6%',
    from: 'translateX(-100%)',
    outAt: SCENE_MOMENTS.ABSOLUTE_ATTACK.bandOut,
    stamp: `${STAMP_SIZE} -rotate-3 bg-vermelho text-papel [text-shadow:3px_3px_0_var(--color-tinta)]`,
  },
  ABSOLUTE_DEFENSE: {
    clip: 'polygon(0 0, 100% 5%, 100% 100%, 0 95%)',
    glow: '50% 60%',
    warm: 'var(--color-papel) 6%',
    from: 'translateY(40px)',
    outAt: SCENE_MOMENTS.ABSOLUTE_DEFENSE.insigniaAt,
    stamp: `${STAMP_SIZE} rotate-2 bg-papel text-tinta outline-4 -outline-offset-[11px] outline-ouro`,
  },
  EXODIA: {
    clip: 'polygon(0 3%, 100% 0, 100% 97%, 0 100%)',
    glow: '50% 62%',
    warm: 'var(--color-vermelho) 16%',
    from: 'translateY(50px)',
    outAt: SCENE_MOMENTS.EXODIA.bandOut,
    stamp:
      'border-ouro px-6 text-4xl -rotate-2 bg-tinta text-ouro [text-shadow:4px_4px_0_var(--color-vermelho)] pc:px-9 pc:text-7xl',
  },
};

/** As tarjas entram em 260 ms e saem nos últimos 280 ms da cena. */
const BARS_IN_MS = 260;
const BARS_OUT_LEAD_MS = 280;

export function SceneFrame({
  kind,
  box,
  reduced,
  children,
}: {
  kind: FramedScene;
  box: SceneBox | null;
  reduced: boolean;
  children?: ReactNode;
}) {
  const look = LOOK[kind];
  const band = useRef<HTMLDivElement>(null);
  const bars = useRef<HTMLDivElement>(null);
  const [stamp, setStamp] = useState(false);

  useEffect(() => {
    const { titleAt } = SCENE_MOMENTS[kind];
    const ids = [window.setTimeout(() => setStamp(true), titleAt), window.setTimeout(() => setStamp(false), titleAt + TITLE_MS)];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [kind]);

  // A faixa entra e sai; as tarjas também (com movimento reduzido, só a faixa esmaece).
  const drawn = box !== null;
  useEffect(() => {
    if (!drawn) return;
    const end = RARE_SCENE_MS[kind];
    const enter = reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: look.from }, { transform: 'none' }];
    const leave = reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'none', opacity: 1 }, { transform: look.from, opacity: 0 }];
    const motions = [
      band.current?.animate?.(enter, { duration: 300, easing: 'cubic-bezier(.15,.9,.25,1.1)', fill: 'backwards' }),
      band.current?.animate?.(leave, { duration: 220, delay: look.outAt, easing: 'ease-in', fill: 'forwards' }),
    ];
    if (!reduced) {
      for (const bar of bars.current?.querySelectorAll<HTMLElement>('[data-tarja]') ?? []) {
        motions.push(
          bar.animate?.([{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: BARS_IN_MS, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' }),
          bar.animate?.([{ transform: 'scaleY(1)' }, { transform: 'scaleY(0)' }], { duration: BARS_IN_MS, delay: end - BARS_OUT_LEAD_MS, fill: 'forwards' }),
        );
      }
    }
    return () => motions.forEach((motion) => motion?.cancel());
  }, [drawn, kind, look, reduced]);

  if (box === null) return null;
  const fit = stageFit(box.band.w, box.band.h);
  return (
    <div
      data-faixa-cena={kind}
      className="pointer-events-none absolute overflow-hidden"
      style={{ left: `${box.band.x}px`, top: `${box.band.y}px`, width: `${box.band.w}px`, height: `${box.band.h}px` }}
    >
      <div
        ref={band}
        className="absolute inset-0"
        style={{
          clipPath: look.clip,
          background: `radial-gradient(ellipse at ${look.glow}, color-mix(in oklab, var(--color-tinta), ${look.warm}), var(--color-tinta) 78%)`,
        }}
      >
        <div
          data-palco-cena
          className="absolute left-0 top-0 origin-top-left"
          style={{ width: `${STAGE_W}px`, height: `${STAGE_H}px`, transform: `translate(${fit.x}px, ${fit.y}px) scale(${fit.scale})` }}
        >
          {children}
        </div>
      </div>
      <div ref={bars}>
        <div data-tarja="cima" className="absolute inset-x-0 top-0 h-[9%] min-h-4 origin-top bg-tinta" />
        <div data-tarja="baixo" className="absolute inset-x-0 bottom-0 h-[13%] min-h-5 origin-bottom bg-tinta" />
      </div>
      {stamp ? <Stamp kind={kind} reduced={reduced} className={look.stamp} /> : null}
    </div>
  );
}

/** O nome carimbado (Alfa Slab One, a fonte dos carimbos; sem legenda embaixo, §7). Sem `top`, fica na parte de baixo da faixa. */
export function Stamp({ kind, reduced, className, top }: { kind: SceneKind; reduced: boolean; className: string; top?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const motion = ref.current?.animate?.(stampKeyframes(reduced), { duration: TITLE_MS, easing: 'ease-out', fill: 'both' });
    return () => motion?.cancel();
  }, [reduced]);
  return (
    <div
      ref={ref}
      data-carimbo={kind}
      className={`absolute inset-x-0 z-20 text-center ${top === undefined ? 'bottom-[16%]' : ''}`}
      style={top === undefined ? undefined : { top: `${top}px` }}
    >
      <span
        className={`inline-block border-[5px] pb-0.5 pt-1.5 font-madeira uppercase leading-none tracking-[0.03em] shadow-[8px_8px_0_var(--color-tinta)] ${className}`}
      >
        {SCENE_TITLE[kind]}
      </span>
    </div>
  );
}
