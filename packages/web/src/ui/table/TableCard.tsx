// Uma carta da mesa ligada ao estado dela: a marca "novo", o alvo e os ouvintes vêm do contexto da mesa.
import type { Card as EngineCard } from '@coringa/engine';
import { Card, type CardProps } from '../cards/Card.tsx';
import { useTableUi } from './context.ts';

type TableCardProps = Omit<CardProps, 'marked' | 'target' | 'onSelect' | 'tabIndex' | 'onSeen' | 'disabled'> & {
  card: EngineCard;
  /** Carta da mão: o toque escolhe a carta (e não o alvo). */
  inHand?: boolean;
};

export function TableCard({ card, inHand = false, ...rest }: TableCardProps) {
  const ui = useTableUi();
  const marked = ui.marked.has(card.id);
  const target = ui.targetIds.has(card.id);
  const draft = ui.draftIds.has(card.id);
  const { onSelectCard, onExplainCard, onSelectTarget, onSeen } = ui;
  let onSelect: (() => void) | undefined;
  if (inHand) {
    if (onSelectCard) onSelect = () => onSelectCard(card.id);
    else if (onExplainCard) onSelect = () => onExplainCard(card.id);
  } else if (target && onSelectTarget) {
    onSelect = () => onSelectTarget(card.id);
  }
  return (
    <Card
      {...rest}
      card={card}
      marked={marked}
      target={target}
      draft={draft}
      onSelect={onSelect}
      disabled={ui.locked}
      // O alvo na mesa é pequeno e fica antes da mão na ordem do DOM: o teclado usa a lista de alvos da barra
      // (mão → alvos → barra, spec §3.4), e o clique do mouse e o toque continuam valendo aqui.
      tabIndex={!inHand && onSelect ? -1 : undefined}
      onSeen={onSeen ? () => onSeen(card.id) : undefined}
    />
  );
}
