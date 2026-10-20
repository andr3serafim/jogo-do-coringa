// Naipes desenhados para o projeto (spec §10.2 e §10.6): inline, sem `<symbol>` (nada de ids repetidos) e cada
// naipe com forma própria, para o vermelho e o preto nunca serem a única pista. `currentColor` deixa quem usa
// escolher a cor.
import type { Suit as SuitName } from '@coringa/engine';

const PATHS: Record<SuitName, string> = {
  copas:
    'M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.6 4.5c2.1 0 3.6 1.1 5.4 3.1 1.8-2 3.3-3.1 5.4-3.1 3.6 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z',
  ouros: 'M12 2 20 12 12 22 4 12z',
  espadas:
    'M12 2s-8 6.2-8 11.2C4 16 6 18 8.5 18c1.4 0 2.6-.6 3.1-1.4-.3 2-1.2 3.6-2.6 4.9h6c-1.4-1.3-2.3-2.9-2.6-4.9.5.8 1.7 1.4 3.1 1.4C18 18 20 16 20 13.2 20 8.2 12 2 12 2z',
  paus: 'M12 3a3.6 3.6 0 0 0-3.4 4.8A3.6 3.6 0 1 0 9.7 15c.7 0 1.4-.2 1.9-.6-.3 2.6-1.2 4.6-2.6 6.1h6c-1.4-1.5-2.3-3.5-2.6-6.1.5.4 1.2.6 1.9.6a3.6 3.6 0 1 0 1.1-7.2A3.6 3.6 0 0 0 12 3z',
};

/** Copas e ouros são vermelhos; espadas e paus, pretos. */
export const isRedSuit = (suit: SuitName): boolean => suit === 'copas' || suit === 'ouros';

export function Suit({ suit, className }: { suit: SuitName; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false" className={className}>
      <path d={PATHS[suit]} />
    </svg>
  );
}
