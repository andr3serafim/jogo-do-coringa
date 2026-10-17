/** Bot que joga pela sala (spec §10.2): marca pronto, joga com um bot do simulador e aceita revanche. */
import { playerActions } from './legal.ts';
import type { PlayerAction, RoomConnection } from '@coringa/protocol';
import { BOTS, type BotName } from '../bots/index.ts';
import { actionText } from '../play/text.ts';
import { createRng } from '../rng.ts';

export interface RunBotOptions {
  connection: RoomConnection;
  bot: BotName;
  seed: string;
  /** Pausa de "pensando" antes de cada jogada, para dar para acompanhar. Padrão: 600 ms. */
  thinkMs?: number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  /** Uma linha por jogada, jogada recusada e mudança de sala. */
  log?: (line: string) => void;
}

/**
 * Joga até a conexão fechar de vez. Quem conecta é o chamador (`RoomClient.connect()`), depois de chamar `runBot`.
 *
 * A cada `state` com jogada legal, espera `thinkMs` e joga sobre o `state` mais recente da conexão. Cada `state`
 * invalida a espera anterior: se a fase mudou nesse meio-tempo (época nova, ou só a vez do oponente), a jogada
 * pensada para a mesa antiga é descartada, e o `state` novo agenda a sua própria.
 */
export function runBot(options: RunBotOptions): Promise<void> {
  const { connection, log = () => {} } = options;
  const bot = BOTS[options.bot];
  const rng = createRng(options.seed);
  const thinkMs = options.thinkMs ?? 600;
  const setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));

  return new Promise((resolve) => {
    let generation = 0;
    let rematchGameNo = 0;

    const onRoom = (room: NonNullable<RoomConnection['room']>): void => {
      const mine = room.seats.find((candidate) => candidate.playerId === connection.playerId);
      if (!mine) return;
      if (room.status === 'LOBBY' && !mine.ready) {
        log('Pronto.');
        connection.ready(true);
      }
      // Uma revanche por partida: o servidor limita as mensagens por segundo.
      if (room.status === 'FINISHED' && room.gameNo > rematchGameNo) {
        rematchGameNo = room.gameNo;
        log(`Fim da partida (${room.outcome?.cause ?? 'sem causa'}); aceito a revanche.`);
        connection.rematch(true);
      }
    };

    const onState = (): void => {
      const mine = (generation += 1);
      const state = connection.state;
      if (!state || playerActions(state.view).length === 0) return;
      setTimer(() => {
        if (mine !== generation) return;
        const latest = connection.state;
        if (!latest) return;
        const legal = playerActions(latest.view);
        if (legal.length === 0) return;
        const action = bot(latest.view, legal, rng) as PlayerAction; // o bot escolhe da lista, que só tem jogadas de jogador
        log(`Jogou: ${actionText(action, latest.view)}`);
        void connection.act(action).then((ack) => {
          if (!ack.ok) log(`Jogada recusada (${ack.code}): ${ack.message}`);
        });
      }, thinkMs);
    };

    const unsubscribe = connection.subscribe((event) => {
      if (event.type === 'room') onRoom(event.room);
      else if (event.type === 'state') onState();
      else if (event.type === 'closed' && event.final) {
        generation += 1;
        unsubscribe();
        resolve();
      }
    });
    if (connection.room) onRoom(connection.room);
    if (connection.state) onState();
  });
}
