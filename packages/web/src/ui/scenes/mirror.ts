// As contas do espelho do Reflect (sub-projeto 6 §7.5): o tamanho, onde ele fica e por onde o cometa passa. No PC são as do protótipo
// aprovado; no celular em pé, tudo encolhe na proporção da faixa e se prende a ela, porque a fileira de quem atacou pode estar fora da
// janela. Puro: sem React nem DOM.
import type { PlayerId } from '@coringa/engine';
import type { SceneBox, ScenePoint, SceneRect } from '../anim/scene-box.ts';

const MIN_SIZE = 140;
const MAX_SIZE = 300;
/** A folga da origem do cometa em volta da faixa. */
const START_MARGIN = 12;

const clamp = (value: number, min: number, max: number): number => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value)));
const lerp = (a: ScenePoint, b: ScenePoint, t: number): ScenePoint => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
const centerOf = ({ x, y, w, h }: SceneRect): ScenePoint => ({ x: x + w / 2, y: y + h / 2 });

export const otherPlayer = (player: PlayerId): PlayerId => (player === 'p1' ? 'p2' : 'p1');

/** O lado do espelho, em px: 300 no PC, e na proporção da faixa no celular. */
export function mirrorSize(band: Pick<SceneRect, 'w' | 'h'>): number {
  return clamp(Math.min(band.w * 0.62, band.h * 0.72), MIN_SIZE, MAX_SIZE);
}

export interface MirrorLayout {
  center: ScenePoint;
  size: number;
  /** De onde o cometa sai: a origem, presa à faixa. */
  start: ScenePoint;
}

/** O espelho a 60% do caminho entre a fileira de quem atacou e o campo do dono, inteiro dentro da faixa. */
export function mirrorLayout(origin: ScenePoint, target: ScenePoint, band: SceneRect): MirrorLayout {
  const size = mirrorSize(band);
  const start = {
    x: clamp(origin.x, band.x + START_MARGIN, band.x + band.w - START_MARGIN),
    y: clamp(origin.y, band.y + START_MARGIN, band.y + band.h - START_MARGIN),
  };
  const middle = lerp(start, target, 0.6);
  const center = {
    x: clamp(middle.x, band.x + size / 2, band.x + band.w - size / 2),
    y: clamp(middle.y, band.y + size / 2, band.y + band.h - size / 2),
  };
  return { center, size, start };
}

/** As três pontas do espelho, onde o K, o J e o Q ficam. */
export function mirrorTips(center: ScenePoint, size: number): [ScenePoint, ScenePoint, ScenePoint] {
  return [
    { x: center.x, y: center.y - size * 0.42 },
    { x: center.x - size * 0.37, y: center.y + size * 0.22 },
    { x: center.x + size * 0.37, y: center.y + size * 0.22 },
  ];
}

/** Por onde o cometa passa: `p1` e `p2` cercam o trecho em que o tempo quase para, e `hit` é onde ele bate no vidro. */
export function cometStops(start: ScenePoint, center: ScenePoint, size: number): { p1: ScenePoint; p2: ScenePoint; hit: ScenePoint } {
  return { p1: lerp(start, center, 0.42), p2: lerp(start, center, 0.66), hit: { x: center.x, y: center.y - size * 0.02 } };
}

/** De onde o golpe vem (a fileira de Ataque de quem atacou), o campo do dono do espelho e o retrato ao qual ele volta. */
export function reflectFrom(box: SceneBox, owner: PlayerId, attacker: PlayerId, me: PlayerId): { origin: ScenePoint; target: ScenePoint; back: ScenePoint } {
  const portrait = (player: PlayerId): ScenePoint => box.portrait[player === me ? 'voce' : 'oponente'];
  const row = box.row(attacker, 'ATK');
  const field = box.row(owner, 'ATK')?.field;
  return {
    origin: row ? centerOf(row.rect) : portrait(attacker),
    target: field ? centerOf(field) : portrait(owner),
    back: portrait(attacker),
  };
}
