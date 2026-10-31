// As fases e os avisos da mesa (spec §3.5 a §3.9, §6.2, §10.3): Equipar carta a carta, escolha da ordem, janela de
// reação, relógio (urgência, "tempo esgotado" e anúncios) e os avisos de conexão e de presença. A mesa é a `PlayTable`
// sobre uma `Session` de verdade, com `FakeConnection`; toda jogada enviada também é conferida contra o motor
// (`applyAction`). Os testes de relógio usam timers falsos: o relógio local (`Date`) e o do servidor
// (`connection.now`) andam juntos pelo `tick`.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applyAction, attackPower, defensePower, type SpecialCard } from '@coringa/engine';
import type { Deadline, PlayerAction, RoomMessage, StateMessage } from '@coringa/protocol';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Session } from '../../src/model/session.ts';
import { DEFAULT_PREFS, type Prefs } from '../../src/model/storage.ts';
import { PlayTable } from '../../src/ui/table/PlayTable.tsx';
import { pickCards } from '../../src/ui/table/ActionBar.tsx';
import { FakeConnection, scenarioAt, stateMessage, type ViewSpec } from '../fixtures.ts';
import { ATTACK_BUTTON, roomMessage, seriousViolations, startsWith } from './support.tsx';

const seatOf = (playerId: 'p1' | 'p2', nickname: string, extra: { connected?: boolean; woAt?: number } = {}) => ({
  playerId,
  nickname,
  connected: true,
  ready: true,
  wantsRematch: false,
  ...extra,
});

/** O rascunho da Peleja: a minha vez, com ATK 152 contra a DEF 42 de Duda (um K na Guarda dele) e 84 contra a minha DEF 46. */
const DRAFT: ViewSpec = {
  round: 7,
  self: {
    hp: 187,
    hand: ['K', 'A', 'Q'],
    attackRow: [8, 4, 10, 7, 9],
    defenseRow: [3, 6, 9, 5],
    // Um J a mais de cada lado mantém as contas sem a Pressão da mesa (saiu no sub-projeto 5): 38 × 4 e 28 × 3.
    attackBuffs: ['J', 'WILD', 'J'],
    defenseBuffs: ['Q'],
    guard: ['K'],
  },
  opponent: {
    hp: 214,
    hand: ['A', 'K', 'WILD'],
    attackRow: [6, 9, 3, 10],
    defenseRow: [5, 7, 2],
    attackBuffs: ['J', 'J'],
    defenseBuffs: ['Q', 'Q'],
    guard: ['K'],
  },
  graveyard: [3, 5, 8],
};

/** Rodada de Equipar: 3 numéricas minhas (7, 7, 3) e 3 de Duda, com as duas fileiras ainda com vaga. */
const EQUIP: ViewSpec = {
  ...DRAFT,
  phase: { kind: 'EQUIP' },
  self: { ...DRAFT.self, pending: [7, 7, 3] },
  opponent: { ...DRAFT.opponent, pending: [5, 2, 9] },
};

/** As duas fileiras cheias: as três opções de troca. */
const FULL: ViewSpec = {
  ...EQUIP,
  self: { ...EQUIP.self, attackRow: [8, 4, 10, 7, 9, 2, 6], defenseRow: [3, 6, 9, 5, 2, 4, 8] },
};

const ORDER: ViewSpec = { ...DRAFT, phase: { kind: 'ORDER_CHOICE', player: 'p1' } };

interface MountOptions {
  state?: Partial<Omit<StateMessage, 't' | 'view'>>;
  room?: Partial<RoomMessage>;
  prefs?: Partial<Prefs>;
  /** Timers falsos: `Date`, `setTimeout` e `setInterval` ficam nas mãos do teste. */
  fake?: boolean;
  before?: ReactNode;
}

const sessions: Session[] = [];

afterEach(() => {
  for (const session of sessions.splice(0)) session.dispose();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function mount(spec: ViewSpec = DRAFT, options: MountOptions = {}) {
  if (options.fake) {
    vi.useFakeTimers();
    vi.setSystemTime(10_000);
    // A Testing Library só avança os timers falsos de um `jest` global; sem ele, o `await user.click` espera para sempre.
    vi.stubGlobal('jest', { advanceTimersByTime: (ms: number) => vi.advanceTimersByTime(ms) });
  }
  const { state: game, view } = scenarioAt(spec);
  const me = spec.me ?? 'p1';
  const room = roomMessage({
    status: 'PLAYING',
    seats: me === 'p1' ? [seatOf('p1', 'André'), seatOf('p2', 'Duda')] : [seatOf('p1', 'Duda'), seatOf('p2', 'André')],
    score: { p1: 0, p2: 0 },
    ...options.room,
  });
  const connection = new FakeConnection({ playerId: me, room, state: stateMessage(view, options.state), now: 0 });
  const session = new Session(
    connection,
    {
      now: () => Date.now(),
      setTimer: (fn, ms) => setTimeout(fn, ms),
      clearTimer: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
    },
    { ...DEFAULT_PREFS, ...options.prefs },
  );
  sessions.push(session);
  const user = options.fake ? userEvent.setup({ advanceTimers: vi.advanceTimersByTime }) : userEvent.setup();
  const rendered = render(
    <>
      {options.before}
      <PlayTable session={session} />
    </>,
  );
  return { game, view, me, connection, session, user, ...rendered };
}

type Mounted = ReturnType<typeof mount>;

/** Anda o relógio local e o do servidor juntos, e deixa os ouvintes de tempo rodarem. */
function tick(m: Mounted, ms: number) {
  act(() => {
    m.connection.now += ms;
    vi.advanceTimersByTime(ms);
  });
}

const acts = (m: Mounted) => m.connection.sent.flatMap((s) => (s.type === 'act' ? [s.action] : []));

/** A jogada enviada, que também precisa ser aceita pelo motor (spec §1.5, passo 2). */
function sentAction(m: Mounted): PlayerAction {
  const sent = acts(m);
  expect(sent).toHaveLength(1);
  const action = sent[0]!;
  expect(applyAction(m.game, m.me, action).ok).toBe(true);
  return action;
}

const equipPanel = () => screen.getByRole('region', { name: 'Equipar' });
const inEquip = () => within(equipPanel());
const orderPanel = () => screen.getByRole('region', { name: 'Escolha da ordem' });
const bar = () => screen.getByRole('region', { name: 'Ações' });
const inBar = () => within(bar());
const band = () => within(screen.getByRole('region', { name: 'Situação da rodada' }));
const handList = () => within(screen.getByRole('list', { name: 'Sua mão' }));
const live = () => document.querySelector('[aria-live="assertive"]') as HTMLElement;

const dest = (name: string) => inEquip().getByRole('button', { name });
/** Uma numérica do Equipar, pelo id (o botão da lista "Suas numéricas"). */
const pendingCard = (id: string) => equipPanel().querySelector<HTMLElement>(`[data-card-id="${id}"]`)!;
const choose = async (m: Mounted, ...names: string[]) => {
  for (const name of names) await m.user.click(dest(name));
};

const deadline = (kind: Deadline['kind'], at: number, players: Deadline['players'] = ['p1']): Deadline => ({ kind, at, players });

// ---------------------------------------------------------------------------------------------

describe('Equipar (spec §3.5; livre desde a E2 do sub-projeto 5)', () => {
  it('"Faltam 3 cartas", todas as numéricas à vista (a primeira escolhida) e os destinos nos rótulos do terminal', () => {
    const m = mount(EQUIP);
    expect(inEquip().getByText('Faltam 3 cartas')).toBeInTheDocument();
    const cards = within(inEquip().getByRole('list', { name: 'Suas numéricas' })).getAllByRole('button');
    expect(cards.map((c) => c.getAttribute('data-card-id'))).toEqual(m.view.self.pending.map((c) => c.id));
    expect(cards.map((c) => c.getAttribute('aria-pressed'))).toEqual(['true', 'false', 'false']);
    expect(cards[0]).toHaveAccessibleName(new RegExp(`^7 de ${m.view.self.pending[0]!.suit}`));
    const labels = within(inEquip().getByRole('list', { name: 'Destinos' }))
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(labels).toEqual(['Fileira de Ataque', 'Fileira de Defesa']);
  });

  it('escolher Ataque, Ataque, Defesa e Confirmar manda EQUIP com esses destinos', async () => {
    const m = mount(EQUIP);
    await choose(m, 'Fileira de Ataque');
    expect(inEquip().getByText('Faltam 2 cartas')).toBeInTheDocument();
    await choose(m, 'Fileira de Ataque', 'Fileira de Defesa');
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(sentAction(m)).toEqual({ type: 'EQUIP', destinations: ['ATK', 'ATK', 'DEF'], order: m.view.self.pending.map((c) => c.id) });
    // Jogada voluntária: sem `auto`.
    expect(m.connection.sent[0]).toMatchObject({ options: undefined });
  });

  it('Confirmar só aparece com todas as cartas posicionadas', async () => {
    const m = mount(EQUIP);
    expect(inEquip().queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    await choose(m, 'Fileira de Ataque', 'Fileira de Defesa');
    expect(inEquip().queryByRole('button', { name: 'Confirmar' })).not.toBeInTheDocument();
    await choose(m, 'Fileira de Defesa');
    expect(inEquip().getByRole('button', { name: 'Confirmar' })).toBeEnabled();
    // Sem cartas nem destinos para escolher, e sem o "Faltam".
    expect(inEquip().queryByRole('list', { name: 'Destinos' })).not.toBeInTheDocument();
    expect(inEquip().queryByRole('list', { name: 'Suas numéricas' })).not.toBeInTheDocument();
    expect(inEquip().queryByText(/^Falta/)).not.toBeInTheDocument();
  });

  it('Desfazer volta um passo, Recomeçar volta ao início', async () => {
    const m = mount(EQUIP);
    await choose(m, 'Fileira de Ataque', 'Fileira de Defesa');
    expect(inEquip().getByText('Falta 1 carta')).toBeInTheDocument();
    await m.user.click(inEquip().getByRole('button', { name: 'Desfazer' }));
    expect(inEquip().getByText('Faltam 2 cartas')).toBeInTheDocument();
    expect(m.session.snapshot().equipDraft.map((p) => p.destination)).toEqual(['ATK']);
    await choose(m, 'Fileira de Defesa');
    await m.user.click(inEquip().getByRole('button', { name: 'Recomeçar' }));
    expect(inEquip().getByText('Faltam 3 cartas')).toBeInTheDocument();
    expect(m.session.snapshot().equipDraft).toEqual([]);
    expect(acts(m)).toEqual([]);
  });

  it('Desfazer e Recomeçar ficam desligados enquanto não há escolha', async () => {
    const m = mount(EQUIP);
    expect(inEquip().getByRole('button', { name: 'Desfazer' })).toBeDisabled();
    expect(inEquip().getByRole('button', { name: 'Recomeçar' })).toBeDisabled();
    await choose(m, 'Fileira de Ataque');
    expect(inEquip().getByRole('button', { name: 'Desfazer' })).toBeEnabled();
    expect(inEquip().getByRole('button', { name: 'Recomeçar' })).toBeEnabled();
  });

  it('com as fileiras cheias aparecem as três opções de troca, com a carta que sai', async () => {
    const m = mount(FULL);
    const labels = within(inEquip().getByRole('list', { name: 'Destinos' }))
      .getAllByRole('button')
      .map((b) => b.textContent);
    // Atrás de cada fileira, a carta do fim: o 6♠ do Ataque e o 8♠ da Defesa.
    expect(labels).toEqual([
      'Trocar a última carta do Ataque (sai 6♠)',
      'Trocar a última carta da Defesa (sai 8♠)',
      'Descartar no cemitério',
    ]);
    await choose(m, 'Trocar a última carta do Ataque (sai 6♠)', 'Descartar no cemitério', 'Descartar no cemitério');
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(sentAction(m)).toEqual({ type: 'EQUIP', destinations: ['REPLACE_LAST_ATK', 'DISCARD', 'DISCARD'], order: m.view.self.pending.map((c) => c.id) });
  });

  it('depois de uma troca, o "sai" é a carta do rascunho, não a da mesa', async () => {
    const m = mount(FULL);
    await choose(m, 'Trocar a última carta do Ataque (sai 6♠)');
    // A primeira pendente (7♥) é agora a última do Ataque: é ela que sai na próxima troca.
    expect(dest('Trocar a última carta do Ataque (sai 7♥)')).toBeInTheDocument();
    expect(dest('Trocar a última carta da Defesa (sai 8♠)')).toBeInTheDocument();
  });

  it('só oferece destinos que levam a uma montagem legal (a lista legal manda)', () => {
    // Ataque cheio, Defesa com vaga: a única fileira é a Defesa.
    mount({ ...EQUIP, self: { ...EQUIP.self, attackRow: [8, 4, 10, 7, 9, 2, 6] } });
    const labels = within(inEquip().getByRole('list', { name: 'Destinos' }))
      .getAllByRole('button')
      .map((b) => b.textContent);
    expect(labels).toEqual(['Fileira de Defesa']);
  });

  it('o rascunho aparece translúcido na fileira, e o total acompanha o motor', async () => {
    const m = mount(EQUIP);
    const group = () => screen.getByRole('group', { name: 'Sua fileira de ataque' });
    expect(group().querySelectorAll('[data-rascunho]')).toHaveLength(0);
    await choose(m, 'Fileira de Ataque');
    const drafts = group().querySelectorAll('[data-rascunho]');
    expect(drafts).toHaveLength(1);
    expect(drafts[0]).toHaveAttribute('data-card-id', m.view.self.pending[0]!.id);
    expect(drafts[0]).toHaveAccessibleName(/, rascunho$/);
    expect(drafts[0]!.className).toMatch(/opacity-/);
    const expected = attackPower({ attackRow: [...m.view.self.attackRow, m.view.self.pending[0]!], attackBuffs: m.view.self.attackBuffs });
    expect(group().querySelector('[data-total]')).toHaveTextContent(String(expected));
    // A defesa não mudou.
    const defense = screen.getByRole('group', { name: 'Sua fileira de defesa' });
    expect(defense.querySelector('[data-total]')).toHaveTextContent(String(defensePower(m.view.self)));
  });

  it('o rascunho na Defesa e o descarte: a troca tira a carta da fileira e o descarte não entra nela', async () => {
    const m = mount(FULL);
    await choose(m, 'Trocar a última carta da Defesa (sai 8♠)', 'Descartar no cemitério');
    const defense = screen.getByRole('group', { name: 'Sua fileira de defesa' });
    expect(defense.querySelectorAll('[data-rascunho]')).toHaveLength(1);
    expect(defense.querySelector(`[data-card-id="${m.view.self.defenseRow.at(-1)!.id}"]`)).toBeNull();
    const attack = screen.getByRole('group', { name: 'Sua fileira de ataque' });
    expect(attack.querySelectorAll('[data-rascunho]')).toHaveLength(0);
  });

  it('a quadra que o rascunho forma: "forma quadra de 7: +7 e 1 Ressurreição"', async () => {
    const m = mount({ ...EQUIP, self: { ...EQUIP.self, attackRow: [7, 7, 7, 2] } });
    expect(screen.queryByText(/forma quadra/)).not.toBeInTheDocument();
    await choose(m, 'Fileira de Ataque');
    expect(inEquip().getByText('forma quadra de 7: +7 e 1 Ressurreição')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Sua fileira de ataque' }).querySelector('[data-quadra]')).toHaveTextContent('+7');
    await m.user.click(inEquip().getByRole('button', { name: 'Desfazer' }));
    expect(screen.queryByText(/forma quadra/)).not.toBeInTheDocument();
  });

  it('depois de confirmar: "Esperando Duda montar…", sem destinos nem botões, e o rascunho continua à vista', async () => {
    const m = mount(EQUIP);
    await choose(m, 'Fileira de Ataque', 'Fileira de Ataque', 'Fileira de Defesa');
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(inEquip().getByText('Esperando Duda montar…')).toBeInTheDocument();
    expect(inEquip().queryAllByRole('button')).toHaveLength(0);
    expect(m.session.snapshot().equipConfirmed).toBe('thisPage');
    expect(document.querySelectorAll('[data-rascunho]')).toHaveLength(3);
  });

  it('com a página recarregada depois de confirmar: "Você já confirmou; esperando Duda"', () => {
    mount({ ...EQUIP, self: { ...EQUIP.self, equipSubmitted: true } });
    expect(inEquip().getByText('Você já confirmou; esperando Duda')).toBeInTheDocument();
    expect(inEquip().queryAllByRole('button')).toHaveLength(0);
    expect(document.querySelectorAll('[data-rascunho]')).toHaveLength(0);
  });

  it('sem numéricas: "Você não recebeu numéricas nesta rodada", mesmo que o servidor já tenha confirmado por você', () => {
    const open = mount({ ...EQUIP, self: { ...EQUIP.self, pending: [] } });
    expect(inEquip().getByText('Você não recebeu numéricas nesta rodada')).toBeInTheDocument();
    expect(inEquip().queryAllByRole('button')).toHaveLength(0);
    open.unmount();
    mount({ ...EQUIP, self: { ...EQUIP.self, pending: [], equipSubmitted: true } });
    expect(inEquip().getByText('Você não recebeu numéricas nesta rodada')).toBeInTheDocument();
    expect(inEquip().getByText('Esperando Duda montar…')).toBeInTheDocument();
  });

  it('o oponente aparece como "montando 3 cartas…" ou "pronto"', () => {
    const waiting = mount(EQUIP);
    const field = () => within(screen.getByRole('region', { name: 'Campo de Duda' }));
    expect(field().getByText('montando 3 cartas…')).toBeInTheDocument();
    waiting.unmount();
    const one = mount({ ...EQUIP, opponent: { ...EQUIP.opponent, pending: [4] } });
    expect(field().getByText('montando 1 carta…')).toBeInTheDocument();
    one.unmount();
    const ready = mount({ ...EQUIP, opponent: { ...EQUIP.opponent, equipSubmitted: true } });
    expect(field().getByText('pronto')).toBeInTheDocument();
    expect(field().queryByText(/montando/)).not.toBeInTheDocument();
    ready.unmount();
    // Fora do Equipar, nenhum dos dois aparece.
    mount();
    expect(field().queryByText('pronto')).not.toBeInTheDocument();
    expect(field().queryByText(/montando/)).not.toBeInTheDocument();
  });

  it('o oponente não recebeu numéricas: aparece "pronto"', () => {
    mount({ ...EQUIP, opponent: { ...EQUIP.opponent, pending: [] } });
    expect(within(screen.getByRole('region', { name: 'Campo de Duda' })).getByText('pronto')).toBeInTheDocument();
  });

  it('a barra de jogadas não existe no Equipar, e o toque na mão só explica por que a carta espera (B2)', async () => {
    const m = mount(EQUIP);
    expect(screen.queryByRole('region', { name: 'Ações' })).not.toBeInTheDocument();
    const card = handList().getAllByRole('button')[0]!;
    expect(card).not.toHaveAttribute('aria-pressed');
    await m.user.click(card);
    const note = document.querySelector('[data-motivo]');
    expect(note).toHaveAttribute('role', 'status');
    expect(note).toHaveTextContent(/: no Equipar as especiais esperam na mão; elas se jogam nas rodadas de Ataque, no seu turno$/);
    expect(m.connection.sent).toHaveLength(0);
    // Outro toque na mesma carta fecha o balão.
    await m.user.click(card);
    expect(document.querySelector('[data-motivo]')).toBeNull();
  });

  it('com a jogada em voo: "Enviando…", e só depois do ack "Esperando Duda montar…"', async () => {
    const m = mount(EQUIP);
    await choose(m, 'Fileira de Ataque', 'Fileira de Ataque', 'Fileira de Defesa');
    let resolve!: () => void;
    m.connection.acks = [new Promise((r) => (resolve = () => r({ ok: true })))];
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(inEquip().getByText('Enviando…')).toBeInTheDocument();
    expect(inEquip().queryByText('Esperando Duda montar…')).not.toBeInTheDocument();
    expect(inEquip().queryAllByRole('button')).toHaveLength(0);
    await act(async () => {
      resolve();
      await Promise.resolve();
    });
    expect(inEquip().getByText('Esperando Duda montar…')).toBeInTheDocument();
    expect(inEquip().queryByText('Enviando…')).not.toBeInTheDocument();
  });

  it('tocar na terceira carta e depois no destino põe a terceira, na frente da fila', async () => {
    const m = mount(EQUIP);
    const [first, second, third] = m.view.self.pending;
    await m.user.click(pendingCard(third!.id));
    expect(pendingCard(third!.id)).toHaveAttribute('aria-pressed', 'true');
    expect(pendingCard(first!.id)).toHaveAttribute('aria-pressed', 'false');
    // O toque na carta leva o foco ao primeiro destino, o passo seguinte.
    expect(dest('Fileira de Ataque')).toHaveFocus();
    await choose(m, 'Fileira de Ataque');
    expect(m.session.snapshot().equipDraft).toEqual([{ cardId: third!.id, destination: 'ATK' }]);
    expect(inEquip().getByText('Faltam 2 cartas')).toBeInTheDocument();
    // A carta posta sai da lista e entra no Ataque como rascunho; a primeira que falta volta a ser a escolhida.
    expect(inEquip().queryByRole('button', { name: new RegExp(`^3 de ${third!.suit}`) })).not.toBeInTheDocument();
    expect(document.querySelector(`[data-card-id="${third!.id}"][data-rascunho]`)).not.toBeNull();
    expect(pendingCard(first!.id)).toHaveAttribute('aria-pressed', 'true');
    await choose(m, 'Fileira de Defesa', 'Fileira de Defesa');
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(sentAction(m)).toEqual({ type: 'EQUIP', destinations: ['ATK', 'DEF', 'DEF'], order: [third!.id, first!.id, second!.id] });
  });

  it('Desfazer depois de escolher fora de ordem devolve a carta à lista', async () => {
    const m = mount(EQUIP);
    const third = m.view.self.pending[2]!;
    await m.user.click(pendingCard(third.id));
    await choose(m, 'Fileira de Defesa');
    await m.user.click(inEquip().getByRole('button', { name: 'Desfazer' }));
    expect(m.session.snapshot().equipDraft).toEqual([]);
    expect(within(inEquip().getByRole('list', { name: 'Suas numéricas' })).getAllByRole('button')).toHaveLength(3);
    expect(document.querySelector(`[data-card-id="${third.id}"][data-rascunho]`)).toBeNull();
  });

  it('uma confirmação recusada devolve o rascunho para confirmar de novo', async () => {
    const m = mount(EQUIP);
    await choose(m, 'Fileira de Ataque', 'Fileira de Ataque', 'Fileira de Defesa');
    m.connection.acks = [{ ok: false, code: 'INVALID_DESTINATIONS', message: 'montagem recusada' }];
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(await screen.findByText('montagem recusada')).toBeInTheDocument();
    expect(inEquip().getByRole('button', { name: 'Confirmar' })).toBeEnabled();
    expect(inEquip().getByRole('button', { name: 'Desfazer' })).toBeEnabled();
  });
});

describe('Equipar: foco e teclado (spec §7)', () => {
  it('quando a rodada abre, o foco vai para o painel, sem contar como interação', () => {
    const m = mount(EQUIP);
    expect(equipPanel()).toHaveFocus();
    expect(m.session.snapshot().equipDraft).toEqual([]);
  });

  it('depois de cada escolha o foco vai ao primeiro destino da carta seguinte, e à Confirmar no fim', async () => {
    const m = mount(EQUIP);
    await choose(m, 'Fileira de Ataque');
    expect(dest('Fileira de Ataque')).toHaveFocus();
    await choose(m, 'Fileira de Ataque', 'Fileira de Defesa');
    expect(inEquip().getByRole('button', { name: 'Confirmar' })).toHaveFocus();
    // O Ataque encheu com as duas primeiras (5 + 2 = 7): a terceira carta só tem a Defesa.
    await m.user.click(inEquip().getByRole('button', { name: 'Desfazer' }));
    expect(dest('Fileira de Defesa')).toHaveFocus();
  });

  it('a montagem inteira só pelo teclado: a primeira tecla escolhe a carta, a segunda o destino', async () => {
    const m = mount(EQUIP);
    await m.user.tab();
    expect(pendingCard(m.view.self.pending[0]!.id)).toHaveFocus();
    await m.user.keyboard('{Enter}');
    expect(dest('Fileira de Ataque')).toHaveFocus();
    await m.user.keyboard('{Enter}');
    expect(inEquip().getByText('Faltam 2 cartas')).toBeInTheDocument();
    await m.user.keyboard('{Enter}{Enter}');
    expect(inEquip().getByRole('button', { name: 'Confirmar' })).toHaveFocus();
    await m.user.keyboard('{Enter}');
    expect(sentAction(m)).toEqual({ type: 'EQUIP', destinations: ['ATK', 'ATK', 'DEF'], order: m.view.self.pending.map((c) => c.id) });
  });
});

// ---------------------------------------------------------------------------------------------

describe('escolha da ordem (spec §3.6)', () => {
  it('"Atacar primeiro" vem pré-selecionado, com a barra de 3 s e a confirmação automática agendada', () => {
    const m = mount(ORDER, { fake: true });
    expect(within(orderPanel()).getByText('Você tem a iniciativa: atacar primeiro ou em segundo?')).toBeInTheDocument();
    const first = within(orderPanel()).getByRole('button', { name: 'Atacar primeiro' });
    expect(first).toHaveAttribute('data-preselecionada');
    expect(within(orderPanel()).getByRole('button', { name: 'Atacar em segundo' })).not.toHaveAttribute('data-preselecionada');
    expect(orderPanel().querySelector('[data-auto-barra]')).not.toBeNull();
    // O foco chegou ao painel por conta da mesa: isso não é interação do jogador.
    expect(orderPanel()).toHaveFocus();
    expect(m.session.snapshot().orderAutoAt).toBe(13_000);
  });

  it('a pergunta diz por que a iniciativa é sua: sorteada, mais dano ou empate na última rodada de Ataque', () => {
    const first = mount(ORDER, { fake: true });
    expect(within(orderPanel()).getByText('Ela foi sorteada no início da partida.')).toBeInTheDocument();
    first.unmount();
    const lead = mount({ ...ORDER, lastInitiative: { holder: 'self', changed: true, self: 14, opponent: 9 } }, { fake: true });
    expect(within(orderPanel()).getByText('Você causou mais dano na última rodada de Ataque (14 × 9).')).toBeInTheDocument();
    lead.unmount();
    mount({ ...ORDER, lastInitiative: { holder: 'self', changed: false, self: 0, opponent: 0 } }, { fake: true });
    expect(within(orderPanel()).getByText('Empate em dano na última rodada de Ataque (0 × 0): ela não mudou.')).toBeInTheDocument();
  });

  it('a barra esvazia até o instante da confirmação automática', () => {
    const m = mount(ORDER, { fake: true });
    const fill = () => orderPanel().querySelector<HTMLElement>('[data-auto-barra] > *')!;
    expect(fill().style.width).toBe('100%');
    tick(m, 1_500);
    expect(parseFloat(fill().style.width)).toBeCloseTo(50, 0);
    tick(m, 1_000);
    expect(parseFloat(fill().style.width)).toBeCloseTo(16.7, 0);
  });

  it('sem interação, no fim dos 3 s a interface envia CHOOSE_ORDER { first: true } com a marca auto', () => {
    const m = mount(ORDER, { fake: true });
    tick(m, 2_900);
    expect(acts(m)).toEqual([]);
    tick(m, 200);
    const sent = m.connection.sent;
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ type: 'act', action: { type: 'CHOOSE_ORDER', first: true }, options: { auto: true } });
    expect(applyAction(m.game, m.me, { type: 'CHOOSE_ORDER', first: true }).ok).toBe(true);
  });

  it('um clique no painel cancela o automático (orderAutoAt some do snapshot)', async () => {
    const m = mount(ORDER, { fake: true });
    expect(m.session.snapshot().orderAutoAt).not.toBeNull();
    await m.user.click(orderPanel());
    expect(m.session.snapshot().orderAutoAt).toBeNull();
    expect(orderPanel().querySelector('[data-auto-barra]')).toBeNull();
    tick(m, 10_000);
    expect(acts(m)).toEqual([]);
  });

  it('com prazo do servidor, depois de interagir o painel diz "Escolha quando quiser, dentro do prazo."', async () => {
    const m = mount(ORDER, { fake: true, state: { deadline: deadline('ORDER', 70_000) } });
    await m.user.click(orderPanel());
    expect(within(orderPanel()).getByText('Escolha quando quiser, dentro do prazo.')).toBeInTheDocument();
  });

  it('sem prazo (treino e tutorial) o painel não fala em prazo: "Escolha quando quiser."', async () => {
    const m = mount(ORDER, { fake: true });
    expect(m.session.snapshot().state?.deadline).toBeNull();
    await m.user.click(orderPanel());
    expect(within(orderPanel()).getByText('Escolha quando quiser.')).toBeInTheDocument();
    expect(within(orderPanel()).queryByText(/prazo/)).not.toBeInTheDocument();
  });

  it('o mouse por cima do painel também cancela', async () => {
    const m = mount(ORDER, { fake: true });
    await m.user.hover(within(orderPanel()).getByRole('button', { name: 'Atacar em segundo' }));
    expect(m.session.snapshot().orderAutoAt).toBeNull();
  });

  it('o foco do teclado dentro do painel também cancela', async () => {
    const m = mount(ORDER, { fake: true });
    expect(m.session.snapshot().orderAutoAt).not.toBeNull();
    await m.user.tab();
    expect(within(orderPanel()).getByRole('button', { name: 'Atacar primeiro' })).toHaveFocus();
    expect(m.session.snapshot().orderAutoAt).toBeNull();
  });

  it('escolher à mão manda a ordem sem auto: primeiro ou em segundo', async () => {
    const first = mount(ORDER, { fake: true });
    await first.user.click(within(orderPanel()).getByRole('button', { name: 'Atacar primeiro' }));
    expect(first.connection.sent[0]).toMatchObject({ action: { type: 'CHOOSE_ORDER', first: true }, options: undefined });
    first.unmount();
    const second = mount(ORDER, { fake: true });
    await second.user.click(within(orderPanel()).getByRole('button', { name: 'Atacar em segundo' }));
    expect(sentAction(second)).toEqual({ type: 'CHOOSE_ORDER', first: false });
    expect(second.connection.sent[0]).toMatchObject({ options: undefined });
  });

  it('o outro jogador vê "Duda está escolhendo a ordem…", sem botões', () => {
    mount({ ...DRAFT, initiative: 'opponent', phase: { kind: 'ORDER_CHOICE', player: 'p2' } });
    expect(screen.getByText('Duda está escolhendo a ordem…')).toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Escolha da ordem' })?.querySelectorAll('button') ?? []).toHaveLength(0);
    expect(screen.queryByRole('region', { name: 'Ações' })).not.toBeInTheDocument();
  });

  it('o painel fica desligado na reconexão (e a mão continua só de leitura)', () => {
    const m = mount(ORDER, { fake: true });
    act(() => m.connection.emitClosed(1006, false));
    expect(within(orderPanel()).getByRole('button', { name: 'Atacar primeiro' })).toBeDisabled();
    expect(within(orderPanel()).getByRole('button', { name: 'Atacar em segundo' })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------------------------

describe('janela de reação (spec §3.7)', () => {
  const REACTION = { ...DRAFT, phase: 'ATTACK' } as const satisfies ViewSpec;
  const withClock = { deadline: deadline('REACTION', 8_000) };

  it('quem responde vê o gatilho com a prévia, as respostas, Passar e o relógio de 8 s', () => {
    mount(REACTION, { state: withClock });
    expect(inBar().getByText('Duda declarou ataque: 84 contra sua Defesa 46 → seu K absorve')).toBeInTheDocument();
    expect(handList().getAllByRole('button')).toHaveLength(3);
    expect(inBar().getByRole('button', { name: 'Passar' })).toBeEnabled();
    expect(band().getByRole('timer')).toHaveTextContent('8');
  });

  it('na janela de reação, J, Q e K dizem que só o A responde (B2)', async () => {
    const m = mount(REACTION, { state: withClock });
    const king = handList().getAllByRole('button').find((el) => /^K, Guarda/.test(el.getAttribute('aria-label') ?? ''))!;
    await m.user.click(king);
    expect(inBar().getByText(/: na janela de reação só o A \(ou o Selvagem como A\) responde$/)).toBeInTheDocument();
  });

  it('o relógio da reação é grande, e é um só', () => {
    mount(REACTION, { state: withClock });
    const clock = band().getByRole('timer');
    expect(clock.className).toMatch(/size-16/);
    expect(screen.getAllByRole('timer')).toHaveLength(1);
  });

  it('num prazo de turno o relógio é o pequeno', () => {
    mount(DRAFT, { state: { deadline: deadline('TURN', 21_000) } });
    expect(band().getByRole('timer').className).not.toMatch(/size-16/);
  });

  it('o gatilho segue cada desfecho do ataque (a conta é do motor)', () => {
    const cases: Array<{ spec: ViewSpec; text: string }> = [
      { spec: { ...REACTION, self: { ...DRAFT.self, guard: [] } }, text: 'Duda declarou ataque: 84 contra sua Defesa 46 → dano 38' },
      {
        spec: { ...REACTION, self: { ...DRAFT.self, absoluteDefense: true } },
        text: 'Duda declarou ataque: 84 contra sua Defesa 46 → sua Defesa Absoluta anula',
      },
      {
        spec: { ...REACTION, opponent: { ...DRAFT.opponent, attackBuffs: ['J', 'J', 'J', 'J'] } },
        text: 'Duda declarou ataque: 140 contra sua Defesa 46 → Ataque Absoluto, dano 94',
      },
      // Com o Reflect a conta não é contra a sua Defesa (é metade da DEF base de quem ataca).
      {
        spec: { ...REACTION, self: { ...DRAFT.self, reflect: true } },
        text: 'Duda declarou ataque: 84 → seu Reflect devolve 77 de dano a Duda',
      },
    ];
    for (const { spec, text } of cases) {
      const { unmount } = mount(spec, { state: withClock });
      expect(inBar().getByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it('o gatilho diz "derruba você" quando o ataque de Duda alcança a sua vida, e só então (spec §8.1)', () => {
    const cases: Array<{ spec: ViewSpec; text: string }> = [
      {
        spec: { ...REACTION, self: { ...DRAFT.self, guard: [], hp: 38 } },
        text: 'Duda declarou ataque: 84 contra sua Defesa 46 → dano 38 · derruba você',
      },
      {
        spec: { ...REACTION, self: { ...DRAFT.self, guard: [], hp: 39 } },
        text: 'Duda declarou ataque: 84 contra sua Defesa 46 → dano 38',
      },
      // O seu K absorve: a conta de ATK − DEF passa da vida, e o gatilho não diz "derruba".
      {
        spec: { ...REACTION, self: { ...DRAFT.self, hp: 10 } },
        text: 'Duda declarou ataque: 84 contra sua Defesa 46 → seu K absorve',
      },
      {
        spec: { ...REACTION, self: { ...DRAFT.self, reflect: true }, opponent: { ...DRAFT.opponent, hp: 77 } },
        text: 'Duda declarou ataque: 84 → seu Reflect devolve 77 de dano a Duda · derruba Duda',
      },
    ];
    for (const { spec, text } of cases) {
      const { unmount } = mount(spec, { state: withClock });
      expect(inBar().getByText(text)).toBeInTheDocument();
      unmount();
    }
  });

  it('o gatilho do K: "Duda pôs 2 K na Guarda", com o número que veio nos eventos', () => {
    const { view } = scenarioAt({ ...DRAFT, phase: 'K_PLAYED' });
    const kings: SpecialCard[] = [view.opponent.guard[0]!, { id: 'k-2', kind: 'K', suit: 'paus' }];
    mount({ ...DRAFT, phase: 'K_PLAYED' }, {
      state: { events: [{ type: 'GuardPlayed', player: 'p2', cards: kings }], ...withClock },
    });
    expect(inBar().getByText('Duda pôs 2 K na Guarda')).toBeInTheDocument();
  });

  it('o gatilho do K sem os eventos (recarga, resync) diz só "pôs K na Guarda"', () => {
    mount({ ...DRAFT, phase: 'K_PLAYED' }, { state: withClock });
    expect(inBar().getByText('Duda pôs K na Guarda')).toBeInTheDocument();
  });

  it('o gatilho do Reflect: "Duda lançou um Reflect"', () => {
    // Com K + J + Q na mão há resposta (outro Reflect); sem ela, a janela passa sozinha.
    mount(
      { ...DRAFT, self: { ...DRAFT.self, hand: ['K', 'J', 'Q'] }, phase: 'REFLECT_PLAYED', opponent: { ...DRAFT.opponent, reflect: true } },
      { state: withClock },
    );
    expect(inBar().getByText('Duda lançou um Reflect')).toBeInTheDocument();
    expect(inBar().getByRole('button', { name: 'Passar' })).toBeInTheDocument();
  });

  it('o gatilho da Devastação diz qual fileira você perde (F3)', () => {
    const devastation = { player: 'p2', row: 'DEF' as const, k: { id: 'dk', kind: 'K' as const, suit: 'paus' as const }, a: { id: 'da', kind: 'A' as const, suit: 'paus' as const }, x: { id: 'dq', kind: 'Q' as const, suit: 'paus' as const } };
    mount(
      { ...DRAFT, self: { ...DRAFT.self, hand: ['K', 'J', 'Q'] }, phase: { kind: 'REACTION', responder: 'p1', trigger: 'DEVASTATION', devastation } },
      { state: withClock },
    );
    expect(inBar().getByText('Duda lançou uma Devastação na sua fileira de Defesa')).toBeInTheDocument();
  });

  it('Passar manda PASS, sem auto, e depois a barra diz que você passou (o servidor segura o passe)', async () => {
    const m = mount(REACTION, { state: withClock });
    await m.user.click(inBar().getByRole('button', { name: 'Passar' }));
    expect(sentAction(m)).toEqual({ type: 'PASS' });
    expect(m.connection.sent[0]).toMatchObject({ options: undefined });
    expect(inBar().queryByRole('button', { name: 'Passar' })).not.toBeInTheDocument();
    expect(inBar().getByText('Você passou; esperando a janela fechar…')).toBeInTheDocument();
    // As respostas também saem: o servidor recusaria qualquer jogada depois do passe, e a mão não escolhe mais.
    expect(inBar().queryByText(/Toque numa carta/)).not.toBeInTheDocument();
    expect(handList().queryAllByRole('button')).toHaveLength(0);
  });

  it('um passe recusado devolve os controles', async () => {
    const m = mount(REACTION, { state: withClock });
    m.connection.acks = [{ ok: false, code: 'RATE_LIMITED', message: 'x' }];
    await m.user.click(inBar().getByRole('button', { name: 'Passar' }));
    expect(await screen.findByText('Devagar: muitas jogadas seguidas.')).toBeInTheDocument();
    expect(inBar().getByRole('button', { name: 'Passar' })).toBeEnabled();
  });

  it('o gatilho some de vista depois do passe', async () => {
    const m = mount(REACTION, { state: withClock });
    await m.user.click(inBar().getByRole('button', { name: 'Passar' }));
    expect(inBar().queryByText(/declarou ataque/)).not.toBeInTheDocument();
  });

  it('só dá para passar: o passe sai sozinho, com auto, e a barra diz "Sem resposta possível; passando"', () => {
    const m = mount({ ...REACTION, self: { ...DRAFT.self, hand: ['K', 'Q'] } }, { state: withClock });
    expect(m.connection.sent).toHaveLength(1);
    expect(m.connection.sent[0]).toMatchObject({ action: { type: 'PASS' }, options: { auto: true } });
    expect(inBar().getByText('Sem resposta possível; passando')).toBeInTheDocument();
    expect(inBar().queryByRole('button', { name: 'Passar' })).not.toBeInTheDocument();
    expect(handList().queryAllByRole('button')).toHaveLength(0);
  });

  it('com a chave desligada, o jogador clica em Passar', async () => {
    const m = mount({ ...REACTION, self: { ...DRAFT.self, hand: ['K', 'Q'] } }, { state: withClock, prefs: { autoPass: false } });
    expect(m.connection.sent).toHaveLength(0);
    expect(inBar().queryByText('Sem resposta possível; passando')).not.toBeInTheDocument();
    await m.user.click(inBar().getByRole('button', { name: 'Passar' }));
    expect(sentAction(m)).toEqual({ type: 'PASS' });
  });

  it('o aviso do passe automático some quando a época muda', () => {
    const m = mount({ ...REACTION, self: { ...DRAFT.self, hand: ['K', 'Q'] } }, { state: withClock });
    expect(inBar().getByText('Sem resposta possível; passando')).toBeInTheDocument();
    act(() => m.connection.emitState(stateMessage(scenarioAt(DRAFT).view, { seq: 2, epoch: 2 })));
    expect(screen.queryByText('Sem resposta possível; passando')).not.toBeInTheDocument();
  });

  it('quem espera vê "Duda pode reagir…", o relógio da janela e o próprio turno pausado', () => {
    mount(
      { ...DRAFT, phase: { kind: 'REACTION', responder: 'p2', trigger: 'ATTACK' } },
      { state: { deadline: deadline('REACTION', 8_000, ['p2']), pausedTurnMs: 21_000 } },
    );
    expect(inBar().getByText('Duda pode reagir…')).toBeInTheDocument();
    expect(band().getByRole('timer')).toHaveTextContent('8');
    expect(screen.getByText('seu turno: 21 s, pausado')).toBeInTheDocument();
    expect(inBar().queryByRole('button', { name: 'Passar' })).not.toBeInTheDocument();
    expect(inBar().queryByText(/declarou ataque/)).not.toBeInTheDocument();
  });

  it('o turno pausado só aparece para quem espera, e some com o fim da janela', () => {
    const m = mount(REACTION, { state: { ...withClock, pausedTurnMs: 21_000 } });
    expect(screen.queryByText(/pausado/)).not.toBeInTheDocument();
    m.unmount();
    const waiter = mount(
      { ...DRAFT, phase: { kind: 'REACTION', responder: 'p2', trigger: 'ATTACK' } },
      { state: { deadline: deadline('REACTION', 8_000, ['p2']), pausedTurnMs: 21_000 } },
    );
    expect(screen.getByText('seu turno: 21 s, pausado')).toBeInTheDocument();
    act(() => waiter.connection.emitState(stateMessage(scenarioAt(DRAFT).view, { seq: 2, epoch: 2 })));
    expect(screen.queryByText(/pausado/)).not.toBeInTheDocument();
  });

  it('a ameaça não se repete: o gatilho já traz a prévia', () => {
    mount(REACTION, { state: withClock });
    expect(inBar().queryByText('Ameaça de Duda')).not.toBeInTheDocument();
  });

  it('com a Armadilha escolhida, o passo do alvo segue como antes e o Passar continua à vista', async () => {
    const m = mount(REACTION, { state: withClock });
    await m.user.click(handList().getByRole('button', { name: /^A, Armadilha, de / }));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    expect(inBar().getByRole('list', { name: 'Alvos' })).toBeInTheDocument();
    expect(inBar().getByRole('button', { name: 'Passar' })).toBeInTheDocument();
    expect(inBar().getByRole('button', { name: 'Cancelar' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------

describe('relógio (spec §3.8, §10.3)', () => {
  const turn = (at: number, players: Deadline['players'] = ['p1']) => ({ deadline: deadline('TURN', at, players) });

  it('mostra os segundos inteiros, para cima', () => {
    mount(DRAFT, { fake: true, state: turn(21_400) });
    expect(band().getByRole('timer')).toHaveTextContent('22');
  });

  it('com 4 s: disco vermelho, número em papel, anel mais grosso e o rótulo de urgência', () => {
    mount(DRAFT, { fake: true, state: turn(4_000) });
    const clock = band().getByRole('timer');
    expect(clock).toHaveAttribute('data-urgente', 'true');
    expect(clock.className).toContain('bg-vermelho');
    expect(clock.className).toContain('text-papel');
    expect(clock.className).toMatch(/border-\[7px\]/);
    expect(clock).toHaveAccessibleName('Tempo do prazo: pouco tempo');
    expect(clock).toHaveTextContent('4');
  });

  it('com 6 s ainda não é urgente (disco claro, anel fino); entra na urgência aos 5 s', () => {
    const m = mount(DRAFT, { fake: true, state: turn(6_000) });
    const clock = band().getByRole('timer');
    expect(clock).not.toHaveAttribute('data-urgente');
    expect(clock.className).not.toContain('bg-vermelho');
    expect(clock.className).toMatch(/border-4/);
    expect(clock).toHaveAccessibleName('Tempo do prazo');
    tick(m, 1_000);
    expect(band().getByRole('timer')).toHaveAttribute('data-urgente', 'true');
    expect(band().getByRole('timer')).toHaveTextContent('5');
  });

  it('o relógio anda sozinho: um segundo a cada segundo do servidor', () => {
    const m = mount(DRAFT, { fake: true, state: turn(21_000) });
    expect(band().getByRole('timer')).toHaveTextContent('21');
    tick(m, 3_000);
    expect(band().getByRole('timer')).toHaveTextContent('18');
  });

  it('nunca pisca: nenhuma animação em modo nenhum (urgência é cor e forma)', () => {
    const m = mount(DRAFT, { fake: true, state: turn(30_000) });
    const check = () => {
      const region = screen.getByRole('region', { name: 'Situação da rodada' });
      expect(region.querySelectorAll('[class*="animate-"], [class*="animation"]')).toHaveLength(0);
      for (const el of region.querySelectorAll<HTMLElement>('*')) expect(el.style.animation).toBe('');
    };
    check();
    tick(m, 26_000);
    expect(band().getByRole('timer')).toHaveAttribute('data-urgente', 'true');
    check();
    tick(m, 4_000);
    check();
    // E a folha de estilos não tem nenhuma animação infinita.
    const css = readFileSync(resolve(import.meta.dirname, '../../src/styles.css'), 'utf8');
    expect(css).not.toMatch(/infinite/);
    expect(css).not.toMatch(/animation-iteration-count/);
  });

  it('quando expira: "Tempo esgotado", e os controles ficam desligados até chegar o state seguinte', () => {
    const m = mount(DRAFT, { fake: true, state: turn(3_000) });
    expect(screen.queryByText('Tempo esgotado')).not.toBeInTheDocument();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
    tick(m, 3_000);
    expect(screen.getByText('Tempo esgotado')).toBeInTheDocument();
    expect(band().getByRole('timer')).toHaveTextContent('0');
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeDisabled();
    // A mão também não escolhe mais.
    expect(handList().getAllByRole('button')).toHaveLength(3);
    // O servidor injetou o estouro: chega o state da fase seguinte, com outro prazo.
    act(() => m.connection.emitState(stateMessage(scenarioAt(DRAFT).view, { seq: 2, epoch: 2, ...turn(40_000) })));
    expect(screen.queryByText('Tempo esgotado')).not.toBeInTheDocument();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  it('com a mão desligada pelo tempo esgotado, tocar numa carta não escolhe', async () => {
    const m = mount(DRAFT, { fake: true, state: turn(3_000) });
    tick(m, 3_000);
    await m.user.click(handList().getByRole('button', { name: /^A, Armadilha, de / }));
    expect(handList().getByRole('button', { name: /^A, Armadilha, de / })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sem prazo (treino), não há relógio nem "Tempo esgotado"', () => {
    mount(DRAFT, { fake: true });
    expect(screen.queryByRole('timer')).not.toBeInTheDocument();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  describe('anúncios para leitor de tela (só nos prazos do próprio jogador)', () => {
    it('uma só região assertive escondida; o relógio em si não é anunciado', () => {
      mount(DRAFT, { fake: true, state: turn(30_000) });
      const regions = document.querySelectorAll('[aria-live="assertive"]');
      expect(regions).toHaveLength(1);
      expect(regions[0]!.className).toContain('sr-only');
      expect(regions[0]).not.toHaveAttribute('role');
      expect(band().getByRole('timer')).not.toHaveAttribute('aria-live', 'assertive');
      expect(band().getByRole('timer').closest('[aria-live="assertive"]')).toBeNull();
    });

    it('no começo do prazo, aos 10 s e aos 5 s', () => {
      const m = mount(DRAFT, { fake: true, state: turn(30_000) });
      tick(m, 0);
      expect(live()).toHaveTextContent('Sua vez: 30 segundos');
      tick(m, 19_000);
      expect(live()).toHaveTextContent('Sua vez: 30 segundos');
      tick(m, 1_000);
      expect(live()).toHaveTextContent('10 segundos');
      tick(m, 5_000);
      expect(live()).toHaveTextContent('5 segundos');
      tick(m, 1_000);
      expect(live()).toHaveTextContent('5 segundos');
    });

    it('o texto do começo diz de que prazo se trata', () => {
      const reaction = mount({ ...DRAFT, phase: 'ATTACK' }, { fake: true, state: { deadline: deadline('REACTION', 8_000) } });
      tick(reaction, 0);
      expect(live()).toHaveTextContent('Sua reação: 8 segundos');
      reaction.unmount();
      const equip = mount(EQUIP, { fake: true, state: { deadline: deadline('EQUIP', 30_000, ['p1', 'p2']) } });
      tick(equip, 0);
      expect(live()).toHaveTextContent('Monte suas cartas: 30 segundos');
      equip.unmount();
      const order = mount(ORDER, { fake: true, state: { deadline: deadline('ORDER', 10_000) } });
      tick(order, 0);
      expect(live()).toHaveTextContent('Escolha a ordem: 10 segundos');
    });

    it('prazo do oponente não é anunciado', () => {
      const m = mount({ ...DRAFT, phase: 'WAITING' }, { fake: true, state: turn(30_000, ['p2']) });
      tick(m, 0);
      expect(live()).toBeEmptyDOMElement();
      tick(m, 21_000);
      tick(m, 5_000);
      expect(live()).toBeEmptyDOMElement();
    });

    it('prazo novo recomeça: o começo é anunciado de novo, mesmo com o mesmo texto', () => {
      const m = mount(DRAFT, { fake: true, state: turn(30_000) });
      tick(m, 0);
      const first = live().firstElementChild;
      expect(live()).toHaveTextContent('Sua vez: 30 segundos');
      // Outro prazo com a mesma duração restante: o texto é igual, o nó é novo.
      m.connection.now = 5_000;
      act(() => m.connection.emitState(stateMessage(scenarioAt(DRAFT).view, { seq: 2, epoch: 2, ...turn(35_000) })));
      tick(m, 0);
      expect(live()).toHaveTextContent('Sua vez: 30 segundos');
      // Um nó novo na região viva: é ele que o leitor de tela anuncia.
      expect(live().firstElementChild).not.toBe(first);
    });

    it('o texto antigo sai da região quando o prazo novo não é meu', () => {
      const m = mount(DRAFT, { fake: true, state: turn(30_000) });
      tick(m, 0);
      expect(live()).toHaveTextContent('Sua vez');
      act(() => m.connection.emitState(stateMessage(scenarioAt({ ...DRAFT, phase: 'WAITING' }).view, { seq: 2, epoch: 2, ...turn(30_000, ['p2']) })));
      tick(m, 0);
      expect(live()).toBeEmptyDOMElement();
    });

    it('prazo expirado não é anunciado', () => {
      const m = mount(DRAFT, { fake: true, state: turn(30_000) });
      tick(m, 30_000);
      expect(live()).not.toHaveTextContent('0 segundos');
    });

    describe('sem prazo (treino): a vez do jogador é anunciada pela mesma região, sem os segundos', () => {
      it.each([
        ['a fase principal', DRAFT, 'Sua vez'],
        ['a janela de reação', { ...DRAFT, phase: 'ATTACK' } satisfies ViewSpec, 'Sua reação'],
        ['o Equipar', EQUIP, 'Monte suas cartas'],
        ['a escolha da ordem', ORDER, 'Escolha a ordem'],
      ])('%s', (_name, spec, text) => {
        const m = mount(spec, { fake: true });
        tick(m, 0);
        expect(live().textContent).toBe(text);
      });

      it('com prazo o relógio anuncia, e a vez não é anunciada duas vezes', () => {
        const m = mount(DRAFT, { fake: true, state: turn(30_000) });
        tick(m, 0);
        expect(live().textContent).toBe('Sua vez: 30 segundos');
        expect(live().children).toHaveLength(1);
      });

      it('a vez do oponente não é anunciada', () => {
        const m = mount({ ...DRAFT, phase: 'WAITING' }, { fake: true });
        tick(m, 0);
        expect(live()).toBeEmptyDOMElement();
      });

      it('jogar dentro da mesma fase (mesma época) não repete o anúncio; a época nova anuncia de novo, num nó novo', () => {
        const m = mount(DRAFT, { fake: true });
        tick(m, 0);
        const first = live().firstElementChild;
        expect(first).toHaveTextContent('Sua vez');
        act(() => m.connection.emitState(stateMessage(scenarioAt(DRAFT).view, { seq: 2, epoch: 1 })));
        tick(m, 0);
        expect(live().firstElementChild).toBe(first);
        act(() => m.connection.emitState(stateMessage(scenarioAt(DRAFT).view, { seq: 3, epoch: 2 })));
        tick(m, 0);
        expect(live().textContent).toBe('Sua vez');
        expect(live().firstElementChild).not.toBe(first);
      });

      it('quando a vez passa ao oponente, o texto antigo sai da região', () => {
        const m = mount(DRAFT, { fake: true });
        tick(m, 0);
        expect(live()).toHaveTextContent('Sua vez');
        act(() => m.connection.emitState(stateMessage(scenarioAt({ ...DRAFT, phase: 'WAITING' }).view, { seq: 2, epoch: 2 })));
        tick(m, 0);
        expect(live()).toBeEmptyDOMElement();
      });
    });
  });
});

// ---------------------------------------------------------------------------------------------

describe('avisos (spec §3.9, §6.2)', () => {
  const gone = (woAt?: number): Partial<RoomMessage> => ({
    seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda', { connected: false, ...(woAt === undefined ? {} : { woAt }) })],
  });

  it('"Reconectando…" no topo, com a mesa à vista e todos os controles desligados', async () => {
    const m = mount(DRAFT);
    expect(screen.queryByText('Reconectando…')).not.toBeInTheDocument();
    act(() => m.connection.emitClosed(1006, false));
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');
    expect(screen.getByRole('region', { name: 'Seu campo' })).toBeInTheDocument();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeDisabled();
    await m.user.click(handList().getByRole('button', { name: /^A, Armadilha, de / }));
    expect(handList().getByRole('button', { name: /^A, Armadilha, de / })).toHaveAttribute('aria-pressed', 'false');
    expect(acts(m)).toEqual([]);
    // De volta, os controles voltam.
    act(() => m.connection.emit({ type: 'open' }));
    expect(screen.queryByText('Reconectando…')).not.toBeInTheDocument();
    expect(inBar().getByRole('button', { name: ATTACK_BUTTON })).toBeEnabled();
  });

  it('1008 mostra o aviso da espera longa', () => {
    const m = mount(DRAFT);
    act(() => m.connection.emitClosed(1008, false));
    expect(screen.getByRole('status')).toHaveTextContent('Muitas mensagens; reconectando em 30 s…');
  });

  it('o Passar e o Equipar também ficam desligados ao reconectar', () => {
    const reaction = mount({ ...DRAFT, phase: 'ATTACK' });
    act(() => reaction.connection.emitClosed(1006, false));
    expect(inBar().getByRole('button', { name: 'Passar' })).toBeDisabled();
    reaction.unmount();
    const equip = mount(EQUIP);
    act(() => equip.connection.emitClosed(1006, false));
    expect(dest('Fileira de Ataque')).toBeDisabled();
  });

  it('o Atacar e o Passar não mandam nada com a conexão fora', async () => {
    const m = mount(DRAFT);
    act(() => m.connection.emitClosed(1006, false));
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    expect(acts(m)).toEqual([]);
  });

  it('adversário caiu: "Duda caiu. Se não voltar em 0:43, você vence por W.O."', () => {
    mount(DRAFT, { fake: true, room: gone(43_000) });
    expect(screen.getByText('Duda caiu. Se não voltar em 0:43, você vence por W.O.')).toBeInTheDocument();
  });

  it('a contagem anda, em minutos e segundos, pelo relógio do servidor (woAt)', () => {
    const m = mount(DRAFT, { fake: true, room: gone(90_000) });
    expect(screen.getByText(/em 1:30,/)).toBeInTheDocument();
    tick(m, 31_000);
    expect(screen.getByText(/em 0:59,/)).toBeInTheDocument();
    tick(m, 59_000);
    expect(screen.getByText(/em 0:00,/)).toBeInTheDocument();
    tick(m, 5_000);
    expect(screen.getByText(/em 0:00,/)).toBeInTheDocument();
  });

  it('a contagem não é uma região viva (não é anunciada a cada segundo); o aviso fixo é', () => {
    mount(DRAFT, { fake: true, room: gone(43_000) });
    const visible = screen.getByText('Duda caiu. Se não voltar em 0:43, você vence por W.O.');
    expect(visible.closest('[aria-live]')).toBeNull();
    expect(visible.closest('[role="status"]')).toBeNull();
    const announcer = screen.getByText('Duda caiu. Se não voltar a tempo, você vence por W.O.');
    expect(announcer.closest('[role="status"]')).not.toBeNull();
    expect(announcer.className).toContain('sr-only');
  });

  it('sem woAt (ainda), só diz que caiu', () => {
    mount(DRAFT, { fake: true, room: gone() });
    // A frase aparece na faixa (escondida do leitor de tela) e na região fixa que o leitor de tela ouve.
    expect(screen.getAllByText('Duda caiu.')).toHaveLength(2);
    expect(screen.getByRole('status')).toHaveTextContent(/^Duda caiu\.$/);
    expect(screen.queryByText(/W\.O\./)).not.toBeInTheDocument();
  });

  it('a volta dele apaga o aviso e registra "Duda voltou" no histórico', () => {
    const m = mount(DRAFT, { fake: true, room: gone(43_000) });
    expect(screen.getByText(/Duda caiu. Se não voltar em/)).toBeInTheDocument();
    const history = within(screen.getByRole('complementary', { name: 'Histórico da partida' }));
    expect(history.queryByText('Duda voltou')).not.toBeInTheDocument();
    act(() =>
      m.connection.emitRoom(
        roomMessage({ status: 'PLAYING', seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda')], score: { p1: 0, p2: 0 } }),
      ),
    );
    expect(screen.queryByText(/Duda caiu/)).not.toBeInTheDocument();
    expect(history.getByText('Duda voltou')).toBeInTheDocument();
  });

  it('o aviso fica fora da partida terminada, e quem caiu não conta antes de a partida começar', () => {
    mount(DRAFT, { fake: true, room: { ...gone(43_000), status: 'FINISHED' } });
    expect(screen.queryByText(/Duda caiu/)).not.toBeInTheDocument();
  });

  it('o oponente que está na sala não gera aviso', () => {
    mount(DRAFT, { fake: true });
    expect(screen.queryByText(/caiu/)).not.toBeInTheDocument();
  });

  it('o aviso fica acima da mesa, e a mesa continua à vista', () => {
    mount(DRAFT, { fake: true, room: gone(43_000) });
    const notice = screen.getByText(/Duda caiu. Se não voltar em/);
    const field = screen.getByRole('region', { name: 'Campo de Duda' });
    expect(notice.compareDocumentPosition(field) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------------------------

describe('correções da revisão da Tarefa 20', () => {
  it('tabular-nums na linha da prévia do Atacar, na do efeito por alvo e no detalhe das fileiras do cemitério', async () => {
    const m = mount({ ...DRAFT, self: { ...DRAFT.self, resurrections: [{ row: 'ATK', value: 7 }] }, graveyard: [7, 3] });
    expect(inBar().getByText('152 × 42 · o K de Duda absorve, dano 0').className).toContain('tabular-nums');
    await m.user.click(handList().getByRole('button', { name: /^A, Armadilha, de / }));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    expect(inBar().getByText('quebrando o K: 110 de dano').className).toContain('tabular-nums');
    await m.user.keyboard('{Escape}');
    await m.user.click(inBar().getByRole('button', { name: startsWith('Ressuscitar') }));
    const dialog = screen.getByRole('dialog', { name: 'Ressuscitar' });
    await m.user.click(within(dialog).getByRole('button', { name: '7 de copas' }));
    expect(within(dialog).getByText('no fim da fileira · 5 de 7').className).toContain('tabular-nums');
  });

  it('o foco que a mesa move ao primeiro alvo não aponta nem apaga a marca; o do jogador, sim', async () => {
    // Duda não tem nenhum J; depois da minha jogada ele ganha um, que é o primeiro alvo e vem marcado.
    const base = { ...DRAFT, opponent: { ...DRAFT.opponent, attackBuffs: [] } } satisfies ViewSpec;
    const m = mount(base);
    await m.user.click(inBar().getByRole('button', { name: ATTACK_BUTTON }));
    const next = scenarioAt({ ...DRAFT, opponent: { ...DRAFT.opponent, attackBuffs: ['J'] } }).view;
    act(() => m.connection.emitState(stateMessage(next, { seq: 2, epoch: 2 })));
    const fresh = next.opponent.attackBuffs[0]!;
    expect(screen.getByRole('img', { name: /^J de .+, novo$/ })).toHaveAttribute('data-card-id', fresh.id);
    const markSeen = vi.spyOn(m.session, 'markSeen');

    await m.user.click(handList().getByRole('button', { name: /^A, Armadilha, de / }));
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    const first = within(inBar().getByRole('list', { name: 'Alvos' })).getAllByRole('button')[0]!;
    expect(first).toHaveFocus();
    expect(markSeen).not.toHaveBeenCalled();
    expect(inBar().queryByText('Quebrando o J antes')).not.toBeInTheDocument();
    // Na mesa o J virou alvo (botão), ainda marcado.
    expect(screen.getByRole('button', { name: /^J de .+, alvo possível, novo$/ })).toBeInTheDocument();

    // O jogador passa o mouse por cima: aí sim.
    await m.user.hover(first);
    expect(markSeen).toHaveBeenCalledWith(fresh.id);
    expect(inBar().getByText('Quebrando o J antes')).toBeInTheDocument();
  });

  it('Esc e Cancelar devolvem o foco à carta da mão que abriu a escolha', async () => {
    const m = mount();
    const card = () => handList().getByRole('button', { name: /^A, Armadilha, de / });
    await m.user.click(card());
    expect(inBar().getByRole('button', { name: 'Armadilha' })).toHaveFocus();
    await m.user.keyboard('{Escape}');
    expect(card()).toHaveFocus();
    await m.user.click(card());
    await m.user.click(inBar().getByRole('button', { name: 'Cancelar' }));
    expect(card()).toHaveFocus();
    // E também do passo do alvo.
    await m.user.click(card());
    await m.user.click(inBar().getByRole('button', { name: 'Armadilha' }));
    await m.user.keyboard('{Escape}');
    expect(card()).toHaveFocus();
  });

  it('a carta que sai da mão leva a escolha junto: o Esc não tem mais o que cancelar', async () => {
    const m = mount();
    await m.user.click(handList().getByRole('button', { name: /^A, Armadilha, de / }));
    const without = scenarioAt({ ...DRAFT, self: { ...DRAFT.self, hand: ['K', 'Q'] } }).view;
    act(() => m.connection.emitState(stateMessage(without, { seq: 2, epoch: 1 })));
    await m.user.keyboard('{Escape}');
    // O retorno do foco à barra (quando a carta já não está na mão) é só defesa: sem carta não há escolha nem Esc ouvido.
    expect(handList().queryByRole('button', { name: /^A, Armadilha, de / })).not.toBeInTheDocument();
    expect(document.querySelectorAll('[aria-pressed="true"]')).toHaveLength(0);
  });

  it('pickCards não descarta ids em silêncio: com uma carta faltando, não há combinação', () => {
    const own = new Map<string, SpecialCard>([
      ['a', { id: 'a', kind: 'K', suit: 'paus' }],
      ['b', { id: 'b', kind: 'J', suit: 'copas' }],
    ]);
    expect(pickCards(own, ['a', 'b'])?.map((c) => c.id)).toEqual(['a', 'b']);
    expect(pickCards(own, ['a', 'z'])).toBeNull();
    expect(pickCards(own, [])).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------

describe('acessibilidade (axe) das fases', () => {
  it('Equipar: escolhendo, com o rascunho, e esperando', async () => {
    const m = mount({ ...EQUIP, self: { ...EQUIP.self, attackRow: [7, 7, 7, 2] } });
    expect(await seriousViolations(m.container)).toEqual([]);
    await choose(m, 'Fileira de Ataque');
    expect(await seriousViolations(m.container)).toEqual([]);
    await choose(m, 'Fileira de Defesa', 'Fileira de Defesa');
    expect(await seriousViolations(m.container)).toEqual([]);
    await m.user.click(inEquip().getByRole('button', { name: 'Confirmar' }));
    expect(await seriousViolations(m.container)).toEqual([]);
  });

  it('Equipar: com as fileiras cheias, sem numéricas e já confirmado', async () => {
    const full = mount(FULL);
    expect(await seriousViolations(full.container)).toEqual([]);
    full.unmount();
    const none = mount({ ...EQUIP, self: { ...EQUIP.self, pending: [] } });
    expect(await seriousViolations(none.container)).toEqual([]);
    none.unmount();
    const earlier = mount({ ...EQUIP, self: { ...EQUIP.self, equipSubmitted: true } });
    expect(await seriousViolations(earlier.container)).toEqual([]);
  });

  it('ordem: escolhendo (com a barra) e esperando o outro', async () => {
    const m = mount(ORDER);
    expect(await seriousViolations(m.container)).toEqual([]);
    m.unmount();
    const other = mount({ ...DRAFT, initiative: 'opponent', phase: { kind: 'ORDER_CHOICE', player: 'p2' } });
    expect(await seriousViolations(other.container)).toEqual([]);
  });

  it('reação: quem responde, quem espera e o passe automático', async () => {
    const m = mount({ ...DRAFT, phase: 'ATTACK' }, { state: { deadline: deadline('REACTION', 8_000) } });
    expect(await seriousViolations(m.container)).toEqual([]);
    m.unmount();
    const waiter = mount(
      { ...DRAFT, phase: { kind: 'REACTION', responder: 'p2', trigger: 'ATTACK' } },
      { state: { deadline: deadline('REACTION', 8_000, ['p2']), pausedTurnMs: 21_000 } },
    );
    expect(await seriousViolations(waiter.container)).toEqual([]);
    waiter.unmount();
    const auto = mount({ ...DRAFT, phase: 'ATTACK', self: { ...DRAFT.self, hand: ['K', 'Q'] } });
    expect(await seriousViolations(auto.container)).toEqual([]);
  });

  it('relógio em urgência e esgotado, e os avisos de conexão e de queda', async () => {
    const urgent = mount(DRAFT, { state: { deadline: deadline('TURN', 4_000) } });
    expect(await seriousViolations(urgent.container)).toEqual([]);
    urgent.unmount();
    const expired = mount(DRAFT, { state: { deadline: deadline('TURN', 0) } });
    expect(await screen.findByText('Tempo esgotado')).toBeInTheDocument();
    expect(await seriousViolations(expired.container)).toEqual([]);
    expired.unmount();
    const dropped = mount(DRAFT, {
      room: { seats: [seatOf('p1', 'André'), seatOf('p2', 'Duda', { connected: false, woAt: 43_000 })] },
    });
    act(() => dropped.connection.emitClosed(1006, false));
    expect(await seriousViolations(dropped.container)).toEqual([]);
  });
});
