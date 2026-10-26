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

/**
 * A casca aplica os `Effects` em ordem: envios, fechamentos, `deleteAll` (`worker/room.ts`, conferido de ponta a ponta no
 * workerd em `test/worker/socket.test.ts`). O núcleo conta com isso na expiração: manda o fim da partida e fecha no mesmo `Effects`.
 */
describe('contrato entre o núcleo e a casca: expiração no meio da partida', () => {
  it('o room e o replay saem nos mesmos Effects do 4000 e do deleteAll, para cada socket que vai fechar', async () => {
    const { h, p1, p2 } = await Harness.playing();
    const rec = h.core.record!;
    rec.agenda = rec.agenda.map((item) => (item.kind === 'hardExpiry' ? { ...item, at: h.now } : item));

    const effects = h.core.onAlarm(h.sockets, h.now);
    expect(effects.deleteAll).toBe(true);
    expect(effects.persist).toBe(false);
    expect(effects.close).toEqual([
      { socketId: p1.id, code: 4000, reason: expect.any(String) },
      { socketId: p2.id, code: 4000, reason: expect.any(String) },
    ]);
    // Por socket, na ordem em que a casca os aplica: `room` (FINISHED) e `replay`, e só depois o fechamento.
    for (const sock of [p1, p2]) {
      const sent = effects.send.filter((entry) => entry.socketId === sock.id).map((entry) => entry.message);
      expect(sent.map((message) => message.t)).toEqual(['room', 'replay']);
      expect(sent[0]).toMatchObject({ status: 'FINISHED', outcome: { cause: 'ABANDONED' } });
      expect(sent[1]).toMatchObject({ gameNo: 1, replay: { seed: rec.game!.seed, steps: rec.game!.steps } });
    }
  });
});
