// Os avisos de cima da mesa (spec §3.9, §6.2): "Reconectando…", com a mesa à vista e os controles desligados (quem desliga é
// a `PlayTable`), e o aviso de que o oponente caiu, com a contagem até o W.O. a partir de `woAt`. A volta dele apaga o aviso
// e a sessão registra "Duda voltou" no histórico.
//
// `woAt` é um instante do relógio do servidor, então a contagem passa pelo `remainingMs` da sessão (que conhece o
// deslocamento do relógio), com um prazo de mentira só para carregar o instante. A contagem não é uma região viva (o leitor
// de tela leria a cada segundo): o que se anuncia é uma frase fixa, uma vez.
import type { Deadline } from '@coringa/protocol';
import { useEffect, useState } from 'react';
import { droppedAnnouncement, droppedText, mmss, RECONNECTING_TEXT, SLOW_RETRY_TEXT } from '../../model/copy.ts';
import type { SessionSnapshot } from '../../model/session.ts';
import { TICK_MS } from './useClock.ts';

const NOTICE = 'border-4 border-tinta px-3 py-2 font-bold';

/** O aviso de conexão: serve à mesa e ao lobby. */
export function ConnectionBanner({ slowRetry }: { slowRetry: boolean }) {
  return (
    <p role="status" className={`${NOTICE} bg-ouro`}>
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
  const theirs = room?.status === 'PLAYING' ? room.seats.find((seat) => seat.playerId !== me) : undefined;
  return (
    <>
      {status === 'reconnecting' ? <ConnectionBanner slowRetry={slowRetry} /> : null}
      {theirs && !theirs.connected ? (
        <DroppedBanner name={theirs.nickname} woAt={theirs.woAt} remainingMs={remainingMs} />
      ) : null}
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

  if (woAt === undefined) {
    return (
      <p role="status" className={`${NOTICE} bg-papel`}>
        {droppedText(name, null)}
      </p>
    );
  }
  const seconds = Math.ceil(remainingMs({ kind: 'TURN', at: woAt, players: [] }) / 1000);
  return (
    <div className={`${NOTICE} bg-papel`}>
      <p aria-hidden="true" data-numero className="font-texto tabular-nums">
        {droppedText(name, mmss(seconds))}
      </p>
      <p role="status" className="sr-only">
        {droppedAnnouncement(name)}
      </p>
    </div>
  );
}
