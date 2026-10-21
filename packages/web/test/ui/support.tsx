// Apoio dos testes de componentes: HTTP e conexão falsos pela `RoomApi`, armazenamento em memória e o axe.
import type { CreateRoomResponse, JoinRoomResponse, RoomInfoResponse, RoomMessage } from '@coringa/protocol';
import axe from 'axe-core';
import { vi } from 'vitest';
import type { RoomApi } from '../../src/app/room-api.ts';
import { Session } from '../../src/model/session.ts';
import { safeStore, type KeyValueStore, type SeatSession } from '../../src/model/storage.ts';
import { FakeConnection } from '../fixtures.ts';

export const CODE = 'ABC234';

/** Token realista do servidor: base64url de 32 bytes, 43 caracteres. */
export const TOKEN = 'k3JfX9aQ2mZpLw8RtYvB1nCdE5gHuI0oSxA7zWqT4Ms';

export const memoryStore = (): KeyValueStore => safeStore(undefined).store;

export const seat = (extra: Partial<SeatSession> = {}): SeatSession => ({
  token: TOKEN,
  playerId: 'p1',
  nickname: 'Duda',
  ...extra,
});

export const roomMessage = (extra: Partial<RoomMessage> = {}): RoomMessage => ({
  t: 'room',
  code: CODE,
  status: 'LOBBY',
  seats: [],
  score: { p1: 0, p2: 0, draws: 0 },
  gameNo: 1,
  expiresAt: 0,
  ...extra,
});

export interface FakeApi extends RoomApi {
  create: ReturnType<typeof vi.fn<RoomApi['create']>>;
  join: ReturnType<typeof vi.fn<RoomApi['join']>>;
  info: ReturnType<typeof vi.fn<RoomApi['info']>>;
  connect: ReturnType<typeof vi.fn<RoomApi['connect']>>;
  /** As conexões criadas por `connect`, na ordem. */
  connections: FakeConnection[];
}

export const created = (code = CODE): CreateRoomResponse => ({ code, token: TOKEN, playerId: 'p1' });
export const joined = (): JoinRoomResponse => ({ token: TOKEN, playerId: 'p2' });
export const info = (extra: Partial<RoomInfoResponse> = {}): RoomInfoResponse => ({
  code: CODE,
  status: 'LOBBY',
  nicknames: ['Ana'],
  full: false,
  ...extra,
});

/**
 * `connect` monta uma `Session` de verdade sobre uma `FakeConnection`, já "conectada" e com a sala no lobby.
 * Com `room: false`, a conexão nasce como a de verdade: sem `room` nem `state` até o servidor aceitar o `hello`.
 */
export function fakeApi(options: { room?: boolean } = {}): FakeApi {
  const connections: FakeConnection[] = [];
  const api: FakeApi = {
    connections,
    create: vi.fn<RoomApi['create']>(() => Promise.resolve(created())),
    join: vi.fn<RoomApi['join']>(() => Promise.resolve(joined())),
    info: vi.fn<RoomApi['info']>(() => Promise.resolve(info())),
    connect: vi.fn<RoomApi['connect']>((code) => {
      const connection = new FakeConnection({ room: options.room === false ? null : roomMessage({ code }) });
      connections.push(connection);
      const session = new Session(connection, {
        now: () => 0,
        setTimer: () => 0,
        clearTimer: () => undefined,
      });
      connection.connect();
      return session;
    }),
  };
  return api;
}

/** Violações `serious` e `critical` do axe sobre um trecho do DOM (spec §7). Contraste não roda no jsdom. */
export async function seriousViolations(container: Element): Promise<string[]> {
  const results = await axe.run(container);
  return results.violations
    .filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')
    .map((violation) => `${violation.id}: ${violation.help}`);
}

/**
 * O nome de um botão de duas linhas é o título e o detalhe juntos ("Atacar 27 × 3 · dano 24"; o axe exige que o texto visível seja
 * trecho contínuo do nome, WCAG 2.5.3): quem procura o botão pelo título casa pelo começo do nome.
 */
export const startsWith = (title: string): RegExp =>
  new RegExp(`^${title.replace(/[.*+?^${}()|[\]\\]/g, (char) => `\\${char}`)}(?: |$)`);

/** O botão principal da barra: "Atacar" com a prévia (não casa com "Atacar primeiro" nem "Atacar em segundo", da escolha da ordem). */
export const ATTACK_BUTTON = /^Atacar(?! primeiro| em segundo)/;
export const END_TURN_BUTTON = startsWith('Encerrar turno');
