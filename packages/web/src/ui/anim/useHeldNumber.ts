// Um número que muda NA batida do evento que o causou, e não quando o `state` chega (a pressão, spec §4.2): o número
// velho até a batida, o valor novo com destaque durante ela, e o valor novo parado depois (ou no pulo). A `view` já tem o
// valor de depois; isto só decide o que a tela mostra. Sem contagem: o número troca de uma vez, só a cor destaca.
import { useState } from 'react';
import type { CountPhase } from './context.ts';

export function useHeldNumber(value: number, phase: CountPhase): { shown: number; highlight: boolean } {
  // O número de antes: o último que a mesa mostrou parado.
  const [before, setBefore] = useState(value);
  if (phase === 'idle' && before !== value) setBefore(value);
  return { shown: phase === 'hold' ? before : value, highlight: phase === 'count' };
}
