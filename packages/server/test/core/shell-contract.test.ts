import { describe, expect, it } from 'vitest';
import type { SocketInfo } from '../../src/core/types.ts';
import { Harness } from './harness.ts';

/**
 * Convenções da lista de sockets que a casca do Durable Object segue (ela monta a lista a partir de
 * `ctx.getWebSockets()`, e o runtime pode ou não incluir o socket que acabou de abrir ou de fechar).
 */
describe('contrato entre o núcleo e a casca: lista de sockets', () => {
  it('onOpen: a lista com o socket novo e a lista sem ele dão os mesmos efeitos', async () => {
    const withNew = await Harness.lobby('contrato');
    const withoutNew = await Harness.lobby('contrato');
    const info = (h: Harness): SocketInfo => ({ socketId: 'novo', seat: null, connectedAt: h.now, lastSeenAt: h.now });

    const a = withNew.h.core.onOpen(info(withNew.h), [...withNew.h.sockets, info(withNew.h)], withNew.h.now);
    const b = withoutNew.h.core.onOpen(info(withoutNew.h), withoutNew.h.sockets, withoutNew.h.now);
    expect(a).toEqual(b);
    expect(a.close).toEqual([]);
  });

  it('onClose: a lista com o socket que fechou e a lista sem ele dão os mesmos efeitos', async () => {
    const withClosed = await Harness.lobby('contrato');
    const withoutClosed = await Harness.lobby('contrato');

    const a = withClosed.h.core.onClose(withClosed.p1.id, withClosed.h.sockets, withClosed.h.now);
    const b = withoutClosed.h.core.onClose(
      withoutClosed.p1.id,
      withoutClosed.h.sockets.filter((socket) => socket.socketId !== withoutClosed.p1.id),
      withoutClosed.h.now,
    );
    expect(a).toEqual(b);
    expect(a.persist).toBe(true);
    expect(withClosed.h.core.record!.seats[0]!.offlineSince).not.toBeNull();
  });

  it('onMessage: o remetente precisa estar na lista; o sinal dele conta como agora', async () => {
    const { h, p1 } = await Harness.lobby('contrato');
    const stale = h.sockets.map((socket) =>
      socket.socketId === p1.id ? { ...socket, lastSeenAt: h.now - 3_600_000 } : socket,
    );

    // Com o remetente (mesmo com sinal velho): a mensagem vale e ninguém é fechado.
    const ok = await h.core.onMessage(p1.id, JSON.stringify({ t: 'ready', ready: true }), stale, h.now);
    expect(ok.close).toEqual([]);

    // Sem o remetente, o socket autenticado vira "sem assento" e cai com 4003: a casca nunca pode omiti-lo.
    const omitted = await h.core.onMessage(
      p1.id,
      JSON.stringify({ t: 'ready', ready: false }),
      stale.filter((socket) => socket.socketId !== p1.id),
      h.now,
    );
    expect(omitted.close).toEqual([{ socketId: p1.id, code: 4003, reason: expect.any(String) }]);
  });
});
