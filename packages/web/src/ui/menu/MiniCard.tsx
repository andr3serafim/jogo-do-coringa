// A mini carta do menu (decisoes.md 2026-11-18 (3) e (4)): papel, o índice do naipe nos cantos e o símbolo da entrada no meio. A linha do
// Início (`MenuItem`) é o link inteiro; a carta dela respira e, sob o mouse, inclina em 3D com a conta da mão do jogo (`Hand.tsx`: até 13°,
// a sombra acompanhando), escrita direto no estilo do invólucro (sem redesenhar); no toque, sobe 8 px e inclina para o lado do dedo. Com
// movimento reduzido, nada disso.
import { useRef, type CSSProperties, type PointerEvent } from 'react';
import { navigate } from '../../app/router.ts';
import { suitPath } from '../cards/Suit.tsx';
import { useMenuMotion } from './menu-theme.tsx';

export type MiniCardKind = 'online' | 'practice' | 'pastGames' | 'options';

/** O naipe de cada entrada (♥ ♠ ♣ ♦) e se é vermelho. */
const SUIT = {
  online: ['copas', true],
  practice: ['espadas', false],
  pastGames: ['paus', false],
  options: ['ouros', true],
} as const;

/** Os símbolos: o globo, as espadas cruzadas, a ampulheta e a regulagem (traço de 24 × 24). */
export function EntryIcon({ kind, className }: { kind: MiniCardKind; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {kind === 'online' ? (
        <>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3c3.5 3.2 3.5 14.8 0 18M12 3c-3.5 3.2-3.5 14.8 0 18" />
        </>
      ) : kind === 'practice' ? (
        <path d="M4 4l10 10M12 16l4-4M14 14l4.5 4.5M20 4L10 14M8 12l4 4M10 14l-4.5 4.5" />
      ) : kind === 'pastGames' ? (
        <>
          <path d="M6 3h12M6 21h12M7 3c0 4.5 4 6 4 9s-4 4.5-4 9M17 3c0 4.5-4 6-4 9s4 4.5 4 9" />
          <path d="M9 19.5h6l-3-3z" fill="var(--color-vermelho)" stroke="none" />
        </>
      ) : (
        <>
          <path d="M4 7h10M18 7h2M4 17h4M12 17h8" />
          <circle cx="16" cy="7" r="2" />
          <circle cx="10" cy="17" r="2" />
        </>
      )}
    </svg>
  );
}

/** O selo vermelho do tutorial por fazer. */
export function TutorialSeal({ className = 'menu-selo' }: { className?: string }) {
  return (
    <svg data-selo-tutorial="" viewBox="0 0 40 40" aria-hidden="true" focusable="false" className={className}>
      <polygon
        points="39,20 31.1,24.6 33.4,33.4 24.6,31.1 20,39 15.4,31.1 6.6,33.4 8.9,24.6 1,20 8.9,15.4 6.6,6.6 15.4,8.9 20,1 24.6,8.9 33.4,6.6 31.1,15.4"
        fill="var(--color-vermelho)"
        stroke="var(--color-tinta)"
        strokeWidth="2"
      />
      <circle cx="20" cy="20" r="6" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="2" />
    </svg>
  );
}

export function MiniCard({ kind, seal = false }: { kind: MiniCardKind; seal?: boolean }) {
  const [suit, red] = SUIT[kind];
  const pip = (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="menu-indice" fill={red ? 'var(--color-vermelho)' : 'currentColor'}>
      <path d={suitPath(suit)} />
    </svg>
  );
  return (
    <span className="menu-mini" aria-hidden="true">
      {pip}
      {pip}
      <EntryIcon kind={kind} className="menu-mini-icone" />
      {seal ? <TutorialSeal /> : null}
    </span>
  );
}

/** Onde o ponteiro está na linha, de -0,5 a 0,5 em cada eixo (o centro sem medida, no jsdom). */
function pointerSpot(event: PointerEvent<HTMLElement>): { x: number; y: number } {
  const box = event.currentTarget.getBoundingClientRect();
  const clamp = (value: number) => Math.max(-0.5, Math.min(0.5, value));
  return {
    x: box.width > 0 ? clamp((event.clientX - box.left) / box.width - 0.5) : 0,
    y: box.height > 0 ? clamp((event.clientY - box.top) / box.height - 0.5) : 0,
  };
}

/** A inclinação máxima sob o mouse e, no toque, para o lado do dedo (graus); quanto a carta tocada sobe (px). Os da mão do jogo. */
const TILT_MOUSE_DEG = 13;
const TILT_TOUCH_DEG = 6;
const TOUCH_LIFT_PX = 8;

export interface MenuItemProps {
  to: string;
  kind: MiniCardKind;
  name: string;
  line: string;
  seal?: boolean;
  /** A posição na lista: o tempo da respiração e da entrada. */
  index: number;
}

/** Uma linha do menu do Início: um link de verdade (abre em outra aba), que no clique simples navega pelo roteador. */
export function MenuItem({ to, kind, name, line, seal = false, index }: MenuItemProps) {
  const tilt = useRef<HTMLSpanElement>(null);
  const { reduced } = useMenuMotion();
  const lean = (transform: string, shadow: string) => {
    if (!tilt.current) return;
    tilt.current.style.transform = transform;
    tilt.current.style.filter = shadow;
  };
  const onPointerMove = (event: PointerEvent<HTMLAnchorElement>) => {
    if (reduced || event.pointerType !== 'mouse') return;
    const { x, y } = pointerSpot(event);
    lean(
      `perspective(600px) rotateX(${(-y * 2 * TILT_MOUSE_DEG).toFixed(1)}deg) rotateY(${(x * 2 * TILT_MOUSE_DEG).toFixed(1)}deg)`,
      `drop-shadow(${(-x * 8).toFixed(1)}px ${(4 - y * 6).toFixed(1)}px 0 color-mix(in oklab, var(--color-tinta) 35%, transparent))`,
    );
  };
  const onPointerDown = (event: PointerEvent<HTMLAnchorElement>) => {
    if (reduced || event.pointerType !== 'touch') return;
    const { x } = pointerSpot(event);
    lean(
      `translateY(-${TOUCH_LIFT_PX}px) perspective(600px) rotateY(${(x * 2 * TILT_TOUCH_DEG).toFixed(1)}deg)`,
      'drop-shadow(0 6px 0 color-mix(in oklab, var(--color-tinta) 30%, transparent))',
    );
  };
  const onPointerEnd = (event: PointerEvent<HTMLAnchorElement>) => {
    if (event.pointerType === 'touch' || event.type === 'pointerleave') lean('', '');
  };
  return (
    <a
      href={to}
      className="menu-item"
      style={{ '--i': index } as CSSProperties}
      onClick={(event) => {
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey) return;
        event.preventDefault();
        navigate(to);
      }}
      onPointerMove={onPointerMove}
      onPointerLeave={onPointerEnd}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
    >
      <span ref={tilt} data-inclina="" className="menu-inclina">
        <MiniCard kind={kind} seal={seal} />
      </span>
      <span>
        <span className="menu-item-nome">{name}</span>
        {/* O nome do link é o texto visível inteiro, entrada e linha (WCAG 2.5.3: o axe barra um nome que não o contenha); o espaço separa as palavras. */}{' '}
        <span className="menu-item-linha">
          {line}
        </span>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="menu-seta" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5l7 7-7 7" />
      </svg>
    </a>
  );
}
