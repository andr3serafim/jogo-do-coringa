// A janela de reação (spec §3.7), dentro da barra de ação. Para quem responde: o gatilho com a prévia ("Duda declarou ataque:
// 84 contra sua Defesa 46 → seu K absorve", "Duda pôs 2 K na Guarda", "Duda lançou um Reflect"), as respostas possíveis (da
// barra), o botão Passar e o relógio de 8 s, grande (da faixa central). A conta da prévia é do motor (`previewAttack`).
// Quem espera vê "Duda pode reagir…" e o próprio turno pausado, os dois na barra e na faixa central.
import type { AttackPreview, GameEvent, PlayerView } from '@coringa/engine';
import { attackDeclaredText, guardPlayedText, PASS_LABEL, reflectPlayedText } from '../../model/copy.ts';
import { PRIMARY, PRIMARY_TITLE, TwoLine } from './controls.tsx';
import type { TableNames } from './labels.ts';

/** Quantos K o oponente pôs na Guarda neste `state`; `null` quando os eventos não vieram (recarga, resync). */
function kingsPlayed(view: PlayerView, events: readonly GameEvent[]): number | null {
  for (let i = events.length - 1; i >= 0; i -= 1) {
    const event = events[i]!;
    if (event.type === 'GuardPlayed' && event.player !== view.me) return event.cards.length;
  }
  return null;
}

export interface ReactionNoticeProps {
  view: PlayerView;
  names: TableNames;
  /** O ataque do oponente contra você (`previewAttack(view, 'opponent')`). */
  threat: AttackPreview;
  /** Os eventos do `state` atual. */
  events: readonly GameEvent[];
}

/** O gatilho da janela e a prévia, para quem responde. */
export function ReactionNotice({ view, names, threat, events }: ReactionNoticeProps) {
  const { phase } = view;
  if (phase.kind !== 'REACTION') return null;
  const opponent = names.opponent;
  const text =
    phase.trigger === 'ATTACK'
      ? attackDeclaredText(threat, opponent)
      : phase.trigger === 'K_PLAYED'
        ? guardPlayedText(opponent, kingsPlayed(view, events))
        : reflectPlayedText(opponent);
  return (
    <p data-gatilho data-numero className="border-l-4 border-ouro pl-2 font-texto text-sm font-bold leading-snug tabular-nums">
      {text}
    </p>
  );
}

/** O botão principal da janela, longe da mão como o Atacar. */
export function PassButton({ disabled, onPass }: { disabled: boolean; onPass: () => void }) {
  return (
    <TwoLine
      title={PASS_LABEL}
      titleClass={PRIMARY_TITLE}
      disabled={disabled}
      onClick={onPass}
      className={`${PRIMARY} flex-1 pc:min-w-[300px] pc:flex-none`}
    />
  );
}
