// O ataque que bate no Reflect (sub-projeto 6 §7.5), a partir do protótipo aprovado:
// 1. o espelho volta a crescer, com o K, o J e o Q nas pontas; o retrato de quem atacou brilha, e a esfera junta energia na fileira dele;
// 2. o cometa parte (`launchAt`), e perto do espelho o tempo quase para (`slowAt` a `slowUntil`);
// 3. ele bate (`mirrorHitAt`): a inversão (linha do tempo), a superfície ondula, sobem faíscas e uma onda de choque, e os campos tremem;
// 4. ele volta dourado e maior até o retrato de quem atacou (`returnHitAt`): o número, a vida que desce, os cacos, as três cartas que caem e
//    o nome carimbado. Sem dano de volta (sob Defesa Absoluta, ou o ataque que não passa da conta), ele se desfaz no espelho, sem voltar, e o
//    espelho quebra mesmo assim: as cartas do Reflect foram para o cemitério.
//
// Como no protótipo, sem tarjas: a cortina escurece a mesa, e tudo acontece entre os campos. Desvios do protótipo, por regra (§11): sem
// `drop-shadow` nem `blur`, o cometa anda por `transform`, a ondulação é escala de anel, e as brasas saem de uma agenda de sementes fixas.
// Com movimento reduzido: o espelho e as cartas no lugar, o cometa aparece parado no vidro e depois no retrato, sem partícula nem tremor.
import { useEffect, useMemo, useRef, useState } from 'react';
import { SCENE_MOMENTS, TITLE_MS } from '../../model/scene-moments.ts';
import type { ScenePoint } from '../anim/scene-box.ts';
import type { SceneProps } from '../anim/scenes-loader.ts';
import { HitNumber } from './AbsoluteAttack.tsx';
import { useMeasuredBox } from './measured-box.ts';
import { MIRROR_CARD_CLASS, MIRROR_CARDS, MirrorArt, mirrorCardSize } from './MirrorArt.tsx';
import { cometStops, mirrorLayout, mirrorTips, reflectFrom } from './mirror.ts';
import { rng, shakeFrames, sparks, spawn } from '../anim/particles.ts';
import { STAMP_SIZE, Stamp } from './SceneFrame.tsx';

const M = SCENE_MOMENTS.REFLECT_TRIGGERED;
const THREADS = 12;
const THREAD_LIFE_MS = 480;
const SHARDS = 18;
const SHAKE_MS = 420;
const WAVE_MS = 650;
const RIPPLE_MS = 700;
const RIPPLE_STAGGER_MS = 110;
/** Uma brasa a cada tanto, nas duas viagens do cometa. */
const EMBER_EVERY_MS = 70;
const GOLD_EMBER_EVERY_MS = 40;
const RED_EMBERS = ['#e2513f', '#ffd0c4', '#b8261c'];
const GOLD_EMBERS = ['var(--color-ouro)', '#fff3c4', '#ffe48a'];

const lerp = (a: ScenePoint, b: ScenePoint, t: number): ScenePoint => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const place = (at: ScenePoint, angle: number, scale: number, k: number) => `translate(${at.x.toFixed(1)}px, ${at.y.toFixed(1)}px) rotate(${angle.toFixed(1)}deg) scale(${(scale * k).toFixed(3)})`;
const angleOf = (from: ScenePoint, to: ScenePoint) => (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;

/** Onde o cometa está, `ms` depois do começo da cena, na ida: a mesma conta das animações, em linha reta por trecho. */
function cometAt(ms: number, start: ScenePoint, stops: { p1: ScenePoint; p2: ScenePoint; hit: ScenePoint }): ScenePoint {
  if (ms <= M.slowAt) return lerp(start, stops.p1, Math.max(0, ms - M.launchAt) / (M.slowAt - M.launchAt));
  if (ms <= M.slowUntil) return lerp(stops.p1, stops.p2, (ms - M.slowAt) / (M.slowUntil - M.slowAt));
  return lerp(stops.p2, stops.hit, Math.min(1, (ms - M.slowUntil) / (M.mirrorHitAt - M.slowUntil)));
}

/** O cometa: duas caudas, a cabeça e dois anéis, que giram. Tudo é gradiente parado, e só o `transform` do conjunto anima. */
function Comet({ gold, reduced }: { gold: boolean; reduced: boolean }) {
  const spin = reduced ? '' : 'animate-[spin_320ms_linear_infinite]';
  const spinBack = reduced ? '' : 'animate-[spin_500ms_linear_infinite_reverse]';
  const ring = gold ? '#fff3c4' : 'rgba(255,208,196,.95)';
  return (
    <>
      <div
        className="absolute right-0 top-[-9px] h-[18px] w-[340px] [clip-path:polygon(0_50%,100%_4%,100%_96%)]"
        style={{ background: `linear-gradient(90deg, transparent, ${gold ? 'rgba(255,228,138,.7)' : 'rgba(255,208,196,.7)'} 70%, #fff)` }}
      />
      <div
        className={`absolute right-0 [clip-path:polygon(0_50%,100%_4%,100%_96%)] ${gold ? 'top-[-33px] h-[66px] w-[320px]' : 'top-[-26px] h-[52px] w-[250px]'}`}
        style={{
          background: gold
            ? 'linear-gradient(90deg, transparent, rgba(245,194,56,.35) 40%, rgba(255,228,138,.92) 80%, #fff)'
            : 'linear-gradient(90deg, transparent, rgba(184,38,28,.35) 40%, rgba(226,81,63,.88) 80%, #fff)',
        }}
      />
      <div
        className={`absolute rounded-full ${gold ? 'left-[-40px] top-[-40px] size-20' : 'left-[-32px] top-[-32px] size-16'}`}
        style={{
          background: gold
            ? 'radial-gradient(circle, #fff 0 24%, #fff3c4 34%, #f5c238 54%, rgba(245,194,56,0) 74%)'
            : 'radial-gradient(circle, #fff 0 22%, #ffd0c4 32%, #e2513f 52%, rgba(184,38,28,0) 72%)',
        }}
      />
      <div className={`absolute left-[-42px] top-[-42px] size-[84px] rounded-full border-[3px] ${spin}`} style={{ borderColor: `${ring} transparent` }} />
      <div className={`absolute left-[-54px] top-[-54px] size-[108px] rounded-full border-2 ${spinBack}`} style={{ borderColor: `${ring} transparent` }} />
    </>
  );
}

export function ReflectTriggered(props: SceneProps) {
  const { anchor, measured } = useMeasuredBox(props.box);
  return (
    <div ref={anchor} className="absolute inset-0">
      {measured ? <CometStrike {...props} box={measured} /> : null}
    </div>
  );
}

function CometStrike({ beat, me, reduced, hitLanded, box }: SceneProps) {
  const { event } = beat;
  const owner = event.type === 'ReflectTriggered' ? event.owner : me;
  const attacker = event.type === 'ReflectTriggered' ? event.attacker : me;
  const returns = event.type === 'ReflectTriggered' && event.damage > 0;
  // As contas ficam fixas para a cena inteira: a janela que muda de tamanho não recomeça o voo.
  const [layout] = useState(() => {
    const { origin, target, back } = reflectFrom(box, owner, attacker, me);
    const { center, size, start } = mirrorLayout(origin, target, box.band);
    return { center, size, start, back, stops: cometStops(start, center, size), tips: mirrorTips(center, size), k: size / 300 };
  });
  const { center, size, start, back, stops, tips, k } = layout;
  const card = mirrorCardSize(size);
  const [charging, setCharging] = useState(true);
  const [flying, setFlying] = useState(false);
  const [struck, setStruck] = useState(false);
  const [shattered, setShattered] = useState(false);
  const [gone, setGone] = useState(false);
  const [titled, setTitled] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const mirror = useRef<HTMLDivElement>(null);
  const glowRing = useRef<HTMLDivElement>(null);
  const charge = useRef<HTMLDivElement>(null);
  const comet = useRef<HTMLDivElement>(null);
  const cards = useRef<Array<HTMLDivElement | null>>([]);
  const ripples = useRef<Array<SVGCircleElement | null>>([]);
  const particles = useRef<HTMLDivElement>(null);
  const goAngle = useMemo(() => angleOf(start, center), [start, center]);
  const backAngle = useMemo(() => angleOf(stops.hit, back), [stops, back]);

  // Os instantes da cena.
  useEffect(() => {
    const at = (ms: number, action: () => void) => window.setTimeout(action, ms);
    const ids = [
      at(M.launchAt, () => {
        setCharging(false);
        setFlying(true);
      }),
      at(M.mirrorHitAt, () => setStruck(true)),
      at(M.returnHitAt, () => setShattered(true)),
      at(M.returnHitAt + 140, () => setGone(true)),
      at(M.titleAt, () => setTitled(true)),
      at(M.titleAt + TITLE_MS, () => setTitled(false)),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  // A preparação: o espelho volta a crescer, o retrato brilha, a esfera cresce, e os fios convergem para ela.
  useEffect(() => {
    const motions = [
      mirror.current?.animate?.(reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(0.6)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'ease-out', fill: 'backwards' }),
      glowRing.current?.animate?.([{ opacity: 0 }, { opacity: 0.9, offset: 0.4 }, { opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'both' }),
      reduced ? undefined : charge.current?.animate?.([{ transform: 'scale(0)' }, { transform: 'scale(0.9)', offset: 0.85 }, { transform: 'scale(0.75)' }], { duration: 520, easing: 'ease-in', fill: 'forwards' }),
    ];
    if (reduced) return () => motions.forEach((motion) => motion?.cancel());
    const timers: number[] = [];
    const parent = particles.current;
    const random = rng(431);
    for (let i = 0; i < THREADS; i++) {
      const angle = (i / THREADS) * Math.PI * 2;
      const length = (70 + random() * 60) * k;
      const deg = (angle * 180) / Math.PI + 180;
      timers.push(
        window.setTimeout(() => {
          if (!parent) return;
          const thread = document.createElement('div');
          thread.className = 'absolute h-[3px] origin-[0_50%] rounded-[2px] bg-[linear-gradient(90deg,transparent,#ff8a75)]';
          thread.style.width = `${length}px`;
          thread.style.left = `${start.x + Math.cos(angle) * 130 * k}px`;
          thread.style.top = `${start.y + Math.sin(angle) * 130 * k}px`;
          spawn(
            timers,
            parent,
            thread,
            [
              { transform: `rotate(${deg}deg) translateX(0)`, opacity: 0 },
              { opacity: 1, offset: 0.3 },
              { transform: `rotate(${deg}deg) translateX(${120 * k}px) scaleX(0.2)`, opacity: 0 },
            ],
            THREAD_LIFE_MS,
            'ease-in',
          );
        }, i * 18),
      );
    }
    return () => {
      motions.forEach((motion) => motion?.cancel());
      timers.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduced]);

  // A ida do cometa, com o tempo que quase para; as brasas saem da mesma conta.
  useEffect(() => {
    if (!flying || reduced) return;
    const total = M.mirrorHitAt - M.launchAt;
    const motion = comet.current?.animate?.(
      [
        { transform: place(start, goAngle, 0.6, k), opacity: 0, easing: 'ease-in' },
        { transform: place(stops.p1, goAngle, 1.1, k), opacity: 1, offset: (M.slowAt - M.launchAt) / total, easing: 'linear' },
        { transform: place(stops.p2, goAngle, 1.2, k), opacity: 1, offset: (M.slowUntil - M.launchAt) / total, easing: 'ease-in' },
        { transform: place(stops.hit, goAngle, 1.35, k), opacity: 1 },
      ],
      { duration: total, fill: 'forwards' },
    );
    const timers: number[] = [];
    const parent = particles.current;
    const random = rng(733);
    for (let ms = M.launchAt; ms < M.mirrorHitAt; ms += EMBER_EVERY_MS) {
      const point = cometAt(ms, start, stops);
      timers.push(window.setTimeout(() => parent && ember(timers, parent, point, RED_EMBERS, random, k), ms - M.launchAt));
    }
    return () => {
      motion?.cancel();
      timers.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flying, reduced]);

  // A batida no espelho: a onda, as faíscas, a ondulação e o tremor, e o cometa volta (ou se desfaz).
  useEffect(() => {
    if (!struck || reduced) return;
    const timers: number[] = [];
    const parent = particles.current;
    const random = rng(859);
    if (parent) {
      sparks(timers, parent, stops.hit, 12, size * 0.5, random);
      const wave = document.createElement('div');
      wave.className = 'absolute size-10 rounded-full border-[6px] border-ouro';
      wave.style.left = `${stops.hit.x - 20}px`;
      wave.style.top = `${stops.hit.y - 20}px`;
      spawn(timers, parent, wave, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: `scale(${13 * k})` }], WAVE_MS, 'cubic-bezier(.1,.8,.3,1)');
    }
    const motions = [
      root.current?.closest('[data-palco]')?.querySelector('[data-campos]')?.animate?.(shakeFrames(13, 0), { duration: SHAKE_MS, easing: 'linear' }),
      ...ripples.current.map((ring, i) =>
        ring?.animate?.([{ transform: 'scale(0)', opacity: 1 }, { transform: 'scale(1)', opacity: 0 }], { duration: RIPPLE_MS, delay: i * RIPPLE_STAGGER_MS, easing: 'ease-out' }),
      ),
      returns
        ? comet.current?.animate?.([{ transform: place(stops.hit, backAngle, 1.3, k) }, { transform: place(back, backAngle, 1.7, k) }], {
            duration: M.returnHitAt - M.mirrorHitAt,
            easing: 'cubic-bezier(.3,0,.9,.7)',
            fill: 'forwards',
          })
        : comet.current?.animate?.([{ transform: place(stops.hit, goAngle, 1.35, k), opacity: 1 }, { transform: place(stops.hit, goAngle, 1.9, k), opacity: 0 }], { duration: 220, easing: 'ease-out', fill: 'forwards' }),
    ];
    if (returns) {
      for (let ms = 0; ms < M.returnHitAt - M.mirrorHitAt; ms += GOLD_EMBER_EVERY_MS) {
        const point = lerp(stops.hit, back, ms / (M.returnHitAt - M.mirrorHitAt));
        timers.push(window.setTimeout(() => parent && ember(timers, parent, point, GOLD_EMBERS, random, k), ms));
      }
    }
    return () => {
      motions.forEach((motion) => motion?.cancel());
      timers.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [struck, reduced]);

  // Os cacos, e as três cartas que caem.
  useEffect(() => {
    if (!shattered || reduced) return;
    const timers: number[] = [];
    const parent = particles.current;
    const random = rng(977);
    if (parent) {
      for (let i = 0; i < SHARDS; i++) {
        const shard = document.createElement('div');
        const side = (18 + random() * 40) * k;
        const angle = random() * Math.PI * 2;
        const far = (60 + random() * 140) * k;
        shard.className = 'absolute border-2 border-tinta bg-[linear-gradient(135deg,#fff,#cfd6d4)] [clip-path:polygon(50%_0,100%_100%,0_80%)]';
        shard.style.width = shard.style.height = `${side}px`;
        shard.style.left = `${center.x - side / 2 + (random() - 0.5) * 120 * k}px`;
        shard.style.top = `${center.y - side / 2 + (random() - 0.5) * 120 * k}px`;
        const turn = (random() - 0.5) * 300;
        spawn(
          timers,
          parent,
          shard,
          [
            { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
            { transform: `translate(${(Math.cos(angle) * far).toFixed(1)}px, ${(Math.sin(angle) * far - 40 * k).toFixed(1)}px) rotate(${turn.toFixed(0)}deg)`, opacity: 1, offset: 0.35 },
            { transform: `translate(${(Math.cos(angle) * far * 1.2).toFixed(1)}px, ${(Math.sin(angle) * far + 200 * k).toFixed(1)}px) rotate(${(turn * 1.7).toFixed(0)}deg)`, opacity: 0 },
          ],
          1_000 + random() * 300,
          'cubic-bezier(.2,.6,.6,1)',
        );
      }
    }
    const falls = cards.current.map((node, i) =>
      node?.animate?.(
        [{ transform: 'none', opacity: 1 }, { transform: `translate(${(i - 1) * 60 * k}px, ${160 * k}px) rotate(${(i - 1) * 90}deg)`, opacity: 0 }],
        { duration: 700, easing: 'ease-in', fill: 'forwards' },
      ),
    );
    return () => {
      falls.forEach((motion) => motion?.cancel());
      timers.forEach((id) => window.clearTimeout(id));
      parent?.replaceChildren();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shattered, reduced]);

  // Parado, com movimento reduzido: o cometa fica no vidro, e na volta fica no retrato.
  const restAt = reduced ? (struck && returns ? back : stops.hit) : null;
  const glowSize = 110 * Math.max(k, 0.7);

  return (
    <div ref={root} className="absolute inset-0">
      <div
        ref={glowRing}
        data-brilho=""
        className="absolute rounded-full opacity-0"
        style={{
          left: `${back.x - glowSize / 2}px`,
          top: `${back.y - glowSize / 2}px`,
          width: `${glowSize}px`,
          height: `${glowSize}px`,
          background: 'radial-gradient(circle, rgba(184,38,28,.85), rgba(184,38,28,0) 70%)',
        }}
      />
      {shattered ? null : (
        <div
          ref={mirror}
          data-espelho=""
          className="absolute"
          style={{ left: `${center.x - size / 2}px`, top: `${center.y - size / 2}px`, width: `${size}px`, height: `${size}px` }}
        >
          <MirrorArt>
            {[0, 1, 2].map((i) => (
              <circle
                key={i}
                ref={(node) => {
                  ripples.current[i] = node;
                }}
                cx="0"
                cy="-6"
                r="120"
                fill="none"
                stroke={i === 1 ? 'var(--color-ouro)' : '#fff'}
                strokeWidth={5 - i}
                opacity="0"
                style={{ transformBox: 'fill-box', transformOrigin: 'center' }}
              />
            ))}
          </MirrorArt>
        </div>
      )}
      {MIRROR_CARDS.map((letter, i) => (
        <div
          key={letter}
          ref={(node) => {
            cards.current[i] = node;
          }}
          data-carta-cena={letter}
          className={MIRROR_CARD_CLASS}
          style={{ left: `${tips[i]!.x - card.w / 2}px`, top: `${tips[i]!.y - card.h / 2}px`, width: `${card.w}px`, height: `${card.h}px` }}
        >
          {letter}
        </div>
      ))}
      {charging ? (
        <div
          ref={charge}
          data-carga=""
          className="absolute rounded-full"
          style={{
            left: `${start.x - 60 * k}px`,
            top: `${start.y - 60 * k}px`,
            width: `${120 * k}px`,
            height: `${120 * k}px`,
            transform: reduced ? 'scale(0.75)' : 'scale(0)',
            background: 'radial-gradient(circle, #fff 0 16%, #ffd0c4 28%, #e2513f 48%, rgba(184,38,28,0) 70%)',
          }}
        />
      ) : null}
      {flying && !gone ? (
        <div
          ref={comet}
          data-cometa=""
          data-volta={struck && returns ? '' : undefined}
          data-desfeito={struck && !returns ? '' : undefined}
          className="absolute left-0 top-0 size-0"
          style={restAt ? { transform: place(restAt, goAngle, 1.2, k) } : { opacity: 0 }}
        >
          <Comet gold={struck && returns} reduced={reduced} />
        </div>
      ) : null}
      <div ref={particles} data-cacos={shattered && !reduced ? '' : undefined} className="absolute inset-0" />
      {hitLanded && beat.hit && beat.hit.event.damage > 0 ? (
        <HitNumber amount={beat.hit.event.damage} at={back} below={box.hudBottom} left={back.x < box.band.x + box.band.w / 2} reduced={reduced} />
      ) : null}
      {titled ? (
        <Stamp
          kind="REFLECT_TRIGGERED"
          reduced={reduced}
          top={box.band.y + box.band.h / 2 - 40}
          className={`${STAMP_SIZE} rotate-3 bg-papel text-tinta outline-4 -outline-offset-[11px] outline-tinta`}
        />
      ) : null}
    </div>
  );
}

/** Uma brasa do rastro do cometa, num ponto da viagem dele. */
function ember(timers: number[], parent: Element, at: ScenePoint, colors: readonly string[], random: () => number, k: number): void {
  const node = document.createElement('div');
  const side = (3 + random() * 6) * Math.max(k, 0.7);
  node.className = 'absolute rounded-full';
  node.style.width = node.style.height = `${side}px`;
  node.style.background = colors[Math.floor(random() * colors.length)]!;
  node.style.left = `${at.x + (random() - 0.5) * 26}px`;
  node.style.top = `${at.y + (random() - 0.5) * 26}px`;
  spawn(
    timers,
    parent,
    node,
    [{ transform: 'scale(1)', opacity: 1 }, { transform: `translate(${((random() - 0.5) * 40).toFixed(1)}px, ${((random() - 0.5) * 40).toFixed(1)}px) scale(0.2)`, opacity: 0 }],
    420 + random() * 300,
  );
}
