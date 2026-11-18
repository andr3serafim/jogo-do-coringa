// O tema e o movimento das telas fora da mesa (decisoes.md 2026-11-18 (5)). O tema é rosa (o padrão) ou verde e mora nas preferências
// (`menuTheme`); só o menu o troca. O movimento reduzido é o da chave (`reduceMotion`) ou o do sistema; a chave também muda no menu da
// partida, então cada tela do menu a lê do armazenamento ao abrir (e de novo quando as Opções a trocam). Os dois chegam às telas por um
// provedor que o `App` monta uma vez; gravar nunca apaga as outras preferências.
import { createContext, useCallback, useContext, useMemo, useReducer, useState, type ReactNode } from 'react';
import { loadPrefs, menuThemeOf, savePrefs, type KeyValueStore, type MenuTheme } from '../../model/storage.ts';
import { useReducedMotion } from '../anim/useReducedMotion.ts';

export interface MenuThemeValue {
  theme: MenuTheme;
  setTheme: (next: MenuTheme) => void;
}

export interface MenuMotionValue {
  /** O menu ou o sistema pedem menos movimento: nada respira, entra ou inclina. */
  reduced: boolean;
  /** A chave do menu (sem o sistema), como as Opções a mostram. */
  reduceMotion: boolean;
  setReduceMotion: (on: boolean) => void;
}

interface MotionSource {
  store: KeyValueStore | null;
  /** Sobe a cada troca feita pelo menu: quem lê relê o armazenamento. */
  version: number;
  setReduceMotion: (on: boolean) => void;
}

const MenuThemeContext = createContext<MenuThemeValue>({ theme: 'pink', setTheme: () => undefined });
const MenuMotionContext = createContext<MotionSource>({ store: null, version: 0, setReduceMotion: () => undefined });

export const useMenuTheme = (): MenuThemeValue => useContext(MenuThemeContext);

/** Dentro de uma `MenuScreen`: as peças de `ui/parts.tsx` vestem o Folheto; fora (o fim, a dica e o menu da partida), a roupa de antes. */
export const InMenuContext = createContext(false);
export const useInMenu = (): boolean => useContext(InMenuContext);

export function useMenuMotion(): MenuMotionValue {
  // A `version` no contexto faz quem lê redesenhar quando o menu troca a chave; a leitura é a cada desenho (um JSON pequeno): o valor
  // que o menu da partida gravou também vale ao voltar ao menu.
  const { store, setReduceMotion } = useContext(MenuMotionContext);
  const reduceMotion = store === null ? false : loadPrefs(store).reduceMotion;
  const reduced = useReducedMotion(reduceMotion);
  return { reduced, reduceMotion, setReduceMotion };
}

export function MenuThemeProvider({ store, children }: { store: KeyValueStore; children: ReactNode }) {
  const [theme, setThemeState] = useState<MenuTheme>(() => menuThemeOf(loadPrefs(store)));
  const [version, bump] = useReducer((n: number) => n + 1, 0);
  // Lê de novo antes de gravar: outra tela (o menu da partida) pode ter mudado outra preferência desde a abertura.
  const setTheme = useCallback(
    (next: MenuTheme) => {
      setThemeState(next);
      savePrefs(store, { ...loadPrefs(store), menuTheme: next });
    },
    [store],
  );
  const setReduceMotion = useCallback(
    (on: boolean) => {
      savePrefs(store, { ...loadPrefs(store), reduceMotion: on });
      bump();
    },
    [store],
  );
  const themeValue = useMemo(() => ({ theme, setTheme }), [theme, setTheme]);
  const motionValue = useMemo(() => ({ store, version, setReduceMotion }), [store, version, setReduceMotion]);
  return (
    <MenuThemeContext value={themeValue}>
      <MenuMotionContext value={motionValue}>{children}</MenuMotionContext>
    </MenuThemeContext>
  );
}
