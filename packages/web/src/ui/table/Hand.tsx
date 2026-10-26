// A sua mão (spec §3.1): as cartas com o papel escrito em cada uma (Guarda, Buff de ataque, Buff de defesa,
// Armadilha, Selvagem). Com `onSelectCard` na mesa as cartas viram botões; sem, é só a vista. Com mais cartas do
// que cabem na largura, elas se sobrepõem aos poucos (a margem negativa sai da conta da largura da lista), e o
// valor, no canto esquerdo, continua à vista.
import type { SpecialCard } from '@coringa/engine';
import { useTableUi } from './context.ts';
import { HAND_ROLE } from './labels.ts';
import { TableCard } from './TableCard.tsx';

export function Hand({ cards }: { cards: SpecialCard[] }) {
  const { selectedCardId, hintZone } = useTableUi();
  if (cards.length === 0) {
    return <p className="px-3 pb-2 pt-[18px] text-center text-sm font-bold pc:text-papel">Sua mão está vazia</p>;
  }
  const count = cards.length;
  return (
    <ul
      role="list"
      aria-label="Sua mão"
      // O contorno da dica do tutorial (`styles.css`, `[data-dica]`) fica folgado: o convite a olhar a mão, sem tapar nenhuma carta.
      data-dica={hintZone === 'hand' ? 'hand' : undefined}
      className="flex w-full list-none justify-center px-3 pb-2 pt-[18px] pc:w-[clamp(360px,50%,600px)] pc:flex-none pc:justify-start pc:px-0 pc:pb-0 pc:pt-3.5"
    >
      {cards.map((card, index) => (
        <li
          key={card.id}
          className="relative flex-none"
          style={
            index > 0
              ? { marginLeft: `clamp(calc(var(--hand-w) * -0.6), calc((100% - ${count} * var(--hand-w)) / ${count - 1}), 10px)` }
              : undefined
          }
        >
          <TableCard card={card} size="hand" inHand selected={selectedCardId === card.id} roleText={HAND_ROLE[card.kind]} />
        </li>
      ))}
    </ul>
  );
}
