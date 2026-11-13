// As aparências da mesa (decks e raças): a de cada dono, para o provedor, e as que a partida guardada leva. Fica num arquivo próprio para
// os testes provarem o memo pelo conteúdo.
import type { PlayerId } from '@coringa/engine';
import type { DeckId, Look, RaceId, SeatInfo } from '@coringa/protocol';
import { useMemo } from 'react';
import { botLook, recordedLooks, roomLooks } from '../../model/looks.ts';
import type { PastLooks } from '../../model/past-games.ts';

/** De onde vêm as aparências: o treino (a preferência e o bot), a sala online (os assentos) ou nenhuma (o tutorial, em cordel). */
export type TableLooksMode = 'training' | 'online' | 'none';

export interface TableLooks {
  /** A sua (a de quem olha). */
  mine: Look;
  /** A de cada dono, para o provedor. */
  owners: Partial<Record<PlayerId, Look>>;
  /**
   * A sua e a do oponente, para a gravação da partida (G3, H5); nenhuma quando as duas são o padrão, para a linha ficar como a de hoje
   * (sem elas o replay já é Cordel dos dois lados).
   */
  recorded: PastLooks | undefined;
}

/** As duas aparências da mesa, ainda sem memo: o treino pela preferência e pelo bot, o online pelos assentos (H2), o tutorial nenhuma. */
function sides(
  mode: TableLooksMode,
  preferred: Look,
  seats: readonly Pick<SeatInfo, 'playerId' | 'look'>[] | undefined,
  me: PlayerId,
  opponent: PlayerId,
): { mine: Look; theirs: Look } | null {
  switch (mode) {
    case 'training':
      return { mine: preferred, theirs: botLook(preferred) };
    case 'online':
      return roomLooks(seats ?? [], me, opponent);
    case 'none':
      return null;
  }
}

/**
 * As aparências da mesa (decks e raças): no treino fora do tutorial, a sua (das preferências) e a do bot (`botLook`, G1), calculada da sua
 * a cada desenho (G2: trocar a sua no menu troca a dele); na sala online, a de cada assento (fatia 3, §8.3), a sua também, nunca a
 * preferência (H2); no tutorial, nenhuma (o padrão dos dois lados).
 *
 * **Memoizada pelo conteúdo:** as dependências são os textos (o deck e a raça de cada lado) e os dois ids. O `botLook` devolve um objeto
 * novo, e cada mensagem `room` traz um `seats` novo (a presença, o pronto, o `woAt`): um `owners` novo a cada desenho mudaria o contexto
 * de toda carta.
 */
export function useTableLooks(
  mode: TableLooksMode,
  preferred: Look,
  seats: readonly Pick<SeatInfo, 'playerId' | 'look'>[] | undefined,
  me: PlayerId | undefined,
  opponent: PlayerId | undefined,
): TableLooks | null {
  const both = me === undefined || opponent === undefined ? null : sides(mode, preferred, seats, me, opponent);
  const myDeck: DeckId | undefined = both?.mine.deck;
  const myRace: RaceId | undefined = both?.mine.race;
  const theirDeck: DeckId | undefined = both?.theirs.deck;
  const theirRace: RaceId | undefined = both?.theirs.race;
  return useMemo(() => {
    if (myDeck === undefined || myRace === undefined || theirDeck === undefined || theirRace === undefined) return null;
    if (me === undefined || opponent === undefined) return null;
    const mine: Look = { deck: myDeck, race: myRace };
    const theirs: Look = { deck: theirDeck, race: theirRace };
    return { mine, owners: { [me]: mine, [opponent]: theirs }, recorded: recordedLooks(mine, theirs) };
  }, [myDeck, myRace, theirDeck, theirRace, me, opponent]);
}
