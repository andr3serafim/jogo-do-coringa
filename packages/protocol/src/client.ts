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
  FINAL_CLOSE_CODES,
  PING_INTERVAL_MS,
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
  RoomInfoResponse,
  RoomMessage,
  ServerMessage,
  StateMessage,
} from './messages.ts';

export type ConnectionEvent =
  | { type: 'open' }
  | { type: 'room'; room: RoomMessage }
  | { type: 'state'; state: StateMessage }
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
  act(action: PlayerAction): Promise<AckMessage>;
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
  readonly #pending = new Map<string, (ack: AckMessage) => void>();

  #ws: EventSocket | null = null;
  #pingTimer: unknown = null;
  #reconnectTimer: unknown = null;
  #attempt = 0;
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
    const ws = this.#ws;
    const waiting = this.#reconnectTimer !== null;
    this.#clearReconnect();
    this.#stopPing();
    this.#ws = null;
    this.#failPending();
    ws?.close(1000);
    if (ws || waiting) this.#emit({ type: 'closed', code: 1000, final: true });
  }

  act(action: PlayerAction): Promise<AckMessage> {
    const epoch = this.#state?.epoch ?? 0;
    return this.#request((id) => ({ t: 'act', id, epoch, action }));
  }

  concede(): Promise<AckMessage> {
    return this.#request((id) => ({ t: 'concede', id }));
  }

  remainingMs(deadline: Deadline): number {
    return Math.max(0, deadline.at - (this.#now() + this.#clockOffset));
  }

  #emit(event: ConnectionEvent): void {
    for (const listener of [...this.#listeners]) listener(event);
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
      this.#pending.set(id, resolve);
      if (!this.#send(build(id))) {
        this.#pending.delete(id);
        resolve(disconnectedAck(id));
      }
    });
  }

  #failPending(): void {
    const pending = [...this.#pending];
    this.#pending.clear();
    for (const [id, resolve] of pending) resolve(disconnectedAck(id));
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
      this.#attempt = 0;
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
    if (typeof data !== 'string' || data === 'pong') return;
    let msg: ServerMessage;
    try {
      msg = JSON.parse(data) as ServerMessage;
    } catch {
      return;
    }
    if (typeof msg !== 'object' || msg === null) return;
    switch (msg.t) {
      case 'welcome':
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
        const resolve = this.#pending.get(msg.id);
        if (!resolve) return;
        this.#pending.delete(msg.id);
        resolve(msg);
        break;
      }
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
    this.#failPending();
    const final = FINAL_CLOSE_CODES.includes(code);
    this.#emit({ type: 'closed', code, final });
    if (!final) this.#scheduleReconnect(code);
  }

  #scheduleReconnect(code: number): void {
    let delay: number;
    if (SLOW_RETRY_CODES.includes(code)) {
      delay = SLOW_RETRY_MS;
    } else {
      const base = RECONNECT_DELAYS_MS[Math.min(this.#attempt, RECONNECT_DELAYS_MS.length - 1)]!;
      this.#attempt++;
      delay = Math.round(base * (1 + (this.#random() * 2 - 1) * RECONNECT_JITTER));
    }
    this.#reconnectTimer = this.#setTimer(() => {
      this.#reconnectTimer = null;
      this.#openSocket();
    }, delay);
  }

  #clearReconnect(): void {
    if (this.#reconnectTimer === null) return;
    this.#clearTimer(this.#reconnectTimer);
    this.#reconnectTimer = null;
  }

  #schedulePing(): void {
    this.#pingTimer = this.#setTimer(() => {
      const ws = this.#ws;
      if (ws && ws.readyState === WS_OPEN) ws.send('ping');
      this.#schedulePing();
    }, PING_INTERVAL_MS);
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
