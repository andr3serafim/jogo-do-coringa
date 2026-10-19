// A porta da interface para o servidor: HTTP (criar, entrar, consultar) e a conexão da sala. As telas só
// conhecem `RoomApi`; os testes trocam o HTTP e a conexão por falsos (spec §9).
import {
  createRoom,
  joinRoom,
  roomInfo,
  RoomClient,
  type CreateRoomResponse,
  type JoinRoomResponse,
  type RoomClientOptions,
  type RoomConnection,
  type RoomInfoResponse,
} from '@coringa/protocol';
import { Session, type SessionDeps } from '../model/session.ts';
import { loadPrefs, saveLastSeq, type KeyValueStore, type SeatSession } from '../model/storage.ts';

export interface RoomApi {
  create(nickname: string): Promise<CreateRoomResponse>;
  join(code: string, nickname: string): Promise<JoinRoomResponse>;
  info(code: string): Promise<RoomInfoResponse>;
  /**
   * Abre a conexão da sala com o assento salvo e devolve a sessão dela. Quem recebe a sessão chama
   * `dispose()` ao sair: isso também fecha a conexão (veja `RoomSession`).
   */
  connect(code: string, seat: SeatSession): Session;
}

/**
 * `RoomClient` cujo `wake()` também reabre uma conexão que parou de vez (4009: "Usar aqui", spec §6.3).
 * Sem isso, o `wake()` do cliente não faz nada depois de um fechamento final.
 */
class ReopenableClient extends RoomClient {
  #stopped = false;
  /** `close()` fecha para sempre: depois dele, nem o `wake()` reabre. */
  #closed = false;

  constructor(options: RoomClientOptions) {
    super(options);
    this.subscribe((event) => {
      if (event.type === 'closed') this.#stopped = event.final;
      else if (event.type === 'open') this.#stopped = false;
    });
  }

  override close(): void {
    this.#closed = true;
    super.close();
  }

  override wake(): void {
    if (this.#closed) return;
    if (this.#stopped) {
      this.#stopped = false;
      this.connect();
      return;
    }
    super.wake();
  }
}

/** Uma `Session` que é dona da conexão: o `dispose()` solta a sessão e fecha o socket, nessa ordem. */
class RoomSession extends Session {
  readonly #closeConnection: () => void;

  constructor(connection: RoomConnection, deps: SessionDeps, prefs: ReturnType<typeof loadPrefs>, close: () => void) {
    super(connection, deps, prefs);
    this.#closeConnection = close;
  }

  override dispose(): void {
    super.dispose();
    this.#closeConnection();
  }
}

export interface RoomApiOptions {
  store: KeyValueStore;
  /** Origem do servidor; o padrão é a do próprio site. */
  server?: string;
  /** Cria o cliente da conexão; os testes entregam uma conexão falsa. */
  makeClient?: (options: RoomClientOptions) => RoomConnection;
  fetchImpl?: typeof fetch;
}

export function createRoomApi({ store, server, makeClient, fetchImpl }: RoomApiOptions): RoomApi {
  const origin = server ?? window.location.origin;
  const build = makeClient ?? ((options: RoomClientOptions): RoomConnection => new ReopenableClient(options));
  return {
    create: (nickname) => createRoom(origin, nickname, fetchImpl),
    join: (code, nickname) => joinRoom(origin, code, nickname, fetchImpl),
    info: (code) => roomInfo(origin, code, fetchImpl),
    connect(code, seat) {
      const client = build({
        server: origin,
        code,
        token: seat.token,
        ...(seat.lastSeq === undefined ? {} : { lastSeq: seat.lastSeq }),
      });
      const session = new RoomSession(
        client,
        {
          now: () => Date.now(),
          setTimer: (fn, ms) => setTimeout(fn, ms),
          clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
          // O `lastSeq` de cada `state` fica guardado: a página recarregada pede os eventos perdidos (spec §6.1).
          onSeq: (seq) => saveLastSeq(store, code, seq),
        },
        loadPrefs(store),
        () => client.close(),
      );
      client.connect();
      return session;
    },
  };
}
