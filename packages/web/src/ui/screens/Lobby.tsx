// Lobby (spec §2.3): código e link da sala, os dois assentos com presença e pronto, o botão "Estou pronto"
// (alterna) e o aviso fixo de W.O. O servidor começa a partida com os dois assentos conectados e prontos.
import { roomLink, type SeatInfo } from '@coringa/protocol';
import { useId, useState } from 'react';
import type { Session } from '../../model/session.ts';
import { copyText } from '../clipboard.ts';
import { Button, Panel, Title } from '../parts.tsx';
import { COPY_FAILED, LINK_COPIED, LOBBY_DROPPED, LOBBY_WO_NOTICE, SHARE_FAILED } from '../text.ts';
import { useSession } from '../useSession.ts';

type Feedback = 'copied' | 'copyFailed' | 'shareFailed' | null;

const FEEDBACK_TEXT = { copied: LINK_COPIED, copyFailed: COPY_FAILED, shareFailed: SHARE_FAILED } as const;

function isAbort(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError';
}

type SeatLike = Pick<SeatInfo, 'nickname' | 'connected' | 'ready'>;

/** O que falta para a partida começar, do ponto de vista de quem olha. */
function waitingText(ready: boolean, opponent: SeatLike | undefined): string {
  if (opponent === undefined) return 'Esperando alguém entrar pelo link.';
  if (!opponent.connected) return `Esperando ${opponent.nickname} voltar.`;
  if (ready && opponent.ready) return 'Começando a partida…';
  if (ready) return `Esperando ${opponent.nickname} marcar pronto.`;
  return 'A partida começa quando os dois marcarem pronto.';
}

export function Lobby({ session }: { session: Session }) {
  const { room, me, status } = useSession(session);
  const id = useId();
  const noteId = `${id}-nota`;
  const playersId = `${id}-jogadores`;
  const [feedback, setFeedback] = useState<Feedback>(null);

  const seats = room?.seats ?? [];
  const mine = seats.find((seat) => seat.playerId === me);
  const others = seats.filter((seat) => seat !== mine);
  const ready = mine?.ready ?? false;

  // Cair no lobby desmarca o pronto (spec 2 §2.3). A nota "você saiu da sala" aparece quando o pronto vai de
  // marcado para desmarcado sem o jogador ter pedido isso. Estado derivado na renderização (sem efeito nem ref):
  // `askedOff` guarda que o jogador mesmo pediu para desmarcar, e a próxima descida do pronto é dele.
  const [prevReady, setPrevReady] = useState(ready);
  const [askedOff, setAskedOff] = useState(false);
  const [dropped, setDropped] = useState(false);
  // Com a conexão caída o pedido pode ter se perdido: o pronto que o servidor desmarcar na volta já não é "de propósito".
  if (askedOff && status === 'reconnecting') setAskedOff(false);
  if (ready !== prevReady) {
    setPrevReady(ready);
    if (ready) setDropped(false);
    else if (askedOff) setAskedOff(false);
    else setDropped(true);
  }

  if (room === null) return null;
  const link = roomLink(window.location.origin, room.code);
  const opponent = others[0];
  const canShare = 'share' in navigator;

  function toggleReady() {
    setAskedOff(ready);
    session.ready(!ready);
  }

  async function copy() {
    setFeedback((await copyText(link)) ? 'copied' : 'copyFailed');
  }

  async function share() {
    try {
      await navigator.share({ title: 'Jogo do Coringa', text: 'Vem jogar o Jogo do Coringa comigo:', url: link });
      setFeedback(null);
    } catch (error) {
      // Fechar a folha sem escolher ninguém não é erro.
      if (!isAbort(error)) setFeedback('shareFailed');
    }
  }

  return (
    <section aria-label="Sala" className="flex flex-col gap-5">
      <Title>Sala de espera</Title>

      <Panel>
        <h2 className="font-madeira text-xl uppercase">{seats.length < 2 ? 'Chame o outro jogador' : 'Convite'}</h2>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">Código da sala</p>
          <p className="font-madeira text-5xl leading-tight tracking-widest">{room.code}</p>
        </div>
        <div>
          <p className="text-sm font-bold uppercase tracking-wide">Link da sala</p>
          <p className="select-all break-all font-bold">{link}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => void copy()}>Copiar link</Button>
          {canShare ? (
            <Button variant="secondary" onClick={() => void share()}>
              Compartilhar
            </Button>
          ) : null}
        </div>
        <div aria-live="polite">{feedback === null ? null : <p className="font-bold">{FEEDBACK_TEXT[feedback]}</p>}</div>
      </Panel>

      <Panel>
        <h2 id={playersId} className="font-madeira text-xl uppercase">
          Jogadores
        </h2>
        <ul aria-labelledby={playersId} className="flex flex-col gap-3">
          {mine ? <SeatItem seat={mine} you /> : null}
          {others.map((seat) => (
            <SeatItem key={seat.playerId} seat={seat} you={false} />
          ))}
          {seats.length < 2 ? (
            <li className="border-4 border-dashed border-tinta px-4 py-3 font-bold">Esperando alguém entrar</li>
          ) : null}
        </ul>
      </Panel>

      <Panel>
        <Button
          aria-pressed={ready}
          aria-describedby={dropped ? noteId : undefined}
          disabled={status === 'reconnecting'}
          variant={ready ? 'secondary' : 'primary'}
          className="flex w-full items-center justify-center gap-2"
          onClick={toggleReady}
        >
          {ready ? <CheckIcon /> : null}
          Estou pronto
        </Button>
        <div aria-live="polite" className="flex flex-col gap-2">
          {dropped ? (
            <p id={noteId} className="font-bold text-vermelho">
              {LOBBY_DROPPED}
            </p>
          ) : null}
          <p>{waitingText(ready, opponent)}</p>
        </div>
      </Panel>

      <p role="note" className="border-4 border-dashed border-tinta bg-papel px-4 py-3 font-bold">
        {LOBBY_WO_NOTICE}
      </p>

      {/* O `leave` com o socket fechado se perde em silêncio; o banner "Reconectando…" do RoomGate explica o porquê. */}
      <Button variant="secondary" disabled={status === 'reconnecting'} onClick={() => session.leave()}>
        Sair da sala
      </Button>
    </section>
  );
}

function SeatItem({ seat, you }: { seat: SeatLike; you: boolean }) {
  return (
    <li className="flex items-center justify-between gap-3 border-4 border-tinta bg-papel px-4 py-3">
      <div className="min-w-0">
        <p className="break-words text-lg font-bold">
          {seat.nickname}
          {you ? <span className="font-normal"> (você)</span> : null}
        </p>
        <p className="flex items-center gap-2 text-sm">
          {/* A forma também muda (cheio ou vazio): o estado não depende só da cor. */}
          <span
            aria-hidden="true"
            className={`inline-block size-3 rounded-full border-2 border-tinta ${seat.connected ? 'bg-capa-oponente' : 'bg-papel'}`}
          />
          {seat.connected ? 'Conectado' : 'Fora da sala'}
        </p>
      </div>
      <p className={`border-2 border-tinta px-2 py-1 text-sm font-bold uppercase ${seat.ready ? 'bg-ouro' : 'bg-papel'}`}>
        {seat.ready ? 'Pronto' : 'Não pronto'}
      </p>
    </li>
  );
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="4">
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  );
}
