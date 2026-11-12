// A face com arte da carta (spec dos decks e raças, §4): a ilustração cobre a carta, e o valor e o naipe ficam por cima, os dois na cor de
// metal da carta, com um contorno escuro para o contraste. O anel e a aura da faixa são elementos filhos (o `box-shadow` da carta é só do
// halo de foco e do anel ouro, comentário no topo do `Card.tsx`). A face de cordel (`Face`) não muda; o `Card` escolhe entre as duas.
import type { Card as EngineCard } from '@coringa/engine';
import type { ReactNode } from 'react';
import { AURA } from '../../model/looks.ts';
import type { CardSize, WildRole } from './Card.tsx';
import type { CardArt } from './looks-context.ts';
import { Suit } from './Suit.tsx';

/** Os tamanhos de fonte da spec §4 (o rascunho 3 aprovado, já com os 10% a menos) e o lugar do valor e do naipe em cada tamanho. */
const ART_SIZE: Record<CardSize, { value: string; suit: string }> = {
  field: { value: 'left-[6%] top-[1%] text-[length:40cqw]', suit: 'right-[5%] bottom-[5%] size-[34cqw]' },
  mini: {
    value: 'left-[8%] top-0 text-[length:calc(var(--mini-w)*0.4)]',
    suit: 'right-[6%] bottom-[6%] size-[calc(var(--mini-w)*0.34)]',
  },
  hand: {
    value: 'left-[7%] top-[3%] text-[length:calc(var(--hand-w)*0.31)]',
    suit: 'right-[7%] top-[8%] size-[calc(var(--hand-w)*0.21)]',
  },
};

/**
 * A sombra do número (F2): um contorno de tinta de 1 px nas quatro direções e um halo curto, em `text-shadow` (não é filtro: a carta voa).
 * O naipe leva um traço de tinta no próprio SVG, por fora do preenchimento (`paint-order: stroke`).
 */
const NUMBER_SHADOW =
  '[text-shadow:-1px_0_0_rgb(23_18_15/0.9),1px_0_0_rgb(23_18_15/0.9),0_-1px_0_rgb(23_18_15/0.9),0_1px_0_rgb(23_18_15/0.9),0_0_4px_rgb(23_18_15/0.75)]';
const SUIT_STROKE = '[&_path]:stroke-tinta [&_path]:[stroke-width:2.5px] [&_path]:[stroke-linejoin:round] [&_path]:[paint-order:stroke]';

/** `#rrggbb` com opacidade, para a aura (o `style` do React vai pelo CSSOM, sem esbarrar na CSP). */
function withAlpha(hex: string, alpha: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

export interface ArtFaceProps {
  card: EngineCard;
  size: CardSize;
  as?: WildRole;
  roleText?: string;
  quad?: boolean;
  /** A carta tem o anel ouro (alvo ou selecionada): sem aura, que pintaria por cima dele (o anel é `box-shadow` da raiz da carta). */
  ringed?: boolean;
  art: CardArt;
}

export function ArtFace({ card, size, as, roleText, quad = false, ringed = false, art }: ArtFaceProps) {
  const metal = { color: art.metal };
  const place = ART_SIZE[size];
  const aura = ringed ? null : AURA[art.tier];
  let mark: ReactNode = null;
  if (card.kind !== 'WILD') {
    mark = (
      <>
        <span data-valor className={`absolute font-cinzel font-black leading-none ${NUMBER_SHADOW} ${place.value}`} style={metal}>
          {card.kind === 'NUM' ? card.value : card.kind}
        </span>
        <Suit suit={card.suit} className={`absolute ${SUIT_STROKE} ${place.suit}`} style={metal} />
      </>
    );
  } else if (as) {
    mark = (
      <span
        data-valor
        className={`absolute bottom-[3%] right-[8%] font-cinzel font-black leading-none ${NUMBER_SHADOW} ${size === 'hand' ? 'text-2xl' : 'text-[length:calc(var(--mini-w)*0.4)]'}`}
        style={metal}
      >
        {as}
      </span>
    );
  }
  return (
    <>
      {/* A aura é um filho posicionado: pinta por cima do `box-shadow` da raiz. Some no foco do teclado (a carta é o `group/carta`), para o
          halo do foco ficar à vista; com o anel ouro, nem entra (`ringed`). */}
      {aura ? (
        <span
          aria-hidden="true"
          data-aura
          className="pointer-events-none absolute -inset-px rounded-[inherit] group-focus-visible/carta:hidden"
          style={{ boxShadow: `0 0 ${aura.blur}px ${aura.spread}px ${withAlpha(art.metal, aura.alpha)}` }}
        />
      ) : null}
      {/* Quem recorta a imagem é este invólucro, não a carta: a seta da frente, o anel da quadra e a aura ficam por fora. */}
      <span aria-hidden="true" className="absolute inset-0 overflow-hidden rounded-[inherit]">
        <img src={art.url} alt="" decoding="async" draggable={false} className="absolute inset-0 size-full object-cover" />
        {quad ? <span data-veu-quadra className="absolute inset-0 bg-ouro/25" /> : null}
      </span>
      <span
        aria-hidden="true"
        data-anel-arte
        className="pointer-events-none absolute inset-0 rounded-[inherit] border-[1.5px]"
        style={{ borderColor: art.metal }}
      />
      {mark}
      {/* O espaço (os filhos são `absolute`, nada muda no layout) separa as palavras do texto visível; ver `cardLabel` no `Card.tsx`. */}
      {roleText ? (
        <>
          {' '}
          <span
            className="absolute inset-x-0 bottom-0 bg-tinta/70 px-1 py-[4%] text-center text-[length:calc(var(--hand-w)*0.12)] font-bold uppercase leading-tight tracking-[0.08em]"
            style={metal}
          >
            {roleText}
          </span>
        </>
      ) : null}
    </>
  );
}
