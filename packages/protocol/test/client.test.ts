import { describe, expect, it, vi } from 'vitest';
import {
  ACK_TIMEOUT_MS,
  HttpError,
  PING_INTERVAL_MS,
  PONG_TIMEOUT_MS,
  RoomClient,
  SLOW_RETRY_MS,
  createRoom,
  joinRoom,
  roomInfo,
  type AckMessage,
  type ConnectionEvent,
  type RoomClientOptions,
  type StateMessage,
} from '../src/index.ts';

/** Mensagem do cliente vista pelo servidor falso (campos que os testes inspecionam). */
interface Sent {
  t: string;
  id: string;
  epoch: number;
  lastSeq?: number;
  auto?: true;
}

/** WebSocket falso: registra o que o cliente envia e deixa o teste agir como servidor. */
class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  readyState = 0;
  sent: string[] = [];
  closedWith: number | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  readonly url: string;

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number): void {
    this.closedWith = code ?? null;
    this.readyState = 3;
  }

  serverOpen(): void {
    this.readyState = 1;
    this.onopen?.();
  }

  serverSend(msg: unknown): void {
    this.onmessage?.({ data: typeof msg === 'string' ? msg : JSON.stringify(msg) });
  }

  serverClose(code: number): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }

  /** Mensagens JSON enviadas pelo cliente (sem os `ping`). */
  messages(): Sent[] {
    return this.sent.filter((s) => s !== 'ping').map((s) => JSON.parse(s) as Sent);
  }
}

/** Relógio e timers falsos: nada de tempo real. */
class FakeClock {
  time = 1_000_000;
  scheduled: number[] = [];
  private timers = new Map<number, { at: number; fn: () => void }>();
  private nextHandle = 1;

  now = (): number => this.time;

  setTimer = (fn: () => void, ms: number): unknown => {
    const handle = this.nextHandle++;
    this.scheduled.push(ms);
    this.timers.set(handle, { at: this.time + ms, fn });
    return handle;
  };

  clearTimer = (handle: unknown): void => {
    this.timers.delete(handle as number);
  };

  pending(): number {
    return this.timers.size;
  }

  /** Avança o relógio disparando os timers vencidos, em ordem. */
  advance(ms: number): void {
    const target = this.time + ms;
    for (;;) {
      const next = [...this.timers.entries()].sort((a, b) => a[1].at - b[1].at)[0];
      if (!next || next[1].at > target) break;
      this.timers.delete(next[0]);
      this.time = next[1].at;
      next[1].fn();
    }
    this.time = target;
  }
}

const TOKEN = 'T'.repeat(43);

function setup(overrides: Partial<RoomClientOptions> = {}) {
  FakeWebSocket.instances = [];
  const clock = new FakeClock();
  const client = new RoomClient({
    server: 'http://localhost:8787',
    code: 'ABC234',
    token: TOKEN,
    WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
    random: () => 0.5,
    setTimer: clock.setTimer,
    clearTimer: clock.clearTimer,
    now: clock.now,
    ...overrides,
  });
  const events: ConnectionEvent[] = [];
  client.subscribe((e) => events.push(e));
  const last = (): FakeWebSocket => FakeWebSocket.instances[FakeWebSocket.instances.length - 1]!;
  return { client, clock, events, last };
}

function stateMsg(seq: number, extra: Partial<StateMessage> = {}): StateMessage {
  return { t: 'state', seq, epoch: 0, view: {} as never, events: [], deadline: null, serverNow: 1_000_000, ...extra };
}

function connected(overrides: Partial<RoomClientOptions> = {}) {
  const ctx = setup(overrides);
  ctx.client.connect();
  ctx.last().serverOpen();
  return ctx;
}

describe('RoomClient: conexão', () => {
  it('conecta em ws(s)://…/api/rooms/:code/ws e manda hello com lastSeq', () => {
    const { client, last, events } = setup();
    client.connect();
    expect(last().url).toBe('ws://localhost:8787/api/rooms/ABC234/ws');
    last().serverOpen();
    expect(events).toEqual([{ type: 'open' }]);
    expect(last().messages()[0]).toEqual({ t: 'hello', protocol: 1, token: TOKEN });
    expect('lastSeq' in last().messages()[0]).toBe(false);
  });

  it('depois de um state seq 9, a reconexão manda lastSeq: 9', () => {
    const { client, clock, last } = setup();
    client.connect();
    last().serverOpen();
    last().serverSend(stateMsg(9));
    last().serverClose(1006);
    clock.advance(500);
    expect(FakeWebSocket.instances).toHaveLength(2);
    last().serverOpen();
    expect(last().messages()[0]).toEqual({ t: 'hello', protocol: 1, token: TOKEN, lastSeq: 9 });
  });

  it('com lastSeq nas opções e sem state ainda, o primeiro hello leva lastSeq; um state em memória vale depois', () => {
    const { client, clock, last } = setup({ lastSeq: 9 });
    client.connect();
    last().serverOpen();
    expect(last().messages()[0]).toEqual({ t: 'hello', protocol: 1, token: TOKEN, lastSeq: 9 });
    last().serverSend(stateMsg(12));
    last().serverClose(1006);
    clock.advance(500);
    last().serverOpen();
    expect(last().messages()[0]).toEqual({ t: 'hello', protocol: 1, token: TOKEN, lastSeq: 12 });
  });

  it('https vira wss, tolera barra final e escapa o código', () => {
    const { client, last } = setup({ server: 'https://coringa.example.dev/', code: 'A B' });
    client.connect();
    expect(last().url).toBe('wss://coringa.example.dev/api/rooms/A%20B/ws');
  });

  it('connect repetido com o socket vivo não abre outro', () => {
    const { client } = setup();
    client.connect();
    client.connect();
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('usa o WebSocket global e os timers reais por padrão', () => {
    const original = globalThis.WebSocket;
    FakeWebSocket.instances = [];
    globalThis.WebSocket = FakeWebSocket as unknown as typeof WebSocket;
    try {
      const client = new RoomClient({ server: 'http://x', code: 'ABC234', token: TOKEN });
      client.connect();
      expect(FakeWebSocket.instances).toHaveLength(1);
      // o ping e a reconexão agendam timers reais; close() limpa tudo
      FakeWebSocket.instances[0]!.serverOpen();
      expect(typeof client.remainingMs({ kind: 'TURN', at: Date.now() + 5000, players: [] })).toBe('number');
      FakeWebSocket.instances[0]!.serverClose(1006);
      client.close();
    } finally {
      globalThis.WebSocket = original;
    }
  });

  it('ping a cada 15 s enquanto aberto', () => {
    const { clock, last } = connected();
    expect(last().sent).not.toContain('ping');
    clock.advance(PING_INTERVAL_MS);
    expect(last().sent.filter((s) => s === 'ping')).toHaveLength(1);
    clock.advance(PING_INTERVAL_MS);
    expect(last().sent.filter((s) => s === 'ping')).toHaveLength(2);
  });

  it('o ping para quando o socket cai', () => {
    const { clock, last } = connected();
    const ws = last();
    ws.serverClose(1000);
    clock.advance(PING_INTERVAL_MS * 3);
    expect(ws.sent.filter((s) => s === 'ping')).toHaveLength(0);
    expect(clock.pending()).toBe(0);
  });

  it('não manda ping se o socket já não está aberto', () => {
    const { clock, last } = connected();
    last().readyState = 2;
    clock.advance(PING_INTERVAL_MS);
    expect(last().sent.filter((s) => s === 'ping')).toHaveLength(0);
  });
});

describe('RoomClient: mensagens do servidor', () => {
  it('welcome guarda o playerId; room e error viram eventos', () => {
    const { client, events, last } = connected();
    last().serverSend({ t: 'welcome', protocol: 1, playerId: 'p2', serverNow: 1_000_000 });
    expect(client.playerId).toBe('p2');
    const room = { t: 'room', code: 'ABC234', status: 'LOBBY', seats: [], score: { p1: 0, p2: 0, draws: 0 }, gameNo: 0, expiresAt: 1 };
    last().serverSend(room);
    expect(client.room).toEqual(room);
    const error = { t: 'error', code: 'WRONG_STATUS', message: 'x' };
    last().serverSend(error);
    expect(events).toEqual([{ type: 'open' }, { type: 'room', room }, { type: 'error', error }]);
  });

  it('descarta state com seq menor que o último; aceita igual (reconexão)', () => {
    const { client, events, last } = connected();
    last().serverSend(stateMsg(9));
    last().serverSend(stateMsg(8, { epoch: 3 }));
    expect(client.state?.seq).toBe(9);
    expect(client.state?.epoch).toBe(0);
    last().serverSend(stateMsg(9, { epoch: 4 }));
    expect(client.state?.epoch).toBe(4);
    expect(events.filter((e) => e.type === 'state')).toHaveLength(2);
  });

  it('ignora lixo: texto pong, JSON inválido, binário, valor sem tipo e tipo desconhecido', () => {
    const { client, events, last } = connected();
    last().serverSend('pong');
    last().serverSend('{nao-json');
    last().serverSend('null');
    last().serverSend('42');
    last().serverSend({ t: 'desconhecido' });
    last().onmessage?.({ data: new Uint8Array([1, 2, 3]) });
    expect(events).toEqual([{ type: 'open' }]);
    expect(client.state).toBeNull();
    expect(client.room).toBeNull();
    expect(client.playerId).toBeNull();
  });

  it('ignora eventos de um socket que já foi substituído', () => {
    const { clock, events, last } = connected();
    const old = last();
    old.serverClose(1006);
    clock.advance(500);
    const fresh = last();
    fresh.serverOpen();
    const before = events.length;
    old.serverSend(stateMsg(50));
    old.serverClose(1006);
    old.serverOpen();
    expect(events).toHaveLength(before);
  });

  it('unsubscribe para de receber eventos', () => {
    const { client, events, last } = setup();
    const extra: ConnectionEvent[] = [];
    const off = client.subscribe((e) => extra.push(e));
    client.connect();
    last().serverOpen();
    off();
    last().serverSend({ t: 'error', code: 'WRONG_STATUS', message: 'x' });
    expect(extra).toEqual([{ type: 'open' }]);
    expect(events).toHaveLength(2);
  });
});

describe('RoomClient: ready, leave, rematch', () => {
  it('envia as mensagens simples', () => {
    const { client, last } = connected();
    client.ready(true);
    client.rematch(false);
    client.leave();
    expect(last().messages().slice(1)).toEqual([{ t: 'ready', ready: true }, { t: 'rematch', want: false }, { t: 'leave' }]);
  });

  it('sem socket aberto, as mensagens simples são descartadas', () => {
    const { client } = setup();
    client.ready(true);
    client.leave();
    client.rematch(true);
    expect(FakeWebSocket.instances).toHaveLength(0);
  });
});

describe('RoomClient: act e concede', () => {
  it('act usa a época do último state e um id novo; resolve com o ack do mesmo id', async () => {
    const { client, last } = connected();
    last().serverSend(stateMsg(5, { epoch: 7 }));
    const pending = client.act({ type: 'PASS' });
    const sent = last().messages()[1];
    expect(sent).toMatchObject({ t: 'act', epoch: 7, action: { type: 'PASS' } });
    expect(typeof sent.id).toBe('string');
    expect(sent.id.length).toBeGreaterThanOrEqual(1);
    expect(sent.id.length).toBeLessThanOrEqual(64);

    const ack: AckMessage = { t: 'ack', id: sent.id, ok: true, seq: 6 };
    last().serverSend(ack);
    await expect(pending).resolves.toEqual(ack);
  });

  it('ids diferentes a cada jogada; ack de outro id não resolve a promessa', async () => {
    const { client, last } = connected();
    const a = client.act({ type: 'PASS' });
    const b = client.concede();
    const [, sentA, sentB] = last().messages();
    expect(sentA.id).not.toBe(sentB.id);
    expect(sentB).toMatchObject({ t: 'concede' });
    // o prefixo vem de random(): 0.5 em base 36 → "i00000"
    expect(sentA.id).toBe('i00000-1');
    expect(sentB.id).toBe('i00000-2');

    last().serverSend({ t: 'ack', id: 'desconhecido', ok: true });
    const ackB: AckMessage = { t: 'ack', id: sentB.id, ok: false, code: 'NOT_PLAYING', message: 'x' };
    last().serverSend(ackB);
    await expect(b).resolves.toEqual(ackB);
    const ackA: AckMessage = { t: 'ack', id: sentA.id, ok: true, held: true };
    last().serverSend(ackA);
    await expect(a).resolves.toEqual(ackA);
  });

  it('sem state, act manda época 0', () => {
    const { client, last } = connected();
    void client.act({ type: 'PASS' });
    expect(last().messages()[1].epoch).toBe(0);
  });

  it('pendências de act rejeitam com DISCONNECTED na queda', async () => {
    const { client, last } = connected();
    const pending = client.act({ type: 'PASS' });
    const id = last().messages()[1].id;
    last().serverClose(1006);
    const ack = await pending;
    expect(ack).toMatchObject({ t: 'ack', id, ok: false, code: 'DISCONNECTED' });
  });

  it('act sem conexão resolve DISCONNECTED na hora, sem enviar nada', async () => {
    const { client } = setup();
    await expect(client.act({ type: 'PASS' })).resolves.toMatchObject({ ok: false, code: 'DISCONNECTED' });
    await expect(client.concede()).resolves.toMatchObject({ ok: false, code: 'DISCONNECTED' });
    expect(FakeWebSocket.instances).toHaveLength(0);
  });
});

describe('RoomClient: marca auto', () => {
  it('act com { auto: true } manda "auto":true; act sem opções e com auto: false não mandam a chave', () => {
    const { client, last } = connected();
    void client.act({ type: 'PASS' }, { auto: true });
    void client.act({ type: 'PASS' });
    void client.act({ type: 'PASS' }, { auto: false });
    const [, auto, plain, off] = last().sent;
    expect(auto).toContain('"auto":true');
    expect(plain).not.toContain('auto');
    expect(off).not.toContain('auto');
  });
});

describe('RoomClient: wake e socket morto', () => {
  const pings = (ws: FakeWebSocket): number => ws.sent.filter((s) => s === 'ping').length;

  it('wake com reconexão agendada abre o socket na hora, sem esperar o atraso', () => {
    const { client, clock, last } = setup();
    client.connect();
    last().serverClose(1006);
    expect(FakeWebSocket.instances).toHaveLength(1);
    client.wake();
    expect(FakeWebSocket.instances).toHaveLength(2);
    // o atraso cancelado não abre um terceiro socket
    clock.advance(100_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it.each([1008, 4029])(
    'wake durante a espera lenta (fechamento %i) não reconecta: a tela diz 30 s e o cliente cumpre',
    (code) => {
      const { client, clock, last } = connected();
      last().serverClose(code);
      clock.advance(10_000);
      client.wake();
      expect(FakeWebSocket.instances).toHaveLength(1);
      // Um wake repetido (a aba volta de novo) também não adianta nada, e o prazo original continua valendo.
      client.wake();
      clock.advance(SLOW_RETRY_MS - 10_000 - 1);
      expect(FakeWebSocket.instances).toHaveLength(1);
      clock.advance(1);
      expect(FakeWebSocket.instances).toHaveLength(2);
    },
  );

  it('depois que a espera lenta acaba, uma queda comum volta a reconectar no wake', () => {
    const { client, clock, last } = connected();
    last().serverClose(1008);
    clock.advance(SLOW_RETRY_MS);
    expect(FakeWebSocket.instances).toHaveLength(2);
    // O socket novo cai por uma causa comum (1006): a espera agora é a do backoff, e o wake a pula.
    last().serverClose(1006);
    client.wake();
    expect(FakeWebSocket.instances).toHaveLength(3);
  });

  it('close() durante a espera lenta cancela tudo: o wake seguinte não faz nada', () => {
    const { client, clock, last } = connected();
    last().serverClose(4029);
    client.close();
    client.wake();
    clock.advance(SLOW_RETRY_MS * 2);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('wake sem conexão nenhuma ou com o socket ainda abrindo não faz nada', () => {
    const { client, clock } = setup();
    client.wake();
    expect(FakeWebSocket.instances).toHaveLength(0);
    client.connect();
    client.wake();
    clock.advance(PONG_TIMEOUT_MS * 2);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('wake depois de fechar de vez não faz nada', () => {
    const { client, clock } = connected();
    client.close();
    client.wake();
    clock.advance(PONG_TIMEOUT_MS * 2);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('wake com socket aberto manda ping; sem pong em 2000 ms solta o socket e abre outro na hora', async () => {
    const { client, clock, events, last } = connected();
    const dead = last();
    const pending = client.act({ type: 'PASS' });
    client.wake();
    expect(pings(dead)).toBe(1);
    clock.advance(PONG_TIMEOUT_MS - 1);
    expect(FakeWebSocket.instances).toHaveLength(1);
    clock.advance(1);

    expect(events.at(-1)).toEqual({ type: 'closed', code: 1006, final: false });
    expect(dead.closedWith).toBe(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    await expect(pending).resolves.toMatchObject({ ok: false, code: 'DISCONNECTED' });
    // o socket velho já não conta: um fechamento tardio dele não agenda reconexão
    dead.serverClose(1000);
    clock.advance(100_000);
    expect(FakeWebSocket.instances).toHaveLength(2);
    // o novo diz hello normalmente
    last().serverOpen();
    expect(last().messages()[0]).toMatchObject({ t: 'hello' });
  });

  it('com pong em 1500 ms nada acontece', () => {
    const { client, clock, events, last } = connected();
    client.wake();
    clock.advance(1500);
    last().serverSend('pong');
    clock.advance(10_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(events.map((e) => e.type)).toEqual(['open']);
  });

  it('wake repetido não estende o prazo do pong', () => {
    const { client, clock } = connected();
    client.wake();
    clock.advance(1500);
    client.wake();
    clock.advance(PONG_TIMEOUT_MS - 1500);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('um listener que fecha de vez no aviso do socket morto impede o novo socket', () => {
    const { client, clock } = connected();
    client.subscribe((e) => {
      if (e.type === 'closed') client.close();
    });
    client.wake();
    clock.advance(PONG_TIMEOUT_MS);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('act sem ack em 5000 ms resolve DISCONNECTED e reconecta na hora', async () => {
    const { client, clock, events, last } = connected();
    const dead = last();
    const pending = client.act({ type: 'PASS' });
    clock.advance(ACK_TIMEOUT_MS - 1);
    expect(FakeWebSocket.instances).toHaveLength(1);
    clock.advance(1);
    await expect(pending).resolves.toMatchObject({ ok: false, code: 'DISCONNECTED' });
    expect(events.at(-1)).toEqual({ type: 'closed', code: 1006, final: false });
    expect(dead.closedWith).toBe(1000);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('concede sem ack em 5000 ms também reconecta', async () => {
    const { client, clock } = connected();
    const pending = client.concede();
    clock.advance(ACK_TIMEOUT_MS);
    await expect(pending).resolves.toMatchObject({ ok: false, code: 'DISCONNECTED' });
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('o ack no prazo desarma o timer: nada de reconexão', async () => {
    const { client, clock, last } = connected();
    const pending = client.act({ type: 'PASS' });
    last().serverSend({ t: 'ack', id: last().messages()[1].id, ok: true });
    await expect(pending).resolves.toMatchObject({ ok: true });
    clock.advance(ACK_TIMEOUT_MS * 2);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('a queda comum limpa o prazo do ack e do pong (nenhum timer sobra além da reconexão)', () => {
    const { client, clock, last } = connected();
    void client.act({ type: 'PASS' });
    client.wake();
    last().serverClose(1006);
    expect(clock.pending()).toBe(1); // só a espera da reconexão
    client.close();
    expect(clock.pending()).toBe(0);
  });
});

describe('RoomClient: relógio do servidor', () => {
  it('remainingMs usa o relógio do servidor (relógio local adiantado 3 min)', () => {
    const { client, clock, last } = connected();
    clock.time = 1_000_000 + 180_000;
    last().serverSend(stateMsg(1, { serverNow: 1_000_000 }));
    expect(client.remainingMs({ kind: 'TURN', at: 1_030_000, players: ['p1'] })).toBe(30_000);
    clock.time += 10_000;
    expect(client.remainingMs({ kind: 'TURN', at: 1_030_000, players: ['p1'] })).toBe(20_000);
  });

  it('o welcome também acerta o relógio e o prazo vencido dá 0', () => {
    const { client, clock, last } = connected();
    clock.time = 5_000;
    last().serverSend({ t: 'welcome', protocol: 1, playerId: 'p1', serverNow: 9_000 });
    expect(client.remainingMs({ kind: 'EQUIP', at: 12_000, players: [] })).toBe(3_000);
    expect(client.remainingMs({ kind: 'EQUIP', at: 8_000, players: [] })).toBe(0);
  });

  it('sem state nem welcome, o relógio local vale', () => {
    const { client, clock } = setup();
    expect(client.remainingMs({ kind: 'TURN', at: clock.time + 4_000, players: [] })).toBe(4_000);
  });
});

describe('RoomClient: reconexão', () => {
  it('queda: reconecta com 500, 1000, 2000, 4000, 5000, 5000 ms (±20%)', () => {
    const { client, clock, last } = setup();
    client.connect();
    for (let i = 0; i < 6; i++) {
      last().serverClose(1006);
      clock.advance(100_000);
    }
    expect(clock.scheduled).toEqual([500, 1000, 2000, 4000, 5000, 5000]);
    expect(FakeWebSocket.instances).toHaveLength(7);
  });

  it('a variação é de ±20% sobre random()', () => {
    const low = setup({ random: () => 0 });
    low.client.connect();
    low.last().serverClose(1006);
    expect(low.clock.scheduled).toEqual([400]);

    const high = setup({ random: () => 0.999999 });
    high.client.connect();
    high.last().serverClose(1006);
    expect(high.clock.scheduled).toEqual([600]);
  });

  it('o índice da espera volta a 0 no welcome (conexão aceita de fato)', () => {
    const { client, clock, last } = setup();
    client.connect();
    last().serverClose(1006);
    clock.advance(500);
    last().serverClose(1006);
    clock.advance(1000);
    last().serverOpen();
    last().serverSend({ t: 'welcome', protocol: 1, playerId: 'p1', serverNow: clock.time });
    last().serverClose(1006);
    clock.advance(500);
    expect(clock.scheduled.filter((ms) => ms !== PING_INTERVAL_MS)).toEqual([500, 1000, 500]);
  });

  it('servidor que aceita e fecha (open sem welcome, 4008 ou 1011) não zera a espera: ela cresce', () => {
    const { client, clock, last } = setup();
    client.connect();
    for (const code of [4008, 1011, 4008, 1011]) {
      last().serverOpen();
      last().serverClose(code);
      clock.advance(100_000);
    }
    expect(clock.scheduled.filter((ms) => ms !== PING_INTERVAL_MS)).toEqual([500, 1000, 2000, 4000]);
  });

  it('close() dentro de um listener de closed: não reconecta depois; connect() volta a abrir', () => {
    const { client, clock, events, last } = connected();
    client.subscribe((e) => {
      if (e.type === 'closed' && !e.final) client.close();
    });
    last().serverClose(1006);
    expect(events.filter((e) => e.type === 'closed')).toEqual([{ type: 'closed', code: 1006, final: false }]);
    expect(clock.pending()).toBe(0);
    clock.advance(100_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    client.connect();
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('exceção num listener vai ao console.error e não impede os outros listeners nem a reconexão', () => {
    const { client, clock, last } = setup();
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const seen: string[] = [];
      client.subscribe(() => {
        throw new Error('listener quebrado');
      });
      client.subscribe((e) => seen.push(e.type));
      client.connect();
      last().serverOpen();
      last().serverSend(stateMsg(1));
      last().serverClose(1006);
      expect(seen).toEqual(['open', 'state', 'closed']);
      expect(client.state?.seq).toBe(1);
      clock.advance(500);
      expect(FakeWebSocket.instances).toHaveLength(2);
      expect(logged).toHaveBeenCalledTimes(3);
    } finally {
      logged.mockRestore();
    }
  });

  it.each([1000, 4000, 4001, 4003, 4009])('fechamento %i é final: não reconecta e emite closed final', (code) => {
    const { client, clock, events, last } = connected();
    void client;
    last().serverClose(code);
    expect(events.at(-1)).toEqual({ type: 'closed', code, final: true });
    clock.advance(100_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it.each([1008, 4029])('fechamento %i espera 30 s antes de reconectar', (code) => {
    const { clock, events, last } = connected();
    last().serverClose(code);
    expect(events.at(-1)).toEqual({ type: 'closed', code, final: false });
    clock.advance(SLOW_RETRY_MS - 1);
    expect(FakeWebSocket.instances).toHaveLength(1);
    clock.advance(1);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it.each([1003, 1009, 4008, 1006])('fechamento %i não é final: segue o backoff', (code) => {
    const { clock, events, last } = connected();
    last().serverClose(code);
    expect(events.at(-1)).toEqual({ type: 'closed', code, final: false });
    clock.advance(500);
    expect(FakeWebSocket.instances).toHaveLength(2);
  });

  it('close() fecha com 1000, emite closed final e não reconecta', async () => {
    const { client, clock, events, last } = connected();
    const pending = client.act({ type: 'PASS' });
    const ws = last();
    client.close();
    expect(ws.closedWith).toBe(1000);
    expect(events.at(-1)).toEqual({ type: 'closed', code: 1000, final: true });
    await expect(pending).resolves.toMatchObject({ ok: false, code: 'DISCONNECTED' });
    clock.advance(100_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
    expect(clock.pending()).toBe(0);
    // eventos tardios do socket antigo não geram nada
    ws.serverClose(1000);
    expect(events.filter((e) => e.type === 'closed')).toHaveLength(1);
  });

  it('close() durante a espera de reconexão cancela o timer', () => {
    const { client, clock, events, last } = connected();
    last().serverClose(1006);
    expect(clock.pending()).toBe(1);
    client.close();
    expect(clock.pending()).toBe(0);
    expect(events.at(-1)).toEqual({ type: 'closed', code: 1000, final: true });
    clock.advance(100_000);
    expect(FakeWebSocket.instances).toHaveLength(1);
  });

  it('close() sem nada ativo não emite nada', () => {
    const { client, events } = setup();
    client.close();
    expect(events).toEqual([]);
  });

  it('connect() depois de um fechamento final abre de novo', () => {
    const { client, last } = connected();
    last().serverClose(4009);
    client.connect();
    expect(FakeWebSocket.instances).toHaveLength(2);
  });
});

describe('chamadas HTTP', () => {
  function fakeFetch(status: number, body: unknown) {
    const calls: { url: string; init?: RequestInit }[] = [];
    const impl = (async (url: string, init?: RequestInit) => {
      calls.push({ url, init });
      return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
    }) as unknown as typeof fetch;
    return { impl, calls };
  }

  it('createRoom: POST com JSON; 201 devolve o objeto', async () => {
    const { impl, calls } = fakeFetch(201, { code: 'ABC234', token: TOKEN, playerId: 'p1' });
    const res = await createRoom('http://localhost:8787/', 'Ana', impl);
    expect(res).toEqual({ code: 'ABC234', token: TOKEN, playerId: 'p1' });
    expect(calls[0]!.url).toBe('http://localhost:8787/api/rooms');
    expect(calls[0]!.init?.method).toBe('POST');
    expect(JSON.parse(calls[0]!.init?.body as string)).toEqual({ nickname: 'Ana' });
    expect(new Headers(calls[0]!.init?.headers).get('content-type')).toBe('application/json');
  });

  it('joinRoom: POST em /join; 409 vira HttpError com status 409', async () => {
    const ok = fakeFetch(200, { token: TOKEN, playerId: 'p2' });
    await expect(joinRoom('http://s', 'ABC234', 'Beto', ok.impl)).resolves.toEqual({ token: TOKEN, playerId: 'p2' });
    expect(ok.calls[0]!.url).toBe('http://s/api/rooms/ABC234/join');
    expect(JSON.parse(ok.calls[0]!.init?.body as string)).toEqual({ nickname: 'Beto' });

    const full = fakeFetch(409, { error: 'cheia' });
    const err = await joinRoom('http://s', 'ABC234', 'Beto', full.impl).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect(err).toBeInstanceOf(Error);
    expect((err as HttpError).status).toBe(409);
  });

  it('roomInfo: GET sem corpo; 404 vira HttpError', async () => {
    const ok = fakeFetch(200, { code: 'ABC234', status: 'LOBBY', nicknames: ['Ana'], full: false });
    await expect(roomInfo('http://s', 'ABC234', ok.impl)).resolves.toMatchObject({ full: false });
    expect(ok.calls[0]!.url).toBe('http://s/api/rooms/ABC234');
    expect(ok.calls[0]!.init?.method ?? 'GET').toBe('GET');
    expect(ok.calls[0]!.init?.body).toBeUndefined();

    const missing = fakeFetch(404, {});
    await expect(roomInfo('http://s', 'ZZZZZZ', missing.impl)).rejects.toMatchObject({ name: 'HttpError', status: 404 });
  });

  it('usa o fetch global por padrão', async () => {
    const original = globalThis.fetch;
    const { impl, calls } = fakeFetch(200, { code: 'ABC234', status: 'LOBBY', nicknames: [], full: false });
    globalThis.fetch = impl;
    try {
      await roomInfo('http://s', 'ABC234');
      await createRoom('http://s', 'Ana').catch(() => undefined);
      await joinRoom('http://s', 'ABC234', 'Ana');
      expect(calls).toHaveLength(3);
    } finally {
      globalThis.fetch = original;
    }
  });
});
