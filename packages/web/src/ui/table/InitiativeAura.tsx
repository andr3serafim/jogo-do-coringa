// A aura da iniciativa (bloco C dos pontos do playtest, ponto 11; spec §5.2), atrás do retrato de quem segura a iniciativa por várias rodadas de Ataque
// seguidas, a partir do protótipo aprovado (quadro `p11`):
// - 3 rodadas: a brasa, um contorno baixo de ouro que tremula;
// - 5: a chama, labaredas de ouro e ouro claro, e brasas que sobem;
// - 10: a super aura, com o núcleo branco-quente, a chama alta, brasas e raios pequenos.
// As formas fervem pelo relógio único da mesa (`useAuraBoil`), e os raios saem do agendador único (`useBoltSlot`): no máximo 3 por segundo somando a
// mesa inteira. Os dois param durante as batidas e as cenas; com movimento reduzido, a aura fica parada, sem brasa nem raio. Quando a iniciativa troca
// de mão, a aura apaga com um sopro de fumaça. O selo "×N" fica ao lado, com o texto do leitor de tela; a aura é decorativa.
import { useEffect, useRef } from 'react';
import { initiativeTier, streakSealShown, streakText } from '../../model/initiative-aura.ts';
import { auraVariants, BOLT_FADE_MS, BOLT_HOLD_MS, type AuraSpec } from '../anim/aura.ts';
import { rng, spawn } from '../anim/particles.ts';
import { useAuraBoil, useBoltSlot } from '../anim/table-clock.ts';

/** As camadas de cada nível, de fora para dentro, num quadro de 300 × 300 unidades para um retrato de 76 (raio 38), como no protótipo. */
const TIER_AURA: Record<1 | 2 | 3, AuraSpec> = {
  1: { layers: [{ rx: 52, ry: 52, n: 18, maxL: 16 }], layerStep: 29, frameStep: 7 },
  2: {
    layers: [
      { rx: 56, ry: 58, n: 18, maxL: 52 },
      { rx: 48, ry: 50, n: 15, maxL: 30 },
    ],
    layerStep: 31,
    frameStep: 7,
  },
  3: {
    layers: [
      { rx: 64, ry: 68, n: 20, maxL: 92 },
      { rx: 56, ry: 60, n: 17, maxL: 62 },
      { rx: 48, ry: 52, n: 14, maxL: 40 },
    ],
    layerStep: 37,
    frameStep: 7,
  },
};
const FILL = ['var(--color-ouro)', '#ffe79a', '#fffdf3'] as const;
/** As brasas sobem a cada 2 quadros do relógio (140 ms) e vivem 1,1 s: no máximo ~8 de cada aura no ar. */
const EMBER_EVERY = 2;
const EMBER_MS = 1_100;
const PUFFS = 6;
const PUFF_MS = 600;

export interface InitiativeAuraProps {
  streak: number;
  reduced: boolean;
  /** A mesa está tocando as batidas: a aura para de ferver (as cenas têm a delas). */
  busy: boolean;
  /** Cresce a cada troca de mão que apaga esta aura: o sopro toca de novo. `0`, nenhum. */
  puff: number;
}

export function InitiativeAura({ streak, reduced, busy, puff }: InitiativeAuraProps) {
  const tier = initiativeTier(streak);
  const active = tier > 0 && !reduced && !busy;
  const layers = useRef<Array<SVGPathElement | null>>([]);
  const particles = useRef<HTMLDivElement>(null);
  const ticks = useRef(0);
  const random = useRef(rng(311));
  const variants = tier === 0 ? [] : auraVariants(TIER_AURA[tier], 211 + tier * 7);

  useAuraBoil(active, (frame) => {
    layers.current.forEach((path, i) => path?.setAttribute('d', variants[i]![frame]!));
    ticks.current += 1;
    if (tier >= 2 && ticks.current % EMBER_EVERY === 0 && particles.current) ember(particles.current, random.current, tier);
  });
  useBoltSlot(active && tier === 3, () => {
    if (particles.current) bolt(particles.current, random.current);
  });

  // O sopro de fumaça quando a iniciativa troca de mão (fora do movimento reduzido).
  const puffs = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (puff === 0 || reduced || !puffs.current) return;
    const timers: number[] = [];
    for (let i = 0; i < PUFFS; i++) {
      const node = document.createElement('div');
      const angle = (i / PUFFS) * Math.PI * 2;
      node.className = 'absolute left-1/2 top-1/2 size-3 rounded-full bg-papel/60';
      spawn(
        timers,
        puffs.current,
        node,
        [
          { transform: 'translate(-50%, -50%) scale(0.6)', opacity: 0.8 },
          { transform: `translate(calc(-50% + ${(Math.cos(angle) * 22).toFixed(1)}px), calc(-50% + ${(Math.sin(angle) * 16 - 12).toFixed(1)}px)) scale(2.2)`, opacity: 0 },
        ],
        PUFF_MS,
      );
    }
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [puff, reduced]);

  return (
    <>
      {tier > 0 ? (
        <svg
          aria-hidden="true"
          data-aura-iniciativa={tier}
          viewBox="-150 -170 300 300"
          className="pointer-events-none absolute left-1/2 top-1/2 size-[395%] -translate-x-1/2 -translate-y-[57%] overflow-visible"
        >
          {variants.map((shapes, i) => (
            <path
              key={`${tier}-${i}`}
              ref={(path) => {
                layers.current[i] = path;
              }}
              d={shapes[0]}
              fill={tier === 1 ? 'none' : FILL[i]}
              stroke={i === 0 ? (tier === 1 ? 'var(--color-ouro)' : 'var(--color-tinta)') : undefined}
              strokeWidth={i === 0 ? (tier === 1 ? 5 : 3) : undefined}
              strokeLinejoin="round"
              opacity={tier === 1 ? 0.9 : undefined}
            />
          ))}
        </svg>
      ) : null}
      <div ref={particles} aria-hidden="true" className="pointer-events-none absolute inset-0" />
      <div ref={puffs} aria-hidden="true" data-sopro={puff > 0 && !reduced ? puff : undefined} className="pointer-events-none absolute inset-0" />
    </>
  );
}

/** O selo "×N" ao lado do retrato (a partir de 2 rodadas) e a frase do leitor de tela. */
export function StreakSeal({ streak, side }: { streak: number; side: 'voce' | 'oponente' }) {
  if (!streakSealShown(streak)) return null;
  const blaze = initiativeTier(streak) === 3;
  return (
    <>
      <span
        aria-hidden="true"
        data-selo-sequencia=""
        className={`absolute -top-2 z-20 border-2 border-papel px-1 font-texto text-[10px] font-extrabold leading-tight tabular-nums pc:text-[13px] ${side === 'voce' ? '-left-2' : '-right-2'} ${blaze ? 'bg-vermelho text-papel' : 'bg-ouro text-tinta'}`}
      >
        ×{streak}
      </span>
      <span className="sr-only">{streakText(streak)}</span>
    </>
  );
}

/** Uma brasa que sobe do retrato e apaga. */
function ember(parent: HTMLElement, random: () => number, tier: number): void {
  const timers: number[] = [];
  const node = document.createElement('div');
  node.className = `absolute size-1 rounded-full ${tier === 3 ? 'bg-papel' : 'bg-ouro'}`;
  node.style.left = `${30 + random() * 40}%`;
  node.style.top = '60%';
  spawn(timers, parent, node, [{ transform: 'translate(0, 0)', opacity: 1 }, { transform: `translate(${((random() - 0.5) * 16).toFixed(1)}px, ${(-28 - random() * 22).toFixed(1)}px)`, opacity: 0 }], EMBER_MS);
}

/** Um raio pequeno que estala na borda da super aura: entra, segura e sai (nunca de estalo). */
function bolt(parent: HTMLElement, random: () => number): void {
  const timers: number[] = [];
  const node = document.createElement('div');
  const angle = random() * 360;
  node.className = 'absolute left-1/2 top-1/2 h-[3px] w-[45%] origin-left bg-papel';
  node.style.rotate = `${angle.toFixed(0)}deg`;
  const life = BOLT_FADE_MS * 2 + BOLT_HOLD_MS;
  spawn(
    timers,
    parent,
    node,
    [
      { opacity: 0, transform: 'translateX(55%)' },
      { opacity: 1, transform: 'translateX(55%)', offset: BOLT_FADE_MS / life },
      { opacity: 1, transform: 'translateX(55%)', offset: (BOLT_FADE_MS + BOLT_HOLD_MS) / life },
      { opacity: 0, transform: 'translateX(55%)' },
    ],
    life,
  );
}
