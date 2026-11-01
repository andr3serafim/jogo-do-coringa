// A vida e os totais contam até o valor novo na batida do dano (spec §4.1: "a vida desce" espera o evento que a causou).
// A `view` já traz o valor de depois; este hook só decide o que a tela mostra: o número velho até a batida do dano, a
// contagem durante ela e o valor novo em seguida (ou na hora, se não há batida de dano, com movimento reduzido ou no pulo).
import type { PlayerId } from '@coringa/engine';
import { useEffect, useState } from 'react';
import { SCENE_MOMENTS } from '../../model/scene-moments.ts';
import { useAnim } from './context.ts';

/** A vida do perdedor da Exódia escorre de `drainAt` até a rachadura do retrato. */
const DRAIN_MS = SCENE_MOMENTS.EXODIA.crackAt - SCENE_MOMENTS.EXODIA.drainAt;

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
 * chegou com a mesa ainda tocando), vale a de depois menos as mudanças. Os eventos trazem a mudança exata da vida do motor
 * (conferido em 2026-11-01 nas partidas de referência), e o golpe que mata a leva abaixo de 0, como a `view`.
 */
export function useCountedLife(player: PlayerId, value: number, drained = false): { shown: number; target: number } {
  const { life } = useAnim();
  const { playing, done, step, ms, total } = life(player);
  const [before, setBefore] = useState(value);
  const [tween, setTween] = useState<number | null>(null);
  if (!playing && before !== value) setBefore(value);
  const start = before + total === value ? before : value - total;
  const from = start + done;
  // A Exódia leva a vida do perdedor a zero (sub-projeto 6 §7.3), escorrendo até a rachadura do retrato.
  const to = drained ? 0 : from + step;
  const span = drained ? DRAIN_MS : ms;

  useEffect(() => {
    if (!playing || from === to) return;
    const begin = performance.now();
    let frame = 0;
    const tick = () => {
      const t = Math.min(1, (performance.now() - begin) / Math.max(1, span));
      setTween(Math.round(from + (to - from) * t));
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      setTween(null);
    };
  }, [playing, from, to, span]);

  if (!playing) return drained ? { shown: 0, target: 0 } : { shown: value, target: value };
  return { shown: tween ?? from, target: to };
}
