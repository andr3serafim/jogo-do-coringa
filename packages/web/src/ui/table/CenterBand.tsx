// A faixa central de tinta (spec §3.1 e §10.1): o que é dos dois jogadores e não mora no placar do topo (sub-projeto 6 §3). A
// fase por extenso e de quem é a vez (com "Tempo esgotado" e o turno pausado do relógio, que não cabem na placa do celular), o
// monte e o cemitério. Os números de jogo usam a fonte de texto com algarismos tabulares e nenhuma textura (spec §10.7). Os
// anúncios para leitor de tela saem por uma região viva escondida que mora aqui, fora do relógio (`live`, de `useClock`). No
// treino (spec §2.6) não há prazo: a faixa diz "Treino · Médio, sem relógio" (com o nível do bot), e a mesma região anuncia a vez
// do jogador. Na mesa do replay (`replay`) ela diz "Revendo a partida".
//
// Desde o bloco D dos pontos do playtest (ponto 14, spec do playtest §6.2) a faixa é uma grade de três colunas: a situação da rodada à
// esquerda, o monte e o cemitério no centro da mesa, lado a lado, e o treino (ou o replay) à direita; online a direita fica vazia, e o
// centro segue no centro. O monte é uma pilha de versos; o cemitério, uma lápide de pedra com a carta do topo encostada (a poeira da
// carta que chega é do `Leaving`, que sabe a batida da chegada). As âncoras `data-monte` e `data-cemiterio` continuam: os voos e as cenas medem por elas.
import type { PlayerView } from '@coringa/engine';
import type { ClockFace } from '../../model/clock.ts';
import { pausedTurnText, REPLAY_BAND_TEXT, TIMES_UP_TEXT, trainingBandText, TUTORIAL_BAND_TEXT } from '../../model/copy.ts';
import type { TrainingLevel } from '../../model/local-room.ts';
import { DROP } from '../../model/drag.ts';
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
  // As laterais são estreitas no celular: uma palavra comprida (um apelido) quebra em vez de invadir o centro.
  const side = 'text-[11px] font-bold uppercase leading-tight tracking-[0.08em] text-ouro [overflow-wrap:anywhere] pc:text-xs pc:tracking-[0.12em]';
  return (
    <section
      aria-label="Situação da rodada"
      className="grid flex-none grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 trilho-madeira px-3 py-1.5 text-papel pc:gap-x-7 pc:px-6 pc:py-1"
    >
      <div className="flex min-w-0 flex-col">
        <p className="text-xs font-semibold leading-tight text-ouro [overflow-wrap:anywhere] pc:text-sm">{turnText(view, names)}</p>
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

      {/* O centro da mesa: o monte e o cemitério, lado a lado. As cartas da faixa são menores que as "mini" da mesa (o tamanho "mini" e a
          pilha leem estas duas variáveis): no PC a faixa fica compacta, ~72 px, porque uma mais alta fazia os campos rolarem em 1440 × 900. */}
      <div className="flex items-end gap-2.5 [--mini-h:36px] [--mini-w:26px] pc:gap-5 pc:[--mini-h:44px] pc:[--mini-w:31px]">
        <Deck count={view.deckCount} />
        <Graveyard view={view} onOpen={onOpenGraveyard} />
      </div>

      {/* A coluna da direita existe sempre, para o centro ficar no centro. Sem relógio, ela diz por quê (não é região viva: o anúncio é
          o da vez, acima). */}
      <div className="flex min-w-0 justify-end text-right">
        {face ? null : replay ? (
          <p className={side}>{REPLAY_BAND_TEXT}</p>
        ) : training !== undefined ? (
          <p className={side}>{tutorial ? TUTORIAL_BAND_TEXT : trainingBandText(training)}</p>
        ) : null}
      </div>
    </section>
  );
}

// ---------------------------------------------------------------------------------------------

/** O monte: uma pilha de até três versos (só desenho) e a conta. É de onde a compra voa (`data-monte`, sub-projeto 6 §8). */
function Deck({ count }: { count: number }) {
  const layers = Math.min(count, 3);
  return (
    <div data-monte className="flex items-center gap-1.5 pc:gap-2.5">
      <span aria-hidden="true" data-monte-vazio={layers === 0 ? '' : undefined} className="monte-pilha">
        {Array.from({ length: layers }, (_, i) => (
          <span key={i} data-monte-verso />
        ))}
      </span>
      <span className="flex flex-col items-start">
        {/* No celular a pilha de versos com o número já diz que é o monte: o rótulo fica só para o leitor de tela. */}
        <span className="text-[10px] font-bold uppercase tracking-[0.12em] max-tablet:sr-only pc:text-[11px]">Monte</span>{' '}
        <span data-numero className="font-texto text-[15px] font-bold tabular-nums pc:text-xl">
          {count}
        </span>
      </span>
    </div>
  );
}

/** As rachas da pedra: desenho original, dois traços. */
function Cracks() {
  return (
    <svg aria-hidden="true" data-rachas viewBox="0 0 120 104" preserveAspectRatio="none" className="lapide-rachas" fill="none">
      <path d="M82 14l-6 14 7 8-5 12" stroke="#2a2420" strokeWidth="1.6" />
      <path d="M22 58l8 6-3 9" stroke="#2a2420" strokeWidth="1.4" />
    </svg>
  );
}

function Graveyard({ view, onOpen }: { view: PlayerView; onOpen: (() => void) | undefined }) {
  const { marked, onSeen } = useTableUi();
  const { graveyard } = view;
  const count = graveyard.length;
  const top = graveyard.at(-1) ?? null;
  const news = graveyard.filter((card) => marked.has(card.id));
  const seen = onSeen && news.length > 0 ? () => news.forEach((card) => onSeen(card.id)) : undefined;
  const name = graveyardName(count, top === null ? null : cardName(top), news.length > 0);
  // A carta de cima fica fora do botão, para o texto visível dele ser só "Cemitério 3" (e "novo"): o axe (WCAG 2.5.3, rótulo no nome)
  // exige que o texto visível seja trecho contínuo do nome acessível, que já diz a carta de cima. Com o botão, ela é só desenho. É a
  // primeira filha da caixa, e fica à direita, encostada na pedra (`order-2`). Fica em pé: o Motion mede a carta que voa até aqui, e
  // uma carta inclinada mediria maior do que é.
  const card = top ? (
    <span aria-hidden={onOpen ? true : undefined} className="order-2 flex">
      <Card card={top} size="mini" grave />
    </span>
  ) : (
    <span aria-hidden="true" className="order-2 h-(--mini-h) w-(--mini-w) rounded-[3px] border-[1.5px] border-dashed border-papel/50" />
  );
  const label = (
    <span className="flex flex-col items-start">
      <span className="lapide-gravado text-[9px] font-bold uppercase tracking-[0.1em] pc:text-[11px] pc:tracking-[0.12em]">Cemitério</span>
      {/* Entre itens de flex o espaço some (o layout não muda), mas separa as palavras do texto visível: "Cemitério vazio", e não "Cemitériovazio". */}{' '}
      {/* A conta e o "novo" na mesma linha: a lápide não cresce quando o selo aparece. */}
      <span className="flex items-center gap-1.5">
        {top ? (
          <span data-numero className="font-texto text-[15px] font-bold leading-tight tabular-nums pc:text-xl">
            {count}
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
    </span>
  );
  // Só desenho, depois da carta e do botão: as rachas, o canto de papel da segunda carta (a de verdade poria outro `data-card-id` na
  // mesa, e os voos e as cenas procuram as cartas por ele).
  const art = (
    <>
      <Cracks />
      {count >= 2 ? <span aria-hidden="true" data-segunda className="lapide-segunda" /> : null}
    </>
  );
  const box = 'lapide relative flex min-h-11 items-end gap-1.5 px-2 pb-1 pt-2.5 pc:gap-2.5 pc:px-3 pc:pb-1 pc:pt-1.5';
  if (onOpen) {
    // O botão cobre a caixa inteira (`after:inset-0`): o alvo de toque e o clique na carta são os mesmos de antes. O foco aparece na
    // caixa, e não só em volta do texto.
    return (
      <div
        data-cemiterio=""
        data-lapide=""
        data-soltar={DROP.graveyard}
        className={`${box} has-[:focus-visible]:shadow-[0_0_0_6px_var(--color-tinta)] has-[:focus-visible]:outline-3 has-[:focus-visible]:outline-ouro`}
      >
        {card}
        <button
          type="button"
          aria-label={name}
          className="self-center bg-transparent p-0 text-left text-papel after:absolute after:inset-0 focus-visible:shadow-none focus-visible:outline-none"
          onClick={onOpen}
          onPointerEnter={seen}
          onPointerDown={seen}
          onFocus={seen}
        >
          {label}
        </button>
        {art}
      </div>
    );
  }
  return (
    <div data-cemiterio="" data-lapide="" data-soltar={DROP.graveyard} className={box} onPointerEnter={seen} onPointerDown={seen}>
      {card}
      <span className="self-center">{label}</span>
      {art}
    </div>
  );
}
