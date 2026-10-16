import { normalizeNickname } from '@coringa/protocol';
import type { CreateRoomResponse, JoinRoomResponse, RoomInfoResponse } from '@coringa/protocol';
import { nextAlarm } from './agenda.ts';
import { emptyEffects } from './effects.ts';
import { STATE_SCHEMA, TIMERS } from './timers.ts';
import { base64url, sha256Hex } from './tokens.ts';
import type { CoreDeps, CoreResult, Effects, RoomRecord, SeatId, SeatRecord, SocketInfo } from './types.ts';
import { roomMessage } from './views.ts';

const SEAT_IDS: readonly SeatId[] = ['p1', 'p2'];

/**
 * Núcleo da sala: recebe entradas com `now` e devolve `Effects`. Não lê relógio, não sorteia e não
 * conhece a Cloudflare. As entradas assíncronas (`create`, `join`) gastam o `await` do SHA-256 ANTES de
 * ler o registro; depois disso, leem `seats`, escolhem o assento e gravam sem nenhum `await` no meio.
 * O Durable Object entrega outros eventos enquanto o `crypto.subtle` roda: lendo antes do `await`, dois
 * cliques em "Entrar" ocupariam o mesmo assento.
 */
export class RoomCore {
  #record: RoomRecord | null;
  readonly #deps: CoreDeps;

  constructor(record: RoomRecord | null, deps: CoreDeps) {
    this.#record = record;
    this.#deps = deps;
  }

  get record(): RoomRecord | null {
    return this.#record;
  }

  /** Efeitos vazios com o alarme desejado do estado atual. */
  #effects(): Effects {
    const effects = emptyEffects();
    effects.alarm = this.#record ? nextAlarm(this.#record.agenda) : null;
    return effects;
  }

  #fail<E extends string>(error: E): CoreResult<never, E> {
    return { ok: false, error, effects: this.#effects() };
  }

  /** Gera o token e o hash dele. Tudo que é assíncrono acontece aqui, antes de tocar no registro. */
  async #newToken(): Promise<{ token: string; tokenHash: string }> {
    const token = base64url(this.#deps.randomBytes(32));
    return { token, tokenHash: await sha256Hex(token) };
  }

  async create(
    code: string,
    nickname: string,
    now: number,
  ): Promise<CoreResult<CreateRoomResponse, 'EXISTS' | 'BAD_NICKNAME'>> {
    const clean = normalizeNickname(nickname);
    if (clean === null) return this.#fail('BAD_NICKNAME');
    const { token, tokenHash } = await this.#newToken();

    // Sem `await` daqui até o fim: leitura e gravação do registro são atômicas.
    if (this.#record) return this.#fail('EXISTS');
    const seat: SeatRecord = {
      id: 'p1',
      nickname: clean,
      tokenHash,
      ready: false,
      wantsRematch: false,
      offlineSince: now,
    };
    this.#record = {
      schema: STATE_SCHEMA,
      code,
      createdAt: now,
      status: 'LOBBY',
      seats: [seat],
      score: { p1: 0, p2: 0, draws: 0 },
      gameNo: 0,
      outcome: null,
      seq: 0,
      epoch: 0,
      game: null,
      agenda: [
        { kind: 'idleExpiry', at: now + TIMERS.idleExpiryMs },
        { kind: 'hardExpiry', at: now + TIMERS.hardExpiryMs },
      ],
    };
    const effects = this.#effects();
    effects.persist = true;
    effects.logs.push({ evt: 'room.created', code, playerId: 'p1' });
    return { ok: true, value: { code, token, playerId: 'p1' }, effects };
  }

  async join(
    nickname: string,
    sockets: SocketInfo[],
    now: number,
  ): Promise<CoreResult<JoinRoomResponse, 'NOT_FOUND' | 'FULL' | 'BAD_NICKNAME'>> {
    const clean = normalizeNickname(nickname);
    if (clean === null) return this.#fail('BAD_NICKNAME');
    const { token, tokenHash } = await this.#newToken();

    // Sem `await` daqui até o fim: leitura dos assentos e gravação são atômicas.
    const record = this.#record;
    if (!record) return this.#fail('NOT_FOUND');
    const free = SEAT_IDS.find((id) => !record.seats.some((seat) => seat.id === id));
    if (!free) return this.#fail('FULL');
    const seat: SeatRecord = {
      id: free,
      nickname: clean,
      tokenHash,
      ready: false,
      wantsRematch: false,
      offlineSince: now,
    };
    record.seats = [...record.seats, seat].sort((a, b) => a.id.localeCompare(b.id));
    const effects = this.#effects();
    effects.persist = true;
    effects.logs.push({ evt: 'room.joined', code: record.code, playerId: free });
    const message = roomMessage(record, sockets, now);
    for (const socket of sockets) {
      if (socket.seat !== null) effects.send.push({ socketId: socket.socketId, message });
    }
    return { ok: true, value: { token, playerId: free }, effects };
  }

  /** Dados públicos para a tela de convite; `null` se a sala não existe. */
  info(): RoomInfoResponse | null {
    const record = this.#record;
    if (!record) return null;
    return {
      code: record.code,
      status: record.status,
      nicknames: record.seats.map((seat) => seat.nickname),
      full: record.seats.length >= SEAT_IDS.length,
    };
  }
}
