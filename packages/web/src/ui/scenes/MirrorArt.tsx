// O espelho grande do Reflect (sub-projeto 6 §7.5), o desenho do protótipo aprovado: o vidro, os reflexos e a moldura de ouro. O brilho em
// volta é desenhado, sem `drop-shadow`, que pesa no celular (§11). O que a cena anima no vidro (o lampejo, a ondulação, a trinca) entra
// como filho, recortado pelo triângulo.
import { useId, type ReactNode } from 'react';
import { MIRROR_PATH } from '../table/MirrorMark.tsx';

export function MirrorArt({ children }: { children?: ReactNode }) {
  const clip = useId();
  const glass = useId();
  return (
    <svg viewBox="-100 -100 200 200" aria-hidden="true" className="size-full overflow-visible">
      <defs>
        <clipPath id={clip}>
          <path d={MIRROR_PATH} />
        </clipPath>
        <linearGradient id={glass} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#e3e9e6" />
          <stop offset="0.55" stopColor="#f7faf8" />
          <stop offset="1" stopColor="#a9b4b0" />
        </linearGradient>
      </defs>
      <path d={MIRROR_PATH} fill="none" stroke="var(--color-papel)" strokeWidth="26" strokeLinejoin="round" opacity="0.28" />
      <path d={MIRROR_PATH} fill={`url(#${glass})`} />
      <g clipPath={`url(#${clip})`}>
        <path d="M-60 40 L-8 -60 L4 -60 L-48 40 Z M-30 40 L18 -48 L24 -48 L-24 40 Z" fill="#fff" opacity="0.55" />
        {children}
      </g>
      <path d={MIRROR_PATH} fill="none" stroke="var(--color-ouro)" strokeWidth="12" strokeLinejoin="round" />
      <path d={MIRROR_PATH} fill="none" stroke="var(--color-tinta)" strokeWidth="3.5" strokeLinejoin="round" />
      <path d="M0 -70 L62 37 L-62 37 Z" fill="none" stroke="#fffdf3" strokeWidth="1.6" opacity="0.8" />
    </svg>
  );
}

/** As cópias do K, do J e do Q nas pontas do espelho (§7: as cartas da cena são desenhos dela). */
export const MIRROR_CARDS = ['K', 'J', 'Q'] as const;
/** O tamanho da cópia no espelho de 300 px; ela encolhe junto com ele. */
export const mirrorCardSize = (size: number): { w: number; h: number } => ({ w: Math.round(46 * (size / 300)), h: Math.round(64 * (size / 300)) });
/** A cópia, centrada no ponto. O voo, quem anima é a cena. */
export const MIRROR_CARD_CLASS = 'absolute grid place-items-center rounded-[2px] border-[2.5px] border-tinta bg-papel font-madeira text-xl leading-none text-tinta';
