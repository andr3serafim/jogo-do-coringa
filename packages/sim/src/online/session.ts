/**
 * Partida pela sala no terminal (spec §10.2): reaproveita a mesa, os textos e as perguntas do `pnpm play`.
 * Cada `state` cancela a pergunta pendente (AbortSignal), imprime o que mudou e pergunta de novo se for a sua vez.
 */
import type { GameEvent, GameResult } from '@coringa/engine';
import type { OutcomeCause, RoomConnection, RoomMessage, StateMessage } from '@coringa/protocol';
import { askAction } from '../play/game.ts';
import { playerActions } from './legal.ts';
import { isAbortError, QuitSignal, type Io } from '../play/io.ts';
import { eventText, resultText, type Names } from '../play/text.ts';

export interface PlayOnlineOptions {
  io: Io;
  connection: RoomConnection;
  names: Names;
}

const CAUSE_TEXT: Record<OutcomeCause, string> = {
  NORMAL: 'fim normal da partida',
  RECONNECT_TIMEOUT: 'quem caiu não voltou à sala em 60 s (W.O.)',
  AFK: 'três estouros de tempo seguidos (W.O.)',
  CONCEDE: 'desistência (W.O.)',
  ABANDONED: 'os dois saíram: partida sem resultado',
};

const KIND_TEXT = { EQUIP: 'Equipar', ORDER: 'Escolha da ordem', TURN: 'Turno', REACTION: 'Janela de reação' } as const;

/** Por que a conexão fechou de vez (spec §4.2). */
const CLOSE_TEXT: Record<number, string> = {
  1000: 'conexão encerrada',
  4000: 'a sala não existe mais',
  4001: 'versão do protocolo diferente da do servidor',
  4003: 'token ou origem recusados pelo servidor',
  4009: 'a sala foi aberta em outra aba ou terminal',
};

/** O servidor ainda vai mandar um `state` que explica a recusa: não adianta perguntar de novo antes dele. */
const WAIT_FOR_STATE = new Set<string>([
  'STALE_EPOCH',
  'DISCONNECTED',
  'ALREADY_PASSED',
  'NOT_PLAYING',
  'NOT_YOUR_TURN',
  'WRONG_PHASE',
  'GAME_OVER',
  'ALREADY_SUBMITTED',
]);

/**
 * Joga até a conexão fechar de vez, o jogador sair (Ctrl+C) ou recusar a revanche. Devolve o resultado da última
 * partida terminada (`null` se nenhuma terminou, ou se foi abandonada). Quem conecta é o chamador
 * (`RoomClient.connect()`), logo depois de chamar `playOnline`: a sala e o `state` que a conexão já tiver são tratados na hora.
 */
export function playOnline({ io, connection, names }: PlayOnlineOptions): Promise<{ result: GameResult | null }> {
  return new Promise((resolve, reject) => {
    let result: GameResult | null = null;
    let finished = false;
    let turn: AbortController | null = null;
    let rematchAsk: AbortController | null = null;
    let lastSeq = -1;
    /** Já disse "Aguardando o oponente…" nesta espera: a próxima linha só sai quando a vez voltar e passar de novo. */
    let waitingSaid = false;
    let promptedGameNo = 0;
    let opponentOnline = true;
    let wasDropped = false;

    const finish = (): void => {
      if (finished) return;
      finished = true;
      unsubscribe();
      turn?.abort();
      rematchAsk?.abort();
      resolve({ result });
    };

    const fail = (error: unknown): void => {
      if (error instanceof QuitSignal) finish();
      else if (!isAbortError(error) && !finished) {
        finished = true;
        unsubscribe();
        reject(error);
      }
    };

    const secondsLeft = (at: number): number => Math.ceil(connection.remainingMs({ kind: 'TURN', at, players: [] }) / 1000);

    const printEvents = (events: GameEvent[]): void => {
      for (const event of events) {
        if (event.type === 'GameOver') continue; // o resultado sai da sala (com a causa), uma vez só
        const line = eventText(event, names);
        if (line !== null) io.print(line);
      }
    };

    /** Pergunta e joga; recusas que o próximo `state` explica só esperam, as de regra perguntam de novo. */
    const play = async (state: StateMessage, ownTurn: AbortController): Promise<void> => {
      const legal = playerActions(state.view);
      try {
        await Promise.resolve(); // se outro `state` vier logo atrás, esta pergunta nem começa
        for (;;) {
          const action = await askAction(io, state.view, legal, names, ownTurn.signal);
          ownTurn.signal.throwIfAborted();
          const ack = await connection.act(action);
          // O servidor manda o `state` antes do `ack`: se já veio um novo, esta jogada não é mais assunto.
          if (ack.ok || ownTurn.signal.aborted) return;
          if (WAIT_FOR_STATE.has(ack.code)) {
            io.print(`Jogada não aplicada (${ack.code}); aguardando a mesa atualizar.`);
            return;
          }
          io.print(`Jogada recusada: ${ack.message}`);
        }
      } catch (error) {
        fail(error);
      }
    };

    const onState = (state: StateMessage): void => {
      const gameOver = state.view.phase.kind === 'GAME_OVER';
      // Quem decide é a sala: em FINISHED o retrato pode não ser GAME_OVER (o abandono não passa pelo motor, spec §2.3),
      // e aí não há jogada a pedir nem revanche a cancelar. Sem `room` ainda, vale o retrato.
      const playing = (connection.room?.status ?? 'PLAYING') === 'PLAYING' && !gameOver;
      turn?.abort();
      turn = null;
      if (playing) rematchAsk?.abort(); // partida nova: a pergunta de revanche perdeu o sentido
      if (state.seq > lastSeq) {
        lastSeq = state.seq;
        if (state.catchUp) io.print('— Eventos perdidos enquanto você estava fora —');
        if (state.resync && !gameOver) io.print('— Sincronizado com a sala; os eventos perdidos não estão mais disponíveis —');
        printEvents(state.events);
        if (state.deadline) {
          const who = state.deadline.players.map((id) => names.of(id)).join(' e ');
          io.print(`⏱ ${KIND_TEXT[state.deadline.kind]}: ${secondsLeft(state.deadline.at)} s (${who})`);
        }
      }
      if (!playing || playerActions(state.view).length === 0) {
        if (playing && !waitingSaid) io.print('Aguardando o oponente…');
        waitingSaid = playing;
        return;
      }
      waitingSaid = false;
      turn = new AbortController();
      void play(state, turn);
    };

    const askRematch = async (ask: AbortController): Promise<void> => {
      try {
        for (;;) {
          const answer = (await io.ask('Revanche? (s/n) ', ask.signal)).trim().toLowerCase();
          if (answer === 's' || answer === 'sim') {
            connection.rematch(true);
            io.print('Revanche pedida; aguardando o oponente aceitar…');
            return;
          }
          if (answer === 'n' || answer === 'não' || answer === 'nao') {
            connection.rematch(false);
            finish();
            return;
          }
          io.print('Responda s ou n.');
        }
      } catch (error) {
        fail(error);
      }
    };

    const onFinished = (room: RoomMessage): void => {
      const outcome = room.outcome;
      result = outcome?.result ?? null;
      const me = (connection.playerId ?? names.me) === 'p2' ? 'p2' : 'p1';
      const cause = outcome ? `Causa: ${outcome.cause} — ${CAUSE_TEXT[outcome.cause]}` : '';
      io.print(
        [
          result ? `\n${resultText(result, names)}` : '\nPartida sem resultado.',
          cause,
          `Placar: você ${room.score[me]} × ${room.score[me === 'p1' ? 'p2' : 'p1']} oponente · empates ${room.score.draws}`,
        ]
          .filter(Boolean)
          .join('\n'),
      );
      rematchAsk = new AbortController();
      void askRematch(rematchAsk);
    };

    const onRoom = (room: RoomMessage): void => {
      const mine = room.seats.find((candidate) => candidate.playerId === (connection.playerId ?? names.me));
      const other = room.seats.find((candidate) => candidate !== mine);
      if (other && room.status === 'PLAYING') {
        if (!other.connected && opponentOnline) {
          const left = other.woAt === undefined ? '' : ` Se não voltar, você vence por W.O. em ${secondsLeft(other.woAt)} s.`;
          io.print(`O oponente desconectou.${left}`);
        } else if (other.connected && !opponentOnline) {
          io.print('O oponente voltou.');
        }
      }
      if (other) opponentOnline = other.connected;
      if (room.status === 'LOBBY' && mine && !mine.ready) {
        io.print(`Sala ${room.code}: marcando pronto${room.seats.length < 2 ? ' (aguardando o outro jogador entrar)' : ''}.`);
        connection.ready(true);
      }
      if (room.status === 'PLAYING') rematchAsk?.abort();
      if (room.status === 'FINISHED') {
        // A partida acabou com uma pergunta de jogada no ar (ex.: abandono por estouros, cujo `state` vem antes do `room`).
        turn?.abort();
        turn = null;
      }
      if (room.status === 'FINISHED' && room.gameNo > promptedGameNo) {
        promptedGameNo = room.gameNo;
        onFinished(room);
      }
    };

    const unsubscribe = connection.subscribe((event) => {
      switch (event.type) {
        case 'room':
          onRoom(event.room);
          break;
        case 'state':
          onState(event.state);
          break;
        case 'error':
          io.print(`Erro do servidor: ${event.error.message}`);
          break;
        case 'open':
          if (wasDropped) io.print('Reconectado.');
          wasDropped = false;
          break;
        case 'closed':
          if (event.final) {
            io.print(`Desconectado (${event.code}): ${CLOSE_TEXT[event.code] ?? 'conexão encerrada'}.`);
            finish();
          } else {
            wasDropped = true;
            io.print(`Conexão perdida (${event.code}). Reconectando…`);
          }
          break;
      }
    });
    void io.closed?.then(finish);
    if (connection.room) onRoom(connection.room);
    if (connection.state) onState(connection.state);
  });
}
