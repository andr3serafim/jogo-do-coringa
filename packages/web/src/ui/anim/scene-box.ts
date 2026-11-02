// A caixa das cenas refeitas no sub-projeto 6 (§7, "Gramática comum"): onde a faixa da cena fica (a área dos campos, entre o
// placar e a mão), onde o placar acaba (a cortina escurece só daí para baixo: o placar fica à vista para ver a vida cair) e onde
// está o centro de cada retrato (o feixe do Ataque Absoluto vai até o do alvo; o escudo da Defesa encolhe até o do dono). Tudo
// relativo ao `[data-palco]`, medido quando a mesa monta, quando uma cena começa e quando o palco muda de tamanho. As cenas de
// campo (a Devastação) pedem a fileira na hora, depois de rolá-la para a vista (`revealRow`).
import type { PlayerId, RowName } from '@coringa/engine';
import { useEffect, useState, type RefObject } from 'react';
import { rowKey } from '../../model/effects.ts';

export interface ScenePoint {
  x: number;
  y: number;
}

export interface SceneRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Uma fileira medida: o retângulo dela, o de cada vaga (cartas e vagas vazias, em ordem) e o do campo do dono. */
export interface SceneRow {
  rect: SceneRect;
  slots: SceneRect[];
  field: SceneRect;
}

export interface SceneBox {
  /** A faixa da cena: a área dos campos (`[data-campos]`). */
  band: { x: number; y: number; w: number; h: number };
  /** Onde o placar (`[data-placar]`) acaba. */
  hudBottom: number;
  /** O centro do retrato de cada lado (`[data-retrato]`). */
  portrait: Record<'voce' | 'oponente', ScenePoint>;
  /** Mede a fileira de `player`; `null` sem ela. */
  row(player: PlayerId, row: RowName): SceneRow | null;
  /** Mede o espelho pequeno da zona "Reflect ativo" de `player`; `null` sem ele. */
  reflectZone(player: PlayerId): SceneRect | null;
  /** Mede o cemitério; `null` sem ele. */
  graveyard(): SceneRect | null;
}

/** A folga em volta da fileira rolada: o tremor da cena não a empurra para fora da janela. */
const REVEAL_MARGIN = 12;

const rowSelector = (player: PlayerId, row: RowName): string => `[data-fileira="${rowKey(player, row)}"]`;

/**
 * Rola os campos até a fileira ficar inteira à vista, na hora (sem rolagem suave) e só na vertical. No celular em pé os campos rolam
 * por dentro, e a fileira atingida pode estar fora da janela; no PC, nada muda.
 */
export function revealRow(palco: HTMLElement, player: PlayerId, row: RowName): void {
  const fields = palco.querySelector('[data-campos]');
  const target = palco.querySelector(rowSelector(player, row));
  if (fields === null || target === null) return;
  const port = fields.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  if (rect.top < port.top) fields.scrollTop -= port.top - rect.top + REVEAL_MARGIN;
  else if (rect.bottom > port.bottom) fields.scrollTop += rect.bottom - port.bottom + REVEAL_MARGIN;
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
  const relative = (el: Element): SceneRect => {
    const rect = el.getBoundingClientRect();
    return { x: rect.left - origin.left, y: rect.top - origin.top, w: rect.width, h: rect.height };
  };
  return {
    band: { x: fields.left - origin.left, y: fields.top - origin.top, w: fields.width, h: fields.height },
    hudBottom: placar.getBoundingClientRect().bottom - origin.top,
    portrait: { voce: center('voce'), oponente: center('oponente') },
    row: (player, row) => {
      const target = palco.querySelector(rowSelector(player, row));
      const field = palco.querySelector(`[data-campo="${player}"]`);
      if (target === null || field === null) return null;
      return { rect: relative(target), slots: [...target.querySelectorAll('ul > li:not([data-desolacao])')].map(relative), field: relative(field) };
    },
    reflectZone: (player) => {
      const mark = palco.querySelector(`[data-espelho-zona="${player}"]`);
      return mark === null ? null : relative(mark);
    },
    graveyard: () => {
      const pile = palco.querySelector('[data-cemiterio]');
      return pile === null ? null : relative(pile);
    },
  };
}

/**
 * A caixa medida já na montagem e de novo quando `active` liga (uma cena começa) ou o palco muda de tamanho. Medir só no começo da
 * cena deixaria a primeira cena sem caixa por um quadro, e ela cairia no painel de antes. `ref` é um elemento dentro do palco.
 */
export function useSceneBox(ref: RefObject<HTMLElement | null>, active: boolean): SceneBox | null {
  const [box, setBox] = useState<SceneBox | null>(null);
  useEffect(() => {
    const palco = ref.current?.closest<HTMLElement>('[data-palco]') ?? null;
    if (palco === null) return;
    const measure = () => setBox(measureSceneBox(palco));
    measure();
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    observer?.observe(palco);
    return () => observer?.disconnect();
  }, [ref, active]);
  return box;
}
