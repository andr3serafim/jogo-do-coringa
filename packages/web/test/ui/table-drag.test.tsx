// Arrastar na mesa (plano da fatia 5, tarefa 3): a mão na fase principal e a carta da vez do Equipar. A mesa é a `PlayTable`
// sobre uma `Session` de verdade com `FakeConnection`; toda jogada enviada também é conferida contra o motor (`applyAction`). O jsdom
// não tem `elementFromPoint` nem a captura do ponteiro: os testes os simulam, como o `card-drag.test.tsx`. O gesto em si (limiar,
// fantasma, cancelamento) é testado lá; aqui, o que a mesa liga a ele: as zonas, a soltura e o que trava.
import { applyAction, type PlayerView, type SpecialCard } from '@coringa/engine';
import type { PlayerAction, StateMessage } from '@coringa/protocol';
import { act, cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cardDropKey, DROP, equipDropZones, playDropZones } from '../../src/model/drag.ts';
import { legalFor, tablePlays } from '../../src/model/plays.ts';
import { Session } from '../../src/model/session.ts';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { deferredAck, FakeConnection, scenarioAt, stateMessage, type SideSpec, type ViewSpec } from '../fixtures.ts';
import { ATTACK, busy, cleanup as cleanupAnim, emit, MINE, mount as mountAnim, TURN } from './anim-harness.tsx';
import { ATTACK_BUTTON, roomMessage, seriousViolations } from './support.tsx';

const seatOf = (playerId: 'p1' | 'p2', nickname: string) => ({
  playerId,
  nickname,
  connected: true,
  ready: true,
  wantsRematch: false,
});

/** O rascunho da Peleja: a minha vez, com a mão K, A, Q; Duda tem um J, dois Q e um K nos buffs e na Guarda (todos alvos possíveis). */
const DRAFT: ViewSpec = {
  round: 7,
  pressure: 1,
  self: {
    hp: 187,
    hand: ['K', 'A', 'Q'],
    attackRow: [8, 4, 10, 7, 9],
    defenseRow: [3, 6, 9, 5],
    attackBuffs: ['J', 'WILD'],
    defenseBuffs: ['Q'],
    guard: ['K'],
  },
  opponent: {
    hp: 214,
    hand: ['A', 'K', 'WILD'],
    attackRow: [6, 9, 3, 10],
    defenseRow: [5, 7, 2],
    attackBuffs: ['J'],
    defenseBuffs: ['Q', 'Q'],
    guard: ['K'],
  },
  graveyard: [3, 5, 8],
};

const withHand = (hand: SideSpec['hand'], extra: Partial<ViewSpec> = {}): ViewSpec => ({
  ...DRAFT,
  ...extra,
  self: { ...DRAFT.self, ...extra.self, hand },
});

/** Rodada de Equipar: 3 numéricas minhas (7, 7, 3), as duas fileiras com vaga. */
const EQUIP: ViewSpec = {
  ...DRAFT,
  phase: { kind: 'EQUIP' },
  self: { ...DRAFT.self, pending: [7, 7, 3] },
  opponent: { ...DRAFT.opponent, pending: [5, 2, 9] },
};

/** As duas fileiras cheias: trocar a última de cada uma ou descartar. */
const FULL: ViewSpec = {
  ...EQUIP,
  self: { ...EQUIP.self, attackRow: [8, 4, 10, 7, 9, 2, 6], defenseRow: [3, 6, 9, 5, 2, 4, 8] },
};

/** O Equipar da mesa dos testes de animação (a que o palco toca): para o teste das batidas em curso. */
const EQUIP_ANIM: ViewSpec = { ...MINE, phase: { kind: 'EQUIP' }, self: { ...MINE.self, pending: [7, 7, 3] }, opponent: { ...MINE.opponent, pending: [5, 2, 9] } };

interface MountOptions {
  state?: Partial<Omit<StateMessage, 't' | 'view'>>;
}

const sessions: Session[] = [];

function mount(spec: ViewSpec = DRAFT, options: MountOptions = {}) {
  const { state: game, view } = scenarioAt(spec);
  const me = spec.me ?? 'p1';
  const room = roomMessage({
    status: 'PLAYING',
    seats: me === 'p1' ? [seatOf('p1', 'André'), seatOf('p2', 'Duda')] : [seatOf('p1', 'Duda'), seatOf('p2', 'André')],
    score: { p1: 0, p2: 0, draws: 0 },
  });
  const connection = new FakeConnection({ playerId: me, room, state: stateMessage(view, options.state), now: 0 });
  const session = new Session(connection, { now: () => 0, setTimer: () => 0, clearTimer: () => undefined });
  sessions.push(session);
  const user = userEvent.setup();
  const rendered = render(<PlayTable session={session} />);
  return { game, view, me, connection, session, user, ...rendered };
}

type Mounted = ReturnType<typeof mount>;

// ---------------------------------------------------------------------------------------------
// O que o jsdom não faz: o ponto sob o ponteiro e a captura dele.

let hit: Element | null = null;
const proto = HTMLElement.prototype as unknown as Record<string, unknown>;

beforeEach(() => {
  hit = null;
  document.elementFromPoint = vi.fn(() => hit);
  proto.setPointerCapture = vi.fn();
  proto.releasePointerCapture = vi.fn();
  proto.hasPointerCapture = vi.fn(() => true);
});

afterEach(() => {
  for (const session of sessions.splice(0)) session.dispose();
  cleanupAnim();
  vi.restoreAllMocks();
  delete proto.setPointerCapture;
  delete proto.releasePointerCapture;
  delete proto.hasPointerCapture;
  delete (document as unknown as Record<string, unknown>).elementFromPoint;
});

const POINTER = { pointerId: 1, isPrimary: true, button: 0 };
const press = (el: Element, x = 10, y = 10) => fireEvent.pointerDown(el, { ...POINTER, clientX: x, clientY: y });
const moveTo = (el: Element, x: number, y: number) => fireEvent.pointerMove(el, { ...POINTER, clientX: x, clientY: y });
const release = (el: Element, x = 300, y = 300) => fireEvent.pointerUp(el, { ...POINTER, clientX: x, clientY: y });

/** Pega `el`, leva o ponteiro até longe (sobre `target`, ou sobre nada) e solta. */
function dragTo(el: Element, target: Element | null) {
  press(el);
  hit = target;
  moveTo(el, 300, 300);
  release(el);
}

/** A única zona com essa chave na mesa. */
function zone(key: string): HTMLElement {
  const found = document.querySelectorAll<HTMLElement>(`[data-soltar="${key}"]`);
  expect(found, `zona ${key}`).toHaveLength(1);
  return found[0]!;
}

const ghost = () => document.querySelector('[data-fantasma]');
const active = () => [...document.querySelectorAll('[data-soltar-ativo]')].map((el) => el.getAttribute('data-soltar'));

const bar = () => screen.getByRole('region', { name: 'Ações' });
const inBar = () => within(bar());
const handList = () => within(screen.getByRole('list', { name: 'Sua mão' }));
const equipPanel = () => screen.getByRole('region', { name: 'Equipar' });
const inEquip = () => within(equipPanel());

const HAND_NAME = {
  K: /^K, Guarda, de /,
  J: /^J, Buff de ataque, de /,
  Q: /^Q, Buff de defesa, de /,
  A: /^A, Armadilha, de /,
  WILD: /^Coringa Selvagem/,
} as const;
const handCard = (kind: keyof typeof HAND_NAME, index = 0) => handList().getAllByRole('button', { name: HAND_NAME[kind] })[index]!;
const handCards = (view: PlayerView, kind: SpecialCard['kind']) => view.self.hand.filter((c) => c.kind === kind);

/** A carta da vez do Equipar (a grande, no painel). */
const equipCard = () => equipPanel().querySelector<HTMLElement>('[data-card-id]')!;

const acts = (m: Pick<Mounted, 'connection'>) => m.connection.sent.flatMap((s) => (s.type === 'act' ? [s.action] : []));

/** A jogada enviada, que também precisa ser aceita pelo motor (spec §1.5, passo 2). */
function sentAction(m: Mounted): PlayerAction {
  const sent = acts(m);
  expect(sent).toHaveLength(1);
  const action = sent[0]!;
  expect(applyAction(m.game, m.me, action).ok).toBe(true);
  return action;
}


// ---------------------------------------------------------------------------------------------

describe('arrastar da mão: a fase principal', () => {
  it('um K até a Guarda manda PLAY_K', () => {
    const m = mount();
    dragTo(handCard('K'), zone(DROP.guard));
    expect(sentAction(m)).toEqual({ type: 'PLAY_K', cardIds: [handCards(m.view, 'K')[0]!.id] });
  });

  it('um J até os Buffs de ataque manda PLAY_J', () => {
    const m = mount(withHand(['J']));
    dragTo(handCard('J'), zone(DROP.attackBuffs));
    expect(sentAction(m)).toEqual({ type: 'PLAY_J', cardId: handCards(m.view, 'J')[0]!.id });
  });

  it('um Q até os Buffs de defesa manda PLAY_Q', () => {
    const m = mount();
    dragTo(handCard('Q'), zone(DROP.defenseBuffs));
    expect(sentAction(m)).toEqual({ type: 'PLAY_Q', cardId: handCards(m.view, 'Q')[0]!.id });
  });

  it('um A até o J do oponente manda TRAP com o alvo', () => {
    const m = mount();
    const target = m.view.opponent.attackBuffs[0]!;
    dragTo(handCard('A'), zone(cardDropKey(target.id)));
    expect(sentAction(m)).toEqual({ type: 'TRAP', cardId: handCards(m.view, 'A')[0]!.id, targetId: target.id });
  });

  it('o A até a Guarda do oponente (um alvo) também manda TRAP', () => {
    const m = mount();
    const target = m.view.opponent.guard[0]!;
    dragTo(handCard('A'), zone(cardDropKey(target.id)));
    expect(sentAction(m)).toMatchObject({ type: 'TRAP', targetId: target.id });
  });

  it('o Selvagem até os Buffs de ataque manda PLAY_J como J (uma jogada só nessa zona)', () => {
    const m = mount(withHand(['K', 'WILD']));
    dragTo(handCard('WILD'), zone(DROP.attackBuffs));
    expect(sentAction(m)).toEqual({ type: 'PLAY_J', cardId: handCards(m.view, 'WILD')[0]!.id });
  });

  it('com dois K na mão, soltar na Guarda abre a escolha (1 ou 2 K) e não manda nada', async () => {
    const m = mount(withHand(['K', 'K', 'Q']));
    const [first, second] = handCards(m.view, 'K') as [SpecialCard, SpecialCard];
    dragTo(handCard('K', 1), zone(DROP.guard));
    expect(acts(m)).toEqual([]);
    expect(handCard('K', 1)).toHaveAttribute('aria-pressed', 'true');
    const plays = within(inBar().getByRole('list', { name: 'Jogadas' })).getAllByRole('button');
    expect(plays.map((b) => b.textContent)).toEqual(['Pôr 1 K', 'Pôr 2 K']);
    await m.user.click(inBar().getByRole('button', { name: 'Pôr 2 K' }));
    expect(sentAction(m)).toEqual({ type: 'PLAY_K', cardIds: [second.id, first.id] });
  });

  it('o Selvagem até um alvo de Armadilha e de Sacrifício abre a escolha na barra e não manda nada', () => {
    const m = mount(withHand(['K', 'WILD']));
    const target = m.view.opponent.attackBuffs[0]!;
    dragTo(handCard('WILD'), zone(cardDropKey(target.id)));
    expect(acts(m)).toEqual([]);
    expect(handCard('WILD')).toHaveAttribute('aria-pressed', 'true');
    const plays = within(inBar().getByRole('list', { name: 'Jogadas' })).getAllByRole('button');
    expect(plays.map((b) => b.textContent)).toEqual(expect.arrayContaining(['como A: Armadilha', 'como J: Sacrifício']));
  });

  it('soltar a carta que já estava escolhida numa zona com duas jogadas mantém a escolha (não alterna)', async () => {
    const m = mount(withHand(['K', 'K', 'Q']));
    await m.user.click(handCard('K', 1));
    expect(handCard('K', 1)).toHaveAttribute('aria-pressed', 'true');
    dragTo(handCard('K', 1), zone(DROP.guard));
    expect(handCard('K', 1)).toHaveAttribute('aria-pressed', 'true');
    expect(inBar().getByRole('button', { name: 'Pôr 2 K' })).toBeInTheDocument();
  });

  it('soltar fora de qualquer zona não manda nada nem escolhe a carta', () => {
    const m = mount();
    dragTo(handCard('K'), null);
    dragTo(handCard('K'), screen.getByRole('main'));
    expect(acts(m)).toEqual([]);
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'false');
    expect(ghost()).toBeNull();
  });

  it('soltar sem zona de volta sobre a própria carta é um toque: escolhe a carta, como o toque (e de novo desfaz)', () => {
    const m = mount();
    dragTo(handCard('K'), handCard('K'));
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'true');
    expect(inBar().getByRole('button', { name: 'Pôr na Guarda' })).toBeInTheDocument();
    expect(ghost()).toBeNull();
    dragTo(handCard('K'), handCard('K'));
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'false');
    expect(acts(m)).toEqual([]);
  });

  it('soltar de volta sobre outra carta da mão (que não é zona) não escolhe nada', () => {
    const m = mount();
    dragTo(handCard('K'), handCard('Q'));
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'false');
    expect(handCard('Q')).toHaveAttribute('aria-pressed', 'false');
    expect(acts(m)).toEqual([]);
  });

  it('soltar numa zona onde a carta não vale (o K nos Buffs de ataque, a mão do oponente) não manda nada', () => {
    const m = mount();
    dragTo(handCard('K'), zone(DROP.attackBuffs));
    dragTo(handCard('K'), zone(DROP.graveyard));
    expect(acts(m)).toEqual([]);
  });

  it('enquanto a carta está no ar: o fantasma, as zonas dela marcadas e a carta de origem esmaecida; tudo some na soltura', () => {
    mount(withHand(['K', 'A', 'Q']));
    const card = handCard('K');
    press(card);
    moveTo(card, 80, 80);
    expect(ghost()).not.toBeNull();
    expect(active()).toEqual([DROP.guard]);
    expect(card.closest('li')).toHaveStyle({ opacity: '0.4' });
    release(card, 80, 80);
    expect(ghost()).toBeNull();
    expect(active()).toEqual([]);
    expect(handCard('K').closest('li')).not.toHaveStyle({ opacity: '0.4' });
  });

  it('o A marca como zonas os quatro alvos do oponente, e a Q, os Buffs de defesa e os Q do oponente (Sacrifício)', () => {
    const m = mount();
    const a = handCard('A');
    press(a);
    moveTo(a, 80, 80);
    const { opponent } = m.view;
    expect(new Set(active())).toEqual(
      new Set([...opponent.attackBuffs, ...opponent.defenseBuffs, ...opponent.guard].map((c) => cardDropKey(c.id))),
    );
    release(a, 80, 80);
    const q = handCard('Q');
    press(q);
    moveTo(q, 80, 80);
    expect(new Set(active())).toEqual(new Set([DROP.defenseBuffs, ...opponent.defenseBuffs.map((c) => cardDropKey(c.id))]));
    release(q, 80, 80);
  });

  it('uma carta sem jogada (o J com os 4 J já postos) não arrasta', () => {
    const m = mount(withHand(['J'], { self: { ...DRAFT.self, attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { ...DRAFT.opponent, attackBuffs: [] } }));
    const j = handCard('J');
    press(j);
    moveTo(j, 80, 80);
    expect(ghost()).toBeNull();
    release(j, 80, 80);
    expect(acts(m)).toEqual([]);
  });

  it('a jogada que deixou de valer no meio do arrasto (um state novo) não é mandada, e o fantasma some', () => {
    const m = mount(withHand(['J']));
    const j = handCard('J');
    press(j);
    hit = zone(DROP.attackBuffs);
    moveTo(j, 80, 80);
    expect(ghost()).not.toBeNull();
    // Chega um `state` sem eventos (nada para tocar) em que os 4 J já estão postos: o J segue na mão, sem jogada.
    const stale = scenarioAt(withHand(['J'], { self: { ...DRAFT.self, attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { ...DRAFT.opponent, attackBuffs: [] } })).view;
    act(() => m.connection.emitState(stateMessage(stale, { seq: 2, epoch: 2 })));
    expect(ghost()).toBeNull();
    release(j, 80, 80);
    expect(acts(m)).toEqual([]);
  });

  it('um state novo que tira a carta da mão no meio do arrasto não deixa fantasma nem manda nada', () => {
    const m = mount(withHand(['J', 'Q']));
    const j = handCard('J');
    press(j);
    hit = zone(DROP.attackBuffs);
    moveTo(j, 80, 80);
    const gone = scenarioAt(withHand(['Q'])).view;
    act(() => m.connection.emitState(stateMessage(gone, { seq: 2, epoch: 2 })));
    expect(ghost()).toBeNull();
    expect(active()).toEqual([]);
    // O elemento saiu da página: o ponteiro solta em outro lugar.
    release(document.body, 80, 80);
    expect(acts(m)).toEqual([]);
  });
});

describe('arrastar da mão: o que trava', () => {
  it('com as batidas em curso a mão não arrasta, e o toque que pula as batidas não vira arrasto', () => {
    const m = mountAnim(MINE);
    const card = () => handList().getByRole('button', { name: HAND_NAME.K });
    emit(m, MINE, [TURN, ATTACK]);
    expect(busy(m.container)).toBe(true);
    // O dedo que pula as batidas e segue arrastando: o gesto vale com o `enabled` de antes do pulo.
    press(card());
    expect(busy(m.container)).toBe(false);
    hit = zone(DROP.guard);
    moveTo(card(), 80, 80);
    expect(ghost()).toBeNull();
    release(card(), 80, 80);
    expect(m.connection.sent).toEqual([]);
    // O gesto seguinte, com a mesa solta, arrasta.
    press(card());
    moveTo(card(), 80, 80);
    expect(ghost()).not.toBeNull();
    release(card(), 80, 80);
    expect(m.connection.sent).toHaveLength(1);
  });

  it('com a jogada em voo a mão não arrasta', async () => {
    const m = mount();
    const ack = deferredAck();
    m.connection.acks = [ack.promise];
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(acts(m)).toHaveLength(1);
    const card = handCard('K');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    press(card);
    hit = zone(DROP.guard);
    moveTo(card, 80, 80);
    expect(ghost()).toBeNull();
    release(card, 80, 80);
    expect(acts(m)).toHaveLength(1);
    await act(async () => ack.resolve({ ok: true, seq: 9 }));
  });

  it('a jogada em voo no meio do arrasto cancela: o fantasma some e a soltura não manda nada', async () => {
    const m = mount();
    const ack = deferredAck();
    m.connection.acks = [ack.promise];
    const card = handCard('K');
    press(card);
    hit = zone(DROP.guard);
    moveTo(card, 80, 80);
    expect(ghost()).not.toBeNull();
    // Um atalho do teclado manda o ataque enquanto o dedo está no ar (a mesa trava).
    await act(async () => {
      void m.session.play({ type: 'DECLARE_ATTACK' });
    });
    expect(ghost()).toBeNull();
    release(card, 80, 80);
    expect(acts(m)).toEqual([{ type: 'DECLARE_ATTACK' }]);
    await act(async () => ack.resolve({ ok: true, seq: 9 }));
  });

  it('na janela de reação (a mesma barra e a mesma lista legal) a Armadilha também arrasta, e só até o que o gatilho permite', () => {
    const m = mount({ ...DRAFT, phase: 'K_PLAYED' });
    const guard = m.view.opponent.guard[0]!;
    const a = handCard('A');
    press(a);
    moveTo(a, 80, 80);
    // Com o K posto, a Armadilha só mira a Guarda: é a única carta-alvo marcada.
    expect(active()).toEqual([cardDropKey(guard.id)]);
    release(a, 80, 80);
    expect(acts(m)).toEqual([]);
    dragTo(handCard('A'), zone(cardDropKey(guard.id)));
    expect(sentAction(m)).toMatchObject({ type: 'TRAP', targetId: guard.id });
  });

  it('depois do Passar na janela de reação a mão não arrasta mais (o servidor recusaria qualquer jogada)', async () => {
    const m = mount({ ...DRAFT, phase: 'K_PLAYED' });
    const guard = m.view.opponent.guard[0]!;
    await m.user.click(inBar().getByRole('button', { name: 'Passar' }));
    expect(acts(m)).toEqual([{ type: 'PASS' }]);
    // A mão deixou de ser botão (a escolha também fecha); a Armadilha estava válida até o passe.
    expect(handList().queryAllByRole('button')).toHaveLength(0);
    const trap = handList().getAllByRole('img').find((el) => /^A, Armadilha/.test(el.getAttribute('aria-label') ?? ''))!;
    expect(trap.style.touchAction).toBe('');
    expect(trap).not.toHaveClass('cursor-grab');
    press(trap);
    hit = zone(cardDropKey(guard.id));
    moveTo(trap, 80, 80);
    expect(ghost()).toBeNull();
    expect(active()).toEqual([]);
    release(trap, 80, 80);
    expect(acts(m)).toEqual([{ type: 'PASS' }]);
  });

  it('com a conexão caída (reconectando) a mão não arrasta, e o toque não escolhe', () => {
    const m = mount();
    act(() => m.connection.emitClosed(1006));
    expect(m.session.snapshot().status).toBe('reconnecting');
    const card = handCard('K');
    expect(card).toHaveAttribute('aria-disabled', 'true');
    expect(card.style.touchAction).toBe('');
    expect(card).not.toHaveClass('cursor-grab');
    press(card);
    hit = zone(DROP.guard);
    moveTo(card, 80, 80);
    expect(ghost()).toBeNull();
    expect(active()).toEqual([]);
    release(card, 80, 80);
    expect(acts(m)).toEqual([]);
    expect(card).toHaveAttribute('aria-pressed', 'false');
  });

  it('a conexão que cai no meio do arrasto cancela: o fantasma some e a soltura não manda nada', () => {
    const m = mount();
    const card = handCard('K');
    press(card);
    hit = zone(DROP.guard);
    moveTo(card, 80, 80);
    expect(ghost()).not.toBeNull();
    act(() => m.connection.emitClosed(1006));
    expect(ghost()).toBeNull();
    expect(active()).toEqual([]);
    release(card, 80, 80);
    expect(acts(m)).toEqual([]);
  });

  it('fora da fase de jogar (a vez do oponente) a mão não é botão e não arrasta', () => {
    const m = mount({ ...DRAFT, phase: 'WAITING' });
    const card = handList().getAllByRole('img').find((el) => /^K, Guarda/.test(el.getAttribute('aria-label') ?? ''))!;
    press(card);
    hit = document.querySelector('[data-soltar]');
    moveTo(card, 80, 80);
    expect(ghost()).toBeNull();
    release(card, 80, 80);
    expect(acts(m)).toEqual([]);
  });
});

describe('os botões e o teclado seguem iguais (WCAG 2.5.7): fase principal', () => {
  it('toque: tocar a carta escolhe, e o botão da barra manda a jogada', async () => {
    const m = mount();
    await m.user.click(handCard('K'));
    // O clique do toque é engolido pelo gesto: a carta fica escolhida, e não alternada duas vezes.
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'true');
    await m.user.click(inBar().getByRole('button', { name: 'Pôr na Guarda' }));
    expect(sentAction(m)).toEqual({ type: 'PLAY_K', cardIds: [handCards(m.view, 'K')[0]!.id] });
  });

  it('toque na carta escolhida a desfaz', async () => {
    const m = mount();
    await m.user.click(handCard('A'));
    await m.user.click(handCard('A'));
    expect(handCard('A')).toHaveAttribute('aria-pressed', 'false');
    expect(acts(m)).toEqual([]);
  });

  it('teclado: Enter na carta escolhe, e Enter no botão manda a jogada', async () => {
    const m = mount();
    handCard('K').focus();
    await m.user.keyboard('{Enter}');
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'true');
    expect(inBar().getByRole('button', { name: 'Pôr na Guarda' })).toHaveFocus();
    await m.user.keyboard('{Enter}');
    expect(sentAction(m)).toEqual({ type: 'PLAY_K', cardIds: [handCards(m.view, 'K')[0]!.id] });
  });

  it('teclado: Espaço na carta também escolhe', async () => {
    const m = mount();
    handCard('Q').focus();
    await m.user.keyboard(' ');
    expect(handCard('Q')).toHaveAttribute('aria-pressed', 'true');
    expect(acts(m)).toEqual([]);
  });

  it('o leitor de tela (click sem ponteiro) escolhe a carta', () => {
    mount();
    fireEvent.click(handCard('K'));
    expect(handCard('K')).toHaveAttribute('aria-pressed', 'true');
  });

  it('o Atacar segue pelo botão', async () => {
    const m = mount();
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(sentAction(m)).toEqual({ type: 'DECLARE_ATTACK' });
  });

  it('a carta da mão que arrasta mostra a mãozinha (cursor-grab); a que não tem jogada segue com cursor-pointer', () => {
    mount(withHand(['K', 'J'], { self: { ...DRAFT.self, attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { ...DRAFT.opponent, attackBuffs: [] } }));
    expect(handCard('K')).toHaveClass('cursor-grab');
    expect(handCard('K')).not.toHaveClass('cursor-pointer');
    expect(handCard('J')).toHaveClass('cursor-pointer');
    expect(handCard('J')).not.toHaveClass('cursor-grab');
  });

  it('travada (jogada em voo), a carta não mostra a mãozinha: é a espera', async () => {
    const m = mount();
    expect(handCard('K')).toHaveClass('cursor-grab');
    const ack = deferredAck();
    m.connection.acks = [ack.promise];
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(handCard('K')).not.toHaveClass('cursor-grab');
    expect(handCard('K')).not.toHaveClass('cursor-pointer');
    expect(handCard('K')).toHaveClass('cursor-wait');
    await act(async () => ack.resolve({ ok: true, seq: 9 }));
  });

  it('a carta arrastável tem touch-action: none; a que não tem jogada, não', () => {
    mount(withHand(['K', 'J'], { self: { ...DRAFT.self, attackBuffs: ['J', 'J', 'J', 'J'] }, opponent: { ...DRAFT.opponent, attackBuffs: [] } }));
    expect(handCard('K').style.touchAction).toBe('none');
    expect(handCard('J').style.touchAction).toBe('');
  });
});

describe('arrastar o Equipar', () => {
  it('a carta da vez até a Defesa escolhe DEF, e a próxima carta vira a da vez', () => {
    const m = mount(EQUIP);
    expect(inEquip().getByText('Carta 1 de 3')).toBeInTheDocument();
    const first = equipCard().getAttribute('data-card-id');
    dragTo(equipCard(), zone(DROP.defenseRow));
    expect(inEquip().getByText('Carta 2 de 3')).toBeInTheDocument();
    expect(equipCard().getAttribute('data-card-id')).not.toBe(first);
    expect(m.session.snapshot().equipDraft).toEqual(['DEF']);
    // A carta posta já está na fileira de Defesa, como rascunho.
    expect(document.querySelectorAll('[data-rascunho]')).toHaveLength(1);
  });

  it('as três cartas pelo arrasto e o Confirmar mandam EQUIP com esses destinos', async () => {
    const m = mount(EQUIP);
    dragTo(equipCard(), zone(DROP.attackRow));
    dragTo(equipCard(), zone(DROP.defenseRow));
    dragTo(equipCard(), zone(DROP.defenseRow));
    expect(inEquip().getByText('Tudo no lugar: confira a montagem e confirme.')).toBeInTheDocument();
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(sentAction(m)).toEqual({ type: 'EQUIP', destinations: ['ATK', 'DEF', 'DEF'] });
  });

  it('com as fileiras cheias, até a última carta troca e até o cemitério descarta', async () => {
    const m = mount(FULL);
    dragTo(equipCard(), zone(DROP.lastAttack));
    expect(m.session.snapshot().equipDraft).toEqual(['REPLACE_LAST_ATK']);
    dragTo(equipCard(), zone(DROP.graveyard));
    expect(m.session.snapshot().equipDraft).toEqual(['REPLACE_LAST_ATK', 'DISCARD']);
    dragTo(equipCard(), zone(DROP.lastDefense));
    expect(m.session.snapshot().equipDraft).toEqual(['REPLACE_LAST_ATK', 'DISCARD', 'REPLACE_LAST_DEF']);
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(sentAction(m)).toEqual({ type: 'EQUIP', destinations: ['REPLACE_LAST_ATK', 'DISCARD', 'REPLACE_LAST_DEF'] });
  });

  it('com vaga, soltar em cima da última carta da fileira vale a fileira (a zona de dentro não vale e não esconde a de fora)', () => {
    const m = mount(EQUIP);
    const last = zone(DROP.lastDefense).querySelector('[data-card-id]')!;
    dragTo(equipCard(), last);
    expect(m.session.snapshot().equipDraft).toEqual(['DEF']);
  });

  it('as zonas marcadas no ar são só as que o motor deixa: com vaga, as duas fileiras; cheias, as últimas e o cemitério', () => {
    mount(EQUIP);
    press(equipCard());
    moveTo(equipCard(), 80, 80);
    expect(new Set(active())).toEqual(new Set([DROP.attackRow, DROP.defenseRow]));
    release(equipCard(), 80, 80);
  });

  it('com as fileiras cheias, as zonas marcadas são as últimas cartas e o cemitério', () => {
    mount(FULL);
    press(equipCard());
    moveTo(equipCard(), 80, 80);
    expect(new Set(active())).toEqual(new Set([DROP.lastAttack, DROP.lastDefense, DROP.graveyard]));
    expect(equipCard().className).toContain('opacity-40');
    release(equipCard(), 80, 80);
  });

  it('soltar fora de um destino não escolhe nada', () => {
    const m = mount(EQUIP);
    dragTo(equipCard(), null);
    dragTo(equipCard(), zone(DROP.graveyard));
    dragTo(equipCard(), zone(DROP.guard));
    expect(m.session.snapshot().equipDraft).toEqual([]);
    expect(inEquip().getByText('Carta 1 de 3')).toBeInTheDocument();
  });

  it('tocar a carta da vez não faz nada', async () => {
    const m = mount(EQUIP);
    await m.user.click(equipCard());
    expect(m.session.snapshot().equipDraft).toEqual([]);
  });

  it('com as batidas em curso a carta do Equipar não arrasta', () => {
    const m = mountAnim(EQUIP_ANIM);
    emit(m, EQUIP_ANIM, [TURN, ATTACK]);
    expect(busy(m.container)).toBe(true);
    // O ponteiro desce no pulo das batidas e segue: não vira arrasto.
    const card = equipCard();
    press(card);
    hit = zone(DROP.defenseRow);
    moveTo(card, 80, 80);
    expect(ghost()).toBeNull();
    release(card, 80, 80);
    expect(m.session.snapshot().equipDraft).toEqual([]);
  });

  it('a carta do Equipar mostra a mãozinha; travada (conexão caída), não', () => {
    const m = mount(EQUIP);
    expect(equipCard()).toHaveClass('cursor-grab');
    act(() => m.connection.emitClosed(1006));
    expect(equipCard()).not.toHaveClass('cursor-grab');
    expect(equipCard().style.touchAction).toBe('');
  });

  it('com a conexão caída a carta do Equipar não arrasta', () => {
    const m = mount(EQUIP);
    act(() => m.connection.emitClosed(1006));
    const card = equipCard();
    press(card);
    hit = zone(DROP.defenseRow);
    moveTo(card, 80, 80);
    expect(ghost()).toBeNull();
    release(card, 80, 80);
    expect(m.session.snapshot().equipDraft).toEqual([]);
  });

  it('soltar a carta do Equipar de volta sobre ela mesma é um toque, e o toque não faz nada', () => {
    const m = mount(EQUIP);
    dragTo(equipCard(), equipCard());
    expect(m.session.snapshot().equipDraft).toEqual([]);
    expect(inEquip().getByText('Carta 1 de 3')).toBeInTheDocument();
  });

  it('a carta do Equipar tem touch-action: none', () => {
    mount(EQUIP);
    expect(equipCard().style.touchAction).toBe('none');
  });

  it('depois de confirmar, não há carta para arrastar', async () => {
    const m = mount(EQUIP);
    for (const key of [DROP.attackRow, DROP.attackRow, DROP.defenseRow]) dragTo(equipCard(), zone(key));
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(equipPanel().querySelector('[data-card-id]')).toBeNull();
  });
});

describe('os botões e o teclado seguem iguais (WCAG 2.5.7): Equipar', () => {
  it('toque: o botão do destino escolhe', async () => {
    const m = mount(EQUIP);
    await m.user.click(inEquip().getByRole('button', { name: 'Fileira de Defesa' }));
    expect(m.session.snapshot().equipDraft).toEqual(['DEF']);
    expect(inEquip().getByText('Carta 2 de 3')).toBeInTheDocument();
  });

  it('teclado: Enter no destino escolhe, e o foco vai ao primeiro destino da carta seguinte', async () => {
    const m = mount(EQUIP);
    inEquip().getByRole('button', { name: 'Fileira de Ataque' }).focus();
    await m.user.keyboard('{Enter}');
    expect(m.session.snapshot().equipDraft).toEqual(['ATK']);
    expect(inEquip().getByRole('button', { name: 'Fileira de Ataque' })).toHaveFocus();
    await m.user.keyboard('{Enter}');
    expect(m.session.snapshot().equipDraft).toEqual(['ATK', 'ATK']);
  });

  it('o arrasto e o botão se misturam: uma carta por cada caminho', async () => {
    const m = mount(EQUIP);
    dragTo(equipCard(), zone(DROP.defenseRow));
    await m.user.click(inEquip().getByRole('button', { name: 'Fileira de Ataque' }));
    dragTo(equipCard(), zone(DROP.attackRow));
    expect(m.session.snapshot().equipDraft).toEqual(['DEF', 'ATK', 'ATK']);
  });
});

describe('as zonas da mesa (data-soltar) e as chaves do modelo', () => {
  const rendered = () => [...document.querySelectorAll('[data-soltar]')].map((el) => el.getAttribute('data-soltar')!);

  it('cada chave que playDropZones devolve para a mão existe na mesa, e nenhuma zona repete a chave', () => {
    const { view } = mount(withHand(['K', 'K', 'J', 'Q', 'A', 'WILD']));
    const plays = tablePlays(view, legalFor(view));
    const keys = new Set(view.self.hand.flatMap((card) => [...playDropZones(card.id, plays).keys()]));
    // Todos os papéis da mão têm zona: nada ficou de fora do que se conferiu.
    expect(keys).toContain(DROP.attackBuffs);
    expect(keys).toContain(DROP.defenseBuffs);
    expect(keys).toContain(DROP.guard);
    expect([...keys].filter((key) => key.startsWith('carta:')).length).toBeGreaterThan(3);
    const found = rendered();
    for (const key of keys) expect(found, key).toContain(key);
    expect(new Set(found).size).toBe(found.length);
  });

  it('toda zona da mesa é uma chave que o modelo conhece (as fixas, ou uma carta-alvo do oponente)', () => {
    const { view } = mount(withHand(['K', 'J', 'Q', 'A', 'WILD']));
    const targets = [...view.opponent.attackBuffs, ...view.opponent.defenseBuffs, ...view.opponent.guard].map((c) => cardDropKey(c.id));
    const known = new Set<string>([...Object.values(DROP), ...targets]);
    for (const key of rendered()) expect(known, key).toContain(key);
    // E o contrário, na mesa cheia: todas as fixas e todos os alvos têm onde cair.
    expect(new Set(rendered())).toEqual(known);
  });

  it('as zonas do oponente são só os alvos possíveis: a Guarda e os buffs dele, nunca a mão nem as fileiras nem o Reflect', () => {
    const { view } = mount({ ...DRAFT, opponent: { ...DRAFT.opponent, reflect: true } });
    const field = screen.getByRole('region', { name: 'Campo de Duda' });
    const inField = [...field.querySelectorAll('[data-soltar]')].map((el) => el.getAttribute('data-soltar'));
    const targets = [...view.opponent.attackBuffs, ...view.opponent.defenseBuffs, ...view.opponent.guard].map((c) => cardDropKey(c.id));
    expect(new Set(inField)).toEqual(new Set(targets));
  });

  // Cada chave na zona que se vê: trocar duas chaves de lugar (os buffs de ataque pelos de defesa, a Guarda pela fileira) reprova.
  const mine = () => within(screen.getByRole('region', { name: 'Seu campo' }));
  const theirs = () => within(screen.getByRole('region', { name: 'Campo de Duda' }));
  const keyOf = (el: HTMLElement) => el.closest('[data-soltar]')?.getAttribute('data-soltar') ?? null;

  it('a Guarda e os buffs do seu campo levam as chaves delas', () => {
    mount();
    expect(keyOf(mine().getByRole('list', { name: 'Guarda' }))).toBe(DROP.guard);
    expect(keyOf(mine().getByRole('list', { name: 'Buffs de ataque' }))).toBe(DROP.attackBuffs);
    expect(keyOf(mine().getByRole('list', { name: 'Buffs de defesa' }))).toBe(DROP.defenseBuffs);
    // O título da zona está dentro dela: a zona que se vê é a que o jogador apontaria.
    expect(zone(DROP.attackBuffs)).toHaveTextContent('Buffs de ataque');
    expect(zone(DROP.defenseBuffs)).toHaveTextContent('Buffs de defesa');
    expect(zone(DROP.guard)).toHaveTextContent('Guarda');
  });

  it('as suas fileiras levam fileira:* e a última carta de cada uma leva ultima:*, na fileira certa', () => {
    const { view } = mount();
    const attackRow = screen.getByRole('group', { name: 'Sua fileira de ataque' });
    const defenseRow = screen.getByRole('group', { name: 'Sua fileira de defesa' });
    expect(keyOf(attackRow)).toBe(DROP.attackRow);
    expect(keyOf(defenseRow)).toBe(DROP.defenseRow);
    const lastAttack = view.self.attackRow.at(-1)!;
    const lastDefense = view.self.defenseRow.at(-1)!;
    expect(zone(DROP.lastAttack).querySelector(`[data-card-id="${lastAttack.id}"]`)).not.toBeNull();
    expect(zone(DROP.lastDefense).querySelector(`[data-card-id="${lastDefense.id}"]`)).not.toBeNull();
    expect(attackRow).toContainElement(zone(DROP.lastAttack));
    expect(defenseRow).toContainElement(zone(DROP.lastDefense));
    // As fileiras do oponente não são destino de nada.
    expect(keyOf(screen.getByRole('group', { name: 'Fileira de ataque de Duda' }))).toBeNull();
    expect(keyOf(screen.getByRole('group', { name: 'Fileira de defesa de Duda' }))).toBeNull();
  });

  it('o cemitério leva cemiterio, no botão que abre o diálogo e na caixa dele', () => {
    mount();
    const graveyard = screen.getByRole('button', { name: /^Cemitério / });
    expect(keyOf(graveyard)).toBe(DROP.graveyard);
    expect(zone(DROP.graveyard)).toContainElement(graveyard);
  });

  it('cada carta-alvo do oponente leva a chave carta:<id> dela, na lista dela (a Guarda, os buffs de ataque e os de defesa)', () => {
    const { view } = mount();
    const lists = [
      ['Guarda', view.opponent.guard],
      ['Buffs de ataque', view.opponent.attackBuffs],
      ['Buffs de defesa', view.opponent.defenseBuffs],
    ] as const;
    for (const [name, cards] of lists) {
      const list = theirs().getByRole('list', { name });
      // A lista em si não é zona: só cada carta dela.
      expect(keyOf(list), name).toBeNull();
      for (const card of cards) {
        const inside = list.querySelector<HTMLElement>(`[data-card-id="${card.id}"]`)!;
        expect(keyOf(inside), `${name}: ${card.id}`).toBe(cardDropKey(card.id));
      }
    }
    // E as cartas da sua Guarda levam a chave da Guarda, não a de alvo.
    const mineGuard = mine().getByRole('list', { name: 'Guarda' });
    for (const card of view.self.guard) expect(keyOf(mineGuard.querySelector<HTMLElement>(`[data-card-id="${card.id}"]`)!)).toBe(DROP.guard);
  });

  it('no Equipar as mesmas chaves seguem nos mesmos lugares (as fileiras com vaga; as últimas cartas com elas cheias)', () => {
    mount(EQUIP);
    expect(keyOf(screen.getByRole('group', { name: 'Sua fileira de ataque' }))).toBe(DROP.attackRow);
    expect(keyOf(screen.getByRole('group', { name: 'Sua fileira de defesa' }))).toBe(DROP.defenseRow);
    cleanup();
    const { view } = mount(FULL);
    const attackRow = screen.getByRole('group', { name: 'Sua fileira de ataque' });
    expect(attackRow).toContainElement(zone(DROP.lastAttack));
    expect(zone(DROP.lastAttack).querySelector(`[data-card-id="${view.self.attackRow.at(-1)!.id}"]`)).not.toBeNull();
    expect(screen.getByRole('group', { name: 'Sua fileira de defesa' })).toContainElement(zone(DROP.lastDefense));
  });

  it('o Equipar com vaga: toda chave de equipDropZones existe na mesa', () => {
    const { view, session } = mount(EQUIP);
    const keys = [...equipDropZones(view, session.snapshot().legal, []).keys()];
    expect(keys.length).toBeGreaterThan(0);
    for (const key of keys) expect(rendered(), key).toContain(key);
  });

  it('o Equipar com as fileiras cheias: toda chave de equipDropZones existe na mesa', () => {
    const { view, session } = mount(FULL);
    const keys = [...equipDropZones(view, session.snapshot().legal, []).keys()];
    expect(new Set(keys)).toEqual(new Set([DROP.lastAttack, DROP.lastDefense, DROP.graveyard]));
    for (const key of keys) expect(rendered(), key).toContain(key);
  });

  it('a zona de uma fileira vazia é só a fileira (não há última carta)', () => {
    mount({ ...EQUIP, self: { ...EQUIP.self, attackRow: [] } });
    expect(rendered()).toContain(DROP.attackRow);
    expect(rendered()).not.toContain(DROP.lastAttack);
    expect(rendered()).toContain(DROP.lastDefense);
  });
});

describe('acessibilidade do arrasto', () => {
  it('a mesa da fase principal, em repouso e com a carta no ar, não tem violação séria do axe', async () => {
    const { container } = mount();
    expect(await seriousViolations(container)).toEqual([]);
    const card = handCard('A');
    press(card);
    moveTo(card, 80, 80);
    expect(ghost()).not.toBeNull();
    expect(await seriousViolations(document.body)).toEqual([]);
    release(card, 80, 80);
  });

  it('a mesa do Equipar, em repouso e com a carta no ar, não tem violação séria do axe', async () => {
    const { container } = mount(EQUIP);
    expect(await seriousViolations(container)).toEqual([]);
    press(equipCard());
    moveTo(equipCard(), 80, 80);
    expect(ghost()).not.toBeNull();
    expect(await seriousViolations(document.body)).toEqual([]);
    release(equipCard(), 80, 80);
  });

  it('o fantasma não repete a carta para quem lê a tela', () => {
    mount();
    const card = handCard('K');
    press(card);
    moveTo(card, 80, 80);
    expect(screen.getAllByRole('button', { name: HAND_NAME.K })).toHaveLength(1);
    expect(ghost()).toHaveAttribute('aria-hidden', 'true');
    release(card, 80, 80);
  });
});
