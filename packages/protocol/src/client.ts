/**
 * Cliente da sala (spec §4.2, §4.5–§4.7): conecta no WebSocket, manda o `hello`, mantém o ping,
 * reconecta sozinho, casa cada `act` com o seu `ack` e acompanha o relógio do servidor.
 * Não depende de framework: o terminal e a interface web usam o mesmo código.
 *
 * Relógio, sorteio, timers e WebSocket são injetáveis (padrão: os globais), para os testes
 * rodarem sem rede nem tempo real.
 */
import type { PlayerId } from '@coringa/engine';
import {
  ACK_TIMEOUT_MS,
  FINAL_CLOSE_CODES,
  PING_INTERVAL_MS,
  PONG_TIMEOUT_MS,
  PROTOCOL_VERSION,
  RECONNECT_DELAYS_MS,
  RECONNECT_JITTER,
  SLOW_RETRY_CODES,
  SLOW_RETRY_MS,
} from './constants.ts';
import type {
  AckMessage,
  ClientMessage,
  CreateRoomResponse,
  Deadline,
  ErrorMessage,
  JoinRoomResponse,
  PlayerAction,
  ReplayMessage,
  RoomInfoResponse,
  RoomMessage,
  ServerMessage,
  StateMessage,
} from './messages.ts';

export type ConnectionEvent =
  | { type: 'open' }
  | { type: 'room'; room: RoomMessage }
  | { type: 'state'; state: StateMessage }
  /** A partida gravada: a sala local do treino a emite no fim da partida e o `RoomClient` repassa a mensagem do servidor. */
  | { type: 'replay'; replay: ReplayMessage }
  | { type: 'error'; error: ErrorMessage }
  | { type: 'closed'; code: number; final: boolean };

export interface RoomConnection {
  readonly playerId: PlayerId | null;
  readonly room: RoomMessage | null;
  readonly state: StateMessage | null;
  subscribe(listener: (e: ConnectionEvent) => void): () => void;
  ready(value: boolean): void;
  leave(): void;
  rematch(want: boolean): void;
  close(): void;
  /** Abre o socket. Sem efeito se já houver um aberto ou uma reconexão agendada. */
  connect(): void;
  /**
   * A aba voltou ao primeiro plano. Reconexão agendada: abre já, salvo a espera lenta (`SLOW_RETRY_CODES`, o servidor
   * limitou ou barrou a conexão), que a volta da aba não encurta. Socket aberto: manda `ping` e, sem `pong` em
   * `PONG_TIMEOUT_MS`, dá o socket por morto e reconecta. Fechado de vez: nada.
   */
  wake(): void;
  /** `options.auto` marca a jogada como automática (passe ou ordem confirmados sem o jogador). */
  act(action: PlayerAction, options?: { auto?: boolean }): Promise<AckMessage>;
  concede(): Promise<AckMessage>;
  /** Tempo que falta para o prazo, pelo relógio do servidor (nunca negativo). */
  remainingMs(deadline: Deadline): number;
}

/**
 * O que o cliente usa de um WebSocket. Os handlers `on*` são declarados aqui porque os tipos do
 * workerd (que o `@coringa/server` usa para checar o núcleo) não os trazem; nos tipos DOM e no
 * `ws` do Node eles existem.
 */
type EventSocket = Omit<WebSocket, 'onopen' | 'onmessage' | 'onclose'> & {
  onopen: (() => void) | null;
  onmessage: ((ev: { data: unknown }) => void) | null;
  onclose: ((ev: { code: number }) => void) | null;
};

export interface RoomClientOptions {
  /** Origem do servidor, `http(s)://host[:porta]`. */
  server: string;
  code: string;
  token: string;
  /** Último `seq` aplicado por uma instância anterior (ex.: processo ou página que fechou); o primeiro `hello` o leva, e um `state` em memória passa a valer no lugar. */
  lastSeq?: number;
  WebSocketImpl?: typeof WebSocket;
  random?: () => number;
  setTimer?: (fn: () => void, ms: number) => unknown;
  clearTimer?: (handle: unknown) => void;
  now?: () => number;
}

/** `readyState` de um WebSocket aberto. */
const WS_OPEN = 1;

function disconnectedAck(id: string): AckMessage {
  return { t: 'ack', id, ok: false, code: 'DISCONNECTED', message: 'Sem conexão com a sala.' };
}

export class RoomClient implements RoomConnection {
  #playerId: PlayerId | null = null;
  #room: RoomMessage | null = null;
  #state: StateMessage | null = null;

  readonly #options: RoomClientOptions;
  readonly #random: () => number;
  readonly #setTimer: (fn: () => void, ms: number) => unknown;
  readonly #clearTimer: (handle: unknown) => void;
  readonly #now: () => number;
  readonly #idPrefix: string;
  readonly #listeners = new Set<(e: ConnectionEvent) => void>();
  /** Cada pendência leva o timer do prazo do `ack`. */
  readonly #pending = new Map<string, { resolve: (ack: AckMessage) => void; timer: unknown }>();

  #ws: EventSocket | null = null;
  #pingTimer: unknown = null;
  #reconnectTimer: unknown = null;
  /** A reconexão agendada é a espera lenta de `SLOW_RETRY_MS`: o `wake()` não a pula. */
  #reconnectSlow = false;
  #pongTimer: unknown = null;
  #attempt = 0;
  /** Quantas vezes `close()` foi chamado: um listener de `closed` pode fechar de vez no meio do aviso de queda. */
  #manualCloses = 0;
  #idCounter = 0;
  /** Servidor menos relógio local, medido na chegada de cada `welcome`/`state`. */
  #clockOffset = 0;

  constructor(options: RoomClientOptions) {
    this.#options = options;
    this.#random = options.random ?? Math.random;
    this.#setTimer = options.setTimer ?? ((fn, ms) => setTimeout(fn, ms));
    this.#clearTimer = options.clearTimer ?? ((handle) => clearTimeout(handle as ReturnType<typeof setTimeout>));
    this.#now = options.now ?? Date.now;
    // 6 caracteres base 36 sorteados uma vez por instância; o contador separa as jogadas.
    this.#idPrefix = Math.floor(this.#random() * 36 ** 6)
      .toString(36)
      .padStart(6, '0');
  }

  get playerId(): PlayerId | null {
    return this.#playerId;
  }

  get room(): RoomMessage | null {
    return this.#room;
  }

  get state(): StateMessage | null {
    return this.#state;
  }

  subscribe(listener: (e: ConnectionEvent) => void): () => void {
    this.#listeners.add(listener);
    return () => {
      this.#listeners.delete(listener);
    };
  }

  /** Abre o socket. Sem efeito se já houver um aberto ou uma reconexão agendada. */
  connect(): void {
    if (this.#ws || this.#reconnectTimer !== null) return;
    this.#openSocket();
  }

  ready(value: boolean): void {
    this.#send({ t: 'ready', ready: value });
  }

  leave(): void {
    this.#send({ t: 'leave' });
  }

  rematch(want: boolean): void {
    this.#send({ t: 'rematch', want });
  }

  /** Fecha de vez (1000), sem reconectar. */
  close(): void {
    this.#manualCloses += 1;
    const ws = this.#ws;
    const waiting = this.#reconnectTimer !== null;
    this.#clearReconnect();
    this.#stopPing();
    this.#clearPong();
    this.#ws = null;
    this.#failPending();
    ws?.close(1000);
    if (ws || waiting) this.#emit({ type: 'closed', code: 1000, final: true });
  }

  wake(): void {
    if (this.#reconnectTimer !== null) {
      // 1008 e 4029 pedem 30 s de calma, e a tela diz isso: voltar à aba não é motivo para voltar antes.
      if (this.#reconnectSlow) return;
      this.#clearReconnect();
      this.#openSocket();
      return;
    }
    const ws = this.#ws;
    // Ainda abrindo (ou fechando): não há o que sondar.
    if (!ws || ws.readyState !== WS_OPEN) return;
    ws.send('ping');
    // Um prazo já armado vale: um `wake()` repetido não o estende.
    if (this.#pongTimer !== null) return;
    this.#pongTimer = this.#setTimer(() => {
      this.#pongTimer = null;
      this.#dropDeadSocket();
    }, PONG_TIMEOUT_MS);
  }

  act(action: PlayerAction, options?: { auto?: boolean }): Promise<AckMessage> {
    const epoch = this.#state?.epoch ?? 0;
    return this.#request((id) => {
      const msg: Extract<ClientMessage, { t: 'act' }> = { t: 'act', id, epoch, action };
      if (options?.auto) msg.auto = true;
      return msg;
    });
  }

  concede(): Promise<AckMessage> {
    return this.#request((id) => ({ t: 'concede', id }));
  }

  remainingMs(deadline: Deadline): number {
    return Math.max(0, deadline.at - (this.#now() + this.#clockOffset));
  }

  /** Cada listener isolado: a exceção de um vai ao `console.error` e não impede os outros nem o resto do cliente. */
  #emit(event: ConnectionEvent): void {
    for (const listener of [...this.#listeners]) {
      try {
        listener(event);
      } catch (error) {
        console.error('RoomClient: erro num listener', error);
      }
    }
  }

  #send(msg: ClientMessage): boolean {
    const ws = this.#ws;
    if (!ws || ws.readyState !== WS_OPEN) return false;
    ws.send(JSON.stringify(msg));
    return true;
  }

  #request(build: (id: string) => ClientMessage): Promise<AckMessage> {
    const id = `${this.#idPrefix}-${++this.#idCounter}`;
    return new Promise((resolve) => {
      if (!this.#send(build(id))) {
        resolve(disconnectedAck(id));
        return;
      }
      // Sem `ack` no prazo, o socket está "aberto" mas morto (iPhone em segundo plano): troca por outro.
      const timer = this.#setTimer(() => this.#dropDeadSocket(), ACK_TIMEOUT_MS);
      this.#pending.set(id, { resolve, timer });
    });
  }

  #failPending(): void {
    const pending = [...this.#pending];
    this.#pending.clear();
    for (const [id, { resolve, timer }] of pending) {
      this.#clearTimer(timer);
      resolve(disconnectedAck(id));
    }
  }

  /**
   * Solta o socket que parou de responder sem passar por `#onClose` (o 1000 que o `close()` manda
   * seria lido como fechamento final): desliga os handlers, fecha, avisa a queda (1006, não final),
   * resolve as pendências e abre outro na hora, sem espera nem contagem de tentativas.
   */
  #dropDeadSocket(): void {
    const ws = this.#ws;
    if (!ws) return;
    ws.onopen = null;
    ws.onmessage = null;
    ws.onclose = null;
    this.#ws = null;
    this.#stopPing();
    this.#clearPong();
    this.#failPending();
    ws.close(1000);
    const closes = this.#manualCloses;
    this.#emit({ type: 'closed', code: 1006, final: false });
    // Um listener que chamou `close()` durante o aviso fechou de vez: não reconecta.
    if (closes === this.#manualCloses) this.#openSocket();
  }

  #wsUrl(): string {
    const base = this.#options.server.replace(/\/+$/, '').replace(/^http/, 'ws');
    return `${base}/api/rooms/${encodeURIComponent(this.#options.code)}/ws`;
  }

  #openSocket(): void {
    const Impl = this.#options.WebSocketImpl ?? globalThis.WebSocket;
    const ws = new Impl(this.#wsUrl()) as EventSocket;
    this.#ws = ws;
    ws.onopen = () => {
      if (this.#ws !== ws) return;
      const hello: Extract<ClientMessage, { t: 'hello' }> = { t: 'hello', protocol: PROTOCOL_VERSION, token: this.#options.token };
      const lastSeq = this.#state?.seq ?? this.#options.lastSeq;
      if (lastSeq !== undefined) hello.lastSeq = lastSeq;
      this.#send(hello);
      this.#schedulePing();
      this.#emit({ type: 'open' });
    };
    ws.onmessage = (ev) => {
      if (this.#ws !== ws) return;
      this.#onMessage(ev.data);
    };
    ws.onclose = (ev) => {
      if (this.#ws !== ws) return;
      this.#onClose(ev.code);
    };
  }

  #onMessage(data: unknown): void {
    if (data === 'pong') {
      this.#clearPong();
      return;
    }
    if (typeof data !== 'string') return;
    let msg: ServerMessage;
    try {
      msg = JSON.parse(data) as ServerMessage;
    } catch {
      return;
    }
    if (typeof msg !== 'object' || msg === null) return;
    switch (msg.t) {
      case 'welcome':
        // Só o `welcome` prova que a conexão foi aceita: um servidor que aceita e fecha (1011, 4008) não zera a espera.
        this.#attempt = 0;
        this.#playerId = msg.playerId;
        this.#syncClock(msg.serverNow);
        break;
      case 'room':
        this.#room = msg;
        this.#emit({ type: 'room', room: msg });
        break;
      case 'state':
        // Repetido ou atrasado é descartado; igual passa (a reconexão reenvia o retrato atual).
        if (this.#state && msg.seq < this.#state.seq) return;
        this.#state = msg;
        this.#syncClock(msg.serverNow);
        this.#emit({ type: 'state', state: msg });
        break;
      case 'ack': {
        const entry = this.#pending.get(msg.id);
        if (!entry) return;
        this.#pending.delete(msg.id);
        this.#clearTimer(entry.timer);
        entry.resolve(msg);
        break;
      }
      case 'replay':
        // Só repassa: não guarda estado (quem decide a que partida pertence é a camada de cima, pelo `gameNo`).
        if (typeof msg.gameNo !== 'number' || typeof msg.replay !== 'object' || msg.replay === null) return;
        this.#emit({ type: 'replay', replay: msg });
        break;
      case 'error':
        this.#emit({ type: 'error', error: msg });
        break;
    }
  }

  #syncClock(serverNow: number): void {
    this.#clockOffset = serverNow - this.#now();
  }

  #onClose(code: number): void {
    this.#ws = null;
    this.#stopPing();
    this.#clearPong();
    this.#failPending();
    const final = FINAL_CLOSE_CODES.includes(code);
    const closes = this.#manualCloses;
    this.#emit({ type: 'closed', code, final });
    // Um listener que chamou `close()` durante o aviso fechou de vez: não reconecta.
    if (!final && closes === this.#manualCloses) this.#scheduleReconnect(code);
  }

  #scheduleReconnect(code: number): void {
    let delay: number;
    this.#reconnectSlow = SLOW_RETRY_CODES.includes(code);
    if (this.#reconnectSlow) {
      delay = SLOW_RETRY_MS;
    } else {
      const base = RECONNECT_DELAYS_MS[Math.min(this.#attempt, RECONNECT_DELAYS_MS.length - 1)]!;
      this.#attempt++;
      delay = Math.round(base * (1 + (this.#random() * 2 - 1) * RECONNECT_JITTER));
    }
    this.#reconnectTimer = this.#setTimer(() => {
      this.#reconnectTimer = null;
      this.#reconnectSlow = false;
      this.#openSocket();
    }, delay);
  }

  #clearReconnect(): void {
    if (this.#reconnectTimer === null) return;
    this.#clearTimer(this.#reconnectTimer);
    this.#reconnectTimer = null;
    this.#reconnectSlow = false;
  }

  #schedulePing(): void {
    this.#pingTimer = this.#setTimer(() => {
      const ws = this.#ws;
      if (ws && ws.readyState === WS_OPEN) ws.send('ping');
      this.#schedulePing();
    }, PING_INTERVAL_MS);
  }

  #clearPong(): void {
    if (this.#pongTimer === null) return;
    this.#clearTimer(this.#pongTimer);
    this.#pongTimer = null;
  }

  #stopPing(): void {
    if (this.#pingTimer === null) return;
    this.#clearTimer(this.#pingTimer);
    this.#pingTimer = null;
  }
}

/** Resposta HTTP que não é 2xx. */
export class HttpError extends Error {
  status: number;

  constructor(status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

async function call<T>(
  fetchImpl: typeof fetch | undefined,
  url: string,
  init?: { method: string; nickname: string },
): Promise<T> {
  const doFetch = fetchImpl ?? globalThis.fetch;
  const res = await doFetch(
    url,
    init
      ? {
          method: init.method,
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ nickname: init.nickname }),
        }
      : { method: 'GET' },
  );
  if (!res.ok) throw new HttpError(res.status);
  return (await res.json()) as T;
}

function baseOf(server: string): string {
  return server.replace(/\/+$/, '');
}

export function createRoom(server: string, nickname: string, fetchImpl?: typeof fetch): Promise<CreateRoomResponse> {
  return call(fetchImpl, `${baseOf(server)}/api/rooms`, { method: 'POST', nickname });
}

export function joinRoom(
  server: string,
  code: string,
  nickname: string,
  fetchImpl?: typeof fetch,
): Promise<JoinRoomResponse> {
  return call(fetchImpl, `${baseOf(server)}/api/rooms/${encodeURIComponent(code)}/join`, {
    method: 'POST',
    nickname,
  });
}

export function roomInfo(server: string, code: string, fetchImpl?: typeof fetch): Promise<RoomInfoResponse> {
  return call(fetchImpl, `${baseOf(server)}/api/rooms/${encodeURIComponent(code)}`);
}
