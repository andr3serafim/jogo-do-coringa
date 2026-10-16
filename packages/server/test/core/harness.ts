import { nextInt, seedRng } from '@coringa/engine';
import type { CreateRoomResponse, JoinRoomResponse } from '@coringa/protocol';
import { RoomCore } from '../../src/core/room-core.ts';
import type { CoreDeps, Effects, LogLine, SocketInfo } from '../../src/core/types.ts';

export const CODE = 'K7M2QX';

/** Núcleo + relógio falso + efeitos acumulados. As próximas tarefas estendem esta classe. */
export class Harness {
  now = 1_000_000;
  core: RoomCore;
  logs: LogLine[] = [];
  alarm: number | null = null;
  deleted = false;
  sockets: SocketInfo[] = [];
  sent: Effects['send'] = [];
  closed: Effects['close'] = [];
  attached: Effects['attach'] = [];

  constructor(seed?: string) {
    this.core = new RoomCore(null, Harness.deps(seed));
  }

  /** Dependências determinísticas: bytes do PRNG do motor e sementes `semente-1`, `semente-2`, … */
  static deps(seed = 'harness'): CoreDeps {
    const rng = seedRng(seed);
    let counter = 0;
    return {
      randomBytes: (n) => Uint8Array.from({ length: n }, () => nextInt(rng, 256)),
      newSeed: () => {
        counter += 1;
        return `semente-${counter}`;
      },
    };
  }

  apply(e: Effects): void {
    this.logs.push(...e.logs);
    this.alarm = e.alarm;
    if (e.deleteAll) this.deleted = true;
    this.sent.push(...e.send);
    this.closed.push(...e.close);
    this.attached.push(...e.attach);
  }

  async create(nickname = 'Ana'): Promise<CreateRoomResponse> {
    const r = await this.core.create(CODE, nickname, this.now);
    this.apply(r.effects);
    if (!r.ok) throw new Error(`create falhou: ${r.error}`);
    return r.value;
  }

  async join(nickname = 'Bia'): Promise<JoinRoomResponse> {
    const r = await this.core.join(nickname, this.sockets, this.now);
    this.apply(r.effects);
    if (!r.ok) throw new Error(`join falhou: ${r.error}`);
    return r.value;
  }
}
