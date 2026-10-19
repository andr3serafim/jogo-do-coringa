// A `RoomApi` de verdade, com um WebSocket falso no lugar do do navegador (mesmo padrão do `client.test.ts` do
// protocolo). O ponto é o `ReopenableClient`: o `wake()` do `RoomClient` não faz nada depois de um fechamento final
// (4009), e o "Usar aqui" só funciona se a API de verdade reabrir o socket. `FakeConnection.wake()` não prova isso.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoomApi } from '../../src/app/room-api.ts';
import type { Session } from '../../src/model/session.ts';
import { saveSeat } from '../../src/model/storage.ts';
import { CODE, memoryStore, seat, TOKEN } from './support.tsx';

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

  serverClose(code: number): void {
    this.readyState = 3;
    this.onclose?.({ code });
  }

  /** Mensagens JSON enviadas pelo cliente (sem os `ping`). */
  messages(): Array<{ t: string; token?: string; lastSeq?: number }> {
    return this.sent.filter((s) => s !== 'ping').map((s) => JSON.parse(s) as { t: string });
  }
}

const sockets = (): FakeWebSocket[] => FakeWebSocket.instances;

let live: Session[] = [];

function connect(lastSeq?: number) {
  const store = memoryStore();
  const stored = seat(lastSeq === undefined ? {} : { lastSeq });
  saveSeat(store, CODE, stored);
  const api = createRoomApi({ store, server: 'http://localhost:3000' });
  const session = api.connect(CODE, stored);
  live.push(session);
  return { session };
}

beforeEach(() => {
  FakeWebSocket.instances = [];
  vi.stubGlobal('WebSocket', FakeWebSocket);
});

afterEach(() => {
  // O `dispose()` fecha o cliente e limpa o timer do `ping`: nada vaza para o próximo teste.
  for (const session of live) session.dispose();
  live = [];
  vi.unstubAllGlobals();
});

describe('createRoomApi().connect com o cliente de verdade', () => {
  it('abre o socket da sala e manda o hello com o token e o lastSeq salvo', () => {
    const { session } = connect(41);
    expect(sockets()).toHaveLength(1);
    expect(sockets()[0]!.url).toBe(`ws://localhost:3000/api/rooms/${CODE}/ws`);
    sockets()[0]!.serverOpen();
    expect(sockets()[0]!.messages()).toEqual([{ t: 'hello', protocol: 1, token: TOKEN, lastSeq: 41 }]);
    expect(session.snapshot().status).toBe('open');
  });

  it('4009 e wake(): abre um segundo socket, e o hello dele leva o lastSeq', () => {
    const { session } = connect(41);
    sockets()[0]!.serverOpen();
    sockets()[0]!.serverClose(4009);
    expect(session.snapshot()).toMatchObject({ status: 'stopped', stop: 'OTHER_TAB' });
    expect(sockets()).toHaveLength(1);

    session.wake();

    expect(sockets()).toHaveLength(2);
    sockets()[1]!.serverOpen();
    expect(sockets()[1]!.messages()).toEqual([{ t: 'hello', protocol: 1, token: TOKEN, lastSeq: 41 }]);
    expect(session.snapshot()).toMatchObject({ status: 'open', stop: null });
  });

  it('wake() repetido depois do 4009 não abre sockets a mais', () => {
    const { session } = connect();
    sockets()[0]!.serverOpen();
    sockets()[0]!.serverClose(4009);
    session.wake();
    session.wake();
    expect(sockets()).toHaveLength(2);
  });

  it('wake() com a conexão aberta só sonda (ping), sem abrir outro socket', () => {
    const { session } = connect();
    sockets()[0]!.serverOpen();
    session.wake();
    expect(sockets()).toHaveLength(1);
    expect(sockets()[0]!.sent).toContain('ping');
  });

  it('wake() com uma reconexão agendada (queda) abre o socket já', () => {
    const { session } = connect();
    sockets()[0]!.serverOpen();
    sockets()[0]!.serverClose(1006);
    expect(session.snapshot().status).toBe('reconnecting');
    expect(sockets()).toHaveLength(1);
    session.wake();
    expect(sockets()).toHaveLength(2);
  });

  it('parada por 4000 (sala encerrada) e wake(): reabre, e quem decide não chamar é a tela', () => {
    // O cliente não distingue o motivo do fechamento final; é a tela que não chama `wake()` depois de ROOM_GONE.
    const { session } = connect();
    sockets()[0]!.serverOpen();
    sockets()[0]!.serverClose(4000);
    session.wake();
    expect(sockets()).toHaveLength(2);
  });

  it('depois do dispose(), wake() não abre socket nenhum', () => {
    const { session } = connect();
    sockets()[0]!.serverOpen();
    session.dispose();
    expect(sockets()[0]!.closedWith).toBe(1000);
    session.wake();
    expect(sockets()).toHaveLength(1);
  });

  it('depois de um 4009 e do dispose(), wake() também não abre socket', () => {
    const { session } = connect();
    sockets()[0]!.serverOpen();
    sockets()[0]!.serverClose(4009);
    session.dispose();
    session.wake();
    expect(sockets()).toHaveLength(1);
  });
});
