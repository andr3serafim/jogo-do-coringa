// A poeira do pouso e os cacos da carta que quebra (sub-projeto 6 §8, fatia 5): partículas da mesa, fora do React, animadas pelo navegador
// (`spawn`: só `transform` e `opacity`). Cada uma sai sozinha antes de `dustMs` ou `shardMs`. Os cacos são os do entulho da Devastação no
// protótipo, menores e de papel, como a carta.
import { TABLE_MOTION } from '../../model/table-motion.ts';
import { spawn } from './particles.ts';
import type { SceneRect } from './scene-box.ts';

/** O recorte de um caco: o do entulho do protótipo (`devastacao()`). */
const SHARD_CLIP = 'polygon(12% 18%, 64% 0, 100% 42%, 78% 100%, 18% 88%, 0 48%)';

/** Puffs de poeira que sobem da borda de baixo de `box` (as coordenadas são as da camada) e somem. */
export function dust(timers: number[], layer: Element, box: SceneRect, count: number, random: () => number): void {
  for (let i = 0; i < count; i++) {
    const node = document.createElement('div');
    const size = 8 + random() * 8;
    node.setAttribute('data-poeira', '');
    node.className = 'absolute rounded-full bg-[color-mix(in_oklab,var(--color-tinta)_28%,transparent)]';
    node.style.width = node.style.height = `${size.toFixed(1)}px`;
    node.style.left = `${(box.x + box.w * (0.15 + 0.7 * random()) - size / 2).toFixed(1)}px`;
    node.style.top = `${(box.y + box.h - size / 2).toFixed(1)}px`;
    const dx = (random() - 0.5) * box.w * 0.9;
    const dy = 6 + random() * 14;
    spawn(
      timers,
      layer,
      node,
      [
        { transform: 'translate(0, 0) scale(0.4)', opacity: 0.85 },
        { transform: `translate(${dx.toFixed(1)}px, ${(-dy).toFixed(1)}px) scale(1.6)`, opacity: 0 },
      ],
      TABLE_MOTION.dustMs * (0.75 + 0.25 * random()),
    );
  }
}

/** Cacos de papel que saltam de dentro de `box`, giram e caem. */
export function shards(timers: number[], layer: Element, box: SceneRect, count: number, random: () => number): void {
  for (let i = 0; i < count; i++) {
    const node = document.createElement('div');
    const size = 6 + random() * 8;
    node.setAttribute('data-caco', '');
    node.className = 'absolute border-2 border-tinta bg-papel';
    node.style.width = `${size.toFixed(1)}px`;
    node.style.height = `${(size * (0.6 + 0.5 * random())).toFixed(1)}px`;
    node.style.clipPath = SHARD_CLIP;
    node.style.left = `${(box.x + box.w * random() - size / 2).toFixed(1)}px`;
    node.style.top = `${(box.y + box.h * random() - size / 2).toFixed(1)}px`;
    const angle = (i / count) * Math.PI * 2 + random();
    const reach = 18 + random() * 34;
    const dx = Math.cos(angle) * reach;
    const up = 10 + random() * 26;
    const spin = (random() - 0.5) * 540;
    spawn(
      timers,
      layer,
      node,
      [
        { transform: 'translate(0, 0) rotate(0deg)', opacity: 1 },
        { transform: `translate(${(dx * 0.6).toFixed(1)}px, ${(-up).toFixed(1)}px) rotate(${(spin / 2).toFixed(0)}deg)`, opacity: 1, offset: 0.4 },
        { transform: `translate(${dx.toFixed(1)}px, ${(24 + random() * 30).toFixed(1)}px) rotate(${spin.toFixed(0)}deg)`, opacity: 0 },
      ],
      TABLE_MOTION.shardMs * (0.75 + 0.25 * random()),
      'cubic-bezier(0.3, 0.5, 0.6, 1)',
    );
  }
}
