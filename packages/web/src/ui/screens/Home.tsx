// O Início no Folheto (decisoes.md 2026-11-18 (2) a (5); spec 2026-11-18-menus-folheto-design.md §2): o emblema do Coringa e o menu em
// lista de mini cartas — Jogar online, Treinar, Partidas anteriores e Opções —, cada entrada com a sua rota. O controle discreto do tema
// fica no canto. Enquanto o tutorial não foi feito nem pulado, a carta do Treinar leva o selo (dentro, "Aprender jogando" vem em ouro).
import { useState } from 'react';
import {
  MENU_NAV_LABEL,
  OPTIONS_LABEL,
  OPTIONS_LINE,
  PAST_GAMES_LABEL,
  PAST_GAMES_LINE,
  PLAY_ONLINE_LABEL,
  PLAY_ONLINE_LINE,
  PRACTICE_LABEL,
  PRACTICE_LINE,
} from '../../model/copy.ts';
import { loadTutorialState, type KeyValueStore } from '../../model/storage.ts';
import { Emblem } from '../menu/Emblem.tsx';
import { MenuScreen } from '../menu/MenuScreen.tsx';
import { MenuItem } from '../menu/MiniCard.tsx';
import { ThemeToggle } from '../menu/ThemeToggle.tsx';

export interface HomeProps {
  store: KeyValueStore;
}

export function Home({ store }: HomeProps) {
  const [tutorialPending] = useState(() => loadTutorialState(store) === null);
  return (
    <MenuScreen home>
      <h1 className="sr-only">Jogo do Coringa</h1>
      <ThemeToggle />
      <Emblem />
      <nav aria-label={MENU_NAV_LABEL} className="menu-lista">
        <MenuItem to="/jogar" kind="online" name={PLAY_ONLINE_LABEL} line={PLAY_ONLINE_LINE} index={0} />
        <MenuItem to="/treinar" kind="practice" name={PRACTICE_LABEL} line={PRACTICE_LINE} seal={tutorialPending} index={1} />
        <MenuItem to="/partidas" kind="pastGames" name={PAST_GAMES_LABEL} line={PAST_GAMES_LINE} index={2} />
        <MenuItem to="/opcoes" kind="options" name={OPTIONS_LABEL} line={OPTIONS_LINE} index={3} />
      </nav>
    </MenuScreen>
  );
}
