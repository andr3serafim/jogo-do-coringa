// A janela de reação (spec §3.7), dentro da barra de ação. Para quem responde: o gatilho com a prévia ("Duda declarou ataque:
// 84 contra sua Defesa 46 → seu K absorve", "Duda pôs 2 K na Guarda", "Duda lançou um Reflect"), as respostas possíveis (da
// barra), o botão Passar e o relógio de 8 s, grande (da faixa central). A conta da prévia é do motor (`previewAttack`).
// Quem espera vê "Duda pode reagir…" e o próprio turno pausado, os dois na barra e na faixa central.
import type { AttackPreview, GameEvent, PlayerView } from '@coringa/engine';
import { attackDeclaredText, devastationCastText, guardPlayedText, PASS_LABEL, reflectPlayedText } from '../../model/copy.ts';
import { livesOf } from '../../model/preview.ts';
import { PassSkipIcon } from './icons.tsx';
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
      ? attackDeclaredText(threat, opponent, livesOf(view))
      : phase.trigger === 'K_PLAYED'
        ? guardPlayedText(opponent, kingsPlayed(view, events))
        : phase.trigger === 'DEVASTATION' && phase.devastation
          ? devastationCastText(opponent, phase.devastation.row)
          : reflectPlayedText(opponent);
  return (
    <p data-gatilho data-numero className="border-l-4 border-ouro pl-2 font-texto text-sm font-bold leading-snug tabular-nums">
      {text}
    </p>
  );
}

/**
 * O Passar da janela (decisoes.md 2026-11-25 (4) e (5)): o carimbo quadrado de papel, do tamanho dos destinos do Equipar, com as setas de
 * pular e a palavra. Fica onde estava na barra, longe da mão.
 */
export function PassButton({ disabled, onPass }: { disabled: boolean; onPass: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPass}
      className="carimbo carimbo-papel carimbo-destino carimbo-icone-palavra disabled:cursor-wait disabled:opacity-60"
    >
      <PassSkipIcon className="size-7 pc:size-8" />
      <span>{PASS_LABEL}</span>
    </button>
  );
}
