// O que as cenas e a mesa soltam fora do React: as partículas, animadas pelo navegador (Web Animations, só `transform` e `opacity`), e o
// tremor dos campos. Cada partícula sai sozinha no fim da vida dela. Mora fora de `ui/scenes/` e não importa nada: a mesa (no JavaScript
// inicial) o usa sem puxar o chunk das cenas.

/** Gerador de Park–Miller, o do protótipo: a mesma semente dá sempre o mesmo desenho. */
export function rng(seed: number): () => number {
  let s = seed;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

/** Solta uma partícula no `parent`: ela anima pelo navegador e sai sozinha no fim de `lifeMs` (o timer vai para `timers`). */
export function spawn(timers: number[], parent: Element, node: Element, keyframes: Keyframe[], lifeMs: number, easing = 'ease-out'): void {
  node.setAttribute('data-particula', '');
  parent.appendChild(node);
  (node as HTMLElement).animate?.(keyframes, { duration: lifeMs, easing, fill: 'forwards' });
  timers.push(window.setTimeout(() => node.remove(), lifeMs));
}

/** O tremor que cresce de `from` a `to` px (ou morre, ao contrário), ao longo da duração da animação. */
export function shakeFrames(from: number, to: number): Keyframe[] {
  return Array.from({ length: 13 }, (_, i) => {
    const amount = from + ((to - from) * i) / 12;
    const side = i % 2 ? 1 : -1;
    return { transform: `translate(${(side * amount).toFixed(1)}px, ${(-side * amount * 0.5).toFixed(1)}px)` };
  });
}

/** Faíscas de ouro em volta de um ponto: cada uma voa para um lado e apaga. `random` é o sorteio de semente fixa da cena. */
export function sparks(timers: number[], parent: Element, at: { x: number; y: number }, count: number, reach: number, random: () => number): void {
  for (let i = 0; i < count; i++) {
    const node = document.createElement('div');
    const angle = (i / count) * Math.PI * 2 + random();
    const far = reach * (0.5 + random() * 0.5);
    node.className = 'absolute size-[5px] bg-ouro';
    node.style.left = `${at.x}px`;
    node.style.top = `${at.y}px`;
    spawn(
      timers,
      parent,
      node,
      [
        { transform: 'translate(0, 0) scale(1)', opacity: 1 },
        { transform: `translate(${(Math.cos(angle) * far).toFixed(1)}px, ${(Math.sin(angle) * far).toFixed(1)}px) scale(0.2)`, opacity: 0 },
      ],
      320 + random() * 200,
    );
  }
}
