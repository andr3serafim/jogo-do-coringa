// A lista local das partidas terminadas (`/partidas`, spec do polimento §4.3): as últimas 20 deste navegador, da mais nova para a
// mais velha, cada uma com a data, contra quem foi, o resultado do ponto de vista do seu assento, o modo e, quando a partida
// ficou guardada com replay, o botão "Rever". Lê a lista uma vez, ao abrir (não há partida nova com esta tela aberta).
//
// Entra por `React.lazy` (`App.tsx`): fica fora do JavaScript inicial, e por isso a exportação é a `default`. Os textos moram em
// `past-games-copy.ts`, que só as telas carregadas sob demanda importam.
import { useId, useState } from 'react';
import { navigate } from '../../app/router.ts';
import { BACK_HOME_LABEL, PAST_GAMES_LABEL } from '../../model/copy.ts';
import { loadPastGames, type PastGame } from '../../model/past-games.ts';
import {
  againstText,
  PAST_GAMES_EMPTY_TEXT,
  pastGameDateText,
  pastGameModeText,
  pastGameResultText,
  REVIEW_LABEL,
} from '../../model/past-games-copy.ts';
import type { KeyValueStore } from '../../model/storage.ts';
import { Button, Panel, Screen, Title } from '../parts.tsx';

export interface PastGamesProps {
  store: KeyValueStore;
}

export default function PastGames({ store }: PastGamesProps) {
  const [games] = useState(() => loadPastGames(store));
  return (
    <Screen>
      <Title focusOnMount>{PAST_GAMES_LABEL}</Title>
      {games.length === 0 ? (
        <Panel>
          <p>{PAST_GAMES_EMPTY_TEXT}</p>
        </Panel>
      ) : (
        <ul role="list" className="flex list-none flex-col gap-3 p-0">
          {games.map((game) => (
            <Row key={game.id} game={game} />
          ))}
        </ul>
      )}
      <Button variant="secondary" onClick={() => navigate('/')}>
        {BACK_HOME_LABEL}
      </Button>
    </Screen>
  );
}

function Row({ game }: { game: PastGame }) {
  const infoId = useId();
  const date = new Date(game.date);
  return (
    <li className="flex items-center justify-between gap-3 border-4 border-tinta bg-papel p-3">
      {/* O nome do botão é só "Rever" (o texto visível); a linha inteira o descreve, para o leitor de tela saber de qual partida é. */}
      <div id={infoId} className="flex min-w-0 flex-col gap-0.5">
        <p className="text-xl font-extrabold">{pastGameResultText(game.outcome, game.seat)}</p>
        <p className="font-texto text-sm tabular-nums">
          <time dateTime={Number.isNaN(date.getTime()) ? undefined : date.toISOString()}>{pastGameDateText(game.date)}</time>
        </p>
        <p>{againstText(game.names.opponent)}</p>
        <p className="text-sm font-semibold">{pastGameModeText(game.mode)}</p>
      </div>
      {game.replay !== undefined ? (
        <Button aria-describedby={infoId} onClick={() => navigate(`/partidas/${game.id}`)}>
          {REVIEW_LABEL}
        </Button>
      ) : null}
    </li>
  );
}
