// A faixa central de tinta (spec §3.1 e §10.1): o que é dos dois jogadores. Rodada e tipo, de quem é a vez, o
// relógio, a Pressão da mesa (com o aviso de anti-travamento), a iniciativa, o monte e o cemitério. Os números
// de jogo usam a fonte de texto com algarismos tabulares e nenhuma textura (spec §10.7); a textura só vai no
// título da rodada. A urgência do relógio, os anúncios e o "tempo esgotado" são da Tarefa 21.
import type { PlayerId, PlayerView } from '@coringa/engine';
import type { Deadline } from '@coringa/protocol';
import { useEffect, useState } from 'react';
import { clockFace } from '../../model/clock.ts';
import { zoneKey } from '../../model/marks.ts';
import { Card, cardName } from '../cards/Card.tsx';
import { useTableUi } from './context.ts';
import {
  graveyardName,
  initiativeText,
  stallWarning,
  streakText,
  turnText,
  type TableNames,
} from './labels.ts';
import { NovoChip } from './NovoChip.tsx';

export interface CenterBandProps {
  view: PlayerView;
  names: TableNames;
  deadline: Deadline | null;
  /** Tempo restante do prazo pelo relógio do servidor. */
  remainingMs: (deadline: Deadline) => number;
  /** Tempo do turno congelado durante a janela de reação. */
  pausedTurnMs?: number;
  onOpenGraveyard?: () => void;
}

/** Quanto tempo a face do relógio espera para ser redesenhada: o bastante para nunca pular um segundo. */
const TICK_MS = 250;

export function CenterBand({ view, names, deadline, remainingMs, pausedTurnMs, onOpenGraveyard }: CenterBandProps) {
  const ui = useTableUi();
  const { noDamageStreak } = view;
  const untilStall = view.config.antiStallRounds - noDamageStreak;
  const pressureMarked = ui.zones.has('pressure');
  const seenPressure = ui.onSeen && pressureMarked ? () => ui.onSeen?.(zoneKey('pressure')) : undefined;

  return (
    <section
      aria-label="Situação da rodada"
      className="flex flex-none flex-wrap items-center gap-x-2.5 gap-y-1 bg-tinta px-3 py-1.5 text-papel pc:min-h-[76px] pc:gap-x-7 pc:px-6 pc:py-1"
    >
      <div className="flex min-w-0 max-w-[8.5rem] flex-col pc:max-w-[13rem]">
        <h2 className="textura font-madeira text-[17px] uppercase leading-[1.1] tracking-[0.02em] pc:text-2xl">
          Rodada {view.round}
        </h2>
        <p className="text-xs font-semibold leading-tight text-ouro pc:text-sm">{turnText(view, names)}</p>
      </div>

      {deadline ? <Clock deadline={deadline} remainingMs={remainingMs} me={view.me} pausedTurnMs={pausedTurnMs} /> : null}

      {/* No celular, a pressão e a iniciativa formam a segunda linha da faixa (`order-last`); no PC, ficam na linha única. */}
      <div
        className="order-last flex min-w-0 items-baseline gap-x-1.5 pc:order-none pc:flex-col pc:items-start pc:gap-0"
        onPointerEnter={seenPressure}
        onPointerDown={seenPressure}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">Pressão da mesa</span>
        <span className="flex items-baseline gap-1.5">
          <span data-numero className="font-texto text-lg font-extrabold leading-tight tabular-nums text-ouro pc:text-xl">
            +{view.pressure}
          </span>
          {noDamageStreak > 0 ? (
            <span className="font-texto text-[11px] leading-tight tabular-nums pc:text-[15px]">{streakText(noDamageStreak)}</span>
          ) : null}
        </span>
        {pressureMarked ? <NovoChip /> : null}
      </div>

      <div className="order-last min-w-0 text-xs leading-tight pc:order-none pc:text-[15px]">
        <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.12em] pc:mr-0 pc:block pc:text-[11px]">
          Iniciativa
        </span>
        <span>{initiativeText(view, names)}</span>
      </div>

      {untilStall <= 2 && untilStall > 0 ? (
        <p className="order-last basis-full text-xs font-bold leading-tight text-ouro pc:text-sm">
          {stallWarning(untilStall)}
        </p>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <div className="flex flex-col items-center">
          <span className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">Monte</span>
          <span data-numero className="font-texto text-[15px] font-bold tabular-nums pc:text-xl">
            {view.deckCount}
          </span>
        </div>
        <Graveyard view={view} onOpen={onOpenGraveyard} />
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------

function Clock({
  deadline,
  remainingMs,
  me,
  pausedTurnMs,
}: {
  deadline: Deadline;
  remainingMs: (deadline: Deadline) => number;
  me: PlayerId;
  pausedTurnMs: number | undefined;
}) {
  // O relógio é do servidor; o componente só se redesenha de tempos em tempos para a face acompanhar.
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((tick) => tick + 1), TICK_MS);
    return () => clearInterval(id);
  }, []);
  const face = clockFace(deadline, remainingMs(deadline), me, pausedTurnMs);
  if (face === null) return null;
  return (
    <div
      role="timer"
      aria-label="Tempo do prazo"
      className="grid size-12 flex-none place-items-center rounded-full border-4 border-ouro font-texto text-lg font-extrabold leading-none tabular-nums pc:size-[60px] pc:text-[22px]"
    >
      {face.seconds}
    </div>
  );
}

function Graveyard({ view, onOpen }: { view: PlayerView; onOpen: (() => void) | undefined }) {
  const { marked, onSeen } = useTableUi();
  const { graveyard } = view;
  const top = graveyard.at(-1) ?? null;
  const news = graveyard.filter((card) => marked.has(card.id));
  const seen = onSeen && news.length > 0 ? () => news.forEach((card) => onSeen(card.id)) : undefined;
  const name = graveyardName(graveyard.length, top === null ? null : cardName(top));
  const content = (
    <>
      {top ? (
        // A carta de cima é menor na faixa do celular: o tamanho "mini" lê estas duas variáveis.
        <span className="flex [--mini-h:36px] [--mini-w:26px] pc:[--mini-h:54px] pc:[--mini-w:38px]">
          <Card card={top} size="mini" grave />
        </span>
      ) : (
        <span aria-hidden="true" className="h-9 w-[26px] rounded-[3px] border-[1.5px] border-dashed border-papel/50 pc:h-[54px] pc:w-[38px]" />
      )}
      <span className="flex flex-col items-start">
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">Cemitério</span>
        {top ? (
          <span data-numero className="font-texto text-[15px] font-bold leading-tight tabular-nums pc:text-xl">
            {graveyard.length}
          </span>
        ) : (
          <span className="text-xs">vazio</span>
        )}
        {news.length > 0 ? <NovoChip /> : null}
      </span>
    </>
  );
  const box = 'flex min-h-11 items-center gap-1.5 border-[1.5px] border-papel/50 px-1.5 py-0.5 pc:min-h-[62px] pc:gap-2.5 pc:px-2.5';
  if (onOpen) {
    return (
      <button
        type="button"
        aria-label={news.length > 0 ? `${name}, novo` : name}
        className={`${box} bg-transparent text-papel`}
        onClick={onOpen}
        onPointerEnter={seen}
        onPointerDown={seen}
      >
        {content}
      </button>
    );
  }
  return (
    <div className={box} onPointerEnter={seen} onPointerDown={seen}>
      {content}
    </div>
  );
}
