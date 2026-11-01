// A espada da iniciativa (sub-projeto 6 §4): lâmina de papel, guarda e pomo de ouro, punho de tinta, cruzada no canto do retrato
// de quem ataca primeiro, com a ponta virada para o oponente. A cada ~3,4 s um lampejo corre pela lâmina. Quando a iniciativa muda
// de mão, na batida do `InitiativeDecided` (e não quando o `state` chega), a espada sobe, gira duas voltas num arco que passa pelo
// meio da mesa, com rastro, e crava no outro retrato soltando faíscas (~0,85 s). Na decisão que não muda, dá um salto curto e
// brilha no mesmo retrato. Com movimento reduzido, troca de retrato sem voo, sem salto e sem lampejo. É desenho original do
// projeto, e decorativo: quem tem a iniciativa está, para o leitor de tela, no texto da placa.
//
// A posição sai dos retratos medidos dentro do placar (o placar muda de tamanho do celular ao PC): o centro da espada fica perto
// da borda do retrato que dá para o meio, um pouco abaixo do centro dele.
import * as m from 'motion/react-m';
import { useEffect, useState, type RefObject } from 'react';

export type SwordSide = 'voce' | 'oponente';

/** O que a espada faz agora: parada no dono, voando para ele (de `from`) ou saltando no mesmo retrato. */
export type SwordMove = { kind: 'rest' } | { kind: 'fly'; from: SwordSide; serial: number } | { kind: 'hop' };

/** A duração do voo (o prazo da batida, `INITIATIVE_BANNER_MS`, é de 1,2 s: o voo cabe nela com folga para a fita). */
export const SWORD_FLIGHT_MS = 820;

interface Anchor {
  x: number;
  y: number;
  angle: number;
}

type Anchors = Record<SwordSide, Anchor> & { middle: { x: number; y: number } };

const ZERO: Anchors = {
  voce: { x: 0, y: 0, angle: 38 },
  oponente: { x: 0, y: 0, angle: -38 },
  middle: { x: 0, y: 0 },
};

function measure(hud: HTMLElement): Anchors {
  const box = hud.getBoundingClientRect();
  const mine = hud.querySelector('[data-retrato="voce"]')?.getBoundingClientRect();
  const theirs = hud.querySelector('[data-retrato="oponente"]')?.getBoundingClientRect();
  if (!mine || !theirs) return ZERO;
  const inset = mine.width * 0.08;
  const y = mine.top - box.top + mine.height * 0.62;
  return {
    voce: { x: mine.right - box.left - inset, y, angle: 38 },
    oponente: { x: theirs.left - box.left + inset, y, angle: -38 },
    // O arco passa pelo meio da mesa, abaixo do placar.
    middle: { x: box.width / 2, y: box.height + mine.height * 1.6 },
  };
}

/**
 * Os pontos de repouso, medidos no placar e de novo quando ele muda de tamanho. O `ResizeObserver` também avisa na primeira
 * observação, depois do layout pronto (a medida feita só na montagem pode sair antes da fonte e do CSS assentarem).
 */
function useAnchors(hud: RefObject<HTMLElement | null>): Anchors | null {
  const [anchors, setAnchors] = useState<Anchors | null>(null);
  // `useEffect`, e não `useLayoutEffect`: o efeito de layout do filho roda antes de o React ligar o `ref` do placar (o pai).
  useEffect(() => {
    const element = hud.current;
    if (!element) return;
    const update = () => setAnchors(measure(element));
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [hud]);
  return anchors;
}

const FLIGHT_EASE = [0.45, 0.05, 0.35, 1] as const;
const FLIGHT_TIMES = [0, 0.12, 0.55, 0.86, 1];
const TRAIL = [0.34, 0.26, 0.18, 0.1];

export function InitiativeSword({
  holder,
  move,
  reduced,
  busy,
  hud,
}: {
  holder: SwordSide;
  move: SwordMove;
  reduced: boolean;
  /** Há batida tocando: o lampejo some (a mesa fica com o golpe, e ele custava quadros com a CPU lenta). */
  busy: boolean;
  /** O placar: a espada mede os retratos dentro dele. */
  hud: RefObject<HTMLElement | null>;
}) {
  const measured = useAnchors(hud);
  // Até a primeira medida a espada fica escondida (no canto do placar ela apareceria fora do lugar por um quadro).
  const anchors = measured ?? ZERO;
  const to = anchors[holder];

  if (move.kind === 'fly' && !reduced) {
    // O voo: a espada e o rastro nascem no retrato velho (cada voo é um elemento novo) e cravam no novo.
    const from = anchors[move.from];
    const turns = move.from === 'voce' ? 720 : -720;
    const { middle } = anchors;
    const start = { x: from.x, y: from.y, rotate: from.angle, scale: 1 };
    const path = {
      x: [from.x, from.x, middle.x, to.x, to.x],
      y: [from.y, from.y - 14, middle.y, to.y - 30, to.y],
      rotate: [from.angle, from.angle, from.angle + turns / 2, to.angle + turns, to.angle + turns],
      scale: [1, 1.3, 1.6, 1.45, 1],
    };
    const flight = { duration: SWORD_FLIGHT_MS / 1000, times: FLIGHT_TIMES, ease: FLIGHT_EASE };
    return (
      <>
        {TRAIL.map((opacity, i) => (
          <m.div
            key={`rastro-${move.serial}-${i}`}
            aria-hidden="true"
            className="espada pointer-events-none"
            style={{ opacity }}
            initial={start}
            animate={path}
            transition={{ ...flight, delay: (i + 1) * 0.026 }}
          >
            <SwordArt flash={false} />
          </m.div>
        ))}
        <m.div
          key={`voo-${move.serial}`}
          aria-hidden="true"
          data-espada
          data-iniciativa={holder}
          data-voando
          className="espada pointer-events-none"
          initial={start}
          animate={path}
          transition={flight}
        >
          <SwordArt flash={false} />
        </m.div>
        <Sparks at={to} serial={move.serial} />
      </>
    );
  }

  // Em repouso, a posição é um `transform` comum: não depende dos recursos do Motion, que carregam sob demanda (a medida feita
  // antes deles se perderia). O Motion só anima o salto, por dentro.
  const hopping = move.kind === 'hop' && !reduced;
  return (
    <div
      aria-hidden="true"
      data-espada
      data-iniciativa={holder}
      data-salto={hopping ? '' : undefined}
      className={`espada pointer-events-none ${hopping ? 'espada--brilho' : ''}`}
      style={{ transform: `translate(${to.x}px, ${to.y}px) rotate(${to.angle}deg)`, visibility: measured ? undefined : 'hidden' }}
    >
      <m.div
        className="size-full"
        initial={false}
        animate={hopping ? { y: [0, -12, 0], scale: [1, 1.15, 1] } : { y: 0, scale: 1 }}
        transition={hopping ? { duration: 0.45, ease: 'easeOut' } : { duration: 0 }}
      >
        <SwordArt flash={!reduced && !busy} />
      </m.div>
    </div>
  );
}

/** As faíscas de ouro da espada que crava, no fim do voo. */
function Sparks({ at, serial }: { at: Anchor; serial: number }) {
  return (
    <>
      {Array.from({ length: 10 }, (_, i) => {
        const angle = i * 36 + ((i * 7) % 20);
        return (
          <m.span
            key={`faisca-${serial}-${i}`}
            aria-hidden="true"
            className="pointer-events-none absolute left-0 top-0 h-4 w-[3px] origin-bottom rounded-[2px] bg-ouro"
            style={{ x: at.x, y: at.y - 8, rotate: angle }}
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 1, 0], translateY: [0, 0, -38, -56], scaleY: [0.4, 0.4, 1, 0.2] }}
            transition={{ duration: 0.42, times: [0, 0.01, 0.4, 1], ease: 'easeOut', delay: SWORD_FLIGHT_MS / 1000 }}
          />
        );
      })}
    </>
  );
}

/** O desenho da espada (viewBox 40 × 130: a ponta em cima). O lampejo é uma faixa clara que corre pela lâmina. */
function SwordArt({ flash }: { flash: boolean }) {
  return (
    <svg viewBox="0 0 40 130" className="block size-full overflow-visible" aria-hidden="true" focusable="false">
      <path
        d="M20 2 L28 20 L28 86 L12 86 L12 20 Z"
        fill="var(--color-papel)"
        stroke="var(--color-tinta)"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      <path d="M20 20 V82" stroke="var(--color-tinta)" strokeWidth="2" opacity="0.55" />
      {/* O lampejo: só na espada de verdade (o rastro do voo não tem), então os ids das definições não se repetem. */}
      {flash ? (
        <>
          <defs>
            <clipPath id="espada-lamina">
              <path d="M20 2 L28 20 L28 86 L12 86 L12 20 Z" />
            </clipPath>
            <linearGradient id="espada-lampejo" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#fff" stopOpacity="0" />
              <stop offset="0.5" stopColor="#fff" stopOpacity="0.95" />
              <stop offset="1" stopColor="#fff" stopOpacity="0" />
            </linearGradient>
          </defs>
          <g clipPath="url(#espada-lamina)" data-lampejo>
            <g transform="skewY(-30)">
              <m.rect
                x="0"
                y="0"
                width="40"
                height="26"
                fill="url(#espada-lampejo)"
                initial={{ translateY: 110 }}
                animate={{ translateY: [110, 110, -50] }}
                transition={{ duration: 3.4, times: [0, 0.7, 1], ease: 'easeInOut', repeat: Infinity }}
              />
            </g>
          </g>
        </>
      ) : null}
      <path
        d="M2 88 Q2 84 6 84 L34 84 Q38 84 38 88 L38 92 Q38 96 34 96 L6 96 Q2 96 2 92 Z"
        fill="var(--color-ouro)"
        stroke="var(--color-tinta)"
        strokeWidth="3"
      />
      <rect x="15" y="96" width="10" height="22" fill="var(--color-tinta)" />
      <path d="M15 101 H25 M15 106 H25 M15 111 H25" stroke="var(--color-ouro)" strokeWidth="1.6" />
      <circle cx="20" cy="122" r="7" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="3" />
    </svg>
  );
}
