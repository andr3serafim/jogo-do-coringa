// As cartas que saem da mesa na batida delas (sub-projeto 6 §8, fatia 5, E2 e E5). Sem `AnimatePresence`, a carta que vai ao cemitério sem
// ser a de cima desmonta quando o `state` chega, antes da batida dela: de uma Guarda de 4 K quebrada, só 1 voava. Aqui, antes de o React
// mexer no DOM (`getSnapshotBeforeUpdate`), cada carta que a linha do tempo nova tira da mesa é lida (o lugar e um clone), e a cópia fica no
// lugar dela, na camada dos efeitos, até a batida. Na batida, a cópia voa ao cemitério e some, ou, se a carta quebra (o K da Guarda, o
// alvo da Armadilha e do Sacrifício), racha, treme e estoura em cacos de papel.
//
// - A carta de verdade que estoura e já está na mesa (o topo do cemitério) chega lá sem transição (`instant`, no `Stage`) e fica escondida
//   até o estouro, como a da Ressurreição.
// - As cópias não levam `data-card-id` (o seletor da carta de verdade nunca pega uma), e a camada é `aria-hidden`.
// - Só age quando a linha do tempo muda: o palco redesenha a cada batida, e as cópias não podem nascer de novo a cada desenho.
// - O pulo (`cut`) e o `state` seguinte tiram todas as cópias e devolvem as cartas escondidas. Com movimento reduzido, a cópia fica até a
//   batida e esmaece, sem voo, tremor nem cacos.
import { Component, type ContextType } from 'react';
import { shardsPerCard, TABLE_MOTION, type Heal, type Leaving as LeavingCard } from '../../model/table-motion.ts';
import { FxLayerContext } from './FxLayer.tsx';
import type { Run } from './useBeatPlayer.ts';

export interface LeavingProps {
  run: Run;
  cut: boolean;
  reduced: boolean;
}

interface Snapshot {
  id: string;
  rect: DOMRect;
  clone: HTMLElement;
  leaving: LeavingCard;
}

/** O voo mais curto da essência da cura: com a linha do tempo espremida no teto de decisão, ela ainda se vê. */
const ESSENCE_MIN_MS = 120;

/** O traço da rachadura, o mesmo que a carta mostrava (viewBox 40 × 56). */
const CRACK_PATH = 'M22 0 L15 15 L26 24 L12 38 L21 56';
const SVG = 'http://www.w3.org/2000/svg';

function crackOver(copy: HTMLElement): void {
  const svg = document.createElementNS(SVG, 'svg');
  svg.setAttribute('viewBox', '0 0 40 56');
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('data-rachadura', '');
  svg.setAttribute('class', 'pointer-events-none absolute inset-0 size-full');
  const path = document.createElementNS(SVG, 'path');
  path.setAttribute('d', CRACK_PATH);
  path.setAttribute('fill', 'none');
  path.setAttribute('stroke', 'var(--color-tinta)');
  path.setAttribute('stroke-width', '3.5');
  path.setAttribute('stroke-linejoin', 'miter');
  svg.appendChild(path);
  copy.appendChild(svg);
}

/** O clone vira cópia: sem os ids da carta de verdade, sem o que o Motion deixou no estilo, preso ao lugar antigo na camada. */
function asCopy(clone: HTMLElement, id: string, rect: DOMRect, layer: DOMRect): HTMLElement {
  for (const el of [clone, ...clone.querySelectorAll<HTMLElement>('[data-card-id]')]) el.removeAttribute('data-card-id');
  clone.removeAttribute('id');
  clone.removeAttribute('tabindex');
  clone.setAttribute('data-saindo', '');
  clone.setAttribute('data-saindo-id', id);
  clone.setAttribute('aria-hidden', 'true');
  // A cópia de uma carta da mão é um botão: `inert` a tira do Tab (escondida do leitor de tela, ela não pode receber foco).
  clone.setAttribute('inert', '');
  const style = clone.style;
  style.position = 'absolute';
  style.margin = '0';
  style.left = `${rect.left - layer.left}px`;
  style.top = `${rect.top - layer.top}px`;
  // A largura explícita: a carta de campo usa `w-full`, e solta na camada ela encolheria até o conteúdo (achado da fatia 4b).
  style.width = `${rect.width}px`;
  style.height = `${rect.height}px`;
  style.transform = 'none';
  style.translate = 'none';
  style.scale = 'none';
  style.opacity = '1';
  style.visibility = 'visible';
  return clone;
}

export class Leaving extends Component<LeavingProps> {
  static contextType = FxLayerContext;
  declare context: ContextType<typeof FxLayerContext>;

  private copies: HTMLElement[] = [];
  private hidden: HTMLElement[] = [];
  private timers: number[] = [];
  private moves: (Animation | undefined)[] = [];

  /** O palco: a carta de verdade se procura nele. */
  private stage(): HTMLElement | null {
    return this.context.layer()?.parentElement ?? null;
  }

  getSnapshotBeforeUpdate(prev: LeavingProps): Snapshot[] | null {
    if (prev.run === this.props.run || this.props.run.leaving.size === 0) return null;
    const stage = this.stage();
    if (stage === null) return null;
    const found: Snapshot[] = [];
    for (const [id, leaving] of this.props.run.leaving) {
      const el = stage.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`);
      if (el === null) continue;
      found.push({ id, rect: el.getBoundingClientRect(), clone: el.cloneNode(true) as HTMLElement, leaving });
    }
    return found;
  }

  componentDidUpdate(prev: LeavingProps, _state: unknown, snapshot: Snapshot[] | null): void {
    if (prev.run !== this.props.run || (this.props.cut && !prev.cut)) this.clear();
    if (snapshot === null || snapshot.length === 0 || this.props.cut) return;
    const layer = this.context.layer();
    const stage = this.stage();
    if (layer === null || stage === null) return;
    const layerBox = layer.getBoundingClientRect();
    const grave = stage.querySelector('[data-cemiterio]')?.getBoundingClientRect() ?? null;
    const shattering = new Map<number, number>();
    for (const { leaving } of snapshot) if (leaving.shatter) shattering.set(leaving.startMs, (shattering.get(leaving.startMs) ?? 0) + 1);
    for (const { id, rect, clone, leaving } of snapshot) {
      // A carta da Defesa que cura solta a essência verde até o retrato de quem curou (bloco A dos pontos do playtest, ponto 9).
      const heal = this.props.run.heals.get(id);
      if (heal !== undefined && !this.props.reduced) this.essence(rect, layerBox, stage, heal);
      const real = stage.querySelector<HTMLElement>(`[data-card-id="${CSS.escape(id)}"]`);
      // A que segue na mesa sem quebrar (o topo do cemitério) voa pelo `layoutId`: não precisa de cópia.
      if (real !== null && !leaving.shatter) continue;
      const copy = asCopy(clone, id, rect, layerBox);
      layer.appendChild(copy);
      this.copies.push(copy);
      if (real !== null) {
        real.style.visibility = 'hidden';
        this.hidden.push(real);
      }
      if (leaving.shatter) this.shatter(copy, real, leaving.startMs, shattering.get(leaving.startMs) ?? 1);
      else this.exit(copy, rect, grave, leaving.startMs, this.props.run.recoils.has(id));
    }
  }

  componentWillUnmount(): void {
    this.clear();
  }

  private at(ms: number, action: () => void): void {
    this.timers.push(window.setTimeout(action, ms));
  }

  private gone(copy: HTMLElement): void {
    copy.remove();
    this.copies = this.copies.filter((other) => other !== copy);
  }

  /** A cópia voa ao centro do cemitério, encolhendo e apagando; a sua, da mão, recua antes. */
  private exit(copy: HTMLElement, from: DOMRect, grave: DOMRect | null, startMs: number, recoil: boolean): void {
    const { exitMs, recoilMs, recoilPx } = TABLE_MOTION;
    if (this.props.reduced) {
      this.moves.push(copy.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: startMs, fill: 'forwards' }));
      this.at(startMs + 200, () => this.gone(copy));
      return;
    }
    let delay = startMs;
    if (recoil) {
      this.moves.push(copy.animate?.([{ translate: '0 0' }, { translate: `0 ${recoilPx}px` }, { translate: '0 0' }], { duration: recoilMs, delay, easing: 'ease-in-out' }));
      delay += recoilMs;
    }
    const dx = grave ? grave.left + grave.width / 2 - (from.left + from.width / 2) : 0;
    const dy = grave ? grave.top + grave.height / 2 - (from.top + from.height / 2) : 24;
    this.moves.push(
      copy.animate?.(
        [
          { transform: 'translate(0, 0) scale(1)', opacity: 1 },
          { transform: `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px) scale(0.5)`, opacity: 0 },
        ],
        { duration: exitMs, delay, easing: 'cubic-bezier(0.4, 0, 0.6, 1)', fill: 'forwards' },
      ),
    );
    this.at(delay + exitMs, () => this.gone(copy));
  }

  /**
   * A essência da cura passiva: uma gota verde que sai do lugar da carta na batida da saída e chega ao retrato de quem curou na batida da
   * cura (no mínimo `ESSENCE_MIN_MS` de voo), quando o "+N" nasce ali. Some na chegada.
   */
  private essence(from: DOMRect, layer: DOMRect, stage: HTMLElement, heal: Heal): void {
    const me = this.props.run.state?.view.me;
    const portrait = stage.querySelector(`[data-retrato="${heal.player === me ? 'voce' : 'oponente'}"]`)?.getBoundingClientRect();
    if (!portrait) return;
    const drop = document.createElement('span');
    drop.setAttribute('data-essencia', '');
    drop.setAttribute('aria-hidden', 'true');
    drop.className = 'essencia-cura';
    const x = from.left + from.width / 2 - layer.left;
    const y = from.top + from.height / 2 - layer.top;
    drop.style.left = `${x}px`;
    drop.style.top = `${y}px`;
    this.context.layer()?.appendChild(drop);
    this.copies.push(drop);
    const dx = portrait.left + portrait.width / 2 - layer.left - x;
    const dy = portrait.top + portrait.height / 2 - layer.top - y;
    const duration = Math.max(ESSENCE_MIN_MS, heal.atMs - heal.fromMs);
    this.moves.push(
      drop.animate?.(
        [
          { translate: '0px 0px', scale: '0.6', opacity: 0 },
          { translate: `${(dx * 0.15).toFixed(1)}px ${(dy * 0.15 - 18).toFixed(1)}px`, scale: '1', opacity: 1, offset: 0.25 },
          { translate: `${dx.toFixed(1)}px ${dy.toFixed(1)}px`, scale: '0.8', opacity: 0.9 },
        ],
        { duration, delay: heal.fromMs, easing: 'cubic-bezier(0.4, 0, 0.7, 1)', fill: 'both' },
      ),
    );
    this.at(heal.fromMs + duration, () => this.gone(drop));
  }

  /** A cópia racha, treme e estoura em cacos; a carta de verdade (o topo do cemitério) aparece no estouro. */
  private shatter(copy: HTMLElement, real: HTMLElement | null, startMs: number, together: number): void {
    const { crackShakeMs } = TABLE_MOTION;
    const reveal = () => {
      if (real !== null) {
        real.style.visibility = '';
        this.hidden = this.hidden.filter((el) => el !== real);
      }
    };
    this.at(startMs, () => crackOver(copy));
    if (this.props.reduced) {
      this.moves.push(copy.animate?.([{ opacity: 1 }, { opacity: 0 }], { duration: 200, delay: startMs, fill: 'forwards' }));
      this.at(startMs + 200, () => {
        this.gone(copy);
        reveal();
      });
      return;
    }
    this.moves.push(
      copy.animate?.([{ rotate: '0deg' }, { rotate: '-4deg' }, { rotate: '4deg' }, { rotate: '-3deg' }, { rotate: '3deg' }, { rotate: '0deg' }], {
        duration: crackShakeMs,
        delay: startMs,
      }),
    );
    this.at(startMs + crackShakeMs, () => {
      this.context.burst('shards', copy, shardsPerCard(together));
      this.gone(copy);
      reveal();
    });
  }

  private clear(): void {
    this.timers.forEach((timer) => window.clearTimeout(timer));
    this.timers = [];
    this.moves.forEach((move) => move?.cancel());
    this.moves = [];
    this.copies.forEach((copy) => copy.remove());
    this.copies = [];
    this.hidden.forEach((el) => (el.style.visibility = ''));
    this.hidden = [];
  }

  render(): null {
    return null;
  }
}
