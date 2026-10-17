import { SELF } from 'cloudflare:test';
import { legalActions } from '@coringa/engine';
import { PROTOCOL_VERSION } from '@coringa/protocol';
import type {
  AckMessage,
  ClientMessage,
  CreateRoomResponse,
  JoinRoomResponse,
  PlayerAction,
  RoomMessage,
  ServerMessage,
  StateMessage,
} from '@coringa/protocol';

let ipCounter = 0;

/** Um IP novo por chamada: o limite por IP é por chave e o estado dele atravessa os testes do arquivo. */
export function uniqueIp(): string {
  ipCounter += 1;
  return `10.1.${Math.floor(ipCounter / 250)}.${(ipCounter % 250) + 1}`;
}

export function post(path: string, body: unknown, ip: string = uniqueIp()): Promise<Response> {
  return SELF.fetch(`https://x${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': ip },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

export function get(path: string, ip: string = uniqueIp()): Promise<Response> {
  return SELF.fetch(`https://x${path}`, { headers: { 'cf-connecting-ip': ip } });
}

export interface TestRoom {
  code: string;
  tokens: { p1: string; p2: string };
}

/** Sala com os dois assentos ocupados, criada e preenchida pelo HTTP. */
export async function makeRoom(): Promise<TestRoom> {
  const created = await post('/api/rooms', { nickname: 'Ana' });
  const ana = (await created.json()) as CreateRoomResponse;
  const joined = await post(`/api/rooms/${ana.code}/join`, { nickname: 'Bia' });
  const bia = (await joined.json()) as JoinRoomResponse;
  return { code: ana.code, tokens: { p1: ana.token, p2: bia.token } };
}

/** Ponta do cliente de um WebSocket: guarda o que chegou e como fechou. */
export class TestSocket {
  readonly messages: ServerMessage[] = [];
  pongs = 0;
  closed: { code: number; reason: string } | null = null;
  #ids = 0;
  readonly ws: WebSocket;

  constructor(ws: WebSocket) {
    this.ws = ws;
    ws.addEventListener('message', (event) => {
      if (event.data === 'pong') {
        this.pongs += 1;
        return;
      }
      this.messages.push(JSON.parse(String(event.data)) as ServerMessage);
    });
    ws.addEventListener('close', (event) => {
      this.closed = { code: event.code, reason: event.reason };
    });
    ws.accept();
  }

  send(message: ClientMessage | 'ping'): void {
    this.ws.send(message === 'ping' ? message : JSON.stringify(message));
  }

  async waitFor<T>(find: () => T | undefined | null | false, what: string, ms = 4000): Promise<T> {
    const deadline = Date.now() + ms;
    for (;;) {
      const found = find();
      if (found) return found;
      if (Date.now() > deadline) throw new Error(`esperei por: ${what}`);
      await new Promise((resolve) => setTimeout(resolve, 5));
    }
  }

  waitClosed(): Promise<{ code: number; reason: string }> {
    return this.waitFor(() => this.closed, 'fechamento');
  }

  of<T extends ServerMessage['t']>(t: T): Extract<ServerMessage, { t: T }>[] {
    return this.messages.filter((message): message is Extract<ServerMessage, { t: T }> => message.t === t);
  }

  get state(): StateMessage | undefined {
    return this.of('state').at(-1);
  }

  get room(): RoomMessage | undefined {
    return this.of('room').at(-1);
  }

  /** Autentica e espera o `welcome`. */
  async hello(token: string): Promise<void> {
    const before = this.of('welcome').length;
    this.send({ t: 'hello', protocol: PROTOCOL_VERSION, token });
    await this.waitFor(() => this.of('welcome').length > before, 'welcome');
  }

  /** Espera um `state` com `seq` maior que o dado. */
  waitState(afterSeq: number): Promise<StateMessage> {
    return this.waitFor(() => {
      const state = this.state;
      return state && state.seq > afterSeq ? state : undefined;
    }, `state depois do seq ${afterSeq}`);
  }

  /** Manda uma jogada na época do último `state` e espera o `ack` dela. */
  async act(action: PlayerAction): Promise<AckMessage> {
    this.#ids += 1;
    const id = `t-${this.#ids}`;
    this.send({ t: 'act', id, epoch: this.state!.epoch, action });
    return this.waitFor(() => this.of('ack').find((ack) => ack.id === id), `ack de ${id}`);
  }

  /** A primeira jogada de Equipar legal para quem tem o último `state`. */
  equip(): PlayerAction {
    const action = legalActions(this.state!.view).find((candidate) => candidate.type === 'EQUIP');
    if (!action) throw new Error('sem Equipar legal');
    return action as PlayerAction;
  }
}

/** Abre o WebSocket da sala pelo Worker; o upgrade responde 101 sempre. */
export async function open(code: string, headers: Record<string, string> = {}): Promise<TestSocket> {
  const res = await SELF.fetch(`https://x/api/rooms/${code}/ws`, {
    headers: { Upgrade: 'websocket', 'cf-connecting-ip': uniqueIp(), ...headers },
  });
  if (res.status !== 101 || !res.webSocket) throw new Error(`upgrade devolveu ${res.status}`);
  return new TestSocket(res.webSocket);
}

/** Duas pontas autenticadas e a partida em PLAYING (Equipar). */
export async function startGame(): Promise<{ room: TestRoom; p1: TestSocket; p2: TestSocket }> {
  const room = await makeRoom();
  const p1 = await open(room.code);
  const p2 = await open(room.code);
  await p1.hello(room.tokens.p1);
  await p2.hello(room.tokens.p2);
  p1.send({ t: 'ready', ready: true });
  p2.send({ t: 'ready', ready: true });
  await p1.waitFor(() => p1.state, 'state do p1');
  await p2.waitFor(() => p2.state, 'state do p2');
  return { room, p1, p2 };
}

/**
 * Como `startGame`, mas só devolve uma partida em que os dois assentos têm numéricas pendentes e podem Equipar.
 * A primeira mão vem de `crypto.getRandomValues`: quem recebe 4 especiais (~0,4%) é confirmado sozinho no início e
 * não tem Equipar legal. Em vez de depender da sorte, descarta a sala e tenta de novo (o limite barra um laço infinito).
 */
export async function startEquipGame(): Promise<{ room: TestRoom; p1: TestSocket; p2: TestSocket }> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const game = await startGame();
    const both = [game.p1, game.p2].every((socket) => socket.state!.view.self.pending.length > 0 && !socket.state!.view.self.equipSubmitted);
    if (both) return game;
    game.p1.ws.close(1000, 'mão sem Equipar; tenta outra sala');
    game.p2.ws.close(1000, 'mão sem Equipar; tenta outra sala');
  }
  throw new Error('20 mãos seguidas sem Equipar para os dois assentos');
}
