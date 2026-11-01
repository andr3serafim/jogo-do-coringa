// Os efeitos de uma batida sobre a mesa (spec §4.2) que não são de carta: o número do dano que é carimbado sob o retrato do
// Coringa, os respingos de tinta do golpe (sub-projeto 6 §5) e a fileira acesa. Só usam opacidade, escala e deslocamento,
// acontecem uma vez dentro da batida (sem pisca-pisca), e ficam escondidos do leitor de tela (o histórico registra tudo). Os
// números de jogo seguem sem textura (spec §10.7).
import * as m from 'motion/react-m';
import { useEffect, useRef } from 'react';
import type { ImpactForce } from '../../model/impact.ts';

const times = [0, 0.15, 0.75, 1];

/**
 * O número do dano, carimbado logo abaixo do retrato de quem apanhou (sub-projeto 6 §5): entra grande e girado, assenta e sobe.
 * Com `heal`, o da cura ("+N", no ouro) sobe no retrato de quem curou, sem carimbo. Com movimento reduzido, só esmaece. `edge`
 * prende o número à borda de dentro do retrato (o da esquerda à esquerda, o da direita à direita): centrado, um dano de três
 * dígitos sairia da tela no canto.
 */
export function DamageNumber({
  amount,
  ms,
  reduced,
  heal = false,
  edge,
}: {
  amount: number;
  ms: number;
  reduced: boolean;
  heal?: boolean;
  edge: 'left' | 'right';
}) {
  const animate = reduced
    ? { opacity: [0, 1, 1, 0] }
    : heal
      ? { opacity: [0, 1, 1, 0], y: [0, -10, -22, -28] }
      : { opacity: [0, 1, 1, 1, 0], scale: [2.4, 0.92, 1, 1, 1], rotate: [-8, -3, -3, -3, -3], y: [0, 0, 0, -16, -26] };
  return (
    <m.span
      aria-hidden="true"
      data-dano={heal ? undefined : ''}
      data-cura={heal ? '' : undefined}
      initial={{ opacity: 0 }}
      animate={animate}
      // O número sobe desacelerando (U4): rápido no começo, assentando no alto.
      transition={{ duration: ms / 1000, times: reduced || heal ? times : [0, 0.14, 0.22, 0.82, 1], ease: 'easeOut' }}
      className={`pointer-events-none absolute ${edge === 'left' ? 'left-0 origin-top-left' : 'right-0 origin-top-right'} top-full z-30 mt-1 border-2 border-tinta px-1.5 font-texto text-xl font-extrabold leading-tight tabular-nums shadow-[3px_3px_0_var(--color-tinta)] pc:mt-1.5 pc:border-[3px] pc:px-2 pc:text-3xl ${heal ? 'bg-ouro text-tinta' : 'bg-vermelho text-papel'}`}
    >
      {heal ? '+' : '−'}
      {amount}
    </m.span>
  );
}

/** Quantos pingos cada peso de golpe solta. */
const DROPS: Record<ImpactForce, number> = { leve: 5, medio: 7, forte: 10 };

/**
 * Os respingos de tinta do golpe (sub-projeto 6 §5): pingos que saem do retrato de quem apanhou, se espalham e caem. Posições
 * fixas (sem sorteio), para o desenho ser o mesmo em toda batida. Cabem na batida (`ms`, até 0,9 s). Nada com movimento reduzido.
 *
 * Animados pelo próprio navegador (Web Animations, só `transform` e `opacity`), e não pelo Motion: assim correm no compositor,
 * sem trabalho no fio principal a cada quadro. Com a CPU 4× mais lenta, os pingos quadro a quadro em JavaScript, somados ao
 * tremor e ao rastro, derrubavam o golpe para ~37 quadros por segundo.
 */
export function InkSplat({ force, ms, reduced }: { force: ImpactForce; ms: number; reduced: boolean }) {
  const box = useRef<HTMLSpanElement>(null);
  const count = DROPS[force];
  useEffect(() => {
    const drops = box.current ? [...box.current.querySelectorAll<HTMLElement>('[data-pingo]')] : [];
    const animations = drops.map((drop, i) => {
      const angle = (i / count) * 2 * Math.PI + (i % 2 === 0 ? 0.3 : -0.25);
      const reach = 40 + ((i * 37) % 110);
      const dx = Math.cos(angle) * reach;
      const dy = Math.sin(angle) * reach;
      return drop.animate?.(
        [
          { transform: 'translate(0, 0) scale(0.2)', opacity: 1 },
          { transform: `translate(${dx}px, ${dy}px) scale(1)`, opacity: 1, offset: 0.35 },
          { transform: `translate(${dx * 1.15}px, ${dy * 1.15 + 18}px) scale(0.9)`, opacity: 0 },
        ],
        { duration: Math.min(900, ms), easing: 'cubic-bezier(0.1, 0.8, 0.3, 1)', fill: 'forwards' },
      );
    });
    return () => animations.forEach((animation) => animation?.cancel());
  }, [count, ms]);
  if (reduced) return null;
  return (
    <span ref={box} aria-hidden="true" data-respingo className="pointer-events-none absolute inset-0 z-20">
      {Array.from({ length: count }, (_, i) => {
        const size = 6 + ((i * 7) % 9);
        return (
          <span
            key={i}
            data-pingo
            className="absolute left-1/2 top-1/2 rounded-full bg-tinta"
            style={{ width: size, height: size, marginLeft: -size / 2, marginTop: -size / 2, transform: 'scale(0.2)' }}
          />
        );
      })}
    </span>
  );
}

/** A fileira de Ataque acende e aponta para o Coringa do outro; a de Defesa que apanha só acende. */
export function LitRow({ aim, ms }: { aim?: 'up' | 'down'; ms: number }) {
  return (
    <m.span
      aria-hidden="true"
      data-fileira-acesa
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: ms / 1000, times, ease: 'linear' }}
      className="pointer-events-none absolute -inset-x-1 -inset-y-0.5 z-10 border-4 border-ouro"
    >
      {aim ? (
        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-ouro px-1 text-[10px] leading-none text-tinta">
          {aim === 'up' ? '▲' : '▼'}
        </span>
      ) : null}
    </m.span>
  );
}

/** O escudo do Reflect do Coringa quebra (cancelado, protegido ou expirado): a `view` já não o tem, então é só isto. */
export function ShieldBreak({ ms, reduced }: { ms: number; reduced: boolean }) {
  return (
    <m.svg
      viewBox="0 0 24 26"
      aria-hidden="true"
      data-escudo-quebra
      initial={{ opacity: 0 }}
      animate={reduced ? { opacity: [0, 1, 1, 0] } : { opacity: [0, 1, 1, 0], scale: [0.9, 1, 1.15, 1.4] }}
      transition={{ duration: ms / 1000, times, ease: 'linear' }}
      className="pointer-events-none absolute -inset-1.5 z-10 size-[calc(100%+12px)] text-ouro"
    >
      <path
        d="M12 1 L22 4.5 V13 C22 19 17.5 23.5 12 25 C6.5 23.5 2 19 2 13 V4.5 Z"
        fill="currentColor"
        fillOpacity="0.55"
        stroke="var(--color-tinta)"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
      <path d="M13 3 L10 11 L14 14 L9.5 22" fill="none" stroke="var(--color-tinta)" strokeWidth="1.6" />
    </m.svg>
  );
}
