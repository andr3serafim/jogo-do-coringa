// A Ressurreição (sub-projeto 6 §7.6), a partir do protótipo aprovado:
// 1. as cópias das cartas da quadra acendem, sobem um pouco e soltam fios de luz até o alto (`threadsAt`);
// 2. o céu se abre sobre o cemitério: o portal, os raios que giram devagar e as plumas que descem (`portalAt`);
// 3. a coluna de luz desce até o cemitério, com estrelinhas (`columnAt`);
// 4. a carta sobe ainda sem cor, com a auréola (`riseAt`); no alto, a cor volta, com o anel de luz, e o nome carimba (`colorAt`);
// 5. ela voa até a vaga dela (`flightAt`) e pousa com um brilho (`landAt`), e a carta de verdade reaparece embaixo.
//
// Sem inversão. Como no protótipo, sem tarjas: a cortina escurece a mesa. O `state` põe a carta de verdade na fileira no mesmo commit em que a cena
// começa: ela fica escondida até a cópia pousar, ou até a cena ser pulada. Desvios do protótipo, por regra (§11): a cor volta pela troca de opacidade
// entre a cópia cinza e a colorida, sem `filter` animado, e o brilho das cartas é um halo desenhado, sem `box-shadow` animado. Com movimento reduzido: as
// peças aparecem no lugar nos mesmos instantes, sem voo, tremor nem partícula.
import type { NumCard } from '@coringa/engine';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { SCENE_MOMENTS, TITLE_MS } from '../../model/scene-moments.ts';
import { revealRow, type ScenePoint, type SceneRect, type SceneRow } from '../anim/scene-box.ts';
import type { SceneProps } from '../anim/scenes-loader.ts';
import { Card } from '../cards/Card.tsx';
import { rng } from './aura.ts';
import { useMeasuredBox } from './measured-box.ts';
import { shakeFrames, spawn } from './particles.ts';
import { STAMP_SIZE, Stamp } from './SceneFrame.tsx';
import { skyLayout } from './sky.ts';

const M = SCENE_MOMENTS.RESURRECTED;
const THREADS = 4;
const THREAD_MS = 260;
const STAGGER_MS = 90;
const COPY_GLOW_MS = 2_600;
const PORTAL_MS = 500;
const RAYS_MS = 3_600;
const COLUMN_MS = 360;
const RISE_MS = 900;
const COLOR_MS = 420;
const AUREOLE_DELAY_MS = 500;
const SETTLE_MS = 420;
const SHAKE_MS = 160;
const FADE_MS = 500;
const RING_MS = 760;
/** Uma pluma a cada tanto, até o fim do intervalo; o mesmo para as estrelas da coluna. */
const PLUME_EVERY_MS = 140;
const PLUMES_UNTIL_MS = M.portalAt + 2_600;
const STAR_EVERY_MS = 90;
const STARS_UNTIL_MS = M.columnAt + 2_200;
const BURST_STARS = 14;
/** O tamanho da carta sem a vaga medida. */
const FALLBACK_CARD = { w: 46, h: 64 };

const centerOf = ({ x, y, w, h }: SceneRect): ScenePoint => ({ x: x + w / 2, y: y + h / 2 });
/** A cópia da carta: outro id, para não se confundir com a de verdade, que esta cena esconde pelo id. */
const copyOf = (card: NumCard): NumCard => ({ ...card, id: `cena-${card.id}` });

/** De onde saem os fios sem quadra na mesa: quatro vagas espalhadas pela fileira de destino (§7.6: "do lugar onde ela estava"). */
function rowBases(row: SceneRow | null, fallback: ScenePoint): ScenePoint[] {
  const slots = row?.slots ?? [];
  if (slots.length === 0) return Array.from({ length: THREADS }, (_, i) => ({ x: fallback.x + (i - 1.5) * 30, y: fallback.y }));
  return Array.from({ length: THREADS }, (_, i) => {
    const slot = slots[Math.round((i * (slots.length - 1)) / (THREADS - 1))]!;
    return { x: slot.x + slot.w / 2, y: slot.y };
  });
}

export function Resurrection(props: SceneProps) {
  const { event } = props.beat;
  const { anchor, measured } = useMeasuredBox(props.box, (palco) => {
    if (event.type !== 'Resurrected') return;
    // No celular os campos rolam por dentro: a fileira da quadra à vista, e por último a de destino, que é onde a carta pousa.
    if (props.rising?.quad) revealRow(palco, event.player, props.rising.quad.row);
    revealRow(palco, event.player, event.row);
  });
  return (
    <div ref={anchor} className="absolute inset-0">
      {measured ? <Rising {...props} box={measured} /> : null}
    </div>
  );
}

function Rising({ beat, me, reduced, box, rising = null }: SceneProps) {
  const { event } = beat;
  const player = event.type === 'Resurrected' ? event.player : me;
  const targetRow = event.type === 'Resurrected' ? event.row : 'ATK';
  const revived = event.type === 'Resurrected' ? event.card : null;
  // As contas ficam fixas para a cena inteira: a janela que muda de tamanho não recomeça o voo.
  const [layout] = useState(() => {
    const sky = skyLayout(box.graveyard(), box.band);
    const row = box.row(player, targetRow);
    const quad = rising?.quad ?? null;
    const quadRow = quad ? box.row(player, quad.row) : null;
    const copies = quad ? quad.indices.flatMap((index, i) => (quadRow?.slots[index] ? [{ card: copyOf(quad.cards[i]!), at: quadRow.slots[index]! }] : [])) : [];
    const bases = copies.length > 0 ? copies.map(({ at }) => ({ x: at.x + at.w / 2, y: at.y })) : rowBases(row, sky.ground);
    const threads = bases.map((base) => {
      const length = Math.round(Math.hypot(sky.portal.x - base.x, sky.portal.y - base.y));
      return { base, length, angle: (Math.atan2(sky.portal.x - base.x, base.y - sky.portal.y) * 180) / Math.PI };
    });
    const slot = rising && rising.landIndex >= 0 ? (row?.slots[rising.landIndex] ?? null) : null;
    return { ...sky, copies, threads, slot, card: slot ? { w: slot.w, h: slot.h } : FALLBACK_CARD };
  });
  const { k, portal, ground, top, copies, threads, slot, card } = layout;
  const [threaded, setThreaded] = useState(false);
  const [opened, setOpened] = useState(false);
  const [columned, setColumned] = useState(false);
  const [risen, setRisen] = useState(false);
  const [aureole, setAureole] = useState(false);
  const [colored, setColored] = useState(false);
  const [titled, setTitled] = useState(false);
  const [flying, setFlying] = useState(false);
  const [landed, setLanded] = useState(false);
  const [fading, setFading] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const sky = useRef<HTMLDivElement>(null);
  const copyNodes = useRef<Array<HTMLDivElement | null>>([]);
  const halos = useRef<Array<HTMLDivElement | null>>([]);
  const threadNodes = useRef<Array<HTMLDivElement | null>>([]);
  const portalNode = useRef<HTMLDivElement>(null);
  const raysNode = useRef<HTMLDivElement>(null);
  const columnNode = useRef<HTMLDivElement>(null);
  const ghost = useRef<HTMLDivElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const colorLayer = useRef<HTMLDivElement>(null);
  const flash = useRef<HTMLDivElement>(null);
  const halo = useRef<HTMLDivElement>(null);
  const aureoleNode = useRef<HTMLDivElement>(null);
  const particles = useRef<HTMLDivElement>(null);

  // A carta de verdade fica escondida até a cópia pousar; a cena que desmonta (o pulo) a devolve.
  useLayoutEffect(() => {
    if (landed || revived === null) return;
    const real = root.current?.closest('[data-palco]')?.querySelector<HTMLElement>(`[data-card-id="${revived.id}"]`);
    if (!real) return;
    real.style.visibility = 'hidden';
    return () => {
      real.style.visibility = '';
    };
  }, [landed, revived]);

  // Os instantes da cena.
  useEffect(() => {
    const at = (ms: number, action: () => void) => window.setTimeout(action, ms);
    const ids = [
      at(M.threadsAt, () => setThreaded(true)),
      at(M.portalAt, () => setOpened(true)),
      at(M.columnAt, () => setColumned(true)),
      at(M.riseAt, () => setRisen(true)),
      at(M.riseAt + AUREOLE_DELAY_MS, () => setAureole(true)),
      at(M.colorAt, () => setColored(true)),
      at(M.titleAt, () => setTitled(true)),
      at(M.titleAt + TITLE_MS, () => setTitled(false)),
      at(M.flightAt, () => {
        setFlying(true);
        setAureole(false);
      }),
      at(M.landAt, () => setLanded(true)),
      at(M.fadeAt, () => setFading(true)),
    ];
    return () => ids.forEach((id) => window.clearTimeout(id));
  }, []);

  // As cartas da quadra acendem e sobem um pouco, cada uma depois da outra.
  useEffect(() => {
    if (reduced) return;
    const motions = copyNodes.current.flatMap((node, i) => [
      node?.animate?.(
        [
          { transform: 'translateY(0) scale(1)' },
          { transform: 'translateY(-8px) scale(1.12)', offset: 0.3 },
          { transform: 'translateY(-4px) scale(1.06)', offset: 0.8 },
          { transform: 'translateY(0) scale(1)' },
        ],
        { duration: COPY_GLOW_MS, delay: i * STAGGER_MS, easing: 'ease-out' },
      ),
      halos.current[i]?.animate?.([{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0.8, offset: 0.8 }, { opacity: 0.5 }], {
        duration: COPY_GLOW_MS,
        delay: i * STAGGER_MS,
        easing: 'ease-out',
        fill: 'both',
      }),
    ]);
    return () => motions.forEach((motion) => motion?.cancel());
  }, [reduced]);

  // Os fios sobem.
  useEffect(() => {
    if (!threaded || reduced) return;
    const motions = threadNodes.current.map((node, i) =>
      node?.animate?.([{ transform: `rotate(${threads[i]!.angle}deg) scaleY(0)` }, { transform: `rotate(${threads[i]!.angle}deg) scaleY(1)` }], {
        duration: THREAD_MS,
        delay: i * STAGGER_MS,
        easing: 'ease-out',
        fill: 'both',
      }),
    );
    return () => motions.forEach((motion) => motion?.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [threaded, reduced]);

  // O portal abre, os raios giram devagar, e as plumas descem.
  useEffect(() => {
    if (!opened) return;
    const motions = [
      portalNode.current?.animate?.(
        reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(0.2, 0.1)' }, { opacity: 1, transform: 'scale(1.08)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }],
        { duration: PORTAL_MS, easing: 'cubic-bezier(.2,.9,.3,1)', fill: 'both' },
      ),
      raysNode.current?.animate?.(
        reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'rotate(-10deg)' }, { opacity: 1, transform: 'rotate(0deg)', offset: 0.3 }, { opacity: 1, transform: 'rotate(14deg)' }],
        { duration: reduced ? PORTAL_MS : RAYS_MS, fill: 'both' },
      ),
    ];
    if (reduced) return () => motions.forEach((motion) => motion?.cancel());
    const timers: number[] = [];
    const parent = particles.current;
    const random = rng(1_123);
    for (let ms = 0; ms < PLUMES_UNTIL_MS - M.portalAt; ms += PLUME_EVERY_MS) {
      timers.push(window.setTimeout(() => parent && plume(timers, parent, portal, random, k), ms));
    }
    return () => {
      motions.forEach((motion) => motion?.cancel());
      timers.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, reduced]);

  // A coluna desce até o cemitério, e sobem estrelinhas dele.
  useEffect(() => {
    if (!columned) return;
    const motion = columnNode.current?.animate?.(reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'scaleY(0)', opacity: 0 }, { transform: 'scaleY(1)', opacity: 1 }], {
      duration: COLUMN_MS,
      easing: 'ease-out',
      fill: 'both',
    });
    if (reduced) return () => motion?.cancel();
    const timers: number[] = [];
    const parent = particles.current;
    const random = rng(1_229);
    for (let ms = 0; ms < STARS_UNTIL_MS - M.columnAt; ms += STAR_EVERY_MS) {
      timers.push(window.setTimeout(() => parent && star(timers, parent, { x: ground.x, y: ground.y + 10 }, random, k), ms));
    }
    return () => {
      motion?.cancel();
      timers.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columned, reduced]);

  // A carta sobe sem cor, e a auréola entra em cima dela.
  useEffect(() => {
    if (!risen) return;
    const drop = ground.y - top.y;
    const motion = ghost.current?.animate?.(
      reduced
        ? [{ opacity: 0 }, { opacity: 0.65 }]
        : [
            { transform: `translateY(${drop}px) scale(0.9)`, opacity: 0 },
            { transform: `translateY(${drop * 0.4}px) rotate(-4deg)`, opacity: 0.55, offset: 0.6 },
            { transform: 'translateY(0) rotate(3deg) scale(1.12)', opacity: 0.65 },
          ],
      { duration: reduced ? 200 : RISE_MS, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'both' },
    );
    return () => motion?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [risen, reduced]);
  useEffect(() => {
    if (!aureole) return;
    const motion = aureoleNode.current?.animate?.(
      reduced ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(-20px) scale(0.5)' }, { opacity: 1, transform: 'none' }],
      { duration: 500, easing: 'ease-out', fill: 'both' },
    );
    return () => motion?.cancel();
  }, [aureole, reduced]);

  // A cor volta no alto, com o lampejo, o anel de luz e as estrelas.
  useEffect(() => {
    if (!colored) return;
    const motions = [
      ghost.current?.animate?.(reduced ? [{ opacity: 0.65 }, { opacity: 1 }] : [{ opacity: 0.65, transform: 'rotate(3deg) scale(1.12)' }, { opacity: 1, transform: 'rotate(3deg) scale(1.12)' }], {
        duration: COLOR_MS,
        fill: 'forwards',
      }),
      colorLayer.current?.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: COLOR_MS, fill: 'forwards' }),
      reduced ? undefined : flash.current?.animate?.([{ opacity: 0 }, { opacity: 0.9, offset: 0.45 }, { opacity: 0 }], { duration: COLOR_MS }),
    ];
    if (reduced) return () => motions.forEach((motion) => motion?.cancel());
    const timers: number[] = [];
    const parent = particles.current;
    if (parent) {
      const random = rng(1_361);
      const ring = document.createElement('div');
      ring.className = 'absolute size-10 rounded-full border-[5px] border-ouro';
      ring.style.left = `${top.x - 20}px`;
      ring.style.top = `${top.y - 20}px`;
      spawn(timers, parent, ring, [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0, transform: `scale(${Math.max(3, 10 * k)})` }], RING_MS, 'cubic-bezier(.1,.8,.3,1)');
      for (let i = 0; i < BURST_STARS; i++) star(timers, parent, top, random, k);
    }
    return () => {
      motions.forEach((motion) => motion?.cancel());
      timers.forEach((id) => window.clearTimeout(id));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colored, reduced]);

  // Ela voa em arco até a vaga, e pousa com um brilho. Sem a vaga medida, só some.
  useEffect(() => {
    if (!flying || reduced || slot === null) return;
    const to = centerOf(slot);
    const dx = to.x - top.x;
    const dy = to.y - top.y;
    const motion = ghost.current?.animate?.(
      [
        { transform: 'rotate(3deg) scale(1.12)', opacity: 1 },
        { transform: `translate(${dx / 2}px, ${-30 * k}px) rotate(-8deg) scale(1.2)`, opacity: 1, offset: 0.45 },
        { transform: `translate(${dx}px, ${dy}px)`, opacity: 1 },
      ],
      { duration: M.landAt - M.flightAt, easing: 'cubic-bezier(.4,0,.2,1)', fill: 'forwards' },
    );
    return () => motion?.cancel();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [flying, reduced]);
  useEffect(() => {
    if (!landed) return;
    if (slot === null) {
      const away = ghost.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 200, fill: 'forwards' });
      return () => away?.cancel();
    }
    if (reduced) return;
    const motions = [
      body.current?.animate?.([{ transform: 'scale(1.35)' }, { transform: 'scale(1)' }], { duration: SETTLE_MS, easing: 'cubic-bezier(.3,.9,.3,1.3)' }),
      halo.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: SETTLE_MS, easing: 'ease-out', fill: 'both' }),
      root.current?.closest('[data-palco]')?.querySelector('[data-campos]')?.animate?.(shakeFrames(4, 0), { duration: SHAKE_MS, easing: 'linear' }),
    ];
    return () => motions.forEach((motion) => motion?.cancel());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [landed, reduced]);

  // O céu some.
  useEffect(() => {
    if (!fading) return;
    const motion = sky.current?.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: FADE_MS, fill: 'forwards' });
    return () => motion?.cancel();
  }, [fading]);

  // Parada, com movimento reduzido: no alto, e depois da partida na vaga.
  const rest = reduced && flying && slot ? centerOf(slot) : top;
  const raysSize = 900 * k;

  return (
    <div ref={root} className="absolute inset-0">
      <div ref={sky} data-ceu="" data-somindo={fading ? '' : undefined} className="absolute inset-0">
        {opened ? (
          <div
            ref={raysNode}
            data-raios=""
            className="absolute bg-[repeating-conic-gradient(from_150deg,rgba(255,243,196,.28)_0_2.5deg,transparent_2.5deg_10deg)] [mask-image:radial-gradient(circle,#000_4%,transparent_52%)]"
            style={{ left: `${portal.x - raysSize / 2}px`, top: `${portal.y - raysSize / 2}px`, width: `${raysSize}px`, height: `${raysSize}px`, opacity: 0 }}
          />
        ) : null}
        {columned ? (
          <div
            ref={columnNode}
            data-coluna=""
            className="absolute origin-top bg-[linear-gradient(90deg,transparent,rgba(245,194,56,.3)_22%,rgba(255,253,243,.92)_50%,rgba(245,194,56,.3)_78%,transparent)]"
            style={{ left: `${portal.x - 95 * k}px`, top: `${portal.y}px`, width: `${190 * k}px`, height: `${ground.y + 30 * k - portal.y}px` }}
          />
        ) : null}
        {threaded
          ? threads.map(({ base, length, angle }, i) => (
              <div
                key={`${base.x}-${i}`}
                ref={(node) => {
                  threadNodes.current[i] = node;
                }}
                data-fio=""
                className="absolute w-[5px] origin-bottom bg-[linear-gradient(0deg,rgba(255,253,243,.98),rgba(245,194,56,.55)_60%,rgba(245,194,56,0))]"
                style={{ left: `${base.x - 2.5}px`, top: `${base.y - length}px`, height: `${length}px`, transform: `rotate(${angle}deg)` }}
              />
            ))
          : null}
        {opened ? (
          <div
            ref={portalNode}
            data-portal=""
            className="absolute rounded-[50%] bg-[radial-gradient(ellipse,#fff_0_16%,rgba(255,243,196,.95)_30%,rgba(245,194,56,.5)_54%,transparent_72%)]"
            style={{ left: `${portal.x - 150 * k}px`, top: `${portal.y - 48 * k}px`, width: `${300 * k}px`, height: `${96 * k}px` }}
          />
        ) : null}
        {copies.map(({ card: copy, at }, i) => (
          <div
            key={copy.id}
            ref={(node) => {
              copyNodes.current[i] = node;
            }}
            data-quadra-cena=""
            className="absolute grid place-items-center"
            style={{ left: `${at.x}px`, top: `${at.y}px`, width: `${at.w}px`, height: `${at.h}px` }}
          >
            <div
              ref={(node) => {
                halos.current[i] = node;
              }}
              className="absolute -inset-3 rounded-[10px] bg-[radial-gradient(closest-side,rgba(255,243,196,.95),rgba(245,194,56,.55)_65%,rgba(245,194,56,0))]"
              style={{ opacity: reduced ? 0.8 : 0 }}
            />
            <div className="relative">
              <Card card={copy} size="field" animated={false} />
            </div>
          </div>
        ))}
      </div>
      {risen && revived ? (
        <div
          ref={ghost}
          data-carta-cena=""
          data-colorida={colored ? '' : undefined}
          data-voo={flying && !reduced ? '' : undefined}
          data-pousou={landed ? '' : undefined}
          className="absolute"
          style={{ left: `${rest.x - card.w / 2}px`, top: `${rest.y - card.h / 2}px`, width: `${card.w}px`, height: `${card.h}px` }}
        >
          <div ref={body} className="relative size-full">
            <div
              ref={halo}
              className="absolute -inset-3 rounded-[10px] bg-[radial-gradient(closest-side,rgba(255,243,196,.95),rgba(245,194,56,.5)_65%,rgba(245,194,56,0))]"
              style={{ opacity: 0 }}
            />
            <div className="absolute inset-0 grid place-items-center">
              <Card card={copyOf(revived)} size="field" animated={false} grave />
            </div>
            <div ref={colorLayer} className="absolute inset-0 grid place-items-center" style={{ opacity: 0 }}>
              <Card card={copyOf(revived)} size="field" animated={false} />
            </div>
            <div ref={flash} className="absolute inset-0 rounded-[4px] bg-papel" style={{ opacity: 0 }} />
          </div>
        </div>
      ) : null}
      {aureole ? (
        <div
          ref={aureoleNode}
          data-aureola=""
          className="absolute rounded-[50%] border-[4px] border-ouro"
          style={{ left: `${top.x - 29}px`, top: `${top.y - card.h / 2 - 26}px`, width: '58px', height: '18px' }}
        />
      ) : null}
      <div ref={particles} className="absolute inset-0" />
      {titled ? (
        <Stamp
          kind="RESURRECTED"
          reduced={reduced}
          top={box.band.y + box.band.h * 0.38}
          className={`${STAMP_SIZE} -rotate-2 bg-papel text-tinta outline-4 -outline-offset-[11px] outline-ouro [text-shadow:2px_2px_0_var(--color-ouro)]`}
        />
      ) : null}
    </div>
  );
}

/** Uma pluma que desce do portal, balançando. */
function plume(timers: number[], parent: Element, from: ScenePoint, random: () => number, k: number): void {
  const node = document.createElement('div');
  const sway = (random() - 0.5) * 60;
  node.className = 'absolute rounded-[50%_50%_50%_50%/70%_70%_30%_30%] bg-[linear-gradient(180deg,#fffdf3,#f1e6c4)]';
  node.style.width = `${Math.max(6, 10 * k)}px`;
  node.style.height = `${Math.max(14, 24 * k)}px`;
  node.style.left = `${from.x + (random() - 0.5) * 120 * Math.max(k, 0.6)}px`;
  node.style.top = `${from.y + 20}px`;
  spawn(
    timers,
    parent,
    node,
    [
      { transform: 'translate(0, 0) rotate(-20deg)', opacity: 0 },
      { opacity: 0.95, offset: 0.15 },
      { transform: `translate(${sway}px, ${70 * Math.max(k, 0.6)}px) rotate(25deg)`, offset: 0.5 },
      { transform: `translate(${-sway}px, ${150 * Math.max(k, 0.6)}px) rotate(-15deg)`, opacity: 0 },
    ],
    1_800 + random() * 600,
    'ease-in-out',
  );
}

/** Uma estrelinha de ouro que sobe e apaga. */
function star(timers: number[], parent: Element, from: ScenePoint, random: () => number, k: number): void {
  const node = document.createElement('div');
  const scale = 0.6 + random();
  node.className = 'absolute size-2 bg-ouro [clip-path:polygon(50%_0,62%_38%,100%_50%,62%_62%,50%_100%,38%_62%,0_50%,38%_38%)]';
  node.style.left = `${from.x + (random() - 0.5) * 80 * Math.max(k, 0.6)}px`;
  node.style.top = `${from.y}px`;
  spawn(
    timers,
    parent,
    node,
    [
      { transform: `translateY(0) scale(${scale.toFixed(2)}) rotate(0deg)`, opacity: 0 },
      { opacity: 1, offset: 0.2 },
      { transform: `translateY(-${((120 + random() * 140) * Math.max(k, 0.6)).toFixed(0)}px) scale(${(scale * 0.6).toFixed(2)}) rotate(180deg)`, opacity: 0 },
    ],
    900 + random() * 500,
  );
}
