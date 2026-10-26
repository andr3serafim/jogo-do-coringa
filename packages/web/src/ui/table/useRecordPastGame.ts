// Grava a partida terminada na lista local (spec do polimento §4.1) no instante em que a sala vira `FINISHED` com `outcome`,
// sem esperar a mesa ficar quieta: quem sai durante a cena do último golpe não perde a partida. Uma vez por partida: a guarda é
// desta instância (um `ref` com o último `gameNo` gravado), nunca do módulo, porque o treino é sempre `TREINO` e recomeça no
// `gameNo` 1: /treino → início → /treino na mesma página é outra partida e tem de ser gravada. O `ref` também segura o efeito
// duplo do `<StrictMode>` e os `room` reemitidos da mesma partida (revanche pedida, oponente que sai).
//
// Uma tentativa só, e `null` quer dizer "não ficou guardada" (sem "Rever a partida"): o `safeStore` de produção guarda na memória
// a última tentativa que o `Storage` recusou, e uma segunda chamada faria a verificação de repetida devolver uma entrada que o
// disco não tem.
import { RULES_VERSION, type PlayerView } from '@coringa/engine';
import { useEffect, useRef, useState } from 'react';
import type { TrainingLevel } from '../../model/local-room.ts';
import { recordPastGame, type PastGame, type PastGameMode } from '../../model/past-games.ts';
import type { SessionSnapshot } from '../../model/session.ts';
import type { KeyValueStore } from '../../model/storage.ts';
import type { TableNames } from './labels.ts';

interface Recorded {
  gameNo: number;
  game: PastGame | null;
}

/**
 * A entrada gravada da partida que acabou (a da sala em `FINISHED`), ou `null` enquanto não houver uma: partida em curso, sem
 * `store`, ou armazenamento que recusou. O replay vem do `snapshot.replay` quando o `gameNo` dele é o da partida: o treino o
 * entrega antes do `room` em FINISHED; online, nesta fatia, ele não vem, e a linha fica sem replay.
 */
export function useRecordPastGame(
  snapshot: SessionSnapshot,
  view: PlayerView,
  names: TableNames,
  store: KeyValueStore | undefined,
  training: TrainingLevel | undefined,
): PastGame | null {
  const { room, replay } = snapshot;
  const outcome = room?.status === 'FINISHED' ? room.outcome : undefined;
  const lastGameNo = useRef<number | null>(null);
  const [recorded, setRecorded] = useState<Recorded | null>(null);
  const { me, round } = view;
  const { self, opponent } = names;

  useEffect(() => {
    if (store === undefined || room === null || outcome === undefined || lastGameNo.current === outcome.gameNo) return;
    lastGameNo.current = outcome.gameNo;
    const now = Date.now();
    const mode: PastGameMode = training === undefined ? { kind: 'online', code: room.code } : { kind: 'training', level: training };
    const entry: Omit<PastGame, 'id'> = {
      date: now,
      mode,
      seat: me,
      names: { me: self, opponent },
      outcome,
      rounds: round,
      score: room.score,
      rulesVersion: RULES_VERSION,
    };
    // Online a mesma partida pode chegar duas vezes (voltar à sala depois de terminada): a `key` as junta. O treino não tem.
    if (mode.kind === 'online') entry.key = `sala:${room.code}:${outcome.gameNo}`;
    if (replay !== null && replay.gameNo === outcome.gameNo) entry.replay = replay.replay;
    // Publica o resultado de gravar no armazenamento, que só este efeito faz: a mesa precisa dele para oferecer "Rever a partida".
    setRecorded({ gameNo: outcome.gameNo, game: recordPastGame(store, entry, now) });
  }, [store, room, outcome, replay, training, me, round, self, opponent]);

  return recorded !== null && outcome !== undefined && recorded.gameNo === outcome.gameNo ? recorded.game : null;
}
