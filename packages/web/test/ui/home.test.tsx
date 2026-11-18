// O Início no Folheto (decisoes.md 2026-11-18 (2) a (5); spec 2026-11-18-menus-folheto-design.md §2, §3): o emblema, o menu em lista de
// mini cartas com as quatro entradas e o controle discreto do tema. Os formulários de criar e entrar moram em `/jogar`
// (`play-online.test.tsx`); a aparência e as preferências, em `/opcoes` (`options.test.tsx`).
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from '../../src/model/storage.ts';
import { MenuThemeProvider } from '../../src/ui/menu/menu-theme.tsx';
import { Home } from '../../src/ui/screens/Home.tsx';
import { memoryStore, seriousViolations } from './support.tsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/');
});

function setup(store = memoryStore()) {
  const user = userEvent.setup();
  const view = render(
    <MenuThemeProvider store={store}>
      <Home store={store} />
    </MenuThemeProvider>,
  );
  return { store, user, ...view };
}

const menu = () => screen.getByRole('navigation', { name: 'Menu' });
const seal = (name: string) => within(menu()).getByRole('link', { name }).querySelector('[data-selo-tutorial]');

describe('início: o menu', () => {
  it('o título da tela e as quatro entradas, na ordem, cada uma com a sua rota', () => {
    setup();
    expect(screen.getByRole('main')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Jogo do Coringa' })).toBeInTheDocument();
    const links = within(menu()).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual([
      'Jogar onlineCriar sala ou entrar numa sala',
      'TreinarJogar com o bot ou aprender jogando',
      'Partidas anterioresReveja as partidas jogadas',
      'OpçõesAparência e preferências',
    ]);
    expect(links.map((link) => link.getAttribute('href'))).toEqual(['/jogar', '/treinar', '/partidas', '/opcoes']);
  });

  it('o nome de cada link é o da entrada, e a linha curta é a descrição', () => {
    setup();
    const online = screen.getByRole('link', { name: 'Jogar online' });
    expect(online).toHaveAccessibleDescription('Criar sala ou entrar numa sala');
  });

  it.each([
    ['Jogar online', '/jogar'],
    ['Treinar', '/treinar'],
    ['Partidas anteriores', '/partidas'],
    ['Opções', '/opcoes'],
  ])('o clique simples em "%s" navega para %s sem recarregar', async (name, path) => {
    const { user } = setup();
    await user.click(screen.getByRole('link', { name }));
    expect(window.location.pathname).toBe(path);
  });

  it('com o tutorial por fazer, a carta do Treinar leva o selo (e só ela)', () => {
    setup();
    expect(seal('Treinar')).not.toBeNull();
    expect(seal('Jogar online')).toBeNull();
    expect(seal('Opções')).toBeNull();
  });

  it.each(['done', 'skipped'])('com coringa:tutorial = %s, nenhum selo', (state) => {
    const store = memoryStore();
    store.set('coringa:tutorial', state);
    setup(store);
    expect(seal('Treinar')).toBeNull();
  });

  it.each([null, 'done'])('axe: sem violações sérias (coringa:tutorial = %s)', async (state) => {
    const store = memoryStore();
    if (state !== null) store.set('coringa:tutorial', state);
    const { container } = setup(store);
    expect(await seriousViolations(container)).toEqual([]);
  });
});

describe('início: o tema (rosa por padrão, verde por escolha)', () => {
  it('abre rosa, sem gravar nada só por abrir', () => {
    const { store } = setup();
    expect(screen.getByRole('main')).toHaveAttribute('data-tema', 'pink');
    expect(store.get('coringa:prefs')).toBeNull();
  });

  it('o controle discreto troca para o verde e volta, gravando sem perder as outras preferências', async () => {
    const store = memoryStore();
    savePrefs(store, { ...DEFAULT_PREFS, sound: false });
    const { user } = setup(store);
    const toggle = screen.getByRole('button', { name: 'Fundo verde' });
    expect(toggle).toHaveAttribute('aria-pressed', 'false');
    await user.click(toggle);
    expect(screen.getByRole('main')).toHaveAttribute('data-tema', 'green');
    expect(toggle).toHaveAttribute('aria-pressed', 'true');
    expect(loadPrefs(store)).toEqual({ ...DEFAULT_PREFS, sound: false, menuTheme: 'green' });
    await user.click(toggle);
    expect(screen.getByRole('main')).toHaveAttribute('data-tema', 'pink');
    expect(loadPrefs(store).menuTheme).toBe('pink');
  });

  it('o verde guardado abre verde', () => {
    const store = memoryStore();
    savePrefs(store, { ...DEFAULT_PREFS, menuTheme: 'green' });
    setup(store);
    expect(screen.getByRole('main')).toHaveAttribute('data-tema', 'green');
    expect(screen.getByRole('button', { name: 'Fundo verde' })).toHaveAttribute('aria-pressed', 'true');
  });
});
