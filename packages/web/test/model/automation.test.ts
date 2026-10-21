import { viewFor, type GameEvent, type NumCard, type PlayerView, type Rank } from '@coringa/engine';
import type { Deadline } from '@coringa/protocol';
import { describe, expect, it } from 'vitest';
import { ORDER_AUTO_MS, shouldAutoPass } from '../../src/model/automation.ts';
import { AUTO_PASS_NOTICE } from '../../src/model/copy.ts';
import { completeDraft } from '../../src/model/equip.ts';
import { NO_MARKS, zoneKey } from '../../src/model/marks.ts';
import { legalFor } from '../../src/model/plays.ts';
import { Session, type SessionDeps } from '../../src/model/session.ts';
import { DEFAULT_PREFS, type Prefs } from '../../src/model/storage.ts';
import { buildTimeline, timelineMs } from '../../src/model/timeline.ts';
import { deferredAck, FakeConnection, scenarioAt, stateMessage, viewAt } from '../fixtures.ts';

/** Relógio e timers falsos: o teste avança o tempo na mão. */
function fakeDeps() {
  let nowMs = 1_000;
  let nextHandle = 0;
  const timers = new Map<number, { at: number; fn: () => void }>();
  const deps: SessionDeps = {
    now: () => nowMs,
    setTimer: (fn, ms) => {
      nextHandle += 1;
      timers.set(nextHandle, { at: nowMs + ms, fn });
      return nextHandle;
    },
    clearTimer: (h) => {
      timers.delete(h as number);
    },
  };
  return {
    deps,
    timers,
    advance(ms: number) {
      nowMs += ms;
      for (const [h, t] of [...timers].sort((a, b) => a[1].at - b[1].at)) {
        if (t.at <= nowMs) {
          timers.delete(h);
          t.fn();
        }
      }
    },
  };
}

function setup(options: ConstructorParameters<typeof FakeConnection>[0] = {}, prefs: Prefs = DEFAULT_PREFS) {
  const connection = new FakeConnection(options);
  const clock = fakeDeps();
  const session = new Session(connection, clock.deps, prefs);
  return { connection, clock, session };
}

/** Deixa as promessas dos acks se resolverem. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const PASS = { type: 'PASS' } as const;
const END_TURN = { type: 'END_TURN' } as const;

/** Janela de reação de p1 sem resposta possível (mão vazia): só `PASS`. */
const passOnlyView = () => viewAt({ phase: 'K_PLAYED' });
/** Janela de reação de p1 com uma Armadilha possível. */
const trapView = () => viewAt({ phase: 'K_PLAYED', self: { hand: ['A'] }, opponent: { guard: ['K'] } });
/** p1 escolhe a ordem (ou, com `p2`, o oponente escolhe). */
const orderView = (player: 'p1' | 'p2' = 'p1') => viewAt({ phase: { kind: 'ORDER_CHOICE', player } });

const orderEvents: GameEvent[] = [
  { type: 'RoundStarted', round: 3, kind: 'ATTACK' },
  { type: 'CardsDealt', player: 'p1', count: 2 },
  { type: 'DamageDealt', attacker: 'p1', defender: 'p2', attack: 10, defense: 5, damage: 5 },
  { type: 'TurnStarted', player: 'p1' },
];

describe('shouldAutoPass', () => {
  it('só PASS, janela de reação, chave ligada e nada enviado', () => {
    const view = passOnlyView();
    expect(legalFor(view)).toEqual([PASS]);
    expect(shouldAutoPass(view, legalFor(view), DEFAULT_PREFS, false)).toBe(true);
  });

  it('chave desligada', () => {
    const view = passOnlyView();
    expect(shouldAutoPass(view, legalFor(view), { ...DEFAULT_PREFS, autoPass: false }, false)).toBe(false);
  });

  it('já enviado nesta época', () => {
    const view = passOnlyView();
    expect(shouldAutoPass(view, legalFor(view), DEFAULT_PREFS, true)).toBe(false);
  });

  it('com resposta possível, não', () => {
    const view = trapView();
    expect(legalFor(view).length).toBeGreaterThan(1);
    expect(shouldAutoPass(view, legalFor(view), DEFAULT_PREFS, false)).toBe(false);
  });

  it('fora de uma janela de reação, não', () => {
    expect(shouldAutoPass(viewAt(), [PASS], DEFAULT_PREFS, false)).toBe(false);
    expect(shouldAutoPass(passOnlyView(), [], DEFAULT_PREFS, false)).toBe(false);
  });
});

describe('Session: passe automático (spec §3.7)', () => {
  it('só PASS legal e a chave ligada: um act com auto, assim que o state chega', () => {
    const { connection } = setup();
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3 }));
    expect(connection.sent).toEqual([{ type: 'act', id: 'fake-1', action: PASS, options: { auto: true } }]);
  });

  it('sem o passe automático na sessão (treino, spec §2.6), nada sai com a chave ligada, e o jogador passa à mão', async () => {
    const connection = new FakeConnection();
    const session = new Session(connection, fakeDeps().deps, DEFAULT_PREFS, { autoPass: false });
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3 }));
    expect(connection.sent).toHaveLength(0);
    // Ligar a chave não muda nada, e as preferências guardadas ficam como estão (a chave só não se aplica).
    session.setPrefs({ ...DEFAULT_PREFS, autoPass: true });
    expect(connection.sent).toHaveLength(0);
    expect(session.snapshot().prefs).toEqual(DEFAULT_PREFS);
    await session.play(PASS);
    expect(connection.sent).toEqual([{ type: 'act', id: 'fake-1', action: PASS, options: undefined }]);
  });

  it('com a chave desligada, nada sai; ligar a chave na janela manda um', () => {
    const { connection, session } = setup({}, { ...DEFAULT_PREFS, autoPass: false });
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3 }));
    expect(connection.sent).toHaveLength(0);
    session.setPrefs(DEFAULT_PREFS);
    expect(connection.sent).toHaveLength(1);
    expect(connection.sent[0]).toMatchObject({ action: PASS, options: { auto: true } });
  });

  it('com resposta possível, nada sai', () => {
    const { connection } = setup();
    connection.emitState(stateMessage(trapView(), { epoch: 3 }));
    expect(connection.sent).toHaveLength(0);
  });

  it('uma vez por época; época nova, outro passe', async () => {
    const { connection } = setup();
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3, seq: 1 }));
    await flush();
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3, seq: 2 }));
    await flush();
    expect(connection.sent).toHaveLength(1);
    connection.emitState(stateMessage(passOnlyView(), { epoch: 4, seq: 3 }));
    expect(connection.sent).toHaveLength(2);
  });

  it('mostra "Sem resposta possível; passando" e tira o aviso quando a época muda', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3 }));
    await flush();
    expect(session.snapshot().notice).toEqual({ kind: 'autoPass', text: AUTO_PASS_NOTICE });
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3, seq: 2 }));
    expect(session.snapshot().notice?.kind).toBe('autoPass');
    connection.emitState(stateMessage(viewAt(), { epoch: 4, seq: 3 }));
    expect(session.snapshot().notice).toBeNull();
  });

  it('o state que já estava na conexão ao criar a sessão também passa', () => {
    const connection = new FakeConnection({ state: stateMessage(passOnlyView(), { epoch: 2 }) });
    new Session(connection, fakeDeps().deps);
    expect(connection.sent).toHaveLength(1);
  });

  it('com outra jogada em voo, o passe sai quando o ack chega', async () => {
    const { connection, session } = setup();
    const gate = deferredAck();
    connection.acks.push(gate.promise);
    const done = session.play(END_TURN);
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3 }));
    expect(connection.sent).toHaveLength(1);
    gate.resolve({ ok: true });
    await done;
    expect(connection.sent).toHaveLength(2);
    expect(connection.sent[1]).toMatchObject({ action: PASS, options: { auto: true } });
  });

  it('um passe automático recusado não tenta de novo na mesma época', async () => {
    const { connection } = setup();
    connection.acks.push({ ok: false, code: 'INVALID_ACTION', message: 'x' });
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3, seq: 1 }));
    await flush();
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3, seq: 2 }));
    expect(connection.sent).toHaveLength(1);
  });

  it('o passe automático que falha na rede não vira erro solto', async () => {
    const { connection, session } = setup();
    connection.act = () => Promise.reject(new Error('boom'));
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3 }));
    await flush();
    expect(session.snapshot().pending).toBe(false);
  });
});

describe('Session: aviso e jogada nova', () => {
  it('uma jogada limpa só os avisos rate e rule, e cancela só o timer deles', async () => {
    const { connection, clock, session } = setup();
    connection.emitState(stateMessage(passOnlyView(), { epoch: 3 }));
    await flush();
    expect(session.snapshot().notice?.kind).toBe('autoPass');
    await session.play(END_TURN);
    expect(session.snapshot().notice?.kind).toBe('autoPass');

    connection.acks.push({ ok: false, code: 'BUFF_LIMIT', message: 'x' });
    await session.play(END_TURN);
    expect(session.snapshot().notice?.kind).toBe('rule');
    expect(clock.timers.size).toBe(1);
    await session.play(END_TURN);
    expect(session.snapshot().notice).toBeNull();
    expect(clock.timers.size).toBe(0);
  });
});

describe('Session: ordem automática (spec §3.6)', () => {
  const total = timelineMs(buildTimeline(orderEvents, { mode: 'live', reducedMotion: false, decisionPending: true }));

  it('a conta é a mesma do palco (decisão pendente: tudo cabe em 1 s)', () => {
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(1_000);
  });

  it('sai aos timelineMs + 3000 com auto', () => {
    const { connection, clock, session } = setup();
    connection.emitState(stateMessage(orderView(), { epoch: 5, events: orderEvents }));
    expect(session.snapshot().orderAutoAt).toBe(session.snapshot().receivedAt + total + ORDER_AUTO_MS);
    clock.advance(total + ORDER_AUTO_MS - 1);
    expect(connection.sent).toHaveLength(0);
    clock.advance(1);
    expect(connection.sent).toEqual([
      { type: 'act', id: 'fake-1', action: { type: 'CHOOSE_ORDER', first: true }, options: { auto: true } },
    ]);
    expect(session.snapshot().orderAutoAt).toBeNull();
  });

  it('interact() antes do prazo: nada sai e o prazo some', () => {
    const { connection, clock, session } = setup();
    connection.emitState(stateMessage(orderView(), { epoch: 5, events: orderEvents }));
    session.interact();
    expect(session.snapshot().orderAutoAt).toBeNull();
    expect(clock.timers.size).toBe(0);
    clock.advance(10_000);
    expect(connection.sent).toHaveLength(0);
  });

  it('interact() sem nada agendado não mexe no snapshot', () => {
    const { session } = setup();
    const before = session.snapshot();
    session.interact();
    expect(session.snapshot()).toBe(before);
  });

  it('um state da mesma época não reagenda nem reabre o que o jogador cancelou', () => {
    const { connection, clock, session } = setup();
    connection.emitState(stateMessage(orderView(), { epoch: 5, events: orderEvents }));
    const at = session.snapshot().orderAutoAt;
    clock.advance(200);
    connection.emitState(stateMessage(orderView(), { epoch: 5, seq: 2 }));
    expect(session.snapshot().orderAutoAt).toBe(at);
    expect(clock.timers.size).toBe(1);
    session.interact();
    connection.emitState(stateMessage(orderView(), { epoch: 5, seq: 3 }));
    expect(session.snapshot().orderAutoAt).toBeNull();
    expect(clock.timers.size).toBe(0);
  });

  it('só para quem escolhe: o oponente escolhendo não agenda nada', () => {
    const { connection, clock, session } = setup();
    connection.emitState(stateMessage(orderView('p2'), { epoch: 5, events: orderEvents }));
    expect(session.snapshot().orderAutoAt).toBeNull();
    expect(clock.timers.size).toBe(0);
  });

  it('a fase mudando cancela o agendamento', () => {
    const { connection, clock, session } = setup();
    connection.emitState(stateMessage(orderView(), { epoch: 5, events: orderEvents }));
    connection.emitState(stateMessage(viewAt(), { epoch: 6, seq: 2 }));
    expect(session.snapshot().orderAutoAt).toBeNull();
    expect(clock.timers.size).toBe(0);
    clock.advance(10_000);
    expect(connection.sent).toHaveLength(0);
  });

  it('escolher a ordem na mão cancela a automática', async () => {
    const { connection, clock, session } = setup();
    connection.emitState(stateMessage(orderView(), { epoch: 5, events: orderEvents }));
    await session.play({ type: 'CHOOSE_ORDER', first: false });
    expect(session.snapshot().orderAutoAt).toBeNull();
    clock.advance(10_000);
    expect(connection.sent).toHaveLength(1);
    expect(connection.sent[0]).toMatchObject({ action: { type: 'CHOOSE_ORDER', first: false }, options: undefined });
  });

  it('catchUp usa a linha do tempo do catchUp; resync não tem batidas', () => {
    const catchUp = timelineMs(buildTimeline(orderEvents, { mode: 'catchUp', reducedMotion: false, decisionPending: true }));
    const a = setup();
    a.connection.emitState(stateMessage(orderView(), { epoch: 5, events: orderEvents, catchUp: true }));
    expect(a.session.snapshot().orderAutoAt).toBe(a.session.snapshot().receivedAt + catchUp + ORDER_AUTO_MS);
    expect(catchUp).toBeLessThan(total);

    const b = setup();
    b.connection.emitState(stateMessage(orderView(), { epoch: 5, events: orderEvents, resync: true }));
    expect(b.session.snapshot().orderAutoAt).toBe(b.session.snapshot().receivedAt + ORDER_AUTO_MS);
  });

  it('dispose cancela o agendamento', () => {
    const { connection, clock, session } = setup();
    connection.emitState(stateMessage(orderView(), { epoch: 5, events: orderEvents }));
    session.dispose();
    expect(clock.timers.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------
// Equipar

function equipView(pending: Rank[], attackRow: Rank[] = [2], defenseRow: Rank[] = [3]): PlayerView {
  const { state } = scenarioAt({ phase: { kind: 'EQUIP' }, self: { attackRow, defenseRow } });
  const me = state.players.find((p) => p.id === 'p1')!;
  me.equipSubmitted = false;
  me.pending = pending.map((value, i): NumCard => ({ id: `pend-${i}`, kind: 'NUM', value, suit: 'copas' }));
  return viewFor(state, 'p1');
}

const EQUIP_DEADLINE: Deadline = { kind: 'EQUIP', at: 10_000, players: ['p1', 'p2'] };

/** Sessão no Equipar, com `remaining` ms no relógio do servidor. */
function equipSetup(remaining: number, pending: Rank[] = [5, 6, 4]) {
  const view = equipView(pending);
  const base = setup({ now: EQUIP_DEADLINE.at - remaining });
  base.connection.emitState(stateMessage(view, { epoch: 7, deadline: EQUIP_DEADLINE }));
  return { ...base, view };
}

describe('Session: envio antecipado do Equipar (spec §3.5)', () => {
  it('1 escolha e 1499 ms restantes: EQUIP igual a completeDraft, sem auto', () => {
    const { connection, session, view } = equipSetup(1_499);
    session.equipChoose('ATK');
    expect(connection.sent).toEqual([
      {
        type: 'act',
        id: 'fake-1',
        action: { type: 'EQUIP', destinations: completeDraft(view, ['ATK']) },
        options: undefined,
      },
    ]);
    expect(session.snapshot().equipConfirmed).toBe('thisPage');
  });

  it('0 escolhas: nada sai, nem quando o prazo chega perto', () => {
    const { connection, clock } = equipSetup(1_499);
    clock.advance(60_000);
    expect(connection.sent).toHaveLength(0);
  });

  it('com mais tempo, o envio é agendado para quando faltarem 1500 ms', () => {
    const { connection, clock, session, view } = equipSetup(5_000);
    session.equipChoose('DEF');
    expect(connection.sent).toHaveLength(0);
    clock.advance(3_499);
    expect(connection.sent).toHaveLength(0);
    clock.advance(1);
    expect(connection.sent).toHaveLength(1);
    expect(connection.sent[0]).toMatchObject({
      action: { type: 'EQUIP', destinations: completeDraft(view, ['DEF']) },
      options: undefined,
    });
  });

  it('desfazer até zero cancela o envio', () => {
    const { connection, clock, session } = equipSetup(5_000);
    session.equipChoose('ATK');
    session.equipUndo();
    expect(clock.timers.size).toBe(0);
    clock.advance(10_000);
    expect(connection.sent).toHaveLength(0);
  });

  it('confirmar na mão cancela o envio antecipado', async () => {
    const { connection, clock, session } = equipSetup(5_000, [5]);
    session.equipChoose('ATK');
    await session.equipConfirm();
    expect(connection.sent).toHaveLength(1);
    clock.advance(10_000);
    expect(connection.sent).toHaveLength(1);
  });

  it('a época mudando cancela o envio; dispose também', () => {
    const a = equipSetup(5_000);
    a.session.equipChoose('ATK');
    a.connection.emitState(stateMessage(viewAt(), { epoch: 8, seq: 2 }));
    expect(a.clock.timers.size).toBe(0);
    a.clock.advance(10_000);
    expect(a.connection.sent).toHaveLength(0);

    const b = equipSetup(5_000);
    b.session.equipChoose('ATK');
    b.session.dispose();
    expect(b.clock.timers.size).toBe(0);
  });

  it('um envio antecipado recusado não tenta de novo, mas deixa confirmar na mão', async () => {
    const { connection, session } = equipSetup(1_000);
    connection.acks.push({ ok: false, code: 'INVALID_ACTION', message: 'x' });
    session.equipChoose('ATK');
    await flush();
    expect(connection.sent).toHaveLength(1);
    expect(session.snapshot().equipConfirmed).toBe('none');
    session.equipChoose('DEF');
    expect(connection.sent).toHaveLength(1);
    await session.equipConfirm();
    expect(connection.sent).toHaveLength(2);
  });
});

describe('Session: rascunho do Equipar', () => {
  it('escolher, desfazer e recomeçar', () => {
    const { session } = equipSetup(9_000);
    expect(session.snapshot().equipDraft).toEqual([]);
    session.equipChoose('ATK');
    session.equipChoose('DEF');
    expect(session.snapshot().equipDraft).toEqual(['ATK', 'DEF']);
    session.equipUndo();
    expect(session.snapshot().equipDraft).toEqual(['ATK']);
    session.equipChoose('DEF');
    session.equipReset();
    expect(session.snapshot().equipDraft).toEqual([]);
  });

  it('só aceita destino que leva a uma montagem legal', () => {
    const { session } = equipSetup(9_000, [5]);
    session.equipChoose('DISCARD');
    session.equipChoose('REPLACE_LAST_ATK');
    expect(session.snapshot().equipDraft).toEqual([]);
    session.equipChoose('ATK');
    session.equipChoose('DEF');
    expect(session.snapshot().equipDraft).toEqual(['ATK']);
  });

  it('desfazer e recomeçar sem nada no rascunho não mexem no snapshot', () => {
    const { session } = equipSetup(9_000);
    const before = session.snapshot();
    session.equipUndo();
    session.equipReset();
    expect(session.snapshot()).toBe(before);
  });

  it('sobrevive ao state em que o oponente confirma (mesma época)', () => {
    const { connection, session, view } = equipSetup(9_000);
    session.equipChoose('ATK');
    connection.emitState(
      stateMessage(view, {
        epoch: 7,
        seq: 2,
        deadline: EQUIP_DEADLINE,
        events: [{ type: 'EquipSubmitted', player: 'p2' }],
      }),
    );
    expect(session.snapshot().equipDraft).toEqual(['ATK']);
    expect(session.snapshot().equipConfirmed).toBe('none');
  });

  it('zera quando a época muda', () => {
    const { connection, session, view } = equipSetup(9_000);
    session.equipChoose('ATK');
    connection.emitState(stateMessage(view, { epoch: 8, seq: 2, deadline: EQUIP_DEADLINE }));
    expect(session.snapshot().equipDraft).toEqual([]);
  });

  it('Review Focus 5: sessão nova cujo primeiro state já diz equipSubmitted vira "earlier", sem rascunho', () => {
    const { state } = scenarioAt({ phase: { kind: 'EQUIP' } });
    state.players.find((p) => p.id === 'p1')!.equipSubmitted = true;
    const view = viewFor(state, 'p1');
    expect(view.self.equipSubmitted).toBe(true);
    const { connection, session } = setup();
    connection.emitState(stateMessage(view, { epoch: 7, deadline: EQUIP_DEADLINE }));
    expect(session.snapshot().equipConfirmed).toBe('earlier');
    expect(session.snapshot().equipDraft).toEqual([]);
    session.equipChoose('ATK');
    expect(session.snapshot().equipDraft).toEqual([]);
  });

  it('confirmar manda o rascunho completo, vira "thisPage" e continua assim com o state do servidor', async () => {
    const { connection, session, view } = equipSetup(9_000, [5, 6]);
    session.equipChoose('ATK');
    session.equipChoose('DEF');
    await session.equipConfirm();
    expect(connection.sent).toEqual([
      { type: 'act', id: 'fake-1', action: { type: 'EQUIP', destinations: ['ATK', 'DEF'] }, options: undefined },
    ]);
    expect(session.snapshot().equipConfirmed).toBe('thisPage');
    expect(completeDraft(view, ['ATK', 'DEF'])).toEqual(['ATK', 'DEF']);

    const { state } = scenarioAt({ phase: { kind: 'EQUIP' } });
    state.players.find((p) => p.id === 'p1')!.equipSubmitted = true;
    connection.emitState(stateMessage(viewFor(state, 'p1'), { epoch: 7, seq: 2 }));
    expect(session.snapshot().equipConfirmed).toBe('thisPage');
    session.equipChoose('ATK');
    expect(session.snapshot().equipDraft).toEqual(['ATK', 'DEF']);
  });

  it('confirmar recusado (regra ou limite) libera o rascunho de novo', async () => {
    const { connection, session } = equipSetup(9_000, [5]);
    session.equipChoose('ATK');
    connection.acks.push({ ok: false, code: 'RATE_LIMITED', message: 'x' });
    await session.equipConfirm();
    expect(session.snapshot().equipConfirmed).toBe('none');
    expect(session.snapshot().notice?.kind).toBe('rate');
    await session.equipConfirm();
    expect(session.snapshot().equipConfirmed).toBe('thisPage');
    expect(connection.sent).toHaveLength(2);
  });

  it('equipConfirm fora do Equipar ou já confirmado não manda nada', async () => {
    const { connection, session } = setup();
    await session.equipConfirm();
    connection.emitState(stateMessage(viewAt(), { epoch: 1 }));
    await session.equipConfirm();
    expect(connection.sent).toHaveLength(0);

    const equip = equipSetup(9_000, [5]);
    equip.session.equipChoose('ATK');
    await equip.session.equipConfirm();
    await equip.session.equipConfirm();
    expect(equip.connection.sent).toHaveLength(1);
  });

  it('com outra jogada em voo, confirmar não manda e não marca confirmado', async () => {
    const { connection, session } = equipSetup(9_000, [5]);
    session.equipChoose('ATK');
    const gate = deferredAck();
    connection.acks.push(gate.promise);
    const first = session.play(END_TURN);
    await session.equipConfirm();
    expect(connection.sent).toHaveLength(1);
    expect(session.snapshot().equipConfirmed).toBe('none');
    gate.resolve({ ok: true });
    await first;
  });

  it('um confirmar que falha na rede libera o rascunho', async () => {
    const { connection, session } = equipSetup(9_000, [5]);
    session.equipChoose('ATK');
    connection.act = () => Promise.reject(new Error('boom'));
    await expect(session.equipConfirm()).rejects.toThrow('boom');
    expect(session.snapshot().equipConfirmed).toBe('none');
    expect(session.snapshot().pending).toBe(false);
  });

  it('o envio antecipado que falha na rede não vira erro solto', async () => {
    const { connection, session } = equipSetup(1_000);
    connection.act = () => Promise.reject(new Error('boom'));
    session.equipChoose('ATK');
    await flush();
    expect(session.snapshot().equipConfirmed).toBe('none');
  });
});

// ---------------------------------------------------------------------------------------------
// Marcas

/** `p1` na fase principal, sem e com um J do oponente na mesa. */
const mainView = () => viewAt({});
const withJ = () => viewAt({ opponent: { attackBuffs: ['J'] } });
const jId = () => withJ().opponent.attackBuffs[0]!.id;

describe('Session: marcas (spec §10.5)', () => {
  it('sem jogada voluntária, nada marcado', () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(withJ(), { seq: 1 }));
    expect(session.snapshot().marks).toBe(NO_MARKS);
  });

  it('o J do oponente depois da sua última jogada aparece em marks', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(mainView(), { seq: 1 }));
    await session.play(END_TURN);
    connection.emitState(stateMessage(withJ(), { seq: 2 }));
    expect([...session.snapshot().marks.cards]).toEqual([jId()]);
  });

  it('um passe auto não troca a base', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(mainView(), { seq: 1 }));
    await session.play(END_TURN);
    const reaction = viewAt({ phase: 'K_PLAYED', opponent: { attackBuffs: ['J'] } });
    connection.emitState(stateMessage(reaction, { seq: 2, epoch: 2 }));
    await flush();
    expect(connection.sent.at(-1)).toMatchObject({ action: PASS, options: { auto: true } });
    expect([...session.snapshot().marks.cards]).toEqual([jId()]);
  });

  it('uma jogada voluntária limpa as marcas', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(mainView(), { seq: 1 }));
    await session.play(END_TURN);
    connection.emitState(stateMessage(withJ(), { seq: 2 }));
    expect(session.snapshot().marks.cards.size).toBe(1);
    await session.play(END_TURN);
    expect(session.snapshot().marks).toBe(NO_MARKS);
  });

  it('markSeen apaga a carta e a zona, e repetir não muda nada', async () => {
    const { connection, session } = setup();
    const base = mainView();
    connection.emitState(stateMessage(base, { seq: 1 }));
    await session.play(END_TURN);
    const next: PlayerView = {
      ...withJ(),
      pressure: base.pressure + 1,
      self: { ...withJ().self, hp: base.self.hp - 5 },
    };
    connection.emitState(stateMessage(next, { seq: 2 }));
    expect([...session.snapshot().marks.zones].sort()).toEqual(['pressure', 'selfHp']);

    session.markSeen(jId());
    expect(session.snapshot().marks.cards.size).toBe(0);
    session.markSeen(zoneKey('pressure'));
    expect([...session.snapshot().marks.zones]).toEqual(['selfHp']);
    const settled = session.snapshot();
    session.markSeen(jId());
    expect(session.snapshot()).toBe(settled);
  });

  it('uma jogada voluntária esquece o que já foi visto', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(mainView(), { seq: 1 }));
    await session.play(END_TURN);
    connection.emitState(stateMessage(withJ(), { seq: 2 }));
    session.markSeen(jId());
    connection.emitState(stateMessage(mainView(), { seq: 3 }));
    await session.play(END_TURN);
    connection.emitState(stateMessage(withJ(), { seq: 4 }));
    expect([...session.snapshot().marks.cards]).toEqual([jId()]);
  });

  it('as marcas ficam no mesmo objeto enquanto nada muda', async () => {
    const { connection, session } = setup();
    connection.emitState(stateMessage(mainView(), { seq: 1 }));
    await session.play(END_TURN);
    connection.emitState(stateMessage(withJ(), { seq: 2 }));
    const marks = session.snapshot().marks;
    connection.emitState(stateMessage(withJ(), { seq: 3 }));
    expect(session.snapshot().marks).toBe(marks);
  });

  it('o envio antecipado do Equipar é voluntário: troca a base', () => {
    const { connection, session } = equipSetup(1_000);
    session.equipChoose('ATK');
    connection.emitState(stateMessage(withJ(), { seq: 2, epoch: 8 }));
    expect([...session.snapshot().marks.cards]).toEqual([jId()]);
  });
});
