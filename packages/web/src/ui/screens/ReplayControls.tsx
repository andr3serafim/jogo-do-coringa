// Os controles do replay, na barra de baixo da mesa (o lugar da barra de ação): o passo de agora, o seletor de rodada, os botões e
// o caminho de volta à lista. Só vista: quem decide o que cada botão faz é o `ReplayViewer`.
//
// Botão "desligado" é `aria-disabled`, e não o atributo `disabled`: o botão apertado pode ser o que acaba de se desligar (o
// "Próximo passo" no último passo), e um botão `disabled` perde o foco, que iria para o `body` e deixaria o teclado e o leitor
// de tela sem lugar. Com `aria-disabled` ele segue focado, o leitor diz "indisponível" e o clique não faz nada.
//
// O `data-sem-pulo` na seção tira estes controles do "toque pula as batidas" do `Stage`: o clique em "Pausar" ou em "Próximo
// passo", no meio de uma cena, é um clique, e não um pulo que o engoliria.
import { useId } from 'react';
import {
  REPLAY_CONTROLS_LABEL,
  REPLAY_NEXT_LABEL,
  REPLAY_PAUSE_LABEL,
  REPLAY_PLAY_LABEL,
  REPLAY_PREVIOUS_LABEL,
  REPLAY_ROUND_LABEL,
  REPLAY_START_LABEL,
  stepCounterText,
} from '../../model/past-games-copy.ts';
import { BACK_TO_LIST_LABEL } from '../../model/copy.ts';
import type { ReplayTrack } from '../../model/replay-track.ts';
import { AppLink } from '../parts.tsx';

export interface ReplayControlsProps {
  /** O passo de agora (0 é o começo) e quantos passos existem para ver. */
  frame: number;
  total: number;
  playing: boolean;
  rounds: ReplayTrack['rounds'];
  /** A rodada do passo de agora. */
  round: number;
  /** Os avisos da partida (outra versão das regras, replay que parou), ao alto. */
  notices: readonly string[];
  onStart: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onToggle: () => void;
  /** O primeiro passo da rodada escolhida. */
  onRound: (frame: number) => void;
}

const BUTTON =
  'min-h-11 border-2 px-2 py-1.5 text-sm font-bold leading-tight aria-disabled:cursor-not-allowed aria-disabled:opacity-50';
const SECONDARY = `${BUTTON} border-papel bg-transparent text-papel`;
const PRIMARY = `${BUTTON} border-ouro bg-ouro text-tinta`;

interface ControlProps {
  label: string;
  off: boolean;
  onClick: () => void;
  className: string;
}

function Control({ label, off, onClick, className }: ControlProps) {
  return (
    <button
      type="button"
      aria-disabled={off ? true : undefined}
      onClick={() => {
        if (!off) onClick();
      }}
      className={className}
    >
      {label}
    </button>
  );
}

export function ReplayControls({
  frame,
  total,
  playing,
  rounds,
  round,
  notices,
  onStart,
  onPrevious,
  onNext,
  onToggle,
  onRound,
}: ReplayControlsProps) {
  const roundId = useId();
  const atStart = frame <= 0;
  const atEnd = frame >= total;
  return (
    <section aria-label={REPLAY_CONTROLS_LABEL} data-sem-pulo className="flex flex-col gap-2.5">
      {notices.map((text) => (
        <p key={text} className="text-sm font-bold leading-snug text-ouro">
          {text}
        </p>
      ))}
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        {/* Tocando, o contador não é anunciado a cada passo (o histórico já é uma região viva). */}
        <p
          role="status"
          aria-live={playing ? 'off' : 'polite'}
          data-numero
          className="font-texto text-base font-bold tabular-nums"
        >
          {stepCounterText(frame, total)}
        </p>
        <div className="flex items-center gap-2">
          <label htmlFor={roundId} className="text-[11px] font-bold uppercase tracking-[0.12em]">
            {REPLAY_ROUND_LABEL}
          </label>
          <select
            id={roundId}
            value={String(round)}
            onChange={(event) => {
              const chosen = rounds.find((entry) => String(entry.round) === event.target.value);
              if (chosen !== undefined) onRound(chosen.frame);
            }}
            className="min-h-11 border-2 border-papel bg-tinta px-2 font-texto text-base tabular-nums text-papel"
          >
            {rounds.map((entry) => (
              <option key={entry.round} value={String(entry.round)}>
                {entry.round}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <Control label={REPLAY_START_LABEL} off={atStart} onClick={onStart} className={SECONDARY} />
        <Control label={REPLAY_PREVIOUS_LABEL} off={atStart} onClick={onPrevious} className={SECONDARY} />
        <Control label={REPLAY_NEXT_LABEL} off={atEnd} onClick={onNext} className={SECONDARY} />
        <Control
          label={playing ? REPLAY_PAUSE_LABEL : REPLAY_PLAY_LABEL}
          off={!playing && atEnd}
          onClick={onToggle}
          className={PRIMARY}
        />
      </div>
      <AppLink to="/partidas" className="self-start text-papel">
        {BACK_TO_LIST_LABEL}
      </AppLink>
    </section>
  );
}
