// A tela fora da mesa no Folheto (spec 2026-11-18-menus-folheto-design.md §3, §4): um `<main>` sobre o fundo do tema (rosa com a
// moldura da capa, ou verde com o filete e a costura da mesa), parado, com o grão do papel e a vinheta. O filtro da textura dos títulos
// (`#textura-aspera`, o mesmo da mesa) mora aqui: a mesa e o menu nunca estão montados juntos.
import type { ReactNode } from 'react';
import { InMenuContext, useMenuMotion, useMenuTheme } from './menu-theme.tsx';
import './menu.css';

export interface MenuScreenProps {
  children: ReactNode;
  /** O Início: a coluna mais larga e no meio da altura. */
  home?: boolean;
}

export function MenuScreen({ children, home = false }: MenuScreenProps) {
  const { theme } = useMenuTheme();
  const { reduced } = useMenuMotion();
  return (
    <main className="menu" data-tema={theme} data-inicio={home ? '' : undefined} data-movimento-reduzido={reduced ? '' : undefined}>
      <div className="menu-fundo" aria-hidden="true">
        <div className="menu-grao grao" />
        {theme === 'pink' ? (
          <div className="menu-moldura">
            <i />
            <i />
            <i />
            <i />
          </div>
        ) : (
          <div className="menu-trilho" />
        )}
        <div className="menu-vinheta" />
        <svg width="0" height="0" focusable="false">
          <filter id="textura-aspera">
            <feTurbulence type="fractalNoise" baseFrequency="0.06" numOctaves={2} result="ruido" />
            <feDisplacementMap in="SourceGraphic" in2="ruido" scale="2.4" />
          </filter>
        </svg>
      </div>
      <div className="menu-coluna">
        <InMenuContext value>{children}</InMenuContext>
      </div>
    </main>
  );
}
