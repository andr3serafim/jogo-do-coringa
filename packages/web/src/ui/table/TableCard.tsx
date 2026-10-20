// Uma carta da mesa ligada ao estado dela: a marca "novo", o alvo e os ouvintes vêm do contexto da mesa.
import type { Card as EngineCard } from '@coringa/engine';
import { Card, type CardProps } from '../cards/Card.tsx';
import { useTableUi } from './context.ts';

type TableCardProps = Omit<CardProps, 'marked' | 'target' | 'onSelect' | 'onSeen'> & {
  card: EngineCard;
  /** Carta da mão: o toque escolhe a carta (e não o alvo). */
  inHand?: boolean;
};

export function TableCard({ card, inHand = false, ...rest }: TableCardProps) {
  const ui = useTableUi();
  const marked = ui.marked.has(card.id);
  const target = ui.targetIds.has(card.id);
  const { onSelectCard, onSelectTarget, onSeen } = ui;
  let onSelect: (() => void) | undefined;
  if (inHand) {
    if (onSelectCard) onSelect = () => onSelectCard(card.id);
  } else if (target && onSelectTarget) {
    onSelect = () => onSelectTarget(card.id);
  }
  return (
    <Card
      {...rest}
      card={card}
      marked={marked}
      target={target}
      onSelect={onSelect}
      onSeen={onSeen ? () => onSeen(card.id) : undefined}
    />
  );
}
