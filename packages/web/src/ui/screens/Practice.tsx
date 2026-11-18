// Treinar (`/treinar`; spec 2026-11-18-menus-folheto-design.md §2): jogar com o bot (a escolha do nível, `/treino`) ou aprender jogando
// (o tutorial, `/tutorial`). Enquanto o tutorial não foi feito nem pulado, "Aprender jogando" vem em ouro, com o selo.
import { useId, useState, type CSSProperties, type ReactNode } from 'react';
import { LEARN_LABEL, LEARN_LINE, PLAY_BOT_LABEL, PLAY_BOT_LINE, PRACTICE_LABEL, PRACTICE_LINE } from '../../model/copy.ts';
import { loadTutorialState, type KeyValueStore } from '../../model/storage.ts';
import { MenuScreen } from '../menu/MenuScreen.tsx';
import { TutorialSeal } from '../menu/MiniCard.tsx';
import { BackHome, followLink, MenuTitle } from '../menu/parts.tsx';

const ICON = { strokeWidth: 2.2, fill: 'none', stroke: 'currentColor', strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const BOT_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...ICON}>
    <rect x="4.5" y="8" width="15" height="11" rx="2.5" />
    <path d="M12 4.5V8M9 12.5v1M15 12.5v1M9 16h6M2.5 12v3M21.5 12v3" />
    <circle cx="12" cy="3.5" r="1.2" />
  </svg>
);
const BOOK_ICON = (
  <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" {...ICON}>
    <path d="M12 6.5C10 5 7 4.5 4 5v13c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V5c-3-.5-6 0-8 1.5zM12 6.5v13" />
  </svg>
);

function Choice({ to, icon, name, line, gold, seal, order }: { to: string; icon: ReactNode; name: string; line: string; gold: boolean; seal: boolean; order: number }) {
  const id = useId();
  return (
    <a
      href={to}
      onClick={followLink(to)}
      className={`carimbo carimbo-grande menu-escolha ${gold ? 'carimbo-ouro' : 'carimbo-papel'}`}
      data-tom={gold ? 'gold' : 'paper'}
      aria-labelledby={`${id}-nome`}
      aria-describedby={`${id}-linha`}
      style={{ '--d': order } as CSSProperties}
    >
      <span className="menu-escolha-bloco" aria-hidden="true">
        {icon}
      </span>
      <span>
        <span id={`${id}-nome`} className="menu-escolha-nome">
          {name}
        </span>
        <span id={`${id}-linha`} className="menu-escolha-linha">
          {line}
        </span>
      </span>
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" className="size-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 5l7 7-7 7" />
      </svg>
      {seal ? <TutorialSeal className="menu-selo" /> : null}
    </a>
  );
}

export function Practice({ store }: { store: KeyValueStore }) {
  const [tutorialPending] = useState(() => loadTutorialState(store) === null);
  return (
    <MenuScreen>
      <BackHome />
      <MenuTitle card="practice" line={PRACTICE_LINE} focusOnMount>
        {PRACTICE_LABEL}
      </MenuTitle>
      <div className="flex flex-col gap-[18px]">
        <Choice to="/treino" icon={BOT_ICON} name={PLAY_BOT_LABEL} line={PLAY_BOT_LINE} gold={false} seal={false} order={1} />
        <Choice to="/tutorial" icon={BOOK_ICON} name={LEARN_LABEL} line={LEARN_LINE} gold={tutorialPending} seal={tutorialPending} order={2} />
      </div>
    </MenuScreen>
  );
}
