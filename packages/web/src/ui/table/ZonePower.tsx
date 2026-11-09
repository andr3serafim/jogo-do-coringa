// A camada de poder de uma zona (bloco C dos pontos do playtest, ponto 10; spec §5.1), atrás das cartas, a partir do protótipo aprovado (quadro `p10`):
// - J nível 2 e 3: raios pequenos entre J vizinhos, pelo agendador único da mesa (≤ 3 por segundo somando tudo);
// - J nível 3: a aura do Ataque Absoluto (as formas da cena, menores), fervendo pelo relógio único da mesa;
// - Q nível 2: a muralha, um escudo tracejado de papel que respira atrás dos Q;
// - Q nível 3: o escudo de ouro, parado.
// O aceso das cartas, o pulso verde dos K e a brasa dos K são camadas desenhadas no CSS (`styles.css`, só `opacity` anima). Tudo para durante as
// batidas e as cenas, e com movimento reduzido ficam as cores e as formas paradas, sem raio, fervura nem respiração.
import { useRef } from 'react';
import type { ZoneKind } from '../../model/zone-level.ts';
import { ATTACK_AURA, auraVariants, BOLT_FADE_MS, BOLT_HOLD_MS } from '../anim/aura.ts';
import { rng, spawn } from '../anim/particles.ts';
import { useAuraBoil, useBoltSlot } from '../anim/table-clock.ts';

export interface ZonePowerProps {
  kind: ZoneKind;
  level: 0 | 1 | 2 | 3;
  reduced: boolean;
  busy: boolean;
}

const AURA_FILL = ['var(--color-ouro)', '#ffe79a', 'var(--color-papel)'] as const;

export function ZonePower({ kind, level, reduced, busy }: ZonePowerProps) {
  const root = useRef<HTMLDivElement>(null);
  const layers = useRef<Array<SVGPathElement | null>>([]);
  const random = useRef(rng(509));
  const live = !reduced && !busy;
  const aura = kind === 'J' && level === 3;
  const variants = aura ? auraVariants(ATTACK_AURA, 233) : [];

  useAuraBoil(live && aura, (frame) => {
    layers.current.forEach((path, i) => path?.setAttribute('d', variants[i]![frame]!));
  });
  useBoltSlot(live && kind === 'J' && level >= 2, () => {
    const zone = root.current?.parentElement;
    const cards = zone ? [...zone.querySelectorAll<HTMLElement>('ul > li')] : [];
    if (!root.current || !zone || cards.length < 2) return;
    const i = Math.floor(random.current() * (cards.length - 1));
    const origin = zone.getBoundingClientRect();
    const a = cards[i]!.getBoundingClientRect();
    const b = cards[i + 1]!.getBoundingClientRect();
    const from = { x: a.right - origin.left - 2, y: a.top - origin.top + a.height * (0.3 + random.current() * 0.4) };
    const to = { x: b.left - origin.left + 2, y: b.top - origin.top + b.height * (0.3 + random.current() * 0.4) };
    bolt(root.current, from, to);
  });

  if (level === 0) return null;
  return (
    <div ref={root} aria-hidden="true" data-poder-camada={`${kind}${level}`} className="pointer-events-none absolute inset-0">
      {aura ? (
        <svg viewBox="-160 -170 320 260" className="absolute left-1/2 top-1/2 h-[220%] w-[150%] -translate-x-1/2 -translate-y-1/2 overflow-visible">
          {AURA_FILL.map((fill, i) => (
            <path
              key={fill}
              ref={(path) => {
                layers.current[i] = path;
              }}
              d={variants[i]![0]}
              fill={fill}
              opacity={0.75}
              stroke={i === 0 ? 'var(--color-tinta)' : undefined}
              strokeWidth={i === 0 ? 3 : undefined}
              strokeLinejoin="round"
            />
          ))}
        </svg>
      ) : null}
      {kind === 'Q' && level >= 2 ? (
        <svg
          viewBox="0 0 24 26"
          data-muralha={level === 2 && !reduced ? '' : undefined}
          className="absolute left-1/2 top-1/2 h-[150%] -translate-x-1/2 -translate-y-1/2 overflow-visible"
        >
          {level === 3 ? (
            <path d="M12 1l10 3.5V12c0 6-4.5 10.5-10 12C6.5 22.5 2 18 2 12V4.5z" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth=".7" />
          ) : (
            <path d="M12 1l10 3.5V12c0 6-4.5 10.5-10 12C6.5 22.5 2 18 2 12V4.5z" fill="rgba(255,253,246,.28)" stroke="var(--color-papel)" strokeWidth=".6" strokeDasharray="1.2 .6" />
          )}
        </svg>
      ) : null}
    </div>
  );
}

/** Um raio pequeno de ouro entre duas cartas: entra, segura e sai (nunca de estalo). */
function bolt(parent: HTMLElement, from: { x: number; y: number }, to: { x: number; y: number }): void {
  const timers: number[] = [];
  const node = document.createElement('div');
  const length = Math.hypot(to.x - from.x, to.y - from.y);
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  node.className = 'absolute h-[3px] origin-left rounded-full bg-ouro';
  node.style.left = `${from.x}px`;
  node.style.top = `${from.y}px`;
  node.style.width = `${Math.max(6, length)}px`;
  node.style.rotate = `${angle.toFixed(1)}deg`;
  const life = BOLT_FADE_MS * 2 + BOLT_HOLD_MS;
  spawn(
    timers,
    parent,
    node,
    [
      { opacity: 0 },
      { opacity: 1, offset: BOLT_FADE_MS / life },
      { opacity: 1, offset: (BOLT_FADE_MS + BOLT_HOLD_MS) / life },
      { opacity: 0 },
    ],
    life,
  );
}
