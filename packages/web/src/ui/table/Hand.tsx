// A sua mão (spec §3.1): as cartas com o papel escrito em cada uma (Guarda, Bônus de ataque, Bônus de defesa,
// Armadilha, Selvagem). Com `onSelectCard` na mesa as cartas viram botões; sem, é só a vista. Com mais cartas do
// que cabem na largura, elas se sobrepõem aos poucos (a margem negativa sai da conta da largura da lista), e o
// valor, no canto esquerdo, continua à vista. Fora da sua vez, com `onExplainCard`, o toque não escolhe: o balão sobre a mão diz
// por que a carta não tem jogada agora (o motivo é do motor, `noPlayReason`).
//
// Arrastar (fatia 5): com `handDrag` na mesa, cada carta que tem jogada pode ser arrastada até a zona dela (`data-soltar`); o toque
// e o teclado seguem como sempre. Cada carta chama o seu `useCardDrag` (as zonas dependem da carta). O toque comum é só o clique do botão
// (`onSelectCard`, no `TableCard`): o gesto não mexe nele, e o foco termina na primeira jogada como no PC (no celular o `mousedown` de
// compatibilidade vem antes do clique). O `onTap` é só do arrasto que escorrega além do limiar e solta de volta sobre a carta: faz o
// mesmo que o clique, que o gesto então engole, e a carta não é escolhida duas vezes. A carta de origem esmaece enquanto está no ar (na
// `<li>`: o Motion põe `opacity` inline na carta, e uma regra de CSS perderia para ele).
//
// A mão viva (sub-projeto 6 §6): cada carta respira (`data-respira`, a animação mora no CSS), cada uma num tempo. Sob o mouse ela
// inclina em 3D (até 13°), com a sombra acompanhando; no toque, a carta tocada sobe ~8 px e inclina para o lado do dedo enquanto ele
// está nela. A inclinação mora num invólucro (`data-inclina`), fora da carta, cujo `transform` é do Motion (o deslize de layout), e
// é escrita direto no estilo (sem redesenhar a cada movimento). Arrastando, nada inclina; com movimento reduzido, nada disso.
import type { SpecialCard } from '@coringa/engine';
import { useEffect, useRef, type CSSProperties, type PointerEvent } from 'react';
import type { DropKey } from '../../model/drag.ts';
import { useAnim } from '../anim/context.ts';
import { useTableUi } from './context.ts';
import { DragGhost } from './DragGhost.tsx';
import { HAND_ROLE } from './labels.ts';
import { TableCard } from './TableCard.tsx';
import { useCardDrag } from './useCardDrag.ts';

const NO_ZONES: ReadonlySet<DropKey> = new Set();

/** A carta de origem, no ar. */
const DRAGGED_OPACITY = 0.4;

/** A inclinação máxima sob o mouse e, no toque, para o lado do dedo (graus); quanto a carta tocada sobe (px). */
const TILT_MOUSE_DEG = 13;
const TILT_TOUCH_DEG = 6;
const TOUCH_LIFT_PX = 8;

/** Onde o ponteiro está na carta, de -0,5 a 0,5 em cada eixo (o centro sem medida, no jsdom). */
function pointerSpot(event: PointerEvent<HTMLElement>): { x: number; y: number } {
  const box = event.currentTarget.getBoundingClientRect();
  return {
    x: box.width > 0 ? (event.clientX - box.left) / box.width - 0.5 : 0,
    y: box.height > 0 ? (event.clientY - box.top) / box.height - 0.5 : 0,
  };
}

export function Hand({ cards }: { cards: SpecialCard[] }) {
  const { selectedCardId, hintZone, onSelectCard, handNote } = useTableUi();
  if (cards.length === 0) {
    return <p className="px-3 pb-2 pt-[18px] text-center text-sm font-bold pc:text-papel">Sua mão está vazia</p>;
  }
  const count = cards.length;
  return (
    <div className="relative w-full pc:w-[clamp(360px,50%,600px)] pc:flex-none">
      {/* O balão do motivo (B2) fica por cima do seu campo, sem empurrar a mão nem pegar o toque de nada embaixo dele. */}
      {handNote ? (
        <p
          role="status"
          data-motivo={handNote.cardId}
          className="pointer-events-none absolute bottom-[calc(100%-8px)] left-1/2 z-20 w-max max-w-[min(92vw,360px)] -translate-x-1/2 border-2 border-tinta bg-papel px-2.5 py-1.5 text-center text-[13px] font-bold leading-snug text-tinta shadow-[3px_3px_0_var(--color-tinta)]"
        >
          {handNote.text}
        </p>
      ) : null}
      <ul
        role="list"
        aria-label="Sua mão"
        // O contorno da dica do tutorial (`styles.css`, `[data-dica]`) fica folgado: o convite a olhar a mão, sem tapar nenhuma carta.
        data-dica={hintZone === 'hand' ? 'hand' : undefined}
        className="flex w-full list-none justify-center px-3 pb-2 pt-[18px] pc:justify-start pc:px-0 pc:pb-0 pc:pt-3.5"
      >
        {cards.map((card, index) => (
          <HandCard
            key={card.id}
            card={card}
            index={index}
            count={count}
            // Fora da sua vez a carta só explica: não é escolha, então não é botão de alternar.
            selected={onSelectCard ? selectedCardId === card.id : undefined}
          />
        ))}
      </ul>
    </div>
  );
}

interface HandCardProps {
  card: SpecialCard;
  index: number;
  count: number;
  selected: boolean | undefined;
}

function HandCard({ card, index, count, selected }: HandCardProps) {
  const { onSelectCard, handDrag, locked } = useTableUi();
  const { reduced, busy } = useAnim();
  const tilt = useRef<HTMLSpanElement>(null);
  const zones = () => handDrag?.zones(card.id) ?? NO_ZONES;
  // O mesmo `locked` que apaga a carta e o toque; sem zona (nenhuma jogada com ela agora) não há o que arrastar.
  const enabled = handDrag !== undefined && onSelectCard !== undefined && !locked && zones().size > 0;
  const { bind, dragging, ghost } = useCardDrag({
    enabled,
    zones,
    onDrop: (key) => handDrag?.onDrop(card.id, key),
    onTap: () => onSelectCard?.(card.id),
  });
  const style: CSSProperties = {};
  if (index > 0) {
    style.marginLeft = `clamp(calc(var(--hand-w) * -0.6), calc((100% - ${count} * var(--hand-w)) / ${count - 1}), 10px)`;
  }
  if (dragging) style.opacity = DRAGGED_OPACITY;
  if (!reduced) (style as Record<string, string>)['--respira-i'] = String(index);

  const lean = (transform: string, shadow: string) => {
    if (!tilt.current) return;
    tilt.current.style.transform = transform;
    tilt.current.style.filter = shadow;
  };
  const rest = () => lean('', '');
  const still = reduced || dragging;
  // A carta que passa a ser arrastada (ou que entra no movimento reduzido) volta reta: o fantasma é que voa.
  useEffect(() => {
    if (!still || !tilt.current) return;
    tilt.current.style.transform = '';
    tilt.current.style.filter = '';
  }, [still]);
  const onPointerMove = (event: PointerEvent<HTMLSpanElement>) => {
    if (still || event.pointerType !== 'mouse') return;
    const { x, y } = pointerSpot(event);
    lean(
      `perspective(600px) rotateX(${(-y * 2 * TILT_MOUSE_DEG).toFixed(1)}deg) rotateY(${(x * 2 * TILT_MOUSE_DEG).toFixed(1)}deg)`,
      `drop-shadow(${(-x * 8).toFixed(1)}px ${(4 - y * 6).toFixed(1)}px 0 color-mix(in oklab, var(--color-tinta) 35%, transparent))`,
    );
  };
  const onPointerDown = (event: PointerEvent<HTMLSpanElement>) => {
    if (still || event.pointerType !== 'touch') return;
    const { x } = pointerSpot(event);
    lean(
      `translateY(-${TOUCH_LIFT_PX}px) perspective(600px) rotateY(${(x * 2 * TILT_TOUCH_DEG).toFixed(1)}deg)`,
      'drop-shadow(0 6px 0 color-mix(in oklab, var(--color-tinta) 30%, transparent))',
    );
  };
  const onPointerEnd = (event: PointerEvent<HTMLSpanElement>) => {
    if (event.pointerType === 'touch' || event.type === 'pointerleave') rest();
  };
  return (
    // Durante as batidas a respiração pausa onde está (os controles estão travados, e a mesa fica com o golpe): com a CPU 4× mais
    // lenta, as cartas respirando no meio do golpe custavam ~7 quadros por segundo.
    <li
      className="relative flex-none"
      style={style}
      data-respira={reduced ? undefined : ''}
      data-respira-pausa={!reduced && busy ? '' : undefined}
    >
      <span
        ref={tilt}
        data-inclina
        className="block transition-[transform,filter] duration-150 ease-out"
        onPointerMove={onPointerMove}
        onPointerLeave={onPointerEnd}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
      >
        <TableCard card={card} size="hand" inHand selected={selected} roleText={HAND_ROLE[card.kind]} dragRef={bind} grabbable={enabled} />
      </span>
      <DragGhost ghost={ghost} />
    </li>
  );
}
