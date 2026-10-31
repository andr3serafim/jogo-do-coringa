// Fim de partida, revanche e menu da partida (spec §2.4, §2.5, §7). A mesa é a `PlayTable` sobre uma `Session` de
// verdade com uma `FakeConnection`; o painel de fim e o menu são `<dialog>` nativos. O jsdom não prende o foco nem
// fecha com Esc sozinho (veja `setup-ui.ts`): aqui se confere que o foco entra no diálogo, que ele volta a quem abriu e
// que `showModal` foi usado (é ele que prende o foco no navegador); o foco preso de verdade fica para o E2E.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { GameResult, PlayerId } from '@coringa/engine';
import type { Outcome, OutcomeCause, RoomMessage, RoomStatus, Score } from '@coringa/protocol';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../src/app/App.tsx';
import { fetchVersion } from '../../src/app/health.ts';
import { createRoomApi } from '../../src/app/room-api.ts';
import { RULES_SECTIONS } from '../../src/model/copy.ts';
import { Session } from '../../src/model/session.ts';
import { loadPrefs, safeStore, saveSeat, type Prefs } from '../../src/model/storage.ts';
import { EndPanel, type EndPanelProps } from '../../src/ui/table/EndPanel.tsx';
import { PlayTable, type PlayTableProps } from '../../src/ui/table/PlayTable.tsx';
import { Table } from '../../src/ui/table/Table.tsx';
import { FakeConnection, scenarioAt, stateMessage, type ViewSpec } from '../fixtures.ts';
import { advance, cleanup as cleanupAnim, connect, emit, EXODIA, EXODIA_OVER, THEIRS } from './anim-harness.tsx';
import { CODE, memoryStore, roomMessage, seat, seriousViolations } from './support.tsx';

afterEach(() => {
  cleanupAnim();
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.history.replaceState(null, '', '/');
});

const win = (winner: PlayerId, reason: Extract<GameResult, { kind: 'WIN' }>['reason']): GameResult => ({
  kind: 'WIN',
  winner,
  reason,
});

interface MountOptions {
  me?: PlayerId;
  status?: RoomStatus;
  /** `null`: partida sem resultado (`ABANDONED`). */
  result?: GameResult | null;
  cause?: OutcomeCause;
  /** A duração que o servidor mandou no `outcome` (U5). */
  durationMs?: number;
  gameNo?: number;
  score?: Score;
  /** Eu pedi revanche. */
  mineWants?: boolean;
  /** Duda pediu revanche. */
  theirsWants?: boolean;
  /** Duda está fora da sala. */
  theirsAway?: boolean;
  prefs?: Partial<Prefs>;
  props?: Partial<PlayTableProps>;
  /** Fase da mesa quando a partida está em curso (padrão: a minha vez). */
  spec?: ViewSpec;
  /** Sob `<StrictMode>`, como o `pnpm dev` (monta, desmonta e monta de novo os efeitos). */
  strict?: boolean;
}

const FINISHED_RESULT = win('p1', 'HP');

/** O `room` de um cenário; o teste o reemite com `extra` para simular o servidor. */
function roomOf(options: MountOptions, extra: MountOptions = {}): RoomMessage {
  const o = { ...options, ...extra };
  const me = o.me ?? 'p1';
  const other = me === 'p1' ? 'p2' : 'p1';
  const mine = { playerId: me, nickname: 'André', connected: true, ready: false, wantsRematch: o.mineWants ?? false };
  const theirs = {
    playerId: other,
    nickname: 'Duda',
    connected: !(o.theirsAway ?? false),
    ready: false,
    wantsRematch: o.theirsWants ?? false,
  };
  const status = o.status ?? 'FINISHED';
  const room = roomMessage({
    status,
    gameNo: o.gameNo ?? 1,
    seats: me === 'p1' ? [mine, theirs] : [theirs, mine],
    score: o.score ?? { p1: 0, p2: 0 },
  });
  if (status === 'FINISHED') {
    const outcome: Outcome = {
      gameNo: o.gameNo ?? 1,
      result: o.result === undefined ? FINISHED_RESULT : o.result,
      cause: o.cause ?? 'NORMAL',
      ...(o.durationMs === undefined ? {} : { durationMs: o.durationMs }),
    };
    room.outcome = outcome;
  }
  return room;
}

function viewOf(options: MountOptions) {
  const me = options.me ?? 'p1';
  const status = options.status ?? 'FINISHED';
  const result = options.result === undefined ? FINISHED_RESULT : options.result;
  if (status === 'FINISHED' && result !== null) return scenarioAt({ me, phase: { kind: 'GAME_OVER', result } }).view;
  return scenarioAt({ me, ...options.spec }).view;
}

function mount(options: MountOptions = {}) {
  const me = options.me ?? 'p1';
  const connection = new FakeConnection({
    playerId: me,
    room: roomOf(options),
    state: stateMessage(viewOf(options)),
    now: 0,
  });
  const store = memoryStore();
  const session = new Session(
    connection,
    { now: () => 0, setTimer: () => 0, clearTimer: () => undefined },
    { autoPass: true, reduceMotion: false, sound: true, ...options.prefs },
  );
  const user = userEvent.setup();
  const onNewRoom = vi.fn();
  const table = <PlayTable session={session} store={store} onNewRoom={onNewRoom} {...options.props} />;
  const rendered = render(options.strict ? <StrictMode>{table}</StrictMode> : table);
  /** O servidor reemite a sala. */
  const push = (extra: MountOptions) => act(() => connection.emitRoom(roomOf(options, extra)));
  return { connection, session, store, user, onNewRoom, push, ...rendered };
}

type Mounted = ReturnType<typeof mount>;

const endDialog = (name: string) => screen.getByRole('dialog', { name });
const menuDialog = () => screen.getByRole('dialog', { name: 'Menu da partida' });
/** O botão do menu existe duas vezes (celular e PC); o CSS esconde um deles, e o jsdom não tem CSS. */
const menuButton = () => screen.getAllByRole('button', { name: 'Menu da partida' })[0]!;
const calls = (m: Mounted) => m.connection.calls.filter((call) => call.startsWith('rematch'));

// ---------------------------------------------------------------------------------------------
// Fim de partida (spec §2.5)

describe('fim de partida: o resultado e o motivo', () => {
  const CASES: Array<{
    name: string;
    options: MountOptions;
    title: string;
    reason: string;
  }> = [
    { name: 'vida zerada, eu venci', options: { result: win('p1', 'HP') }, title: 'Você venceu', reason: 'A vida de Duda chegou a 0' },
    { name: 'vida zerada, Duda venceu', options: { result: win('p2', 'HP') }, title: 'Duda venceu', reason: 'Sua vida chegou a 0' },
    { name: 'Exódia, eu venci', options: { result: win('p1', 'EXODIA') }, title: 'Você venceu', reason: 'Você montou a Exódia' },
    { name: 'Exódia, Duda venceu', options: { result: win('p2', 'EXODIA') }, title: 'Duda venceu', reason: 'Duda montou a Exódia' },
    {
      name: 'Duda caiu e não voltou (RECONNECT_TIMEOUT)',
      options: { result: win('p1', 'FORFEIT'), cause: 'RECONNECT_TIMEOUT' },
      title: 'Você venceu',
      reason: 'Duda caiu e não voltou em 60 s',
    },
    {
      name: 'eu caí e não voltei (RECONNECT_TIMEOUT)',
      options: { result: win('p2', 'FORFEIT'), cause: 'RECONNECT_TIMEOUT' },
      title: 'Duda venceu',
      reason: 'Você caiu e não voltou em 60 s',
    },
    {
      name: 'Duda estourou três tempos (AFK)',
      options: { result: win('p1', 'FORFEIT'), cause: 'AFK' },
      title: 'Você venceu',
      reason: 'Duda estourou o tempo três vezes seguidas',
    },
    {
      name: 'eu estourei três tempos (AFK)',
      options: { result: win('p2', 'FORFEIT'), cause: 'AFK' },
      title: 'Duda venceu',
      reason: 'Você estourou o tempo três vezes seguidas',
    },
    {
      name: 'Duda desistiu (CONCEDE)',
      options: { result: win('p1', 'FORFEIT'), cause: 'CONCEDE' },
      title: 'Você venceu',
      reason: 'Duda desistiu',
    },
    {
      name: 'eu desisti (CONCEDE)',
      options: { result: win('p2', 'FORFEIT'), cause: 'CONCEDE' },
      title: 'Duda venceu',
      reason: 'Você desistiu',
    },
    {
      name: 'os dois saíram (ABANDONED)',
      options: { result: null, cause: 'ABANDONED' },
      title: 'Partida sem resultado',
      reason: 'Os dois saíram da sala',
    },
    {
      name: 'sou o p2: a frase é minha, não do p1',
      options: { me: 'p2', result: win('p2', 'HP') },
      title: 'Você venceu',
      reason: 'A vida de Duda chegou a 0',
    },
  ];

  it.each(CASES)('$name', ({ options, title, reason }) => {
    mount(options);
    const dialog = endDialog(title);
    expect(within(dialog).getByText(reason)).toBeInTheDocument();
    expect(dialog).toHaveAccessibleDescription(reason);
  });

  it('mostra o placar da sala do meu ponto de vista (sem empates: o anti-travamento saiu)', () => {
    mount({ score: { p1: 2, p2: 1 } });
    expect(within(endDialog('Você venceu')).getByText('André 2 × 1 Duda')).toBeInTheDocument();
  });

  it('o placar do p2 vem invertido', () => {
    mount({ me: 'p2', result: win('p2', 'HP'), score: { p1: 2, p2: 3 } });
    expect(within(endDialog('Você venceu')).getByText('André 3 × 2 Duda')).toBeInTheDocument();
  });

  it('os números do placar usam a fonte de texto com algarismos tabulares', () => {
    mount();
    expect(within(endDialog('Você venceu')).getByText('André 0 × 0 Duda')).toHaveClass('tabular-nums');
  });

  it('o painel abre como diálogo modal (showModal) e o foco entra nele', () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    mount();
    expect(showModal).toHaveBeenCalled();
    expect(endDialog('Você venceu').contains(document.activeElement)).toBe(true);
  });

  it('a mesa final continua na tela, por baixo do painel', () => {
    mount();
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
  });

  it('em partida em curso não há painel de fim', () => {
    mount({ status: 'PLAYING' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Fim da partida')).not.toBeInTheDocument();
  });

  it('FINISHED sem outcome ainda não desenha o painel', () => {
    const m = mount();
    const room = roomOf({});
    delete room.outcome;
    act(() => m.connection.emitRoom(room));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('o resultado é grande, com a exclamação só no desenho (o nome do diálogo segue "Você venceu"), e sobre o estouro (U5)', () => {
    mount({ result: win('p1', 'HP') });
    const heading = within(endDialog('Você venceu')).getByRole('heading', { name: 'Você venceu' });
    expect(heading).toHaveTextContent('Você venceu!');
    expect(heading.className).toContain('font-madeira');
    expect(heading.closest('[data-resultado]')!.querySelector('[data-estouro]')).not.toBeNull();
  });

  it('sem resultado, sem exclamação', () => {
    mount({ result: null, cause: 'ABANDONED' });
    expect(within(endDialog('Partida sem resultado')).getByRole('heading')).toHaveTextContent(/^Partida sem resultado$/);
  });

  it('mostra a duração da partida que o servidor mandou, e nada quando ela não vem', () => {
    const m = mount({ result: win('p2', 'HP'), durationMs: 754_000 });
    expect(within(endDialog('Duda venceu')).getByText('12:34')).toHaveAttribute('data-duracao');
    m.unmount();
    mount({ result: win('p2', 'HP') });
    expect(document.querySelector('[data-duracao]')).toBeNull();
  });

  it('espera as batidas do último golpe: o painel só chega depois da cena da Exódia', () => {
    const m = connect(THEIRS);
    render(<PlayTable session={m.session} />);
    emit(m, EXODIA_OVER, [EXODIA]);
    act(() =>
      m.connection.emitRoom(
        roomMessage({
          status: 'FINISHED',
          seats: [
            { playerId: 'p1', nickname: 'André', connected: true, ready: false, wantsRematch: false },
            { playerId: 'p2', nickname: 'Duda', connected: true, ready: false, wantsRematch: false },
          ],
          outcome: { gameNo: 1, result: win('p2', 'EXODIA'), cause: 'NORMAL' },
        }),
      ),
    );
    // A cena da Exódia ainda toca: o painel não a cobre.
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    advance(2_000);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // A cena da Exódia é longa (U3): 4,2 s.
    advance(2_400);
    expect(screen.getByRole('dialog', { name: 'Duda venceu' })).toBeInTheDocument();
  });
});

describe('revanche', () => {
  it('"Revanche" pede a revanche e o botão só marca quando o servidor confirma', async () => {
    const m = mount();
    const button = within(endDialog('Você venceu')).getByRole('button', { name: 'Revanche' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    await m.user.click(button);
    expect(calls(m)).toEqual(['rematch:true']);
    expect(button).toHaveAttribute('aria-pressed', 'false');
    m.push({ mineWants: true });
    expect(within(endDialog('Você venceu')).getByRole('button', { name: 'Revanche' })).toHaveAttribute('aria-pressed', 'true');
    expect(within(endDialog('Você venceu')).getByText('esperando Duda')).toBeInTheDocument();
  });

  it('com a revanche pedida, o botão alterna e retira o pedido', async () => {
    const m = mount({ mineWants: true });
    await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Revanche' }));
    expect(calls(m)).toEqual(['rematch:false']);
  });

  it('com Duda pedindo, mostra "Duda quer revanche"', () => {
    mount({ theirsWants: true });
    const dialog = endDialog('Você venceu');
    expect(within(dialog).getByText('Duda quer revanche')).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: 'Revanche' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('sem pedido nenhum não há texto de estado', () => {
    mount();
    const dialog = endDialog('Você venceu');
    expect(within(dialog).queryByText(/esperando|quer revanche|saiu da sala/)).not.toBeInTheDocument();
  });

  it('Duda fora da sala: avisa, e o pedido espera ele voltar', () => {
    const m = mount({ theirsAway: true });
    expect(within(endDialog('Você venceu')).getByText('Duda saiu da sala')).toBeInTheDocument();
    m.push({ theirsAway: true, mineWants: true });
    expect(within(endDialog('Você venceu')).getByText('esperando Duda voltar')).toBeInTheDocument();
  });

  it('o estado da revanche é uma região viva', () => {
    mount({ theirsWants: true });
    expect(within(endDialog('Você venceu')).getByRole('status')).toHaveTextContent('Duda quer revanche');
  });

  it('com a conexão caída o botão fica desligado', () => {
    const m = mount();
    act(() => m.connection.emitClosed(1006));
    expect(within(endDialog('Você venceu')).getByRole('button', { name: 'Revanche' })).toBeDisabled();
  });

  it('quando a nova partida começa (status volta a PLAYING), o painel some', () => {
    const m = mount({ mineWants: true, theirsWants: true });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    act(() => {
      m.connection.emitRoom(roomOf({}, { status: 'PLAYING', gameNo: 2 }));
      m.connection.emitState(stateMessage(scenarioAt({ me: 'p1' }).view, { seq: 5, epoch: 5 }));
    });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByRole('region', { name: 'Resultado da partida' })).not.toBeInTheDocument();
  });
});

describe('fim de partida: Ver a mesa e Nova sala', () => {
  it('"Ver a mesa" recolhe o painel numa faixa que diz o resultado e o estado da revanche', async () => {
    const m = mount({ theirsWants: true });
    await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    const strip = screen.getByRole('region', { name: 'Resultado da partida' });
    expect(within(strip).getByText('Você venceu')).toBeInTheDocument();
    expect(within(strip).getByText('Duda quer revanche')).toBeInTheDocument();
    expect(within(strip).getByRole('button', { name: 'Mostrar o resultado' })).toHaveFocus();
  });

  it('"Mostrar o resultado" abre o painel de novo, e a revanche continua ao alcance', async () => {
    const m = mount();
    await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
    await m.user.click(screen.getByRole('button', { name: 'Mostrar o resultado' }));
    expect(screen.queryByRole('region', { name: 'Resultado da partida' })).not.toBeInTheDocument();
    await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Revanche' }));
    expect(calls(m)).toEqual(['rematch:true']);
  });

  it('Esc recolhe o painel, como "Ver a mesa"', async () => {
    const m = mount();
    await m.user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Resultado da partida' })).toBeInTheDocument();
  });

  it('o recolhimento vale para uma partida só: o fim da próxima abre o painel de novo', async () => {
    const m = mount();
    await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
    act(() => {
      m.connection.emitRoom(roomOf({}, { status: 'PLAYING', gameNo: 2 }));
      m.connection.emitState(stateMessage(scenarioAt({ me: 'p1' }).view, { seq: 5, epoch: 5 }));
    });
    act(() => {
      m.connection.emitRoom(roomOf({}, { gameNo: 2, result: win('p2', 'HP') }));
      m.connection.emitState(stateMessage(viewOf({ result: win('p2', 'HP') }), { seq: 9, epoch: 9 }));
    });
    expect(screen.getByRole('dialog', { name: 'Duda venceu' })).toBeInTheDocument();
  });

  it('"Nova sala" chama onNewRoom', async () => {
    const m = mount();
    await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Nova sala' }));
    expect(m.onNewRoom).toHaveBeenCalledTimes(1);
  });

  it('sem onNewRoom, o botão "Nova sala" não existe', () => {
    mount({ props: { onNewRoom: undefined } });
    expect(within(endDialog('Você venceu')).queryByRole('button', { name: 'Nova sala' })).not.toBeInTheDocument();
  });

  it('o rótulo do botão é configurável (treino: "Voltar ao início"), e o botão chama onNewRoom do mesmo jeito', async () => {
    const m = mount({ props: { newRoomLabel: 'Voltar ao início' } });
    const dialog = endDialog('Você venceu');
    expect(within(dialog).queryByRole('button', { name: 'Nova sala' })).not.toBeInTheDocument();
    await m.user.click(within(dialog).getByRole('button', { name: 'Voltar ao início' }));
    expect(m.onNewRoom).toHaveBeenCalledTimes(1);
  });

  describe('o `note` (o tutorial põe a dica do fim aqui)', () => {
    const panel: EndPanelProps = {
      outcome: { gameNo: 1, result: win('p1', 'HP'), cause: 'NORMAL' },
      score: { p1: 1, p2: 0 },
      me: 'p1',
      names: { self: 'André', opponent: 'Duda' },
      mineWants: false,
      theirsWants: false,
      away: false,
      disabled: false,
      onRematch: () => undefined,
    };

    it('entra dentro do diálogo, entre o placar e os botões', () => {
      render(<EndPanel {...panel} note={<p data-nota>uma nota do diálogo</p>} />);
      const dialog = endDialog('Você venceu');
      const note = within(dialog).getByText('uma nota do diálogo');
      expect(dialog).toContainElement(note);
      const score = within(dialog).getByText('Placar').closest('p')!;
      const rematch = within(dialog).getByRole('button', { name: 'Revanche' });
      expect(score.compareDocumentPosition(note) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(note.compareDocumentPosition(rematch) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });

    it('sem `note` o painel é o de sempre (treino e sala online): nada a mais no diálogo', () => {
      const { rerender } = render(<EndPanel {...panel} />);
      const before = endDialog('Você venceu').innerHTML;
      rerender(<EndPanel {...panel} note={undefined} />);
      expect(endDialog('Você venceu').innerHTML).toBe(before);
      expect(endDialog('Você venceu').querySelector('[data-nota]')).toBeNull();
    });

    it('a nota entra na descrição do diálogo: o leitor de tela lê o motivo e a nota ao abrir', () => {
      render(<EndPanel {...panel} note={<p>uma nota do diálogo</p>} />);
      const dialog = endDialog('Você venceu');
      const ids = dialog.getAttribute('aria-describedby')?.split(' ') ?? [];
      expect(ids).toHaveLength(2);
      const [reason, note] = ids.map((id) => document.getElementById(id));
      expect(reason).toHaveTextContent('A vida de Duda chegou a 0');
      expect(note).toHaveTextContent('uma nota do diálogo');
      expect(dialog).toContainElement(note);
      // Resolvido como o navegador faz: a descrição acessível junta os dois.
      expect(dialog).toHaveAccessibleDescription(/A vida de Duda chegou a 0.*uma nota do diálogo/);
    });

    it('sem `note` a descrição é só o motivo (treino e sala online)', () => {
      render(<EndPanel {...panel} />);
      const dialog = endDialog('Você venceu');
      const ids = dialog.getAttribute('aria-describedby')?.split(' ') ?? [];
      expect(ids).toHaveLength(1);
      expect(document.getElementById(ids[0]!)).toHaveTextContent('A vida de Duda chegou a 0');
      expect(dialog).toHaveAccessibleDescription('A vida de Duda chegou a 0');
    });

    it('recolhido ("Ver a mesa"), a nota sai junto com o diálogo', async () => {
      const user = userEvent.setup();
      render(<EndPanel {...panel} note={<p>uma nota do diálogo</p>} />);
      await user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
      expect(screen.queryByText('uma nota do diálogo')).not.toBeInTheDocument();
    });
  });

  describe('"Rever a partida"', () => {
    const panel: EndPanelProps = {
      outcome: { gameNo: 1, result: win('p1', 'HP'), cause: 'NORMAL' },
      score: { p1: 1, p2: 0 },
      me: 'p1',
      names: { self: 'André', opponent: 'Duda' },
      mineWants: false,
      theirsWants: false,
      away: false,
      disabled: false,
      onRematch: () => undefined,
    };

    it('só existe com onReview, e o clique o chama', async () => {
      const user = userEvent.setup();
      const onReview = vi.fn();
      const { rerender } = render(<EndPanel {...panel} />);
      expect(within(endDialog('Você venceu')).queryByRole('button', { name: 'Rever a partida' })).not.toBeInTheDocument();

      rerender(<EndPanel {...panel} onReview={onReview} />);
      await user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Rever a partida' }));
      expect(onReview).toHaveBeenCalledTimes(1);
    });

    it('com o botão no painel, a Revanche continua um clique só e o axe não acha violações sérias', async () => {
      const user = userEvent.setup();
      const onRematch = vi.fn();
      render(<EndPanel {...panel} onReview={() => undefined} onRematch={onRematch} />);
      const dialog = endDialog('Você venceu');
      await user.click(within(dialog).getByRole('button', { name: 'Revanche' }));
      expect(onRematch).toHaveBeenCalledWith(true);
      expect(await seriousViolations(dialog)).toEqual([]);
    });
  });
});

// ---------------------------------------------------------------------------------------------
// Na sala de verdade (App → RoomGate → PlayTable), com a `RoomApi` de verdade sobre uma conexão falsa

describe('na sala (RoomGate): Nova sala, link e versão', () => {
  function realRoom(fetchImpl?: typeof fetch) {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.history.replaceState(null, '', `/s/${CODE}`);
    const store = safeStore(window.localStorage).store;
    saveSeat(store, CODE, seat());
    const made: FakeConnection[] = [];
    const api = createRoomApi({
      store,
      server: 'http://localhost:3000',
      fetchImpl,
      makeClient: () => {
        const connection = new FakeConnection({
          playerId: 'p1',
          room: roomOf({}),
          state: stateMessage(viewOf({})),
        });
        made.push(connection);
        return connection;
      },
    });
    const user = userEvent.setup();
    const rendered = render(<App api={api} />);
    return { made, user, ...rendered };
  }

  it('"Nova sala" volta ao início, solta a sessão e fecha a conexão', async () => {
    const { made, user } = realRoom();
    await user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Nova sala' }));
    expect(window.location.pathname).toBe('/');
    expect(screen.getByRole('heading', { name: 'Jogo do Coringa' })).toBeInTheDocument();
    expect(screen.queryByRole('main', { name: 'Mesa' })).not.toBeInTheDocument();
    expect(made[0]!.calls).toContain('close');
  });

  it('o menu copia o link da sala e mostra a versão que /api/health devolve', async () => {
    const fetchImpl = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true, version: '9.9.9' }))));
    const { user } = realRoom(fetchImpl);
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    await user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
    expect(fetchImpl).not.toHaveBeenCalled();
    await user.click(menuButton());
    expect(await within(menuDialog()).findByText('Versão publicada: 9.9.9')).toBeInTheDocument();
    expect(fetchImpl).toHaveBeenCalledExactlyOnceWith('http://localhost:3000/api/health');
    await user.click(within(menuDialog()).getByRole('button', { name: 'Copiar link da sala' }));
    expect(writeText).toHaveBeenCalledWith(`${window.location.origin}/s/${CODE}`);
  });

  it('as preferências do menu vão para o coringa:prefs do navegador', async () => {
    const { user } = realRoom();
    await user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
    await user.click(menuButton());
    await user.click(within(menuDialog()).getByRole('switch', { name: 'Passar sozinho quando não tenho resposta' }));
    expect(JSON.parse(window.localStorage.getItem('coringa:prefs')!)).toEqual({ autoPass: false, reduceMotion: false, sound: true });
  });
});

// ---------------------------------------------------------------------------------------------
// Menu da partida (spec §2.4)

describe('menu da partida', () => {
  it('fica fechado até o botão; o botão abre um diálogo modal e o foco entra nele', async () => {
    const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
    const m = mount({ status: 'PLAYING' });
    expect(screen.queryByRole('dialog', { name: 'Menu da partida' })).not.toBeInTheDocument();
    await m.user.click(menuButton());
    expect(showModal).toHaveBeenCalledTimes(1);
    expect(menuDialog().contains(document.activeElement)).toBe(true);
  });

  it('o botão do menu tem alvo de toque de 44 px e anuncia que abre um diálogo', () => {
    mount({ status: 'PLAYING' });
    expect(menuButton()).toHaveAttribute('aria-haspopup', 'dialog');
    expect(menuButton().className).toContain('size-11');
  });

  it('fechar devolve o foco ao botão que abriu', async () => {
    const m = mount({ status: 'PLAYING' });
    const opener = menuButton();
    await m.user.click(opener);
    await m.user.click(within(menuDialog()).getByRole('button', { name: 'Fechar' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it('Esc fecha o menu', async () => {
    const m = mount({ status: 'PLAYING' });
    await m.user.click(menuButton());
    await m.user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  describe('treino', () => {
    it('com onExit, o menu ganha "Sair do treino", que chama onExit; sem ele, o item não existe', async () => {
      const onExit = vi.fn();
      const m = mount({ status: 'PLAYING', props: { onExit } });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Sair do treino' }));
      expect(onExit).toHaveBeenCalledTimes(1);
      m.unmount();

      const online = mount({ status: 'PLAYING' });
      await online.user.click(menuButton());
      expect(within(menuDialog()).queryByRole('button', { name: 'Sair do treino' })).not.toBeInTheDocument();
    });

    it('o aviso de desistir é configurável (treino: sem W.O.); online segue com o W.O.', async () => {
      const m = mount({ status: 'PLAYING', props: { concedeWarning: 'Você perde esta partida.' } });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Desistir' }));
      expect(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByText('Você perde esta partida.')).toBeInTheDocument();
      m.unmount();

      const online = mount({ status: 'PLAYING' });
      await online.user.click(menuButton());
      await online.user.click(within(menuDialog()).getByRole('button', { name: 'Desistir' }));
      expect(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByText('Você perde esta partida por W.O.')).toBeInTheDocument();
    });

    it.each([
      ['facil', 'Fácil'],
      ['medio', 'Médio'],
      ['dificil', 'Difícil'],
    ] as const)('a faixa central diz "Treino · %s, sem relógio" e o menu "Treino · %s" no treino, e só nele', async (level, name) => {
      const m = mount({ status: 'PLAYING', props: { training: level } });
      const band = screen.getByRole('region', { name: 'Situação da rodada' });
      expect(within(band).getByText(`Treino · ${name}, sem relógio`)).toBeInTheDocument();
      expect(within(band).queryByRole('timer')).not.toBeInTheDocument();
      await m.user.click(menuButton());
      expect(within(menuDialog()).getByText(`Treino · ${name}`)).toBeInTheDocument();
      m.unmount();
      const online = mount({ status: 'PLAYING' });
      expect(screen.queryByText(/^Treino/)).not.toBeInTheDocument();
      await online.user.click(menuButton());
      expect(within(menuDialog()).queryByText(/^Treino/)).not.toBeInTheDocument();
    });
  });

  it('a mesa só para ver (sem onOpenMenu) não tem botão de menu', () => {
    const connection = new FakeConnection({ room: roomOf({}), state: stateMessage(viewOf({})) });
    const session = new Session(connection, { now: () => 0, setTimer: () => 0, clearTimer: () => undefined });
    render(<Table snapshot={session.snapshot()} remainingMs={() => 0} />);
    expect(screen.queryByRole('button', { name: 'Menu da partida' })).not.toBeInTheDocument();
  });

  describe('copiar o link', () => {
    const LINK = `http://localhost:3000/s/${CODE}`;

    it('escreve o link da sala na área de transferência e avisa', async () => {
      const m = mount({ status: 'PLAYING', props: { inviteLink: LINK } });
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Copiar link da sala' }));
      expect(writeText).toHaveBeenCalledWith(LINK);
      expect(await within(menuDialog()).findByText('Link copiado')).toBeInTheDocument();
    });

    it('sem área de transferência, manda copiar à mão', async () => {
      const m = mount({ status: 'PLAYING', props: { inviteLink: LINK } });
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Copiar link da sala' }));
      expect(await within(menuDialog()).findByText(/Não deu para copiar/)).toBeInTheDocument();
    });

    it('sem link (treino), o botão não existe', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      expect(within(menuDialog()).queryByRole('button', { name: 'Copiar link da sala' })).not.toBeInTheDocument();
    });
  });

  describe('as chaves gravam as preferências', () => {
    const autoPass = () => within(menuDialog()).getByRole('switch', { name: 'Passar sozinho quando não tenho resposta' });
    const reduce = () => within(menuDialog()).getByRole('switch', { name: 'Reduzir animações' });

    it('"Passar sozinho" vem ligada; desligar grava autoPass: false na sessão e no armazenamento', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      expect(autoPass()).toBeChecked();
      await m.user.click(autoPass());
      expect(autoPass()).not.toBeChecked();
      expect(m.session.snapshot().prefs).toEqual({ autoPass: false, reduceMotion: false, sound: true });
      expect(loadPrefs(m.store)).toEqual({ autoPass: false, reduceMotion: false, sound: true });
    });

    it('ligar de novo grava autoPass: true', async () => {
      const m = mount({ status: 'PLAYING', prefs: { autoPass: false } });
      await m.user.click(menuButton());
      expect(autoPass()).not.toBeChecked();
      await m.user.click(autoPass());
      expect(loadPrefs(m.store).autoPass).toBe(true);
    });

    it('"Reduzir animações" grava reduceMotion e mantém o passe automático', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      expect(reduce()).not.toBeChecked();
      await m.user.click(reduce());
      expect(reduce()).toBeChecked();
      expect(loadPrefs(m.store)).toEqual({ autoPass: true, reduceMotion: true, sound: true });
      expect(m.session.snapshot().prefs.reduceMotion).toBe(true);
    });

    it('com o sistema pedindo menos movimento, a chave aparece ligada e travada, com o motivo', async () => {
      vi.stubGlobal('matchMedia', (query: string) => ({
        matches: true,
        media: query,
        addEventListener: () => undefined,
        removeEventListener: () => undefined,
      }));
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      expect(reduce()).toBeChecked();
      expect(reduce()).toBeDisabled();
      expect(reduce()).toHaveAccessibleDescription('Ligada porque o seu sistema pede menos movimento.');
    });

    it('sem armazenamento (treino sem store), a preferência vale só na sessão', async () => {
      const m = mount({ status: 'PLAYING', props: { store: undefined } });
      await m.user.click(menuButton());
      await m.user.click(autoPass());
      expect(m.session.snapshot().prefs.autoPass).toBe(false);
    });

    it('as chaves têm alvo de toque de 44 px', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      expect(autoPass().closest('label')!.className).toContain('min-h-11');
    });
  });

  describe('versão publicada', () => {
    it('não busca antes de abrir; busca uma vez ao abrir e mostra a versão', async () => {
      const loadVersion = vi.fn(() => Promise.resolve('1.4.2'));
      const m = mount({ status: 'PLAYING', props: { loadVersion } });
      expect(loadVersion).not.toHaveBeenCalled();
      await m.user.click(menuButton());
      expect(await within(menuDialog()).findByText('Versão publicada: 1.4.2')).toBeInTheDocument();
      // Mexer numa chave redesenha o menu, mas não busca de novo.
      await m.user.click(within(menuDialog()).getByRole('switch', { name: 'Reduzir animações' }));
      expect(loadVersion).toHaveBeenCalledTimes(1);
    });

    it('cada abertura do menu busca uma vez', async () => {
      const loadVersion = vi.fn(() => Promise.resolve('dev'));
      const m = mount({ status: 'PLAYING', props: { loadVersion } });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Fechar' }));
      await m.user.click(menuButton());
      expect(loadVersion).toHaveBeenCalledTimes(2);
    });

    it('falha ou resposta sem versão: nada aparece e nada quebra', async () => {
      const loadVersion = vi.fn(() => Promise.reject(new Error('sem rede')));
      const m = mount({ status: 'PLAYING', props: { loadVersion } });
      await m.user.click(menuButton());
      await act(async () => {
        await Promise.resolve();
      });
      expect(within(menuDialog()).queryByText(/Versão publicada/)).not.toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('sem loadVersion (treino), a linha da versão não existe', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      expect(within(menuDialog()).queryByText(/Versão publicada/)).not.toBeInTheDocument();
    });

    it('fechar o menu antes de a versão chegar não atualiza nada', async () => {
      let resolve!: (version: string | null) => void;
      const loadVersion = vi.fn(() => new Promise<string | null>((r) => (resolve = r)));
      const m = mount({ status: 'PLAYING', props: { loadVersion } });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Fechar' }));
      await act(async () => resolve('1.0.0'));
      expect(screen.queryByText(/Versão publicada/)).not.toBeInTheDocument();
    });
  });

  describe('Desistir', () => {
    it('pede confirmação, e só "Confirmar" chama concede', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Desistir' }));
      const confirm = screen.getByRole('dialog', { name: 'Desistir da partida?' });
      expect(within(confirm).getByText('Você perde esta partida por W.O.')).toBeInTheDocument();
      expect(m.connection.sent).toEqual([]);
      await m.user.click(within(confirm).getByRole('button', { name: 'Confirmar' }));
      expect(m.connection.sent).toHaveLength(1);
      expect(m.connection.sent[0]!.type).toBe('concede');
    });

    it('"Cancelar" não desiste e deixa o menu aberto, com o foco de volta em "Desistir"', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      const concede = within(menuDialog()).getByRole('button', { name: 'Desistir' });
      await m.user.click(concede);
      await m.user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Cancelar' }));
      expect(m.connection.sent).toEqual([]);
      expect(screen.queryByRole('dialog', { name: 'Desistir da partida?' })).not.toBeInTheDocument();
      expect(menuDialog()).toBeInTheDocument();
      expect(concede).toHaveFocus();
    });

    it('a confirmação abre com o foco no "Cancelar" (o gesto seguro)', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Desistir' }));
      expect(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Cancelar' })).toHaveFocus();
    });

    it('depois de confirmar, os dois diálogos fecham', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Desistir' }));
      await m.user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('uma recusa do concede não derruba a tela', async () => {
      const m = mount({ status: 'PLAYING' });
      m.connection.acks.push({ ok: false, code: 'NOT_PLAYING', message: 'acabou' });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Desistir' }));
      await m.user.click(within(screen.getByRole('dialog', { name: 'Desistir da partida?' })).getByRole('button', { name: 'Confirmar' }));
      expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    });

    it('se a partida acaba com a confirmação aberta, ela fecha (não sobra um "Confirmar" que o servidor recusaria)', async () => {
      const m = mount({ status: 'PLAYING' });
      await m.user.click(menuButton());
      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Desistir' }));
      expect(screen.getByRole('dialog', { name: 'Desistir da partida?' })).toBeInTheDocument();
      act(() => {
        m.connection.emitRoom(roomOf({}, { result: win('p2', 'FORFEIT'), cause: 'AFK' }));
        m.connection.emitState(stateMessage(viewOf({ result: win('p2', 'FORFEIT') }), { seq: 9, epoch: 9 }));
      });
      expect(screen.queryByRole('dialog', { name: 'Desistir da partida?' })).not.toBeInTheDocument();
      expect(m.connection.sent).toEqual([]);
    });

    it('com a partida acabada não há "Desistir"', async () => {
      const m = mount();
      await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
      await m.user.click(menuButton());
      expect(within(menuDialog()).queryByRole('button', { name: 'Desistir' })).not.toBeInTheDocument();
    });

    it('com a conexão caída o botão fica desligado', async () => {
      const m = mount({ status: 'PLAYING' });
      act(() => m.connection.emitClosed(1006));
      await m.user.click(menuButton());
      expect(within(menuDialog()).getByRole('button', { name: 'Desistir' })).toBeDisabled();
    });
  });

  describe('resumo das regras', () => {
    const open = async (m: Mounted) => {
      await m.user.click(menuButton());
      const opener = within(menuDialog()).getByRole('button', { name: 'Resumo das regras' });
      await m.user.click(opener);
      return opener;
    };

    it('abre um <dialog> modal com as seções das regras, e o foco entra nele', async () => {
      const showModal = vi.spyOn(HTMLDialogElement.prototype, 'showModal');
      const m = mount({ status: 'PLAYING' });
      await open(m);
      expect(showModal).toHaveBeenCalledTimes(2);
      const rules = screen.getByRole('dialog', { name: 'Resumo das regras' });
      expect(rules.contains(document.activeElement)).toBe(true);
      const headings = within(rules)
        .getAllByRole('heading', { level: 3 })
        .map((h) => h.textContent);
      expect(headings).toEqual(['Objetivo', 'Rodadas', 'O ataque', 'Cartas especiais', 'Janela de reação', 'Combos', 'Fim da partida']);
      expect(within(rules).getByText(/Zere a vida do Coringa do oponente/)).toBeInTheDocument();
      expect(within(rules).getByText(/Exódia \(4 K na Guarda\)/)).toBeInTheDocument();
    });

    it('"Fechar" devolve o foco ao botão "Resumo das regras" e deixa o menu aberto', async () => {
      const m = mount({ status: 'PLAYING' });
      const opener = await open(m);
      await m.user.click(within(screen.getByRole('dialog', { name: 'Resumo das regras' })).getByRole('button', { name: 'Fechar' }));
      expect(screen.queryByRole('dialog', { name: 'Resumo das regras' })).not.toBeInTheDocument();
      expect(menuDialog()).toBeInTheDocument();
      expect(opener).toHaveFocus();
    });

    it('Esc fecha só o das regras', async () => {
      const m = mount({ status: 'PLAYING' });
      const opener = await open(m);
      await m.user.keyboard('{Escape}');
      expect(screen.queryByRole('dialog', { name: 'Resumo das regras' })).not.toBeInTheDocument();
      expect(menuDialog()).toBeInTheDocument();
      expect(opener).toHaveFocus();
    });
  });

  it('o Esc que fecha o menu não cancela a escolha da mão nem pula nada fora dele', async () => {
    const m = mount({ status: 'PLAYING' });
    await m.user.click(menuButton());
    fireEvent.keyDown(menuDialog(), { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
  });

  it('no fim da partida o menu continua à mão (sem "Desistir")', async () => {
    const m = mount({ props: { inviteLink: `http://localhost/s/${CODE}` } });
    await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
    await m.user.click(menuButton());
    expect(within(menuDialog()).getByRole('button', { name: 'Copiar link da sala' })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// /api/health

describe('fetchVersion', () => {
  const answer = (body: unknown, ok = true) => vi.fn(() => Promise.resolve({ ok, json: () => Promise.resolve(body) } as Response));

  it('lê a versão de /api/health, na origem do servidor', async () => {
    const fetchImpl = answer({ ok: true, version: '2026.10.21' });
    expect(await fetchVersion('https://coringa.example', fetchImpl)).toBe('2026.10.21');
    expect(fetchImpl).toHaveBeenCalledWith('https://coringa.example/api/health');
  });

  it('falha de rede, resposta recusada ou corpo estranho viram null, sem lançar', async () => {
    expect(await fetchVersion('https://x.example', vi.fn(() => Promise.reject(new Error('rede'))))).toBeNull();
    expect(await fetchVersion('https://x.example', answer({ ok: false }, false))).toBeNull();
    expect(await fetchVersion('https://x.example', answer({ ok: true }))).toBeNull();
    expect(await fetchVersion('https://x.example', answer('texto'))).toBeNull();
    expect(await fetchVersion('https://x.example', answer(null))).toBeNull();
    expect(
      await fetchVersion('https://x.example', vi.fn(() => Promise.resolve({ ok: true, json: () => Promise.reject(new Error('json')) } as Response))),
    ).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------
// StrictMode (`pnpm dev`): os efeitos montam, desmontam e montam de novo

describe('StrictMode: o painel e os diálogos não se fecham sozinhos', () => {
  /**
   * No navegador o evento `close` de `close()` vem numa tarefa depois (o polyfill do `setup-ui.ts` o dispara na hora).
   * Sob o StrictMode o diálogo fecha na limpeza simulada e reabre em seguida; o `close` atrasado chega com ele já aberto.
   */
  function closeEventLater() {
    vi.spyOn(HTMLDialogElement.prototype, 'close').mockImplementation(function close(this: HTMLDialogElement) {
      if (!this.open) return;
      this.removeAttribute('open');
      setTimeout(() => this.dispatchEvent(new Event('close')), 0);
    });
  }
  const flush = () =>
    act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 20));
    });

  describe.each([
    ['evento close atrasado (o do navegador)', closeEventLater],
    ['evento close na hora (o do polyfill)', () => undefined],
  ])('com %s', (_name, setup) => {
    it('o painel de fim nasce aberto e continua aberto', async () => {
      setup();
      mount({ strict: true });
      await flush();
      expect(endDialog('Você venceu')).toHaveAttribute('open');
      expect(screen.queryByRole('region', { name: 'Resultado da partida' })).not.toBeInTheDocument();
    });

    it('o menu, o resumo das regras e a confirmação de desistir ficam abertos depois de abrir', async () => {
      setup();
      const m = mount({ status: 'PLAYING', strict: true });
      await m.user.click(menuButton());
      await flush();
      expect(menuDialog()).toHaveAttribute('open');

      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Resumo das regras' }));
      await flush();
      expect(screen.getByRole('dialog', { name: 'Resumo das regras' })).toHaveAttribute('open');
      await m.user.click(within(screen.getByRole('dialog', { name: 'Resumo das regras' })).getByRole('button', { name: 'Fechar' }));
      await flush();

      await m.user.click(within(menuDialog()).getByRole('button', { name: 'Desistir' }));
      await flush();
      expect(screen.getByRole('dialog', { name: 'Desistir da partida?' })).toHaveAttribute('open');
      expect(menuDialog()).toHaveAttribute('open');
    });
  });

  it('fechar e reabrir logo em seguida não deixa o `close` atrasado do primeiro fechar o segundo', async () => {
    closeEventLater();
    const m = mount({ status: 'PLAYING' });
    await m.user.click(menuButton());
    await m.user.click(within(menuDialog()).getByRole('button', { name: 'Fechar' }));
    await m.user.click(menuButton());
    await flush();
    expect(menuDialog()).toHaveAttribute('open');
  });

  it('um `close` que não foi nosso (o voltar do Android, o navegador) ainda fecha o diálogo', async () => {
    const m = mount({ status: 'PLAYING' });
    await m.user.click(menuButton());
    const dialog = menuDialog();
    dialog.removeAttribute('open');
    fireEvent(dialog, new Event('close'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// O menu e o painel de fim

describe('menu aberto quando a partida acaba', () => {
  it('o painel de fim chega sozinho e o menu sai (um diálogo só por vez)', async () => {
    const m = mount({ status: 'PLAYING' });
    await m.user.click(menuButton());
    expect(menuDialog()).toBeInTheDocument();
    act(() => {
      m.connection.emitRoom(roomOf({}, { result: win('p1', 'HP') }));
      m.connection.emitState(stateMessage(viewOf({ result: win('p1', 'HP') }), { seq: 9, epoch: 9 }));
    });
    expect(screen.queryByRole('dialog', { name: 'Menu da partida' })).not.toBeInTheDocument();
    expect(endDialog('Você venceu')).toBeInTheDocument();
  });

  it('depois de recolher o painel, o menu abre normalmente e fica aberto', async () => {
    const m = mount();
    await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
    await m.user.click(menuButton());
    expect(menuDialog()).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------------------------
// Texto das regras: o Reflect

describe('resumo das regras: o Reflect', () => {
  const reflect = RULES_SECTIONS.flatMap((section) => section.items).find((item) => item.startsWith('Reflect'))!;

  it('diz qual é o dano refletido sem deixar dúvida (spec 1 §1.6): o ataque dele com multiplicador, menos metade da Defesa base sem multiplicador, nunca abaixo de 0', () => {
    expect(reflect).toContain('leva de volta o próprio ataque, com o multiplicador');
    expect(reflect).toContain('menos metade (arredondada para baixo) da Defesa base dele, sem o multiplicador');
    expect(reflect).toContain('nunca fica abaixo de 0');
    expect(reflect).toContain('você não leva nada');
  });
});

// ---------------------------------------------------------------------------------------------
// Grade do campo do oponente entre ~900 e 1023 px

describe('campo do oponente: os botões de ferramenta têm a sua área na grade', () => {
  const styles = readFileSync(resolve(import.meta.dirname, '../../src/styles.css'), 'utf8');

  it('a área `ferr` existe no desenho do container ≥ 56rem enquanto os botões aparecem (viewport < o ponto pc, 1024 px)', () => {
    // O jsdom não avalia container queries nem media queries: confere-se o CSS. O botão do histórico e o do menu só somem
    // a partir de 1024 px de viewport (`pc:`), mas a grade do campo vira o desenho largo a partir de 56rem de container.
    // O limite é o `theme(--breakpoint-pc)`, em px como o resto do arquivo: um `rem` seguiria a fonte do navegador.
    const start = /@media\s*\(width\s*<\s*theme\(--breakpoint-pc\)\)\s*\{\s*@container\s*\(min-width:\s*56rem\)\s*\{/.exec(styles);
    expect(start, 'falta o ajuste do container largo em viewport estreito').not.toBeNull();
    const rule = /\.campo-grade--oponente\s*>\s*\.campo-info\s*\{([^}]*)\}/.exec(styles.slice(start!.index))?.[1];
    expect(rule, 'falta a regra do campo do oponente').toBeDefined();
    expect(rule).toMatch(/grid-template-areas:[^;]*\bferr\b/);
    // A regra vem depois do desenho largo que ela corrige (mesma especificidade: vale a ordem).
    expect(styles.indexOf('@media (width < theme(--breakpoint-pc))')).toBeGreaterThan(styles.indexOf('@container (min-width: 56rem)'));
  });

  it('a mesa usa a área `ferr` para o wrapper dos botões do campo do oponente', () => {
    const m = mount({ status: 'PLAYING' });
    const tool = m.container.querySelector('.campo-info--oponente > .area-ferr');
    expect(tool).not.toBeNull();
    expect(within(tool as HTMLElement).getByRole('button', { name: /^Histórico/ })).toBeInTheDocument();
    expect(within(tool as HTMLElement).getByRole('button', { name: 'Menu da partida' })).toBeInTheDocument();
    expect(styles).toMatch(/\.area-ferr\s*\{\s*grid-area:\s*ferr;/);
  });
});

// ---------------------------------------------------------------------------------------------
// Acessibilidade (spec §7)

describe('acessibilidade', () => {
  it('axe: o painel de fim aberto não tem violações sérias', async () => {
    const { container } = mount({ theirsWants: true, score: { p1: 1, p2: 0 } });
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('axe: a faixa recolhida não tem violações sérias', async () => {
    const m = mount();
    await m.user.click(within(endDialog('Você venceu')).getByRole('button', { name: 'Ver a mesa' }));
    expect(await seriousViolations(m.container)).toEqual([]);
  });

  it('axe: o menu aberto não tem violações sérias', async () => {
    const m = mount({ status: 'PLAYING', props: { inviteLink: `http://localhost/s/${CODE}`, loadVersion: () => Promise.resolve('1.0.0') } });
    await m.user.click(menuButton());
    expect(await seriousViolations(m.container)).toEqual([]);
  });

  it('axe: o resumo das regras e a confirmação de desistir não têm violações sérias', async () => {
    const m = mount({ status: 'PLAYING' });
    await m.user.click(menuButton());
    await m.user.click(within(menuDialog()).getByRole('button', { name: 'Resumo das regras' }));
    expect(await seriousViolations(m.container)).toEqual([]);
    await m.user.click(within(screen.getByRole('dialog', { name: 'Resumo das regras' })).getByRole('button', { name: 'Fechar' }));
    await m.user.click(within(menuDialog()).getByRole('button', { name: 'Desistir' }));
    expect(await seriousViolations(m.container)).toEqual([]);
  });
});
