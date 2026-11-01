// A fileira desolada depois da Devastação (sub-projeto 6 §7.4): a fenda que ficou, a terra revirada em volta (textura de
// `feTurbulence`, parada, em `multiply`) e as pedras soltas. A fenda é a mesma da cena (as mesmas sementes), para não haver salto
// quando a cena acaba. Quando uma carta volta à fileira, ela se fecha devagar (opacidade e `scaleY`); com movimento reduzido, só some.
//
// Mora num `<li>` escondido do leitor de tela, fora do fluxo, sobre todas as colunas da grade da fileira: assim o `<svg>` da fenda
// acompanha o tamanho das vagas, no celular e no PC, e passa 40 px de cada lado, como a da cena.
import { useEffect, useId, useRef, useState } from 'react';
import { rng } from '../scenes/aura.ts';
import { chasmEdges, chasmPaths } from '../scenes/chasm.ts';

/** Quanto a fenda leva para se fechar. */
export const DESOLATION_CLOSE_MS = 600;
const EDGE_SEED = 31;

/** A fileira deixou de estar desolada: a fenda fica mais um pouco, se fechando (com movimento reduzido, não). */
export function useDesolationClosing(desolated: boolean, reduced: boolean): boolean {
  const [was, setWas] = useState(desolated);
  const [closing, setClosing] = useState(false);
  if (desolated !== was) {
    setWas(desolated);
    setClosing(!desolated && !reduced);
  }
  useEffect(() => {
    if (!closing) return;
    const id = setTimeout(() => setClosing(false), DESOLATION_CLOSE_MS);
    return () => clearTimeout(id);
  }, [closing]);
  return closing && !desolated;
}

/** A fenda, num quadro de 1000 × 100 esticado sobre a fileira: 42% da altura para cada lado, como a da cena. */
const PATHS = chasmPaths(chasmEdges(0, 1000, 50, EDGE_SEED, 42), 0, 1000, 50);

/** As pedras soltas, sempre nos mesmos lugares (em % da fenda). */
const STONES = (() => {
  const r = rng(97);
  return Array.from({ length: 9 }, () => ({
    left: 4 + r() * 92,
    top: 50 + (r() > 0.5 ? 1 : -1) * (34 + r() * 18),
    size: 4 + r() * 8,
  }));
})();

export function RowDesolation({ closing }: { closing: boolean }) {
  const ref = useRef<HTMLLIElement>(null);
  const earth = useId();
  const earthMask = useId();
  const earthFade = useId();
  const rough = useId();
  const pit = useId();

  useEffect(() => {
    if (!closing) return;
    const motion = ref.current?.animate?.(
      [
        { opacity: 1, transform: 'scaleY(1)' },
        { opacity: 0, transform: 'scaleY(0.15)' },
      ],
      { duration: DESOLATION_CLOSE_MS, easing: 'ease-in', fill: 'forwards' },
    );
    return () => motion?.cancel();
  }, [closing]);

  return (
    <li
      ref={ref}
      aria-hidden="true"
      data-desolacao
      data-fechando={closing ? '' : undefined}
      className="pointer-events-none absolute -inset-x-10 inset-y-0 z-0"
      style={{ gridColumn: '1 / -1', gridRow: 1 }}
    >
      <svg data-terra className="absolute inset-0 size-full overflow-visible mix-blend-multiply">
        <defs>
          <filter id={earth} x="0" y="0" width="100%" height="100%">
            <feTurbulence type="fractalNoise" baseFrequency=".05" numOctaves="4" seed="9" result="n" />
            <feColorMatrix in="n" type="matrix" values="0 0 0 0 .22  0 0 0 0 .16  0 0 0 0 .1  0 0 0 2 -.75" />
          </filter>
          <radialGradient id={earthFade}>
            <stop offset=".25" stopColor="#fff" />
            <stop offset="1" stopColor="#000" />
          </radialGradient>
          <mask id={earthMask} maskContentUnits="objectBoundingBox">
            <rect width="1" height="1" fill={`url(#${earthFade})`} />
          </mask>
        </defs>
        <rect width="100%" height="100%" filter={`url(#${earth})`} mask={`url(#${earthMask})`} />
      </svg>
      <svg data-fenda-fileira viewBox="0 0 1000 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
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
          <path d={PATHS.abyss} fill={`url(#${pit})`} />
          <path d={PATHS.backWall} fill="#7a5c45" opacity=".75" />
          <path d={PATHS.topEdge} fill="none" stroke="#b39a7c" strokeWidth="3" vectorEffect="non-scaling-stroke" />
          <path d={PATHS.bottomEdge} fill="none" stroke="#120c08" strokeWidth="5" vectorEffect="non-scaling-stroke" />
        </g>
      </svg>
      {STONES.map(({ left, top, size }) => (
        <span
          key={`${left}-${top}`}
          data-pedra
          className="absolute rounded-[30%] border-[1.5px] border-[#2a211a] bg-[#5d4c3d]"
          style={{ left: `${left}%`, top: `${top}%`, width: `${size}px`, height: `${size * 0.8}px` }}
        />
      ))}
    </li>
  );
}
