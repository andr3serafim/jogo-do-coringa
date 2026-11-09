// A cena do Ataque Absoluto (sub-projeto 6 §7.1), desenhada a partir do protótipo aprovado:
// 1. o Coringa de quem ataca entra na faixa, envolto na aura de energia que ferve; pedras saem do chão e flutuam, riscos de
//    energia sobem, e os 4 J giram em volta dele;
// 2. os J entram no Coringa (`transformAt`): os olhos acendem em ouro, a aura explode de tamanho, sai uma onda de choque, o chão
//    racha em ouro, as pedras são arremessadas e raios pequenos estalam em volta até o fim;
// 3. o nome carimba (a moldura, `SceneFrame`);
// 4. a bola de energia se forma na frente do Coringa, e o feixe atravessa a tela até o retrato do alvo no placar, vibrando.
//    No impacto (`hitAt`), a inversão (linha do tempo), os respingos e o tremor forte (o palco e o placar), e o número
//    carimbado, que é desta cena: a mesa é um contexto de empilhamento próprio, e o número do placar ficaria embaixo dela.
//
// Desvios do protótipo, por regra: os raios em volta da aura seguem `boltTimes` (até 3 por segundo, entrando e saindo em 100 ms),
// e o clarão de 700 px dá lugar a um brilho de ouro de até 45% e 40% da largura da faixa (spec 6 §1: nada acima de 25% da tela
// acende fora da inversão). As partículas (pedras, riscos e raios) são elementos soltos animados pelo navegador (Web Animations,
// só `transform` e `opacity`), fora do React, e cada uma sai sozinha no fim da vida dela. Com movimento reduzido: a aura parada,
// as cartas paradas em volta do Coringa até sumirem, nenhuma partícula, e o feixe aparece e some.
import { useEffect, useRef, useState } from 'react';
import { SCENE_MOMENTS } from '../../model/scene-moments.ts';
import type { ScenePoint, SceneBox } from '../anim/scene-box.ts';
import type { SceneProps } from '../anim/scenes-loader.ts';
import { Coringa } from '../cards/Coringa.tsx';
import { AURA_BOIL_MS, auraVariants, BOLT_FADE_MS, BOLT_HOLD_MS, boltTimes } from '../anim/aura.ts';
import { SceneFrame, stageFit } from './SceneFrame.tsx';

const M = SCENE_MOMENTS.ABSOLUTE_ATTACK;
/** O feixe sai da bola um pouco antes do impacto e segura o golpe depois dele (~0,95 s no total, como no protótipo). */
export const BEAM_LEAD_MS = 140;
export const BEAM_HOLD_MS = 810;
/** A bola some depois do impacto. */
const BALL_OUT_MS = 670;
/** O chão da faixa e a altura do Coringa, no quadro de 1000 × 360. */
const GROUND = 336;
const HERO_Y = 228;
const HERO_SIZE = 132;

/** Onde a cena acontece: o Coringa (no quadro), a bola e o alvo (em px do palco), e a escala do quadro. */
export function attackLayout(box: SceneBox, mine: boolean) {
  const narrow = box.band.w < 600;
  const cx = narrow ? 500 : mine ? 300 : 700;
  const target = mine ? box.portrait.oponente : box.portrait.voce;
  const fit = stageFit(box.band.w, box.band.h);
  const toPx = (x: number, y: number): ScenePoint => ({
    x: box.band.x + fit.x + x * fit.scale,
    y: box.band.y + fit.y + y * fit.scale,
  });
  const center = toPx(cx, HERO_Y);
  const dir = target.x >= center.x ? 1 : -1;
  return { cx, cy: HERO_Y, dir, scale: fit.scale, ball: toPx(cx + dir * 110, HERO_Y - 10), target };
}

/** As fendas de ouro do chão na transformação: duas de cada lado, sempre as mesmas (pontos fixos, sem sorteio). */
function cracks(cx: number): string[] {
  const lines: string[] = [];
  for (const dir of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      let x = cx + dir * 20;
      let y = GROUND + 4;
      let d = `M${x} ${y}`;
      for (let i = 0; i < 6; i++) {
        x += dir * (24 + ((i * 17 + k * 11) % 26));
        y += (((i * 7 + k * 5) % 12) - 5.4) + k * 2;
        d += ` L${x.toFixed(0)} ${y.toFixed(0)}`;
      }
      lines.push(d);
    }
  }
  return lines;
}

const SVG_NS = 'http://www.w3.org/2000/svg';
const AURA_FILL = ['var(--color-ouro)', 'color-mix(in oklab, var(--color-ouro), var(--color-papel) 45%)', 'var(--color-papel)'];

/**
 * Solta uma partícula no `parent`: ela anima pelo navegador e sai sozinha no fim de `lifeMs`. O timer da saída vai para `timers`,
 * que a cena cancela quando desmonta.
 */
function spawn(timers: number[], parent: Element, node: Element, keyframes: Keyframe[], lifeMs: number, easing = 'ease-out') {
  node.setAttribute('data-particula', '');
  parent.appendChild(node);
  (node as HTMLElement).animate?.(keyframes, { duration: lifeMs, easing, fill: 'forwards' });
  timers.push(window.setTimeout(() => node.remove(), lifeMs));
}

export function AbsoluteAttack({ beat, me, reduced, box, hitLanded }: SceneProps) {
  const mine = beat.event.type === 'AbsoluteAttack' && beat.event.player === me;
  const layout = attackLayout(box, mine);
  const { cx } = layout;
  const [transformed, setTransformed] = useState(false);
  const [ball, setBall] = useState(false);
  const [beam, setBeam] = useState(false);
  const aura = useRef<SVGSVGElement>(null);
  const layers = useRef<Array<SVGPathElement | null>>([]);
  const particles = useRef<HTMLDivElement>(null);
  const bolts = useRef<SVGSVGElement>(null);
  const orbit = useRef<HTMLDivElement>(null);
  const variants = auraVariants();

  // Os instantes da cena.
  useEffect(() => {
    const at = (ms: number, action: () => void) => window.setTimeout(action, ms);
    const ids = [
      at(M.transformAt, () => setTransformed(true)),
      at(M.ballAt, () => setBall(true)),
      // O Reflect intercepta o golpe: o feixe não dispara no retrato do alvo, porque nada o acerta (§7.5). O cometa é a cena seguinte.
      ...(beat.intercepted ? [] : [at(M.hitAt - BEAM_LEAD_MS, () => setBeam(true)), at(M.hitAt + BEAM_HOLD_MS, () => setBeam(false))]),
      at(M.hitAt + BALL_OUT_MS, () => setBall(false)),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, [beat.intercepted]);

  // A aura ferve (troca de forma, por atributo, fora do React) e cresce; parada com movimento reduzido.
  useEffect(() => {
    if (reduced) return;
    let frame = 0;
    const id = window.setInterval(() => {
      frame += 1;
      layers.current.forEach((path, i) => path?.setAttribute('d', variants[i]![frame % 4]!));
    }, AURA_BOIL_MS);
    const grow = aura.current?.animate?.(
      [
        { transform: 'scale(0.45)', opacity: 0 },
        { transform: 'scale(0.72)', opacity: 0.9, offset: (M.transformAt - M.barsIn) / M.bandOut },
        { transform: 'scale(1.16)', opacity: 1, offset: (M.transformAt + 190 - M.barsIn) / M.bandOut },
        { transform: 'scale(1)', opacity: 1 },
      ],
      { duration: M.bandOut, delay: M.barsIn, fill: 'both' },
    );
    return () => {
      window.clearInterval(id);
      grow?.cancel();
    };
  }, [reduced, variants]);

  // Os 4 J giram em volta do Coringa e entram nele na transformação.
  useEffect(() => {
    if (reduced) return;
    const cards = [...(orbit.current?.querySelectorAll<HTMLElement>('[data-carta-cena]') ?? [])];
    const motions = cards.map((card, i) => {
      const a0 = i * 90;
      const spin = (deg: number, radius: number, scale: number) =>
        `rotate(${a0 + deg}deg) translateY(-${radius}px) rotate(${-a0 - deg}deg) scale(${scale})`;
      return card.animate?.(
        [
          { transform: spin(0, 300, 0.6), opacity: 0 },
          { transform: spin(160, 130, 1), opacity: 1, offset: 0.35 },
          { transform: spin(470, 100, 1), opacity: 1, offset: 0.82 },
          { transform: spin(560, 0, 0.15), opacity: 0 },
        ],
        { duration: M.transformAt - M.barsIn, delay: M.barsIn, easing: 'cubic-bezier(.45,0,.7,1)', fill: 'both' },
      );
    });
    return () => motions.forEach((motion) => motion?.cancel());
  }, [reduced]);

  // As partículas: as pedras que flutuam e voam, os riscos que sobem e os raios em volta da aura.
  useEffect(() => {
    const parent = particles.current;
    const svg = bolts.current;
    if (reduced || parent === null || svg === null) return;
    const ids: number[] = [];
    const at = (ms: number, action: () => void) => ids.push(window.setTimeout(action, ms));
    const every = (gap: number, from: number, to: number, action: (i: number) => void) => {
      for (let t = from, i = 0; t < to; t += gap, i++) {
        const n = i;
        at(t, () => action(n));
      }
    };
    // Pedras: 12, que sobem do chão na preparação e são arremessadas na transformação.
    at(M.barsIn, () => {
      for (let i = 0; i < 12; i++) {
        const side = i % 2 ? 1 : -1;
        const rock = document.createElement('div');
        const size = 6 + ((i * 7) % 12);
        rock.className = 'absolute border-2 border-tinta bg-tinta';
        Object.assign(rock.style, {
          left: `${cx + side * (60 + ((i * 37) % 170))}px`,
          top: `${GROUND - 4}px`,
          width: `${size}px`,
          height: `${size * 0.8}px`,
          clipPath: 'polygon(10% 20%, 60% 0, 100% 40%, 80% 100%, 20% 90%, 0 50%)',
        });
        const rise = 40 + ((i * 29) % 90);
        const fly = side * (160 + ((i * 53) % 200));
        const life = M.transformAt - M.barsIn + 650;
        const lift = (M.transformAt - M.barsIn) / life;
        spawn(ids, parent, rock, [
          { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
          { transform: `translate(0, -${rise}px) rotate(${side * 40}deg)`, opacity: 1, offset: lift },
          { transform: `translate(${fly}px, -${rise + 120 + ((i * 31) % 160)}px) rotate(${side * 400}deg)`, opacity: 0 },
        ], life);
      }
    });
    // Riscos de energia: fracos na preparação, fortes depois da transformação.
    const streak = (strong: boolean) => (i: number) => {
      const node = document.createElement('div');
      const height = 30 + ((i * 23) % (strong ? 90 : 50));
      node.className = 'absolute w-[3px] rounded-sm';
      Object.assign(node.style, {
        left: `${cx + (((i * 41) % 100) / 100 - 0.5) * (strong ? 300 : 210)}px`,
        top: `${GROUND - ((i * 37) % 120)}px`,
        height: `${height}px`,
        background: i % 2 ? 'var(--color-ouro)' : 'var(--color-papel)',
      });
      const life = 380 + ((i * 13) % 200);
      spawn(ids, parent, node, [
        { transform: 'translateY(0) scaleY(0.4)', opacity: 0 },
        { transform: `translateY(-${80 + ((i * 19) % 60)}px) scaleY(1)`, opacity: 0.95, offset: 0.3 },
        { transform: `translateY(-${220 + ((i * 29) % 120)}px) scaleY(1.3)`, opacity: 0 },
      ], life, 'ease-in');
    };
    every(60, M.barsIn, M.transformAt, streak(false));
    every(45, M.transformAt, M.bandOut, streak(true));
    // Raios em volta da aura: até 3 por segundo, entrando e saindo em 100 ms.
    for (const [n, t] of boltTimes(M.transformAt, M.bandOut).entries()) {
      at(t, () => {
        const angle = -Math.PI / 2 + (((n * 37) % 100) / 100 - 0.5) * 2.4;
        let x = cx + Math.cos(angle) * (70 + ((n * 17) % 40));
        let y = HERO_Y + Math.sin(angle) * (70 + ((n * 17) % 40)) * 1.1;
        let points = `${x.toFixed(0)},${y.toFixed(0)}`;
        for (let i = 0; i < 5; i++) {
          x += Math.cos(angle) * 16 + (((n * 7 + i * 13) % 26) - 13);
          y += Math.sin(angle) * 16 + (((n * 11 + i * 5) % 26) - 13);
          points += ` ${x.toFixed(0)},${y.toFixed(0)}`;
        }
        const g = document.createElementNS(SVG_NS, 'g');
        for (const [stroke, width, opacity] of [['var(--color-ouro)', '7', '.6'], ['var(--color-papel)', '3', '1']] as const) {
          const line = document.createElementNS(SVG_NS, 'polyline');
          for (const [name, value] of Object.entries({ points, fill: 'none', stroke, 'stroke-width': width, 'stroke-linejoin': 'round', opacity })) {
            line.setAttribute(name, value);
          }
          g.appendChild(line);
        }
        const life = BOLT_FADE_MS * 2 + BOLT_HOLD_MS;
        const fade = BOLT_FADE_MS / life;
        spawn(ids, svg, g, [{ opacity: 0 }, { opacity: 1, offset: fade }, { opacity: 1, offset: 1 - fade }, { opacity: 0 }], life, 'linear');
      });
    }
    return () => {
      ids.forEach((id) => window.clearTimeout(id));
      parent.replaceChildren();
      svg.replaceChildren();
    };
  }, [reduced, cx]);

  const lit = transformed;
  return (
    <>
      <SceneFrame kind="ABSOLUTE_ATTACK" box={box} reduced={reduced}>
        {/* O brilho de ouro em volta do Coringa: no máximo 45% e 400 unidades de diâmetro (40% da faixa). */}
        <div
          data-brilho
          className="absolute size-[400px] rounded-full transition-opacity duration-500"
          style={{
            left: `${cx - 200}px`,
            top: `${HERO_Y - 200}px`,
            background: 'radial-gradient(circle, var(--color-ouro), transparent 70%)',
            opacity: lit ? 0.45 : 0.25,
          }}
        />
        <svg ref={aura} data-aura viewBox="-300 -300 600 600" className="absolute size-[600px]" style={{ left: `${cx - 300}px`, top: `${HERO_Y - 300}px` }}>
          {AURA_FILL.map((fill, i) => (
            <path
              key={fill}
              ref={(path) => {
                layers.current[i] = path;
              }}
              d={variants[i]![0]}
              fill={fill}
              stroke={i === 0 ? 'var(--color-tinta)' : undefined}
              strokeWidth={i === 0 ? 3 : undefined}
              strokeLinejoin="round"
            />
          ))}
        </svg>
        <div ref={particles} data-particulas className="absolute inset-0" />
        <div
          data-heroi
          data-lado={mine ? 'voce' : 'oponente'}
          className="absolute"
          style={{ left: `${cx - HERO_SIZE / 2}px`, top: `${HERO_Y - HERO_SIZE / 2}px`, width: `${HERO_SIZE}px`, height: `${HERO_SIZE}px` }}
        >
          <Coringa className="size-full" />
          <svg viewBox="0 0 64 64" data-olhos data-aceso={lit ? '' : undefined} className={`absolute inset-0 size-full ${lit ? 'opacity-100' : 'opacity-0'}`}>
            <path d="M26 37.5l3-2M35 35.5l3 2" stroke="var(--color-ouro)" strokeWidth="3.2" strokeLinecap="round" fill="none" />
          </svg>
        </div>
        {lit ? null : (
          <div ref={orbit} className="absolute" style={{ left: `${cx}px`, top: `${HERO_Y}px` }}>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                data-carta-cena="J"
                className={`absolute -left-[19px] -top-[27px] grid h-[54px] w-[38px] place-items-center rounded-[2px] border-[2.5px] border-tinta bg-papel font-madeira text-xl ${i % 2 ? 'text-vermelho' : 'text-tinta'}`}
                style={reduced ? { transform: `rotate(${i * 90}deg) translateY(-110px) rotate(${-i * 90}deg)` } : undefined}
              >
                J
              </div>
            ))}
          </div>
        )}
        <svg viewBox="0 0 1000 360" className="absolute inset-0 size-full overflow-visible">
          {lit && !reduced ? (
            <>
              {cracks(cx).map((d) => (
                <path key={d} d={d} fill="none" stroke="var(--color-ouro)" strokeWidth="3.5" data-fenda />
              ))}
              <circle data-onda cx={cx} cy={HERO_Y} r="20" fill="none" stroke="var(--color-ouro)" strokeWidth="10" className="origin-center animate-[onda-cena_700ms_cubic-bezier(.1,.8,.3,1)_forwards] [transform-box:fill-box]" />
            </>
          ) : null}
          <g ref={bolts} />
        </svg>
        {ball ? (
          <div
            data-bola
            className={`absolute size-[130px] rounded-full ${reduced ? '' : 'animate-[bola-cena_300ms_ease-in_forwards]'}`}
            style={{
              left: `${cx + layout.dir * 110 - 65}px`,
              top: `${HERO_Y - 10 - 65}px`,
              background: 'radial-gradient(circle, var(--color-papel) 30%, var(--color-ouro) 55%, var(--color-vermelho) 80%, transparent 82%)',
            }}
          />
        ) : null}
      </SceneFrame>
      {beam ? <Beam from={layout.ball} to={layout.target} scale={layout.scale} reduced={reduced} /> : null}
      {hitLanded && beat.hit && beat.hit.event.damage > 0 ? (
        <HitNumber amount={beat.hit.event.damage} at={layout.target} below={box.hudBottom} left={layout.target.x < box.band.x + box.band.w / 2} reduced={reduced} />
      ) : null}
    </>
  );
}

/**
 * O número do golpe, carimbado logo abaixo do placar, do lado do retrato do alvo: entra grande e girado, assenta e sobe (o mesmo
 * carimbo do golpe comum, maior). Com movimento reduzido, só esmaece. Números de jogo na fonte de texto, com `tabular-nums`.
 */
export function HitNumber({ amount, at, below, left, reduced }: { amount: number; at: ScenePoint; below: number; left: boolean; reduced: boolean }) {
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const motion = ref.current?.animate?.(
      reduced
        ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
        : [
            { opacity: 0, transform: 'scale(2.4) rotate(-8deg)' },
            { opacity: 1, transform: 'scale(0.92) rotate(-3deg)', offset: 0.14 },
            { opacity: 1, transform: 'scale(1) rotate(-3deg)', offset: 0.22 },
            { opacity: 1, transform: 'translateY(-16px) rotate(-3deg)', offset: 0.82 },
            { opacity: 0, transform: 'translateY(-26px) rotate(-3deg)' },
          ],
      { duration: 1_500, easing: 'ease-out', fill: 'both' },
    );
    return () => motion?.cancel();
  }, [reduced]);
  return (
    <span
      ref={ref}
      data-dano=""
      className={`pointer-events-none absolute z-20 border-[3px] border-tinta bg-vermelho px-2 font-texto text-3xl font-extrabold leading-tight tabular-nums text-papel shadow-[4px_4px_0_var(--color-tinta)] pc:text-5xl ${left ? 'origin-top-left' : 'origin-top-right'}`}
      style={left ? { left: `${Math.max(8, at.x - 24)}px`, top: `${below + 8}px` } : { right: `calc(100% - ${at.x + 24}px)`, top: `${below + 8}px` }}
    >
      −{amount}
    </span>
  );
}

/** O feixe grosso (176 unidades no protótipo): miolo de papel, ouro, vermelho e tinta nas bordas, vibrando enquanto segura. */
function Beam({ from, to, scale, reduced }: { from: ScenePoint; to: ScenePoint; scale: number; reduced: boolean }) {
  const bar = useRef<HTMLDivElement>(null);
  const angle = (Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI;
  const length = Math.hypot(to.x - from.x, to.y - from.y) + 40 * scale;
  const thick = Math.max(24, 176 * scale);
  useEffect(() => {
    if (reduced) return;
    const motion = bar.current?.animate?.(
      [
        { transform: 'scaleX(0) scaleY(0.6)' },
        { transform: 'scaleX(1) scaleY(1.1)', offset: 0.14 },
        { transform: 'scaleX(1) scaleY(0.94)', offset: 0.3 },
        { transform: 'scaleX(1) scaleY(1.06)', offset: 0.46 },
        { transform: 'scaleX(1) scaleY(0.96)', offset: 0.62 },
        { transform: 'scaleX(1) scaleY(1.04)', offset: 0.78 },
        { transform: 'scaleX(1) scaleY(0)', opacity: 0 },
      ],
      { duration: BEAM_LEAD_MS + BEAM_HOLD_MS, easing: 'linear', fill: 'forwards' },
    );
    return () => motion?.cancel();
  }, [reduced]);
  return (
    <div
      data-feixe
      className="pointer-events-none absolute z-10 origin-left"
      style={{ left: `${from.x}px`, top: `${from.y}px`, width: `${length}px`, transform: `rotate(${angle}deg)` }}
    >
      <div
        ref={bar}
        className="origin-left rounded-r-full"
        style={{
          height: `${thick}px`,
          marginTop: `${-thick / 2}px`,
          background:
            'linear-gradient(180deg, var(--color-tinta) 0 8%, var(--color-vermelho) 8% 20%, var(--color-ouro) 20% 36%, var(--color-papel) 36% 64%, var(--color-ouro) 64% 80%, var(--color-vermelho) 80% 92%, var(--color-tinta) 92%)',
        }}
      />
    </div>
  );
}
