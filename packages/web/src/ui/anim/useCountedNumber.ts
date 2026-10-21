// A vida e os totais contam até o valor novo na batida do dano (spec §4.1: "a vida desce" espera o evento que a causou).
// A `view` já traz o valor de depois; este hook só decide o que a tela mostra: o número velho até a batida do dano, a
// contagem durante ela e o valor novo em seguida (ou na hora, se não há batida de dano, com movimento reduzido ou no pulo).
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
