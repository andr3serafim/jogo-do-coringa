// Reflect contra Reflect (sub-projeto 6 §7.5): dois espelhos, um diante de cada campo, trincam (`crackAt`) e somem (`fadeAt`), sem cometa, nome
// nem inversão. A fita diz o motivo. Acontece na mesa, à vista, sem cortina. Com movimento reduzido: eles aparecem, trincam e somem,
// sem partícula.
import { useEffect, useRef, useState } from 'react';
import { SCENE_MOMENTS } from '../../model/scene-moments.ts';
import type { SceneProps } from '../anim/scenes-loader.ts';
import { crackBranch } from './chasm.ts';
import { useMeasuredBox } from './measured-box.ts';
import { MirrorArt } from './MirrorArt.tsx';
import { mirrorLayout, otherPlayer, reflectFrom } from './mirror.ts';
import { rng, sparks } from '../anim/particles.ts';

const M = SCENE_MOMENTS.REFLECT_CANCELED;
const APPEAR_MS = 200;
const FADE_MS = 400;
const SPARKS_PER_MIRROR = 6;
/** As trincas do vidro, no quadro do espelho, a partir de um ponto de cada lado. */
const CRACKS = [
  { seed: 601, x: -6, y: -4, dir: -1.2, len: 60 },
  { seed: 602, x: -6, y: -4, dir: 2.4, len: 48 },
  { seed: 603, x: -6, y: -4, dir: 0.4, len: 60 },
  { seed: 604, x: -6, y: -4, dir: 1.5, len: 36 },
] as const;
const CRACK_PATHS = CRACKS.map(({ seed, x, y, dir, len }) => crackBranch(seed, x, y, dir, len));

/** O espelho menor que o do lançamento: há dois na mesa. */
const SIZE_FACTOR = 0.7;

export function ReflectCanceled(props: SceneProps) {
  const { anchor, measured } = useMeasuredBox(props.box);
  return (
    <div ref={anchor} className="absolute inset-0">
      {measured ? <MirrorsCracking {...props} box={measured} /> : null}
    </div>
  );
}

function MirrorsCracking({ beat, me, reduced, box }: SceneProps) {
  const owner = beat.event.type === 'ReflectCanceled' ? beat.event.owner : me;
  const [cracked, setCracked] = useState(false);
  const [fading, setFading] = useState(false);
  const mirrors = useRef<Array<HTMLDivElement | null>>([]);
  const particles = useRef<HTMLDivElement>(null);
  const places = [owner, otherPlayer(owner)].map((player) => {
    const { target } = reflectFrom(box, player, otherPlayer(player), me);
    const { center, size } = mirrorLayout(target, target, box.band);
    return { player, center, size: size * SIZE_FACTOR };
  });

  useEffect(() => {
    const ids = [window.setTimeout(() => setCracked(true), M.crackAt), window.setTimeout(() => setFading(true), M.fadeAt)];
    const appear = mirrors.current.map((node) =>
      node?.animate?.(reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(0.8)' }, { opacity: 1, transform: 'none' }], { duration: APPEAR_MS, fill: 'backwards' }),
    );
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      appear.forEach((motion) => motion?.cancel());
    };
  }, [reduced]);

  useEffect(() => {
    if (!cracked || reduced) return;
    const timers: number[] = [];
    const parent = particles.current;
    if (parent) {
      const random = rng(617);
      places.forEach(({ center, size }) => sparks(timers, parent, center, SPARKS_PER_MIRROR, size * 0.5, random));
    }
    return () => {
      timers.forEach((id) => window.clearTimeout(id));
      parent?.replaceChildren();
    };
    // A caixa só muda se a janela mudar de tamanho: as faíscas não recomeçam por isso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cracked, reduced]);

  useEffect(() => {
    if (!fading) return;
    const motions = mirrors.current.map((node) =>
      node?.animate?.(reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'scale(1.04)' }], { duration: FADE_MS, easing: 'ease-out', fill: 'forwards' }),
    );
    return () => motions.forEach((motion) => motion?.cancel());
  }, [fading, reduced]);

  return (
    <div className="absolute inset-0">
      {places.map(({ player, center, size }, i) => (
        <div
          key={player}
          ref={(node) => {
            mirrors.current[i] = node;
          }}
          data-espelho=""
          data-somindo={fading ? '' : undefined}
          className="absolute"
          style={{ left: `${center.x - size / 2}px`, top: `${center.y - size / 2}px`, width: `${size}px`, height: `${size}px` }}
        >
          <MirrorArt>
            {cracked ? (
              <g data-trinca="" fill="none" stroke="var(--color-tinta)" strokeWidth="2.5" strokeLinejoin="round">
                {CRACK_PATHS.map((d) => (
                  <path key={d} d={d} />
                ))}
              </g>
            ) : null}
          </MirrorArt>
        </div>
      ))}
      <div ref={particles} className="absolute inset-0" />
    </div>
  );
}
