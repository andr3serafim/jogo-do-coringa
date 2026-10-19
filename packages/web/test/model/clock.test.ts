import { RoomClient, type Deadline, type StateMessage } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { URGENT_MS, clockAnnouncement, clockFace, type ClockFace } from '../../src/model/clock.ts';

function deadline(players: Deadline['players'] = ['p1'], at = 0): Deadline {
  return { kind: 'TURN', at, players };
}

describe('clockFace', () => {
  it('sem prazo não há relógio', () => {
    expect(clockFace(null, 5_000, 'p1')).toBeNull();
  });

  it('8000 ms: 8 s, sem urgência', () => {
    expect(clockFace(deadline(), 8_000, 'p1')).toEqual({
      kind: 'TURN',
      seconds: 8,
      urgent: false,
      expired: false,
      mine: true,
      pausedTurnSeconds: null,
    });
  });

  it('4200 ms: arredonda para cima (5 s) e entra em urgência', () => {
    const face = clockFace(deadline(), 4_200, 'p1')!;
    expect(face.seconds).toBe(5);
    expect(face.urgent).toBe(true);
    expect(face.expired).toBe(false);
  });

  it('o limite da urgência é inclusivo: exatamente 5000 ms é urgente, 5001 não', () => {
    expect(URGENT_MS).toBe(5_000);
    expect(clockFace(deadline(), 5_000, 'p1')!.urgent).toBe(true);
    expect(clockFace(deadline(), 5_001, 'p1')!.urgent).toBe(false);
  });

  it('0 ms: esgotado, sem urgência', () => {
    const face = clockFace(deadline(), 0, 'p1')!;
    expect(face.expired).toBe(true);
    expect(face.urgent).toBe(false);
    expect(face.seconds).toBe(0);
  });

  it('prazo do outro: mine false; no Equipar (os dois) é meu', () => {
    expect(clockFace(deadline(['p2']), 8_000, 'p1')!.mine).toBe(false);
    expect(clockFace({ kind: 'EQUIP', at: 0, players: ['p1', 'p2'] }, 8_000, 'p1')!.mine).toBe(true);
  });

  it('pausedTurnMs 21400 vira 22 s', () => {
    expect(clockFace(deadline(), 8_000, 'p1', 21_400)!.pausedTurnSeconds).toBe(22);
  });
});

describe('clockAnnouncement', () => {
  it('a sequência 30, 11, 10, 6, 5 anuncia start, null, ten, null, five', () => {
    const seq = [30, 11, 10, 6, 5];
    let previous: number | null = null;
    const out: Array<string | null> = [];
    for (const s of seq) {
      const face = clockFace(deadline(), s * 1000, 'p1');
      out.push(clockAnnouncement(previous, face));
      previous = face!.seconds;
    }
    expect(out).toEqual(['start', null, 'ten', null, 'five']);
  });

  it('prazo de outro jogador nunca é anunciado', () => {
    const face = (s: number): ClockFace => clockFace(deadline(['p2']), s * 1000, 'p1')!;
    expect(clockAnnouncement(null, face(30))).toBeNull();
    expect(clockAnnouncement(11, face(10))).toBeNull();
    expect(clockAnnouncement(6, face(5))).toBeNull();
  });

  it('sem face, esgotado ou sem queda não anuncia', () => {
    expect(clockAnnouncement(null, null)).toBeNull();
    expect(clockAnnouncement(1, clockFace(deadline(), 0, 'p1'))).toBeNull();
    expect(clockAnnouncement(null, clockFace(deadline(), 0, 'p1'))).toBeNull();
    expect(clockAnnouncement(20, clockFace(deadline(), 20_000, 'p1'))).toBeNull();
  });

  it('o primeiro prazo já abaixo de 10 s só anuncia start; um salto de 11 a 4 anuncia o mais urgente', () => {
    expect(clockAnnouncement(null, clockFace(deadline(), 4_000, 'p1'))).toBe('start');
    expect(clockAnnouncement(11, clockFace(deadline(), 4_000, 'p1'))).toBe('five');
  });
});

/** WebSocket mínimo: o teste age como servidor. */
class FakeWebSocket {
  static last: FakeWebSocket | null = null;
  readyState = 0;
  onopen: (() => void) | null = null;
  onmessage: ((ev: { data: unknown }) => void) | null = null;
  onclose: ((ev: { code: number }) => void) | null = null;
  readonly url: string;
  constructor(url: string) {
    this.url = url;
    FakeWebSocket.last = this;
  }
  send(): void {}
  close(): void {
    this.readyState = 3;
  }
}

describe('clockFace com o RoomClient (Review Focus 4)', () => {
  it('relógio local 3 min adiantado: os segundos vêm do relógio do servidor', () => {
    const SERVER_NOW = 1_000_000;
    let local = SERVER_NOW + 180_000; // 3 min adiantado
    const client = new RoomClient({
      server: 'http://localhost:8787',
      code: 'ABC234',
      token: 'T'.repeat(43),
      WebSocketImpl: FakeWebSocket as unknown as typeof WebSocket,
      random: () => 0.5,
      setTimer: () => 0,
      clearTimer: () => {},
      now: () => local,
    });
    client.connect();
    const ws = FakeWebSocket.last!;
    ws.readyState = 1;
    ws.onopen?.();
    const d: Deadline = { kind: 'TURN', at: SERVER_NOW + 8_000, players: ['p1'] };
    const msg: StateMessage = { t: 'state', seq: 1, epoch: 0, view: {} as never, events: [], deadline: d, serverNow: SERVER_NOW };
    ws.onmessage?.({ data: JSON.stringify(msg) });

    expect(clockFace(d, client.remainingMs(d), 'p1')!.seconds).toBe(8);
    local += 3_000;
    expect(clockFace(d, client.remainingMs(d), 'p1')!.seconds).toBe(5);
    // Sem o deslocamento, o relógio local daria prazo vencido.
    expect(Math.max(0, d.at - local)).toBe(0);
  });
});
