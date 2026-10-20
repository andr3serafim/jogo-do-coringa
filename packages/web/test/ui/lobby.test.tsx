// Lobby (spec §2.3): código e link, copiar e compartilhar, os dois assentos com presença e pronto, o botão
// "Estou pronto" que alterna, o aviso de W.O., a nota de quem caiu e "Sair da sala".
import { roomLink, type SeatInfo } from '@coringa/protocol';
import { act, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Session } from '../../src/model/session.ts';
import { Lobby } from '../../src/ui/screens/Lobby.tsx';
import { FakeConnection } from '../fixtures.ts';
import { CODE, roomMessage, seriousViolations } from './support.tsx';

const WO_NOTICE = 'Durante a partida, se você sair do navegador por mais de 1 minuto, perde por W.O.';
const DROPPED = 'você saiu da sala; marque pronto de novo';

const seatOf = (playerId: 'p1' | 'p2', extra: Partial<SeatInfo> = {}): SeatInfo => ({
  playerId,
  nickname: playerId === 'p1' ? 'Duda' : 'Bia',
  connected: true,
  ready: false,
  wantsRematch: false,
  ...extra,
});

const LINK = roomLink(window.location.origin, CODE);

interface SetupOptions {
  seats?: SeatInfo[];
  /** `null`: a conexão não sabe quem você é. */
  playerId?: 'p1' | 'p2' | null;
}

function setup(options: SetupOptions = {}) {
  const connection = new FakeConnection({
    playerId: options.playerId === undefined ? 'p1' : options.playerId,
    room: roomMessage({ seats: options.seats ?? [seatOf('p1'), seatOf('p2')] }),
  });
  const session = new Session(connection, { now: () => 0, setTimer: () => 0, clearTimer: () => undefined });
  // O `user-event` instala o próprio `navigator.clipboard`; qualquer troca tem que vir depois do `setup()`.
  const user = userEvent.setup();
  const view = render(<Lobby session={session} />);
  const push = (seats: SeatInfo[]) => act(() => connection.emitRoom(roomMessage({ seats })));
  return { connection, session, user, push, ...view };
}

function stubClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
}

function stubShare(share: (data: ShareData) => Promise<void>) {
  Object.defineProperty(navigator, 'share', { configurable: true, value: share });
}

afterEach(() => {
  // Sem isso, "Compartilhar some sem navigator.share" dependeria da ordem dos testes.
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'clipboard');
  vi.restoreAllMocks();
});

describe('lobby: código e link', () => {
  it('mostra o código da sala e o link <origem>/s/<CÓDIGO>', () => {
    setup();
    expect(screen.getByText(CODE)).toBeInTheDocument();
    expect(screen.getByText(LINK)).toBeInTheDocument();
    expect(LINK).toBe(`${window.location.origin}/s/${CODE}`);
  });

  it('"Copiar link" escreve o link na área de transferência e avisa', async () => {
    const { user } = setup();
    const writeText = vi.fn<(text: string) => Promise<void>>(() => Promise.resolve());
    stubClipboard(writeText);
    await user.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(writeText).toHaveBeenCalledExactlyOnceWith(LINK);
    expect(await screen.findByText('Link copiado')).toBeInTheDocument();
  });

  it('se a área de transferência recusa, o aviso manda copiar à mão (o link continua à vista)', async () => {
    const { user } = setup();
    stubClipboard(() => Promise.reject(new Error('negado')));
    await user.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(await screen.findByText(/Não deu para copiar/)).toBeInTheDocument();
    expect(screen.queryByText('Link copiado')).not.toBeInTheDocument();
    expect(screen.getByText(LINK)).toBeInTheDocument();
  });

  it('sem área de transferência (http fora do localhost), o aviso manda copiar à mão', async () => {
    const { user } = setup();
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: undefined });
    await user.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(await screen.findByText(/Não deu para copiar/)).toBeInTheDocument();
  });

  it('"Compartilhar" só aparece onde existe navigator.share', () => {
    const first = setup();
    expect(screen.queryByRole('button', { name: 'Compartilhar' })).not.toBeInTheDocument();
    first.unmount();

    stubShare(() => Promise.resolve());
    setup();
    expect(screen.getByRole('button', { name: 'Compartilhar' })).toBeInTheDocument();
  });

  it('"Compartilhar" abre a folha de compartilhamento com o link', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>(() => Promise.resolve());
    stubShare(share);
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Compartilhar' }));
    expect(share).toHaveBeenCalledExactlyOnceWith(expect.objectContaining({ url: LINK }));
    expect(screen.queryByText(/Não deu para compartilhar/)).not.toBeInTheDocument();
  });

  it('fechar a folha sem escolher (AbortError) não é erro', async () => {
    const share = vi.fn<(data: ShareData) => Promise<void>>(() =>
      Promise.reject(new DOMException('cancelado', 'AbortError')),
    );
    stubShare(share);
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Compartilhar' }));
    expect(share).toHaveBeenCalledTimes(1);
    expect(screen.queryByText(/Não deu para compartilhar/)).not.toBeInTheDocument();
  });

  it('outra falha do compartilhamento manda copiar o link', async () => {
    stubShare(() => Promise.reject(new DOMException('sem permissão', 'NotAllowedError')));
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Compartilhar' }));
    expect(await screen.findByText(/Não deu para compartilhar/)).toBeInTheDocument();
  });
});

describe('lobby: assentos', () => {
  it('mostra os dois assentos com apelido, presença e pronto (você primeiro)', () => {
    setup({ seats: [seatOf('p1', { ready: true }), seatOf('p2', { connected: false })] });
    const items = within(screen.getByRole('list', { name: 'Jogadores' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);

    expect(items[0]).toHaveTextContent('Duda');
    expect(items[0]).toHaveTextContent('(você)');
    expect(items[0]).toHaveTextContent('Conectado');
    expect(items[0]).toHaveTextContent('Pronto');
    expect(items[0]).not.toHaveTextContent('Não pronto');

    expect(items[1]).toHaveTextContent('Bia');
    expect(items[1]).not.toHaveTextContent('(você)');
    expect(items[1]).toHaveTextContent('Fora da sala');
    expect(items[1]).toHaveTextContent('Não pronto');
  });

  it('o seu assento vem primeiro mesmo sendo o segundo', () => {
    setup({ playerId: 'p2', seats: [seatOf('p1'), seatOf('p2')] });
    const items = within(screen.getByRole('list', { name: 'Jogadores' })).getAllByRole('listitem');
    expect(items[0]).toHaveTextContent('Bia');
    expect(items[0]).toHaveTextContent('(você)');
    expect(items[1]).toHaveTextContent('Duda');
  });

  it('com um assento só, o outro aparece vazio, esperando alguém', () => {
    setup({ seats: [seatOf('p1')] });
    const items = within(screen.getByRole('list', { name: 'Jogadores' })).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    expect(items[1]).toHaveTextContent('Esperando alguém entrar');
    expect(screen.getByText('Esperando alguém entrar pelo link.')).toBeInTheDocument();
  });

  it('a presença e o pronto do outro jogador acompanham a sala', () => {
    const { push } = setup({ seats: [seatOf('p1'), seatOf('p2')] });
    push([seatOf('p1'), seatOf('p2', { ready: true })]);
    const items = within(screen.getByRole('list', { name: 'Jogadores' })).getAllByRole('listitem');
    expect(items[1]).toHaveTextContent('Pronto');
    expect(items[1]).not.toHaveTextContent('Não pronto');
  });

  it('a dica diz o que falta, conforme a sala', () => {
    const { push } = setup({ seats: [seatOf('p1'), seatOf('p2', { connected: false })] });
    expect(screen.getByText('Esperando Bia voltar.')).toBeInTheDocument();
    push([seatOf('p1'), seatOf('p2')]);
    expect(screen.getByText('A partida começa quando os dois marcarem pronto.')).toBeInTheDocument();
    push([seatOf('p1', { ready: true }), seatOf('p2')]);
    expect(screen.getByText('Esperando Bia marcar pronto.')).toBeInTheDocument();
    push([seatOf('p1', { ready: true }), seatOf('p2', { ready: true })]);
    expect(screen.getByText('Começando a partida…')).toBeInTheDocument();
  });
});

describe('lobby: Estou pronto', () => {
  it('alterna: manda ready(true) e, quando a sala confirma, ready(false)', async () => {
    const { connection, user, push } = setup();
    const button = screen.getByRole('button', { name: 'Estou pronto' });
    expect(button).toHaveAttribute('aria-pressed', 'false');

    await user.click(button);
    expect(connection.calls).toContain('ready:true');
    // O botão segue o servidor: sem a sala confirmando, ele não muda sozinho.
    expect(button).toHaveAttribute('aria-pressed', 'false');

    push([seatOf('p1', { ready: true }), seatOf('p2')]);
    expect(screen.getByRole('button', { name: 'Estou pronto' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Estou pronto' }));
    expect(connection.calls.filter((call) => call.startsWith('ready:'))).toEqual(['ready:true', 'ready:false']);
  });

  it('desmarcar de propósito não mostra a nota de quem caiu', async () => {
    const { user, push } = setup({ seats: [seatOf('p1', { ready: true }), seatOf('p2')] });
    await user.click(screen.getByRole('button', { name: 'Estou pronto' }));
    push([seatOf('p1', { ready: false }), seatOf('p2')]);
    expect(screen.getByRole('button', { name: 'Estou pronto' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByText(DROPPED)).not.toBeInTheDocument();
  });

  it('com a conexão caída, o botão fica desligado (o envio se perderia)', () => {
    const { connection } = setup();
    act(() => connection.emitClosed(1006, false));
    expect(screen.getByRole('button', { name: 'Estou pronto' })).toBeDisabled();
    act(() => connection.emit({ type: 'open' }));
    expect(screen.getByRole('button', { name: 'Estou pronto' })).toBeEnabled();
  });
});

describe('lobby: aviso de W.O.', () => {
  it('o aviso fixo está visível', () => {
    setup();
    expect(screen.getByText(WO_NOTICE)).toBeVisible();
  });
});

describe('lobby: você saiu da sala', () => {
  it('pronto marcado que o servidor desmarca (queda) mostra a nota, ligada ao botão', () => {
    const { push } = setup({ seats: [seatOf('p1', { ready: true }), seatOf('p2')] });
    expect(screen.queryByText(DROPPED)).not.toBeInTheDocument();

    push([seatOf('p1', { ready: false }), seatOf('p2')]);
    const note = screen.getByText(DROPPED);
    expect(note).toBeVisible();
    const button = screen.getByRole('button', { name: 'Estou pronto' });
    expect(button).toHaveAttribute('aria-pressed', 'false');
    expect(button).toHaveAccessibleDescription(DROPPED);
  });

  it('marcar pronto de novo apaga a nota', async () => {
    const { user, push } = setup({ seats: [seatOf('p1', { ready: true }), seatOf('p2')] });
    push([seatOf('p1', { ready: false }), seatOf('p2')]);
    expect(screen.getByText(DROPPED)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Estou pronto' }));
    push([seatOf('p1', { ready: true }), seatOf('p2')]);
    expect(screen.queryByText(DROPPED)).not.toBeInTheDocument();
  });

  it('quem nunca esteve pronto não vê a nota, nem quando o outro jogador mexe no pronto', () => {
    const { push } = setup({ seats: [seatOf('p1'), seatOf('p2', { ready: true })] });
    expect(screen.queryByText(DROPPED)).not.toBeInTheDocument();
    push([seatOf('p1'), seatOf('p2', { ready: false })]);
    expect(screen.queryByText(DROPPED)).not.toBeInTheDocument();
  });

  it('o pronto do outro jogador caindo não conta como a sua queda', () => {
    const { push } = setup({ seats: [seatOf('p1', { ready: true }), seatOf('p2', { ready: true })] });
    push([seatOf('p1', { ready: true }), seatOf('p2', { ready: false, connected: false })]);
    expect(screen.queryByText(DROPPED)).not.toBeInTheDocument();
  });
});

describe('lobby: Sair da sala', () => {
  it('chama leave()', async () => {
    const { connection, user } = setup();
    await user.click(screen.getByRole('button', { name: 'Sair da sala' }));
    expect(connection.calls).toContain('leave');
  });
});

describe('lobby: acessibilidade', () => {
  it('axe: sem violações sérias nem críticas (sala cheia, nota de queda e avisos à mostra)', async () => {
    stubShare(() => Promise.resolve());
    stubClipboard(() => Promise.resolve());
    const { container, user, push } = setup({ seats: [seatOf('p1', { ready: true }), seatOf('p2')] });
    push([seatOf('p1', { ready: false }), seatOf('p2')]);
    await user.click(screen.getByRole('button', { name: 'Copiar link' }));
    expect(await screen.findByText('Link copiado')).toBeInTheDocument();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('axe: sem violações com um assento só', async () => {
    const { container } = setup({ seats: [seatOf('p1')] });
    expect(await seriousViolations(container)).toEqual([]);
  });
});
