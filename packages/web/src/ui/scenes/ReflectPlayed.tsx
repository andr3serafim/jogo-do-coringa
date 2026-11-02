// O Reflect jogado (sub-projeto 6 §7.5), a partir do protótipo aprovado: as cópias do K, do J e do Q voam às pontas (`cardsAt`), e o espelho
// grande se forma com faíscas e um lampejo (`mirrorAt`). Sem inversão nem nome: os dois são da batida do cometa, no ataque que bater nele.
//
// Entre as duas cenas há uma decisão de verdade (quem foi refletido pode responder), e um espelho de 300 px cobriria a mesa. Por isso ele
// encolhe até a zona "Reflect ativo" (`shrinkAt`), onde o espelho pequeno da `PlayerField` fica até o ataque. Como no protótipo, sem tarjas:
// a cortina escurece a mesa, e o espelho fica entre os campos. Com movimento reduzido: as peças aparecem no lugar e somem, sem voo nem
// tremor nem partícula.
import { useEffect, useRef, useState } from 'react';
import { SCENE_MOMENTS } from '../../model/scene-moments.ts';
import type { SceneProps } from '../anim/scenes-loader.ts';
import { useMeasuredBox } from './measured-box.ts';
import { MIRROR_CARD_CLASS, MIRROR_CARDS, MirrorArt, mirrorCardSize } from './MirrorArt.tsx';
import { mirrorLayout, mirrorTips, otherPlayer, reflectFrom } from './mirror.ts';
import { rng, shakeFrames, sparks } from '../anim/particles.ts';

const M = SCENE_MOMENTS.REFLECT_PLAYED;
const CARD_FLIGHT_MS = 220;
const FORM_MS = 300;
const SHAKE_MS = 180;
const SPARKS_PER_TIP = 8;
/** O lampejo atravessa o vidro depois de ele se formar. */
const FLASH_DELAY_MS = 160;
const FLASH_MS = 460;

export function ReflectPlayed(props: SceneProps) {
  const { anchor, measured } = useMeasuredBox(props.box);
  return (
    <div ref={anchor} className="absolute inset-0">
      {measured ? <MirrorForming {...props} box={measured} /> : null}
    </div>
  );
}

function MirrorForming({ beat, me, reduced, box }: SceneProps) {
  const owner = beat.event.type === 'ReflectPlayed' ? beat.event.player : me;
  const { origin, target } = reflectFrom(box, owner, otherPlayer(owner), me);
  const { center, size } = mirrorLayout(origin, target, box.band);
  const tips = mirrorTips(center, size);
  const card = mirrorCardSize(size);
  // As cartas saem da sua mão, ou do retrato do oponente, que não mostra a dele.
  const from = owner === me ? { x: center.x, y: box.band.y + box.band.h + 40 } : box.portrait.oponente;
  const [launched, setLaunched] = useState(0);
  const [formed, setFormed] = useState(false);
  const [shrinking, setShrinking] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const cards = useRef<HTMLDivElement>(null);
  const flash = useRef<SVGRectElement>(null);
  const particles = useRef<HTMLDivElement>(null);
  const flights = useRef<Array<HTMLDivElement | null>>([]);

  // Os instantes da cena.
  useEffect(() => {
    const at = (ms: number, action: () => void) => window.setTimeout(action, ms);
    const ids = [
      ...M.cardsAt.map((ms, i) => at(ms, () => setLaunched(i + 1))),
      at(M.mirrorAt, () => setFormed(true)),
      at(M.shrinkAt, () => setShrinking(true)),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  // O voo de cada carta até a sua ponta.
  useEffect(() => {
    if (reduced || launched === 0) return;
    const i = launched - 1;
    const tip = tips[i]!;
    const motion = flights.current[i]?.animate?.(
      [{ transform: `translate(${from.x - tip.x}px, ${from.y - tip.y}px) rotate(${(i - 1) * 180}deg) scale(0.7)` }, { transform: 'none' }],
      { duration: CARD_FLIGHT_MS, easing: 'cubic-bezier(.3,.9,.3,1.2)', fill: 'backwards' },
    );
    return () => motion?.cancel();
    // A caixa só muda se a janela mudar de tamanho: a carta em voo não recomeça por isso.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [launched, reduced]);

  // O espelho se forma: gira e assenta, solta faíscas nas pontas, o lampejo cruza o vidro e os campos sentem o tinido.
  useEffect(() => {
    if (!formed) return;
    const form = mirror.current?.animate?.(
      reduced
        ? [{ opacity: 0 }, { opacity: 1 }]
        : [{ opacity: 0, transform: 'scale(0.15) rotate(-120deg)' }, { opacity: 1, transform: 'scale(1.1) rotate(0deg)', offset: 0.7 }, { opacity: 1, transform: 'none' }],
      { duration: FORM_MS, fill: 'backwards' },
    );
    if (reduced) return () => form?.cancel();
    const timers: number[] = [];
    const parent = particles.current;
    if (parent) {
      const random = rng(517);
      tips.forEach((tip) => sparks(timers, parent, tip, SPARKS_PER_TIP, size * 0.3, random));
    }
    const shine = flash.current?.animate?.([{ transform: 'translateX(-120px)' }, { transform: 'translateX(120px)' }], { duration: FLASH_MS, delay: FLASH_DELAY_MS });
    const shake = root.current?.closest('[data-palco]')?.querySelector('[data-campos]')?.animate?.(shakeFrames(6, 0), { duration: SHAKE_MS, easing: 'linear' });
    return () => {
      form?.cancel();
      shine?.cancel();
      shake?.cancel();
      timers.forEach((id) => window.clearTimeout(id));
      parent?.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formed, reduced]);

  // Ele encolhe até a zona do dono, com as cartas. Sem a zona medida, ou com movimento reduzido, só some.
  useEffect(() => {
    if (!shrinking) return;
    const zone = box.reflectZone(owner);
    const duration = M.doneAt - M.shrinkAt;
    const away =
      reduced || zone === null
        ? [{ opacity: 1 }, { opacity: 0 }]
        : [
            { transform: 'none', opacity: 1 },
            {
              transform: `translate(${zone.x + zone.w / 2 - center.x}px, ${zone.y + zone.h / 2 - center.y}px) scale(${Math.max(0.1, zone.h / size)})`,
              opacity: 1,
              offset: 0.92,
            },
            { transform: `translate(${zone.x + zone.w / 2 - center.x}px, ${zone.y + zone.h / 2 - center.y}px) scale(${Math.max(0.1, zone.h / size)})`, opacity: 0 },
          ];
    const motions = [mirror.current, cards.current].map((node) => node?.animate?.(away, { duration, easing: 'cubic-bezier(.5,0,.7,.4)', fill: 'forwards' }));
    return () => motions.forEach((motion) => motion?.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shrinking, reduced]);

  return (
    <div ref={root} className="absolute inset-0">
      {formed ? (
        <div
          ref={mirror}
          data-espelho=""
          data-encolhendo={shrinking ? '' : undefined}
          className="absolute"
          style={{ left: `${center.x - size / 2}px`, top: `${center.y - size / 2}px`, width: `${size}px`, height: `${size}px` }}
        >
          <MirrorArt>{reduced ? null : <rect ref={flash} x="-25" y="-110" width="34" height="220" fill="#fff" opacity="0.95" transform="translate(-120 0)" />}</MirrorArt>
        </div>
      ) : null}
      <div ref={cards} className="absolute inset-0" style={{ transformOrigin: `${center.x}px ${center.y}px` }}>
        {MIRROR_CARDS.map((letter, i) =>
          launched > i ? (
            <div
              key={letter}
              ref={(node) => {
                flights.current[i] = node;
              }}
              data-carta-cena={letter}
              data-voo={reduced ? undefined : ''}
              className={MIRROR_CARD_CLASS}
              style={{ left: `${tips[i]!.x - card.w / 2}px`, top: `${tips[i]!.y - card.h / 2}px`, width: `${card.w}px`, height: `${card.h}px` }}
            >
              {letter}
            </div>
          ) : null,
        )}
      </div>
      <div ref={particles} className="absolute inset-0" />
    </div>
  );
}
