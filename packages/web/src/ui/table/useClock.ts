// O relógio da mesa (spec §3.8, §7): a face (segundos, urgência, esgotado) e o anúncio para leitor de tela. O tempo vem do
// servidor (`remainingMs`); o hook só decide quando redesenhar. A face é calculada ao desenhar e o hook redesenha quando
// o que se vê muda (o segundo, a urgência, o "esgotado" ou o turno pausado), nunca a cada batida.
//
// O anúncio é do próprio jogador e acontece no começo do prazo e ao cruzar 10 s e 5 s (`clockAnnouncement`). O "começo" vale
// para cada prazo novo (outro `kind` ou outro `at`), e o texto sai por uma região viva que mora fora do relógio, para um
// mesmo texto repetido ainda ser anunciado: cada anúncio é um nó novo (`id`).
//
// Sem prazo (o treino não tem relógio, spec §2.6) o relógio nunca anuncia, e a vez do jogador sairia calada. Para isso o hook
// recebe a `cue` (`turnCue`): quando não há prazo e chega a sua vez (época nova), a mesma região anuncia "Sua vez" (ou
// "Sua reação" etc.), sem os segundos. Com prazo a `cue` é ignorada, e o anúncio do relógio não se repete.
import type { PlayerId } from '@coringa/engine';
import type { Deadline } from '@coringa/protocol';
import { useEffect, useRef, useState } from 'react';
import { clockAnnouncement, clockFace, type ClockFace, type TurnCue } from '../../model/clock.ts';
import { clockAnnouncementText, turnCueText } from '../../model/copy.ts';

/** Quanto tempo o hook espera para olhar o relógio de novo: o bastante para nunca pular um segundo. */
export const TICK_MS = 250;

export interface ClockLive {
  /** Muda a cada anúncio; é a `key` do nó da região viva. */
  id: number;
  text: string;
}

/** Um prazo é o mesmo enquanto o tipo, o instante e de quem ele é forem os mesmos. */
export const deadlineKey = (deadline: Deadline | null): string | null =>
  deadline === null ? null : `${deadline.kind}:${deadline.at}:${deadline.players.join(',')}`;

/** O que a face mostra, numa string: se ela não muda, não há o que redesenhar. */
const shown = (face: ClockFace | null): string =>
  face === null ? '' : `${face.seconds}|${face.urgent}|${face.expired}|${face.pausedTurnSeconds}`;

export function useClock(
  deadline: Deadline | null,
  remainingMs: (deadline: Deadline) => number,
  me: PlayerId,
  pausedTurnMs: number | undefined,
  cue: TurnCue | null = null,
): { face: ClockFace | null; live: ClockLive } {
  const [, setTick] = useState(0);
  const [live, setLive] = useState<ClockLive>({ id: 0, text: '' });
  const last = useRef<{ key: string | null; seconds: number | null; shown: string; cue: string | null }>({
    key: null,
    seconds: null,
    shown: '',
    cue: null,
  });
  // Primitivas nas dependências: a `cue` é um objeto novo a cada desenho.
  const cueKey = cue?.key ?? null;
  const cueKind = cue?.kind ?? null;

  useEffect(() => {
    const check = () => {
      const key = deadlineKey(deadline);
      const face = clockFace(deadline, deadline === null ? 0 : remainingMs(deadline), me, pausedTurnMs);
      const before = last.current;
      const announcement = clockAnnouncement(key !== null && before.key === key ? before.seconds : null, face);
      // A vez sem prazo só conta quando não há prazo: com ele, quem anuncia é o relógio.
      const turn = deadline === null ? cueKey : null;
      last.current = { key, seconds: face?.seconds ?? null, shown: shown(face), cue: turn };
      if (announcement !== null && face !== null) {
        const text = clockAnnouncementText(face.kind, announcement, face.seconds);
        setLive((current) => ({ id: current.id + 1, text }));
      } else if (key !== before.key) {
        // Prazo novo que não é meu (ou nenhum prazo): o anúncio velho não vale mais.
        setLive((current) => (current.text === '' ? current : { id: current.id + 1, text: '' }));
      }
      if (turn !== before.cue && deadline === null) {
        if (turn !== null && cueKind !== null) {
          const text = turnCueText(cueKind);
          setLive((current) => ({ id: current.id + 1, text }));
        } else {
          // A vez passou ao oponente: o anúncio velho não vale mais.
          setLive((current) => (current.text === '' ? current : { id: current.id + 1, text: '' }));
        }
      }
      if (last.current.shown !== before.shown) setTick((tick) => tick + 1);
    };
    const first = setTimeout(check, 0);
    const id = setInterval(check, TICK_MS);
    return () => {
      clearTimeout(first);
      clearInterval(id);
    };
  }, [deadline, remainingMs, me, pausedTurnMs, cueKey, cueKind]);

  return { face: clockFace(deadline, deadline === null ? 0 : remainingMs(deadline), me, pausedTurnMs), live };
}

/**
 * O prazo do jogador venceu (spec §3.8)? O servidor injeta o estouro em `at + 500 ms`; até chegar o `state`, a mesa mostra
 * "Tempo esgotado" e mantém os controles desligados. Um só `setTimeout` por prazo, sem batida: o hook só redesenha na virada.
 */
export function useDeadlineExpired(deadline: Deadline | null, remainingMs: (deadline: Deadline) => number): boolean {
  const key = deadlineKey(deadline);
  const [expiredKey, setExpiredKey] = useState<string | null>(null);

  useEffect(() => {
    if (deadline === null || key === null) return;
    const id = setTimeout(() => setExpiredKey(key), remainingMs(deadline));
    return () => clearTimeout(id);
  }, [deadline, key, remainingMs]);

  return key !== null && expiredKey === key;
}
