// A sua mão (spec §3.1): as cartas com o papel escrito em cada uma (Guarda, Buff de ataque, Buff de defesa,
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
import type { SpecialCard } from '@coringa/engine';
import type { CSSProperties } from 'react';
import type { DropKey } from '../../model/drag.ts';
import { useTableUi } from './context.ts';
import { DragGhost } from './DragGhost.tsx';
import { HAND_ROLE } from './labels.ts';
import { TableCard } from './TableCard.tsx';
import { useCardDrag } from './useCardDrag.ts';

const NO_ZONES: ReadonlySet<DropKey> = new Set();

/** A carta de origem, no ar. */
const DRAGGED_OPACITY = 0.4;

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
  return (
    <li className="relative flex-none" style={style}>
      <TableCard card={card} size="hand" inHand selected={selected} roleText={HAND_ROLE[card.kind]} dragRef={bind} grabbable={enabled} />
      <DragGhost ghost={ghost} />
    </li>
  );
}
