// A vida e os totais contam até o valor novo na batida do dano (spec §4.1: "a vida desce" espera o evento que a causou).
// A `view` já traz o valor de depois; este hook só decide o que a tela mostra: o número velho até a batida do dano, a
// contagem durante ela e o valor novo em seguida (ou na hora, se não há batida de dano, com movimento reduzido ou no pulo).
import type { PlayerId } from '@coringa/engine';
import { useEffect, useState } from 'react';
import { useAnim } from './context.ts';

export function useCountedNumber(value: number): number {
  const { count, countMs } = useAnim();
  // O número de antes: o último que a mesa mostrou parada.
  const [before, setBefore] = useState(value);
  const [tween, setTween] = useState<number | null>(null);
  if (count === 'idle' && before !== value) setBefore(value);

  useEffect(() => {
    if (count !== 'count' || before === value) return;
    const start = performance.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / Math.max(1, countMs));
      setTween(Math.round(before + (value - before) * t));
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      setTween(null);
    };
  }, [count, countMs, before, value]);

  if (count === 'idle') return value;
  if (count === 'hold') return before;
  return tween ?? before;
}

/**
 * A vida de `player` como a tela mostra (decisoes.md 2026-11-01 (1)): cada batida que mexe nela conta da vida em que a anterior
 * parou até a próxima (o golpe desce, a cura sobe junto com o "+N"), e as outras batidas a deixam parada. `target` é onde a
 * batida de agora a leva: abaixo de `shown`, um golpe (o rastro espera e escorre até lá); acima, uma cura (o trecho verde).
 *
 * A vida de antes é a última que a mesa mostrou parada. Se ela não fecha com as mudanças da linha do tempo (um `state` novo
 * chegou com a mesa ainda tocando), vale a de depois menos as mudanças. Nunca abaixo de 0: o golpe que mata conta só até 0.
 */
export function useCountedLife(player: PlayerId, value: number): { shown: number; target: number } {
  const { life } = useAnim();
  const { playing, done, step, ms, total } = life(player);
  const [before, setBefore] = useState(value);
  const [tween, setTween] = useState<number | null>(null);
  if (!playing && before !== value) setBefore(value);
  const start = Math.max(0, before + total) === value ? before : value - total;
  const from = Math.max(0, start + done);
  const to = Math.max(0, start + done + step);

  useEffect(() => {
    if (!playing || from === to) return;
    const begin = performance.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - begin) / Math.max(1, ms));
      setTween(Math.round(from + (to - from) * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setTween(null);
    };
  }, [playing, from, to, ms]);

  if (!playing) return { shown: value, target: value };
  return { shown: tween ?? from, target: to };
}
