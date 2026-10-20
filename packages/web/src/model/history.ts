// Histórico da mesa (spec §3.1, §4.1 e §10.5). Puro: sem React nem DOM. Cada `state` acrescenta as linhas dos seus
// eventos, com os textos de `@coringa/sim/text` (os mesmos do terminal). Quem guarda o `HistoryState` é a `Session`,
// que vê todo `state` (um componente que acumulasse por render perderia os `state`s agrupados num só desenho).
//
// Quando a partida recomeça: pelo número da partida da sala (`forGame`). O gatilho "`RoundStarted` da rodada 1" não
// serve: o primeiro `state` de uma partida (servidor e treino) vem sem eventos. Por isso o histórico vazio abre
// com a rodada em que a partida está (vinda da `view`), com o mesmo texto do evento.
import type { PlayerId } from '@coringa/engine';
import type { SeatInfo, StateMessage } from '@coringa/protocol';
import { eventText, type Names } from '@coringa/sim/text';

/** `round`: cabeçalho de rodada; `note`: aviso da sincronização; `event`: o que aconteceu. */
export type HistoryKind = 'round' | 'note' | 'event';

export interface HistoryLine {
  /** `seq` do `state` que trouxe a linha: as linhas com `seq` maior que o da base das marcas são "novas". */
  seq: number;
  kind: HistoryKind;
  text: string;
}

export interface HistoryState {
  /** Partida a que as linhas pertencem; `null` até a primeira `room`. */
  gameNo: number | null;
  /** Último `seq` aceito. Só sobe, inclusive entre partidas (spec 2 §4.5). */
  lastSeq: number;
  lines: readonly HistoryLine[];
}

export const EMPTY_HISTORY: HistoryState = { gameNo: null, lastSeq: 0, lines: [] };

export const CATCH_UP_TEXT = 'Enquanto você estava fora';
export const RESYNC_TEXT = 'Mesa sincronizada';

const OPPONENT_FALLBACK = 'Oponente';

/** Os nomes dos textos: "Você" e o apelido do outro assento ("de você", "de Duda"). */
export function roomNames(me: PlayerId, seats: readonly Pick<SeatInfo, 'playerId' | 'nickname'>[]): Names {
  const nickname = (id: PlayerId): string => seats.find((seat) => seat.playerId === id)?.nickname ?? OPPONENT_FALLBACK;
  return {
    me,
    of: (id) => (id === me ? 'Você' : nickname(id)),
    de: (id) => (id === me ? 'de você' : `de ${nickname(id)}`),
  };
}

/** Prepara o histórico para a partida `gameNo`: o primeiro número só é marcado; outro número esvazia as linhas. */
export function forGame(prev: HistoryState, gameNo: number): HistoryState {
  if (prev.gameNo === gameNo) return prev;
  if (prev.gameNo === null) return { ...prev, gameNo };
  return { gameNo, lastSeq: prev.lastSeq, lines: [] };
}

/** "Rodada 4: Ataque": o texto do evento sem a quebra de linha e os traços do terminal. */
function roundHeader(round: number, kind: 'EQUIP' | 'ATTACK', names: Names): string {
  return (eventText({ type: 'RoundStarted', round, kind }, names) ?? '').replace(/[\n═]/g, '').trim();
}

/** Linha sem o `seq`, que é o da mensagem inteira. */
type Draft = Pick<HistoryLine, 'kind' | 'text'>;

function eventLines(msg: StateMessage, names: Names): Draft[] {
  return msg.events.flatMap((event): Draft[] => {
    const text = eventText(event, names);
    if (text === null) return [];
    if (event.type === 'RoundStarted') return [{ kind: 'round', text: roundHeader(event.round, event.kind, names) }];
    return [{ kind: 'event', text }];
  });
}

/**
 * Acrescenta as linhas de um `state`. `seq` repetido ou antigo não muda nada (devolve o mesmo objeto).
 * - `catchUp`: "Enquanto você estava fora" antes dos eventos perdidos (sem nenhum com texto, sem cabeçalho);
 * - `resync`: só "Mesa sincronizada"; os eventos não entram, porque a mesa trocou de uma vez;
 * - histórico vazio: abre com a rodada atual, se a mensagem não trouxer o início de rodada.
 */
export function appendHistory(prev: HistoryState, msg: StateMessage, names: Names): HistoryState {
  if (msg.seq <= prev.lastSeq) return prev;
  const events = msg.resync ? [] : eventLines(msg, names);
  const drafts: Draft[] = [];
  if (prev.lines.length === 0 && !events.some((line) => line.kind === 'round')) {
    drafts.push({ kind: 'round', text: roundHeader(msg.view.round, msg.view.roundKind, names) });
  }
  if (msg.resync) drafts.push({ kind: 'note', text: RESYNC_TEXT });
  else if (msg.catchUp && events.length > 0) drafts.push({ kind: 'note', text: CATCH_UP_TEXT });
  drafts.push(...events);
  const lines = drafts.map((draft): HistoryLine => ({ seq: msg.seq, ...draft }));
  return { ...prev, lastSeq: msg.seq, lines: [...prev.lines, ...lines] };
}

/** Quantas linhas são novas: as de `seq` maior que o da base das marcas (spec §10.5). Sem base, nenhuma. */
export function newLineCount(history: HistoryState, baseSeq: number | null): number {
  if (baseSeq === null) return 0;
  return history.lines.filter((line) => line.seq > baseSeq).length;
}
