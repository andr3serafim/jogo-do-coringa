// As figuras da mesa (decisoes.md 2026-11-01 (1)): o autor pediu figura no lugar do texto comum nos totais das fileiras, nas
// marcas de estado do Coringa, nos títulos das zonas e nos destinos do Equipar. Desenho original do projeto, no traço de
// xilogravura do `ResurrectIcon`: formas cheias de tinta com contorno de papel (ou papel com contorno de tinta), para a figura
// valer no campo colorido, no papel das marcas e na tinta da barra. É desenho: fica escondida do leitor de tela, e o texto ao
// lado (ou o nome do grupo) diz o que é.
import type { ReactNode } from 'react';

interface ArtProps {
  className?: string;
}

function Art({ name, className = 'size-4', children }: ArtProps & { name: string; children: ReactNode }) {
  return (
    <svg aria-hidden="true" data-arte={name} viewBox="0 0 24 24" className={`shrink-0 ${className}`} fill="none">
      {children}
    </svg>
  );
}

/** Uma espada de pé, com a ponta no alto: lâmina de papel, guarda e pomo de ouro, punho vermelho. */
function Sword() {
  return (
    <>
      <path d="M10.1 15.4V4.8L12 1.2l1.9 3.6v10.6Z" fill="var(--color-papel)" stroke="var(--color-tinta)" strokeWidth="1.4" />
      <path d="M12 18v3.2" stroke="var(--color-vermelho)" strokeWidth="2.8" />
      <rect x="7.2" y="15.4" width="9.6" height="2.8" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="1.3" />
      <circle cx="12" cy="22.3" r="1.5" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="1.1" />
    </>
  );
}

const SHIELD = 'M12 1.8 20.5 4.8v6.7c0 5.3-3.6 9-8.5 10.9-4.9-1.9-8.5-5.6-8.5-10.9V4.8Z';

/** Um "+" vermelho no alto, à direita: o buff. */
function Plus() {
  return <path d="M19 2.5v7M15.5 6h7" stroke="var(--color-vermelho)" strokeWidth="2.4" />;
}

/** O Ataque: duas espadas cruzadas. */
export function AttackIcon({ className }: ArtProps) {
  return (
    <Art name="ataque" className={className}>
      {/* As lâminas se cruzam no terço de cima, longe das guardas; o par desce até o meio da caixa. */}
      <g transform="translate(0 2.4)">
        <g transform="rotate(-42 12 9.5)">
          <Sword />
        </g>
        <g transform="rotate(42 12 9.5)">
          <Sword />
        </g>
      </g>
    </Art>
  );
}

/** A Defesa: o escudo de tinta com a cruz de ouro. */
export function DefenseIcon({ className }: ArtProps) {
  return (
    <Art name="defesa" className={className}>
      <path d={SHIELD} fill="var(--color-tinta)" stroke="var(--color-papel)" strokeWidth="1.6" />
      <path d="M12 5.2v14M7 10.4h10" stroke="var(--color-ouro)" strokeWidth="2.2" />
    </Art>
  );
}

/** A Defesa Absoluta: o escudo de ouro com a coroa. */
export function AbsoluteDefenseIcon({ className }: ArtProps) {
  return (
    <Art name="defesa-absoluta" className={className}>
      <path d={SHIELD} fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="1.6" />
      <path d="M7.4 14.2V8.6l2.5 2.2L12 7.2l2.1 3.6 2.5-2.2v5.6Z" fill="var(--color-tinta)" />
    </Art>
  );
}

/** O Ataque Absoluto armado: a espada de pé com os raios vermelhos dos dois lados. */
export function AbsoluteAttackIcon({ className }: ArtProps) {
  return (
    <Art name="ataque-absoluto" className={className}>
      <path d="M2.6 5.4l3.2 2M21.4 5.4l-3.2 2M2 11.6h3.6M22 11.6h-3.6" stroke="var(--color-vermelho)" strokeWidth="2" />
      <Sword />
    </Art>
  );
}

/** A Cura passiva: o coração verde com a cruz de papel. */
export function HealIcon({ className }: ArtProps) {
  return (
    <Art name="cura" className={className}>
      <path
        d="M12 21.2C6.4 17.2 2.6 13.6 2.6 9.1 2.6 6 5 3.6 7.9 3.6c1.8 0 3.3.9 4.1 2.3.8-1.4 2.3-2.3 4.1-2.3 2.9 0 5.3 2.4 5.3 5.5 0 4.5-3.8 8.1-9.4 12.1Z"
        fill="var(--color-cura)"
        stroke="var(--color-tinta)"
        strokeWidth="1.5"
      />
      <path d="M12 8.6v7.2M8.4 12.2h7.2" stroke="var(--color-papel)" strokeWidth="2.4" />
    </Art>
  );
}

/** A Guarda: a torre de tinta com ameias, a porta de ouro. */
export function GuardIcon({ className }: ArtProps) {
  return (
    <Art name="guarda" className={className}>
      <path
        d="M5 22.2V9h-.9V2.8h3.4v2.6h2.3V2.8h4.4v2.6h2.3V2.8h3.4V9H19v13.2Z"
        fill="var(--color-tinta)"
        stroke="var(--color-papel)"
        strokeWidth="1.4"
      />
      <path d="M9.6 22.2v-4.4a2.4 2.4 0 0 1 4.8 0v4.4Z" fill="var(--color-ouro)" />
      <path d="M12 10.4v3.2" stroke="var(--color-ouro)" strokeWidth="1.8" />
    </Art>
  );
}

/** Os buffs de Ataque (os J): a espada com o "+". */
export function AttackBuffIcon({ className }: ArtProps) {
  return (
    <Art name="buff-ataque" className={className}>
      <g transform="translate(-3.4 0)">
        <Sword />
      </g>
      <Plus />
    </Art>
  );
}

/** Os buffs de Defesa (as Q): o escudo com o "+". */
export function DefenseBuffIcon({ className }: ArtProps) {
  return (
    <Art name="buff-defesa" className={className}>
      <g transform="translate(-3 2.6) scale(0.85)">
        <path d={SHIELD} fill="var(--color-tinta)" stroke="var(--color-papel)" strokeWidth="1.8" />
        <path d="M12 5.2v14M7 10.4h10" stroke="var(--color-ouro)" strokeWidth="2.4" />
      </g>
      <Plus />
    </Art>
  );
}

/** O Reflect: o espelho de mão, moldura de ouro e vidro de papel com o brilho riscado. */
export function ReflectIcon({ className }: ArtProps) {
  return (
    <Art name="reflect" className={className}>
      <path d="M10.6 16.6h2.8v6.2h-2.8Z" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="1.2" />
      <ellipse cx="12" cy="9.2" rx="7" ry="7.8" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="1.4" />
      <ellipse cx="12" cy="9.2" rx="4.7" ry="5.5" fill="var(--color-papel)" stroke="var(--color-tinta)" strokeWidth="1.1" />
      <path d="M9.5 9.6l3.4-3.8M10.6 12.3l3.7-4.1" stroke="var(--color-tinta)" strokeWidth="1.1" />
    </Art>
  );
}
