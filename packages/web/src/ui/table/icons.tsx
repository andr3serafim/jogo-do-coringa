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

/** Uma espada de pé, com a ponta no alto: lâmina de papel (ou vermelha, no destino), guarda e pomo de ouro, punho vermelho. */
function Sword({ blade = 'var(--color-papel)' }: { blade?: string }) {
  return (
    <>
      <path d="M10.1 15.4V4.8L12 1.2l1.9 3.6v10.6Z" fill={blade} stroke="var(--color-tinta)" strokeWidth="1.4" />
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

/** O Ataque: duas espadas cruzadas. Com `marked` (o destino "Equipar ataque", decisoes.md 2026-11-27 (2)), as lâminas são vermelhas. */
export function AttackIcon({ className, marked = false }: ArtProps & { marked?: boolean }) {
  const blade = marked ? 'var(--color-vermelho)' : undefined;
  return (
    <Art name="ataque" className={className}>
      {/* As lâminas se cruzam no terço de cima, longe das guardas; o par desce até o meio da caixa. */}
      <g transform="translate(0 2.4)">
        <g transform="rotate(-42 12 9.5)">
          <Sword blade={blade} />
        </g>
        <g transform="rotate(42 12 9.5)">
          <Sword blade={blade} />
        </g>
      </g>
    </Art>
  );
}

/** A Defesa: o escudo de tinta com a cruz de ouro. Com `marked` (o destino "Equipar defesa", decisoes.md 2026-11-27 (2)), o escudo é azul. */
export function DefenseIcon({ className, marked = false }: ArtProps & { marked?: boolean }) {
  return (
    <Art name="defesa" className={className}>
      <path d={SHIELD} fill={marked ? 'var(--color-azul)' : 'var(--color-tinta)'} stroke="var(--color-papel)" strokeWidth="1.6" />
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

/**
 * A Cura passiva: o coração de papel com contorno de tinta e a cruz verde. Ele mora no disco verde do medalhão (decisoes.md 2026-11-23 (8)):
 * verde sobre verde ele sumia (o protótipo).
 */
export function HealIcon({ className }: ArtProps) {
  return (
    <Art name="cura" className={className}>
      <path
        d="M12 21.2C6.4 17.2 2.6 13.6 2.6 9.1 2.6 6 5 3.6 7.9 3.6c1.8 0 3.3.9 4.1 2.3.8-1.4 2.3-2.3 4.1-2.3 2.9 0 5.3 2.4 5.3 5.5 0 4.5-3.8 8.1-9.4 12.1Z"
        fill="var(--color-papel)"
        stroke="var(--color-tinta)"
        strokeWidth="1.5"
      />
      <path d="M12 8.6v7.2M8.4 12.2h7.2" stroke="var(--color-cura)" strokeWidth="2.4" />
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

/** O Anular o Reflect: o espelho com o risco vermelho por cima (decisoes.md 2026-11-26 (8), item 4). */
export function CancelReflectIcon({ className }: ArtProps) {
  return (
    <Art name="anular-reflect" className={className}>
      <path d="M10.6 16.6h2.8v6.2h-2.8Z" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="1.2" />
      <ellipse cx="12" cy="9.2" rx="7" ry="7.8" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="1.4" />
      <ellipse cx="12" cy="9.2" rx="4.7" ry="5.5" fill="var(--color-papel)" stroke="var(--color-tinta)" strokeWidth="1.1" />
      <path d="M3.4 20.6 20.6 2.6" stroke="var(--color-papel)" strokeWidth="5" />
      <path d="M3.4 20.6 20.6 2.6" stroke="var(--color-vermelho)" strokeWidth="2.8" />
    </Art>
  );
}

/** A Devastação (decisoes.md 2026-11-26 (8), item 4): três cartas de papel em leque e o raio de ouro que as racha. */
export function DevastateIcon({ className }: ArtProps) {
  return (
    <Art name="devastar" className={className}>
      {[2.4, 8.8, 15.2].map((x, i) => (
        <rect
          key={x}
          x={x}
          y={5 + (i % 2) * 1.8}
          width="6.2"
          height="9.2"
          rx="0.7"
          fill="var(--color-papel)"
          stroke="var(--color-tinta)"
          strokeWidth="1.3"
          transform={`rotate(${(i - 1) * 8} ${x + 3.1} 10)`}
        />
      ))}
      <path d="M13.2 1.2 9 10.8h4.2l-3 12 8.4-14.4h-4.8l3-7.2Z" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="1.3" strokeLinejoin="round" />
    </Art>
  );
}

/** O cadeado da carta da mão que não joga agora (bloco A dos pontos do playtest, ponto 2): corpo de tinta, arco de papel, buraco de ouro. */
export function LockIcon({ className }: ArtProps) {
  return (
    <Art name="cadeado" className={className}>
      <path d="M7.4 10.6V7.8a4.6 4.6 0 0 1 9.2 0v2.8" stroke="var(--color-papel)" strokeWidth="4.2" />
      <path d="M7.4 10.6V7.8a4.6 4.6 0 0 1 9.2 0v2.8" stroke="var(--color-tinta)" strokeWidth="2" />
      <rect x="4.4" y="10.4" width="15.2" height="11.4" rx="1.6" fill="var(--color-tinta)" stroke="var(--color-papel)" strokeWidth="1.4" />
      <path d="M12 14.2v3.6" stroke="var(--color-ouro)" strokeWidth="2.4" strokeLinecap="round" />
    </Art>
  );
}

/** A troca (os destinos do Equipar, decisoes.md 2026-11-23 (1)): duas setas em roda, de tinta com contorno de papel, num disco de ouro. */
export function SwapIcon({ className }: ArtProps) {
  return (
    <Art name="troca" className={className}>
      <circle cx="12" cy="12" r="10.6" fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="1.6" />
      <path d="M6.6 10.4a5.6 5.6 0 0 1 9.8-2.6M17.4 13.6a5.6 5.6 0 0 1-9.8 2.6" stroke="var(--color-tinta)" strokeWidth="2" />
      <path d="M17.6 4.6v4.2h-4.2ZM6.4 19.4v-4.2h4.2Z" fill="var(--color-tinta)" />
    </Art>
  );
}

/** O Confirmar do Equipar (decisoes.md 2026-11-25 (2)): o visto de tinta, grosso, com contorno de papel. */
export function ConfirmIcon({ className }: ArtProps) {
  return (
    <Art name="confirmar" className={className}>
      <path d="M3.6 12.6 9.4 18.4 20.6 5.8" stroke="var(--color-papel)" strokeWidth="6.4" strokeLinejoin="round" />
      <path d="M3.6 12.6 9.4 18.4 20.6 5.8" stroke="var(--color-tinta)" strokeWidth="3.6" strokeLinejoin="round" />
    </Art>
  );
}

/** O Passar (decisoes.md 2026-11-25 (5)): as duas setas de tinta para a frente e a barra de ouro, pular a vez. */
export function PassSkipIcon({ className }: ArtProps) {
  return (
    <Art name="passar" className={className}>
      <path d="M3 5l8 7-8 7ZM12 5l8 7-8 7Z" fill="var(--color-tinta)" stroke="var(--color-papel)" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M21 4.6v14.8" stroke="var(--color-ouro)" strokeWidth="2.4" />
    </Art>
  );
}

/** A mão vazia (decisoes.md 2026-11-25 (4) e (6)): três cartas lisas em leque, apagadas, na cor do texto do lugar. */
export function EmptyHandIcon({ className }: ArtProps) {
  return (
    <Art name="mao-vazia" className={className}>
      {[-16, 0, 16].map((angle) => (
        <rect
          key={angle}
          x="8.2"
          y="4.6"
          width="7.6"
          height="11"
          rx="1"
          transform={`rotate(${angle} 12 21)`}
          fill="currentColor"
          fillOpacity="0.14"
          stroke="currentColor"
          strokeWidth="1.3"
        />
      ))}
    </Art>
  );
}

/** Nenhuma numérica para montar: a carta tracejada com o risco vermelho. */
export function NoCardsIcon({ className }: ArtProps) {
  return (
    <Art name="sem-numericas" className={className}>
      <rect x="6" y="3" width="12" height="18" rx="1.4" stroke="currentColor" strokeWidth="1.4" strokeDasharray="2.2 1.6" />
      <path d="M4 20 20 4" stroke="var(--color-vermelho)" strokeWidth="2.4" />
    </Art>
  );
}

/** A espera pelo outro (ele ainda monta): a ampulheta de tinta com a areia de ouro, contorno de papel. */
export function WaitingIcon({ className }: ArtProps) {
  return (
    <Art name="espera" className={className}>
      <path d="M6 2.6h12M6 21.4h12" stroke="var(--color-papel)" strokeWidth="4" />
      <path d="M6 2.6h12M6 21.4h12" stroke="var(--color-tinta)" strokeWidth="2.2" />
      <path
        d="M7.4 3.6c0 5 4.6 5.6 4.6 8.4S7.4 15.4 7.4 20.4h9.2c0-5-4.6-5.6-4.6-8.4s4.6-3.4 4.6-8.4Z"
        fill="var(--color-papel)"
        stroke="var(--color-tinta)"
        strokeWidth="1.6"
      />
      <path d="M9.6 19.4c.6-2.6 2.4-3.4 2.4-3.4s1.8.8 2.4 3.4ZM10.4 7.4h3.2c-.4 1.4-1.6 2-1.6 2s-1.2-.6-1.6-2Z" fill="var(--color-ouro)" />
    </Art>
  );
}

/** A jogada recusada: o disco vermelho com o X de papel. */
export function RejectedIcon({ className }: ArtProps) {
  return (
    <Art name="recusada" className={className}>
      <circle cx="12" cy="12" r="10" fill="var(--color-vermelho)" stroke="var(--color-tinta)" strokeWidth="1.6" />
      <path d="M8 8l8 8M16 8l-8 8" stroke="var(--color-papel)" strokeWidth="2.6" />
    </Art>
  );
}

/** O descarte no cemitério: a lápide de tinta (a mesma da Ressurreição), com a cruz de ouro. */
export function DiscardIcon({ className }: ArtProps) {
  return (
    <Art name="descarte" className={className}>
      <path d="M4.4 22.6V9.8c0-4 3-6.6 6.6-6.6h2c3.6 0 6.6 2.6 6.6 6.6v12.8Z" fill="var(--color-tinta)" stroke="var(--color-papel)" strokeWidth="1.6" />
      <path d="M12 7.6v10M8.4 11.2h7.2" stroke="var(--color-ouro)" strokeWidth="2" />
    </Art>
  );
}
