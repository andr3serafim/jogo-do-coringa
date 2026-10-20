// A carta da Peleja (spec §3.1, §7, §10.1): face de papel, borda grossa e irregular de carimbo, valor em tipo de
// madeira (sem textura, spec §10.7) e naipe em SVG próprio. Três tamanhos: `field` (fileiras, preenche a coluna
// da grade), `mini` (Guarda, buffs, cemitério) e `hand` (a mão). Com `onSelect` vira botão; sem, é uma imagem
// com nome acessível ("7 de copas, sai primeiro, novo").
//
// Nenhum utilitário mexe no `box-shadow` de uma carta: o halo de foco global (`:focus-visible`, camada base) e o
// anel ouro de alvo e seleção (`anel-ouro`) são os dois donos dele. A sombra das cartas da mão é um `drop-shadow`
// (filtro), que não disputa o `box-shadow`.
import type { Card as EngineCard } from '@coringa/engine';
import type { ReactNode } from 'react';
import { Coringa } from './Coringa.tsx';
import { isRedSuit, Suit } from './Suit.tsx';

export type CardSize = 'field' | 'mini' | 'hand';

/** Papel que o Selvagem assumiu em campo. */
export type WildRole = 'J' | 'Q' | 'A';

export interface CardProps {
  card: EngineCard;
  size: CardSize;
  /** Papel do Selvagem em campo ("Coringa Selvagem como J"). */
  as?: WildRole;
  /** Papel escrito na carta da mão ("Guarda", "Buff de ataque"…). */
  roleText?: string;
  /** A carta da frente da fileira: a primeira a sair (as fileiras são filas, spec 1 §1.2). */
  front?: boolean;
  /** Mudou desde a sua última jogada e você ainda não viu (spec §10.5). */
  marked?: boolean;
  selected?: boolean;
  /** Alvo possível da jogada em andamento. */
  target?: boolean;
  /** Faz parte de uma quadra. */
  quad?: boolean;
  /** No cemitério a carta perde a cor. */
  grave?: boolean;
  /** Carta pendente do Equipar já posta na fileira como rascunho: translúcida, de borda tracejada (spec §3.5). */
  draft?: boolean;
  /** Texto do `title` (padrão: o papel e o efeito da carta). */
  hint?: string;
  onSelect?: () => void;
  /** Só para a carta que é botão (`onSelect`): `-1` a tira da ordem do Tab, quando outro botão faz a mesma coisa. */
  tabIndex?: number;
  /** O jogador passou o mouse, tocou ou focou numa carta marcada: a marca apaga. */
  onSeen?: () => void;
  className?: string;
}

/** "7 de copas", "K de paus", "Coringa Selvagem" (com o papel em campo, "Coringa Selvagem como J"). */
export function cardName(card: EngineCard, as?: WildRole): string {
  if (card.kind === 'WILD') return as ? `Coringa Selvagem como ${as}` : 'Coringa Selvagem';
  return `${card.kind === 'NUM' ? card.value : card.kind} de ${card.suit}`;
}

const HINT: Record<'K' | 'J' | 'Q' | 'A' | 'WILD' | 'NUM', string> = {
  K: 'K, Guarda: absorve o dano de um ataque e quebra. Quatro K na Guarda dão a Exódia.',
  J: 'J, Buff de ataque: soma 1 ao multiplicador do ataque. Quatro J armam o Ataque Absoluto.',
  Q: 'Q, Buff de defesa: soma 1 ao multiplicador da defesa. Quatro Q ativam a Defesa Absoluta.',
  A: 'A, Armadilha: destrói um J, um Q ou um K do oponente.',
  WILD: 'Coringa Selvagem: vira J, Q ou A (nunca K) quando é jogado.',
  NUM: 'Numérica: o valor soma ao total da fileira. A carta da frente é a primeira a sair.',
};

/** O papel e o efeito de uma carta, para o `title` do mouse (ajuda extra, nunca o único caminho, spec §3.3). */
export function cardHint(card: EngineCard, as?: WildRole): string {
  if (card.kind === 'WILD' && as) return `Coringa Selvagem como ${as}. ${HINT[as]}`;
  return HINT[card.kind];
}

/**
 * Face das cartas de uma quadra: 45% de ouro sobre o papel, misturados numa cor opaca. Um `bg-ouro/45` solto seria
 * translúcido e deixaria a capa verde ou rosa aparecer por baixo da carta; misturada, a face segue de papel claro
 * (o vermelho do valor fica com ≈ 4,70:1; não suba o ouro acima de 55%, a margem é fina).
 */
export const QUAD_FACE = 'bg-[color-mix(in_oklab,var(--color-ouro)_45%,var(--color-papel))]';

interface SizeClasses {
  box: string;
  value: string;
  suit: string;
  wild: string;
}

const SIZE: Record<CardSize, SizeClasses> = {
  field: {
    box: 'w-full aspect-[0.72] border-[2.5px] pc:border-[3px]',
    value: 'left-[8%] top-0 text-[length:calc(var(--card-w)*0.47)]',
    suit: 'right-[7%] bottom-[6%] size-[calc(var(--card-w)*0.37)]',
    wild: 'left-[6%] top-[6%] size-[calc(var(--card-w)*0.55)]',
  },
  mini: {
    box: 'w-(--mini-w) h-(--mini-h) flex-none border-2 pc:border-[2.5px]',
    value: 'left-[10%] top-0 text-[length:calc(var(--mini-w)*0.5)]',
    suit: 'right-[8%] bottom-[7%] size-[calc(var(--mini-w)*0.37)]',
    wild: 'left-[6%] top-[6%] size-[calc(var(--mini-w)*0.62)]',
  },
  hand: {
    box: 'w-(--hand-w) h-(--hand-h) flex-none border-[3px] pc:border-[3.5px] drop-shadow-[0_3px_5px_rgb(23_18_15/0.3)]',
    value: 'left-[8%] top-[2%] text-[length:calc(var(--hand-w)*0.385)]',
    suit: 'right-[8%] top-[8%] size-[calc(var(--hand-w)*0.23)]',
    wild: 'left-[10%] top-[8%] size-[calc(var(--hand-w)*0.5)]',
  },
};

function RoleLabel({ children }: { children: ReactNode }) {
  return (
    <span className="absolute inset-x-0 bottom-[5%] px-1 text-center text-[length:calc(var(--hand-w)*0.12)] font-bold uppercase leading-tight tracking-[0.08em] text-tinta">
      {children}
    </span>
  );
}

function Face({ card, size, as, roleText }: { card: EngineCard; size: CardSize; as?: WildRole; roleText?: string }) {
  const classes = SIZE[size];
  if (card.kind === 'WILD') {
    return (
      <>
        <Coringa className={`absolute ${classes.wild}`} />
        {as ? (
          <span
            data-valor
            className={`absolute bottom-[3%] right-[8%] font-madeira leading-none text-tinta ${size === 'hand' ? 'text-2xl' : 'text-[length:calc(var(--mini-w)*0.4)]'}`}
          >
            {as}
          </span>
        ) : null}
        {roleText ? <RoleLabel>{roleText}</RoleLabel> : null}
      </>
    );
  }
  const tone = isRedSuit(card.suit) ? 'text-vermelho' : 'text-tinta';
  return (
    <>
      <span data-valor className={`absolute font-madeira leading-[1.15] ${tone} ${classes.value}`}>
        {card.kind === 'NUM' ? card.value : card.kind}
      </span>
      <Suit suit={card.suit} className={`absolute ${tone} ${classes.suit}`} />
      {roleText ? <RoleLabel>{roleText}</RoleLabel> : null}
    </>
  );
}

export function Card({
  card,
  size,
  as,
  roleText,
  front = false,
  marked = false,
  selected,
  target = false,
  quad = false,
  grave = false,
  draft = false,
  hint,
  onSelect,
  tabIndex,
  onSeen,
  className = '',
}: CardProps) {
  const name = [cardName(card, as)];
  if (roleText) name.push(roleText);
  if (front) name.push('sai primeiro');
  if (quad) name.push('quadra');
  if (target) name.push('alvo possível');
  if (marked) name.push('novo');
  if (draft) name.push('rascunho');

  const classes = [
    'relative box-border border-tinta p-0 text-tinta rounded-[3px_5px_4px_6px]',
    SIZE[size].box,
    // Um fundo só: duas classes `bg-*` disputam a mesma propriedade e quem ganha é a ordem do CSS gerado, não a da lista.
    card.kind === 'WILD' ? 'bg-ouro' : quad ? QUAD_FACE : 'bg-papel',
    selected ? '-translate-y-3.5 anel-ouro' : target ? 'anel-ouro' : '',
    grave ? 'grayscale opacity-90' : '',
    draft ? 'border-dashed opacity-70' : '',
    onSelect ? 'cursor-pointer focus-visible:z-10' : '',
    className,
  ];
  const common = {
    className: classes.filter(Boolean).join(' '),
    'aria-label': name.join(', '),
    title: hint ?? cardHint(card, as),
    'data-card-id': card.id,
    'data-novo': marked ? 'true' : undefined,
    'data-alvo': target ? 'true' : undefined,
    'data-quad': quad ? 'true' : undefined,
    'data-rascunho': draft ? 'true' : undefined,
    onPointerEnter: marked ? onSeen : undefined,
    onPointerDown: marked ? onSeen : undefined,
    onFocus: marked ? onSeen : undefined,
  };

  const inside = (
    <>
      {front ? (
        <span
          aria-hidden="true"
          data-frente
          className="absolute -left-[9px] top-1/2 h-0 w-0 -translate-y-1/2 border-y-[5px] border-r-[6px] border-y-transparent border-r-tinta pc:-left-[11px] pc:border-y-[6px] pc:border-r-[7px]"
        />
      ) : null}
      <Face card={card} size={size} as={as} roleText={roleText} />
      {marked ? (
        <span aria-hidden="true" data-marca-novo className="absolute bottom-[3px] left-[3px] h-[4px] w-[46%] bg-vermelho" />
      ) : null}
    </>
  );

  if (onSelect) {
    return (
      <button type="button" {...common} aria-pressed={selected} tabIndex={tabIndex} onClick={onSelect}>
        {inside}
      </button>
    );
  }
  return (
    <div role="img" {...common}>
      {inside}
    </div>
  );
}

/** O verso de uma carta que você não vê (a mão do oponente): sem nome, sem id. */
export function CardBack({ className = '' }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      data-verso
      className={`box-border inline-block h-[26px] w-[18px] flex-none rounded-[2px] border-[1.5px] border-tinta bg-[repeating-linear-gradient(45deg,var(--color-tinta)_0_2px,var(--color-papel)_2px_4px)] pc:h-[34px] pc:w-6 ${className}`}
    />
  );
}
