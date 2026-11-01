// A caixa das cenas refeitas no sub-projeto 6 (§7, "Gramática comum"): onde a faixa da cena fica (a área dos campos, entre o
// placar e a mão), onde o placar acaba (a cortina escurece só daí para baixo: o placar fica à vista para ver a vida cair) e onde
// está o centro de cada retrato (o feixe do Ataque Absoluto vai até o do alvo; o escudo da Defesa encolhe até o do dono). Tudo
// relativo ao `[data-palco]`, medido quando uma cena começa e de novo se a janela mudar de tamanho durante ela.
import { useEffect, useState, type RefObject } from 'react';

export interface ScenePoint {
  x: number;
  y: number;
}

export interface SceneBox {
  /** A faixa da cena: a área dos campos (`[data-campos]`). */
  band: { x: number; y: number; w: number; h: number };
  /** Onde o placar (`[data-placar]`) acaba. */
  hudBottom: number;
  /** O centro do retrato de cada lado (`[data-retrato]`). */
  portrait: Record<'voce' | 'oponente', ScenePoint>;
}

/** Mede a caixa dentro do palco; `null` sem a mesa (o placar e os campos) montada. */
export function measureSceneBox(palco: HTMLElement): SceneBox | null {
  const campos = palco.querySelector('[data-campos]');
  const placar = palco.querySelector('[data-placar]');
  if (campos === null || placar === null) return null;
  const origin = palco.getBoundingClientRect();
  const fields = campos.getBoundingClientRect();
  const center = (side: 'voce' | 'oponente'): ScenePoint => {
    const rect = palco.querySelector(`[data-retrato="${side}"]`)?.getBoundingClientRect();
    if (rect === undefined) return { x: side === 'voce' ? 0 : origin.width, y: 0 };
    return { x: rect.left - origin.left + rect.width / 2, y: rect.top - origin.top + rect.height / 2 };
  };
  return {
    band: { x: fields.left - origin.left, y: fields.top - origin.top, w: fields.width, h: fields.height },
    hudBottom: placar.getBoundingClientRect().bottom - origin.top,
    portrait: { voce: center('voce'), oponente: center('oponente') },
  };
}

/** A caixa medida enquanto `active` (uma cena no ar); fora dela, a última medida. `ref` é um elemento dentro do palco. */
export function useSceneBox(ref: RefObject<HTMLElement | null>, active: boolean): SceneBox | null {
  const [box, setBox] = useState<SceneBox | null>(null);
  useEffect(() => {
    const palco = ref.current?.closest<HTMLElement>('[data-palco]') ?? null;
    if (!active || palco === null) return;
    const measure = () => setBox(measureSceneBox(palco));
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(palco);
    return () => observer?.disconnect();
  }, [ref, active]);
  return box;
}
