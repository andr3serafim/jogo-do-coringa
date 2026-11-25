// O fim da partida (spec §2.5): um painel sobre a mesa final, que continua à vista e só para ver. Diz o resultado, o motivo
// (do motor, ou da `cause` do servidor nos W.O.) e o placar da sala, e tem **Revanche** (alterna), **Ver a mesa** (recolhe),
// **Rever a partida** (só quando ela ficou guardada com replay) e **Nova sala**. É um `<dialog>` modal; recolhido, vira uma
// faixa no pé da tela com o resultado, o estado da revanche e o botão que o abre de novo, para a revanche não ficar fora de
// alcance.
//
// A revanche mostrada é a que o servidor confirmou (`seats[].wantsRematch`), nunca um palpite local. Quem monta o painel
// o faz só enquanto a sala está em `FINISHED` (e com a mesa quieta); a nova partida desmonta tudo, e o recolhimento vale
// para uma partida só (`key` pelo `gameNo`, na `PlayTable`).
//
// O resultado é a Faixa de feira (decisoes.md 2026-11-24 (11) e (13); spec `2026-11-24-fim-de-partida-faixa-design.md`): uma faixa de
// tinta que atravessa a mesa, com filete de ouro; o medalhão com o seu Coringa (feliz, triste ou sério; o fundo verde, vermelho ou de
// papel; a borda de ouro) e o carimbo com a palavra ("Vitória!" em verde, "Derrota" em vermelho, "Empate" ou "Sem resultado" em ouro), em
// Alfa Slab One. O carimbo e o medalhão são desenho: o nome do diálogo e do título segue o `resultTitle` ("Você venceu"). Com movimento
// reduzido, o carimbo e o medalhão só aparecem. Nenhum flash.
import type { PlayerId } from '@coringa/engine';
import type { Outcome, Score } from '@coringa/protocol';
import * as m from 'motion/react-m';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import {
  DURATION_LABEL,
  durationText,
  resultStamp,
  END_EYEBROW,
  END_RESULT_LABEL,
  NEW_ROOM_LABEL,
  REMATCH_LABEL,
  REVIEW_GAME_LABEL,
  rematchStatusText,
  reasonText,
  resultTitle,
  SCORE_LABEL,
  scoreText,
  SHOW_RESULT_LABEL,
  VIEW_TABLE_LABEL,
  type OutcomeNames,
} from '../../model/copy.ts';
import { useAnim } from '../anim/context.ts';
import { Button } from '../parts.tsx';
import { Modal } from './Modal.tsx';
import { ResultFace, type ResultMood } from './ResultMedal.tsx';

export interface EndPanelProps {
  outcome: Outcome;
  score: Score;
  me: PlayerId;
  names: OutcomeNames;
  /** Eu pedi a revanche (o que o servidor guardou). */
  mineWants: boolean;
  /** O oponente pediu. */
  theirsWants: boolean;
  /** O oponente está fora da sala: a revanche espera ele voltar. */
  away: boolean;
  /** Sem conexão o pedido se perderia. */
  disabled: boolean;
  onRematch: (want: boolean) => void;
  /** Fecha a sala e volta ao início. Sem ele o botão não existe. */
  onNewRoom?: () => void;
  /** O rótulo do botão (padrão "Nova sala"); o treino diz "Voltar ao início". */
  newRoomLabel?: string;
  /** Abre o replay da partida que acabou. Sem ele (partida sem replay guardado) o botão "Rever a partida" não existe. */
  onReview?: () => void;
  /**
   * Uma nota dentro do diálogo, entre o placar e os botões (o tutorial põe aqui a dica do fim). Tem que ser aqui: o diálogo é
   * modal, e uma dica fora dele fica inerte (sem clique, sem foco e fora da árvore de acessibilidade) atrás dele. A nota também
   * entra na descrição do diálogo (`aria-describedby`): o leitor de tela a lê junto com o motivo quando o diálogo abre.
   */
  note?: ReactNode;
}

export function EndPanel({
  outcome,
  score,
  me,
  names,
  mineWants,
  theirsWants,
  away,
  disabled,
  onRematch,
  onNewRoom,
  newRoomLabel = NEW_ROOM_LABEL,
  onReview,
  note,
}: EndPanelProps) {
  const titleId = useId();
  const reasonId = useId();
  const noteId = useId();
  const [collapsed, setCollapsed] = useState(false);
  const showRef = useRef<HTMLButtonElement>(null);

  const title = resultTitle(outcome, me, names);
  const stamp = resultStamp(outcome, me);
  const kind = resultKind(outcome, me);
  const { reduced } = useAnim();
  const reason = reasonText(outcome, me, names);
  const status = rematchStatusText(names.opponent, mineWants, theirsWants, away);

  // Recolhido, o foco vai para a faixa (o diálogo fechado devolveria o foco a quem estava na página antes, que pode já
  // nem existir). Na abertura da partida o painel nasce aberto, então este efeito não roda.
  useEffect(() => {
    if (collapsed) showRef.current?.focus();
  }, [collapsed]);

  return (
    <>
      <Modal
        open={!collapsed}
        onClose={() => setCollapsed(true)}
        labelledBy={titleId}
        // O leitor de tela lê o motivo e, no tutorial, a dica do fim junto (os ids se separam por espaço).
        describedBy={note ? `${reasonId} ${noteId}` : reasonId}
        framed={false}
        className="w-full max-w-none max-tablet:mb-0"
      >
        <section
          data-faixa
          data-resultado={kind}
          className="grid items-center gap-x-6 gap-y-4 border-y-[5px] border-ouro bg-tinta px-6 py-5 text-papel max-tablet:grid-cols-1 max-tablet:px-4 max-tablet:pb-6 max-tablet:text-center tablet:grid-cols-[auto_minmax(0,36rem)] tablet:justify-center"
        >
          <m.div
            data-medalhao
            data-humor={MOOD[kind]}
            initial={reduced ? false : { scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={reduced ? { duration: 0 } : { type: 'spring', bounce: 0.4, visualDuration: 0.4 }}
            className={`mx-auto size-[140px] overflow-hidden rounded-full border-[5px] border-ouro shadow-[0_0_0_4px_var(--color-tinta),0_0_0_7px_var(--color-ouro)] tablet:size-[190px] ${MEDAL_BG[kind]}`}
          >
            <ResultFace mood={MOOD[kind]} />
          </m.div>
          <div className="flex min-w-0 flex-col gap-3">
            <div className="flex flex-col gap-2">
              <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-papel">{END_EYEBROW}</p>
              <h2 id={titleId} className="m-0">
                <span className="sr-only">{title}</span>
                <m.span
                  aria-hidden="true"
                  data-carimbo-fim
                  initial={reduced ? false : { scale: 1.6, rotate: -12, opacity: 0 }}
                  animate={{ scale: 1, rotate: -4, opacity: 1 }}
                  transition={reduced ? { duration: 0 } : { delay: 0.15, type: 'spring', bounce: 0.35, visualDuration: 0.35 }}
                  className={`inline-block border-[5px] border-current px-4 pb-2 pt-1 font-madeira text-[clamp(2.25rem,8vw,4.25rem)] uppercase leading-none ${STAMP_COLOR[kind]}`}
                >
                  {stamp}
                </m.span>
              </h2>
              <p className="font-bold">
                <span aria-hidden="true">{title}. </span>
                <span id={reasonId}>{reason}</span>
              </p>
            </div>

            <div className="flex flex-wrap items-baseline gap-x-5 gap-y-1 max-tablet:justify-center">
              {outcome.durationMs !== undefined ? (
                <p className="flex items-baseline gap-x-2">
                  <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{DURATION_LABEL}</span>
                  <span data-duracao className="font-texto font-bold tabular-nums">
                    {durationText(outcome.durationMs)}
                  </span>
                </p>
              ) : null}
              <p className="flex items-baseline gap-x-2">
                <span className="text-[11px] font-bold uppercase tracking-[0.12em]">{SCORE_LABEL}</span>
                <span data-numero className="font-texto font-bold tabular-nums">
                  {scoreText(score, me, names)}
                </span>
              </p>
            </div>

            {note ? (
              <div id={noteId} className="bg-papel p-3 text-left text-tinta">
                {note}
              </div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Button
                aria-pressed={mineWants}
                disabled={disabled}
                variant={mineWants ? 'secondary' : 'primary'}
                className="flex w-full items-center justify-center gap-2"
                onClick={() => onRematch(!mineWants)}
              >
                {mineWants ? <CheckIcon /> : null}
                {REMATCH_LABEL}
              </Button>
              <p role="status" className="min-h-6 text-center font-bold text-ouro">
                {status}
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="secondary" className="flex-1" onClick={() => setCollapsed(true)}>
                {VIEW_TABLE_LABEL}
              </Button>
              {onReview ? (
                <Button variant="secondary" className="flex-1" onClick={onReview}>
                  {REVIEW_GAME_LABEL}
                </Button>
              ) : null}
              {onNewRoom ? (
                <Button variant="secondary" className="flex-1" onClick={onNewRoom}>
                  {newRoomLabel}
                </Button>
              ) : null}
            </div>
          </div>
        </section>
      </Modal>

      {collapsed ? (
        <section
          aria-label={END_RESULT_LABEL}
          className="fixed inset-x-0 bottom-0 z-20 flex flex-wrap items-center gap-x-4 gap-y-2 border-t-4 border-ouro bg-tinta px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-papel"
        >
          <div className="min-w-0 flex-1">
            <p className="textura font-madeira text-xl uppercase leading-tight">{title}</p>
            <p role="status" className="text-sm font-bold text-ouro">
              {status}
            </p>
          </div>
          <button
            ref={showRef}
            type="button"
            onClick={() => setCollapsed(false)}
            className="min-h-11 border-2 border-papel bg-transparent px-4 py-1.5 font-bold text-papel"
          >
            {SHOW_RESULT_LABEL}
          </button>
        </section>
      ) : null}
    </>
  );
}

/** O humor do Coringa do medalhão, a cor do fundo dele e a da palavra do carimbo, por resultado (do seu ponto de vista). */
const MOOD: Record<ResultKind, ResultMood> = { vitoria: 'feliz', derrota: 'triste', neutro: 'serio' };
const MEDAL_BG: Record<ResultKind, string> = { vitoria: 'bg-[#e3f4e1]', derrota: 'bg-[#fbe1dc]', neutro: 'bg-papel' };
/** Verde (9:1 sobre a tinta), vermelho (6:1) e ouro. */
const STAMP_COLOR: Record<ResultKind, string> = { vitoria: 'text-[#6fd07f]', derrota: 'text-[#ff6b5a]', neutro: 'text-ouro' };
type ResultKind = 'vitoria' | 'derrota' | 'neutro';

/**
 * O resultado do seu ponto de vista (o mesmo do `pastGameResultKind` da lista de partidas, que não entra aqui: o módulo dela traz os textos
 * da tela `/partidas`, que ficam fora do JavaScript inicial).
 */
function resultKind(outcome: Outcome, me: PlayerId): ResultKind {
  if (outcome.result === null || outcome.result.kind !== 'WIN') return 'neutro';
  return outcome.result.winner === me ? 'vitoria' : 'derrota';
}

function CheckIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="size-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="4">
      <path d="M4 12.5 9.5 18 20 6" />
    </svg>
  );
}
