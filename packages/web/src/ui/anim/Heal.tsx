// A camada da cura (spec `2026-11-23-cura-placas-historico-design.md` §4.2; decisoes.md 2026-11-23 (9) e (10), a direção A): na batida de
// cura, a carta que curou acende (a de cima do cemitério, ou o monte quando outra caiu por cima; no Roubo, a carta roubada, já na fileira),
// uma gota sai dela e sobe num arco até a ponta da vida nova na barra de quem curou, com um rastro curto de cruzes; na chegada, as faíscas e
// o carimbo, logo abaixo da barra, com o bruto ("+28") e a conta ("7♥ × 4").
//
// - O carimbo vive além da batida: fica `stampHoldMs` depois do fim dela e sai sozinho. Uma cura nova ou o golpe do mesmo lado o trocam;
//   uma cena, o fim da partida e o pulo o tiram na hora. Desmontar a mesa tira tudo.
// - Tudo mora na camada dos efeitos (`FxLayer`), escondida do leitor de tela (o histórico diz a cura), e anima só `translate`, `scale` e
//   `opacity`, pelo navegador (Web Animations), sem filtro nem sombra com desfoque. Com movimento reduzido, nada voa nem acende: o carimbo
//   só aparece na chegada.
// - Os nós nascem pela batida (`beat`), uma vez: o palco redesenha a cada contagem, e a gota não pode nascer de novo a cada desenho.
import type { GameEvent, PlayerId } from '@coringa/engine';
import { useEffect, useRef } from 'react';
import type { HealFx } from '../../model/effects.ts';
import { HEAL_MOTION } from '../../model/heal-motion.ts';
import type { Beat } from '../../model/timeline.ts';
import { useFxLayer } from './FxLayer.tsx';

export interface HealLayerProps {
  beat: Beat | null;
  /** O efeito da cura da batida de agora (`effectsOf(...).heal`). */
  fx: HealFx | null;
  cut: boolean;
  reduced: boolean;
  /** Quem vê esta mesa: a cura dele vai à barra de "voce". */
  me: PlayerId | null;
}

type Side = 'voce' | 'oponente';

/** O coração da cura (a figura da placa), em papel com contorno de tinta sobre o disco verde. */
const HEART =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21.2C6.4 17.2 2.6 13.6 2.6 9.1 2.6 6 5 3.6 7.9 3.6c1.8 0 3.3.9 4.1 2.3.8-1.4 2.3-2.3 4.1-2.3 2.9 0 5.3 2.4 5.3 5.5 0 4.5-3.8 8.1-9.4 12.1Z" fill="var(--color-papel)" stroke="var(--color-tinta)" stroke-width="1.6"/><path d="M12 8.6v7.2M8.4 12.2h7.2" stroke="var(--color-cura)" stroke-width="2.4"/></svg>';

/** As cruzes do rastro, atrás da gota, e o intervalo entre elas. */
const TRAIL = 4;
const TRAIL_GAP_MS = 28;
/** As faíscas da chegada. */
const SPARKS = 7;

/** Quem apanha na batida, se ela tem golpe: o número do golpe tira o carimbo do lado dele. */
function struck(event: GameEvent): PlayerId | null {
  switch (event.type) {
    case 'DamageDealt':
      return event.damage > 0 ? event.defender : null;
    case 'StealDamage':
      return event.damage > 0 ? event.victim : null;
    case 'ReflectTriggered':
      return event.damage > 0 ? event.attacker : null;
    default:
      return null;
  }
}

/** Os pontos de um arco que sobe, de `a` até `b`, para os quadros do voo. */
function arc(a: { x: number; y: number }, b: { x: number; y: number }, lift: number, steps = 14): { x: number; y: number; t: number }[] {
  const mx = (a.x + b.x) / 2;
  const my = Math.min(a.y, b.y) - lift;
  return Array.from({ length: steps + 1 }, (_, i) => {
    const t = i / steps;
    return {
      x: (1 - t) ** 2 * a.x + 2 * (1 - t) * t * mx + t * t * b.x,
      y: (1 - t) ** 2 * a.y + 2 * (1 - t) * t * my + t * t * b.y,
      t,
    };
  });
}

interface Bag {
  nodes: HTMLElement[];
  timers: number[];
  anims: (Animation | undefined)[];
}

const emptyBag = (): Bag => ({ nodes: [], timers: [], anims: [] });

function clearBag(bag: Bag): void {
  bag.timers.forEach((timer) => window.clearTimeout(timer));
  bag.anims.forEach((anim) => anim?.cancel());
  bag.nodes.forEach((node) => node.remove());
  bag.timers = [];
  bag.anims = [];
  bag.nodes = [];
}

function node(bag: Bag, root: HTMLElement, className: string, attr: string, value = ''): HTMLElement {
  const el = document.createElement('span');
  el.className = className;
  el.setAttribute(attr, value);
  el.setAttribute('aria-hidden', 'true');
  root.appendChild(el);
  bag.nodes.push(el);
  return el;
}

export function HealLayer({ beat, fx, cut, reduced, me }: HealLayerProps): null {
  const { layer } = useFxLayer();
  const flight = useRef<Bag>(emptyBag());
  const stamps = useRef(new Map<Side, Bag>());
  const played = useRef<Beat | null>(null);

  const dropStamp = (side: Side) => {
    const bag = stamps.current.get(side);
    if (bag === undefined) return;
    clearBag(bag);
    stamps.current.delete(side);
  };
  const dropAll = () => {
    clearBag(flight.current);
    for (const side of [...stamps.current.keys()]) dropStamp(side);
  };

  // Desmontar a mesa: nada fica na camada, nenhum timer dispara depois.
  useEffect(() => () => dropAll(), []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (cut) dropAll();
  }, [cut]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (played.current === beat) return;
    played.current = beat;
    clearBag(flight.current);
    if (beat === null || cut) return;
    const sideOf = (player: PlayerId): Side => (player === me ? 'voce' : 'oponente');
    // Uma cena (com a cortina dela) e o fim da partida tiram todo carimbo; o golpe tira o do lado de quem apanhou.
    if (beat.kind === 'scene' || beat.event.type === 'GameOver') for (const side of [...stamps.current.keys()]) dropStamp(side);
    const hit = struck(beat.event);
    if (hit !== null) dropStamp(sideOf(hit));
    if (beat.kind !== 'heal' || fx === null) return;

    const root = layer();
    const stage = root?.parentElement ?? null;
    if (root === null || stage === null) return;
    const box = root.getBoundingClientRect();
    const side = sideOf(fx.target);
    const meter = stage.querySelector<HTMLElement>(`[data-lado="${side}"] [role="meter"]`);
    const shown = Number(stage.querySelector(`[data-lado="${side}"] [data-hp]`)?.textContent ?? 0);
    const max = Number(meter?.getAttribute('aria-valuemax') ?? 1) || 1;
    const bar = meter?.getBoundingClientRect() ?? box;
    // A ponta da vida nova (a de agora mais o líquido), do lado do retrato: a da esquerda cresce para a direita, a do oponente ao contrário.
    const fraction = Math.max(0, Math.min(1, (shown + fx.net) / max));
    const span = Math.max(0, bar.width - 4) * fraction;
    const tip = { x: (side === 'voce' ? bar.left + 2 + span : bar.right - 2 - span) - box.left, y: bar.top + bar.height / 2 - box.top };

    const card = stage.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(fx.card.id)}"]`);
    const source = card ?? stage.querySelector<HTMLElement>('[data-cemiterio]');
    const from = source?.getBoundingClientRect() ?? box;
    const origin = { x: from.left + from.width / 2 - box.left, y: from.top + from.height / 2 - box.top };
    const bag = flight.current;
    const at = (ms: number, action: () => void) => bag.timers.push(window.setTimeout(action, ms));
    const { glowMs, dropAt, flightMs, arriveAt, sparksMs, beatMs, stampHoldMs, stampOutMs } = HEAL_MOTION;

    if (!reduced) {
      // 1. A origem acende: um contorno verde que cresce e some.
      const glow = node(bag, root, 'cura-origem', 'data-cura-origem', card ? 'carta' : 'monte');
      Object.assign(glow.style, { left: `${from.left - box.left}px`, top: `${from.top - box.top}px`, width: `${from.width}px`, height: `${from.height}px` });
      bag.anims.push(glow.animate?.([{ opacity: 1, scale: '1' }, { opacity: 0, scale: '1.35' }], { duration: glowMs, easing: 'ease-out', fill: 'forwards' }));
      at(glowMs, () => glow.remove());

      // 2. A gota sobe num arco até a ponta da barra, com o rastro de cruzes logo atrás.
      at(dropAt, () => {
        const lift = Math.max(40, Math.abs(origin.y - tip.y) * 0.25);
        const path = arc(origin, tip, lift);
        for (let i = TRAIL; i >= 1; i--) {
          const trail = node(bag, root, 'cura-rastro', 'data-cura-rastro');
          Object.assign(trail.style, { left: `${origin.x}px`, top: `${origin.y}px`, scale: String(1 - i * 0.15) });
          bag.anims.push(
            trail.animate?.(
              path.map((p, k) => ({ translate: `${(p.x - origin.x).toFixed(1)}px ${(p.y - origin.y).toFixed(1)}px`, opacity: k === 0 ? 0 : (0.9 - i * 0.16) * (1 - p.t * 0.5) })),
              { duration: flightMs, delay: i * TRAIL_GAP_MS, easing: 'cubic-bezier(.45,0,.35,1)', fill: 'both' },
            ),
          );
        }
        const drop = node(bag, root, 'cura-gota', 'data-cura-gota');
        drop.innerHTML = HEART;
        Object.assign(drop.style, { left: `${origin.x}px`, top: `${origin.y}px` });
        bag.anims.push(
          drop.animate?.(
            path.map((p) => ({ translate: `${(p.x - origin.x).toFixed(1)}px ${(p.y - origin.y).toFixed(1)}px`, scale: String(1 + 0.18 * Math.sin(Math.PI * p.t)) })),
            { duration: flightMs, easing: 'cubic-bezier(.45,0,.35,1)', fill: 'forwards' },
          ),
        );
        at(flightMs, () => drop.remove());
        at(flightMs + TRAIL * TRAIL_GAP_MS, () => root.querySelectorAll('[data-cura-rastro]').forEach((el) => el.remove()));
      });
    }

    // 3. A chegada: as faíscas e o carimbo (que troca o carimbo anterior do mesmo lado).
    at(arriveAt, () => {
      if (!reduced) {
        const reach = box.width >= 1024 ? 34 : 20;
        for (let i = 0; i < SPARKS; i++) {
          const angle = (i / SPARKS) * Math.PI * 2 - Math.PI / 2 + 0.3;
          const spark = node(bag, root, 'cura-faisca', 'data-cura-faisca');
          Object.assign(spark.style, { left: `${tip.x}px`, top: `${tip.y}px` });
          const to = (k: number) => `${(Math.cos(angle) * reach * k).toFixed(1)}px ${(Math.sin(angle) * reach * k).toFixed(1)}px`;
          bag.anims.push(
            spark.animate?.(
              [
                { translate: '0px 0px', scale: '0.4', rotate: '0deg', opacity: 1 },
                { translate: to(0.7), scale: '1', rotate: '45deg', opacity: 1, offset: 0.45 },
                { translate: to(1), scale: '0.6', rotate: '90deg', opacity: 0 },
              ],
              { duration: sparksMs, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' },
            ),
          );
        }
        at(arriveAt + sparksMs, () => root.querySelectorAll('[data-cura-faisca]').forEach((el) => el.remove()));
      }
      dropStamp(side);
      const stampBag = emptyBag();
      stamps.current.set(side, stampBag);
      const stamp = node(stampBag, root, 'cura-carimbo', 'data-cura-carimbo');
      stamp.setAttribute('data-lado', side);
      const value = document.createElement('span');
      value.textContent = `+${fx.gross}`;
      const caption = document.createElement('small');
      caption.textContent = fx.caption;
      stamp.append(value, caption);
      // Pendurado logo abaixo da barra, centrado na ponta da vida nova, sem passar do fim da barra para o centro do placar.
      const half = (stamp.offsetWidth || 0) / 2;
      const left = Math.min(Math.max(tip.x, bar.left - box.left + half), bar.right - box.left - half);
      Object.assign(stamp.style, { left: `${left}px`, top: `${bar.bottom - box.top - 4}px` });
      stampBag.anims.push(
        reduced
          ? stamp.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 200, fill: 'forwards' })
          : stamp.animate?.(
              [
                { opacity: 0, scale: '1.7' },
                { opacity: 1, scale: '0.92', offset: 0.6 },
                { opacity: 1, scale: '1' },
              ],
              { duration: 360, easing: 'cubic-bezier(.2,.9,.3,1.2)', fill: 'forwards' },
            ),
      );
      // Ele fica `stampHoldMs` depois do fim da batida e sai subindo e esmaecendo, por conta própria.
      const outAt = beatMs + stampHoldMs - arriveAt;
      stampBag.timers.push(
        window.setTimeout(() => {
          stampBag.anims.push(
            stamp.animate?.(
              reduced ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, translate: '0 0' }, { opacity: 0, translate: '0 -10px' }],
              { duration: stampOutMs, fill: 'forwards' },
            ),
          );
        }, outAt),
        window.setTimeout(() => {
          if (stamps.current.get(side) === stampBag) dropStamp(side);
        }, outAt + stampOutMs),
      );
    });
  }, [beat, fx, cut, reduced, me, layer]);

  return null;
}
