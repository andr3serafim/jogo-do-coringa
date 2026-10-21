// As sobreposições das batidas (spec §4.2, §10.1): a cena (a tela escurece e o título aparece no meio) e a faixa. Ficam
// escondidas do leitor de tela: o histórico (região polida) é o registro acessível de tudo o que aconteceu. Só usam
// opacidade e deslocamento; a inversão da tela inteira é do `Stage` (spec §10.4). Com movimento reduzido, a cena é texto
// parado que aparece e some (esmaecimento), sem escala nem deslocamento.
import type { Names } from '@coringa/sim/text';
import * as m from 'motion/react-m';
import { bannerText, sceneText } from '../../model/effects.ts';
import type { Beat } from '../../model/timeline.ts';

/** Sobe, fica e desce uma vez, dentro da duração da batida. */
function fade(durationMs: number) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: [0, 1, 1, 0] },
    transition: { duration: durationMs / 1000, times: [0, 0.15, 0.8, 1], ease: 'linear' as const },
  };
}

export interface BeatOverlayProps {
  beat: Beat | null;
  names: Names;
  reduced: boolean;
}

/** A sobreposição da batida de agora: cena, faixa, ou nada. */
export function BeatOverlay({ beat, names, reduced }: BeatOverlayProps) {
  if (beat === null) return null;
  if (beat.kind === 'scene' && beat.scene !== null) return <Scene beat={beat} names={names} reduced={reduced} />;
  if (beat.kind === 'banner' || beat.event.type === 'DeckReshuffled') {
    const text = bannerText(beat.event, names);
    if (text !== null) return <Banner text={text} durationMs={beat.durationMs} reduced={reduced} />;
  }
  return null;
}

function Shield() {
  return (
    <svg viewBox="0 0 24 26" aria-hidden="true" className="mx-auto mb-2 size-12 text-ouro pc:size-16">
      <path
        d="M12 1 L22 4.5 V13 C22 19 17.5 23.5 12 25 C6.5 23.5 2 19 2 13 V4.5 Z"
        fill="currentColor"
        stroke="var(--color-papel)"
        strokeWidth="1.5"
        strokeLinejoin="miter"
      />
    </svg>
  );
}

function Scene({ beat, names, reduced }: { beat: Beat; names: Names; reduced: boolean }) {
  const { title, detail } = sceneText(beat, names);
  const reflect = beat.scene === 'REFLECT_PLAYED' || beat.scene === 'REFLECT_TRIGGERED';
  return (
    <m.div
      aria-hidden="true"
      data-cena={beat.scene}
      data-reduzido={reduced ? 'true' : undefined}
      {...fade(beat.durationMs)}
      className="pointer-events-none absolute inset-0 z-50 grid place-items-center bg-tinta/60 px-4"
    >
      <m.div
        animate={reduced ? undefined : { scale: [0.88, 1, 1, 1.04] }}
        transition={{ duration: beat.durationMs / 1000, times: [0, 0.15, 0.8, 1], ease: 'linear' }}
        className="border-[5px] border-papel bg-tinta px-6 py-4 text-center text-papel"
      >
        {reflect ? <Shield /> : null}
        <p className="textura font-madeira text-4xl uppercase leading-none pc:text-6xl">{title}</p>
        {detail ? <p className="mt-2 text-base font-bold pc:text-xl">{detail}</p> : null}
      </m.div>
    </m.div>
  );
}

function Banner({ text, durationMs, reduced }: { text: string; durationMs: number; reduced: boolean }) {
  return (
    <m.div
      aria-hidden="true"
      data-faixa
      {...fade(durationMs)}
      className="pointer-events-none absolute inset-x-0 top-1/2 z-40 -translate-y-1/2 border-y-4 border-ouro bg-tinta px-3 py-2 text-center"
    >
      <m.p
        animate={reduced ? undefined : { x: ['-5%', '0%', '0%', '5%'] }}
        transition={{ duration: durationMs / 1000, times: [0, 0.2, 0.8, 1], ease: 'linear' }}
        className="font-madeira text-2xl uppercase leading-tight text-ouro pc:text-3xl"
      >
        {text}
      </m.p>
    </m.div>
  );
}
