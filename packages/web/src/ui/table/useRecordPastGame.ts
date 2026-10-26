// Grava a partida terminada na lista local (spec do polimento §4.1) no instante em que a sala vira `FINISHED` com `outcome`,
// sem esperar a mesa ficar quieta: quem sai durante a cena do último golpe não perde a partida. Uma vez por partida: a guarda é
// desta instância (um `ref` com o último `gameNo` gravado), nunca do módulo, porque o treino é sempre `TREINO` e recomeça no
// `gameNo` 1: /treino → início → /treino na mesma página é outra partida e tem de ser gravada. O `ref` também segura o efeito
// duplo do `<StrictMode>` e os `room` reemitidos da mesma partida (revanche pedida, oponente que sai).
//
// O replay entra na linha de duas maneiras. O treino o entrega antes do `room` em FINISHED, e ele vai na própria gravação. Online
// o servidor manda o `room` primeiro e o `replay` depois (e, na volta do `hello` com a sala terminada, a linha já existe sem
// ele): o segundo efeito o acrescenta à linha com `attachReplay`, uma vez por partida e só se o `gameNo` for o da linha. Isso
// roda mesmo que a sala feche logo depois (4000): o `replay` chega antes do `closed`, e a mesa ainda está montada para gravar.
//
// O segundo efeito aprende a linha gravada por um `ref` que o primeiro escreve, e não pelo estado que ele publica para o desenho:
// o `room` em FINISHED e o `replay` que chegam na mesma renderização anexam no mesmo desenho, sem esperar o seguinte.
//
// Uma tentativa só, para a gravação e para o anexo, e `null` quer dizer "não ficou guardada" (sem "Rever a partida"): o
// `safeStore` de produção guarda na memória a última tentativa que o `Storage` recusou (o `recordPastGame` e o `attachReplay`
// desfazem isso quando desistem), e uma segunda chamada faria a verificação de repetida devolver uma entrada que o disco não tem.
import { RULES_VERSION, type PlayerView } from '@coringa/engine';
import { useEffect, useRef, useState } from 'react';
import type { TrainingLevel } from '../../model/local-room.ts';
import { attachReplay, recordPastGame, type PastGame, type PastGameMode } from '../../model/past-games.ts';
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
 * entrega antes do `room` em FINISHED, e a linha já nasce com ele; online ele chega depois, e a entrada devolvida passa a tê-lo
 * quando é acrescentado (a mesma linha, com o `id` de antes).
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
  const lastAttachedNo = useRef<number | null>(null);
  const recordedRef = useRef<Recorded | null>(null);
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
    // O resultado de gravar no armazenamento, que só este efeito faz: o `ref` é para o efeito do anexo, logo abaixo, no mesmo
    // desenho; o estado, para a mesa oferecer "Rever a partida".
    const next: Recorded = { gameNo: outcome.gameNo, game: recordPastGame(store, entry, now) };
    recordedRef.current = next;
    setRecorded(next);
  }, [store, room, outcome, replay, training, me, round, self, opponent]);

  useEffect(() => {
    const current = recordedRef.current;
    if (store === undefined || outcome === undefined || current === null || current.gameNo !== outcome.gameNo) return;
    const { game } = current;
    // Sem linha, ou com a linha já com replay (o treino, ou a gravação que o levou): nada a acrescentar.
    if (game === null || game.replay !== undefined) return;
    // Só o replay desta partida, e uma tentativa por partida: depois de um `null` (armazenamento que recusou) não insiste.
    if (replay === null || replay.gameNo !== outcome.gameNo || lastAttachedNo.current === outcome.gameNo) return;
    lastAttachedNo.current = outcome.gameNo;
    // Com `null` (a linha sumiu ou o armazenamento recusou) a linha de antes continua: sem replay, e o painel sem "Rever".
    const next: Recorded = { gameNo: outcome.gameNo, game: attachReplay(store, game.id, replay.replay) ?? game };
    recordedRef.current = next;
    setRecorded(next);
  }, [store, outcome, replay]);

  return recorded !== null && outcome !== undefined && recorded.gameNo === outcome.gameNo ? recorded.game : null;
}
