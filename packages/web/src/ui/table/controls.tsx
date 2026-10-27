// Peças de controle que a barra de ação e os painéis das fases (Equipar, ordem, reação) dividem: o botão secundário
// (contorno de papel sobre a tinta), o principal (ouro) e o botão de duas linhas. Alvo de toque ≥ 44 px (spec §3.2).
import { useId, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import type { Notice } from '../../model/session.ts';

export const SECONDARY =
  'min-h-11 border-2 border-papel bg-transparent px-3.5 py-1.5 text-left text-[15px] font-bold text-papel disabled:cursor-wait disabled:opacity-60';

/** O botão principal da fase: ouro, com o título em tipo de madeira. Mais alto que o secundário e longe da mão. */
export const PRIMARY =
  'min-h-14 justify-center border-0 bg-ouro px-3.5 py-1.5 text-left text-tinta disabled:cursor-wait disabled:opacity-60 pc:min-h-12';

export const PRIMARY_TITLE = 'font-madeira text-[19px] uppercase leading-tight pc:text-[22px]';

/** O aviso de uma jogada recusada (`rate`, `rule`, spec §6.4): os controles voltam e a linha diz o porquê. */
export function NoticeLine({ notice }: { notice: Notice | null }) {
  if (notice === null || (notice.kind !== 'rate' && notice.kind !== 'rule')) return null;
  return (
    <p role="status" className="text-sm font-bold leading-snug text-ouro">
      {notice.text}
    </p>
  );
}

interface TwoLineProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children' | 'title'> {
  title: string;
  detail?: string;
  titleClass?: string;
  detailClass?: string;
  /** Um desenho à esquerda das duas linhas (escondido do leitor de tela: o nome é o texto). */
  icon?: ReactNode;
}

/**
 * Botão de duas linhas. O nome é o título e a segunda linha, juntos (`aria-labelledby` nos dois): o axe (WCAG 2.5.3, rótulo no
 * nome) exige que o texto visível do botão seja trecho contínuo do nome, e o texto visível é o das duas linhas. O espaço entre
 * os dois `span` separa as palavras do texto visível ("Atacar 27 × 3 · dano 24", e não "Atacar27 × 3 · dano 24").
 */
export function TwoLine({ title, detail, titleClass = '', detailClass = '', className = '', icon, ...rest }: TwoLineProps) {
  const titleId = useId();
  const detailId = useId();
  const lines = (
    <>
      <span id={titleId} className={titleClass}>
        {title}
      </span>
      {detail ? (
        <>
          {' '}
          <span id={detailId} className={detailClass}>
            {detail}
          </span>
        </>
      ) : null}
    </>
  );
  return (
    <button
      type="button"
      aria-labelledby={detail ? `${titleId} ${detailId}` : titleId}
      className={`flex ${icon ? 'flex-row items-center gap-2.5' : 'flex-col items-start'} ${className}`}
      {...rest}
    >
      {icon ? (
        <>
          {icon}
          <span className="flex flex-col items-start">{lines}</span>
        </>
      ) : (
        lines
      )}
    </button>
  );
}
