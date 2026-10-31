// A lista local das partidas terminadas (`/partidas`, spec do polimento §4.3): as últimas 20 deste navegador, da mais nova para a
// mais velha, cada uma com a data, contra quem foi, o resultado do ponto de vista do seu assento, o modo e, quando a partida
// ficou guardada com replay, o botão "Rever". Lê a lista ao abrir (não há partida nova com esta tela aberta) e de novo depois de
// apagar.
//
// Apagar (F1 do sub-projeto 5): cada linha tem "Apagar", e "Apagar o histórico" tira a lista inteira; os dois pedem confirmação.
// Depois de apagar, a tela mostra o que ficou guardado de verdade (o armazenamento pode recusar), diz o que houve num
// `role="status"` e leva o foco a um lugar que ainda existe: o botão que abriu a confirmação pode ter saído com a linha.
//
// Entra por `React.lazy` (`App.tsx`): fica fora do JavaScript inicial, e por isso a exportação é a `default`. Os textos moram em
// `past-games-copy.ts`, que só as telas carregadas sob demanda importam.
import { useEffect, useId, useRef, useState } from 'react';
import { navigate } from '../../app/router.ts';
import { BACK_HOME_LABEL, PAST_GAMES_LABEL } from '../../model/copy.ts';
import { clearPastGames, deletePastGame, loadPastGames, type PastGame } from '../../model/past-games.ts';
import {
  againstText,
  CLEAR_PAST_GAMES_LABEL,
  CLEAR_PAST_GAMES_TITLE,
  clearPastGamesText,
  DELETE_FAILED_TEXT,
  DELETE_LABEL,
  DELETE_PAST_GAME_TITLE,
  deletePastGameText,
  PAST_GAME_DELETED_TEXT,
  PAST_GAMES_CLEARED_TEXT,
  PAST_GAMES_EMPTY_TEXT,
  pastGameDateText,
  pastGameModeText,
  pastGameResultText,
  REVIEW_LABEL,
} from '../../model/past-games-copy.ts';
import type { KeyValueStore } from '../../model/storage.ts';
import { ConfirmDialog } from '../table/ConfirmDialog.tsx';
import { Button, Panel, Screen, Title } from '../parts.tsx';

export interface PastGamesProps {
  store: KeyValueStore;
}

/** O que a confirmação aberta vai apagar. */
type Target = { kind: 'all' } | { kind: 'one'; game: PastGame };

/** Para onde o foco vai depois de apagar: o "Apagar" da linha nesta posição, ou o título (lista vazia). */
type FocusAfter = { kind: 'row'; index: number } | { kind: 'title' };

export default function PastGames({ store }: PastGamesProps) {
  const [games, setGames] = useState(() => loadPastGames(store));
  const [target, setTarget] = useState<Target | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const focusAfter = useRef<FocusAfter | null>(null);

  // Roda depois do efeito do `Modal` (o do filho vem antes), que fecha o diálogo e devolveria o foco ao botão que o abriu, se ele
  // ainda estivesse na página.
  useEffect(() => {
    const next = focusAfter.current;
    if (next === null) return;
    focusAfter.current = null;
    const row = next.kind === 'row' ? listRef.current?.querySelectorAll<HTMLElement>('[data-apagar]')[next.index] : undefined;
    (row ?? titleRef.current)?.focus();
  });

  function ask(next: Target) {
    setNotice(null);
    setTarget(next);
  }

  function confirm() {
    if (target === null) return;
    const index = target.kind === 'one' ? games.findIndex((game) => game.id === target.game.id) : -1;
    const done = target.kind === 'one' ? deletePastGame(store, target.game.id) : clearPastGames(store);
    // O que ficou guardado de verdade: com o armazenamento recusando, a partida continua aqui como num recarregar.
    const left = loadPastGames(store);
    setGames(left);
    setNotice(done ? (target.kind === 'one' ? PAST_GAME_DELETED_TEXT : PAST_GAMES_CLEARED_TEXT) : DELETE_FAILED_TEXT);
    // Sem apagar, o botão que abriu a confirmação continua na página e o diálogo devolve o foco a ele.
    if (done) {
      const row = Math.min(Math.max(index, 0), left.length - 1);
      focusAfter.current = target.kind === 'one' && left.length > 0 ? { kind: 'row', index: row } : { kind: 'title' };
    }
    setTarget(null);
  }

  return (
    <Screen>
      <div>
        <Title focusOnMount ref={titleRef}>
          {PAST_GAMES_LABEL}
        </Title>
        <div role="status" className="mt-3 font-bold empty:mt-0">
          {notice}
        </div>
      </div>
      {games.length === 0 ? (
        <Panel>
          <p>{PAST_GAMES_EMPTY_TEXT}</p>
        </Panel>
      ) : (
        <>
          <ul ref={listRef} role="list" className="flex list-none flex-col gap-3 p-0">
            {games.map((game) => (
              <Row key={game.id} game={game} onDelete={() => ask({ kind: 'one', game })} />
            ))}
          </ul>
          <Button variant="danger" onClick={() => ask({ kind: 'all' })}>
            {CLEAR_PAST_GAMES_LABEL}
          </Button>
        </>
      )}
      <Button variant="secondary" onClick={() => navigate('/')}>
        {BACK_HOME_LABEL}
      </Button>
      <ConfirmDialog
        open={target !== null}
        title={target?.kind === 'all' ? CLEAR_PAST_GAMES_TITLE : DELETE_PAST_GAME_TITLE}
        text={
          target === null
            ? ''
            : target.kind === 'all'
              ? clearPastGamesText(games.length)
              : deletePastGameText(target.game, target.game.replay !== undefined)
        }
        confirmLabel={DELETE_LABEL}
        onCancel={() => setTarget(null)}
        onConfirm={confirm}
      />
    </Screen>
  );
}

function Row({ game, onDelete }: { game: PastGame; onDelete: () => void }) {
  const infoId = useId();
  const date = new Date(game.date);
  return (
    <li className="flex items-center justify-between gap-3 border-4 border-tinta bg-papel p-3">
      {/* O nome dos botões é só o texto visível ("Rever", "Apagar"); a linha inteira os descreve, para o leitor de tela saber de
          qual partida são. */}
      <div id={infoId} className="flex min-w-0 flex-col gap-0.5">
        <p className="text-xl font-extrabold">{pastGameResultText(game.outcome, game.seat)}</p>
        <p className="font-texto text-sm tabular-nums">
          <time dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}>{pastGameDateText(game.date)}</time>
        </p>
        <p>{againstText(game.names.opponent)}</p>
        <p className="text-sm font-semibold">{pastGameModeText(game.mode)}</p>
      </div>
      {/* Um sobre o outro: lado a lado, os dois não cabem com as informações num celular de 375 px. */}
      <div className="flex shrink-0 flex-col gap-2">
        {game.replay !== undefined ? (
          <Button aria-describedby={infoId} onClick={() => navigate(`/partidas/${game.id}`)}>
            {REVIEW_LABEL}
          </Button>
        ) : null}
        <Button variant="danger" data-apagar="" aria-describedby={infoId} onClick={onDelete}>
          {DELETE_LABEL}
        </Button>
      </div>
    </li>
  );
}
