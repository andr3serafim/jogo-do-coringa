import { HttpError, type RoomClientOptions } from '@coringa/protocol';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRoomApi } from '../../src/app/room-api.ts';
import { getDiagnosticContext } from '../../src/app/diagnostic-context.ts';
import { loadSeat, saveSeat } from '../../src/model/storage.ts';
import { RoomGate } from '../../src/ui/screens/RoomGate.tsx';
import { FakeConnection, stateMessage, viewAt } from '../fixtures.ts';
import { CODE, fakeApi, info, joined, memoryStore, roomMessage, seat, seriousViolations, TOKEN } from './support.tsx';

beforeEach(() => {
  window.history.replaceState(null, '', `/s/${CODE}`);
});

afterEach(() => {
  vi.restoreAllMocks();
});

interface SetupOptions {
  code?: string | null;
  seated?: boolean;
  /** Onde fica a marca da recarga; `'padrão'` não passa nada, e a tela abre o `sessionStorage` de verdade. */
  marks?: ReturnType<typeof memoryStore> | 'padrão';
  /** `false`: a conexão não traz `room` até o teste emitir (como a de verdade antes do `hello` aceito). */
  room?: boolean;
}

function setup(options: SetupOptions = {}) {
  const api = fakeApi({ room: options.room ?? true });
  const store = memoryStore();
  const reload = vi.fn();
  const marks = options.marks === 'padrão' ? undefined : (options.marks ?? memoryStore());
  if (options.seated) saveSeat(store, CODE, seat());
  const user = userEvent.setup();
  const code = options.code === undefined ? CODE : options.code;
  const view = render(<RoomGate code={code} api={api} store={store} reload={reload} marks={marks} />);
  return { api, store, reload, marks, user, ...view };
}

async function fillNickname(user: ReturnType<typeof userEvent.setup>, text: string) {
  const field = screen.getByLabelText('Seu apelido');
  await user.clear(field);
  if (text !== '') {
    await user.click(field);
    await user.paste(text);
  }
}

describe('entrada: código', () => {
  it('código fora do formato mostra "Código inválido" e não chama o servidor', () => {
    const { api } = setup({ code: null });
    expect(screen.getByRole('heading', { name: 'Código inválido' })).toBeInTheDocument();
    expect(api.info).not.toHaveBeenCalled();
    expect(api.connect).not.toHaveBeenCalled();
  });

  it('digitar outro código (ou o link) navega para a sala', async () => {
    const { user } = setup({ code: null });
    await user.type(screen.getByLabelText('Digite outro código'), ' 7kq2md ');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(window.location.pathname).toBe('/s/7KQ2MD');
  });

  it('um código ainda inválido avisa no campo', async () => {
    const { user } = setup({ code: null });
    await user.type(screen.getByLabelText('Digite outro código'), 'oi');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Esse não parece um código de sala');
  });

  it('axe: sem violações na tela de código inválido', async () => {
    const { container } = setup({ code: null });
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('entrada: sem token', () => {
  it('token salvo conecta direto, sem chamar info', () => {
    const { api } = setup({ seated: true });
    expect(api.info).not.toHaveBeenCalled();
    expect(api.connect).toHaveBeenCalledExactlyOnceWith(CODE, seat());
    // A sala no LOBBY mostra o lobby de verdade (código, assentos), não o espaço reservado.
    expect(screen.getByRole('heading', { name: 'Sala de espera' })).toBeInTheDocument();
    expect(screen.getByText(CODE)).toBeInTheDocument();
  });

  it('LOBBY com vaga pede o apelido (já preenchido), entra, guarda o token e conecta', async () => {
    const store = memoryStore();
    store.set('coringa:apelido', 'Bia');
    const api = fakeApi();
    const user = userEvent.setup();
    render(<RoomGate code={CODE} api={api} store={store} marks={memoryStore()} />);

    expect(await screen.findByLabelText('Seu apelido')).toHaveValue('Bia');
    expect(api.connect).not.toHaveBeenCalled();
    await fillNickname(user, 'Duda');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));

    expect(api.join).toHaveBeenCalledExactlyOnceWith(CODE, 'Duda');
    expect(await screen.findByRole('region', { name: 'Sala' })).toBeInTheDocument();
    expect(loadSeat(store, CODE)).toEqual({ token: TOKEN, playerId: 'p2', nickname: 'Duda' });
    expect(api.connect).toHaveBeenCalledExactlyOnceWith(CODE, loadSeat(store, CODE));
  });

  it.each([
    ['só espaços', '   '],
    ['21 emojis', '😀'.repeat(21)],
    ['21 letras', 'a'.repeat(21)],
  ])('apelido inválido (%s): erro no campo e nenhum join', async (_name, nickname) => {
    const { api, user } = setup();
    await screen.findByLabelText('Seu apelido');
    await fillNickname(user, nickname);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Apelido inválido');
    expect(api.join).not.toHaveBeenCalled();
  });

  it('400 no join vira erro no campo, e dá para corrigir', async () => {
    const { api, user } = setup();
    api.join.mockRejectedValueOnce(new HttpError(400)).mockResolvedValueOnce(joined());
    await screen.findByLabelText('Seu apelido');
    await fillNickname(user, 'Duda');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Apelido inválido');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('region', { name: 'Sala' })).toBeInTheDocument();
  });
});

describe('entrada: erros do servidor', () => {
  async function gate(configure: (api: ReturnType<typeof fakeApi>) => void) {
    const api = fakeApi();
    configure(api);
    const store = memoryStore();
    const user = userEvent.setup();
    const view = render(<RoomGate code={CODE} api={api} store={store} marks={memoryStore()} />);
    return { api, store, user, ...view };
  }

  it('info 404: "Essa sala não existe ou já expirou", com Criar sala', async () => {
    const { user } = await gate((api) => api.info.mockRejectedValue(new HttpError(404)));
    expect(await screen.findByRole('heading', { name: 'Essa sala não existe ou já expirou' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(window.location.pathname).toBe('/');
  });

  it('sala cheia: "Essa sala já está com dois jogadores", com Criar outra sala', async () => {
    const { api, user } = await gate((a) => a.info.mockResolvedValue(info({ full: true })));
    expect(await screen.findByRole('heading', { name: 'Essa sala já está com dois jogadores' })).toBeInTheDocument();
    expect(api.connect).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Criar outra sala' }));
    expect(window.location.pathname).toBe('/');
  });

  it('sala fora do LOBBY também é "cheia" (não há espectador)', async () => {
    await gate((api) => api.info.mockResolvedValue(info({ status: 'PLAYING' })));
    expect(await screen.findByRole('heading', { name: 'Essa sala já está com dois jogadores' })).toBeInTheDocument();
  });

  it('join 409 (corrida pelo assento) é igual a sala cheia', async () => {
    const { api, user } = await gate((a) => a.join.mockRejectedValue(new HttpError(409)));
    await screen.findByLabelText('Seu apelido');
    await user.type(screen.getByLabelText('Seu apelido'), 'Duda');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Essa sala já está com dois jogadores' })).toBeInTheDocument();
    expect(api.connect).not.toHaveBeenCalled();
  });

  it('429 no info pede para esperar, e Tentar de novo consulta outra vez', async () => {
    const { api, user } = await gate((a) =>
      a.info.mockRejectedValueOnce(new HttpError(429)).mockResolvedValueOnce(info()),
    );
    expect(await screen.findByRole('heading', { name: 'Muitas tentativas; espere um minuto' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByLabelText('Seu apelido')).toBeInTheDocument();
    expect(api.info).toHaveBeenCalledTimes(2);
  });

  it('429 no join tem o mesmo aviso', async () => {
    const { user } = await gate((a) => a.join.mockRejectedValue(new HttpError(429)));
    await screen.findByLabelText('Seu apelido');
    await user.type(screen.getByLabelText('Seu apelido'), 'Duda');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(await screen.findByRole('heading', { name: 'Muitas tentativas; espere um minuto' })).toBeInTheDocument();
  });

  it('falha de rede: "Sem conexão" e Tentar de novo', async () => {
    const { api, user } = await gate((a) =>
      a.info.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(info()),
    );
    expect(await screen.findByRole('heading', { name: 'Sem conexão' })).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Tentar de novo' }));
    expect(await screen.findByLabelText('Seu apelido')).toBeInTheDocument();
    expect(api.info).toHaveBeenCalledTimes(2);
  });

  it('erro 500 do servidor é tratado como falha com nova tentativa', async () => {
    await gate((a) => a.info.mockRejectedValue(new HttpError(500)));
    expect(await screen.findByRole('heading', { name: 'O servidor não conseguiu responder' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument();
  });

  it('axe: sem violações no formulário de apelido nem nas mensagens', async () => {
    const form = await gate(() => undefined);
    await screen.findByLabelText('Seu apelido');
    expect(await seriousViolations(form.container)).toEqual([]);
    form.unmount();

    const full = await gate((a) => a.info.mockResolvedValue(info({ full: true })));
    await screen.findByRole('heading', { name: 'Essa sala já está com dois jogadores' });
    expect(await seriousViolations(full.container)).toEqual([]);
  });
});

describe('sala parada', () => {
  function emitClosed(api: ReturnType<typeof fakeApi>, code: number) {
    act(() => api.connections[0]!.emitClosed(code, true));
  }

  it('4000 (ROOM_GONE) apaga o token e oferece Criar sala', async () => {
    const { api, store, user } = setup({ seated: true });
    emitClosed(api, 4000);
    expect(screen.getByRole('heading', { name: 'Essa sala não existe mais' })).toBeInTheDocument();
    expect(loadSeat(store, CODE)).toBeNull();
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(window.location.pathname).toBe('/');
  });

  it('4009 (OTHER_TAB): "Usar aqui" chama wake()', async () => {
    const { api, store, user } = setup({ seated: true });
    emitClosed(api, 4009);
    expect(screen.getByRole('heading', { name: 'Esta sala está aberta em outra aba' })).toBeInTheDocument();
    expect(loadSeat(store, CODE)).not.toBeNull();
    await user.click(screen.getByRole('button', { name: 'Usar aqui' }));
    expect(api.connections[0]!.calls.filter((call) => call === 'wake')).toHaveLength(1);
  });

  it('voltando a abrir depois do "Usar aqui", a sala reaparece', async () => {
    const { api, user } = setup({ seated: true });
    emitClosed(api, 4009);
    await user.click(screen.getByRole('button', { name: 'Usar aqui' }));
    act(() => api.connections[0]!.emit({ type: 'open' }));
    expect(screen.getByRole('region', { name: 'Sala' })).toBeInTheDocument();
  });

  // O servidor só responde 4001 ao `hello`, que o cliente manda depois do `open` do socket: todo 4001 de verdade
  // vem depois de um `open`, e o `open` sozinho não prova nada.
  it('open → 4001 recarrega uma vez; a página recarregada (mesma marca) abre, leva 4001 de novo e pede para atualizar', async () => {
    const marks = memoryStore();
    const first = setup({ seated: true, marks, room: false });
    act(() => first.api.connections[0]!.emit({ type: 'open' }));
    expect(marks.get('coringa:recarregou')).toBeNull();
    emitClosed(first.api, 4001);
    expect(first.reload).toHaveBeenCalledTimes(1);
    expect(marks.get('coringa:recarregou')).not.toBeNull();
    first.unmount();

    // A "página recarregada": o mesmo `sessionStorage`, a mesma versão velha, outro `open` e outro 4001.
    const second = setup({ seated: true, marks, room: false });
    act(() => second.api.connections[0]!.emit({ type: 'open' }));
    expect(marks.get('coringa:recarregou')).not.toBeNull();
    emitClosed(second.api, 4001);
    expect(second.reload).not.toHaveBeenCalled();
    expect(first.reload).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('heading', { name: 'Atualize a página' })).toBeInTheDocument();

    await second.user.click(screen.getByRole('button', { name: 'Recarregar' }));
    expect(second.reload).toHaveBeenCalledTimes(1);
  });

  it('sem sessionStorage (bloqueado), 4001 não recarrega e mostra "Atualize a página"', () => {
    vi.spyOn(window, 'sessionStorage', 'get').mockImplementation(() => {
      throw new DOMException('bloqueado', 'SecurityError');
    });
    const { api, reload } = setup({ seated: true, marks: 'padrão', room: false });
    act(() => api.connections[0]!.emit({ type: 'open' }));
    emitClosed(api, 4001);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Atualize a página' })).toBeInTheDocument();
  });

  it('com um sessionStorage que lança, 4001 também não recarrega (a marca não sobreviveria)', () => {
    const fail = (): never => {
      throw new Error('bloqueado');
    };
    vi.spyOn(window, 'sessionStorage', 'get').mockReturnValue({
      getItem: fail,
      setItem: fail,
      removeItem: fail,
      clear: fail,
      key: fail,
      length: 0,
    });
    const { api, reload } = setup({ seated: true, marks: 'padrão', room: false });
    emitClosed(api, 4001);
    expect(reload).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Atualize a página' })).toBeInTheDocument();
  });

  it('com sessionStorage de verdade, a marca fica nele e 4001 recarrega uma vez', () => {
    window.sessionStorage.clear();
    const { api, reload } = setup({ seated: true, marks: 'padrão', room: false });
    emitClosed(api, 4001);
    expect(reload).toHaveBeenCalledTimes(1);
    expect(window.sessionStorage.getItem('coringa:recarregou')).toBe('1');
    window.sessionStorage.clear();
  });

  it('a marca só sai quando o servidor aceita o hello (a primeira room), não no open', () => {
    const marks = memoryStore();
    marks.set('coringa:recarregou', '1');
    const { api } = setup({ seated: true, marks, room: false });
    const connection = api.connections[0]!;
    act(() => connection.emit({ type: 'open' }));
    expect(marks.get('coringa:recarregou')).not.toBeNull();
    act(() => connection.emitRoom(roomMessage()));
    expect(marks.get('coringa:recarregou')).toBeNull();
  });

  it('a marca também sai com o primeiro state', () => {
    const marks = memoryStore();
    marks.set('coringa:recarregou', '1');
    const { api } = setup({ seated: true, marks, room: false });
    const connection = api.connections[0]!;
    act(() => connection.emit({ type: 'open' }));
    expect(marks.get('coringa:recarregou')).not.toBeNull();
    act(() => connection.emitState(stateMessage(viewAt())));
    expect(marks.get('coringa:recarregou')).toBeNull();
  });

  it('4003 (AUTH) apaga o token e volta ao fluxo de entrada, que consulta a sala', async () => {
    const { api, store } = setup({ seated: true });
    emitClosed(api, 4003);
    expect(loadSeat(store, CODE)).toBeNull();
    expect(await screen.findByLabelText('Seu apelido')).toBeInTheDocument();
    expect(api.info).toHaveBeenCalledTimes(1);
    expect(api.connections[0]!.calls).toContain('connect');
  });

  it('1000 depois de sair (LEFT) volta ao início', () => {
    const { api } = setup({ seated: true });
    emitClosed(api, 1000);
    expect(window.location.pathname).toBe('/');
  });

  it('queda que reconecta mostra o aviso e mantém a sala', () => {
    const { api } = setup({ seated: true });
    act(() => api.connections[0]!.emitClosed(1006, false));
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');
    expect(screen.getByRole('region', { name: 'Sala' })).toBeInTheDocument();
  });

  it('1008 mostra o aviso de espera longa', () => {
    const { api } = setup({ seated: true });
    act(() => api.connections[0]!.emitClosed(1008, false));
    expect(screen.getByRole('status')).toHaveTextContent('reconectando em 30 s');
  });

  it('axe: sem violações nas telas de parada', async () => {
    const { api, container } = setup({ seated: true });
    emitClosed(api, 4009);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('sessão online', () => {
  it('sair da tela dispõe a sessão (nenhum evento depois)', () => {
    const { api, unmount } = setup({ seated: true });
    const connection = api.connections[0]!;
    unmount();
    // Depois do unmount, nem a conexão nem a aba chegam à sessão: nenhum `wake` novo.
    act(() => {
      connection.emitClosed(4000, true);
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('online'));
    });
    expect(connection.calls).toEqual(['connect']);
  });

  it('visibilitychange para visível e online chamam wake()', () => {
    const { api } = setup({ seated: true });
    const connection = api.connections[0]!;
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('online'));
    });
    expect(connection.calls.filter((call) => call === 'wake')).toHaveLength(2);
  });

  it('com a aba escondida, visibilitychange não chama wake()', () => {
    const { api } = setup({ seated: true });
    vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(api.connections[0]!.calls).not.toContain('wake');
  });

  it('parada de vez: voltar à aba não reabre a conexão', () => {
    const { api } = setup({ seated: true });
    act(() => api.connections[0]!.emitClosed(4000, true));
    act(() => {
      document.dispatchEvent(new Event('visibilitychange'));
      window.dispatchEvent(new Event('online'));
    });
    expect(api.connections[0]!.calls).not.toContain('wake');
  });

  it('o diagnóstico sabe a sala, o seq e a época, e nunca o token', () => {
    const { api } = setup({ seated: true });
    act(() => api.connections[0]!.emitState(stateMessage(viewAt(), { seq: 9, epoch: 4 })));
    const context = getDiagnosticContext();
    expect(context).toEqual({ code: CODE, seq: 9, epoch: 4 });
    expect(JSON.stringify(context)).not.toContain(TOKEN);
  });

  it('partida em curso sem o primeiro state: só "Conectando à sala…"', () => {
    const { api } = setup({ seated: true });
    act(() => api.connections[0]!.emitRoom(roomMessage({ status: 'PLAYING' })));
    expect(screen.getByRole('status')).toHaveTextContent('Conectando à sala…');
    expect(screen.queryByRole('main', { name: 'Mesa' })).not.toBeInTheDocument();
  });

  it('com o state, a mesa ocupa a tela: um só <main>, sem a coluna do Screen', () => {
    const { api, container } = setup({ seated: true });
    act(() => {
      api.connections[0]!.emitRoom(roomMessage({ status: 'PLAYING', gameNo: 1 }));
      api.connections[0]!.emitState(stateMessage(viewAt(), { seq: 2 }));
    });
    expect(screen.getByRole('main', { name: 'Mesa' })).toBeInTheDocument();
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(screen.getByRole('region', { name: 'Seu campo' })).toBeInTheDocument();
  });

  it('o aviso de reconexão aparece acima da mesa, e a mesa continua visível', () => {
    const { api, container } = setup({ seated: true });
    act(() => {
      api.connections[0]!.emitRoom(roomMessage({ status: 'PLAYING', gameNo: 1 }));
      api.connections[0]!.emitState(stateMessage(viewAt(), { seq: 2 }));
      api.connections[0]!.emitClosed(1006, false);
    });
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');
    expect(screen.getByRole('region', { name: 'Seu campo' })).toBeInTheDocument();
    expect(container.querySelectorAll('main')).toHaveLength(1);
  });

  it('o relógio da mesa vem do servidor (Session.remainingMs)', () => {
    const { api } = setup({ seated: true });
    act(() => {
      api.connections[0]!.emitRoom(roomMessage({ status: 'PLAYING', gameNo: 1 }));
      api.connections[0]!.emitState(
        stateMessage(viewAt(), { seq: 2, deadline: { kind: 'TURN', at: 17_000, players: ['p1'] } }),
      );
    });
    expect(screen.getByRole('timer')).toHaveTextContent('17');
  });

  it('o lobby ocupa a tela da sala: um só <main>, com o aviso de reconexão por cima', () => {
    const { api, container } = setup({ seated: true });
    expect(container.querySelectorAll('main')).toHaveLength(1);
    act(() => api.connections[0]!.emitClosed(1006, false));
    expect(screen.getByRole('status')).toHaveTextContent('Reconectando…');
    expect(container.querySelectorAll('main')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Estou pronto' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Sair da sala' })).toBeDisabled();
  });

  it('"Sair da sala" no lobby manda leave, e o fechamento 1000 leva ao início', async () => {
    const { api, user } = setup({ seated: true });
    await user.click(screen.getByRole('button', { name: 'Sair da sala' }));
    expect(api.connections[0]!.calls).toContain('leave');
    act(() => api.connections[0]!.emitClosed(1000, true));
    expect(window.location.pathname).toBe('/');
  });

  it('axe: sem violações na sala (lobby, dentro da tela inteira)', async () => {
    const { container } = setup({ seated: true });
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('axe: sem violações na sala fora do lobby (esperando o state e com a mesa)', async () => {
    const { api, container } = setup({ seated: true });
    act(() => api.connections[0]!.emitRoom(roomMessage({ status: 'PLAYING', gameNo: 1 })));
    expect(await seriousViolations(container)).toEqual([]);
    act(() => api.connections[0]!.emitState(stateMessage(viewAt(), { seq: 2 })));
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('reconexão pela API de verdade', () => {
  function realApi(store: ReturnType<typeof memoryStore>) {
    const made: Array<{ options: RoomClientOptions; connection: FakeConnection }> = [];
    const api = createRoomApi({
      store,
      server: 'http://localhost:3000',
      makeClient: (options) => {
        const connection = new FakeConnection({ room: roomMessage() });
        made.push({ options, connection });
        return connection;
      },
    });
    return { api, made };
  }

  it('com lastSeq 41 salvo, o cliente nasce com lastSeq 41 e o token, e conecta depois da sessão', () => {
    const store = memoryStore();
    saveSeat(store, CODE, seat({ lastSeq: 41 }));
    const { api, made } = realApi(store);
    render(<RoomGate code={CODE} api={api} store={store} marks={memoryStore()} />);

    expect(made).toHaveLength(1);
    expect(made[0]!.options).toEqual({ server: 'http://localhost:3000', code: CODE, token: TOKEN, lastSeq: 41 });
    expect(made[0]!.connection.calls).toEqual(['connect']);
  });

  it('sem lastSeq salvo, o cliente nasce sem a chave', () => {
    const store = memoryStore();
    saveSeat(store, CODE, seat());
    const { api, made } = realApi(store);
    render(<RoomGate code={CODE} api={api} store={store} marks={memoryStore()} />);
    expect('lastSeq' in made[0]!.options).toBe(false);
  });

  it('cada state grava o seq no armazenamento, mantendo o token', () => {
    const store = memoryStore();
    saveSeat(store, CODE, seat({ lastSeq: 41 }));
    const { api, made } = realApi(store);
    render(<RoomGate code={CODE} api={api} store={store} marks={memoryStore()} />);
    const { connection } = made[0]!;

    act(() => connection.emitState(stateMessage(viewAt(), { seq: 42 })));
    expect(loadSeat(store, CODE)).toMatchObject({ token: TOKEN, lastSeq: 42 });
    act(() => connection.emitState(stateMessage(viewAt(), { seq: 43 })));
    expect(loadSeat(store, CODE)?.lastSeq).toBe(43);
  });

  it('depois de ROOM_GONE, um state atrasado não ressuscita o assento', () => {
    const store = memoryStore();
    saveSeat(store, CODE, seat({ lastSeq: 1 }));
    const { api, made } = realApi(store);
    render(<RoomGate code={CODE} api={api} store={store} marks={memoryStore()} />);
    const { connection } = made[0]!;
    act(() => connection.emitClosed(4000, true));
    act(() => connection.emitState(stateMessage(viewAt(), { seq: 5 })));
    expect(loadSeat(store, CODE)).toBeNull();
  });

  it('sair da tela fecha a conexão depois de soltar a sessão', () => {
    const store = memoryStore();
    saveSeat(store, CODE, seat());
    const { api, made } = realApi(store);
    const { unmount } = render(<RoomGate code={CODE} api={api} store={store} marks={memoryStore()} />);
    unmount();
    expect(made[0]!.connection.calls).toEqual(['connect', 'close']);
  });
});
