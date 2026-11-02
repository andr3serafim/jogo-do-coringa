// A camada dos efeitos da mesa (sub-projeto 6 §8, fatia 5): onde a poeira do pouso, os cacos e as cópias das cartas que saem vivem, por
// cima da mesa e por baixo das cenas, sem pegar toque e escondida do leitor de tela (o histórico registra tudo). Quem solta é a carta
// (`useFxLayer().burst`), com o retângulo dela convertido para a camada. Com movimento reduzido, nada sai.
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode } from 'react';
import { dust, shards } from './bursts.ts';
import { rng } from './particles.ts';

export interface FxLayerApi {
  /** Solta poeira ou cacos sobre o elemento (a carta), onde ele está agora na tela. */
  burst(kind: 'dust' | 'shards', el: Element, count: number): void;
  /** O elemento da camada, para quem põe nela as próprias cópias (as cartas que saem). */
  layer(): HTMLElement | null;
}

const NO_LAYER: FxLayerApi = { burst: () => {}, layer: () => null };
export const FxLayerContext = createContext<FxLayerApi>(NO_LAYER);

export const useFxLayer = (): FxLayerApi => useContext(FxLayerContext);

/** A semente do sorteio pelo texto (o id da carta): o mesmo desenho para a mesma carta. */
function seedOf(text: string): number {
  let hash = 7;
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 2147483646;
  return hash + 1;
}

export function FxLayer({ reduced, children }: { reduced: boolean; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach((timer) => window.clearTimeout(timer)), []);
  const api = useMemo<FxLayerApi>(
    () => ({
      burst: (kind, el, count) => {
        const layer = ref.current;
        if (reduced || layer === null || count <= 0) return;
        const from = layer.getBoundingClientRect();
        const box = el.getBoundingClientRect();
        const rect = { x: box.left - from.left, y: box.top - from.top, w: box.width, h: box.height };
        const random = rng(seedOf(`${kind}:${el.getAttribute('data-card-id') ?? el.getAttribute('data-saindo-id') ?? ''}`));
        (kind === 'dust' ? dust : shards)(timers.current, layer, rect, count, random);
      },
      layer: () => ref.current,
    }),
    [reduced],
  );
  return (
    <FxLayerContext value={api}>
      {children}
      <div ref={ref} data-camada-fx aria-hidden="true" className="pointer-events-none absolute inset-0 z-40 overflow-hidden" />
    </FxLayerContext>
  );
}
