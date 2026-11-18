// O tema das telas fora da mesa (decisoes.md 2026-11-18 (5)): rosa (o padrão) ou verde. Mora nas preferências (`menuTheme`) e chega às
// telas por um contexto que o `App` monta uma vez; a troca vale na hora e fica guardada, sem mexer nas outras preferências.
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { loadPrefs, menuThemeOf, savePrefs, type KeyValueStore, type MenuTheme } from '../../model/storage.ts';

export interface MenuThemeValue {
  theme: MenuTheme;
  setTheme: (next: MenuTheme) => void;
}

const MenuThemeContext = createContext<MenuThemeValue>({ theme: 'pink', setTheme: () => undefined });

export const useMenuTheme = (): MenuThemeValue => useContext(MenuThemeContext);

export function MenuThemeProvider({ store, children }: { store: KeyValueStore; children: ReactNode }) {
  const [theme, setState] = useState<MenuTheme>(() => menuThemeOf(loadPrefs(store)));
  const setTheme = useCallback(
    (next: MenuTheme) => {
      setState(next);
      // Lê de novo antes de gravar: outra tela (o menu da partida) pode ter mudado outra preferência desde a abertura.
      savePrefs(store, { ...loadPrefs(store), menuTheme: next });
    },
    [store],
  );
  const value = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  return <MenuThemeContext value={value}>{children}</MenuThemeContext>;
}
