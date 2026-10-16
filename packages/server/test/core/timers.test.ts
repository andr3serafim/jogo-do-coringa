import { actingPlayers, applyAction, createGame, legalActions, viewFor } from '@coringa/engine';
import type { GameState } from '@coringa/engine';
import type { PlayerAction, StateMessage } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { setup, handId } from '../../../engine/test/helpers.ts';
import { applyHeldPass, applyTimeout, autoSteps } from '../../src/core/game.ts';
import { schedulePhase } from '../../src/core/timing.ts';
import { TIMERS } from '../../src/core/timers.ts';
import type { SeatId } from '../../src/core/types.ts';
import { stateFor } from '../../src/core/views.ts';
import { CODE, Harness } from './harness.ts';
import type { FakeSocket, Room } from './harness.ts';

const EQUIP_STATE = (): GameState =>
  setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: { pending: [3, 4] }, p2: { pending: [5, 6] } });

/** Sala em PLAYING com o estado montado e o prazo da fase já armado (como se ela tivesse começado agora). */
async function armed(state: GameState): Promise<Room> {
  const room = await Harness.fromState(state);
  room.h.arm();
  return room;
}

function lastState(h: Harness, sock: FakeSocket): StateMessage {
  return h.messages(sock, 'state').at(-1)!;
}

async function act(h: Harness, sock: FakeSocket, id: string, action: PlayerAction): Promise<void> {
  await h.send(sock, { t: 'act', id, epoch: h.core.record!.epoch, action });
}

const phaseOf = (h: Harness): GameState['phase'] => h.core.record!.game!.state.phase;

describe('prazo de cada fase estoura com o efeito da spec (§6.2)', () => {
  it('Equipar: 40 s; as numéricas restantes vão para a fileira; conta estouro para quem não confirmou', async () => {
    const { h } = await armed(EQUIP_STATE());
    const rec = h.core.record!;
    const epoch = rec.epoch;
    h.advance(TIMERS.equipMs + TIMERS.graceMs);
    const state = rec.game!.state;
    expect(state.round).toBe(2);
    expect(state.players.map((p) => p.attackRow.length + p.defenseRow.length)).toEqual([2, 2]);
    expect(state.players.every((p) => p.pending.length === 0 || p.pending.length === 4)).toBe(true);
    expect(rec.game!.steps).toEqual([{ player: 'system', action: { type: 'TIMEOUT' } }]);
    expect(rec.game!.strikes).toEqual({ p1: 1, p2: 1 });
    expect(rec.epoch).toBe(epoch + 1);
    expect(rec.game!.phaseDeadlineAt).toBe(h.now + TIMERS.equipMs);
  });

  it('Escolha da ordem: 10 s; ataca primeiro; prazo novo de 30 s; não conta estouro', async () => {
    const { h, p1, p2 } = await armed(setup({ round: 3, roundKind: 'ATTACK', phase: { kind: 'ORDER_CHOICE', player: 'p1' } }));
    const rec = h.core.record!;
    expect(rec.game!.phaseDeadlineAt).toBe(h.now + TIMERS.orderMs);
    h.advance(TIMERS.orderMs + TIMERS.graceMs);
    expect(rec.game!.state.turnOrder[0]).toBe('p1');
    expect(phaseOf(h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    expect(rec.game!.strikes).toEqual({ p1: 0, p2: 0 });
    for (const sock of [p1, p2]) {
      expect(lastState(h, sock).deadline).toEqual({ kind: 'TURN', at: h.now + TIMERS.turnMs, players: ['p1'] });
    }
    expect(rec.game!.phaseStartedAt).toBe(h.now);
  });

  it('Turno: 30 s; com Ataque monta declara (abre a reação de 8 s); sem Ataque encerra o turno; conta estouro', async () => {
    const full = await armed(setup({ p1: { attack: [9] } }));
    full.h.advance(TIMERS.turnMs + TIMERS.graceMs);
    expect(phaseOf(full.h)).toEqual({ kind: 'REACTION', responder: 'p2', trigger: 'ATTACK' });
    expect(full.h.core.record!.game!.strikes).toEqual({ p1: 1, p2: 0 });
    expect(lastState(full.h, full.p2).deadline).toEqual({ kind: 'REACTION', at: full.h.now + TIMERS.reactionMs, players: ['p2'] });
    expect(lastState(full.h, full.p2).pausedTurnMs).toBeUndefined();

    const empty = await armed(setup({}));
    empty.h.advance(TIMERS.turnMs + TIMERS.graceMs);
    expect(phaseOf(empty.h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p2' });
    expect(empty.h.core.record!.game!.strikes).toEqual({ p1: 1, p2: 0 });
    expect(lastState(empty.h, empty.p1).deadline).toEqual({ kind: 'TURN', at: empty.h.now + TIMERS.turnMs, players: ['p2'] });
  });

  it('Janela de reação: 8 s; passa; o ataque se resolve e o próximo turno começa com 30 s; não conta estouro', async () => {
    const { h, p1, p2 } = await armed(setup({ p1: { attack: [9] } }));
    await act(h, p1, 'atk', { type: 'DECLARE_ATTACK' });
    expect(phaseOf(h)).toMatchObject({ kind: 'REACTION', trigger: 'ATTACK' });
    expect(lastState(h, p2).deadline).toEqual({ kind: 'REACTION', at: h.now + TIMERS.reactionMs, players: ['p2'] });
    const rec = h.core.record!;
    h.advance(TIMERS.reactionMs + TIMERS.graceMs);
    expect(phaseOf(h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p2' });
    expect(rec.game!.state.players[1]!.hp).toBeLessThan(100);
    expect(rec.game!.strikes).toEqual({ p1: 0, p2: 0 });
    expect(rec.game!.steps.at(-1)).toEqual({ player: 'system', action: { type: 'TIMEOUT' } });
    expect(lastState(h, p1).deadline).toEqual({ kind: 'TURN', at: h.now + TIMERS.turnMs, players: ['p2'] });
  });
});

describe('prazo mostrado e margem de rede (§6.6)', () => {
  it('o prazo enviado é o mostrado; o estouro só vem 500 ms depois', async () => {
    const { h, p1 } = await Harness.playing();
    const at = lastState(h, p1).deadline!.at;
    expect(at).toBe(h.now + 40_000);
    expect(h.alarm).toBe(at + TIMERS.graceMs);
    h.advance(40_400);
    expect(h.core.record!.game!.state.phase.kind).toBe('EQUIP');
    expect(h.core.record!.game!.state.round).toBe(1);
    h.advance(100);
    expect(h.core.record!.game!.state.round).toBe(2);
  });

  it('jogada dentro da margem de rede vale', async () => {
    const { h, p1 } = await armed(EQUIP_STATE());
    h.advance(40_200);
    await act(h, p1, 'late', { type: 'EQUIP', destinations: ['ATK', 'DEF'] });
    expect(p1.inbox.at(-1)).toMatchObject({ t: 'ack', id: 'late', ok: true });
    expect(h.core.record!.game!.state.players[0]!.equipSubmitted).toBe(true);
    // O estouro vem na hora marcada, só para quem faltou.
    h.advance(300);
    expect(h.core.record!.game!.strikes).toEqual({ p1: 0, p2: 1 });
  });

  it('o alarme pedido à casca é o do prazo mais cedo e vira nulo no fim da partida', async () => {
    const { h, p1 } = await armed(setup({}));
    expect(h.alarm).toBe(h.now + TIMERS.turnMs + TIMERS.graceMs);
    await h.send(p1, { t: 'concede', id: 'c' });
    expect(h.core.record!.game!.phaseDeadlineAt).toBeNull();
    expect(h.core.record!.agenda.map((item) => item.kind)).toEqual(['idleExpiry', 'hardExpiry']);
  });
});

describe('alarme: chave de época (§6.4)', () => {
  it('PENDÊNCIA: alarme atrasado depois da troca de fase não muda nada', async () => {
    const { h, p1, p2 } = await Harness.playing();
    const rec = h.core.record!;
    h.advance(10_000);
    const oldEpoch = rec.epoch;
    const oldAt = h.now + 30_000 + TIMERS.graceMs;
    for (const [sock, id] of [[p1, 'a1'], [p2, 'a2']] as const) {
      const action = legalActions(viewFor(rec.game!.state, sock.seat!)).find((candidate) => candidate.type === 'EQUIP')!;
      await act(h, sock, id, action as PlayerAction);
    }
    expect(rec.epoch).toBe(oldEpoch + 1);
    expect(rec.game!.state.round).toBe(2);

    // O item velho ficou para trás na agenda (aqui, posto à mão): vence depois da troca de fase.
    rec.agenda.push({ kind: 'phase', at: oldAt, epoch: oldEpoch });
    const before = JSON.stringify([rec.seq, rec.epoch, rec.game]);
    const inbox = [p1.inbox.length, p2.inbox.length];
    h.now = oldAt;
    const effects = h.core.onAlarm(h.sockets, oldAt);
    h.apply(effects);
    expect(JSON.stringify([rec.seq, rec.epoch, rec.game])).toBe(before);
    expect([p1.inbox.length, p2.inbox.length]).toEqual(inbox);
    expect(effects.send).toEqual([]);
    expect(effects.logs).toEqual([]);
    // O item velho foi descartado e o alarme segue o prazo da fase nova.
    expect(rec.agenda.filter((item) => item.kind === 'phase')).toHaveLength(1);
    expect(rec.agenda.find((item) => item.kind === 'phase')!.epoch).toBe(rec.epoch);
    expect(effects.alarm).toBe(rec.game!.phaseDeadlineAt! + TIMERS.graceMs);
  });

  it('alarme repetido (mesmo instante duas vezes) não aplica duas vezes', async () => {
    const { h } = await armed(EQUIP_STATE());
    const rec = h.core.record!;
    const at = rec.game!.phaseDeadlineAt! + TIMERS.graceMs;
    h.now = at;
    h.apply(h.core.onAlarm(h.sockets, at));
    const seq = rec.seq;
    const snapshot = JSON.stringify(rec);
    expect(rec.game!.steps).toHaveLength(1);
    expect(rec.game!.strikes).toEqual({ p1: 1, p2: 1 });
    const again = h.core.onAlarm(h.sockets, at);
    h.apply(again);
    expect(rec.seq).toBe(seq);
    expect(JSON.stringify(rec)).toBe(snapshot);
    expect(again.send).toEqual([]);
    expect(again.persist).toBe(false);
    // Mesmo se a plataforma repetir o alarme do item já consumido, a agenda não o traz de volta.
    expect(again.alarm).toBe(rec.game!.phaseDeadlineAt! + TIMERS.graceMs);
  });

  it('item de partida acabada, de época velha e PASS guardado inexistente não fazem nada; tipos ainda sem tratamento ficam', async () => {
    const empty = new Harness();
    expect(empty.core.onAlarm([], 5)).toMatchObject({ alarm: null, persist: false, send: [] });

    const { h, p1 } = await armed(setup({ p1: { hand: ['K'] } }));
    const rec = h.core.record!;
    rec.agenda.push({ kind: 'reactionMin', at: h.now, epoch: rec.epoch }); // sem PASS guardado
    rec.agenda.push({ kind: 'reactionMin', at: h.now, epoch: rec.epoch - 1 });
    rec.agenda.push({ kind: 'presenceSweep', at: h.now, gameNo: 1 });
    const snapshot = JSON.stringify(rec.game);
    const effects = h.core.onAlarm(h.sockets, h.now);
    expect(JSON.stringify(rec.game)).toBe(snapshot);
    expect(effects.send).toEqual([]);
    expect(rec.agenda.some((item) => item.kind === 'presenceSweep')).toBe(true);
    expect(rec.agenda.some((item) => item.kind === 'reactionMin')).toBe(false);

    await h.send(p1, { t: 'concede', id: 'c' });
    rec.agenda.push({ kind: 'phase', at: h.now, epoch: rec.epoch });
    const finished = JSON.stringify(rec.game);
    h.core.onAlarm(h.sockets, h.now + 1);
    expect(JSON.stringify(rec.game)).toBe(finished);
  });
});

describe('turno pausa na janela do oponente (§6.2)', () => {
  it('turno pausa na janela do K e volta com o que sobrou', async () => {
    const state = setup({ p1: { hand: ['K'] } });
    const kId = handId(state, 'p1', 'K');
    const { h, p1, p2 } = await armed(state);
    h.advance(10_000);
    await act(h, p1, 'k', { type: 'PLAY_K', cardIds: [kId] });
    const rec = h.core.record!;
    expect(rec.game!.pausedTurnMs).toBe(20_000);
    for (const sock of [p1, p2]) {
      const st = lastState(h, sock);
      expect(st.pausedTurnMs).toBe(20_000);
      expect(st.deadline).toEqual({ kind: 'REACTION', at: h.now + 8_000, players: ['p2'] });
    }
    h.advance(3_000); // o piso de 2 s já passou: o PASS vale na hora
    await act(h, p2, 'p', { type: 'PASS' });
    expect(p2.inbox.at(-1)).toMatchObject({ t: 'ack', ok: true, seq: rec.seq });
    expect(phaseOf(h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    for (const sock of [p1, p2]) {
      const st = lastState(h, sock);
      expect(st.deadline).toEqual({ kind: 'TURN', at: h.now + 20_000, players: ['p1'] });
      expect(st.pausedTurnMs).toBeUndefined();
    }
    expect(rec.game!.pausedTurnMs).toBeNull();
    // O turno retomado estoura no prazo que sobrou, não nos 30 s cheios.
    h.advance(20_499);
    expect(phaseOf(h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    h.advance(1);
    expect(phaseOf(h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p2' });
  });

  it('K jogado quase no fim do turno volta com o pouco que sobrou, sem piso', async () => {
    const state = setup({ p1: { hand: ['K'] } });
    const { h, p1, p2 } = await armed(state);
    h.advance(29_700);
    await act(h, p1, 'k', { type: 'PLAY_K', cardIds: [handId(state, 'p1', 'K')] });
    expect(h.core.record!.game!.pausedTurnMs).toBe(300);
    h.advance(TIMERS.reactionMinMs);
    await act(h, p2, 'p', { type: 'PASS' });
    expect(lastState(h, p1).deadline!.at).toBe(h.now + 300);
  });

  it('K jogado depois do prazo (dentro da margem) volta com 0, não negativo', async () => {
    const state = setup({ p1: { hand: ['K'] } });
    const { h, p1, p2 } = await armed(state);
    h.advance(30_200);
    await act(h, p1, 'k', { type: 'PLAY_K', cardIds: [handId(state, 'p1', 'K')] });
    expect(h.core.record!.game!.pausedTurnMs).toBe(0);
    h.advance(TIMERS.reactionMinMs);
    await act(h, p2, 'p', { type: 'PASS' });
    expect(lastState(h, p1).deadline!.at).toBe(h.now);
  });

  it('mesmo com Reflect: pausa e volta; turno novo começa com 30 s cheios', async () => {
    const state = setup({ p1: { hand: ['K', 'J', 'Q'] } });
    const { h, p1, p2 } = await armed(state);
    h.advance(12_000);
    await act(h, p1, 'r', {
      type: 'REFLECT',
      kId: handId(state, 'p1', 'K'),
      jId: handId(state, 'p1', 'J'),
      qId: handId(state, 'p1', 'Q'),
    });
    const rec = h.core.record!;
    expect(phaseOf(h)).toMatchObject({ kind: 'REACTION', trigger: 'REFLECT_PLAYED' });
    expect(lastState(h, p2).pausedTurnMs).toBe(18_000);
    h.advance(TIMERS.reactionMinMs);
    await act(h, p2, 'p', { type: 'PASS' });
    expect(phaseOf(h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    expect(lastState(h, p1).deadline!.at).toBe(h.now + 18_000);

    // O turno acaba (sem Ataque montado) e o turno do p2 começa cheio.
    await act(h, p1, 'e', { type: 'END_TURN' });
    expect(phaseOf(h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p2' });
    expect(lastState(h, p2).deadline).toEqual({ kind: 'TURN', at: h.now + 30_000, players: ['p2'] });
    expect(rec.game!.pausedTurnMs).toBeNull();
  });

  it('a janela de um ataque não guarda tempo do turno, e o prazo do Ás na reação não muda', async () => {
    const state = setup({ p1: { attack: [9], attackBuffs: ['J'] }, p2: { hand: ['A'] } });
    const { h, p1, p2 } = await armed(state);
    await act(h, p1, 'atk', { type: 'DECLARE_ATTACK' });
    const rec = h.core.record!;
    expect(rec.game!.pausedTurnMs).toBeNull();
    const at = rec.game!.phaseDeadlineAt;
    const target = state.players[0]!.attackBuffs[0]!.id;
    h.advance(500);
    await act(h, p2, 'trap', { type: 'TRAP', cardId: handId(state, 'p2', 'A'), targetId: target });
    expect(p2.inbox.at(-1)).toMatchObject({ t: 'ack', ok: true });
    expect(rec.game!.phaseDeadlineAt).toBe(at);
    expect(phaseOf(h)).toMatchObject({ kind: 'REACTION' });
  });
});

describe('piso da janela de reação (§6.3)', () => {
  async function kWindow(extra: Parameters<typeof setup>[0] = {}): Promise<Room & { state: GameState }> {
    const state = setup({ p1: { hand: ['K'] }, ...extra });
    const room = await armed(state);
    await act(room.h, room.p1, 'k', { type: 'PLAY_K', cardIds: [handId(state, 'p1', 'K')] });
    return { ...room, state };
  }

  it('PASS antes de 2 s fica guardado (held) e vale aos 2 s; TRAP antes de 2 s vale na hora', async () => {
    const { h, p1, p2, state } = await kWindow({ p2: { hand: ['A'] } });
    const rec = h.core.record!;
    const opened = rec.game!.phaseStartedAt;
    expect(opened).toBe(h.now);
    const seq = rec.seq;
    const epoch = rec.epoch;
    const p1Inbox = p1.inbox.length;

    // O Ás (TRAP) vale na hora e não fecha a janela.
    h.advance(300);
    const guardId = rec.game!.state.players[0]!.guard[0]!.id;
    await act(h, p2, 'trap', { type: 'TRAP', cardId: handId(state, 'p2', 'A'), targetId: guardId });
    expect(p2.inbox.at(-1)).toMatchObject({ t: 'ack', id: 'trap', ok: true, seq: seq + 1 });
    expect(rec.epoch).toBe(epoch);
    expect(phaseOf(h)).toMatchObject({ kind: 'REACTION' });

    // O PASS em 600 ms fica guardado.
    h.advance(300);
    expect(h.now).toBe(opened + 600);
    const seqBefore = rec.seq;
    await act(h, p2, 'pass', { type: 'PASS' });
    expect(p2.inbox.at(-1)).toEqual({ t: 'ack', id: 'pass', ok: true, held: true });
    expect(rec.seq).toBe(seqBefore);
    expect(phaseOf(h)).toMatchObject({ kind: 'REACTION' });
    expect(rec.game!.heldPass).toEqual({ epoch: rec.epoch, id: 'pass' });
    expect(rec.agenda).toContainEqual({ kind: 'reactionMin', at: opened + 2_000, epoch: rec.epoch });
    expect(h.alarm).toBe(opened + 2_000);
    // O oponente não recebeu nada do PASS.
    expect(p1.inbox.length).toBe(p1Inbox + 1); // só o `state` da jogada do Ás
    expect(h.messages(p1, 'state').at(-1)!.view.phase).toMatchObject({ kind: 'REACTION' });

    // Repetir o mesmo id devolve o mesmo ack; outra jogada do respondente nessa época vira ALREADY_PASSED.
    await act(h, p2, 'pass', { type: 'PASS' });
    expect(p2.inbox.at(-1)).toEqual({ t: 'ack', id: 'pass', ok: true, held: true });
    await act(h, p2, 'pass-2', { type: 'PASS' });
    expect(p2.inbox.at(-1)).toMatchObject({ ok: false, code: 'ALREADY_PASSED' });
    await act(h, p2, 'outra', { type: 'TRAP', cardId: 'x', targetId: 'y' });
    expect(p2.inbox.at(-1)).toMatchObject({ ok: false, code: 'ALREADY_PASSED' });
    // Quem não é o respondente recebe o erro do motor, não o ALREADY_PASSED.
    await act(h, p1, 'p1-pass', { type: 'PASS' });
    expect(p1.inbox.at(-1)).toMatchObject({ ok: false, code: 'NOT_YOUR_TURN' });

    // Aos 2 s o PASS é aplicado.
    h.advance(1_399);
    expect(phaseOf(h)).toMatchObject({ kind: 'REACTION' });
    const inbox1 = p1.inbox.length;
    h.advance(1);
    expect(h.now).toBe(opened + 2_000);
    expect(phaseOf(h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    expect(rec.game!.steps.at(-1)).toEqual({ player: 'p2', action: { type: 'PASS' } });
    expect(rec.game!.heldPass).toBeNull();
    expect(rec.agenda.some((item) => item.kind === 'reactionMin')).toBe(false);
    expect(h.messages(p1, 'state').length).toBeGreaterThan(0);
    expect(p1.inbox.length).toBe(inbox1 + 1);
    expect(h.messages(p1, 'state').at(-1)!.view.phase).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    expect(h.messages(p1, 'state').at(-1)!.seq).toBe(rec.seq);
    // Depois de aplicado, o mesmo id continua devolvendo o ack guardado.
    await act(h, p2, 'pass', { type: 'PASS' });
    expect(p2.inbox.at(-1)).toEqual({ t: 'ack', id: 'pass', ok: true, held: true });
  });

  it('PASS exatamente aos 2 s vale na hora; o guardado persiste no registro', async () => {
    const { h, p2 } = await kWindow();
    const persisted = h.persisted;
    h.advance(1_999);
    await act(h, p2, 'a', { type: 'PASS' });
    expect(h.persisted).toBe(persisted + 1);
    expect(p2.inbox.at(-1)).toMatchObject({ held: true });

    const second = await kWindow();
    second.h.advance(2_000);
    await act(second.h, second.p2, 'b', { type: 'PASS' });
    expect(second.p2.inbox.at(-1)).toMatchObject({ ok: true, seq: second.h.core.record!.seq });
    expect(phaseOf(second.h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
  });

  it('o PASS guardado conta como jogada voluntária do respondente quando é aplicado', async () => {
    const { h, p2 } = await kWindow();
    const rec = h.core.record!;
    rec.game!.strikes.p2 = 2;
    await act(h, p2, 'a', { type: 'PASS' });
    expect(rec.game!.strikes.p2).toBe(2);
    h.advance(2_000);
    expect(rec.game!.strikes.p2).toBe(0);
  });

  it('applyHeldPass sem PASS guardado, de outra época ou fora da janela não faz nada', async () => {
    const { h } = await kWindow();
    const rec = h.core.record!;
    const seq = rec.seq;
    expect(applyHeldPass(rec, h.now)).toEqual([]);
    rec.game!.heldPass = { epoch: rec.epoch - 1, id: 'velho' };
    expect(applyHeldPass(rec, h.now)).toEqual([]);
    expect(rec.seq).toBe(seq);
    const other = await armed(setup({}));
    other.h.core.record!.game!.heldPass = { epoch: other.h.core.record!.epoch, id: 'x' };
    expect(applyHeldPass(other.h.core.record!, other.h.now)).toEqual([]);
  });

  it('a janela que fecha por estouro (8 s) leva o PASS guardado junto: o item reactionMin sai da agenda', async () => {
    const { h, p2 } = await kWindow();
    const rec = h.core.record!;
    await act(h, p2, 'a', { type: 'PASS' });
    h.advance(TIMERS.reactionMs + TIMERS.graceMs);
    expect(phaseOf(h)).toEqual({ kind: 'ATTACK_MAIN', player: 'p1' });
    expect(rec.agenda.some((item) => item.kind === 'reactionMin')).toBe(false);
    expect(rec.game!.heldPass).toBeNull();
  });
});

describe('estouros e W.O. (§7.3)', () => {
  /** Cenário: o p1 nunca age; o p2 joga a primeira jogada legal sempre que é a vez dele. */
  async function afkP1(): Promise<{ room: Room; strikes: Array<[string, number]>; kinds: string[] }> {
    const room = await armed(
      setup({ round: 2, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: { pending: [3, 4] }, p2: { pending: [5, 6] } }),
    );
    const { h, p2 } = room;
    const rec = h.core.record!;
    const strikes: Array<[string, number]> = [];
    const kinds: string[] = [];
    for (let i = 0; i < 200 && rec.status === 'PLAYING'; i += 1) {
      const state = rec.game!.state;
      const acting = actingPlayers(state);
      if (acting.includes('p2')) {
        const action = legalActions(viewFor(state, 'p2'))[0]!;
        if (state.phase.kind === 'REACTION') h.advance(TIMERS.reactionMinMs); // o PASS só vale depois do piso
        await act(h, p2, `v${i}`, action as PlayerAction);
        continue;
      }
      const before = rec.game!.strikes.p1;
      const kind = state.phase.kind;
      h.advance(h.alarm! - h.now);
      if (rec.game!.strikes.p1 !== before) {
        strikes.push([kind, rec.game!.strikes.p1]);
        kinds.push(kind);
      }
    }
    return { room, strikes, kinds };
  }

  it('estouros: Equipar + Turno + Turno seguidos → W.O. AFK; a partida acaba pelo servidor', async () => {
    const { room, strikes } = await afkP1();
    const { h, p1, p2 } = room;
    const rec = h.core.record!;
    expect(strikes.map(([, n]) => n)).toEqual([1, 2, 3]);
    expect(strikes.map(([kind]) => kind)).toContain('EQUIP');
    expect(strikes.map(([kind]) => kind)).toContain('ATTACK_MAIN');
    expect(rec.status).toBe('FINISHED');
    expect(rec.outcome).toEqual({ gameNo: 1, result: { kind: 'WIN', winner: 'p2', reason: 'FORFEIT' }, cause: 'AFK' });
    expect(rec.score).toEqual({ p1: 0, p2: 1, draws: 0 });
    expect(rec.game!.steps.at(-1)).toEqual({ player: 'system', action: { type: 'FORFEIT', loser: 'p1' } });
    const evts = h.logs.map((line) => line.evt);
    expect(evts.slice(-3)).toEqual(['wo.applied', 'game.ended', 'game.replay']);
    expect(h.logs).toContainEqual({ evt: 'wo.applied', code: CODE, gameNo: 1, loser: 'p1', cause: 'AFK' });
    for (const sock of [p1, p2]) {
      expect(h.messages(sock, 'room').at(-1)).toMatchObject({ status: 'FINISHED', outcome: { cause: 'AFK' } });
    }
    expect(h.alarm).toBe(rec.agenda.length ? Math.min(...rec.agenda.map((item) => item.at)) : null);
    expect(rec.game!.phaseDeadlineAt).toBeNull();
  });

  it('jogada voluntária zera os estouros, em qualquer fase (inclusive PASS)', async () => {
    const state = setup({ p1: { attack: [9] } });
    const { h, p1, p2 } = await armed(state);
    const rec = h.core.record!;
    rec.game!.strikes.p1 = 2;
    rec.game!.strikes.p2 = 2;
    await act(h, p1, 'atk', { type: 'DECLARE_ATTACK' });
    expect(rec.game!.strikes).toEqual({ p1: 0, p2: 2 });
    h.advance(TIMERS.reactionMinMs);
    await act(h, p2, 'pass', { type: 'PASS' });
    expect(rec.game!.strikes).toEqual({ p1: 0, p2: 0 });
  });

  it('o terceiro estouro seguido do Turno dá W.O. mesmo sem Equipar no meio; dois estouros não bastam', async () => {
    const { h } = await armed(setup({}));
    const rec = h.core.record!;
    rec.game!.strikes.p1 = 2;
    h.advance(TIMERS.turnMs + TIMERS.graceMs);
    expect(rec.status).toBe('FINISHED');
    expect(rec.outcome).toMatchObject({ cause: 'AFK', result: { kind: 'WIN', winner: 'p2', reason: 'FORFEIT' } });
    expect(rec.game!.strikes.p1).toBe(3);

    const two = await armed(setup({}));
    two.h.core.record!.game!.strikes.p1 = 1;
    two.h.advance(TIMERS.turnMs + TIMERS.graceMs);
    expect(two.h.core.record!.status).toBe('PLAYING');
  });

  it('estouro da Escolha da ordem e da janela de reação não contam', async () => {
    const order = await armed(setup({ round: 3, roundKind: 'ATTACK', phase: { kind: 'ORDER_CHOICE', player: 'p1' } }));
    order.h.core.record!.game!.strikes.p1 = 2;
    order.h.advance(TIMERS.orderMs + TIMERS.graceMs);
    expect(order.h.core.record!.game!.strikes).toEqual({ p1: 2, p2: 0 });
    expect(order.h.core.record!.status).toBe('PLAYING');

    const react = await armed(setup({ p1: { attack: [9] } }));
    await act(react.h, react.p1, 'atk', { type: 'DECLARE_ATTACK' });
    react.h.core.record!.game!.strikes.p2 = 2;
    react.h.advance(TIMERS.reactionMs + TIMERS.graceMs);
    expect(react.h.core.record!.game!.strikes).toEqual({ p1: 0, p2: 2 });
    expect(react.h.core.record!.status).toBe('PLAYING');
  });

  it('Equipar: quem já confirmou ou não tem numéricas pendentes não leva estouro', async () => {
    const { h, p1 } = await armed(
      setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: { pending: [3, 4] }, p2: { pending: [] } }),
    );
    // p2 sem numéricas nem chega a ser pendente: o Equipar automático cuida dele (fora do `armed`, que não roda `autoSteps`).
    autoSteps(h.core.record!, h.now);
    h.arm();
    await act(h, p1, 'e', { type: 'EQUIP', destinations: ['ATK', 'DEF'] });
    expect(h.core.record!.game!.strikes).toEqual({ p1: 0, p2: 0 });
    // Estourar o Equipar com um dos dois pendentes só soma ao pendente.
    const only = await armed(
      setup({ round: 1, roundKind: 'EQUIP', phase: { kind: 'EQUIP' }, p1: { pending: [3, 4], equipSubmitted: true }, p2: { pending: [5, 6] } }),
    );
    only.h.advance(TIMERS.equipMs + TIMERS.graceMs);
    expect(only.h.core.record!.game!.strikes).toEqual({ p1: 0, p2: 1 });
  });
});

describe('nenhum TIMEOUT injetado é recusado pelo motor', () => {
  it('joga partidas só por estouros (misturando jogadas voluntárias) até o fim; todas as chamadas ok', async () => {
    for (const seed of ['t-1', 't-2', 't-3']) {
      const { h, p1, p2 } = await Harness.playing(undefined, seed);
      const rec = h.core.record!;
      // As expirações de sala são da Tarefa 9: o relógio aqui passa de 30 min de partida.
      rec.agenda = rec.agenda.filter((item) => item.kind !== 'idleExpiry' && item.kind !== 'hardExpiry');
      h.alarm = Math.min(...rec.agenda.map((item) => item.at));
      let timeouts = 0;
      for (let i = 0; i < 4_000 && rec.status === 'PLAYING'; i += 1) {
        const state = rec.game!.state;
        const who = actingPlayers(state)[0] as SeatId;
        // A cada três rodadas de espera, o jogador da vez joga de verdade (zera os estouros e evita o W.O.).
        if (i % 3 === 2) {
          const sock = who === 'p1' ? p1 : p2;
          const action = legalActions(viewFor(state, who))[0]!;
          h.advance(TIMERS.reactionMinMs);
          await act(h, sock, `v${i}`, action as PlayerAction);
        } else {
          const before = rec.game!.steps.length;
          h.advance(h.alarm! - h.now);
          timeouts += rec.game!.steps.slice(before).filter((step) => step.action.type === 'TIMEOUT').length;
        }
      }
      expect(rec.status).toBe('FINISHED');
      expect(timeouts).toBeGreaterThan(10);
      // O registro da partida reexecuta no motor sem recusa.
      const created = createGame(rec.game!.state.config, rec.game!.seed, ['p1', 'p2']);
      if (!created.ok) throw new Error('createGame falhou');
      let state = created.state;
      for (const step of rec.game!.steps) {
        const result = applyAction(state, step.player, step.action);
        expect(result.ok).toBe(true);
        if (result.ok) state = result.state;
      }
      expect(state).toEqual(rec.game!.state);
    }
  });
});

describe('schedulePhase e stateFor direto', () => {
  it('sem partida lança; GAME_OVER não tem prazo nem item na agenda', async () => {
    const lobby = await Harness.lobby();
    expect(() => schedulePhase(lobby.h.core.record!, { key: '', phase: { kind: 'EQUIP' }, deadlineAt: null }, [], 0)).toThrow();

    const { h } = await armed(setup({}));
    const rec = h.core.record!;
    rec.game!.state.phase = { kind: 'GAME_OVER', result: { kind: 'DRAW', reason: 'ANTI_STALL' } };
    rec.game!.pausedTurnMs = 123;
    schedulePhase(rec, { key: 'outra', phase: { kind: 'EQUIP' }, deadlineAt: null }, [], h.now);
    expect(rec.game!.phaseDeadlineAt).toBeNull();
    expect(rec.game!.pausedTurnMs).toBeNull();
    expect(rec.agenda.some((item) => item.kind === 'phase')).toBe(false);
    expect(stateFor(rec, 'p1', [], h.now).deadline).toBeNull();
  });

  it('turno sem TurnStarted e sem tempo guardado (cenário montado de fora) começa com 30 s; com tempo guardado, retoma', async () => {
    const { h } = await Harness.fromState(setup({}));
    const rec = h.core.record!;
    schedulePhase(rec, { key: 'outra', phase: { kind: 'EQUIP' }, deadlineAt: null }, [], h.now);
    expect(rec.game!.phaseDeadlineAt).toBe(h.now + TIMERS.turnMs);
    rec.game!.pausedTurnMs = 7_000;
    schedulePhase(rec, { key: 'outra', phase: { kind: 'REACTION', responder: 'p2', trigger: 'K_PLAYED' }, deadlineAt: null }, [], h.now + 1_000);
    expect(rec.game!.phaseDeadlineAt).toBe(h.now + 1_000 + 7_000);
    // Com `TurnStarted` entre os eventos o turno é novo, mesmo havendo tempo guardado.
    rec.game!.pausedTurnMs = 7_000;
    schedulePhase(rec, { key: 'outra', phase: { kind: 'EQUIP' }, deadlineAt: null }, [{ type: 'TurnStarted', player: 'p1' }], h.now + 2_000);
    expect(rec.game!.phaseDeadlineAt).toBe(h.now + 2_000 + TIMERS.turnMs);
    expect(rec.game!.pausedTurnMs).toBeNull();
  });

  it('applyTimeout em GAME_OVER... não é chamado; em REACTION não soma estouro (sem tocar nos contadores)', async () => {
    const { h } = await armed(setup({ p1: { attack: [9] } }));
    const rec = h.core.record!;
    const steps = applyTimeout(rec, h.now);
    expect(steps[0]!.events.map((e) => e.type)).toContain('AttackDeclared');
    expect(rec.game!.strikes).toEqual({ p1: 1, p2: 0 });
    expect(applyTimeout(rec, h.now)[0]!.events.map((e) => e.type)).toContain('ReactionWindowClosed');
    expect(rec.game!.strikes).toEqual({ p1: 1, p2: 0 });
  });
});
