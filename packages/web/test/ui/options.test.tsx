// Opções (`/opcoes`, spec 2026-11-18-menus-folheto-design.md §2): a aparência (era o painel do Início) e as preferências que o jogo guarda.
// O som tem os seus testes em `sound.test.tsx`.
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { LOOK_ONLINE_NOTE, LOOK_PANEL_LABEL } from '../../src/model/copy.ts';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from '../../src/model/storage.ts';
import { MenuThemeProvider } from '../../src/ui/menu/menu-theme.tsx';
import { Options } from '../../src/ui/screens/Options.tsx';
import { memoryStore, seriousViolations } from './support.tsx';

beforeEach(() => {
  window.history.replaceState(null, '', '/opcoes');
});

function setup(store = memoryStore()) {
  const user = userEvent.setup();
  const view = render(
    <MenuThemeProvider store={store}>
      <Options store={store} />
    </MenuThemeProvider>,
  );
  return { store, user, ...view };
}

describe('opções: a aparência', () => {
  it('o painel com o deck, o Coringa e a nota da sala online, antes das preferências', () => {
    setup();
    expect(screen.getByRole('heading', { level: 1, name: 'Opções' })).toHaveFocus();
    const panel = screen.getByRole('region', { name: LOOK_PANEL_LABEL });
    expect(within(panel).getByRole('group', { name: 'Deck' })).toBeInTheDocument();
    expect(within(panel).getByText(LOOK_ONLINE_NOTE)).toBeInTheDocument();
    const regions = screen.getAllByRole('region').map((region) => region.getAttribute('aria-label'));
    expect(regions).toEqual([LOOK_PANEL_LABEL, 'Preferências']);
  });

  it('a troca fica no armazenamento, com as outras preferências, e volta ao reabrir', async () => {
    const { store, user, unmount } = setup();
    await user.click(screen.getByRole('radio', { name: 'Bestiário' }));
    await user.click(screen.getByRole('radio', { name: 'Egípcio' }));
    expect(loadPrefs(store)).toEqual({ ...DEFAULT_PREFS, look: { deck: 'bestiario', race: 'egipcio' } });
    unmount();
    setup(store);
    expect(screen.getByRole('radio', { name: 'Bestiário' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Egípcio' })).toBeChecked();
  });

  it('sem nada guardado, o Cordel e o Bufão, e nada é gravado só por abrir a tela', () => {
    const { store } = setup();
    expect(screen.getByRole('radio', { name: 'Cordel' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Bufão' })).toBeChecked();
    expect(store.get('coringa:prefs')).toBeNull();
  });
});

describe('opções: as preferências', () => {
  it('as três chaves, com o estado guardado', () => {
    const store = memoryStore();
    savePrefs(store, { ...DEFAULT_PREFS, autoPass: false, reduceMotion: true });
    setup(store);
    const panel = screen.getByRole('region', { name: 'Preferências' });
    expect(within(panel).getAllByRole('switch').map((s) => s.getAttribute('aria-labelledby') && (s as HTMLInputElement).checked)).toEqual([
      true,
      true,
      false,
    ]);
    expect(within(panel).getByRole('switch', { name: 'Som' })).toBeChecked();
    expect(within(panel).getByRole('switch', { name: 'Reduzir animações' })).toBeChecked();
    expect(within(panel).getByRole('switch', { name: 'Passar sozinho quando não tenho resposta' })).not.toBeChecked();
  });

  it('cada chave grava a sua, sem apagar o tema nem as outras', async () => {
    const store = memoryStore();
    savePrefs(store, { ...DEFAULT_PREFS, menuTheme: 'green' });
    const { user } = setup(store);
    await user.click(screen.getByRole('switch', { name: 'Reduzir animações' }));
    await user.click(screen.getByRole('switch', { name: 'Passar sozinho quando não tenho resposta' }));
    expect(loadPrefs(store)).toEqual({ autoPass: false, reduceMotion: true, sound: true, menuTheme: 'green' });
    expect(screen.getByRole('switch', { name: 'Reduzir animações' })).toBeChecked();
  });

  it('ligar "Reduzir animações" vale na hora para a tela: a raiz passa a pedir menos movimento', async () => {
    const { user } = setup();
    expect(screen.getByRole('main')).not.toHaveAttribute('data-movimento-reduzido');
    await user.click(screen.getByRole('switch', { name: 'Reduzir animações' }));
    expect(screen.getByRole('main')).toHaveAttribute('data-movimento-reduzido');
  });

  it('o Início leva de volta', async () => {
    const { user } = setup();
    await user.click(screen.getByRole('link', { name: 'Início' }));
    expect(window.location.pathname).toBe('/');
  });

  it('axe: sem violações sérias', async () => {
    const { container } = setup();
    expect(await seriousViolations(container)).toEqual([]);
  });
});
