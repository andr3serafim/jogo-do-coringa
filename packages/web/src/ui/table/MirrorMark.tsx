// O espelho pequeno da zona "Reflect ativo" (sub-projeto 6 §7.5): é aqui que o espelho grande da cena encolhe e fica até o ataque. Sai de
// `player.reflect`, então vale no replay, na reconexão e depois de recarregar. Decorativo: as cartas da zona são o registro. Desde o bloco A
// dos pontos do playtest (ponto 6), um brilho passa por ele a cada ~3 s (`data-gesto="espelho"`, no `styles.css`); com movimento
// reduzido, não.
import type { PlayerId } from '@coringa/engine';
import { useId } from 'react';
import { useAnim } from '../anim/context.ts';

/** O triângulo do espelho, no quadro de -100 a 100 (o desenho do protótipo aprovado). */
export const MIRROR_PATH = 'M0 -84 L74 44 L-74 44 Z';

export function MirrorMark({ owner }: { owner: PlayerId }) {
  const { reduced } = useAnim();
  const clip = useId();
  return (
    <svg
      viewBox="-90 -96 180 152"
      aria-hidden="true"
      data-espelho-zona={owner}
      data-gesto={reduced ? undefined : 'espelho'}
      className="pointer-events-none absolute -top-1.5 right-0 h-7 w-8 pc:h-9 pc:w-10"
    >
      <defs>
        <clipPath id={clip}>
          <path d={MIRROR_PATH} />
        </clipPath>
      </defs>
      <path d={MIRROR_PATH} fill="var(--color-papel)" />
      <path d="M-46 36 L-6 -46 L4 -46 L-34 36 Z" fill="var(--color-tinta)" opacity="0.14" />
      <g clipPath={`url(#${clip})`}>
        <rect data-brilho x="-12" y="-96" width="20" height="152" fill="#ffffff" opacity="0" transform="skewX(-22)" />
      </g>
      <path d={MIRROR_PATH} fill="none" stroke="var(--color-ouro)" strokeWidth="14" strokeLinejoin="round" />
      <path d={MIRROR_PATH} fill="none" stroke="var(--color-tinta)" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}
