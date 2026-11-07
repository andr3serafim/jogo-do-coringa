// O golpe final (bloco B dos pontos do playtest, ponto 15; spec `2026-11-03-playtest-design.md` §4), a partir do protótipo aprovado (quadro `p15`,
// variante A):
// 1. as tarjas de cinema descem abaixo do placar, e a fileira de Ataque de quem bate acende carta a carta (até `litUntil`);
// 2. o corte sai do meio da fileira e atravessa a mesa até o retrato do outro (`cutAt`);
// 3. no impacto (`hitAt`), faíscas de ouro no retrato e o número do golpe; a inversão, o tremor, a vida que zera e o retrato que racha são do
//    palco (o `hit` da batida, a linha do tempo e o `defeatShown`);
// 4. o carimbo cai (`titleAt`): GOLPE FINAL! para quem bate, DERROTA para quem leva; quando assenta (`thudAt`), os campos afundam e respinga
//    tinta.
//
// Na mesa, sem cortina: a fileira que acende precisa aparecer. Desvios do protótipo, por regra (§11 da direção visual): o brilho do corte e o halo
// das cartas são desenhados (uma faixa translúcida e um gradiente), sem `drop-shadow` nem `box-shadow` animado. Com movimento reduzido: a fileira
// acende de uma vez, o corte e o carimbo aparecem e somem nos mesmos instantes, sem voo, tremor nem partícula.
import { useEffect, useRef, useState } from 'react';
import { finalBlowTitle } from '../../model/copy.ts';
import { FINAL_BLOW_MS, SCENE_MOMENTS, TITLE_MS } from '../../model/scene-moments.ts';
import { rng, sparks, spawn } from '../anim/particles.ts';
import { revealRow, type ScenePoint, type SceneRect } from '../anim/scene-box.ts';
import type { SceneProps } from '../anim/scenes-loader.ts';
import { HitNumber } from './AbsoluteAttack.tsx';
import { useMeasuredBox } from './measured-box.ts';
import { CinemaBars, STAMP_SIZE, Stamp } from './SceneFrame.tsx';

const T = SCENE_MOMENTS.FINAL_BLOW;
/** Cada carta acende em tanto, e o corte atravessa em tanto, acelerando. */
const LIGHT_MS = 120;
const CUT_MS = 150;
/** O corte some depois do impacto. */
const CUT_FADE_AT = T.hitAt + 200;
const CUT_FADE_MS = 400;
const SPARKS = 14;
const SPARK_REACH = 70;
const INK = 12;
const INK_REACH = 150;
const SINK_MS = 160;
const SINK_PX = 5;

const STAMP_WIN = `${STAMP_SIZE} -rotate-[4deg] bg-vermelho text-papel [text-shadow:3px_3px_0_var(--color-tinta)]`;
const STAMP_LOSS = `${STAMP_SIZE} -rotate-[4deg] bg-tinta text-papel [text-shadow:3px_3px_0_var(--color-vermelho)]`;

export function FinalBlow(props: SceneProps) {
  const { event } = props.beat;
  const attacker = props.blow?.attacker ?? (event.type === 'DamageDealt' ? event.attacker : props.me);
  // No celular os campos rolam por dentro: a fileira de quem bate à vista antes da medida.
  const { anchor, measured } = useMeasuredBox(props.box, (palco) => revealRow(palco, attacker, 'ATK'));
  return (
    <div ref={anchor} data-golpe-final="" className="absolute inset-0">
      {measured ? <Blow {...props} box={measured} /> : null}
    </div>
  );
}

function Blow({ beat, me, reduced, box, hitLanded, blow = null }: SceneProps) {
  const { event } = beat;
  const attacker = blow?.attacker ?? (event.type === 'DamageDealt' ? event.attacker : me);
  const target = blow?.target ?? (attacker === me ? 'oponente' : 'voce');
  // As contas ficam fixas para a cena inteira: a janela que muda de tamanho não recomeça o corte.
  const [layout] = useState(() => {
    const row = box.row(attacker, 'ATK');
    const slots = (row?.slots ?? []).slice(0, blow?.cards ?? row?.slots.length ?? 0);
    const from = middleOf(slots, row?.rect ?? null, box.band);
    const to = box.portrait[target];
    return {
      slots,
      from,
      to,
      length: Math.round(Math.hypot(to.x - from.x, to.y - from.y)),
      angle: ((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI).toFixed(2),
      thick: box.band.w < 600 ? 22 : 34,
    };
  });
  const { slots, from, to, length, angle, thick } = layout;
  const [lit, setLit] = useState(reduced ? slots.length : 0);
  const [cutting, setCutting] = useState(false);
  const [titled, setTitled] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const cut = useRef<HTMLDivElement>(null);
  const particles = useRef<HTMLDivElement>(null);

  // Os instantes da cena.
  useEffect(() => {
    const at = (ms: number, action: () => void) => window.setTimeout(action, ms);
    const lights = reduced ? [] : slots.map((_, i) => at((i * T.litUntil) / slots.length, () => setLit(i + 1)));
    const ids = [
      ...lights,
      at(T.cutAt, () => setCutting(true)),
      at(T.titleAt, () => setTitled(true)),
      at(T.titleAt + TITLE_MS, () => setTitled(false)),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // O corte cresce da fileira até o retrato e some depois do impacto (com movimento reduzido, só aparece e some).
  useEffect(() => {
    if (!cutting) return;
    const base = `rotate(${angle}deg)`;
    const motions = [
      reduced
        ? undefined
        : cut.current?.animate?.([{ transform: `${base} scaleX(0)` }, { transform: `${base} scaleX(1)` }], {
            duration: CUT_MS,
            easing: 'cubic-bezier(.7,0,.9,.5)',
            fill: 'backwards',
          }),
      cut.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: CUT_FADE_MS, delay: CUT_FADE_AT - T.cutAt, fill: 'forwards' }),
    ];
    return () => motions.forEach((motion) => motion?.cancel());
  }, [cutting, angle, reduced]);

  // As faíscas no retrato atingido e os respingos de tinta do carimbo; os campos afundam quando ele assenta.
  useEffect(() => {
    if (reduced) return;
    const random = rng(1_509);
    const timers: number[] = [];
    const parent = particles.current;
    const stampAt: ScenePoint = { x: box.band.x + box.band.w / 2, y: box.band.y + box.band.h * 0.4 + 30 };
    timers.push(
      window.setTimeout(() => parent && sparks(timers, parent, to, SPARKS, SPARK_REACH, random), T.hitAt),
      window.setTimeout(() => {
        if (parent) ink(timers, parent, stampAt, random);
        root.current
          ?.closest('[data-palco]')
          ?.querySelector('[data-campos]')
          ?.animate?.([{ transform: 'none' }, { transform: `translateY(${SINK_PX}px)` }, { transform: 'none' }], { duration: SINK_MS, easing: 'ease-out' });
      }, T.thudAt),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const damage = hitLanded && beat.hit && beat.hit.event.type === 'DamageDealt' ? beat.hit.event.damage : 0;
  return (
    <div ref={root} className="absolute inset-0">
      <div className="absolute" style={{ left: `${box.band.x}px`, top: `${box.band.y}px`, width: `${box.band.w}px`, height: `${box.band.h}px` }}>
        <CinemaBars endMs={FINAL_BLOW_MS} reduced={reduced} />
      </div>
      {slots.slice(0, lit).map((slot, i) => (
        <Halo key={`${slot.x}-${i}`} slot={slot} reduced={reduced} />
      ))}
      {cutting ? (
        <div
          ref={cut}
          data-corte=""
          data-alvo={target}
          className="absolute"
          style={{ left: `${from.x}px`, top: `${from.y - thick / 2}px`, width: `${length}px`, height: `${thick}px`, transformOrigin: '0 50%', transform: `rotate(${angle}deg)` }}
        >
          <div className="absolute -inset-y-3 inset-x-0 bg-[linear-gradient(180deg,transparent,rgba(245,194,56,.35)_35%,rgba(245,194,56,.35)_65%,transparent)]" />
          <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_0_8%,var(--color-tinta)_8%_18%,var(--color-vermelho)_18%_30%,var(--color-ouro)_30%_42%,#fffdf3_42%_58%,var(--color-ouro)_58%_70%,var(--color-vermelho)_70%_82%,var(--color-tinta)_82%_92%,transparent_92%)] [clip-path:polygon(0_50%,4%_0,100%_35%,100%_65%,4%_100%)]" />
        </div>
      ) : null}
      <div ref={particles} className="absolute inset-0" />
      {damage > 0 ? <HitNumber amount={damage} at={to} below={box.hudBottom} left={to.x < box.band.x + box.band.w / 2} reduced={reduced} /> : null}
      {titled ? (
        <Stamp
          kind="FINAL_BLOW"
          reduced={reduced}
          top={box.band.y + box.band.h * 0.4}
          text={finalBlowTitle(attacker, me)}
          className={attacker === me ? STAMP_WIN : STAMP_LOSS}
        />
      ) : null}
    </div>
  );
}

/** O meio das cartas que acendem (ou da fileira, ou da faixa, sem elas). */
function middleOf(slots: readonly SceneRect[], row: SceneRect | null, band: SceneRect): ScenePoint {
  const first = slots[0];
  const last = slots.at(-1);
  if (first && last) return { x: (first.x + last.x + last.w) / 2, y: first.y + first.h / 2 };
  const area = row ?? band;
  return { x: area.x + area.w / 2, y: area.y + area.h / 2 };
}

/** O halo de ouro sobre uma carta da fileira de quem bate: acende em `LIGHT_MS` (com movimento reduzido, já aceso). */
function Halo({ slot, reduced }: { slot: SceneRect; reduced: boolean }) {
  const glow = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (reduced) return;
    const motion = glow.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: LIGHT_MS, easing: 'ease-out', fill: 'both' });
    return () => motion?.cancel();
  }, [reduced]);
  return (
    <div data-acesa="" className="absolute" style={{ left: `${slot.x}px`, top: `${slot.y}px`, width: `${slot.w}px`, height: `${slot.h}px` }}>
      <div
        ref={glow}
        className="absolute -inset-2 rounded-[8px] border-[3px] border-ouro bg-[radial-gradient(closest-side,rgba(255,243,196,.55),rgba(245,194,56,.35)_70%,rgba(245,194,56,0))]"
        style={{ opacity: reduced ? 0.85 : 0 }}
      />
    </div>
  );
}

/** Respingos de tinta em volta do carimbo que assenta. */
function ink(timers: number[], parent: Element, at: ScenePoint, random: () => number): void {
  for (let i = 0; i < INK; i++) {
    const node = document.createElement('div');
    const angle = (i / INK) * Math.PI * 2 + random();
    const far = INK_REACH * (0.5 + random() * 0.5);
    node.className = 'absolute size-[9px] rounded-full bg-tinta';
    node.style.left = `${at.x}px`;
    node.style.top = `${at.y}px`;
    spawn(
      timers,
      parent,
      node,
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${(Math.cos(angle) * far).toFixed(1)}px, ${(Math.sin(angle) * far * 0.6).toFixed(1)}px) scale(0.3)`, opacity: 0 },
      ],
      420 + random() * 160,
    );
  }
}
