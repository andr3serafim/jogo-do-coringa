// Jogar online (`/jogar`, spec 2026-11-18-menus-folheto-design.md §2): os formulários de criar e entrar que eram do Início, com as mesmas
// garantias (os casos vieram do `home.test.tsx`).
import { HttpError } from '@coringa/protocol';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadNickname, loadSeat, savePrefs } from '../../src/model/storage.ts';
import { PlayOnline } from '../../src/ui/screens/PlayOnline.tsx';
import { CODE, created, fakeApi, memoryStore, seriousViolations, TOKEN } from './support.tsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/jogar');
});

function setup() {
  const api = fakeApi();
  const store = memoryStore();
  const user = userEvent.setup();
  const view = render(<PlayOnline api={api} store={store} />);
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

describe('jogar online: criar sala', () => {
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

  it('a aparência (decks e raças, fatia 3): com a preferência fora do padrão, ela vai junto na criação', async () => {
    const api = fakeApi();
    const store = memoryStore();
    savePrefs(store, { ...DEFAULT_PREFS, look: { deck: 'bestiario', race: 'egipcio' } });
    const user = userEvent.setup();
    render(<PlayOnline api={api} store={store} />);
    await fill(user, 'Seu apelido', 'Duda');
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(api.create).toHaveBeenCalledExactlyOnceWith('Duda', 500, { deck: 'bestiario', race: 'egipcio' });
  });

  it('com a aparência no Cordel (o padrão) guardada, a criação é a de sempre (sem aparência)', async () => {
    const api = fakeApi();
    const store = memoryStore();
    savePrefs(store, { ...DEFAULT_PREFS, look: { deck: 'cordel', race: 'bufao' } });
    const user = userEvent.setup();
    render(<PlayOnline api={api} store={store} />);
    await fill(user, 'Seu apelido', 'Duda');
    await user.click(screen.getByRole('button', { name: 'Criar sala' }));
    expect(api.create).toHaveBeenCalledExactlyOnceWith('Duda', 500);
  });

  it('lembra o apelido da última vez', () => {
    const store = memoryStore();
    store.set('coringa:apelido', 'Bia');
    render(<PlayOnline api={fakeApi()} store={store} />);
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
    expect(window.location.pathname).toBe('/jogar');
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

describe('jogar online: entrar com código ou link', () => {
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
    expect(window.location.pathname).toBe('/jogar');
  });
});


describe('jogar online: título e acessibilidade', () => {
  it('o título com o foco, o Início, os campos com rótulo e de 16 px', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Jogar online' })).toHaveFocus();
    expect(screen.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
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
