// O espelho pequeno da zona "Reflect ativo" (sub-projeto 6 §7.5): é aqui que o espelho grande da cena encolhe e fica até o ataque. Sai de
// `player.reflect`, então vale no replay, na reconexão e depois de recarregar. Estático e decorativo: as cartas da zona são o registro.
import type { PlayerId } from '@coringa/engine';

/** O triângulo do espelho, no quadro de -100 a 100 (o desenho do protótipo aprovado). */
export const MIRROR_PATH = 'M0 -84 L74 44 L-74 44 Z';

export function MirrorMark({ owner }: { owner: PlayerId }) {
  return (
    <svg
      viewBox="-90 -96 180 152"
      aria-hidden="true"
      data-espelho-zona={owner}
      className="pointer-events-none absolute -top-1.5 right-0 h-7 w-8 pc:h-9 pc:w-10"
    >
      <path d={MIRROR_PATH} fill="var(--color-papel)" />
      <path d="M-46 36 L-6 -46 L4 -46 L-34 36 Z" fill="var(--color-tinta)" opacity="0.14" />
      <path d={MIRROR_PATH} fill="none" stroke="var(--color-ouro)" strokeWidth="14" strokeLinejoin="round" />
      <path d={MIRROR_PATH} fill="none" stroke="var(--color-tinta)" strokeWidth="4" strokeLinejoin="round" />
    </svg>
  );
}
