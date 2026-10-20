// Peças de controle que a barra de ação e os painéis das fases (Equipar, ordem, reação) dividem: o botão secundário
// (contorno de papel sobre a tinta), o principal (ouro) e o botão de duas linhas. Alvo de toque ≥ 44 px (spec §3.2).
import { useId, type ComponentPropsWithoutRef } from 'react';
import type { Notice } from '../../model/session.ts';

export const SECONDARY =
  'min-h-11 border-2 border-papel bg-transparent px-3.5 py-1.5 text-left text-[15px] font-bold text-papel disabled:cursor-wait disabled:opacity-60';

/** O botão principal da fase: ouro, com o título em tipo de madeira. Mais alto que o secundário e longe da mão. */
export const PRIMARY =
  'min-h-14 border-0 bg-ouro px-3.5 py-1.5 text-left text-tinta disabled:cursor-wait disabled:opacity-60 pc:min-h-12';

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
}

/** Botão de duas linhas: o nome é o título; a segunda linha é a descrição. */
export function TwoLine({ title, detail, titleClass = '', detailClass = '', className = '', ...rest }: TwoLineProps) {
  const titleId = useId();
  const detailId = useId();
  return (
    <button
      type="button"
      aria-labelledby={titleId}
      aria-describedby={detail ? detailId : undefined}
      className={`flex flex-col items-start ${className}`}
      {...rest}
    >
      <span id={titleId} className={titleClass}>
        {title}
      </span>
      {detail ? (
        <span id={detailId} className={detailClass}>
          {detail}
        </span>
      ) : null}
    </button>
  );
}
