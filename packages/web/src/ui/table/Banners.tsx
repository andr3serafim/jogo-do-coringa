// Os avisos de cima da mesa (spec §3.9, §6.2): "Reconectando…", com a mesa à vista e os controles desligados (quem desliga é
// a `PlayTable`), e o aviso de que o oponente caiu, com a contagem até o W.O. a partir de `woAt`. A volta dele apaga o aviso
// e a sessão registra "Duda voltou" no histórico.
//
// `woAt` é um instante do relógio do servidor, então a contagem passa pelo `remainingMs` da sessão (que conhece o
// deslocamento do relógio), com um prazo de mentira só para carregar o instante. O que o leitor de tela ouve sai de UMA
// região `role="status"` que fica sempre montada (vazia quando não há aviso) e só troca de texto: uma região criada já
// preenchida pode não ser lida, e uma por ramo anunciaria duas vezes quando o `woAt` chega. A contagem visível não é região
// viva (o leitor de tela leria a cada segundo); os avisos visíveis ficam escondidos dele para não repetir o texto.
import type { Deadline } from '@coringa/protocol';
import { useEffect, useState } from 'react';
import { droppedAnnouncement, droppedText, mmss, RECONNECTING_TEXT, SLOW_RETRY_TEXT } from '../../model/copy.ts';
import type { SessionSnapshot } from '../../model/session.ts';
import { TICK_MS } from './useClock.ts';

const NOTICE = 'border-4 border-tinta px-3 py-2 font-bold';

/** O aviso de conexão: serve à mesa e ao lobby. Na mesa (`silent`), o leitor de tela ouve a região fixa dos `Banners`. */
export function ConnectionBanner({ slowRetry, silent = false }: { slowRetry: boolean; silent?: boolean }) {
  return (
    <p role={silent ? undefined : 'status'} aria-hidden={silent || undefined} className={`${NOTICE} bg-ouro`}>
      {slowRetry ? SLOW_RETRY_TEXT : RECONNECTING_TEXT}
    </p>
  );
}

export interface BannersProps {
  snapshot: SessionSnapshot;
  /** Tempo que falta para um instante do servidor (`Session.remainingMs`). */
  remainingMs: (deadline: Deadline) => number;
}

export function Banners({ snapshot, remainingMs }: BannersProps) {
  const { status, slowRetry, room } = snapshot;
  const me = snapshot.state?.view.me ?? snapshot.me;
  const seat = room?.status === 'PLAYING' ? room.seats.find((candidate) => candidate.playerId !== me) : undefined;
  const dropped = seat && !seat.connected ? seat : null;
  const spoken = [
    status === 'reconnecting' ? (slowRetry ? SLOW_RETRY_TEXT : RECONNECTING_TEXT) : null,
    dropped ? (dropped.woAt === undefined ? droppedText(dropped.nickname, null) : droppedAnnouncement(dropped.nickname)) : null,
  ]
    .filter((text) => text !== null)
    .join(' ');
  return (
    <>
      <p role="status" className="sr-only">
        {spoken}
      </p>
      {status === 'reconnecting' ? <ConnectionBanner slowRetry={slowRetry} silent /> : null}
      {dropped ? <DroppedBanner name={dropped.nickname} woAt={dropped.woAt} remainingMs={remainingMs} /> : null}
    </>
  );
}

function DroppedBanner({
  name,
  woAt,
  remainingMs,
}: {
  name: string;
  woAt: number | undefined;
  remainingMs: (deadline: Deadline) => number;
}) {
  // A contagem se redesenha de tempos em tempos; o relógio de verdade é o do servidor.
  const [, setTick] = useState(0);
  useEffect(() => {
    if (woAt === undefined) return;
    const id = setInterval(() => setTick((tick) => tick + 1), TICK_MS);
    return () => clearInterval(id);
  }, [woAt]);

  const seconds = woAt === undefined ? null : Math.ceil(remainingMs({ kind: 'TURN', at: woAt, players: [] }) / 1000);
  return (
    <div aria-hidden="true" className={`${NOTICE} bg-papel`}>
      <p data-numero className="font-texto tabular-nums">
        {droppedText(name, seconds === null ? null : mmss(seconds))}
      </p>
    </div>
  );
}
