// A carta da Peleja (spec §3.1, §7, §10.1): face de papel, borda grossa e irregular de carimbo, valor em tipo de
// madeira (sem textura, spec §10.7) e naipe em SVG próprio. Três tamanhos: `field` (fileiras, preenche a coluna
// da grade), `mini` (Guarda, buffs, cemitério) e `hand` (a mão). Com `onSelect` vira botão; sem, é uma imagem
// com nome acessível ("7 de copas, sai primeiro, novo").
//
// Nenhum utilitário mexe no `box-shadow` de uma carta: o halo de foco global (`:focus-visible`, camada base) e o
// anel ouro de alvo e seleção (`anel-ouro`) são os dois donos dele. A sombra das cartas da mão é um `drop-shadow`
// (filtro), que não disputa o `box-shadow`.
import type { Card as EngineCard } from '@coringa/engine';
import * as m from 'motion/react-m';
import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import type { CardFx } from '../../model/effects.ts';
import { TABLE_MOTION } from '../../model/table-motion.ts';
import { useAnim } from '../anim/context.ts';
import { useFxLayer } from '../anim/FxLayer.tsx';
import { layoutTransition } from '../anim/motion.ts';
import { useDealIn } from '../anim/useDealIn.ts';
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
  /** Papel escrito na carta da mão ("Guarda", "Bônus de ataque"…). */
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
  /** Carta da mão sem jogada agora (bloco A dos pontos do playtest, ponto 2): o nome acessível termina em "sem jogada agora". */
  idle?: boolean;
  /** Texto do `title` (padrão: o papel e o efeito da carta). */
  hint?: string;
  /**
   * A carta é do tabuleiro e muda de lugar de forma animada: `layoutId` = id da carta (spec §4.1). Fora do tabuleiro
   * (o diálogo do cemitério, a carta grande do Equipar) fica desligado, para não disputar o `layoutId` com a da mesa.
   */
  animated?: boolean;
  /** Os controles estão travados (batida em curso, jogada em voo, conexão caída): o botão fica apagado, mas focável. */
  disabled?: boolean;
  onSelect?: () => void;
  /** Só para a carta que é botão (`onSelect`): `-1` a tira da ordem do Tab, quando outro botão faz a mesma coisa. */
  tabIndex?: number;
  /** O jogador passou o mouse, tocou ou focou numa carta marcada: a marca apaga. */
  onSeen?: () => void;
  /** A `ref` do elemento da carta para o gesto de arrastar (`useCardDrag().bind`): é ele que o dedo pega e que o fantasma copia. */
  dragRef?: (el: HTMLElement | null) => void;
  /** O gesto de arrastar vale agora para esta carta: o cursor vira a mãozinha (`cursor-grab`), no lugar do `cursor-pointer` do botão. */
  grabbable?: boolean;
  /**
   * Uma cópia (a carta grande do momento da especial do oponente): sem `data-card-id`, para nenhum seletor da carta de verdade a pegar,
   * e escondida do leitor de tela.
   */
  ghost?: boolean;
  className?: string;
}

const DEAL_FLY = { fly: true, fade: false } as const;
/** O esmaecimento da carta que a cópia do momento encontra no destino: curto, para não haver duas cartas no lugar. */
const SNAP_FADE_S = 0.05;
/** O verso: só o que acabou de entrar na mão voa (ver `useDealIn`). */
const BACK_FLY = { fly: true, fade: false, onlyNew: true } as const;

/** "7 de copas", "K de paus", "Coringa Selvagem" (com o papel em campo, "Coringa Selvagem como J"). */
export function cardName(card: EngineCard, as?: WildRole): string {
  if (card.kind === 'WILD') return as ? `Coringa Selvagem como ${as}` : 'Coringa Selvagem';
  return `${card.kind === 'NUM' ? card.value : card.kind} de ${card.suit}`;
}

const HINT: Record<'K' | 'J' | 'Q' | 'A' | 'WILD' | 'NUM', string> = {
  K: 'K, Guarda: absorve o dano de um ataque e quebra. Quatro K na Guarda dão a Exódia.',
  J: 'J, Bônus de ataque: soma 1 ao multiplicador do ataque. Quatro J armam o Ataque Absoluto.',
  Q: 'Q, Bônus de defesa: soma 1 ao multiplicador da defesa. Quatro Q ativam a Defesa Absoluta.',
  A: 'A, Armadilha ou Roubo: destrói um J, um Q ou um K do oponente, ou rouba uma numérica dele (ele perde o valor e você cura).',
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
  // A carta de campo é contêiner do próprio tamanho: com as fileiras de 8 (sub-projeto 5) a grade a encolhe abaixo de `--card-w`
  // quando falta lugar, e o valor e o naipe seguem a largura de verdade (`cqw`), sem passar da carta.
  field: {
    box: 'w-full aspect-[0.72] border-[2.5px] pc:border-[3px] [container-type:inline-size]',
    value: 'left-[8%] top-0 text-[length:47cqw]',
    suit: 'right-[7%] bottom-[6%] size-[37cqw]',
    wild: 'left-[6%] top-[6%] size-[55cqw]',
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

/**
 * As partes do nome acessível. Com o papel escrito na face (a mão), o nome segue a ordem do texto visível, "Q, Bônus de defesa, de
 * ouros": o axe (WCAG 2.5.3, rótulo no nome) exige que o texto visível ("Q Bônus de defesa") seja um trecho contínuo do nome.
 */
function cardLabel(card: EngineCard, as: WildRole | undefined, roleText: string | undefined): string[] {
  if (roleText && card.kind !== 'WILD') return [card.kind === 'NUM' ? String(card.value) : card.kind, roleText, `de ${card.suit}`];
  const parts = [cardName(card, as)];
  if (roleText) parts.push(roleText);
  return parts;
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
        {/* O espaço (os filhos são `absolute`, nada muda no layout) separa as palavras do texto visível; ver `cardLabel`. */}
        {roleText ? (
          <>
            {' '}
            <RoleLabel>{roleText}</RoleLabel>
          </>
        ) : null}
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
      {roleText ? (
        <>
          {' '}
          <RoleLabel>{roleText}</RoleLabel>
        </>
      ) : null}
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
  idle = false,
  hint,
  animated = true,
  disabled = false,
  onSelect,
  tabIndex,
  onSeen,
  dragRef,
  grabbable = false,
  ghost = false,
  className = '',
}: CardProps) {
  const anim = useAnim();
  const fx = animated ? anim.fx.cards.get(card.id) : undefined;
  const landing = animated ? anim.landAt(card.id) : null;
  // Carta que o `CardsDealt` traz, ou que cai no destino por não ter de onde voar (a do Bot, sub-projeto 6 §8): fica apagada e esmaece na
  // batida dela (só opacidade: vale com movimento reduzido).
  const dealt = animated ? anim.enterDelay(card.id) : null;
  const dropAt = landing?.drop ? landing.at - TABLE_MOTION.dropMs / 1000 : null;
  // A da especial do oponente aparece de uma vez no impacto: a cópia do momento chega nela (bloco A dos pontos do playtest, ponto 1).
  const snapAt = landing?.snap ? landing.at : null;
  const enter = dealt ?? dropAt ?? snapAt;
  const enterSeconds = dealt !== null ? 0.25 : dropAt !== null ? TABLE_MOTION.dropMs / 1000 : snapAt !== null ? SNAP_FADE_S : 0.25;
  const self = useRef<HTMLElement | null>(null);
  const bindRef = useCallback(
    (el: HTMLElement | null) => {
      self.current = el;
      dragRef?.(el);
    },
    [dragRef],
  );
  useTableMotion(self, animated ? anim.recoilAt(card.id) : null, landing, animated ? anim.markOf(card.id) : 0, anim.reduced);
  // A carta que a compra traz voa do monte, em leque; a opacidade é a do Motion (`enter`).
  useDealIn(self, animated ? anim.dealAt(card.id) : null, DEAL_FLY);
  const name = cardLabel(card, as, roleText);
  const waiting = disabled && onSelect !== undefined;
  if (front) name.push('sai primeiro');
  if (quad) name.push('quadra');
  if (target) name.push('alvo possível');
  if (marked) name.push('novo');
  if (draft) name.push('rascunho');
  if (idle) name.push('sem jogada agora');

  const classes = [
    'relative box-border border-tinta p-0 text-tinta rounded-[3px_5px_4px_6px]',
    SIZE[size].box,
    // Um fundo só: duas classes `bg-*` disputam a mesma propriedade e quem ganha é a ordem do CSS gerado, não a da lista.
    card.kind === 'WILD' ? 'bg-ouro' : quad ? QUAD_FACE : 'bg-papel',
    selected ? '-translate-y-3.5 anel-ouro' : target ? 'anel-ouro' : '',
    grave ? 'grayscale opacity-90' : '',
    draft ? 'border-dashed opacity-70' : '',
    // Um cursor só por carta: duas classes `cursor-*` disputam a mesma propriedade e quem ganha é a ordem do CSS gerado. Travada, é a
    // espera; destravada e arrastável, a mãozinha; só botão, o dedo.
    waiting ? 'cursor-wait' : grabbable ? 'cursor-grab' : onSelect ? 'cursor-pointer' : '',
    onSelect ? 'focus-visible:z-10' : '',
    // Travada, a carta apaga (o toque não faz nada), mas continua focável e lida pelo leitor de tela.
    waiting ? 'opacity-60' : '',
    className,
  ];
  const common = {
    className: classes.filter(Boolean).join(' '),
    'aria-label': name.join(', '),
    title: hint ?? cardHint(card, as),
    'data-card-id': ghost ? undefined : card.id,
    'aria-hidden': ghost ? true : undefined,
    'data-novo': marked ? 'true' : undefined,
    'data-alvo': target ? 'true' : undefined,
    'data-quad': quad ? 'true' : undefined,
    'data-rascunho': draft ? 'true' : undefined,
    'data-fx': fx,
    'data-entra': enter === null ? undefined : String(enter),
    onPointerEnter: marked ? onSeen : undefined,
    onPointerDown: marked ? onSeen : undefined,
    onFocus: marked ? onSeen : undefined,
    // A transição de layout da carta espera a batida do evento que a move (`delayOf`). O `layoutDependency` faz o
    // Motion medir a mesa uma vez por `state` (e uma vez no fim das batidas, que termina o que ficou no ar).
    ...(animated
      ? {
          layoutId: card.id,
          layoutDependency: anim.layoutKey,
          initial: enter === null ? undefined : { opacity: 0 },
          animate: enter !== null ? { opacity: 1 } : undefined,
          transition: {
            layout: layoutTransition(anim.delayOf(card.id), anim.instant(card.id)),
            opacity: { delay: enter ?? 0, duration: enterSeconds },
          },
        }
      : {}),
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
      {quad ? <QuadMarks reduced={anim.reduced} /> : null}
      {marked ? (
        <span aria-hidden="true" data-marca-novo className="absolute bottom-[3px] left-[3px] h-[4px] w-[46%] bg-vermelho" />
      ) : null}
      {fx ? <FxOverlay fx={fx} ms={anim.beatMs} /> : null}
    </>
  );

  if (onSelect) {
    return (
      <m.button
        key={animated ? anim.markOf(card.id) : undefined}
        type="button"
        ref={bindRef}
        {...common}
        aria-pressed={selected}
        aria-disabled={disabled || undefined}
        tabIndex={tabIndex}
        onClick={disabled ? undefined : onSelect}
      >
        {inside}
      </m.button>
    );
  }
  return (
    <m.div key={animated ? anim.markOf(card.id) : undefined} ref={bindRef} role="img" {...common}>
      {inside}
    </m.div>
  );
}

/**
 * O movimento da jogada na carta (sub-projeto 6 §8, fatia 5), pela Web Animations, nas propriedades CSS `translate` e `scale`: o
 * `transform` da carta é do Motion (a projeção do `layoutId`), e as duas se compõem com ele sem disputá-lo.
 * - O recuo: a carta que sai da sua mão desce 6 px e volta no começo da batida dela; o voo do `layoutId` espera o recuo (`delayOf`).
 * - A queda: a carta sem de onde voar (a do Bot) cai de 14 px no destino, na batida dela.
 * - O pouso: um achatamento leve (1 → 1,06 → 1) e um sopro de poeira, quando a mola já assentou e a projeção voltou à identidade.
 * O pulo apaga `recoilAt` e `landAt` (e muda a `key` da carta): o que ficou agendado cai na limpeza. Com movimento reduzido, nada disso.
 */
function useTableMotion(
  self: { current: HTMLElement | null },
  recoilAt: number | null,
  landing: { at: number; drop: boolean; dust: number } | null,
  mark: number,
  reduced: boolean,
): void {
  const fxLayer = useFxLayer();
  useEffect(() => {
    const el = self.current;
    if (el === null || recoilAt === null || reduced) return;
    const recoil = el.animate?.([{ translate: '0 0' }, { translate: `0 ${TABLE_MOTION.recoilPx}px` }, { translate: '0 0' }], {
      duration: TABLE_MOTION.recoilMs,
      delay: recoilAt * 1000,
      easing: 'ease-in-out',
    });
    return () => recoil?.cancel();
  }, [self, recoilAt, mark, reduced]);
  const landAt = landing?.at ?? null;
  const drop = landing?.drop ?? false;
  const dust = landing?.dust ?? TABLE_MOTION.dust;
  useEffect(() => {
    const el = self.current;
    if (el === null || landAt === null || reduced) return;
    const ms = landAt * 1000;
    const moves: (Animation | undefined)[] = [];
    if (drop) {
      moves.push(
        el.animate?.([{ translate: `0 -${TABLE_MOTION.dropPx}px` }, { translate: '0 0' }], {
          duration: TABLE_MOTION.dropMs,
          delay: ms - TABLE_MOTION.dropMs,
          easing: 'ease-in',
          fill: 'backwards',
        }),
      );
    }
    moves.push(
      el.animate?.([{ scale: '1' }, { scale: String(TABLE_MOTION.squash), offset: 0.35 }, { scale: '1' }], {
        duration: TABLE_MOTION.squashMs,
        delay: ms,
        easing: 'ease-out',
      }),
    );
    const timer = window.setTimeout(() => fxLayer.burst('dust', el, dust), ms);
    return () => {
      moves.forEach((move) => move?.cancel());
      window.clearTimeout(timer);
    };
  }, [self, landAt, drop, dust, mark, reduced, fxLayer]);
}

/**
 * A quadra marcada (sub-projeto 6 §6): as quatro cartas ficam diferentes das outras o tempo todo. Além do fundo dourado claro
 * (`QUAD_FACE`), uma moldura de ouro de 2 px por fora da borda e um brilho que passa a cada 3,2 s (a animação mora no CSS,
 * `.brilho-quadra`; sem brilho com movimento reduzido). Tudo decorativo: o nome da carta já diz "quadra".
 */
function QuadMarks({ reduced }: { reduced: boolean }) {
  return (
    <>
      <span
        aria-hidden="true"
        data-anel-quadra
        className="pointer-events-none absolute -inset-[4px] rounded-[5px_7px_6px_8px] border-2 border-ouro shadow-[0_0_12px_2px_color-mix(in_oklab,var(--color-ouro)_50%,transparent)]"
      />
      {reduced ? null : (
        <span aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]">
          <span
            data-brilho-quadra
            className="brilho-quadra absolute -inset-[20%] bg-[linear-gradient(115deg,transparent_40%,color-mix(in_oklab,white_85%,transparent)_50%,transparent_60%)]"
          />
        </span>
      )}
    </>
  );
}

/**
 * O efeito de uma batida sobre a carta (spec §4.2): a carta do escudo do Reflect, a carta da quadra que acende. Dura a batida, sobe e desce
 * uma vez (sem pisca-pisca) e só usa opacidade. A carta que quebra racha na cópia dela (`ui/anim/Leaving.tsx`).
 */
function FxOverlay({ fx, ms }: { fx: CardFx; ms: number }) {
  const motion = {
    'aria-hidden': true,
    'data-fx-overlay': fx,
    initial: { opacity: 0 },
    animate: { opacity: [0, 1, 1, 0] },
    transition: { duration: ms / 1000, times: [0, 0.2, 0.8, 1], ease: 'linear' as const },
  };
  if (fx === 'light') return <m.span {...motion} className="pointer-events-none absolute inset-0 bg-ouro/70" />;
  // Os K da Guarda que causam a cura passiva (bloco A dos pontos do playtest, ponto 9): o halo verde da cura.
  if (fx === 'cause') return <m.span {...motion} className="pointer-events-none absolute -inset-1 rounded-[8px] border-4 border-cura bg-cura/20" />;
  return <m.span {...motion} className="pointer-events-none absolute -inset-1 rounded-[8px] border-4 border-ouro" />;
}

/** O verso de uma carta que você não vê (a mão do oponente): sem nome, sem id. */
export function CardBack({ className = '', enter = null, fly = null }: { className?: string; enter?: number | null; fly?: number | null }) {
  const self = useRef<HTMLSpanElement>(null);
  useDealIn(self, fly, BACK_FLY);
  return (
    <m.span
      ref={self}
      aria-hidden="true"
      data-verso
      data-entra={enter === null ? undefined : String(enter)}
      initial={enter === null ? undefined : { opacity: 0 }}
      animate={enter === null ? undefined : { opacity: 1 }}
      transition={{ opacity: { delay: enter ?? 0, duration: 0.25 } }}
      className={`box-border inline-block h-[26px] w-[18px] flex-none rounded-[2px] border-[1.5px] border-tinta bg-[repeating-linear-gradient(45deg,var(--color-tinta)_0_2px,var(--color-papel)_2px_4px)] pc:h-[34px] pc:w-6 ${className}`}
    />
  );
}
