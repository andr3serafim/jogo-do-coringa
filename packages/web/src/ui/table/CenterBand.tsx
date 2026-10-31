// A faixa central de tinta (spec §3.1 e §10.1): o que é dos dois jogadores e não mora no placar do topo (sub-projeto 6 §3). A
// fase por extenso e de quem é a vez (com "Tempo esgotado" e o turno pausado do relógio, que não cabem na placa do celular), o
// monte e o cemitério. Os números de jogo usam a fonte de texto com algarismos tabulares e nenhuma textura (spec §10.7). Os
// anúncios para leitor de tela saem por uma região viva escondida que mora aqui, fora do relógio (`live`, de `useClock`). No
// treino (spec §2.6) não há prazo: a faixa diz "Treino · Médio, sem relógio" (com o nível do bot), e a mesma região anuncia a vez
// do jogador. Na mesa do replay (`replay`) ela diz "Revendo a partida".
import type { PlayerView } from '@coringa/engine';
import type { ClockFace } from '../../model/clock.ts';
import { pausedTurnText, REPLAY_BAND_TEXT, TIMES_UP_TEXT, trainingBandText, TUTORIAL_BAND_TEXT } from '../../model/copy.ts';
import type { TrainingLevel } from '../../model/local-room.ts';
import { DROP } from '../../model/drag.ts';
import * as m from 'motion/react-m';
import { INITIATIVE_ID } from '../../model/effects.ts';
import { useAnim } from '../anim/context.ts';
import { layoutTransition } from '../anim/motion.ts';
import { Card, cardName } from '../cards/Card.tsx';
import { useTableUi } from './context.ts';
import { graveyardName, turnText, type TableNames } from './labels.ts';
import { NovoChip } from './NovoChip.tsx';
import type { ClockLive } from './useClock.ts';

export interface CenterBandProps {
  view: PlayerView;
  names: TableNames;
  /** A face do relógio (o número mora no placar): aqui só "Tempo esgotado" e o turno pausado. */
  face: ClockFace | null;
  /** O anúncio do relógio ou da vez, para a região viva (`useClock`). */
  live: ClockLive;
  /** Treino contra o bot, e o nível dele: a faixa diz o nível e que não há relógio. */
  training?: TrainingLevel;
  /** A mesa do replay: a faixa diz "Revendo a partida" (vale mais que o treino). */
  replay?: true;
  /** O tutorial (um treino guiado): a faixa diz "Tutorial, sem relógio", e não o nível do bot. */
  tutorial?: true;
  onOpenGraveyard?: () => void;
}

export function CenterBand({ view, names, face, live, training, replay, tutorial, onOpenGraveyard }: CenterBandProps) {
  const note = face?.expired
    ? TIMES_UP_TEXT
    : // O turno de quem espera fica congelado durante a janela de reação do outro.
      face && face.pausedTurnSeconds !== null && !face.mine
      ? pausedTurnText(face.pausedTurnSeconds)
      : null;
  return (
    <section
      aria-label="Situação da rodada"
      className="flex flex-none flex-wrap items-center gap-x-2.5 gap-y-1 bg-tinta px-3 py-1.5 text-papel pc:min-h-[68px] pc:gap-x-7 pc-baixo:min-h-14 pc:px-6 pc:py-1"
    >
      <div className="flex min-w-0 max-w-[11rem] flex-col pc:max-w-[16rem]">
        <p className="text-xs font-semibold leading-tight text-ouro pc:text-sm">{turnText(view, names)}</p>
        {note ? (
          <p data-numero className="font-texto text-[11px] font-bold leading-tight tabular-nums">
            {note}
          </p>
        ) : null}
      </div>

      {/* A região viva dos anúncios fica sempre montada: uma região criada já preenchida pode não ser lida. */}
      <div aria-live="assertive" aria-atomic="true" data-anuncio className="sr-only">
        {live.text === '' ? null : <span key={live.id}>{live.text}</span>}
      </div>

      {face ? null : replay ? (
        <p className="max-w-[10.5rem] text-[11px] font-bold uppercase leading-tight tracking-[0.12em] text-ouro pc:max-w-none pc:text-xs">
          {REPLAY_BAND_TEXT}
        </p>
      ) : training !== undefined ? (
        // Sem relógio, a faixa diz por quê. Não é região viva: o anúncio é o da vez, acima.
        <p className="max-w-[10.5rem] text-[11px] font-bold uppercase leading-tight tracking-[0.12em] text-ouro pc:max-w-none pc:text-xs">
          {tutorial ? TUTORIAL_BAND_TEXT : trainingBandText(training)}
        </p>
      ) : null}

      <InitiativeMark mine={view.initiative === view.me} />

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
 * a mesa). É só enfeite do texto ao lado, que diz de quem é; o losango se mexe na batida do `InitiativeDecided` que a muda de mão.
 */
function InitiativeMark({ mine }: { mine: boolean }) {
  const anim = useAnim();
  const marker = (
    <m.span
      key={anim.markOf(INITIATIVE_ID)}
      layoutId={INITIATIVE_ID}
      layoutDependency={anim.layoutKey}
      transition={{
        layout: layoutTransition(anim.delayOf(INITIATIVE_ID), anim.instant(INITIATIVE_ID)),
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

function Graveyard({ view, onOpen }: { view: PlayerView; onOpen: (() => void) | undefined }) {
  const { marked, onSeen } = useTableUi();
  const { graveyard } = view;
  const top = graveyard.at(-1) ?? null;
  const news = graveyard.filter((card) => marked.has(card.id));
  const seen = onSeen && news.length > 0 ? () => news.forEach((card) => onSeen(card.id)) : undefined;
  const name = graveyardName(graveyard.length, top === null ? null : cardName(top), news.length > 0);
  // A carta de cima fica fora do botão, para o texto visível dele ser só "Cemitério 3" (e "novo"): o axe (WCAG 2.5.3, rótulo no nome)
  // exige que o texto visível seja trecho contínuo do nome acessível, que já diz a carta de cima. Com o botão, ela é só desenho.
  const card = top ? (
    // A carta de cima é menor na faixa do celular: o tamanho "mini" lê estas duas variáveis.
    <span aria-hidden={onOpen ? true : undefined} className="flex [--mini-h:36px] [--mini-w:26px] pc:[--mini-h:54px] pc:[--mini-w:38px]">
      <Card card={top} size="mini" grave />
    </span>
  ) : (
    <span aria-hidden="true" className="h-9 w-[26px] rounded-[3px] border-[1.5px] border-dashed border-papel/50 pc:h-[54px] pc:w-[38px]" />
  );
  const label = (
    <span className="flex flex-col items-start">
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] pc:text-[11px]">Cemitério</span>
      {/* Entre itens de flex o espaço some (o layout não muda), mas separa as palavras do texto visível: "Cemitério vazio", e não "Cemitériovazio". */}{' '}
      {top ? (
        <span data-numero className="font-texto text-[15px] font-bold leading-tight tabular-nums pc:text-xl">
          {graveyard.length}
        </span>
      ) : (
        <span className="text-xs">vazio</span>
      )}
      {news.length > 0 ? (
        <>
          {' '}
          <NovoChip />
        </>
      ) : null}
    </span>
  );
  const box = 'flex min-h-11 items-center gap-1.5 border-[1.5px] border-papel/50 px-1.5 py-0.5 pc:min-h-[62px] pc:gap-2.5 pc:px-2.5';
  if (onOpen) {
    // O botão cobre a caixa inteira (`after:inset-0`): o alvo de toque e o clique na carta são os mesmos de antes. O foco aparece na
    // caixa, e não só em volta do texto.
    return (
      <div
        data-soltar={DROP.graveyard}
        className={`${box} relative has-[:focus-visible]:shadow-[0_0_0_6px_var(--color-tinta)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ouro`}
      >
        {card}
        <button
          type="button"
          aria-label={name}
          className="bg-transparent p-0 text-left text-papel after:absolute after:inset-0 focus-visible:shadow-none focus-visible:outline-none"
          onClick={onOpen}
          onPointerEnter={seen}
          onPointerDown={seen}
          onFocus={seen}
        >
          {label}
        </button>
      </div>
    );
  }
  return (
    <div data-soltar={DROP.graveyard} className={box} onPointerEnter={seen} onPointerDown={seen}>
      {card}
      {label}
    </div>
  );
}
