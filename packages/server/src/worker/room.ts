import { DurableObject } from 'cloudflare:workers';
import type { CreateRoomResponse, JoinRoomResponse, RoomInfoResponse } from '@coringa/protocol';
import { emptyEffects, mergeEffects } from '../core/effects.ts';
import { RoomCore } from '../core/room-core.ts';
import { joinRecord, splitRecord, STORAGE_KEYS } from '../core/storage-layout.ts';
import type { CoreDeps, Effects, SeatId, SocketInfo } from '../core/types.ts';

export type RpcResult<T, E extends string> = { ok: true; value: T } | { ok: false; error: E };

/** O que cada socket guarda (limite de 16 KiB): sobrevive à hibernação e é a fonte da lista de sockets do núcleo. */
interface Attachment {
  socketId: string;
  seat: SeatId | null;
  connectedAt: number;
  lastMessageAt: number;
}

const randomBytes = (n: number): Uint8Array => crypto.getRandomValues(new Uint8Array(n));

/**
 * As dependências do núcleo. `E2E_SEED` não vazio fixa só a semente da partida (`<E2E_SEED>-<gameNo>`, a revanche é outro
 * sorteio, sempre o mesmo); os tokens de assento e os códigos de sala seguem no `crypto`. No `wrangler.jsonc` ele é vazio
 * (um teste confere), e só o Playwright o liga, com `wrangler dev --var`.
 */
export function depsFor(env: Pick<Env, 'E2E_SEED'>): CoreDeps {
  // O `wrangler types` gera o tipo literal da var (`""`): alargado para `string`, o `if` enxerga os dois lados.
  const e2eSeed: string = env.E2E_SEED;
  return e2eSeed ? { randomBytes, newSeed: (gameNo) => `${e2eSeed}-${gameNo}` } : { randomBytes };
}

/**
 * Casca do Durable Object da sala (spec §9). Toda a lógica está no `RoomCore`; aqui ficam só o storage, os
 * sockets hibernáveis, o alarme único e o log. Cada entrada: (1) acorda, se for a primeira desde a
 * reconstrução da instância (`reconcile` antes de qualquer outra coisa); (2) chama o núcleo com a lista de
 * sockets e o `now`; (3) aplica os `Effects` em ordem.
 */
export class Room extends DurableObject<Env> {
  /** Núcleo em memória; `null` depois de um erro (o registro dele pode estar pela metade) até a próxima entrada recarregar. */
  core: RoomCore | null;
  /** `reconcile` já rodou nesta vida da instância? Zera quando o núcleo é descartado. */
  #reconciled = false;
  /** Alarme que a plataforma tem agora; `undefined` até a primeira leitura (`getAlarm()` uma vez por vida da instância). */
  #alarm: number | null | undefined;
  /** Fim da última entrada da fila: cada entrada espera a anterior terminar, com ou sem erro. */
  #queue: Promise<unknown> = Promise.resolve();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    this.core = this.#load();
  }

  #load(): RoomCore {
    const { kv } = this.ctx.storage;
    const [room, game, recent, log] = STORAGE_KEYS.map((key) => kv.get(key));
    const record = joinRecord({ room, game, recent, log } as Parameters<typeof joinRecord>[0]);
    return new RoomCore(record, depsFor(this.env));
  }

  /** Os sockets abertos como o núcleo os entende; `lastSeenAt` junta mensagens e auto-respostas de `ping`. */
  sockets(): SocketInfo[] {
    const sockets: SocketInfo[] = [];
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      // Um socket que a gente já fechou fica em CLOSING até o evento de fechamento chegar: já não conta.
      if (!attachment || ws.readyState !== WebSocket.READY_STATE_OPEN) continue;
      const pinged = this.ctx.getWebSocketAutoResponseTimestamp(ws)?.getTime() ?? 0;
      sockets.push({
        socketId: attachment.socketId,
        seat: attachment.seat,
        connectedAt: attachment.connectedAt,
        lastSeenAt: Math.max(attachment.lastMessageAt, pinged),
      });
    }
    return sockets;
  }

  /**
   * Toda entrada passa por aqui, em fila: a plataforma entrega outro evento enquanto uma entrada espera o SHA-256 do
   * `hello` (não é storage, o portão de entrada abre), e sem a fila uma mensagem do mesmo socket chegaria ao núcleo
   * antes do `attach` (4003 falso), a revanche largaria de um instantâneo velho e dois `getAlarm` concorrentes
   * desencontrariam o `#alarm`. Se o núcleo lançar: nada mais é gravado, o erro vai ao log, a instância do núcleo é
   * descartada (a próxima entrada recarrega do storage e reconcilia de novo) e a exceção é relançada, para a
   * plataforma repetir o alarme; a fila segue para a próxima entrada.
   *
   * `woke` são os efeitos do `reconcile` desta entrada (vazios se a instância já estava acordada). Por padrão são
   * aplicados antes de `run`; com `deferWake`, `run` os recebe e aplica junto com os seus (o alarme, para não gravar
   * um `setAlarm` intermediário).
   */
  #enter<T>(run: (core: RoomCore, now: number, woke: Effects) => Promise<T>, deferWake = false): Promise<T> {
    const entry = this.#queue.then(() => this.#run(run, deferWake));
    this.#queue = entry.catch(() => undefined);
    return entry;
  }

  async #run<T>(run: (core: RoomCore, now: number, woke: Effects) => Promise<T>, deferWake: boolean): Promise<T> {
    const core = (this.core ??= this.#load());
    try {
      let woke = emptyEffects();
      if (!this.#reconciled) {
        this.#reconciled = true;
        woke = core.reconcile(this.sockets(), Date.now());
        if (!deferWake) {
          await this.#apply(core, woke);
          woke = emptyEffects();
        }
      }
      return await run(core, Date.now(), woke);
    } catch (error) {
      // Só descarta se o núcleo que falhou ainda é o atual: outra entrada pode já tê-lo trocado por um recarregado.
      if (this.core === core) this.#fail(error);
      throw error;
    }
  }

  #fail(error: unknown): void {
    const failure = error instanceof Error ? error : new Error(String(error));
    console.log(
      JSON.stringify({ evt: 'error', code: this.core?.record?.code ?? '', message: failure.message, stack: failure.stack }),
    );
    this.core = null;
    this.#reconciled = false;
    this.#alarm = undefined; // o que a plataforma tem agora é incerto: lê de novo na próxima vez
  }

  #byId(socketId: string): WebSocket | undefined {
    return this.ctx.getWebSockets().find((ws) => (ws.deserializeAttachment() as Attachment | null)?.socketId === socketId);
  }

  /** Roda `op`; ignora a falha só se o socket já não está aberto, senão relança. */
  #tolerant(ws: WebSocket, op: () => void): void {
    try {
      op();
    } catch (error) {
      if (ws.readyState !== WebSocket.READY_STATE_OPEN) return;
      throw error;
    }
  }

  /** Aplica os efeitos na ordem da spec: attach, gravação, envios, fechamentos, apagar tudo, alarme, logs. */
  async #apply(core: RoomCore, effects: Effects): Promise<void> {
    // Defesa: com a fila nenhuma outra entrada roda no meio desta; se mesmo assim o núcleo foi trocado, nada dele vale.
    if (this.core !== core) throw new Error('a sala foi recarregada durante a entrada');
    const { storage } = this.ctx;

    for (const { socketId, seat } of effects.attach) {
      const ws = this.#byId(socketId);
      const attachment = ws?.deserializeAttachment() as Attachment | null | undefined;
      if (ws && attachment) ws.serializeAttachment({ ...attachment, seat } satisfies Attachment);
    }

    // As quatro gravações seguem sem `await` entre elas: o runtime as junta num lote atômico.
    if (effects.persist && core.record) {
      const parts = splitRecord(core.record);
      for (const key of STORAGE_KEYS) storage.kv.put(key, parts[key]);
    }

    // Socket que já fechou (ou sumiu) não é erro: o núcleo pode mandar a quem acabou de cair. Qualquer outra falha
    // (código de fechamento inválido, envio grande demais) é bug: sobe, e `#enter` registra e descarta o núcleo.
    for (const { socketId, message } of effects.send) {
      const ws = this.#byId(socketId);
      if (ws) this.#tolerant(ws, () => ws.send(JSON.stringify(message)));
    }
    for (const { socketId, code, reason } of effects.close) {
      const ws = this.#byId(socketId);
      if (ws) this.#tolerant(ws, () => ws.close(code, reason));
    }

    // `deleteAll` vale com ou sem `persist`; com a `compatibility_date` atual ele apaga o alarme também.
    if (effects.deleteAll) {
      await storage.deleteAll();
      this.#alarm = null;
    }

    if (this.#alarm === undefined) this.#alarm = await storage.getAlarm();
    if (effects.alarm !== this.#alarm) {
      if (effects.alarm === null) await storage.deleteAlarm();
      else await storage.setAlarm(effects.alarm);
      this.#alarm = effects.alarm;
    }

    for (const line of effects.logs) console.log(JSON.stringify(line));
  }

  async create(code: string, nickname: string, hp?: number): Promise<RpcResult<CreateRoomResponse, 'EXISTS' | 'BAD_NICKNAME'>> {
    return this.#enter(async (core, now) => {
      const result = await core.create(code, nickname, now, hp);
      await this.#apply(core, result.effects);
      return result.ok ? { ok: true, value: result.value } : { ok: false, error: result.error };
    });
  }

  async join(nickname: string): Promise<RpcResult<JoinRoomResponse, 'NOT_FOUND' | 'FULL' | 'BAD_NICKNAME'>> {
    return this.#enter(async (core, now) => {
      const result = await core.join(nickname, this.sockets(), now);
      await this.#apply(core, result.effects);
      return result.ok ? { ok: true, value: result.value } : { ok: false, error: result.error };
    });
  }

  async info(): Promise<RoomInfoResponse | null> {
    return this.#enter(async (core) => core.info());
  }

  override async fetch(request: Request): Promise<Response> {
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('esperava um WebSocket', { status: 426 });
    }
    return this.#enter(async (core, now) => {
      const { 0: client, 1: server } = new WebSocketPair();
      const attachment: Attachment = { socketId: crypto.randomUUID(), seat: null, connectedAt: now, lastMessageAt: now };
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment(attachment);
      const self: SocketInfo = {
        socketId: attachment.socketId,
        seat: null,
        connectedAt: now,
        lastSeenAt: now,
      };
      await this.#apply(core, core.onOpen(self, this.sockets(), now));
      return new Response(null, { status: 101, webSocket: client });
    });
  }

  override async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    // Mensagem que estava no ar de um socket que a gente já está fechando: o núcleo não precisa saber dela
    // (fora da lista de sockets, o remetente viraria "sem assento" e levaria um 4003 falso).
    if (ws.readyState !== WebSocket.READY_STATE_OPEN) return;
    await this.#enter(async (core, now) => {
      // De novo na vez da entrada: uma entrada anterior da fila pode ter fechado este socket (ex.: 4009 da aba nova).
      if (ws.readyState !== WebSocket.READY_STATE_OPEN) return;
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (!attachment) return;
      ws.serializeAttachment({ ...attachment, lastMessageAt: now } satisfies Attachment);
      await this.#apply(core, await core.onMessage(attachment.socketId, message, this.sockets(), now));
    });
  }

  override async webSocketClose(ws: WebSocket, code: number, reason: string): Promise<void> {
    try {
      await this.#closed(ws);
    } finally {
      // Completa o aperto de mãos do fechamento. A plataforma responde sozinha (`compatibility_date` recente), mas o
      // `wrangler dev` local não: sem isto o cliente que fechou vê 1006. Se já fechou, é só ignorar.
      try {
        ws.close(code >= 1000 && code < 5000 && ![1004, 1005, 1006, 1015].includes(code) ? code : 1000, reason);
      } catch {
        /* já estava fechado */
      }
    }
  }

  override async webSocketError(ws: WebSocket): Promise<void> {
    await this.#closed(ws);
  }

  /** Fechamento e erro levam ao mesmo lugar: sem isso o mapa de assentos em memória do núcleo vazaria até hibernar. */
  async #closed(ws: WebSocket): Promise<void> {
    await this.#enter(async (core, now) => {
      const attachment = ws.deserializeAttachment() as Attachment | null;
      if (!attachment) return;
      await this.#apply(core, core.onClose(attachment.socketId, this.sockets(), now));
    });
  }

  override async alarm(): Promise<void> {
    await this.#enter(async (core, now, woke) => {
      // O alarme que disparou já foi consumido pela plataforma. Zerado aqui, na vez desta entrada: uma entrada
      // anterior da fila ainda poderia regravar o valor velho por cima.
      this.#alarm = null;
      // O `reconcile` da instância fria devolve o alarme do item ainda vencido; aplicado sozinho, viraria um
      // `setAlarm` no passado (uma linha a mais) logo antes do certo. Juntos, o alarme que vale é o do `onAlarm`.
      await this.#apply(core, mergeEffects(woke, core.onAlarm(this.sockets(), now)));
    }, true);
  }
}
