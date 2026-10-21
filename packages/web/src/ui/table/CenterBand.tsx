// A faixa central de tinta (spec §3.1 e §10.1): o que é dos dois jogadores. Rodada e tipo, de quem é a vez, o
// relógio, a Pressão da mesa (com o aviso de anti-travamento), a iniciativa, o monte e o cemitério. Os números
// de jogo usam a fonte de texto com algarismos tabulares e nenhuma textura (spec §10.7); a textura só vai no
// título da rodada. O relógio (spec §3.8, §10.3): em urgência (últimos 5 s) o disco fica vermelho, com o número em papel e o
// anel mais grosso, por cor e por forma, e nunca pisca; na janela de reação ele é grande; esgotado, diz "Tempo esgotado".
// Os anúncios para leitor de tela saem por uma região viva escondida que mora aqui, fora do relógio. No treino (spec §2.6) não há
// prazo: no lugar do relógio a faixa diz "Treino, sem relógio", e a mesma região anuncia a vez do jogador (`turn`).
import type { PlayerView } from '@coringa/engine';
import type { Deadline } from '@coringa/protocol';
import type { ClockFace, TurnCue } from '../../model/clock.ts';
import { CLOCK_LABEL, CLOCK_URGENT_LABEL, pausedTurnText, TIMES_UP_TEXT, TRAINING_BAND_TEXT } from '../../model/copy.ts';
import { zoneKey } from '../../model/marks.ts';
import * as m from 'motion/react-m';
import { INITIATIVE_ID } from '../../model/effects.ts';
import { useAnim } from '../anim/context.ts';
import { useHeldNumber } from '../anim/useHeldNumber.ts';
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
import { useClock } from './useClock.ts';

export interface CenterBandProps {
  view: PlayerView;
  names: TableNames;
  deadline: Deadline | null;
  /** Tempo restante do prazo pelo relógio do servidor. */
  remainingMs: (deadline: Deadline) => number;
  /** Tempo do turno congelado durante a janela de reação. */
  pausedTurnMs?: number;
  /** A vez do jogador, para o anúncio quando não há prazo (o treino não tem relógio). */
  turn?: TurnCue | null;
  /** Treino contra o bot: no lugar do relógio, a faixa diz que não há. */
  training?: boolean;
  onOpenGraveyard?: () => void;
}

export function CenterBand({
  view,
  names,
  deadline,
  remainingMs,
  pausedTurnMs,
  turn = null,
  training = false,
  onOpenGraveyard,
}: CenterBandProps) {
  const ui = useTableUi();
  const { noDamageStreak } = view;
  const untilStall = view.config.antiStallRounds - noDamageStreak;
  const pressureMarked = ui.zones.has('pressure');
  const seenPressure = ui.onSeen && pressureMarked ? () => ui.onSeen?.(zoneKey('pressure')) : undefined;
  const { face, live } = useClock(deadline, remainingMs, view.me, pausedTurnMs, turn);
  // O número da pressão muda NA batida do `PressureChanged`, com destaque (spec §4.2).
  const anim = useAnim();
  const pressure = useHeldNumber(view.pressure, anim.pressure);

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

      {/* A região viva dos anúncios fica sempre montada: uma região criada já preenchida pode não ser lida. */}
      <div aria-live="assertive" aria-atomic="true" data-anuncio className="sr-only">
        {live.text === '' ? null : <span key={live.id}>{live.text}</span>}
      </div>

      {face ? (
        <ClockBlock face={face} />
      ) : training ? (
        // Sem relógio, a faixa diz por quê, no lugar dele. Não é região viva: o anúncio é o da vez, acima.
        <p className="max-w-[6.5rem] text-[11px] font-bold uppercase leading-tight tracking-[0.12em] text-ouro pc:max-w-none pc:text-xs">
          {TRAINING_BAND_TEXT}
        </p>
      ) : null}

      {/* No celular, a pressão e a iniciativa formam a segunda linha da faixa (`order-last`); no PC, ficam na linha única. */}
      <div
        className="order-last flex min-w-0 items-baseline gap-x-1.5 pc:order-none pc:flex-col pc:items-start pc:gap-0"
        onPointerEnter={seenPressure}
        onPointerDown={seenPressure}
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">Pressão da mesa</span>
        <span className="flex items-baseline gap-1.5">
          <span
            data-numero
            data-destaque={pressure.highlight ? 'true' : undefined}
            className={`font-texto text-lg font-extrabold leading-tight tabular-nums pc:text-xl ${pressure.highlight ? 'bg-ouro px-1 text-tinta' : 'text-ouro'}`}
          >
            +{pressure.shown}
          </span>
          {noDamageStreak > 0 ? (
            <span className="font-texto text-[11px] leading-tight tabular-nums pc:text-[15px]">{streakText(noDamageStreak)}</span>
          ) : null}
        </span>
        {pressureMarked ? <NovoChip /> : null}
      </div>

      <div className="order-last flex min-w-0 items-center gap-1.5 pc:order-none">
        <InitiativeMark mine={view.initiative === view.me} />
        <div className="min-w-0 text-xs leading-tight pc:text-[15px]">
          <span className="mr-1.5 text-[10px] font-bold uppercase tracking-[0.12em] pc:mr-0 pc:block pc:text-[11px]">
            Iniciativa
          </span>
          <span>{initiativeText(view, names)}</span>
        </div>
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

/**
 * A marca da iniciativa (spec §4.2): um losango ouro que troca de lado, em cima para o oponente e embaixo para você (como
 * a mesa). É só enfeite do texto ao lado, que diz de quem é; o losango se mexe na batida do `InitiativeChanged`.
 */
function InitiativeMark({ mine }: { mine: boolean }) {
  const anim = useAnim();
  const marker = (
    <m.span
      key={anim.markOf(INITIATIVE_ID)}
      layoutId={INITIATIVE_ID}
      layoutDependency={anim.layoutKey}
      transition={{
        layout: { delay: anim.delayOf(INITIATIVE_ID), duration: anim.instant(INITIATIVE_ID) ? 0 : 0.3, ease: 'easeInOut' },
      }}
      className="block size-2.5 rotate-45 bg-ouro"
    />
  );
  return (
    <span
      aria-hidden="true"
      data-iniciativa={mine ? 'voce' : 'oponente'}
      className="flex h-6 w-3.5 flex-none flex-col justify-between border-l-2 border-papel/50 pl-[3px]"
    >
      <span className="size-2.5">{mine ? null : marker}</span>
      <span className="size-2.5">{mine ? marker : null}</span>
    </span>
  );
}

const DISC_SMALL = 'size-12 text-lg pc:size-[60px] pc:text-[22px]';
/** Na janela de reação o prazo é de 8 s e a decisão é urgente: o relógio cresce. */
const DISC_BIG = 'size-16 text-3xl pc:size-[72px] pc:text-4xl';

/**
 * O relógio e o que vem sob ele. Urgência por cor e por forma (disco vermelho, número em papel, anel de 7 px no lugar de
 * 4 px) e sem animação nenhuma. Os números ficam fora da textura (spec §10.7).
 */
function ClockBlock({ face }: { face: ClockFace }) {
  const size = face.kind === 'REACTION' ? DISC_BIG : DISC_SMALL;
  const look = face.expired
    ? 'border-4 border-papel/60'
    : face.urgent
      ? 'border-[7px] border-ouro bg-vermelho text-papel'
      : 'border-4 border-ouro';
  return (
    <div className="flex max-w-[7.5rem] flex-none flex-col items-center gap-0.5 text-center">
      <div
        role="timer"
        aria-label={face.urgent ? CLOCK_URGENT_LABEL : CLOCK_LABEL}
        data-urgente={face.urgent ? 'true' : undefined}
        className={`grid flex-none place-items-center rounded-full font-texto font-extrabold leading-none tabular-nums ${size} ${look}`}
      >
        {face.seconds}
      </div>
      {face.expired ? <p className="text-[11px] font-bold uppercase leading-tight">{TIMES_UP_TEXT}</p> : null}
      {/* O turno de quem espera fica congelado durante a janela de reação do outro. */}
      {face.pausedTurnSeconds !== null && !face.mine ? (
        <p data-numero className="font-texto text-[11px] font-semibold leading-tight tabular-nums">
          {pausedTurnText(face.pausedTurnSeconds)}
        </p>
      ) : null}
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
        onFocus={seen}
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
