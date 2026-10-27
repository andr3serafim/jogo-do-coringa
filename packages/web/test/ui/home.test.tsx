import { HttpError } from '@coringa/protocol';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { loadNickname, loadSeat } from '../../src/model/storage.ts';
import { Home } from '../../src/ui/screens/Home.tsx';
import { CODE, created, fakeApi, memoryStore, seriousViolations, TOKEN } from './support.tsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

function setup() {
  const api = fakeApi();
  const store = memoryStore();
  const user = userEvent.setup();
  const view = render(<Home api={api} store={store} />);
  return { api, store, user, ...view };
}

/** Preenche o campo de uma vez (`paste`), o que também serve para emoji. */
async function fill(user: ReturnType<typeof userEvent.setup>, label: string | RegExp, text: string) {
  const field = screen.getByLabelText(label);
  await user.clear(field);
  if (text !== '') {
    await user.click(field);
    await user.paste(text);
  }
}

describe('início: criar sala', () => {
  it('cria com o apelido, guarda o token e vai para a sala', async () => {
    const { api, store, user } = setup();
    await fill(user, 'Seu apelido', 'Duda');
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));

    // Sem mexer na vida inicial, vai a padrão (500).
    expect(api.create).toHaveBeenCalledExactlyOnceWith('Duda', 500);
    expect(window.location.pathname).toBe(`/s/${CODE}`);
    expect(loadSeat(store, CODE)).toEqual({ token: TOKEN, playerId: 'p1', nickname: 'Duda' });
    expect(loadNickname(store)).toBe('Duda');
  });

  it('a vida inicial (sub-projeto 5): 500 vem marcada, e a escolhida vai junto na criação', async () => {
    const { api, user } = setup();
    const group = screen.getByRole('group', { name: 'Vida inicial' });
    expect(within(group).getByRole('radio', { name: '500 · padrão' })).toBeChecked();
    expect(within(group).getAllByRole('radio').map((radio) => radio.getAttribute('value'))).toEqual(['300', '500', '800']);
    await user.click(within(group).getByRole('radio', { name: '800' }));
    await fill(user, 'Seu apelido', 'Duda');
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(api.create).toHaveBeenCalledExactlyOnceWith('Duda', 800);
  });

  it('lembra o apelido da última vez', () => {
    const store = memoryStore();
    store.set('coringa:apelido', 'Bia');
    render(<Home api={fakeApi()} store={store} />);
    expect(screen.getByLabelText('Seu apelido')).toHaveValue('Bia');
  });

  // Review Focus 3: nada de chamada ao servidor com apelido que o servidor recusaria.
  it.each([
    ['só espaços', '   '],
    ['vazio', ''],
    ['21 emojis', '😀'.repeat(21)],
    ['21 letras', 'a'.repeat(21)],
  ])('apelido inválido (%s): erro no campo e nenhuma chamada', async (_name, nickname) => {
    const { api, store, user } = setup();
    await fill(user, 'Seu apelido', nickname);
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));

    expect(screen.getByRole('alert')).toHaveTextContent('Apelido inválido');
    expect(screen.getByLabelText('Seu apelido')).toHaveAttribute('aria-invalid', 'true');
    expect(api.create).not.toHaveBeenCalled();
    expect(window.location.pathname).toBe('/');
    expect(loadSeat(store, CODE)).toBeNull();
  });

  it('aceita 20 emojis, o limite', async () => {
    const { api, user } = setup();
    await fill(user, 'Seu apelido', '😀'.repeat(20));
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(api.create).toHaveBeenCalledOnce();
  });

  it('400 do servidor vira erro no campo', async () => {
    const { api, user } = setup();
    api.create.mockRejectedValue(new HttpError(400));
    await fill(user, 'Seu apelido', 'Duda');
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Apelido inválido');
    expect(screen.getByRole('button', { name: 'Criar sala' })).toBeEnabled();
  });

  it('429 pede para esperar um minuto', async () => {
    const { api, user } = setup();
    api.create.mockRejectedValue(new HttpError(429));
    await fill(user, 'Seu apelido', 'Duda');
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Muitas tentativas; espere um minuto');
  });

  it('falha de rede avisa e deixa tentar de novo', async () => {
    const { api, user } = setup();
    api.create.mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce(created());
    await fill(user, 'Seu apelido', 'Duda');
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Sem conexão');

    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(api.create).toHaveBeenCalledTimes(2);
    expect(window.location.pathname).toBe(`/s/${CODE}`);
  });

  it('erro 500 do servidor tem texto próprio', async () => {
    const { api, user } = setup();
    api.create.mockRejectedValue(new HttpError(500));
    await fill(user, 'Seu apelido', 'Duda');
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Não deu para criar a sala');
  });
});

describe('início: entrar com código ou link', () => {
  // Review Focus 2: o link inteiro, com espaços e minúsculas, vira o código normalizado.
  it('link com espaços e minúsculas navega para /s/CÓDIGO', async () => {
    const { user } = setup();
    await fill(user, 'Código ou link da sala', '  https://x.dev/s/7kq2md ');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(window.location.pathname).toBe('/s/7KQ2MD');
  });

  it('o código sozinho, em minúsculas, também serve', async () => {
    const { user } = setup();
    await fill(user, 'Código ou link da sala', ' 7kq2md');
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(window.location.pathname).toBe('/s/7KQ2MD');
  });

  it.each([
    ['vazio', ''],
    ['lixo', 'oi'],
    ['código com 0', '7KQ2M0'],
    ['só o site', 'https://x.dev/'],
  ])('entrada inválida (%s): erro no campo, sem navegar', async (_name, text) => {
    const { user } = setup();
    await fill(user, 'Código ou link da sala', text);
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Digite o código');
    expect(window.location.pathname).toBe('/');
  });
});

describe('início: "Aprender jogando" (coringa:tutorial)', () => {
  /** Quem vem antes na página: a ordem do documento. */
  const before = (a: Element, b: Element): boolean => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);

  it('sem coringa:tutorial vem em destaque (ouro), logo depois da apresentação e antes de criar sala', () => {
    setup();
    const learn = screen.getByRole('button', { name: 'Aprender jogando' });
    expect(learn).toHaveAttribute('data-destaque', 'true');
    expect(learn).toHaveClass('bg-ouro');
    expect(before(learn, screen.getByRole('region', { name: 'Criar sala' }))).toBe(true);
  });

  it.each(['done', 'skipped'])('com coringa:tutorial = %s é um botão comum, entre os do treino, sem destaque', (state) => {
    const store = memoryStore();
    store.set('coringa:tutorial', state);
    render(<Home api={fakeApi()} store={store} />);
    const learn = screen.getByRole('button', { name: 'Aprender jogando' });
    expect(learn).not.toHaveAttribute('data-destaque');
    expect(learn).not.toHaveClass('bg-ouro');
    expect(before(screen.getByRole('region', { name: 'Entrar numa sala' }), learn)).toBe(true);
    expect(before(learn, screen.getByRole('button', { name: 'Treinar contra o bot' }))).toBe(true);
  });

  it('um valor guardado que não é estado do tutorial conta como ausente', () => {
    const store = memoryStore();
    store.set('coringa:tutorial', 'talvez');
    render(<Home api={fakeApi()} store={store} />);
    expect(screen.getByRole('button', { name: 'Aprender jogando' })).toHaveAttribute('data-destaque', 'true');
  });

  it.each([null, 'done'])('axe: sem violações sérias (coringa:tutorial = %s)', async (state) => {
    const store = memoryStore();
    if (state !== null) store.set('coringa:tutorial', state);
    const { container } = render(<Home api={fakeApi()} store={store} />);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('início: treino e acessibilidade', () => {
  it('Treinar contra o bot vai para /treino', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Treinar contra o bot' }));
    expect(window.location.pathname).toBe('/treino');
  });

  it('Partidas anteriores vai para /partidas', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Partidas anteriores' }));
    expect(window.location.pathname).toBe('/partidas');
  });

  it('Aprender jogando vai para /tutorial', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('button', { name: 'Aprender jogando' }));
    expect(window.location.pathname).toBe('/tutorial');
  });

  it('tem título, campos com rótulo e campos de texto de 16 px', () => {
    setup();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Jogo do Coringa' })).toBeInTheDocument();
    for (const field of screen.getAllByRole('textbox')) expect(field).toHaveClass('text-base');
  });

  it('axe: sem violações sérias nem críticas', async () => {
    const { container } = setup();
    expect(await seriousViolations(container)).toEqual([]);
  });

  it('axe: sem violações com os erros dos campos à mostra', async () => {
    const { container, user } = setup();
    await fill(user, 'Seu apelido', '');
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    await user.click(screen.getByRole('button', { name: 'Entrar' }));
    expect(screen.getAllByRole('alert')).toHaveLength(2);
    expect(await seriousViolations(container)).toEqual([]);
  });
});
