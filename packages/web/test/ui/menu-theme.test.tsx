// O tema do menu (decisoes.md 2026-11-18 (5)): rosa por padrão, verde por escolha, guardado nas preferências e entregue às telas por um
// contexto. Fora do provedor, rosa.
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DEFAULT_PREFS, loadPrefs, savePrefs } from '../../src/model/storage.ts';
import { MenuThemeProvider, useMenuTheme } from '../../src/ui/menu/menu-theme.tsx';
import { memoryStore } from './support.tsx';

function Probe() {
  const { theme, setTheme } = useMenuTheme();
  return (
    <button type="button" data-testid="tema" onClick={() => setTheme('green')}>
      {theme}
    </button>
  );
}

describe('o tema do menu', () => {
  it('fora do provedor, rosa (e trocar não faz nada)', () => {
    render(<Probe />);
    expect(screen.getByTestId('tema')).toHaveTextContent('pink');
    fireEvent.click(screen.getByTestId('tema'));
    expect(screen.getByTestId('tema')).toHaveTextContent('pink');
  });

  it('no provedor: começa no guardado, troca na hora e grava sem perder as outras preferências', () => {
    const store = memoryStore();
    savePrefs(store, { ...DEFAULT_PREFS, sound: false, look: { deck: 'bestiario', race: 'egipcio' } });
    render(
      <MenuThemeProvider store={store}>
        <Probe />
      </MenuThemeProvider>,
    );
    expect(screen.getByTestId('tema')).toHaveTextContent('pink');
    fireEvent.click(screen.getByTestId('tema'));
    expect(screen.getByTestId('tema')).toHaveTextContent('green');
    expect(loadPrefs(store)).toEqual({ ...DEFAULT_PREFS, sound: false, look: { deck: 'bestiario', race: 'egipcio' }, menuTheme: 'green' });
  });

  it('o verde guardado abre verde', () => {
    const store = memoryStore();
    savePrefs(store, { ...DEFAULT_PREFS, menuTheme: 'green' });
    render(
      <MenuThemeProvider store={store}>
        <Probe />
      </MenuThemeProvider>,
    );
    expect(screen.getByTestId('tema')).toHaveTextContent('green');
  });
});
