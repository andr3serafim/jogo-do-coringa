// As artes do painel do Equipar no lugar dos textos (decisoes.md 2026-11-25 (4) e (6); spec 2026-11-25-equipar-abertura-niveis §3.3): cada
// uma diz o que o texto dizia, e o texto segue para o leitor de tela (`sr-only`). Desenho original do projeto, no traço das figuras da mesa
// (`icons.tsx`). O motivo da jogada recusada abre ao tocar no disco, como as marcas do Coringa: o iPhone não mostra a dica do mouse.
import type { Card } from '@coringa/engine';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import { equipQuadText, NO_PENDING_TEXT, SENDING_TEXT } from '../../model/copy.ts';
import { Suit, isRedSuit } from '../cards/Suit.tsx';
import { ConfirmIcon, NoCardsIcon, RejectedIcon, WaitingIcon } from './icons.tsx';
import { MarkTipCard } from './MarkFigure.tsx';
import { ResurrectIcon } from './ResurrectIcon.tsx';
import { useMarkTip } from './useMarkTip.ts';

/** A carta que sai na troca, pequena, no canto do carimbo do destino: o valor e o naipe, como o canto de uma carta da mesa. */
export function MiniCard({ card }: { card: Card }) {
  if (card.kind !== 'NUM') return null;
  return (
    <span
      aria-hidden="true"
      className={`absolute -right-2 -top-2 flex h-6 w-[18px] flex-col items-center justify-center rounded-[2px] border-2 border-tinta bg-papel font-texto text-[10px] font-extrabold leading-none tabular-nums shadow-[1px_1px_0_var(--color-tinta)] ${isRedSuit(card.suit) ? 'text-vermelho' : 'text-tinta'}`}
    >
      {card.value}
      <Suit suit={card.suit} className="size-2" />
    </span>
  );
}

/** A quadra que o rascunho forma: quatro cartas em leque com o valor, o "+N" e a Ressurreição que ela dá. */
export function QuadBadge({ value }: { value: number }) {
  return (
    <span data-quadra-nova className="flex items-center gap-1.5 border-2 border-tinta bg-ouro px-1.5 py-0.5 text-tinta shadow-[2px_2px_0_var(--color-tinta)]">
      <span className="sr-only">{equipQuadText(value)}</span>
      <span aria-hidden="true" className="relative h-6 w-7">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className="absolute bottom-0 flex h-5 w-3.5 items-start justify-center rounded-[2px] border-[1.5px] border-tinta bg-papel pt-px font-texto text-[8px] font-extrabold leading-none tabular-nums"
            style={{ left: `${i * 4}px`, rotate: `${(i - 1.5) * 9}deg`, transformOrigin: '50% 120%' }}
          >
            {i === 3 ? value : ''}
          </span>
        ))}
      </span>
      <span aria-hidden="true" data-numero className="font-texto text-sm font-extrabold tabular-nums">
        +{value}
      </span>
      <ResurrectIcon />
    </span>
  );
}

/** Enviando: três pontos de ouro que pulsam (parados com movimento reduzido, pelo CSS). */
export function SendingDots() {
  return (
    <span role="status" className="flex items-center gap-1 px-1 py-2">
      <span className="sr-only">{SENDING_TEXT}</span>
      {[0, 1, 2].map((i) => (
        <span key={i} aria-hidden="true" className="ponto-enviando size-2 rounded-full bg-ouro" style={{ animationDelay: `${i * 160}ms` }} />
      ))}
    </span>
  );
}

/**
 * A jogada recusada: o disco vermelho. O motivo é lido no status e abre na dica ao tocar, focar ou passar o mouse; o toque é só da dica
 * (`data-sem-pulo`: não termina as batidas do `Stage`).
 */
export function RejectedNotice({ text }: { text: string }) {
  const button = useRef<HTMLButtonElement>(null);
  const { open, handlers } = useMarkTip('recusa', button);
  return (
    <span className="flex items-center">
      <span role="status" className="sr-only">
        {text}
      </span>
      <button
        ref={button}
        type="button"
        data-sem-pulo=""
        aria-label={text}
        aria-expanded={open}
        className="grid min-h-11 min-w-11 cursor-help place-items-center"
        {...handlers}
      >
        <RejectedIcon className="size-7" />
        {open ? createPortal(<MarkTipCard anchor={button} does={text} />, document.body) : null}
      </button>
    </span>
  );
}

/** Nenhuma numérica nesta rodada (e, enquanto o outro monta, a ampulheta). */
export function NoCardsArt({ waiting, waitingText }: { waiting: boolean; waitingText: string }) {
  return (
    <div role="status" className="flex items-center justify-center gap-4 py-2">
      <span className="sr-only">
        {NO_PENDING_TEXT}
        {waiting ? `. ${waitingText}` : ''}
      </span>
      <NoCardsIcon className="size-12 text-papel" />
      {waiting ? <WaitingIcon className="size-10" /> : null}
    </div>
  );
}

/** A sua montagem já foi: o visto de ouro e, enquanto o outro monta, a ampulheta (enviando: os pontos). */
export function ConfirmedArt({ text, sending }: { text: string; sending: boolean }) {
  return (
    <div className="flex items-center justify-center gap-4 py-2">
      {sending ? null : (
        <span role="status" className="sr-only">
          {text}
        </span>
      )}
      <span aria-hidden="true" className="grid size-14 place-items-center border-[3px] border-tinta bg-ouro shadow-[3px_3px_0_var(--color-madeira)]">
        <ConfirmIcon className="size-8" />
      </span>
      {sending ? <SendingDots /> : <WaitingIcon className="size-10" />}
    </div>
  );
}
