// A carta que a compra traz voa do monte (sub-projeto 6 §8, fatia 5, E6): na montagem, o elemento mede o número do monte (`[data-monte]`) e
// ele mesmo, e anima o `translate` do centro do monte até o lugar dele e o `scale` de 0,6 a 1, pela Web Animations (o `transform` da carta é
// do Motion). As leituras vêm antes de qualquer `animate`, para a chegada não pagar mais de um cálculo de layout. O voo apaga e acende a
// carta: antes do atraso ela espera no monte, e apagada, mesmo que já estivesse montada (o `initial` do Motion só vale na montagem). Com
// `fade` e sem voo, só a opacidade. Com `onlyNew`, só voa o elemento que nasceu com o atraso: um verso que já estava na mão não sai do lugar.
import { useEffect, useRef, type RefObject } from 'react';
import { TABLE_MOTION } from '../../model/table-motion.ts';

export interface DealIn {
  /** Voa do monte (sem o monte na tela, ou com movimento reduzido, quem chama passa `false`). */
  fly: boolean;
  /** Esmaece, mesmo sem voo (o elemento não é do Motion). */
  fade: boolean;
  /** Só o elemento montado agora: a compra conta as numéricas que vão para o painel do outro, e a mão dele não diz quais versos são novos. */
  onlyNew?: boolean;
}

export function useDealIn(ref: RefObject<HTMLElement | null>, delaySec: number | null, { fly, fade, onlyNew = false }: DealIn): void {
  const bornWith = useRef(delaySec);
  useEffect(() => {
    const el = ref.current;
    if (el === null || delaySec === null || (!fly && !fade)) return;
    if (onlyNew && bornWith.current !== delaySec) return;
    const delay = delaySec * 1000;
    const monte = fly ? el.closest('[data-palco]')?.querySelector('[data-monte]') : null;
    const from = monte?.getBoundingClientRect() ?? null;
    const to = from === null ? null : el.getBoundingClientRect();
    const moves: (Animation | undefined)[] = [];
    if (from !== null && to !== null) {
      const dx = from.left + from.width / 2 - (to.left + to.width / 2);
      const dy = from.top + from.height / 2 - (to.top + to.height / 2);
      moves.push(
        el.animate?.(
          [
            { translate: `${dx.toFixed(1)}px ${dy.toFixed(1)}px`, scale: '0.6', opacity: 0 },
            { opacity: 1, offset: 0.3 },
            { translate: '0 0', scale: '1', opacity: 1 },
          ],
          { duration: TABLE_MOTION.dealFlightMs, delay, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)', fill: 'backwards' },
        ),
      );
    } else if (fade) moves.push(el.animate?.([{ opacity: 0 }, { opacity: 1 }], { duration: 250, delay, fill: 'backwards' }));
    return () => moves.forEach((move) => move?.cancel());
  }, [ref, delaySec, fly, fade, onlyNew]);
}
