// A tela do replay de uma partida da lista (`/partidas/<id>`, spec do polimento §4.3): acha a partida, confere que dá para
// revê-la e monta a trilha (o motor re-executado, `replay-track.ts`), uma vez, ao abrir. Quem navega pela trilha é o
// `ReplayViewer`. Os casos sem mesa (id que não está mais no navegador, partida sem replay, replay que nem começa) mostram o
// motivo e o caminho de volta à lista, e nunca quebram a tela. Ao abrir, o foco vai ao título (o da tela sem mesa, ou o da mesa).
//
// Entra por `React.lazy` (`App.tsx`), com `key={id}` (outro id é outra partida): fica fora do JavaScript inicial, e por isso a
// exportação é a `default`.
import { useState } from 'react';
import { BACK_TO_LIST_LABEL, PAST_GAMES_LABEL } from '../../model/copy.ts';
import { roomNames } from '../../model/history.ts';
import { findPastGame, type PastGame } from '../../model/past-games.ts';
import {
  myName,
  NO_REPLAY_TEXT,
  opponentName,
  replayStoppedText,
  UNKNOWN_GAME_TEXT,
} from '../../model/past-games-copy.ts';
import { buildTrack, type ReplayTrack } from '../../model/replay-track.ts';
import { loadPrefs, type KeyValueStore, type Prefs } from '../../model/storage.ts';
import { AppLink, Panel, Screen, Title } from '../parts.tsx';
import { ReplayViewer } from './ReplayViewer.tsx';

export interface ReplayScreenProps {
  store: KeyValueStore;
  /** O `id` da partida na lista (a rota só garante o formato). */
  id: string;
}

type Loaded = { kind: 'text'; text: string } | { kind: 'viewer'; game: PastGame; track: ReplayTrack; prefs: Prefs };

function load(store: KeyValueStore, id: string): Loaded {
  const game = findPastGame(store, id);
  if (game === null) return { kind: 'text', text: UNKNOWN_GAME_TEXT };
  const { replay } = game;
  // Uma entrada estragada pode guardar um assento que não joga o replay: sem ele a vista não existe.
  if (replay === undefined || !replay.players.includes(game.seat)) return { kind: 'text', text: NO_REPLAY_TEXT };
  const names = roomNames(game.seat, [
    { playerId: game.seat, nickname: myName(game.names.me) },
    { playerId: game.seat === 'p1' ? 'p2' : 'p1', nickname: opponentName(game.names.opponent) },
  ]);
  const track = buildTrack(replay, game.seat, names);
  // Nem a partida foi criada (config recusada, jogadores ruins): não há quadro para a mesa.
  if (track.frames.length === 0 && track.stoppedAt !== null) {
    return { kind: 'text', text: replayStoppedText(track.stoppedAt.step, track.stoppedAt.message) };
  }
  return { kind: 'viewer', game, track, prefs: loadPrefs(store) };
}

export default function ReplayScreen({ store, id }: ReplayScreenProps) {
  const [loaded] = useState(() => load(store, id));
  if (loaded.kind === 'text') return <Message text={loaded.text} />;
  return <ReplayViewer game={loaded.game} track={loaded.track} prefs={loaded.prefs} />;
}

/** Uma tela sem mesa: o motivo e o caminho de volta. */
function Message({ text }: { text: string }) {
  return (
    <Screen>
      <Title focusOnMount>{PAST_GAMES_LABEL}</Title>
      <Panel>
        <p>{text}</p>
        <AppLink to="/partidas">{BACK_TO_LIST_LABEL}</AppLink>
      </Panel>
    </Screen>
  );
}
