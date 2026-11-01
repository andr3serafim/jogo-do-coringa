// A insígnia da Defesa Absoluta (sub-projeto 6 §7.2): o escudo-fortaleza da cena, pequeno, no canto do retrato de quem tem a
// Defesa Absoluta, enquanto ela durar. Mesmo desenho do escudo da cena (ameias, aro de ouro, campo esquartelado em papel e
// vermelho). É desenho: o leitor de tela sabe da Defesa Absoluta pela marca de estado do campo.
import { useId } from 'react';

/** O contorno do escudo-fortaleza, com as ameias, no quadro de 200 × 250 do protótipo. */
export const FORT_SHIELD =
  'M20 125 V14 H42 V32 H66 V14 H88 V32 H112 V14 H134 V32 H158 V14 H180 V125 C180 178 142 212 100 234 C58 212 20 178 20 125 Z';
/** O campo: o mesmo contorno, 80% do tamanho, dentro do aro. */
export const FORT_FIELD = 'translate(100 124) scale(.8) translate(-100 -124)';

export function Insignia({ className = '' }: { className?: string }) {
  const clip = useId();
  return (
    <svg aria-hidden="true" data-insignia viewBox="-10 -10 220 260" className={`pointer-events-none ${className}`}>
      <defs>
        <clipPath id={clip}>
          <path d={FORT_SHIELD} transform={FORT_FIELD} />
        </clipPath>
      </defs>
      <path d={FORT_SHIELD} fill="var(--color-ouro)" stroke="var(--color-tinta)" strokeWidth="14" />
      <g clipPath={`url(#${clip})`}>
        <rect width="200" height="250" fill="var(--color-papel)" />
        <rect x="100" y="0" width="100" height="118" fill="var(--color-vermelho)" />
        <rect x="0" y="118" width="100" height="140" fill="var(--color-vermelho)" />
      </g>
    </svg>
  );
}
