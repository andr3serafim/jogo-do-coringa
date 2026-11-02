// As contas do céu da Ressurreição (sub-projeto 6 §7.6): o portal no alto da faixa, o chão onde a coluna de luz pousa (o cemitério) e o alto, onde a
// carta recebe a cor. No PC são as do protótipo aprovado; no celular em pé, tudo encolhe na proporção da largura e se prende à faixa, porque o
// cemitério pode estar fora da janela. Puro: sem React nem DOM.
import type { ScenePoint, SceneRect } from '../anim/scene-box.ts';

/** Quanto o portal fica abaixo do topo da faixa. */
const PORTAL_DROP = 40;
/** A metade da largura do portal, na escala 1. */
const PORTAL_HALF_W = 150;
/** Quanto a carta sobe do chão. */
const RISE = 150;
const MARGIN = 12;

const clamp = (value: number, min: number, max: number): number => (min > max ? (min + max) / 2 : Math.min(max, Math.max(min, value)));

export interface SkyLayout {
  /** A escala do desenho: 1 no PC, 0,36 num celular de 360 px. */
  k: number;
  portal: ScenePoint;
  ground: ScenePoint;
  top: ScenePoint;
}

/** O céu em cima do cemitério, inteiro na faixa; sem o cemitério medido, no canto de baixo à direita. */
export function skyLayout(graveyard: SceneRect | null, band: SceneRect): SkyLayout {
  const k = clamp(band.w / 1000, 0.36, 1);
  const x = clamp(graveyard ? graveyard.x + graveyard.w / 2 : band.x + band.w - 60, band.x + PORTAL_HALF_W * k, band.x + band.w - PORTAL_HALF_W * k);
  const y = clamp(graveyard ? graveyard.y + graveyard.h / 2 : band.y + band.h - 40, band.y + MARGIN, band.y + band.h - MARGIN);
  const portal = { x, y: band.y + PORTAL_DROP };
  const ground = { x, y: Math.max(y, portal.y) };
  return { k, portal, ground, top: { x, y: Math.max(portal.y, ground.y - RISE) } };
}
